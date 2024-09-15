/**
 * Created by fengxj on 11/1/16.
 */
import db from '../models'
import uuid from 'node-uuid'
import zlib from 'zlib'
import { returnResult, returnError } from '../utils/helper'
import { redisSetExpire, redisGet } from '../utils/redis'
import SugoProjectService from '../services/sugo-project.service'
import Storage from '../services/public-redis-storage.service'
import TrackEventPropsService from '../services/sugo-track-event-props.service'
import _ from 'lodash'
import { GetDecideEventPrefix, GetSDKConifgPrefix, SDK_CONFIG_KEYS, SDK_CONFIG_EX } from '../services/public-redis-storage.service'
import TrackEventDraftV3Service from '../services/sugo-track-event-draft-v3.service'
import TrackEventV3Service from '../services/sugo-track-event-v3.service'
import TrackEventMobileH5V3Service from '../services/sugo-track-event-mobile-h5-v3.service'
import TrackPageDraftV3Service from '../services/sugo-track-page-draft-v3.service'
import TrackPageV3Service from '../services/sugo-track-page-v3.service'
import TrackPageCategoryDraftV3Service from '../services/sugo-track-page-category-draft.service'
import TrackPageCategoryV3Service from '../services/sugo-track-page-category.service'
import moment from 'moment'
import { AccessDataOriginalType } from '../../common/constants'
import AppVersionService from '../services/sugo-app-version'
import SugoDataAnalysisService from '../services/sugo-data-analysis.service'
import conf from '../config'

function base64_decode(base64str) {
  var bitmap = new Buffer(base64str, 'base64')
  return bitmap
}

const sdkCommonH5 = conf.site.sdkCommonH5 || false //当前是否将移动端的h5全部放在一个表中

const MAX_KEEP_VERSION = 3

const UpdateEventColumns = [
  'event_name',
  'code',
  'advance',
  'similar',
  'event_type',
  'binds',
  'cross_page',
  'similar_path',
  'event_path',
  'class_attr',
  'extend_value',
  'sugo_autotrack_path',
  'sugo_autotrack_position',
  'sugo_autotrack_page_path',
  'event_id',
  'app_version',
  'page'
]

const SelectEventColumns = [
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
  'class_attr',
  'sugo_autotrack_path',
  'sugo_autotrack_position',
  'sugo_autotrack_page_path',
  'screenshot_id'
]
//移动端共用h5的选项
const SelectEventMobileH5Columns = [
  'event_id',
  'event_name',
  'event_path',
  'event_type',
  'page',
  'code',
  'advance',
  'similar',
  'binds',
  'cross_page',
  'similar_path',
  'screenshot_id'
]

const EmptyEvents = {
  event_bindings_version: 0,
  page_info: [],
  h5_event_bindings: [],
  event_bindings: []
}

const EmptyDimensions = {
  dimensions: [],
  dimension_version: 0,
  position_config: 0
}

