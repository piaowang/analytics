/**
 * Created by fengxj on 11/1/16.
 */
import db, { quoteIdentifiers } from '../models'
import uuid from 'node-uuid'
import qr from 'qr-image'
import CryptoJS from 'crypto-js'
import zlib from 'zlib'
import { returnResult, returnError } from '../utils/helper'
import { redisSetExpire, redisGet, redisDel, redisExpire, redisSet } from '../utils/redis'
import SugoDatasourceService from '../services/sugo-datasource.service'
import SugoTrackEventService from '../services/sugo-track-event.service'
import SugoSdkPageInfoService from '../services/sugo-sdk-page-info.service'
import SugoProjectService from '../services/sugo-project.service'
import DruidQueryService from '../services/druid-query.service'
import AppVersionService from '../services/sugo-app-version'
import SugoDataAnalysisService from '../services/sugo-data-analysis.service'
import { Response } from '../utils/Response'
import { PropTypes } from '../../common/checker'
import Storage from '../services/public-redis-storage.service'
import SugoTrackEventPropsService from '../services/sugo-track-event-props.service'
import FirstStartTimeService from '../services/sugo-first-start-time.service'
import { convertDateType, queryDuridFormat } from '../../common/param-transform'
import conf from '../config'
import _ from 'lodash'
import multiparty from 'koa2-multiparty'
import sugoGlobalConfigService from '../services/sugo-global-config.service'
import { existedFile, rename } from '../utils/fs-promise'
import path from 'path'
import fs from 'fs'
import os from 'os'
import redusStorage, { GetDecideEventPrefix, GetSDKConifgPrefix, SDK_CONFIG_KEYS, SDK_CONFIG_EX } from '../services/public-redis-storage.service'

const redis_expire = 60
//heatRedisExpire: 默认1天, //heatEventPastDays默认过去3天的event记录
const {
  heatEventPastDays = 3,
  site: { sdkCommonH5 = false },
  heatRedisExpire = 1 * 24 * 60 * 60
} = conf

function base64_decode(base64str) {
  var bitmap = new Buffer(base64str, 'base64')
  return bitmap
}

