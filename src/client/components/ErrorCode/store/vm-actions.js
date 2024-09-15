/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import _ from 'lodash'
import SystemResources from '../../../models/system-code/resources'
import ModuleResources from '../../../models/module-code/resources'
import InterfaceResources from '../../../models/interface-code/resources'
import LogCodeResources from '../../../models/log-code/resources'
import { ReadCsvAsUint8, UTF8Parser } from 'next-reader'
import { Scheduler } from './Scheduler'
import { exportFile } from 'common/sugo-utils'

/**
 * @param {string} action
 * @return {string}
 */
function creator(action) {
  return 'china-southern-log-code-vm-' + action
}

export const Action = {
  INIT: creator('init'),
  UPDATE: creator('update'),
  UPDATE_STORAGE: creator('update-storage'),
  UPDATE_FILTER: creator('update-filter'),
  CREATE_FROM_FILE: creator('create-from-file'),
  PAUSE: creator('pause'),
  RESUME: creator('resume'),
  SAMPLE_FILE: creator('sample-file'),
  PAGE_CHANGE: creator('page-change')
}

export default {

  /**
   * @param {Array<LogCodeLogCodeModel>} codes
   * @param {LogCodeFilter} filter
   */
  logCodesFilter(codes, filter) {
    return codes.filter(function (code) {
      if (filter.system_id && code.system_id !== filter.system_id) {
        return false
      }

      if (filter.module_id && code.module_id !== filter.module_id) {
        return false
      }

      if (filter.interface_id && code.interface_id !== filter.interface_id) {
        return false
      }

      if (filter.keyword && code.code.indexOf(filter.keyword) < 0) {
        return false
      }

      return true
    })
  },

  /**
   * 初始化时查询项目下所有的系统码、产品线、接口方、日志错误码
   * @param {Store} store
   * @param {object} project
   * @param {LogCodeLogCodeViewModel} state
   * @param {function} done
   */
  async init(store, project, state, done) {
    if (!project.id) {
      done({})
      return
    }

    const SystemRes = await SystemResources.findProjectSystems(project.id)
    if (SystemRes.body.length === 0) {
      done({ project })
      await this.showTips(`项目：${project.name} 未找到系统码记录`, store)
      return
    }

    const ModuleRes = await ModuleResources.findProjectModules(project.id)
    const InterfaceRes = await InterfaceResources.findProjectInterfaces(project.id)
    // const LogCodeRes = await LogCodeResources.findProjectLogCode(project.id)

    done({
      project,
      systems: SystemRes.body,
      modules: ModuleRes.body,
      interfaces: InterfaceRes.body,
      codes: []
    })

    if (SystemRes.body.length > 0) {
      store.dispatch([
        {
          type: Action.UPDATE,
          payload: {
            // set filter
            filter: {
              ...state.filter,
              system_id: SystemRes.body.map(r => r.id)
            }
          }
        },
        {
          type: Action.PAGE_CHANGE,
          payload: {
            currentPage: state.pagination.currentPage,
            pageSize: state.pagination.pageSize
          }
        }
      ])
    }
  },

  /**
   * @param {Store} store
   * @param {number} currentPage
   * @param {number} pageSize
   * @param {LogCodeLogCodeViewModel} state
   * @param {function} done
   */
  async pageChange(store, currentPage, pageSize, state, done) {

    let system_id = null

    if (state.systems.length === 0) {
      return await this.showTips('当前项目没有错误码', store)
    }

    if (state.filter.system_id) {
      system_id = state.filter.system_id
    } else if (state.systems.length > 0) {
      system_id = state.systems.map(r => r.id)
    }

    if (system_id === null) {
      return done({})
    }

    store.dispatch({ type: Action.UPDATE, payload: { searching: true } })
    const res = await LogCodeResources.findAllByPage(
      system_id,
      state.filter.module_id,
      state.filter.interface_id,
      state.filter.keyword,
      pageSize,
      currentPage
    )

    if (!res.success) {
      await this.showTips(res.message, store)
    }

    done({
      searching: false,
      pagination: {
        count: res.body.count,
        pageSize,
        currentPage
      },
      filter: {
        ...state.filter,
        system_id: _.isArray(state.filter.system_id) ? null : state.filter.system_id
      },
      codes: res.body.models
    })
  },

  /**
   * @param {object} model
   * @param {LogCodeLogCodeViewModel} state
   * @param {function} done
   */
  update(model, state, done) {
    done({
      ...state,
      ...model
    })
  },

  /**
   * @param {object} filter
   * @param {LogCodeLogCodeViewModel} state
   * @param {function} done
   */
  doFilter(filter, state, done) {
    const next = {
      ...state.filter,
      ...filter
    }
    done({
      filter: next
    })
  },

  /**
   * @param {Array<object>} list
   * @param {string} key
   * @return {Map}
   */
  listMap(list, key) {
    const map = new Map()
    for (let m of list) {
      map.set(m[key], m)
    }
    return map
  },

  /**
   * 发送提示信息
   * @param {string} tips
   * @param {Store<T>} store
   * @return {Promise<void>}
   */
  async showTips(tips, store) {
    await new Promise(resolve => store.dispatch({ type: Action.UPDATE, payload: { tips } }, resolve))
    await new Promise(resolve => store.dispatch({ type: Action.UPDATE, payload: { tips: null } }, resolve))
  },

  /**
   * @param {Store} store
   * @param {LogCodeLogCodeViewModel} state
   * @param {File} file
   * @param {function} done
   * @return {Promise.<void>}
   */
  async createFormFile(store, state, file, done) {

    if (!/.+\.txt/.test(file.name)) {
      return await this.showTips('只支持txt类型文件', store)
    }

    const thiz = this
    const reader = new ReadCsvAsUint8(file)
    const parser = new UTF8Parser()
    const scheduler = new Scheduler()
    const fileSize = file.size

    let readerComplated = false
    let uploadedCount = 0
    let uploaded = 0
    let uploadFaild = 0

    async function onNext(record) {
      const { lines, size } = record
      let buffer = lines.map(record => {
        // 单条数据格式：系统标识,产品线,错误码,错误详情
        const list = record.fields.map(buf => String.fromCodePoint.apply(null, parser.entry(buf).character))
        return {
          system: list[0],
          module: list[1],
          code: list[2],
          name: list[3] || null
        }
      })

      scheduler.entry({ buffer, size }, true)
      if (scheduler.overflowed()) {
        reader.pause()
      }
    }

    reader.subscribe(
      onNext,
      (error, already, read_size) => console.log('onError::', error, already, read_size),
      () => readerComplated = true
    )


    scheduler.subscribe(async function (record) {
      const res = await LogCodeResources.bulkCreate(state.project.id, record.data.buffer)

      uploadedCount = uploadedCount + record.data.size
      scheduler.release(record)

      if (!state.pause && scheduler.drain()) {
        reader.resume()
      }

      if (res.success) {
        uploaded = uploaded + res.body.created.length
        uploadFaild = uploadFaild + res.body.failed.length

        store.dispatch({
          type: Action.UPDATE,
          payload: {
            // 批量上传内容太多，不显示在页面上
            // codes: res.body.created,
            uploaded,
            uploadFaild,
            progress: parseFloat((uploadedCount / fileSize * 100).toFixed(2))
          }
        })

        // 上传失败，只显示第一条错误信息
        if (res.body.failed.length > 0) {
          await thiz.showTips(res.body.failed[0], store)
        }
      } else {
        await thiz.showTips(res.message, store)
      }

      if (readerComplated && scheduler.drain()) {
        done({ progress: 100 })
        // 上传完成后主动刷新一次页面
        store.dispatch({
          type: Action.PAGE_CHANGE,
          payload: {
            currentPage: 1,
            pageSize: state.pagination.pageSize
          }
        })
      }
    })

    reader.read()
    store.dispatch({ type: Action.UPDATE, payload: { reader } })
  },

  /**
   * @param {LogCodeLogCodeViewModel} state
   * @param {function} done
   */
  async pause(state, done) {
    if (state.reader !== null) {
      state.reader.pause()
    }
    done({ pause: true })
  },

  /**
   * @param {LogCodeLogCodeViewModel} state
   * @param {function} done
   */
  async resume(state, done) {
    if (state.reader !== null) {
      state.reader.resume()
    }
    done({ pause: false })
  },

  /**
   * 下载样例文件
   * @param {LogCodeLogCodeViewModel} state
   * @param {function} done
   */
  async sampleFile(state, done) {
    exportFile('error-code.txt', 'mobile,预订流,100838,支付失败\r\nmobile,预订流,AB100838,航班查询接口异常', 'text/text;charset-utf-8')
    done()
  }
}