export default class {
  constructor() {
    this.trackEventDraftV3Service = TrackEventDraftV3Service.getInstance()
    this.trackEventV3Service = TrackEventV3Service.getInstance()
    this.trackEventMobileH5V3Service = TrackEventMobileH5V3Service.getInstance()
    this.trackPageDraftV3Service = TrackPageDraftV3Service.getInstance()
    this.trackPageV3Service = TrackPageV3Service.getInstance()
    this.trackEventPropsService = TrackEventPropsService.getInstance()
    this.trackPageCategoryDraftV3Service = TrackPageCategoryDraftV3Service.getInstance()
    this.trackPageCategoryV3Service = TrackPageCategoryV3Service.getInstance()
  }
  /**
   * 保存event事件
   */
  async saveDraftEvent(ctx) {
    const { params } = ctx.q
    const { event, appid, appVersion } = params || {}
    const { company_id: companyId, id: userId } = ctx.session.user
    // 判断token
    if (!appid) {
      return returnError(ctx, 'token为空')
    }
    // 判断appversion
    if (_.isEmpty(_.trim(companyId))) {
      return returnError(ctx, 'app版本为空')
    }
    // 根据token获取接入信息，并判断版本信息是否存在
    const dataAnalysis = await db.SugoDataAnalysis.findOne({ where: { id: appid }, attributes: ['project_id'], raw: true })
    if (!dataAnalysis) {
      return returnError(ctx, '接入信息不存在')
    }

    // 判断事件是否存在
    let dbHasEvent = await this.trackEventDraftV3Service.findOne({ event_id: event.event_id, token: appid, app_version: appVersion }, { raw: true })
    dbHasEvent = !_.isEmpty(dbHasEvent)
    let res = await db.client.transaction(async transaction => {
      // 判断是否存在appVersion
      await db.AppVersion.findOrCreate({
        where: { appid, app_version: appVersion },
        defaults: {
          appid,
          app_version: appVersion,
          event_bindings_version: 0,
          status: 1,
          last_deployed_on: Date.now()
        },
        transaction
      })
      // 判断是新增还是修改
      if (dbHasEvent) {
        // 更新事件
        await this.trackEventDraftV3Service.update(
          _.pick(event, UpdateEventColumns),
          { event_id: event.event_id, token: appid, app_version: appVersion },
          { transaction }
        )
      } else {
        // 保存事件
        const screenshotId = uuid.v4()
        const eventId = uuid.v4()
        //保存截图
        if (event.screenshot) {
          let promise = new Promise((resolve, reject) => {
            zlib.gzip(base64_decode(event.screenshot), function (error, result) {
              if (error) reject(error)
              resolve(result)
            })
          })

          let screenshotdata = await promise.then(buff => buff)
          await db.TrackEventScreenshot.create({ id: screenshotId, screenshot: screenshotdata }, { transaction })
        }
        event.screenshot_id = screenshotId
        await this.trackEventDraftV3Service.create(
          {
            ..._.pick(event, [...UpdateEventColumns]),
            event_id: uuid.v4(),
            screenshot_id: screenshotId
          },
          { transaction })
        if (event.extend_value) {
          await this.trackEventPropsService.create(
            {
              appid,
              extend_value: event.extend_value,
              datasource_name: '',
              event_id: eventId,
              app_version: appVersion,
              created_by: userId,
              companyId
            },
            { transaction })
        }
      }
      return event
    })

    if (res.error) {
      return returnError(ctx, res.error)
    }
    returnResult(ctx, { success: true })
  }

  /**
  * 删除event事件
  */
  async delDraftEvent(ctx) {
    const { params } = ctx.q
    const { event, appid, appVersion } = params || {}
    // 判断token
    if (!appid) {
      return returnError(ctx, 'token为空')
    }
    await this.trackPageDraftV3Service.destroy({ event_id: event.event_id, token: appid, app_version: appVersion })
    returnResult(ctx, { success: true })
  }


  /**
   * 部署埋点事件
   * @param {*} ctx 
   */
  async deployEvent(ctx) {
    const { params } = ctx.q
    const { appid: token, appVersion } = params || {}
    if (!token) {
      return returnError(ctx, 'token为空')
    }
    if (!appVersion) {
      return returnError(ctx, 'app版本为空')
    }

    // 获取事件已经绑定的版本号
    const bindingVersions = await this.trackEventV3Service.findAll(
      { appid: token, app_version: appVersion },
      {
        attributes: ['event_bindings_version'],
        raw: true,
        group: 'event_bindings_version',
        order: [['event_bindings_version', 'ASC']]
      }
    )
    // 获取页面已经绑定的版本号
    const pageBindingVersions = await this.trackEventV3Service.findAll(
      { appid: token, app_version: appVersion },
      {
        attributes: ['event_bindings_version'],
        raw: true,
        group: 'event_bindings_version',
        order: [['event_bindings_version', 'ASC']]
      }
    )

    await db.client.transaction(async transaction => {
      let eventBindingsVersion = _.toNumber(moment().format('X'))
      //部署埋点事件
      this.trackEventDraftV3Service.deployEvent(MAX_KEEP_VERSION, token, appVersion, eventBindingsVersion, transaction)
      //部署页面
      this.trackPageDraftV3Service.deployPage(MAX_KEEP_VERSION, token, appVersion, eventBindingsVersion, transaction)
      // 部署页面分类
      this.trackPageCategoryDraftV3Service.deployPage(token, appVersion, eventBindingsVersion, transaction)
      // 更新app版本绑定的部署事件版本
      await db.AppVersion.update(
        { event_bindings_version: eventBindingsVersion, last_deployed_on: Date.now() },
        {
          where: {
            appid: token,
            app_version: appVersion
          },
          transaction
        })
      // 删除多余的事件配置版本
      let deleteVersion = bindingVersions.length > MAX_KEEP_VERSION
        ? _.get(bindingVersions, '0.event_bindings_version', '')
        : ''
      if (deleteVersion) {
        await this.trackEventV3Service.destroy(
          { appid: token, app_version: appVersion, event_bindings_version: deleteVersion },
          { transaction }
        )
      }

      // 删除多余的页面配置版本
      let deletePageVersion = pageBindingVersions.length > MAX_KEEP_VERSION
        ? _.get(pageBindingVersions, '0.event_bindings_version', '')
        : ''
      if (deletePageVersion) {
        await db.SugoSDKPageInfo.destroy(
          { appid: token, app_version: appVersion, event_bindings_version: deletePageVersion },
          { transaction }
        )
      }
    })
    const dataAnaly = await db.SugoDataAnalysis.findOne({
      where: {
        id: token
      },
      raw: true
    })
    if (!dataAnaly.id) {
      return
    }
    // 获取项目信息
    const project = await db.SugoProjects.findOne({
      where: { id: dataAnaly.project_id },
      raw: true
    })
    if (!project.id) {
      return
    }
    // 清除token下所有的缓存
    if (dataAnaly.access_type === AccessDataOriginalType.Web) {
      await Storage.DesktopDecide.delByToken(token)
    } else {
      await Storage.DesktopDecide.delByTokenAndVersion(token, appVersion, project.datasource_name)
    }
    returnResult(ctx, { success: true })
  }

