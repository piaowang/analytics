import _ from 'lodash'
import { get } from '../utils/logger'
import db from '../models'
import { defineTypes, PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import { Domain } from '../../common/url-tools'
import { getRedisClient, redisSetExpire, redisGet } from '../utils/redis'
import Storage, { GetSDKConifgPrefix, SDK_CONFIG_KEYS, SDK_CONFIG_EX } from './public-redis-storage.service'
import DataAnalysisService from './sugo-data-analysis.service'
import moment from 'moment'
import sugoGlobalConfigService from '../services/sugo-global-config.service'
import SugoProjectService from '../services/sugo-project.service'
import { AccessDataOriginalType } from '../../common/constants'
import conf from '../config'
import response from '../response-handle'

const logger = get('TrackEventService')

const sdkCommonH5 = conf.site.sdkCommonH5 || false // 当前是否将移动端的h5全部放在一个表中

const $checker = {
  create: defineTypes({
    page: PropTypes.string.isRequired,
    event_name: PropTypes.string.isRequired,
    event_type: PropTypes.string.isRequired,
    event_path: PropTypes.string.isRequired
  }),
  findEntirePageInfoByToken: defineTypes({
    token: PropTypes.string.isRequired,
    app_version: PropTypes.string.isRequired
  }),
  copyAppEvents: defineTypes({
    app_id: PropTypes.string.isRequired,
    project_id: PropTypes.string.isRequired,
    app_version: PropTypes.string
  }),

  getFirstLoginTime: defineTypes({
    userId: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired
  })
}

export default class SugoTrackEventService {
  /**
   * 删除相同版本的事件草稿
   */
  static async deleteAllSameVersionTrackEventDraft(token, appVersion, target, others) {
    let total = 0
    const deleteSql = {
      where: {
        appid: token,
        ...others
      },
      ...target
    }
    //从h5共用表中查数据，然后删除,根据projectid
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      total = await db.TrackEventDraft.destroy({
        where: {
          project_id: dim_inst.project_id,
          ...others
        },
        ...target
      })
    }

    deleteSql.where.app_version = appVersion
    total += await db.TrackEventDraft.destroy(deleteSql)
    return total
  }

  /**
   * 获取事件列表
   * */
  async getTrackEvents({ token, ...rest }) {
    const rows = []
    // 从移动端h5共用表中查询
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      const rowsH5 = await db.TrackEventMobileH5.findAll({
        where: {
          project_id: project_id
        },
        attributes: ['id', 'event_name', 'event_path', 'event_type', 'page', 'code', 'advance', 'changed_on', 'is_global']
      })
      rows.push(...rowsH5)
    }

    const rowsWithoutH5 = await db.TrackEvent.findAll({
      where: {
        appid: token
      },
      row: true,
      attributes: ['id', 'event_id', 'event_name', 'event_path', 'event_path_type', 'event_type', 'page', 'control_event', 'delegate', 'code', 'advance', 'changed_on', 'is_global']
    })
    rows.push(...rowsWithoutH5)
    return rows
  }

  /**
   * 保存可视化事件信息
   * 根据 `appid + page + event_path` 来判断事件是否存在
   * 如果存在则更新，不存在则新建
   *
   * 新版创建同类元素发生如下修改：
   * 1. 参数中传入 origin_path，表示为更新原有的同类元素记录
   * 2. 以origin_path为查找条件，更新记录的event_path为参数中的eventDraft.event_path
   * @param {TrackEventDraftModel} eventDraft
   * @param {String} token
   * @param {String} app_version
   * @param {?String} origin_path
   */
  async saveEventDraft({ eventDraft, token, app_version, origin_path }) {
    if (!$checker.create(eventDraft).success) return {}
    return await db.client.transaction(async transaction => {
      await db.AppVersion.findOrCreate({
        defaults: {
          appid: token,
          app_version: app_version,
          event_bindings_version: '0'
        },
        where: {
          appid: token,
          app_version: app_version
        },
        transaction
      })
      // 更新event_path
      const event_path = origin_path || eventDraft.event_path
      const { page } = eventDraft
      const ins = await db.TrackEventDraft.findOne({
        where: {
          appid: token,
          page,
          event_path
        }
      })
      let result = {}

      if (ins) {
        // update
        const record = ins.get({ plain: true })
        const { id, ...fields } = eventDraft

        await db.TrackEventDraft.update(fields, {
          where: {
            id: record.id,
            appid: token
          },
          transaction
        })

        result = {
          ...record,
          ...fields,
          app_version,
          appid: token
        }
      } else {
        // create
        const createSql = {
          ...eventDraft,
          app_version,
          appid: token
        }
        // 移动端的共用表没有appversion字段
        createSql.app_version = !(sdkCommonH5 && eventDraft.event_path_type === 'h5') ? app_version : null

        result = await db.TrackEventDraft.create(createSql, { transaction })
        result = result.get({ plain: true })
      }

      return result
    })
  }

  //删除草稿定义事件
  async deleteEventDraft({ token, id, app_version }) {
    let total = 0
    //尝试从移动端的h5共用表中删除
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      total += await db.TrackEventMobileH5Draft.destroy({
        where: {
          project_id: dim_inst.project_id,
          $or: { id } //id ,该表没有 event_id
        }
      })
    }
    total += await db.TrackEventDraft.destroy({
      where: {
        appid: token,
        $or: { id, event_id: id } //id or event_id
      }
    })
    return total
  }

  /**
   * @description 修改全局配置后 更新版本号
   * @todo  该方法的引用之地已经被注释了，但是又不想删掉，所以留着，不动他
   */
  async updataConfigDeploy(projectIds) {
    // 获取所有token
    let newEventBindingsVersion = _.toNumber(moment().format('X'))
    let tokens = await db.SugoDataAnalysis.findAll({ where: { project_id: { $in: projectIds } }, attributes: ['id'], raw: true })
    tokens = tokens.map(p => p.id)
    let resVersions = await db.AppVersion.findAll({
      where: { appid: { $in: tokens }, status: 1 },
      attributes: ['appid', 'app_version', 'event_bindings_version'],
      raw: true
    })
    return await db.client.transaction(async t => {
      const transaction = { transaction: t }
      //更新appversion 版本号
      await db.AppVersion.update(
        { event_bindings_version: newEventBindingsVersion },
        {
          where: { appid: { $in: tokens } },
          ...transaction
        }
      )

      for (let i = 0; i < resVersions.length; i++) {
        const { appid, app_version, event_bindings_version } = resVersions[i]
        await db.TrackEvent.update(
          { event_bindings_version: newEventBindingsVersion },
          {
            where: { appid, app_version, event_bindings_version },
            ...transaction
          }
        )
        await db.SugoSDKPageInfo.update(
          { event_bindings_version: newEventBindingsVersion },
          {
            where: { appid, app_version, event_bindings_version },
            ...transaction
          }
        )
        await db.SDKPageCategories.update(
          { event_bindings_version: newEventBindingsVersion },
          {
            where: { appid, app_version, event_bindings_version },
            ...transaction
          }
        )
      }
    })
  }

  /**
   * 部署可视化配置到正式场景
   * 移动端共用h5表的部署规则是，先将原有的属于appid的事件干掉，从draft表中拉取数据，然后直接塞进去，因为这个表没有版本的概念，所以就是这么任性！
   */
  async deployEvent({ token, app_version }) {
    return await db.client.transaction(async t => {
      const transaction = { transaction: t }
      if (app_version !== null) {
        //转换成string
        app_version = app_version + ''
      }
      let max_keep_version = 3
      let event_bindings_version = _.toNumber(moment().format('X'))

      if (sdkCommonH5) {
        // 先获取到token，去查询到项目的id，然后根据项目id去操作数据
        const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
        //刪除移动端h5共用表的正式数据
        await db.TrackEventMobileH5.destroy({
          where: {
            project_id: dim_inst.project_id
          },
          ...transaction
        })
        //从draft表复制到正式表
        const rows = await db.TrackEventMobileH5Draft.findAll({
          where: {
            project_id: dim_inst.project_id
          },
          raw: true,
          ...transaction
        })
        // 删除掉id
        const trackEvents = rows.map(row => {
          delete row.id
          return row
        })
        //批量插入新记录
        await db.TrackEventMobileH5.bulkCreate(trackEvents, transaction)
      }

      //删除之前保存失败的数据，避免重复
      await db.TrackEvent.destroy({
        where: {
          appid: token,
          app_version: app_version,
          event_bindings_version: event_bindings_version
        },
        ...transaction
      })

      //从TrackEventDraft复制到TrackEvent/////////////////////////////////////////////
      const rows = await db.TrackEventDraft.findAll({
        where: {
          appid: token,
          app_version: app_version
        },
        ...transaction
      })
      const trackEvents = rows.map(row => {
        let event = row.get({ plain: true })
        delete event.id
        event.event_bindings_version = event_bindings_version
        return event
      })
      //批量插入新记录
      await db.TrackEvent.bulkCreate(trackEvents, transaction)
      //更新版本
      await db.AppVersion.update(
        { event_bindings_version: event_bindings_version, last_deployed_on: Date.now() },
        {
          where: {
            appid: token,
            app_version: app_version
          },
          ...transaction
        }
      )

      const bindingVersions = await db.TrackEvent.findAll({
        where: { appid: token, app_version: app_version },
        ...transaction,
        attributes: ['event_bindings_version'],
        raw: true,
        group: 'event_bindings_version',
        order: [['event_bindings_version', 'ASC']]
      })
      let delete_version = ''
      if (bindingVersions.length > max_keep_version) {
        delete_version = _.get(bindingVersions[0], 'event_bindings_version')
      }
      if (delete_version !== '') {
        await db.TrackEvent.destroy({
          where: {
            appid: token,
            app_version: app_version,
            event_bindings_version: delete_version
          },
          ...transaction
        })
      }
      if (delete_version !== '') {
        await db.TrackEvent.destroy({
          where: {
            appid: token,
            app_version: app_version,
            event_bindings_version: delete_version
          },
          ...transaction
        })
      }
      const findAllSql = {
        where: {
          appid: token
        },
        raw: true,
        ...transaction
      }
      //从SugoSDKPageInfoDraft复制到SugoSDKPageInfo
      const pageDraftRows = await db.SugoSDKPageInfoDraft.findAll(findAllSql)

      const pageInfoDrafts = pageDraftRows.map(row => {
        delete row.id
        row.event_bindings_version = event_bindings_version
        return row
      })
      //批量插入新记录
      await db.SugoSDKPageInfo.bulkCreate(pageInfoDrafts, transaction)

      //开启移动端h5同数据的话，则复制到page_info_mobile_h5_draft到page_info_mobile_h5中,根据projectid去操作
      if (sdkCommonH5) {
        const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
        const pageDraftRows = await db.SugoSDKPageInfoMobileH5Draft.findAll({
          where: {
            project_id: dim_inst.project_id
          },
          raw: true,
          ...transaction
        })

        const pageInfoDrafts = pageDraftRows.map(row => {
          delete row.id
          row.event_bindings_version = event_bindings_version
          return row
        })
        // 这个表的只需要保存最新的，先干掉属于这个项目的，然后再把最新的添加进去
        await db.SugoSDKPageInfoMobileH5.destroy({
          where: {
            project_id: dim_inst.project_id
          },
          ...transaction
        })
        await db.SugoSDKPageInfoMobileH5.bulkCreate(pageInfoDrafts, transaction)
      }

      //更新版本
      await db.AppVersion.update(
        { event_bindings_version: event_bindings_version, last_deployed_on: Date.now() },
        {
          where: {
            appid: token,
            app_version: app_version
          },
          ...transaction
        }
      )

      const pageBindingVersions = await db.SugoSDKPageInfo.findAll({
        where: { appid: token, app_version: app_version },
        ...transaction,
        attributes: ['event_bindings_version'],
        raw: true,
        group: 'event_bindings_version',
        order: [['event_bindings_version', 'ASC']]
      })
      delete_version = ''
      if (pageBindingVersions.length > max_keep_version) {
        delete_version = _.get(pageBindingVersions[0], 'event_bindings_version')
      }
      if (delete_version !== '') {
        await db.SugoSDKPageInfo.destroy({
          where: {
            appid: token,
            app_version: app_version,
            event_bindings_version: delete_version
          },
          ...transaction
        })
      }

      // let delete_version = event_bindings_version - max_keep_version
      // await db.SugoSDKPageInfo.destroy({
      //   where: {
      //     appid: token,
      //     app_version: app_version,
      //     event_bindings_version: delete_version
      //   },
      //   ...transaction
      // })

      // let delete_version = event_bindings_version - max_keep_version
      // await db.SugoSDKPageInfo.destroy({
      //   where: {
      //     appid: token,
      //     app_version: app_version,
      //     event_bindings_version: delete_version
      //   },
      //   ...transaction
      // })

      // 复制page_categories_draft到page_categories
      // 删除原有记录
      await db.SDKPageCategories.destroy({
        where: {
          appid: token,
          app_version: app_version
        }
      })

      const pageCategories = await db.SDKPageCategoriesDraft.findAll({
        where: {
          appid: token,
          app_version
        }
      })

      if (pageCategories.length > 0) {
        const keys = ['name', 'appid', 'app_version', 'regulation']
        const categories = pageCategories.map(cate =>
          keys.reduce(
            (p, c) => {
              p[c] = cate[c]
              return p
            },
            { event_bindings_version: event_bindings_version }
          )
        )
        logger.info('deployEvent: Copy page categories => %j', categories)
        await db.SDKPageCategories.bulkCreate(categories, transaction)
      } else {
        logger.info('deployEvent: Do not need copy page category.')
      }
      const dataAnaly = await db.SugoDataAnalysis.findOne({
        where: {
          id: token
        },
        raw: true
      })
      if (!dataAnaly.id) {
        return
      }
      const project = await db.SugoProjects.findOne({
        where: {
          id: dataAnaly.project_id
        },
        raw: true
      })
      if (!project.id) {
        return
      }
      // 清除token下所有的缓存
      if (dataAnaly.access_type === AccessDataOriginalType.Web) {
        await Storage.DesktopDecide.delByToken(token)
        return
      }
      await Storage.DesktopDecide.deleteLastVersion(project.datasource_name, token, app_version)
      // 开启移动端h5事件合并下发配置后 将删除移动端sdk所有版本号的埋点事件缓存
      if (conf.sdkMergeH5TrackEvents) {
        await Storage.DesktopDecide.delByProjectId(project.id)
        return
      }
      await Storage.DesktopDecide.delByTokenAndVersion(token, app_version, project.datasource_name)
    })
  }

  /**
   * 保存可视化事件信息
   */
  async savePageInfoDraft({ pageInfoDraft, token, app_version }) {
    return await db.client.transaction(async t => {
      const transaction = { transaction: t }
      await db.AppVersion.findOrCreate({
        defaults: {
          appid: token,
          app_version: app_version,
          event_bindings_version: '0'
        },
        where: {
          appid: token,
          app_version: app_version
        },
        ...transaction
      })
      pageInfoDraft.app_version = app_version
      pageInfoDraft.appid = token
      const res = await db.SugoSDKPageInfoDraft.findOrCreate({
        defaults: {
          ...pageInfoDraft
        },
        where: {
          appid: token,
          page: pageInfoDraft.page,
          app_version
        },
        ...transaction
      })
      let [record, created] = res
      if (!created) {
        const updateSql = {
          page_name: pageInfoDraft.page_name,
          code: pageInfoDraft.code,
          similar: pageInfoDraft.similar,
          category: pageInfoDraft.category,
          is_submit_point: pageInfoDraft.is_submit_point
        }
        const updateWhere = {
          where: {
            id: record.id,
            appid: token
          },
          ...transaction
        }
        //已经存在则更新
        await db.SugoSDKPageInfoDraft.update(updateSql, updateWhere)
      }
      return {
        ...record.get({ plain: true }),
        ...pageInfoDraft
      }
    })
  }

  /**
   * 更新可视化事件信息
   * 该方法所引用的controller，前端没调用，就暂时不管了
   */
  editTrackEvent(params) {
    return db.client.transaction(async t => {
      let result = []
      const transaction = { transaction: t }
      for (let i = 0; i < params.length; i++) {
        let { id, tags, event_bindings_version, event_id } = params[i]
        let tkEventDraftObj = await db.TrackEventDraft.update(
          {
            tags
          },
          {
            where: {
              id
            },
            ...transaction
          }
        )

        if (_.isEmpty(tkEventDraftObj)) return
        let tkEventObj = await db.TrackEvent.update(
          {
            tags
          },
          {
            where: {
              event_id,
              event_bindings_version
            },
            ...transaction
          }
        )
        result.push({
          trackEventDraft: tkEventDraftObj,
          trackEvent: tkEventObj
        })
      }
      return result
    })
  }

  /**
   * 删除可视化配置事件草稿
   */
  deleteTrackEventDraft(ids) {
    // 尝试从移动端共用的h5表中删除数据
    const deleteSql = {
      where: {
        id: {
          $in: ids
        }
      }
    }
    if (sdkCommonH5) {
      db.TrackEventMobileH5Draft.destroy(deleteSql)
    }
    return db.TrackEventDraft.destroy(deleteSql)
  }
  static async mergeTrackEventDraft({ currentRecord, targetDataAnalysisId, appVersion, selectedTrackEventDraftList, selectedPageInfoDraftList, overwrite }) {
    /*{
     "currentRecord": {
     "projectId": "Sygzs1urYg",
     "analysisId": "38c07f58b8f6e1df82ea29f794b6e097",
     "accessType": 0,
     "projectName": "fxj_test6",
     "analysisName": "Android【android】"
     },
     "targetDataAnalysisId": "2a789a06f0f092cc40a67799d6dc2ab9",
     "appVersion": "1.0",
     "overwrite": [0,1],
     "selectedTrackEventDraftList": [
     {
     "key":2,
     "id":"BygXs6Ef6e"，
     "page": "io.sugo.sdkdemo.activity.WebActivity::/#index",
     "event_path": "{\"path\":\"div#a4117-11\"}",
     "event_name": "外卖"
     }
     ],
     "selectedPageInfoDraftList": [
     {
     "key":2,
     "id":"BygXs6Ef6e"，
     "page": "io.sugo.sdkdemo.activity.WebActivity::/#index",
     "event_path": "{\"path\":\"div#a4117-11\"}",
     "event_name": "外卖"
     }
     ]
     }*/
    return db.client.transaction(async t => {
      const transaction = { transaction: t }
      let targetTrackEventDraft = await db.TrackEventDraft.findAll({
        where: {
          appid: targetDataAnalysisId,
          app_version: appVersion
        }
      })

      let targetPageInfoDraft = await db.SugoSDKPageInfoDraft.findAll({
        where: {
          appid: targetDataAnalysisId,
          app_version: appVersion
        }
      })

      let currentTrackEventDraft = await db.TrackEventDraft.findAll({
        where: {
          appid: currentRecord.analysisId,
          app_version: appVersion
        }
      })

      let currentPageInfoDraft = await db.SugoSDKPageInfoDraft.findAll({
        where: {
          appid: currentRecord.analysisId,
          app_version: appVersion
        }
      })

      targetTrackEventDraft = targetTrackEventDraft.map(r => r.get({ plain: true }))
      targetPageInfoDraft = targetPageInfoDraft.map(r => r.get({ plain: true }))
      currentTrackEventDraft = currentTrackEventDraft.map(r => r.get({ plain: true }))
      currentPageInfoDraft = currentPageInfoDraft.map(r => r.get({ plain: true }))

      const existingTrackEventDraft = targetTrackEventDraft.map(tTED => {
        return currentTrackEventDraft.find(cTED => {
          return cTED.page === tTED.page && cTED.event_path === tTED.event_path
        })
      })
      const existingPageInfoDraft = targetPageInfoDraft.map(tPID => {
        return currentPageInfoDraft.find(cPID => {
          return tPID.page === cPID.page
        })
      })

      let createTrackEventDraftList = currentTrackEventDraft
      let createPageInfoDraftList = currentPageInfoDraft
      if ((existingTrackEventDraft.length || existingPageInfoDraft.length) && overwrite === 0) {
        return {
          existingTrackEventDraftList: existingTrackEventDraft,
          existingPageInfoDraftList: existingPageInfoDraft
        }
      } else {
        if (overwrite === 1) {
          //删除需要被覆盖的
          //Track Event Draft List
          let trackEventDraftList = await db.TrackEventDraft.findAll({
            where: {
              appid: targetDataAnalysisId,
              app_version: appVersion
            }
          })

          let destroyQuery = []
          selectedTrackEventDraftList.forEach(t => {
            destroyQuery.push(trackEventDraftList.find(r => r.page === t.page && r.event_path === t.event_path))
          })

          await db.TrackEventDraft.destroy(
            {
              where: {
                id: {
                  $in: destroyQuery.map(dq => dq.id)
                }
              }
            },
            transaction
          )

          //Page Info Draft List
          let pageInfoDraftList = await db.SugoSDKPageInfoDraft.findAll({
            where: {
              appid: targetDataAnalysisId,
              app_version: appVersion
            }
          })

          destroyQuery = []
          selectedPageInfoDraftList.forEach(t => {
            destroyQuery.push(pageInfoDraftList.find(r => r.page === t.page))
          })

          await db.SugoSDKPageInfoDraft.destroy(
            {
              where: {
                id: {
                  $in: destroyQuery.map(dq => dq.id)
                }
              }
            },
            transaction
          )

          //把没有被选的挑出来
          _.remove(existingTrackEventDraft, r => {
            let result = selectedTrackEventDraftList.find(t => t.event_path === r.event_path && t.page === r.page)
            return result ? true : false
          })

          //把没有被选中的过滤出来，就不用新增了
          _.remove(createTrackEventDraftList, r => {
            let result = existingTrackEventDraft.find(t => t.event_path === r.event_path && t.page === r.page)
            return result ? true : false
          })
        } //end if

        //把没有被选的挑出来
        _.remove(existingPageInfoDraft, r => {
          let result = selectedPageInfoDraftList.find(t => t.page === r.page)
          return result ? true : false
        })

        //把没有被选中的过滤出来，就不用新增了
        _.remove(createPageInfoDraftList, r => {
          let result = existingPageInfoDraft.find(t => t.page === r.page)
          return result ? true : false
        })
      } //end else

      //start copy & paste
      currentTrackEventDraft = createTrackEventDraftList.map(row => {
        delete row.id
        delete row.appid
        return (row = {
          appid: targetDataAnalysisId,
          ...row
        })
      })

      currentPageInfoDraft = createPageInfoDraftList.map(row => {
        delete row.id
        delete row.appid
        return (row = {
          appid: targetDataAnalysisId,
          ...row
        })
      })

      await db.TrackEventDraft.bulkCreate(currentTrackEventDraft, transaction)
      await db.SugoSDKPageInfoDraft.bulkCreate(currentPageInfoDraft, transaction)
      return true
    })
  }

  static async findEntirePageInfoByToken(token, app_version) {
    const checked = $checker.findEntirePageInfoByToken({ token, app_version })
    if (!checked.message) {
      return Response.fail(checked.message)
    }
    const ins = await db.SugoSDKPageInfoDraft.findAll({
      where: {
        appid: token,
        app_version
      }
    })
    //获取移动端h5共同表中的数据，并合并起来
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      const insH5 = await db.SugoSDKPageInfoMobileH5Draft.findAll({
        where: {
          project_id: dim_inst.project_id
        },
        raw: true
      })
      ins.push(...insH5)
    }
    return Response.ok(ins.map(r => r.get({ plain: true })))
  }

  /**
   * 分页查询页面信息列表
   * @param {String} token
   * @param {String} app_version
   * @return {Promise.<ResponseStruct>}
   */
  static async getPageInfoPaging(query) {
    let { app_id, name, state, page, pageSize, pageIndex, app_version, event_bindings_version, lastDeployedOn } = query

    let res
    const limit = pageSize
    const offset = (pageIndex - 1) * pageSize
    let where = {
      appid: app_id,
      app_version: app_version
    }
    if (name) {
      where.page_name = {
        $like: `%${name}%`
      }
    }
    if (page) {
      where.page = {
        $like: `%${page}%`
      }
    }

    if (state === 'DEPLOYED') {
      const findAndCountAllSql = {
        where: {
          ...where,
          event_bindings_version
        },
        limit,
        offset
      }
      res = await db.SugoSDKPageInfo.findAndCountAll(findAndCountAllSql)
      //查询移动端h5共用表
      //移动端的表都删除了app_version
      if (sdkCommonH5) {
        //先查询获取到总量
        const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: app_id }, raw: true })
        const countsH5 = await db.SugoSDKPageInfoMobileH5.count({ where: { project_id: dim_inst.project_id } })
        // 如果从原生那边读取的量不够，那么就从h5这边补上去
        res.count += parseInt(countsH5)
        if (res.rows.length < limit) {
          const resH5 = await db.SugoSDKPageInfoMobileH5.findAll({
            where: {
              project_id: dim_inst.project_id
            },
            limit: limit - res.rows.length,
            offset: pageIndex === 1 ? 0 : (pageIndex - 1) * pageSize - res.rows.length
          })

          res.rows.push(...resH5)
        }
      }
    } else {
      if (!lastDeployedOn || lastDeployedOn === null) {
        lastDeployedOn = '1970-01-01T00:00:00.000Z'
      }
      const findAndCountAllSql = {
        where: {
          ...where,
          changed_on: {
            $gt: lastDeployedOn
          }
        },
        limit,
        offset
      }
      res = await db.SugoSDKPageInfoDraft.findAndCountAll(findAndCountAllSql)
      // 查询移动端共用的h5表，获取到数据并且塞进去
      if (sdkCommonH5) {
        const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: app_id }, raw: true })
        //先查询获取到总量
        const countsH5 = await db.SugoSDKPageInfoMobileH5Draft.count({ where: { project_id: dim_inst.project_id } })
        // 如果从原生那边读取的量不够，那么就从h5这边补上去
        res.count += countsH5
        if (res.rows.length < limit) {
          Object.assign(findAndCountAllSql, { limit: limit - res.rows.length, offset: pageIndex === 1 ? 0 : (pageIndex - 1) * pageSize - res.rows.length })
          const resH5 = await db.SugoSDKPageInfoMobileH5Draft.findAll({
            where: {
              project_id: dim_inst.project_id
            },
            limit: limit - res.rows.length,
            offset: pageIndex === 1 ? 0 : (pageIndex - 1) * pageSize - res.rows.length
          })
          res.rows.push(...resH5)
        }
      }
    }
    return Response.ok({
      data: res.rows,
      totalCount: res.count
    })
  }

  /**
   * 使用appid查询所有已部署的页面信息
   * @param {String} token
   * @param {String} app_version
   * @return {Promise.<ResponseStruct>}
   */
  static async findEntireDeployedPageInfoByToken(token, app_version) {
    const checked = $checker.findEntirePageInfoByToken({ token, app_version })

    if (!checked.message) {
      return Response.fail(checked.message)
    }

    //查看当期使用的时间绑定版本
    const version_rows = await db.AppVersion.findAll({
      where: {
        appid: token,
        app_version,
        status: 1
      }
    })

    let event_bindings_version = 0
    if (version_rows.length > 0) {
      event_bindings_version = version_rows[0].event_bindings_version
    }
    const findAllSql = {
      where: {
        appid: token,
        app_version,
        event_bindings_version
      },
      raw: true
    }
    const ins = await db.SugoSDKPageInfo.findAll(findAllSql)

    let submitClickPoint = false
    const sdkConfig = await sugoGlobalConfigService.getInstance().findOne({ key: 'sdk_submit_click_point' })
    if (_.get(sdkConfig, 'value', '0') === '1') {
      // 根据token去获取页面信息，如果没有，则返回查询不到记录
      const project = await SugoProjectService.getInfoWithSDKToken(token)
      if (!project.success) {
        return Response.fail(project.message)
        // return returnResult(ctx, null)
      }
      submitClickPoint = _.get(project, 'result.extra_params.sdk_submit_click_point', '0') === '1'
    }

    const pageInfo = ins.map(p => {
      let item = { isSubmitPoint: !!(submitClickPoint && p.is_submit_point), ..._.omit(p, 'is_submit_point') }
      if (!item.code) return _.omit(item, 'code')
      return item
    })

    return Response.ok(pageInfo)
  }

  /**
   * @typedef {Object} CopyEventStruct
   * @property {string} app_id
   * @property {string} app_version
   */

  /**
   * 复制应用的事件到另一个应用
   * 1. 复制 sugo_app_version
   * 2. 复制 sugo_track_event_draft
   * 3. 复制 sugo_sdk_page_info_draft
   * 4. 复制 sugo_page_categories_draft
   * @param {CopyEventStruct} source
   * @param {CopyEventStruct} target
   * @param {string} [regulation] - 域名映射关系
   * @return {Promise.<ResponseStruct>}
   */
  static async copyAppEvents(source, target, regulation) {
    logger.info('copyAppEvents params. source: %j, target: %j, regulation: %s', source, target, regulation)

    const checked_source = $checker.copyAppEvents(source)
    if (checked_source.success) {
      logger.error('copyAppEvents params.source.error: %s', checked_source.message)
      return Response.fail(checked_source.message)
    }

    const checked_target = $checker.copyAppEvents(target)
    if (checked_target.success) {
      logger.error('copyAppEvents params.target.error: %s', checked_source.message)
      return Response.fail(checked_target.message)
    }

    const version = await db.AppVersion.findAll({
      where: {
        appid: source.app_id,
        app_version: source.app_version
      }
    })

    if (version.length === 0) {
      logger.error('copyAppEvents: Not found AppVersion appid')
      return Response.fail('找不到复制的应用版本')
    }

    if (_.isString(regulation)) {
      regulation = regulation.trim()
    }

    return await db.client.transaction(async transaction => {
      // =============================
      // app version
      // =============================
      // 1. 删除原有的app_version
      await db.AppVersion.destroy({
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // 2. 创建app_version
      await db.AppVersion.findOrCreate({
        defaults: {
          appid: target.app_id,
          app_version: target.app_version,
          event_bindings_version: '0'
        },
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // =============================
      // track events
      // =============================

      // 1. 查找所有事件记录
      let events = await db.TrackEventDraft.findAll({
        where: {
          appid: source.app_id,
          app_version: source.app_version
        },
        transaction
      })

      // 2. 删除之前的事件记录
      await db.TrackEventDraft.destroy({
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // 創建新的事件记录
      if (events.length > 0) {
        const fieldsMap = _.omit(events[0].get({ plain: true }), ['id', 'appid', 'app_version', 'created_on', 'changed_on'])
        const keys = _.keys(fieldsMap)
        logger.debug('copyAppEvents: Events keys => %j', keys)
        const ToCreateEvents = events.map(event =>
          keys.reduce(
            (p, c) => {
              p[c] = event[c]
              return p
            },
            { appid: target.app_id, app_version: target.app_version }
          )
        )

        logger.info(
          'copyAppEvents: Events to create: %j',
          ToCreateEvents.map(e => e.event_name)
        )
        await db.TrackEventDraft.bulkCreate(ToCreateEvents)
      } else {
        logger.warn('copyAppEvents: No events.')
      }

      // =============================
      // page information
      // =============================
      const info = await db.SugoSDKPageInfoDraft.findAll({
        where: {
          appid: source.app_id,
          app_version: source.app_version
        }
      })

      // 1. 删除之前的页面信息
      await db.SugoSDKPageInfoDraft.destroy({
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // 2. 复制页面信息到草稿表
      if (info.length > 0) {
        const fieldsMap = _.omit(info[0].get({ plain: true }), ['id', 'appid', 'app_version', 'created_on', 'changed_on'])
        const keys = _.keys(fieldsMap)
        logger.debug('copyAppEvents: Page info keys => %j', keys)
        const infoList = info.map(rc => {
          const ret = keys.reduce(
            (p, c) => {
              p[c] = rc[c]
              return p
            },
            { appid: target.app_id, app_version: target.app_version }
          )

          // 如果传入了regulation，则覆盖原来的设置
          if (regulation) {
            ret.category = Domain.replace(ret.page, regulation)
          }
          return ret
        })
        logger.info(
          'copyAppEvents: Page info to create: %j',
          infoList.map(info => info.page)
        )
        await db.SugoSDKPageInfoDraft.bulkCreate(infoList, { transaction })
      } else {
        logger.warn('copyAppEvents: No page info')
      }

      // =============================
      // regulation
      // 如果传入了regulation，表示用户需要重新设定哉名匹配规则
      // =============================
      if (regulation) {
        // 统计一个应用的所有事件的page，并使用regulations提供的pattern
        // 写入到 sugo_track_page_info_draft 表
        // 如果已经有记录，则更新记录的category
        // 如果没有记录，则插入记录
        const pages = new Set(events.map(event => event.page))
        const map = info.reduce(function (p, c) {
          p[c.page] = c
          return p
        }, {})

        // 直接写入数据
        const insert = []
        pages.forEach(page => {
          // 不计已有的page
          if (!map.hasOwnProperty(page)) {
            insert.push({
              appid: target.app_id,
              page,
              app_version: target.app_version,
              category: Domain.replace(page, regulation)
            })
          }
        })
        logger.info('copyAppEvents: Insert Page info regulation: %j', insert)
        await db.SugoSDKPageInfoDraft.bulkCreate(insert, { transaction })
      } else {
        logger.info('copyAppEvents: Do not need insert record to sugo_sdk_page_info_draft')
      }

      // ## 复制页面分类：sugo_sdk_page_categories_draft
      const categoriesIns = await db.SDKPageCategoriesDraft.findAll({
        where: {
          appid: source.app_id,
          app_version: source.app_version
        }
      })

      // 删除页面分类表
      await db.SDKPageCategoriesDraft.destroy({
        where: {
          appid: target.app_id,
          app_version: target.app_version
        },
        transaction
      })

      // 写入页面分类数据
      if (categoriesIns.length > 0) {
        const categories = categoriesIns.map(ins => ({
          name: ins.name,
          regulation: ins.regulation,
          appid: target.app_id,
          app_version: target.app_version
        }))
        logger.info('copyAppEvents: copy page categories: %j', categories)
        await db.SDKPageCategoriesDraft.bulkCreate(categories, { transaction })
      } else {
        logger.info('copyAppEvents: Do not need copy page categories')
      }

      return Response.ok()
    })
  }

  /**
   * 通过userId获取第一次登录时间
   *
   * @static
   * @param {string} userId
   * @param {string} token
   * @return {Promise.<ResponseStruct>}
   * @memberof SugoTrackEventService
   */
  static async getFirstLoginTime(userId, token) {
    const checked = $checker.getFirstLoginTime({ userId, token })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const PRes = await DataAnalysisService.findProject(token)
    if (!PRes.success) {
      return Response.fail(PRes.message)
    }

    const real_user_table = PRes.result.real_user_table

    if (!real_user_table) {
      return Response.fail('项目未关联用户表')
    }

    const client = await getRedisClient()
    const firstLoginTime = await client.hget(real_user_table, userId)

    if (firstLoginTime) {
      return Response.ok({
        firstLoginTime: parseInt(firstLoginTime),
        isFirstLogin: false
      })
    }

    const now = Date.now()
    await client.hset(real_user_table, userId, now)
    return Response.ok({ firstLoginTime: now, isFirstLogin: true })
  }
  /**
   * @description 根据传入的条件，获取未部署以及已部署的事件
   * 需要从两个表格查询，所以先查h5表的，如果长度超过的话，就直接返回，如果不超过的话就再拼接上h5原生的数据
   * 总长度的话，也要从两个表获取长度再说
   */
  static async getTrackEventsPaging(query) {
    const rows = []
    let countAllLength = 0 //总共有多少数据
    let { app_id, name, page, state, pageSize, pageIndex, app_version, event_bindings_version, lastDeployedOn } = query
    let where = [` event.appid = '${app_id}'`, ` event.app_version = '${app_version}'`]
    const count = ' count(event.id) as count '
    const h5fields = `  
    event.id,
    event.event_id,
    event.event_name,
    event.event_path,
    event.event_type,
    event.page,
    event.code,
    event.advance,
    event.similar,
    event.changed_on,
    event.similar_path,
    event.screenshot_id,
    page.page_name`
    const fields = `${h5fields},  
    event.event_path_type,
    event.control_event,
    event.delegate,
    event.tags
    `
    let sql = ''
    if (name) {
      where.push(` UPPER(event.event_name) like '%${name.toUpperCase()}%'`)
    }
    if (page) {
      where.push(` UPPER(event.page) = '${page.toUpperCase()}'`)
    }
    let limit = ` limit ${pageSize} offset ${(pageIndex - 1) * pageSize}`
    //这儿查询的是已部署的
    if (state === 'DEPLOYED') {
      where.push(`event.event_bindings_version = '${event_bindings_version}'`)
      sql = `SELECT
      <%= fields %>
      FROM
        sugo_track_event AS event
      LEFT JOIN sugo_sdk_page_info AS page ON event.page = page.page
      AND event.appid = page.appid
      AND event.event_bindings_version = page.event_bindings_version
      AND event.app_version = page.app_version`
    } else {
      if (!lastDeployedOn || lastDeployedOn === null) {
        lastDeployedOn = '1970-01-01T00:00:00.000Z'
      }
      where.push(` event.changed_on > '${lastDeployedOn}'`)
      sql = `SELECT
      <%= fields %>
      FROM
        sugo_track_event_draft AS event
      LEFT JOIN sugo_sdk_page_info_draft AS page ON event.page = page.page 
      AND event.appid = page.appid
      AND event.app_version = page.app_version 
    `
    }
    sql += where.length ? ` where ${where.join(' and ')}` : ''
    const resCount = await db.client.query(_.template(sql)({ fields: count }))
    //获取长度
    resCount.length ? (countAllLength = parseInt(resCount[0][0].count)) : null
    sql += limit
    const resData = await db.client.query(_.template(sql)({ fields }))
    rows.push(...resData[0])
    //接下来获取移动端h5的共用表，不需要管版本号，只需要从里面拿数据就好，要注意条数

    if (sdkCommonH5) {
      // h5表格的话需要先去获取到项目id，因为没办法根据token去关联
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: app_id }, raw: true })
      // 如果當前查詢出來，這個項目是web的話，後面不用查了
      if (dim_inst.name.toLocaleUpperCase().indexOf('WEB') == -1) {
        //判断操作的是正式表还是测试表
        let tableName = state === 'DEPLOYED' ? db.TrackEventMobileH5 : db.TrackEventMobileH5Draft
        // 如果从android以及ios表中查询的数据等于pageSize条，则说明不用从移动端的共用表中拿数据
        if (pageSize > rows.length) {
          const androidandiosLength = resCount[0].length === 0 ? 0 : resCount[0][0].count
          //查询条件，便于更改
          const findAllSql = {
            where: {
              project_id: dim_inst.project_id
            },
            limit: parseInt(pageSize) - parseInt(rows.length),
            offset: pageIndex === 1 ? 0 : (pageIndex - 1) * pageSize - androidandiosLength,
            raw: true
          }
          //补充两个查询的字段
          name ? (findAllSql.where.name = { $like: `%${name.toUpperCase()}%` }) : null
          page ? (findAllSql.where.page = { $like: `%${page.toUpperCase()}%` }) : null
          const H5resData = await tableName.findAndCountAll(findAllSql)
          //获取总数
          countAllLength += parseInt(H5resData.count || 0)
          //补充字段
          rows.push(...H5resData.rows.map(h5res => ({ ...h5res, event_path_type: 'h5' })))
        }
      }
    }
    return Response.ok({
      data: rows,
      totalCount: countAllLength
    })
  }

  //批量导入事件到事件草稿表
  static async batchImportTrackEventDraft({ eventsArr, token, app_version, transaction }) {
    await db.AppVersion.findOrCreate({
      defaults: {
        appid: token,
        app_version: app_version,
        event_bindings_version: '0'
      },
      where: {
        appid: token,
        app_version: app_version
      },
      transaction
    })
    await db.TrackEventDraft.destroy({
      where: {
        appid: token,
        app_version: app_version
      },
      ...transaction
    })
    // 防止导入的事件没有h5的，方便后期把于移动端h5跟原生独立开来操作

    let trackEventHasH5 = false
    // create
    let trackEvents = eventsArr.map(i => {
      i = _.omit(i, ['changed_on', 'id', 'appid', 'app_version'])
        ; (i.appid = token), (i.app_version = app_version)
      return i
    })
    // 如果有h5的页面并且打开了开关
    if (trackEventHasH5 && sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      //删除掉移动端h5共同表的数据
      await db.TrackEventDraft.destroy({
        where: {
          project_id: dim_inst.project_id
        },
        ...transaction
      })
      // 数据进行筛选，然后把属于h5的数据放进去
      const trackEventH5 = trackEvents.map(trackEvent => trackEvent.event_path_type === 'h5')
      await db.TrackEventMobileH5Draft.bulkCreate(trackEventH5, transaction)
      // 留下不属于移动端h5的数据
      trackEvents = trackEvents.map(trackEvent => !(trackEvent.event_path_type === 'h5'))
    }
    await db.TrackEventDraft.bulkCreate(trackEvents, transaction)
  }

  static async batchImportTrackPageInfoDreaft({ pageInfoArr, token, app_version, transaction }) {
    const deleteSql = {
      where: {
        appid: token,
        app_version: app_version
      },
      ...transaction
    }
    await db.SugoSDKPageInfoDraft.destroy(deleteSql)

    // 删除移动端公用h5表的数据
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      await db.SugoSDKPageInfoMobileH5Draft.destroy({
        where: {
          project_id: dim_inst.project_id
        },
        ...transaction
      })
    }
    const trackInfos = (trackInfosH5 = [])
    pageInfoArr.forEach(i => {
      i = _.omit(i, ['created_on', 'changed_on', 'id', 'appid', 'app_version'])
        ; (i.appid = token), (i.app_version = app_version)
      // 防止導入的數據沒有event_path_type
      i.event_path_type = i.event_path_type || ''
      // 只有有字段的时候才会加进去
      i.event_path_type === 'h5' && sdkCommonH5 ? trackInfosH5.push(i) : trackInfos.push(i)
    })
    await db.SugoSDKPageInfoDraft.bulkCreate(trackInfos, transaction)
    sdkCommonH5 ? await db.SugoSDKPageInfoMobileH5Draft.bulkCreate(trackInfos, transaction) : null
  }

  static async batchImportPageCategoriesDraft({ pageCategoriesArr, token, app_version, transaction }) {
    await db.SDKPageCategoriesDraft.destroy({
      where: {
        appid: token,
        app_version: app_version
      },
      ...transaction
    })
    let trackInfos = pageCategoriesArr.map(i => {
      i = _.omit(i, ['created_at', 'updated_at', 'id', 'appid', 'app_version'])
        ; (i.appid = token), (i.app_version = app_version)
      return i
    })
    await db.SDKPageCategoriesDraft.bulkCreate(trackInfos, transaction)
  }

  static async batchImportEventProps({ eventProps, token, app_version, transaction }) {
    await db.TrackEventProps.destroy({
      where: {
        appid: token,
        app_version: app_version
      },
      ...transaction
    })
    let trackInfos = eventProps.map(i => {
      i = _.omit(i, ['created_at', 'updated_at', 'id', 'appid', 'app_version'])
        ; (i.appid = token), (i.app_version = app_version)
      return i
    })
    await db.TrackEventProps.bulkCreate(trackInfos, transaction)
  }
  static async updateRedisDimensionAndEventVersion(ctx) {
    const [res] = await db.client.query(`select proj.id as project_id, proj.datasource_name, ana.id as token, ver.app_version, ver.event_bindings_version from sugo_app_version ver
        left join sugo_data_analysis ana on ver.appid = ana.id
        left join sugo_projects proj  on ana.project_id = proj.id
        where ver.status = 1 and proj.datasource_name is not null and  ana.id is not null`)
    for (let i = 0; i < res.length; i++) {
      const item = res[i]
      const key = GetSDKConifgPrefix(item.datasource_name, item.token, item.app_version) + '|' + SDK_CONFIG_KEYS.latestEventVersion
      await redisSetExpire(key, SDK_CONFIG_EX, item.event_bindings_version)
    }
    const prjects = _.uniqBy(res, p => p.project_id)
    for (let i = 0; i < prjects.length; i++) {
      const item = prjects[i]
      const key = GetSDKConifgPrefix(item.datasource_name) + '|' + SDK_CONFIG_KEYS.latestDimensionVersion
      const dimensionKey = `PUBLIC_REDIS_KEY_DIMENSION_${item.project_id} `
      let val = await redisGet(dimensionKey)
      val = _.get(val, 'dimension_version', -1)
      await redisSetExpire(key, SDK_CONFIG_EX, val)
    }
    return true
  }
}