const sugoSDK = {
  snapshot: async ctx => {
    let params = ctx.q
    let token = params.token
    let rs = '{}'
    if (token && global.conn_map[token]) rs = global.conn_map[token].snapshot

    ctx.body = rs
  },
  //保存事件的events似乎只读取第一个，那个人理解就是一次只有一个事件
  saveEvent: async ctx => {
    let params = ctx.q
    let events = params.events
    let appid = params.token
    let app_version = params.app_version
    const { company_id, id: userId } = ctx?.session?.user || { id: '', company_id: '' }
    if (!appid) {
      return returnError(ctx, 'token为空')
    }
    if (!app_version || app_version == null || app_version.trim() === '') {
      return returnError(ctx, 'app版本为空')
    }
    const dataAnalysis = await db.SugoDataAnalysis.findOne({ where: { id: appid }, attributes: ['project_id'], raw: true })
    if (!dataAnalysis) return returnError(ctx, '接入信息错误')
    const project = await db.SugoProjects.findOne({ where: { id: dataAnalysis.project_id }, attributes: ['datasource_name'], raw: true })
    const { datasource_name } = project
    let res = await db.client.transaction(async transaction => {
      //判断是否存在appVersion
      await db.AppVersion.findOrCreate({
        where: { appid, app_version },
        defaults: {
          appid,
          app_version,
          event_bindings_version: 0,
          status: 1,
          last_deployed_on: Date.now()
        },
        transaction
      })

      let event = events[0]
      let { opt, extend_value, event_id, event_path_type } = event
      //判断操作的正式表是ios以及android 共用的表格还是事件表
      const dbTrackEvent = event_path_type === 'h5' && sdkCommonH5 ? db.TrackEventMobileH5 : db.TrackEvent
      const dbTrackEventDraft = event_path_type === 'h5' && sdkCommonH5 ? db.TrackEventMobileH5Draft : db.TrackEventDraft
      if (opt === 'delete') {
        //检查已部署表是否使用截图
        const resEvent = await dbTrackEvent.findOne({ where: { screenshot_id: event.screenshot_id } })
        if (!resEvent) {
          await db.TrackEventScreenshot.destroy({
            where: { id: event.screenshot_id },
            transaction
          })
        }
        let dim_inst = {}
        if (event_path_type === 'h5' && sdkCommonH5) {
          // h5表格的话需要先去获取到项目id，因为没办法根据token去关联
          dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: appid }, raw: true })
          event.project_id = dim_inst.project_id
        }
        //删除事件,需要查询事件
        await dbTrackEventDraft.destroy({
          where: event_path_type === 'h5' && sdkCommonH5 ? { project_id: dim_inst.project_id, id: event.id } : { appid, id: event.id },
          transaction
        })

        //删除自定属性
        //h5表没有app_version以及event_id字段
        let removeSql = { appid, event_id }
        if (!(sdkCommonH5 && event_path_type === 'h5')) {
          removeSql = { appid, app_version, event_id }
        }
        await SugoTrackEventPropsService.getInstance().remove(removeSql, { transaction })
      } else if (opt === 'update') {
        // 如果是移动端共用h5的情况下，则去获取project_id，然后存放进去
        let dim_inst = {}
        if (event_path_type === 'h5' && sdkCommonH5) {
          // h5表格的话需要先去获取到项目id，因为没办法根据token去关联
          dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: appid }, raw: true })
          event.project_id = dim_inst.project_id
        }
        // h5共用表根据id还有project_id来查询
        let inDb = await dbTrackEventDraft.findOne(event_path_type === 'h5' && sdkCommonH5 ? { id: event.id, project_id: dim_inst.project_id } : { where: { id: event.id, appid } })

        if (!inDb) {
          transaction.rollback()
          throw new Error('修改事件不存在')
        }

        // 更新事件
        await inDb.update(
          {
            ..._.pick(
              event,
              event_path_type === 'h5' && sdkCommonH5
                ? ['event_name', 'page', 'event_path', 'code', 'advance', 'similar', 'event_type', 'binds', 'cross_page', 'similar_path']
                : [
                  'event_name',
                  'page',
                  'event_path',
                  'code',
                  'advance',
                  'similar',
                  'event_type',
                  'binds',
                  'cross_page',
                  'similar_path',
                  'sugo_autotrack_path',
                  'sugo_autotrack_page_path',
                  'sugo_autotrack_content',
                  'sugo_autotrack_position',
                  'class_attr'
                ]
            )
          },
          { transaction }
        )

        //h5表没有app_version字段
        let removeSql = { event_id }
        if (!(event_path_type === 'h5' && sdkCommonH5)) {
          removeSql = { event_id, app_version, appid }
        }
        //删除事件自定义属性
        await SugoTrackEventPropsService.getInstance().remove(removeSql, { transaction })
        let createSql = {
          appid,
          extend_value,
          datasource_name,
          created_by: userId,
          company_id,
          event_id
        }
        if (!(event_path_type === 'h5' && sdkCommonH5)) {
          createSql = { ...createSql, app_version }
        }
        //添加自定义属性
        if (extend_value) {
          await SugoTrackEventPropsService.getInstance().create(createSql, { transaction })
        }
      } else if (opt === 'insert') {
        let screenshotId = uuid.v4()
        //保存截图
        if (event.screenshot) {
          let promise = new Promise((resolve, reject) => {
            zlib.gzip(base64_decode(event.screenshot), function (error, result) {
              if (error) reject(error)
              resolve(result)
            })
          })

          let screenshotdata = await promise.then(buff => buff)
          event.screenshot = null
          await db.TrackEventScreenshot.create(
            {
              id: screenshotId,
              screenshot: screenshotdata
            },
            { transaction }
          )
        }
        event.event_id = uuid.v4()
        event.screenshot_id = screenshotId
        // 如果是移动端共用h5的情况下，则去获取project_id，然后存放进去
        const findOrCreateSql = {
          where: {
            event_path: event.event_path
          },
          defaults: event,
          transaction
        }
        if (event_path_type === 'h5' && sdkCommonH5) {
          // h5表格的话需要先去获取到项目id，因为没办法根据token去关联
          const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: appid }, raw: true })
          event.project_id = dim_inst.project_id
          // 之前的判定，是根据全路径的，现在因为新的共用表没有全路径了，所以修改为根据event_path还有project_id判定
          findOrCreateSql.where = { ...findOrCreateSql.where, project_id: dim_inst.project_id }
        }
        //移动端共用的h5的表格相比原来的少了几个字段
        if (!(event_path_type === 'h5' && sdkCommonH5)) {
          // 更改搜索条件
          findOrCreateSql.where = {
            app_version: app_version,
            appid,
            event_path: event.event_path,
            sugo_autotrack_page_path: event.sugo_autotrack_page_path,
            sugo_autotrack_path: event.sugo_autotrack_path,
            sugo_autotrack_position: event.sugo_autotrack_position || ''
          }
        }
        await dbTrackEventDraft.findOrCreate(findOrCreateSql)
        if (extend_value) {
          await SugoTrackEventPropsService.getInstance().create(
            {
              appid,
              extend_value,
              datasource_name,
              event_id: event.event_id,
              app_version: app_version,
              created_by: userId,
              company_id
            },
            { transaction }
          )
        }
      }
      return event
    })
    if (res.error) {
      return returnError(ctx, res.error)
    }
    returnResult(ctx, { success: true })
  },
  /**
   * 保存页面信息到草稿表中
   * @description 保存页面的配置信息，分别保存在sdkappversion.pageinfodraft(pageinfomobileh5draft)中,如果有sdkCommonH5(config文件中),则说明h5信息要保存在一起
   */
  savePageInfo: async ctx => {
    let params = ctx.q
    let pageInfos = params.pageInfos
    let token = params.token
    let app_version = params.app_version

    if (!app_version || app_version == null || app_version.trim() === '') {
      return returnError(ctx, 'app版本为空')
    }
    let inDb = await db.AppVersion.findOne({
      where: {
        appid: token,
        app_version: app_version
      }
    })

    if (!inDb) {
      let appversion = {
        appid: token,
        app_version: app_version,
        event_bindings_version: 0,
        last_deployed_on: Date.now()
      }
      await db.AppVersion.create(appversion)
    }

    let rs = { success: true, rows: [] }

    for (let key in pageInfos) {
      let pageInfo = pageInfos[key] //页面的信息
      let dbDraft = db.SugoSDKPageInfoDraft //保存的对象表
      let sqlWhere = {
        where: {
          appid: token,
          app_version: app_version,
          page: pageInfo.page
        }
      }

      /**如果是ios端以及android端的h5页面，则会传递h5这个参数，将其保存到移动端h5共同使用的pageinfomobileh5表中 */
      if (pageInfo.isH5 && sdkCommonH5) {
        dbDraft = db.SugoSDKPageInfoMobileH5Draft
        const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
        sqlWhere = {
          where: {
            project_id: dim_inst.project_id,
            page: pageInfo.page
          }
        }
        delete pageInfo['app_version']
      }

      inDb = await dbDraft.findOne(sqlWhere)
      if (inDb) {
        await dbDraft.update(
          {
            ..._.omit(pageInfo, 'page')
          },
          sqlWhere
        )
      } else {
        pageInfo.appid = token
        pageInfo.isH5 && sdkCommonH5 ? null : (pageInfo.app_version = app_version)
        await dbDraft.create(pageInfo)
      }
      let rows = await dbDraft.findAll({
        where: {
          page: pageInfo.page,
          appid: token
        },
        attributes: ['id', 'page', 'page_name', 'code', 'similar', 'category', 'is_submit_point']
      })

      for (let i = 0; i < rows.length; i++) {
        rs.rows.push(rows[i])
      }
    }

    returnResult(ctx, rs)
  },

  deployEvent: async ctx => {
    const params = ctx.q
    const { token, app_version } = params
    if (!token) {
      return returnError(ctx, 'token为空')
    }
    if (!app_version) {
      return returnError(ctx, 'app版本为空')
    }

    await new SugoTrackEventService().deployEvent({ token, app_version })
    returnResult(ctx, { success: true })
  },

  getPageInfoDraft: async ctx => {
    const { token, app_version, isBatchExport } = ctx.q
    let rowsH5 = []

    // 从移动端的h5共同表中找数据
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      rowsH5 = await db.SugoSDKPageInfoMobileH5Draft.findAll({
        where: {
          project_id: dim_inst.project_id
        },
        raw: true,
        attributes: !isBatchExport
          ? ['page', 'page_name', 'code', 'similar', 'id', 'changed_on', 'category', 'is_submit_point']
          : ['page', 'page_name', 'code', 'similar', 'category', 'is_submit_point']
      })
    }
    const rows = await db.SugoSDKPageInfoDraft.findAll({
      where: {
        appid: token,
        app_version: app_version
      },
      attributes: !isBatchExport
        ? ['page', 'page_name', 'code', 'similar', 'id', 'changed_on', 'category', 'is_submit_point']
        : ['page', 'page_name', 'code', 'similar', 'category', 'is_submit_point']
    })

    returnResult(ctx, [...rowsH5, ...rows])
  },

  getPageInfo: async ctx => {
    const { token, app_version, event_bindings_version } = ctx.q
    const rows = await db.SugoSDKPageInfo.findAll({
      where: {
        appid: token,
        app_version,
        event_bindings_version
      },
      attributes: ['page', 'page_name', 'code', 'similar', 'id', 'changed_on', 'is_submit_point']
    })
    // 从ios以及android的共同h5表格中获取数据，并塞进去
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      const rowsH5 = await db.SugoSDKPageInfoMobileH5.findAll({
        where: {
          project_id: dim_inst.project_id,
          event_bindings_version
        },
        attributes: ['page', 'page_name', 'code', 'similar', 'id', 'changed_on', 'is_submit_point']
      })
      rows.push(...rowsH5)
    }
    returnResult(ctx, rows)
  },

  /**
   * 获取事件列表
   * */
  getTrackEvents: async ctx => {
    const findAllSql = {
      where: {
        appid: token,
        event_bindings_version,
        ...rest //app_version, event_bindings_version
      },
      attributes: ['id', 'event_name', 'event_path', 'event_type', 'page', 'code', 'advance', 'similar', 'changed_on', 'similar_path', 'screenshot_id'],
      raw: true
    }
    const { token, ...rest } = ctx.q
    const rows = []

    let resBindVersion = await db.AppVersion.findOne({ where: { appid: token, ...rest }, attributes: ['event_bindings_version'] })
    const event_bindings_version = _.get(resBindVersion, 'event_bindings_version')
    // 先增加公共页面h5的数据，在更改条件去增加数据
    if (sdkCommonH5) {
      const rowsH5 = await db.TrackEventMobileH5.findAll(findAllSql)
      // 把那几个字段补上，怕前端没有会炸
      rows.push(...rowsH5.map(row => ({ ...row, event_id: '', event_path_type: '', control_event: '', delegate: '', tags: '', class_attr: '' })))
    }
    Object.assign(findAllSql, {
      attributes: [
        'id',
        'event_id',
        'event_name',
        'event_path',
        'event_path_type',
        'event_type',
        'page',
        'control_event',
        'delegate',
        'code',
        'advance',
        'similar',
        'changed_on',
        'tags',
        'similar_path',
        'screenshot_id',
        'class_attr'
      ]
    })
    const rowsWithouH5 = await db.TrackEvent.findAll(findAllSql)
    rows.push(...rowsWithouH5)
    ctx.body = {
      data: rows
    }
  },

  //分页获取事件列表
  getTrackEventsPaging: async ctx => {
    let res = await SugoTrackEventService.getTrackEventsPaging(ctx.q)
    return (ctx.body = res)
  },

  /**
   * 获取事件草稿列表
   * */
  getTrackEventsDraft: async ctx => {
    const { token, isBatchExport, ...rest } = ctx.q
    const rows = []
    // 从移动端h5公共表中获取
    if (sdkCommonH5) {
      // h5表格的话需要先去获取到项目id，因为没办法根据token去关联
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      const rowsH5 = await db.TrackEventMobileH5Draft.findAll({
        where: {
          project_id: dim_inst.project_id
        },
        raw: true,
        attributes: !isBatchExport
          ? ['id', 'event_id', 'event_name', 'event_path', 'event_type', 'page', 'code', 'advance', 'similar', 'changed_on', 'screenshot_id', 'similar_path', 'binds']
          : ['event_name', 'event_id', 'event_path', 'event_type', 'page', 'code', 'advance', 'similar', 'similar_path', 'created_on', 'binds']
      })
      // 添加上类型，前端方便识别
      rows.push(
        ...rowsH5.map(row => ({
          ...row,
          event_path_type: 'h5',
          sugo_autotrack_path: JSON.parse(row.event_path).path,
          sugo_autotrack_page_path: row.page
        }))
      )
    }
    const rowsWithoutH5 = await db.TrackEventDraft.findAll({
      where: {
        appid: token,
        ...rest
      },
      raw: true,
      attributes: !isBatchExport
        ? ['id', 'event_id', 'event_name', 'event_path', 'event_path_type',
          'event_type', 'page', 'control_event', 'delegate', 'code', 'advance',
          'similar', 'changed_on', 'tags', 'binds', 'cross_page', 'screenshot_id',
          'similar_path', 'class_attr', 'sugo_autotrack_path', 'sugo_autotrack_page_path', 'sugo_autotrack_position']
        : ['event_id', 'event_name', 'event_path', 'event_path_type',
          'event_type', 'page', 'control_event', 'delegate', 'code', 'advance',
          'similar', 'tags', 'binds', 'cross_page', 'similar_path', 'class_attr', 'created_on',
          'sugo_autotrack_path', 'sugo_autotrack_page_path', 'sugo_autotrack_position']
    })
    rows.push(...rowsWithoutH5)
    const extendValues = await SugoTrackEventPropsService.getInstance().findAll(
      {
        event_id: rows.map(p => p.event_id),
        appid: token,
        ...rest
      },
      { attributes: ['extend_value', 'event_id'], raw: true }
    )
    const extenValueMap = _.keyBy(extendValues, p => p.event_id)
    ctx.body = {
      data: rows.map(p => {
        const val = _.get(extenValueMap, [p.event_id, 'extend_value'], '')
        return {
          ...p,
          extend_value: val
        }
      })
    }
  },

  /**
   * 获取屏幕截图Draft
   * */
  getEventSreenshotDraft: async ctx => {
    const { screenshot_id } = ctx.q
    const rows = await db.TrackEventScreenshot.findAll({
      where: {
        id: screenshot_id
      },
      attributes: ['screenshot']
    })
    if (rows.length === 0 || rows[0].screenshot === null) {
      returnResult(ctx, '')
      return
    }

    for (let key in rows) {
      let promise = new Promise((resolve, reject) => {
        zlib.unzip(rows[key].screenshot, function (error, result) {
          if (error) reject(error)
          resolve(result)
        })
      })

      let screenshotdata = await promise.then(buff => buff)
      rows[key].screenshot = screenshotdata.toString('base64')
    }
    returnResult(ctx, rows[0].screenshot)
  },

  /**
   * TODO 该方法似乎已经废弃，不动他了
   * 获取屏幕截图
   * */
  getEventSreenshot: async ctx => {
    const { token, ...rest } = ctx.q
    const rows = await db.TrackEvent.findAll({
      where: {
        appid: token,
        ...rest //id, app_version,
      },
      attributes: ['screenshot']
    })
    if (rows.length === 0 || rows[0].screenshot === null) {
      return returnResult(ctx, rows[0].screenshot)
    }

    for (let key in rows) {
      let promise = new Promise((resolve, reject) => {
        zlib.unzip(rows[key].screenshot, function (error, result) {
          if (error) reject(error)
          resolve(result)
        })
      })

      let screenshotdata = await promise.then(buff => buff)
      rows[key].screenshot = screenshotdata.toString('base64')
    }
    returnResult(ctx, rows[0].screenshot)
  },
  heat: async ctx => {
    let { token, app_version } = ctx.query //lib = android,ios,web
    let redisKey = ['heat_config', token, app_version].join('_')
    let appVersionDetail = await db.AppVersion.findOne({
      where: {
        appid: token,
        app_version
      }
    })

    let heat_map = {}

    if (!appVersionDetail) {
      ctx.body = {
        heat_map
      }
      return
    }

    appVersionDetail = appVersionDetail.get({ plain: true })
    let res = await redisGet(redisKey)
    //如果缓存里的event_bindings_version 是最新的，就返回，不然就往下从数据库查询
    if (res != null && appVersionDetail.event_bindings_version === res.event_bindings_version) {
      ctx.body = {
        heat_map: res.heat_map
      }
      return
    }

    const trackEventList = await db.TrackEvent.findAll({
      where: {
        appid: token,
        app_version,
        event_bindings_version: appVersionDetail.event_bindings_version
      },
      attributes: ['event_id', 'event_bindings_version']
    })

    const trackEventIdSet = new Set(trackEventList.map(te => te.get({ plain: true }).event_id))

    const ds = await SugoDatasourceService.selectOneByAppidForNewAccess(token)
    if (!ds) {
      return returnError(ctx, '非法请求：token参数错误')
    }

    let projectId = ds.name

    const daysArray = convertDateType(`-${heatEventPastDays} days`, queryDuridFormat())

    const query = `SELECT event_id, count(*) as count FROM \`${projectId}\` 
      WHERE token='${token}' 
      AND app_version='${app_version}' 
      AND __time BETWEEN '${daysArray[0]}' AND '${daysArray[1]}' 
      GROUP BY event_id `
    let dataCache = await DruidQueryService.queryBySQL(query)

    let eventCountList = dataCache.data

    eventCountList.forEach(te => {
      if (trackEventIdSet.has(te['event_id'])) {
        heat_map[te['event_id']] = te['count']
      }
    })

    const finalResult = {
      heat_map
    }

    await redisSetExpire(redisKey, heatRedisExpire, Object.assign(finalResult, { event_bindings_version: appVersionDetail.event_bindings_version }))
    ctx.body = {
      heat_map
    }
    return
  },

  decideTrackEvent: async ctx => {
    let { token, app_version, event_bindings_version = -1, projectId } = ctx.query
    let redisKey = GetDecideEventPrefix(token, app_version) //['config', token, app_version, 'track_event'].join('_')
    let res = await redisGet(redisKey)
    const { result: { isSugoInitialize, isHeatMapFunc } } = await Storage.GlobalConfig.get(projectId, token, app_version)
    if (!isSugoInitialize) {
      ctx.body = {
        event_bindings_version: 0,
        page_info: [],
        h5_event_bindings: [],
        event_bindings: []
      }
      return
    }
    const getResult = data => {
      // 如果客户端event_bindings_version跟服务端一样则返回版本号，取客户端的事件记录
      if (data && data.event_bindings_version.toString() === event_bindings_version.toString()) {
        return { event_bindings_version: data.event_bindings_version }
      }
      return data
    }
    if (res != null) {
      ctx.body = getResult(res)
      return
    }

    res = await SugoProjectService.getInfoWithSDKToken(token)
    if (!res.success) {
      return returnResult(ctx, null)
    }

    //查看当期使用的时间绑定版本
    let versionInfo = await db.AppVersion.findOne({
      where: {
        appid: token,
        app_version: app_version
      }
    })
    let serverBindsVersoin = _.get(versionInfo, 'event_bindings_version', 0)

    if (!serverBindsVersoin) {
      ctx.body = {
        event_bindings_version: 0,
        page_info: [],
        h5_event_bindings: [],
        event_bindings: []
      }
      return
    }
    const rows = []
    const findAllSql = {
      where: {
        appid: token
      },
      attributes: ['event_name', 'event_path', 'event_type', 'page', 'code', 'advance', 'similar', 'binds', 'cross_page', 'similar_path'],
      raw: true
    }
    // 从移动端的公共h5表中获取数据
    if (sdkCommonH5) {
      const rowsH5 = await db.TrackEventMobileH5.findAll(findAllSql).catch(err => console.log(err))
      rows.push(...rowsH5)
    }
    // 修改sql的条件，因为两个表的字段不一样
    findAllSql = {
      where: {
        appid: token,
        app_version,
        event_bindings_version: serverBindsVersoin
      },
      attributes: [
        'event_id',
        'event_name',
        'event_path',
        'event_path_type',
        'event_type',
        'page',
        'control_event',
        'delegate',
        'code',
        'advance',
        'similar',
        'binds',
        'cross_page',
        'similar_path',
        'class_attr'
      ],
      raw: true
    }
    let rowsWithoutH5 = await db.TrackEvent.findAll(findAllSql).catch(err => console.log(err))
    rows.push(...rowsWithoutH5)
    //因为有开关，所以这儿暂时不改动，只是加默认值，不然代码多会乱
    const event_bindings = rows
      .filter(p => p.event_path_type !== 'h5')
      .map(p => {
        let {
          event_id = '',
          event_name,
          similar_path = '',
          event_path,
          event_path_type = '',
          event_type,
          page,
          control_event = '',
          delegate = '',
          code,
          advance,
          class_attr = '',
          similar
        } = p
        if (!similar_path) {
          similar = false
        }
        class_attr =
          class_attr && class_attr.length
            ? _.reduce(
              _.groupBy(class_attr, p => p.dim),
              (r, v, k) => {
                r[k] = v.map(p => p.cls).join(',')
                return r
              },
              {}
            )
            : {}

        let event = {
          event_id,
          event_name,
          event_type,
          target_activity: page
        }

        if (advance && code) {
          event.attributes = JSON.parse(code)
        }
        if (event_path_type === 'android') {
          event.path = similar ? JSON.parse(similar_path) : JSON.parse(event_path)
          event.classAttr = class_attr
        } else if (event_path_type === 'ios') {
          event.path = similar ? similar_path.replace('[*]', '') : event_path
          event.control_event = control_event
          event.table_delegate = delegate
          event.classAttr = class_attr
        }
        return event
      })

    const h5_event_bindings = rows
      .filter(p => p.event_path_type === 'h5')
      .map(item => {
        let { event_id = '', event_name, event_path, event_type, page, code, advance, similar, binds, cross_page, similar_path } = item
        let event = {
          event_id,
          event_name,
          event_type,
          target_activity: page
        }
        if (!similar_path) {
          similar = false
        }
        if (advance) {
          event.code = code || ''
          event.binds = binds || {}
        }
        event.path = JSON.parse(event_path)
        event.target_activity = page
        event.similar = !!similar
        event.similar_path = similar ? JSON.parse(similar_path || event_path).path.replace(/ &/g, '') : ''
        event.cross_page = cross_page
        return event
      })
    findAllSql = {
      where: {
        appid: token,
        app_version,
        event_bindings_version: serverBindsVersoin
      },
      attributes: ['page', 'page_name', 'code', 'similar', 'category', 'is_submit_point'],
      raw: true
    }

    rows = await db.SugoSDKPageInfo.findAll(findAllSql)
    // 从移动端共用的h5表中，塞到数据中
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: appid }, raw: true })
      const rowsH5 = await db.SugoSDKPageInfoMobileH5.findAll({
        where: {
          project_id: dim_inst.project_id,
          event_bindings_version: serverBindsVersoin
        },
        attributes: ['page', 'page_name', 'code', 'similar', 'category', 'is_submit_point'],
        raw: true
      })
      rows.push(...rowsH5)
    }
    const page_info = rows.map(p => {
      let item = { isSubmitPoint: !!(isHeatMapFunc && p.is_submit_point), ..._.omit(p, 'is_submit_point') }
      if (!item.code) return _.omit(item, 'code')
      return item
    })

    const result = {
      event_bindings_version: _.toNumber(serverBindsVersoin),
      page_info,
      h5_event_bindings,
      event_bindings
    }
    const redisEventVersionKey = `${GetSDKConifgPrefix(projectId, token, app_version)}|${SDK_CONFIG_KEYS.latestEventVersion}`
    await redisSetExpire(redisKey, SDK_CONFIG_EX, result)
    await redisSetExpire(redisEventVersionKey, SDK_CONFIG_EX, _.toNumber(serverBindsVersoin))
    ctx.body = getResult(result)
    return
  },

  decideDimension: async ctx => {
    let { token, dimension_version = -1, projectId: datasourceName } = ctx.query
    const { result: { isSugoInitialize, uploadLocation } } = await Storage.GlobalConfig.get(datasourceName, token)
    if (!isSugoInitialize) {
      ctx.body = {
        dimensions: [],
        dimension_version: 0,
        position_config: 0
      }
      return
    }
    const project = await SugoProjectService.getInfoWithSDKToken(token)

    if (!project.success) {
      return returnResult(ctx, null)
    }
    const DimRes = await Storage.SDKDimension.get(project.result.id, datasourceName)
    if (!DimRes.success) {
      return returnResult(ctx, null)
    }
    const resDimVersion = DimRes.result.dimension_version

    if (resDimVersion.toString() === dimension_version) {
      ctx.body = { dimension_version: resDimVersion }
      return
    }
    ctx.body = {
      dimensions: DimRes.result.dimensions,
      dimension_version: resDimVersion,
      position_config: uploadLocation
    }
  },

  decideGlobalConfig: async ctx => {
    let { projectId, tokenId, appVersion, sdkVersion } = ctx.query
    const res = await Storage.GlobalConfig.get(projectId, tokenId, appVersion)
    ctx.body = res.result
  },

  // sdk 拉取可视化埋点配置
  decide: async ctx => {
    let { token, lib, app_version, event_bindings_version = -1, projectId } = ctx.query
    const { result: { isSugoInitialize } } = await Storage.GlobalConfig.get(projectId, token, app_version)
    if (!isSugoInitialize) {
      ctx.body = {
        event_bindings_version: 0,
        page_info: [],
        h5_event_bindings: [],
        event_bindings: [],
        dimensions: []
      }
      return
    }
    let redis_key = ['config', token, app_version].join('_')
    let res = await redisGet(redis_key)
    const getResult = data => {
      // 如果客户端event_bindings_version跟服务端一样则返回版本号，取客户端的事件记录
      if (data && data.event_bindings_version === Number(event_bindings_version)) {
        return { event_bindings_version: data.event_bindings_version }
      }
      return data
    }
    if (res != null) {
      ctx.body = getResult(res)
      return
    }

    res = await SugoProjectService.getInfoWithSDKToken(token)

    if (!res.success) {
      return returnResult(ctx, null)
    }

    const project = res.result

    //查看当期使用的时间绑定版本
    let version_rows = await db.AppVersion.findAll({
      where: {
        appid: token,
        app_version: app_version
      }
    })
    let result,
      serverBindsVersoin = 0
    if (version_rows.length > 0) {
      serverBindsVersoin = version_rows[0].event_bindings_version
    }

    ////////////////////////////////////////////
    result = {
      event_bindings_version: serverBindsVersoin.length > 8 ? _.toNumber(serverBindsVersoin.substr(2)) : _.toNumber(serverBindsVersoin),
      event_bindings: [],
      h5_event_bindings: [],
      page_info: []
    }
    let rows = []
    let findAllSql = {
      where: {
        appid: token
      },
      attributes: ['event_name', 'event_path', 'event_type', 'page', 'code', 'advance', 'similar', 'binds', 'cross_page', 'similar_path']
    }
    //两个表的结构不一样，需要额外筛选
    findAllSql = {
      where: {
        appid: token,
        app_version,
        event_bindings_version: serverBindsVersoin
      },
      attributes: [
        'event_id',
        'event_name',
        'event_path',
        'event_path_type',
        'event_type',
        'page',
        'control_event',
        'delegate',
        'code',
        'advance',
        'similar',
        'binds',
        'cross_page',
        'similar_path'
      ]
    }
    if (sdkCommonH5) {
      const rowsH5 = await db.TrackEventMobileH5.findAll(findAllSql).catch(err => console.log(err))
      rows.push(...rowsH5)
    }
    let rowsWithoutH5 = await db.TrackEvent.findAll(findAllSql).catch(err => console.log(err))
    rows.push(...rowsWithoutH5)

    for (let key in rows) {
      let {
        event_id = '',
        event_name,
        similar_path = '',
        event_path,
        event_path_type = '',
        event_type,
        page,
        control_event = '',
        delegate = '',
        code,
        advance,
        similar,
        binds,
        cross_page
      } = rows[key]
      let b_event = {
        event_id,
        event_name,
        event_type
      }
      if (!similar_path) {
        similar = false
      }

      if (advance === true) {
        if (event_path_type === 'h5') {
          b_event.code = code || ''
          b_event.binds = binds || {}
        } else if (code != null) {
          b_event.attributes = JSON.parse(code)
        }
      }
      if (lib === 'android') {
        if (similar && event_path_type === 'android') b_event.path = JSON.parse(similar_path)
        else b_event.path = JSON.parse(event_path)
        b_event.target_activity = page
      } else if (lib === 'iphone') {
        if (similar && event_path_type === 'ios') {
          b_event.path = similar_path.replace('[*]', '')
        } else {
          b_event.path = event_path
        }
        b_event.control_event = control_event
        b_event.table_delegate = delegate
      }

      if (event_path_type === 'android' || event_path_type === 'ios') {
        result.event_bindings.push(b_event)
      } else if (event_path_type === 'h5') {
        b_event.path = JSON.parse(event_path)
        b_event.target_activity = page
        b_event.similar = similar
        b_event.similar_path = similar ? JSON.parse(similar_path || event_path).path.replace(/ &/g, '') : ''
        b_event.cross_page = cross_page
        result.h5_event_bindings.push(b_event)
      }
    }
    findAllSql = {
      where: {
        appid: token,
        app_version,
        event_bindings_version: serverBindsVersoin
      },
      attributes: ['page', 'page_name', 'code', 'similar', 'category']
    }
    rows = await db.SugoSDKPageInfo.findAll(findAllSql)

    //从移动端的共用h5表中查询数据，并且塞进去
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: appid }, raw: true })
      const rowsH5 = await db.SugoSDKPageInfoMobileH5.findAll({
        where: {
          project_id: dim_inst.project_id,
          event_bindings_version: serverBindsVersoin
        },
        raw: true,
        attributes: ['page', 'page_name', 'code', 'similar', 'category']
      })
      rows.push(...rowsH5)
    }
    for (let key in rows) {
      let { page, page_name, code, similar, category } = rows[key]
      let page_info = {
        page: page,
        page_name: page_name,
        similar: similar,
        category: category
      }
      if (code != null) {
        page_info.code = code
      }
      result.page_info.push(page_info)
    }
    const DimRes = await Storage.SDKDimension.get(project.id, projectId)
    if (!DimRes.success) {
      return returnResult(ctx, null)
    }
    result.dimensions = DimRes.result.dimensions
    await redisSetExpire(redis_key, redis_expire, result)
    ctx.body = getResult(result)
    return
  },

  getDimensionsForWX: async ctx => {
    const { token } = ctx.query
    const res = await SugoProjectService.getInfoWithSDKToken(token)
    if (!res.success) {
      return returnResult(ctx, null)
    }
    const project = res.result
    const DimRes = await Storage.SDKDimension.get(project.id, project.datasource_name)
    if (!DimRes.success) {
      return returnResult(ctx, null)
    }
    const dimensions = DimRes.result.dimensions
    returnResult(ctx, dimensions)
  },

  //根据token 获取项目维度
  getDimensionsByToken: async ctx => {
    let { token } = ctx.q
    const res = await SugoDatasourceService.getDimensionsByToken(token)
    returnResult(ctx, res)
  },

  //获取页面分类
  getCategory: async ctx => {
    let { token } = ctx.q
    const res = await SugoDatasourceService.getCategory(token)
    returnResult(ctx, res)
  },

  qrCode: async ctx => {
    let { token, redirectPage, secretKey } = ctx.query
    let newSecretKey = secretKey ? secretKey : CryptoJS.MD5(uuid.v4()).toString()
    //global.secret_key_map[token] = secret_key

    let url = `${ctx.protocol}://${ctx.host}/${redirectPage}?token=${token}&sKey=${newSecretKey}`
    var qr_png = qr.image(url, { type: 'png', size: 6 })
    var chunks = []
    var size = 0
    let buf
    ctx.type = 'image/png'
    let promise = new Promise((resolve, reject) => {
      qr_png.on('data', function (chunk) {
        try {
          chunks.push(chunk)
          size += chunk.length
        } catch (err) {
          reject(err)
        }
      })
      qr_png.on('end', function () {
        buf = Buffer.concat(chunks, size)
        resolve(buf)
      })
    })

    let img = await promise.then(buff => buff)
    ctx.body = img
  },

  /**
   * 获取版本列表
   * */
  getAppVersions: async ctx => {
    const { token } = ctx.q
    const version_rows = await db.AppVersion.findAll({
      where: {
        appid: token
      },
      attributes: ['id', 'appid', 'app_version', 'event_bindings_version', 'changed_on', 'status', 'last_deployed_on']
    })
    ctx.body = {
      rows: version_rows
    }
  },

  copyEvents: async ctx => {
    let { token, app_version, copy_version } = ctx.q
    if (!token || token == null) {
      return returnError(ctx, 'token不能为空')
    }
    if (!app_version || app_version == null || app_version.trim() === '') {
      return returnError(ctx, 'app版本不能为空')
    }
    if (!copy_version || copy_version == null) {
      return returnError(ctx, '被拷贝的app版本不能为空')
    }

    //检验被复制的版本是否存在
    let versionRows = await db.AppVersion.findOne({
      where: {
        appid: token,
        app_version: copy_version
      }
    })

    if (!versionRows) {
      return returnError(ctx, '找不到被复制的版本')
    }
    let eventBindingsVersion = versionRows.event_bindings_version
    if (eventBindingsVersion === 0) {
      return returnError(ctx, '被复制的版本无绑定事件')
    }

    let res = await db.client.transaction(async t => {
      let target = {
        transaction: t
      }
      //增加新版本
      let newVersion = await db.AppVersion.findOne({
        where: {
          appid: token,
          app_version: app_version
        },
        raw: true
      })
      if (!newVersion) {
        let appversion = {
          appid: token,
          app_version: app_version,
          event_bindings_version: 1,
          last_deployed_on: Date.now()
        }
        await db.AppVersion.create(appversion, target)
      }
      let rows = []
      let findAllSql = {
        where: {
          appid: token,
          app_version: copy_version
        },
        raw: true
      }

      let rowsWithoutH5 = await db.TrackEventDraft.findAll(findAllSql)
      rows.push(...rowsWithoutH5)

      for (let key in rows) {
        let event = {
          ..._.omit(rows[key], ['id']),
          event_bindings_version: 1,
          app_version,
          event_id: uuid.v4()
        }
        await db.TrackEventDraft.create(event, target)
      }
      findAllSql = {
        where: {
          appid: token,
          app_version: copy_version
        },
        raw: true
      }
      rows = await db.SugoSDKPageInfoDraft.findAll(findAllSql)

      for (let key in rows) {
        let pageInfo = {
          ..._.omit(rows[key], ['id']),
          event_bindings_version: 1,
          app_version
        }

        await db.SugoSDKPageInfoDraft.create(pageInfo, target)
      }
      return true
    }) //事务
    returnResult(ctx, res)
  },

  deleteAllTrackEventDraftAndPageInfo: async ctx => {
    let { token, appVersion } = ctx.q

    if (!token || token == null) {
      return returnError(ctx, 'token不能为空')
    }
    if (!appVersion || appVersion == null || appVersion.trim() === '') {
      return returnError(ctx, 'app版本不能为空')
    }
    let res = await db.client.transaction(async t => {
      let target = {
        transaction: t
      }
      try {
        await SugoTrackEventService.deleteAllSameVersionTrackEventDraft(token, appVersion, target)
        await SugoSdkPageInfoService.deleteAllSameVersionSdkPageInfoDraft(token, appVersion, target)
      } catch (err) {
        return returnError(ctx, '删除失败，请查看当前草稿事件是否存在数据')
      }
      return true
    })

    if (res) {
      return returnResult(ctx, res)
    }
  },

  deletePageInfoDraft: async ctx => {
    let { pageInfoId } = ctx.q
    if (!pageInfoId || pageInfoId == null || pageInfoId.trim() === '') {
      return returnError(ctx, '页面ID不能为空')
    }
    let res = await SugoSdkPageInfoService.deleteSDKPageInfoDraft(pageInfoId)
    if (res) {
      return returnResult(ctx, true)
    }
  },

  updateAppVersionStatus: async ctx => {
    const { modalAppVersionSelected, status, token } = ctx.q
    const res = await db.AppVersion.update(
      {
        status: status
      }, {
      where: {
        appid: token,
        app_version: modalAppVersionSelected
      }
    }
    )
    //清除redis里的配置缓存 ----sugo-sdk.controller.js -> decide 函数
    let redis_key = ['config', token, modalAppVersionSelected].join('_')
    await redisDel(redis_key)

    //sugo-desktop.controller.js -> decide 不用删,60秒缓存能接受

    return returnResult(ctx, res)
  },

  getDataAnalysisList: async ctx => {
    const { projectId, appVersion, currentAnalysisId, analysisAccessType } = ctx.q
    const res = await db.SugoDataAnalysis.findAll({
      //distinct: true,
      attributes: ['id', 'name', 'project_id'],
      where: {
        project_id: projectId,
        access_type: analysisAccessType,
        id: {
          $ne: currentAnalysisId
        }
      },
      include: {
        model: db.AppVersion,
        where: {
          app_version: appVersion
        }
      }
    })
    //console.log(res)
    return returnResult(ctx, res)
  },

  mergeTrackEventDraft: async ctx => {
    let res = await SugoTrackEventService.mergeTrackEventDraft(ctx.q)
    if (typeof res === 'boolean') {
      return returnResult(ctx, { success: res })
    } else {
      return returnResult(ctx, res)
    }
  },

  getPageInfoAndTrackEvent: async ctx => {
    const { token, app_version, event_bindings_version } = ctx.q
    if (!token || !app_version || !event_bindings_version) {
      return returnError(ctx, '缺少查询参数')
    }

    const sql = `SELECT DISTINCT ${quoteIdentifiers('pageInfo.id')} AS 页面ID,${quoteIdentifiers('pageInfo.page_name')}  AS 页面名称, ${quoteIdentifiers(
      'trackEvent.event_path_type'
    )} AS 页面类型,
    ${quoteIdentifiers('pageInfo.page')} AS 页面路径, ${quoteIdentifiers('pageInfo.code')} AS 页面注入代码, ${quoteIdentifiers('trackEvent.id')} AS 事件ID, ${quoteIdentifiers(
      'trackEvent.event_name'
    )} AS 事件名称,
    ${quoteIdentifiers('trackEvent.event_path')} AS 事件元素, ${quoteIdentifiers('trackEvent.event_path_type')} AS 平台类型, ${quoteIdentifiers('trackEvent.page')} AS 所属页面,
    ${quoteIdentifiers('trackEvent.similar')} AS 是否同类元素, ${quoteIdentifiers('trackEvent.code')} AS 事件代码, ${quoteIdentifiers('pageInfo.category')} as category
      FROM sugo_track_event ${quoteIdentifiers('trackEvent')}
      LEFT JOIN sugo_sdk_page_info ${quoteIdentifiers('pageInfo')} ON ${quoteIdentifiers('trackEvent.appid')} = ${quoteIdentifiers('pageInfo.appid')}
      AND ${quoteIdentifiers('trackEvent.app_version')} = ${quoteIdentifiers('pageInfo.app_version')}
      AND ((${quoteIdentifiers('pageInfo.page')}=${quoteIdentifiers('trackEvent.page')} and ${quoteIdentifiers('trackEvent.event_path_type')}<>'h5') or (${quoteIdentifiers(
      'trackEvent.page'
    )} like '%'|| ${quoteIdentifiers('pageInfo.page')} and ${quoteIdentifiers('trackEvent.event_path_type')}='h5'))
      AND ${quoteIdentifiers('trackEvent.event_bindings_version')} = ${quoteIdentifiers('pageInfo.event_bindings_version')}
      WHERE ${quoteIdentifiers('trackEvent.appid')} = :appid
        AND ${quoteIdentifiers('trackEvent.app_version')} = :app_version
        AND ${quoteIdentifiers('trackEvent.event_bindings_version')} = :event_bindings_version`

    const res = await db.client.query(sql, {
      replacements: {
        appid: token,
        app_version,
        event_bindings_version
      }
    })

    const list = res && res.length > 0 ? res[0] : []
    const results = list.map(info => {
      const { category, ...reset } = info
      if (category) {
        reset['页面路径'] = category
        reset['所属页面'] = category
      }
      return reset
    })

    returnResult(ctx, results)
  },

  /**
   * 创建一个新的app version
   * @param ctx
   * @return {Promise.<void>}
   */
  async createAppVersion(ctx) {
    ctx.body = await AppVersionService.create(ctx.q)
  },

  /**
   * 更新AppVersion
   * @param ctx
   * @return {Promise.<*>}
   */
  async updateAppVersion(ctx) {
    const checked = PropTypes.string.isRequired(ctx.q, 'id')

    if (!checked.success) {
      return (ctx.body = Response.fail(checked.message))
    }

    const { id, app_version } = ctx.q
    const { result: record } = await AppVersionService.query(id)

    if (!record) {
      return (ctx.body = Response.fail('未找到记录'))
    }

    // 检测是否为用户所拥有的AppVersion
    // TODO 判断success状态
    const { result: analysis } = await SugoDataAnalysisService.query(record.appid)
    const { result: project } = await SugoProjectService.info(analysis.project_id)

    if (project.company_id !== ctx.session.user.company_id) {
      return (ctx.body = Response.fail('无操作权限'))
    }

    let {
      result: { eventCount }
    } = await AppVersionService.getEventCountByAppVersion(record.appid, record.app_version)
    if (eventCount > 0) {
      return returnError(ctx, '修改失败,已部署事件无法修改版本号')
    }
    let {
      result: { hasAppVersion }
    } = await AppVersionService.checkAppVersion(app_version)
    if (hasAppVersion > 0) {
      return returnError(ctx, '修改失败,版本号已存在')
    }
    ctx.body = await AppVersionService.update(ctx.q)
  },

  /**
   * 查询app_version列表，并汇总每个app_version已部署事件的总数
   * @param ctx
   * @return {Promise.<void>}
   */
  async listWithEventsCount(ctx) {
    const { token } = ctx.q
    ctx.body = await AppVersionService.listWithEventsCount(token)
  },

  /**
   * 禁用启用appversion 并删除缓存
   * @param ctx
   * @return {Promise.<ResponseStruct>}
   */
  async toggleAppVersionStatus(ctx) {
    const checked = PropTypes.string.isRequired(ctx.q, 'id')

    if (!checked.success) {
      return (ctx.body = Response.fail(checked.message))
    }

    const { id, appid, app_version, status } = ctx.q
    const { result: record } = await AppVersionService.query(id)

    if (!record) {
      return (ctx.body = Response.fail('未找到记录'))
    }

    ctx.body = await AppVersionService.update({ id, status })
    await redisDel(['config', appid, app_version].join('_'))
    await redisDel(['config', appid, app_version, 'track_event'].join('_'))
    await redisDel(['hot_config', appid, app_version].join('_'))
  },
  /**
   * 获取用户第一次登录时间
   * @param {*} ctx
   */
  async getFirstLoginTime(ctx) {
    const { userId, token } = ctx.query
    return (ctx.body = await SugoTrackEventService.getFirstLoginTime(userId, token))
  },

  async sdkUploadImportFile(ctx) {
    let isImporting = await redisGet('importing-sdk-file') || false
    if (isImporting) return ctx.body = Response.fail('有项目正在导入,请等候')

    await multiparty()(ctx)

    const file = ctx.req.files.file

    if (!file) return (ctx.body = Response.fail('没有收到文件'))

    const { appid, app_version } = ctx.req.body
    if (!appid || !app_version) return (ctx.body = Response.fail('缺少参数'))

    let res = await rename(file.path, path.resolve(file.path, `../${file.originalFilename}`))

    ctx.status = 200
    if (res === '重命名成功') return (ctx.body = Response.ok('上传成功'))
    else return (ctx.body = Response.fail(res))
  },

  async sdkStartImportdata(ctx) {
    const { app_version, appid, filename, app_type, datasourceName } = ctx.q
    let reg = new RegExp('_' + app_type)
    if (!reg.test(filename)) {
      return Response.fail('非法sdk类型文件')
    }
    let filepath = path.resolve(os.tmpdir(), filename)
    let existedFilename = await existedFile(filepath)
    let isImporting = (await redisGet('importing-sdk-file')) || false
    if (!existedFilename || isImporting) {
      let message = isImporting ? '正在执行导入任务' : '文件不存在或已过期'
      return (ctx.body = Response.fail(message))
    }
    await redisSetExpire('importing-sdk-file', 1 * 60 * 15, 'true')
    var bin = fs.readFileSync(filepath)

    if (bin[0] === 0xEF && bin[1] === 0xBB && bin[2] === 0xBF) {
      bin = bin.slice(3)
    }
    let targetJSON
    try {
      targetJSON = JSON.parse(bin)
    } catch (e) {
      await redisDel('importing-sdk-file')
      return (ctx.body = Response.fail(e))
    }

    const app_type_map = {
      Ios: 'ios',
      Android: 'android',
      Web: 'web'
    }
    //检查数据是否包含非法event_path_type
    for (let i = targetJSON.events.length - 1; i >= 0; i--) {
      switch (app_type_map[app_type]) {
        case 'ios':
          if (targetJSON.events[i].event_path_type === 'android' || targetJSON.events[i].event_path_type === 'web') {
            await redisDel('importing-sdk-file')
            return (ctx.body = Response.fail('文件含有非法event_path_type'))
          }
          break
        case 'android':
          if (targetJSON.events[i].event_path_type === 'ios' || targetJSON.events[i].event_path_type === 'web') {
            await redisDel('importing-sdk-file')
            return (ctx.body = Response.fail('文件含有非法event_path_type'))
          }
          break
        case 'web':
          if (targetJSON.events[i].event_path_type !== 'web') {
            await redisDel('importing-sdk-file')
            return (ctx.body = Response.fail('文件含有非法event_path_type'))
          }
          break
      }
    }

    await db.client.transaction(async transaction => {
      //写入事件草稿列表
      await SugoTrackEventService.batchImportTrackEventDraft({
        eventsArr: targetJSON.events,
        token: appid,
        app_version,
        transaction
      })

      //写入页面信息列表
      await SugoTrackEventService.batchImportTrackPageInfoDreaft({
        pageInfoArr: targetJSON.pageInfos,
        token: appid,
        app_version,
        transaction
      })

      //写入页面信息列表
      await SugoTrackEventService.batchImportPageCategoriesDraft({
        pageCategoriesArr: targetJSON.pageCategories,
        token: appid,
        app_version,
        transaction
      })
      const eventProps = targetJSON.events
        .filter(p => p.extend_value)
        .map(p => {
          return {
            extend_value: p.extend_value,
            datasource_name: datasourceName,
            event_id: p.event_id,
            company_id: p.company_id
          }
        })
      //写入页面信息列表
      await SugoTrackEventService.batchImportEventProps({
        eventProps,
        token: appid,
        app_version,
        transaction
      })
      isImporting = await redisGet('importing-sdk-file')
      if (isImporting) await redisDel('importing-sdk-file')
    })
    return (ctx.body = Response.ok('导入成功'))
  },

  /**
   * 获取用户第一次启动时间
   * @param {*} ctx
   */
  async getFirstStartTime(ctx) {
    const { app_type, device_id, app_version, channel, project_id } = ctx.query
    if (!app_type || !device_id || !app_version || !project_id) {
      return ctx.body = Response.fail('缺少参数')
    }
    return ctx.body = await FirstStartTimeService.getInstance().getFirstStartTime({ app_type, device_id, app_version, channel, project_id })

  },
  /**
   * 修改appversion 是否启用sdk
   * @param ctx
   * @return {Promise.<*>}
   */
  async updateAppVersionSdkInit(ctx) {
    const checked = PropTypes.string.isRequired(ctx.q, 'id')

    if (!checked.success) {
      return (ctx.body = Response.fail(checked.message))
    }

    const { id, projectId, token, sdk_init, sdk_force_update_config } = ctx.q
    const { result: record } = await AppVersionService.query(id)

    if (!record) {
      return (ctx.body = Response.fail('未找到记录'))
    }
    const res = await AppVersionService.update(ctx.q)
    const perfix = GetSDKConifgPrefix(projectId, token, record.app_version)
    if (sdk_init !== undefined) {
      await redusStorage.GlobalConfig.del(perfix + '|' + SDK_CONFIG_KEYS.isSugoInitialize)
    }
    if (sdk_force_update_config !== undefined) {
      await redusStorage.GlobalConfig.del(perfix + '|' + SDK_CONFIG_KEYS.forceUpdateConfig)
    }
    ctx.body = res
  },
  /**
   * 修改sdk类型 是否启用sdk
   * @param ctx
   * @return {Promise.<*>}
   */
  async updateDataAnalysisSdkInit(ctx) {
    const checked = PropTypes.string.isRequired(ctx.q, 'id')

    if (!checked.success) {
      return (ctx.body = Response.fail(checked.message))
    }

    const { id, projectId, sdk_init, sdk_force_update_config, auto_track_init } = ctx.q
    const { result: record } = await SugoDataAnalysisService.findOne(id)

    if (!record) {
      return (ctx.body = Response.fail('未找到记录'))
    }
    const res = await SugoDataAnalysisService.update(id, ctx.q)
    const perfix = GetSDKConifgPrefix(projectId, id)
    if (sdk_init !== undefined) {
      await redusStorage.GlobalConfig.del(perfix + '|' + SDK_CONFIG_KEYS.isSugoInitialize)
    }
    if (sdk_force_update_config !== undefined) {
      await redusStorage.GlobalConfig.del(perfix + '|' + SDK_CONFIG_KEYS.forceUpdateConfig)
    }

    if (auto_track_init !== undefined) {
      await redusStorage.GlobalConfig.setByKey(perfix + '|' + SDK_CONFIG_KEYS.isAutotrackInit, auto_track_init)
    }

    ctx.body = Response.ok(res)
  },
  async updateRedisDimensionAndEventVersion(ctx) {
    await SugoTrackEventService.updateRedisDimensionAndEventVersion()
    ctx.body = Response.ok('更新成功')
  },
  /**
   * 删除app版本
   * @param ctx
   * @return {Promise.<*>}
   */
  async deleteAppVersion(ctx) {
    let { token, appVersion } = ctx.q

    if (!token || token == null) {
      return returnError(ctx, 'token不能为空')
    }
    if (!appVersion || appVersion == null || appVersion.trim() === '') {
      return returnError(ctx, 'app版本不能为空')
    }

    ctx.body = await AppVersionService.deleteAppVersion(token, appVersion)
  }
}
export default sugoSDK