  /**
   * 获取草稿页面信息
   * @param {*} ctx
   * @description 如果开启了sdkCommonH5，则会将移动端的h5页面信息抽出来放在一个共同的表中, 所以需要额外的去查询获取这部分的数据
   */
  async getPageInfoDraft(ctx) {
    const { token, app_version, isBatchExport } = ctx.q
    let rowsH5 = []
    // 抽查询的条件出来

    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
      rowsH5 = await db.SugoSDKPageInfoMobileH5Draft.findAll({
        where: {
          project_id: dim_inst.project_id
        },
        attributes: !isBatchExport
          ? ['page', 'page_name', 'code', 'similar', 'id', 'changed_on', 'category', 'is_submit_point']
          : ['page', 'page_name', 'code', 'similar', 'category', 'is_submit_point'],
        raw: true
      })
    }
    const rowsNoH5 = await db.SugoSDKPageInfoDraft.findAll({
      where: {
        appid: token,
        app_version: app_version
      },
      attributes: !isBatchExport
        ? ['page', 'page_name', 'code', 'similar', 'id', 'changed_on', 'category', 'is_submit_point']
        : ['page', 'page_name', 'code', 'similar', 'category', 'is_submit_point'],
      raw: true
    })

    returnResult(ctx, [...rowsNoH5, ...rowsH5])
  }

  /**
   * 获取屏幕截图Draft
   * */
  async getEventSreenshot(ctx) {
    const { screenshot_id } = ctx.q
    const rows = await db.TrackEventScreenshot.findAll({
      where: { id: screenshot_id },
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
  }

  /**
   * 获取配置信息
   * @param {*} data 
   * @param {*} eventBindingsVersion 当前sdk的配置版本信息 
   */
  getResult(data, eventBindingsVersion) {
    // 如果客户端event_bindings_version跟服务端一样则返回版本号，取客户端的事件记录
    if (data && data.event_bindings_version.toString() === eventBindingsVersion.toString()) {
      return { event_bindings_version: data.event_bindings_version }
    }
    return data
  }

  /**
   * 下发埋点配置
   * @param {*} ctx 
   */
  async decideTrackEvent(ctx) {
    let { token, app_version, event_bindings_version = -1, projectId } = ctx.query
    // 获取缓存的key
    let redisKey = GetDecideEventPrefix(token, app_version)
    // 判断是否存在配置信息缓存
    let res = await redisGet(redisKey)
    const { result: { isSugoInitialize, isHeatMapFunc } } = await Storage.GlobalConfig.get(projectId, token, app_version)
    // 如果缓存内容是不初始化sdk 则直接返回空内容
    if (!isSugoInitialize) {
      ctx.body = EmptyEvents
      return
    }
    // 如果配置不是空则返回
    if (res != null) {
      ctx.body = this.getResult(res, event_bindings_version)
      return
    }

    // 判断项目是否存在
    res = await SugoProjectService.getInfoWithSDKToken(token)
    if (!res.success) {
      return returnResult(ctx, null)
    }

    //查看当期使用的时间绑定版本
    let versionInfo = await db.AppVersion.findOne({
      where: { appid: token, app_version }
    })
    let serverBindsVersoin = _.get(versionInfo, 'event_bindings_version', 0)

    // 如果版本不存在 则返回空的埋点配置
    if (!serverBindsVersoin) {
      ctx.body = EmptyEvents
      return
    }
    //获取事件的基础信息

    let rows = await this.trackEventV3Service.findAll({ appid: token, app_version, event_bindings_version: serverBindsVersoin }, { attributes: SelectEventColumns, raw: true })
    //从移动端h5共用表中查询数据
    if (sdkCommonH5) {
      // h5表格的话需要先去获取到项目id，因为没办法根据token去关联
      const dim_inst = await db.SugoDataAnalysis.findOne({
        where: {
          id: token
        },
        raw: true
      })
      const rowsH5 = await this.trackEventMobileH5V3Service.findAll({ project_id: dim_inst.project_id }, { attributes: SelectEventMobileH5Columns, raw: true })
      //遍历补上前端需要的字段
      rows.push(...rowsH5.map(row => ({ ...row, sugo_autotrack_path: JSON.parse(row.event_path).path, event_path_type: 'h5' })))
    }
    // 原生事件下发格式转换
    const eventBindings = rows
      .filter(p => p.event_path_type !== 'h5')
      .map(p => {
        let { event_path, page, code, advance, class_attr, sugo_autotrack_path, sugo_autotrack_page_path, similar, event_path_type, similar_path } = p
        if (event_path_type === 'miniprogram') {
          return p
        }
        // 控件附加属性
        class_attr = (class_attr && class_attr.length)
          ? _.reduce(_.groupBy(class_attr, p => p.dim), (r, v, k) => {
            r[k] = v.map(p => p.cls).join(',')
            return r
          }, {})
          : {}

        let event = {
          target_activity: page || sugo_autotrack_page_path,
          classAttr: class_attr,
          path: event_path,
          ..._.pick(p, ['event_id', 'event_name', 'event_type', 'sugo_autotrack_path', 'sugo_autotrack_position', 'sugo_autotrack_page_path', 'similar']),
          sugo_autotrack_path: similar && similar_path ? similar_path : sugo_autotrack_path
        }
        // 圈选关联上报内容
        if (advance && code && event_path) {
          event.attributes = JSON.parse(code)
        }
        if (advance && code && !event_path) {
          event.sugo_autotrack_attributes = JSON.parse(code)
        }
        return event
      })
    // 处理h5事件
    let h5EventBindings = rows
      .filter(p => p.event_path_type === 'h5')
      .map(item => {
        let { event_path, page, code, advance, similar, binds, similar_path } = item
        let event = {
          //h5移动端target_activity指的是事件所在的页面。如：/a.html
          target_activity: page,
          ..._.pick(item, ['cross_page', 'event_id', 'event_name', 'event_type', 'sugo_autotrack_path', 'sugo_autotrack_position'])
        }

        if (advance) {
          event.code = code || ''
          event.binds = binds || {}
        }
        event.path = JSON.parse(event_path)
        event.similar = similar
        event.similar_path = similar && similar_path ? JSON.parse(similar_path || event_path).path.replace(/ &/g, '') : ''
        return event
      })

    // 获取页面配置信息
    rows = await this.trackPageV3Service.findAll(
      {
        appid: token,
        app_version,
        event_bindings_version: serverBindsVersoin
      },
      {
        attributes: ['page', 'page_name', 'code', 'is_submit_point'],
        raw: true
      }
    )

    // 生成页面配置信息
    let pageInfo = rows.map(p => {
      let item = {
        isSubmitPoint: !!(isHeatMapFunc && p.is_submit_point),
        ..._.omit(p, 'is_submit_point'),
        page: p.page.indexOf('::') > 0 ? p.page.substr(p.page.indexOf('::') + 2) : p.page
      }
      if (!item.code) {
        return _.omit(item, 'code')
      }
      return item
    })
    // 处理下发websdk埋点
    if (conf.sdkMergeH5TrackEvents) {
      const { events, pages } = await getWebTrackEvent(token)
      pageInfo = _.uniqBy(_.concat(pageInfo, pages), item => item.page)
      h5EventBindings = _.uniqBy(_.concat(h5EventBindings, events), item => item.target_activity + item?.path?.path)
    }

    // 最终返回结果
    const result = {
      event_bindings_version: _.toNumber(serverBindsVersoin),
      page_info: pageInfo,
      h5_event_bindings: h5EventBindings,
      event_bindings: eventBindings
    }

    // 生成redis缓存的key 并将查询结及version果写入redis缓存
    const redisEventVersionKey = `${GetSDKConifgPrefix(projectId, token, app_version)}|${SDK_CONFIG_KEYS.latestEventVersion}`
    await redisSetExpire(redisKey, SDK_CONFIG_EX, result)
    await redisSetExpire(redisEventVersionKey, SDK_CONFIG_EX, _.toNumber(serverBindsVersoin))
    ctx.body = this.getResult(result, event_bindings_version)
    return
  }

  /**
   * 获取维度信息
   * @param {*} ctx 
   */
  async decideDimension(ctx) {
    let { token, dimension_version = -1, projectId: datasourceName } = ctx.query
    //生成缓存key规则并获取redis缓存
    const { result: { isSugoInitialize, uploadLocation } } = await Storage.GlobalConfig.get(datasourceName, token)
    // 不初始化sdk 则返回空的维度信息
    if (!isSugoInitialize) {
      ctx.body = EmptyDimensions
      return
    }
    // 根据token 获取项目信息 判断项目是否存在
    const project = await SugoProjectService.getInfoWithSDKToken(token)
    if (!project.success) {
      return returnResult(ctx, null)
    }
    // 获取维度缓存信息
    const dimRes = await Storage.SDKDimension.get(project.result.id, datasourceName)
    if (!dimRes.success) {
      return returnResult(ctx, null)
    }
    // 获取维度缓存的版本信息
    const resDimVersion = dimRes.result.dimension_version
    // 版本与sdk维度版本相同则不下发维度信息
    if (resDimVersion.toString() === dimension_version) {
      ctx.body = { dimension_version: resDimVersion }
      return
    }

    ctx.body = {
      dimensions: dimRes.result.dimensions,
      dimension_version: resDimVersion,
      position_config: uploadLocation
    }
  }
}


const EVENT_ATTRIBUTES = [
  'event_id', 'event_name', 'event_path',
  'event_path_type', 'event_type', 'page',
  'control_event', 'delegate', 'code', 'advance',
  'similar', 'binds', 'cross_page', 'similar_path', 'class_attr'
]
const PAGE_ATTRIBUTES = ['page', 'page_name', 'code', 'is_submit_point']


/**
 * 合并Ios Android 两端h5 配置信息
 * @param {*} token sdk接入的appid
 */
export const getWebTrackEvent = async (token) => {
  let data = { events: [], pages: [] }
  // 获取当前埋点下的web埋点的appid 
  const { result: sdkInfo } = await SugoDataAnalysisService.findOne(token)
  if (_.isEmpty(sdkInfo)) {
    return data
  }
  const appType = sdkInfo.access_type === AccessDataOriginalType.Ios ? AccessDataOriginalType.Android : AccessDataOriginalType.Ios
  // 获取web接入的token
  const appInfo = await SugoDataAnalysisService.findAll({ where: { project_id: sdkInfo.project_id, access_type: appType } })
  if (_.isEmpty(appInfo)) {
    return data
  }
  // 获取web版本当前部署版本时间戳
  const sdkVersion = await AppVersionService.getMaxVersionInfoByToken(appInfo[0]?.id)
  if (!sdkVersion) {
    return data
  }

  // 获取web的事件
  let eventRows = await db.TrackEvent.findAll({
    where: {
      appid: sdkVersion.appid,
      event_bindings_version: sdkVersion.event_bindings_version,
      event_path_type: 'h5'
    },
    attributes: EVENT_ATTRIBUTES,
    raw: true
  })
  // 获取页面信息
  let pageRows = await db.SugoSDKPageInfo.findAll({
    where: {
      appid: sdkVersion.appid,
      event_bindings_version: sdkVersion.event_bindings_version
    },
    attributes: PAGE_ATTRIBUTES,
    raw: true
  })

  return {
    events: eventRows.map(p => {
      let { event_path, page, code, advance, similar, binds, similar_path } = p
      let event = {
        ..._.pick(p, ['cross_page', 'event_id', 'event_name', 'event_type', 'sugo_autotrack_path', 'sugo_autotrack_position']),
        path: JSON.parse(event_path),
        similar,
        similar_path: similar && similar_path ? JSON.parse(similar_path || event_path).path.replace(/ &/g, '') : '',
        target_activity: page.substr(page.indexOf('::') + 2)
      }

      if (advance) {
        event.code = code || ''
        event.binds = binds || {}
      }

      return event
    }),
    pages: pageRows.filter(p => p?.page?.indexOf('::') > 0).map(p => {
      return {
        ..._.omit(p, ['category', 'code']),
        page: p.page.substr(p.page.indexOf('::') + 2),
        code: p.code || ''
      }
    })
  }
}
