import _ from 'lodash'
import Fetch from 'client/common/fetch-final'
import * as bus from '../../../../databus/datasource'
import { DimDatasourceType } from 'common/constants'
import PubSub from 'pubsub-js'
import { notification } from 'antd'

const prefix = 'tag-hql-manage'
const Action = {
  list: `${prefix}-list`,
  save: `${prefix}-save`,
  dimensionList: `${prefix}-dimension-list`,
  updateState: `${prefix}-update-state`,
  change: `${prefix}-change`,
  run: `${prefix}-run`,
  manualRun: `${prefix}-manual-run`,
  dataImport: `${prefix}-data-import`,
  cancelManualRun: `${prefix}-cancel-manual-run`
}

const Def = {
  loading: false,
  saveing: false,
  modalVisible: false,
  dataImportVisible: false,
  project_id: null,
  tagHQL: {},
  search: '',
  selectedStatus: '-1',
  page: 1,
  pageSize: 5,
  hqlList: [],
  total: 0,
  dimensionList: [],
  uploadResults: []
}

const Actions = {

  /**
 * 查询列表
 * @param {String} projectId
 * @param {Function} done
 */
  async list(params, done) {
    const { project_id } = params
    const res = await Fetch.get(`/app/tag-hql/list/${project_id}`, params)
    if (!res || !res.success) {
      return
    }
    const {count: total, rows: hqlList} = res.result
    done({
      hqlList,
      total,
      loading: false
    })
  },

  /**
   * @description 获取维度列表
   * @param {any} datasource
   */
  async dimensionList(params, done) {
    const { datasource_id } = params
    const datasource_type = DimDatasourceType.tag
    const res = await bus.getDimensions(datasource_id, {
      datasource_type,
      includeDesensitiz: true
    })
    const dimensionList = res.total > 0 ? res.data || [] : []
    done({ dimensionList })
  },

  /**
   * @description 保存或更新
   * @param {any} state
   * @param {any} tagHQL 
   * @param {any} done 
   */
  async save(state, tagHQL, done) {
    let { hqlList, total } = state
    if (tagHQL.id) { // 更新
      const ret = await Fetch.put(`/app/tag-hql/update/${tagHQL.id}`, {...tagHQL})
      if (!ret || !ret.success) {
        done({saveing: false})
        return
      }
      const idx = _.findIndex(hqlList, (o) => o.id === tagHQL.id)
      _.update(hqlList, `[${idx}]`, () => tagHQL)
      done({
        tagHQL,
        hqlList,
        saveing: false,
        modalVisible: false
      })
    } else { // 新增
      const ret = await Fetch.post('/app/tag-hql/create', {...tagHQL})
      if (!ret || !ret.success) {
        done({saveing: false})
        return
      }
      done({
        tagHQL: ret.result,
        total: ++total,
        hqlList: [ret.result].concat(hqlList),
        saveing: false,
        modalVisible: false
      })
    }
  },

  async remove(state, id, done) {
    const ret = await Fetch.delete(`/app/tag-hql/remove/${id}`)
    if (!ret || !ret.success) {
      done({loading: false})
      return
    }
    // let { hqlList, total } = state
    // _.remove(hqlList, o => o.id === id)
    done({
      // hqlList,
      // total: --total,
      loading: false
    })
  },

  async run(state, params, done) {
    const { tagHQL, optType } = params
    const ret = await Fetch.get(`/app/tag-hql/run/${tagHQL.id}`, { optType })
    if (!ret || !ret.success) {
      done({loading: false})
      return
    }
    let { hqlList } = state
    const idx = _.findIndex(hqlList, (o) => o.id === tagHQL.id)
    _.update(hqlList, `[${idx}]`, () => ret.result)
    done({
      hqlList,
      loading: false
    })
  },

  async manualRun(state, params, done) {
    const { tagHQL } = params
    const ret = await Fetch.get(`/app/tag-hql/manual-run/${tagHQL.id}`, null, {
      timeout: 500000
    })
    if (!ret || !ret.success) {
      // done({[`running-${tagHQL.id}`]: false})
      return false
    }
    done({[`running-${tagHQL.id}`]: false})
    return true
  },

  async dataImport(state, params, done) {
    const { projectId, uploadResults = [], fileInfo = {} } = params
    const { dimensionList } = state
    const names = dimensionList.map(d => d.name)
    // data: [{
    //   "values":{"app_id":"4", "event_id":"0004"},
    //   "appendFlags":{"event_id":false}
    // }]
    const [columns] = _.take(uploadResults)
    const datas = _.takeRight(uploadResults, uploadResults.length - 1)
    let data = datas.map(vals => {
      const values = vals.map((val, idx) => {
        const key = columns[idx]
        // 过滤不存在的维度
        if (!_.includes(names, key)) {
          return null
        }
        return  { [key]: val }
      })
      return {
        values: values.reduce((prev, curr) => { return {...prev, ...curr}}, {})
      }
    })
    // 过滤非法维度值
    data = data.filter(o => _.keys(o.values).length > 0)
    let allLength = data.length
    let length = 0
    let ret = undefined
    for (let _data=data.splice(0, 5000); _data.length>0; _data=data.splice(0, 5000)) {
      ret = await Fetch.post(`/app/tag-hql/data-import/${projectId}`, { data: _data, fileInfo: {
        ...fileInfo,
        line_count: _data.length,
        column_count: _.keys(_.get(_data, '0.values', {})).length
      }
      })
      if (!ret || (ret && ret.result.failed > 0)) {
        done({
          saveing: false
        })
        return
      }
      length += _data.length
    }
    // const ret = await Fetch.post(`/app/tag-hql/data-import/${projectId}`, { data, fileInfo: {
    //   ...fileInfo,
    //   line_count: data.length,
    //   column_count: _.keys(_.get(data, '0.values', {})).length
    // }
    // })

    // console.log(ret, 'data-import')
    /**
     * {
        "success": 2,
        "failed": 0,
        "errors": []
      }
     */
    // if (!ret || (ret && ret.result.failed > 0)) {
    //   done({
    //     saveing: false
    //   })
    //   return false
    // }
    PubSub.publish('analytic.hql-import-get-list')
    notification.success({
      message: '提示',
      description: `导入标签数据成功, 成功[${length}]条, 失败[${allLength - length}}]条`
    })
    if (allLength === length) {
      done({
        saveing: false,
        dataImportVisible: false
      })
      return true
    }
  },

  async cancelManualRun (state, params, done) {
    const { tagHQL } = params
    const ret = await Fetch.get(`/app/tag-hql/cancel-manual-run/${tagHQL.id}`, null, {
      timeout: 500000
    })
    if (!ret || !ret.success) {
      done({[`running-${tagHQL.id}`]: false, [`cancel-${tagHQL.id}`]: false})
      return false
    }
    done({[`running-${tagHQL.id}`]: false, [`cancel-${tagHQL.id}`]: false})
    return true
  }
}

/**
 * @param {ViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler(state, action, done) {
  switch (action.type) {
    case Action.list:
      return Actions.list(action.payload, done)
    case Action.dimensionList:
      return Actions.dimensionList(action.payload, done)
    case Action.save:
      return Actions.save(state, action.payload, done)
    case Action.remove:
      return Actions.remove(state, action.payload, done)
    case Action.run:
      return Actions.run(state, action.payload, done)
    case Action.manualRun:
      return Actions.manualRun(state, action.payload, done)
    case Action.dataImport:
      return Actions.dataImport(state, action.payload, done)
    case Action.cancelManualRun:
      return Actions.cancelManualRun(state, action.payload, done)
    case Action.change:
      return {
        ...state,
        ...action.payload
      }
    default:
      return state
  }
}

export default {
  name: 'vm',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
