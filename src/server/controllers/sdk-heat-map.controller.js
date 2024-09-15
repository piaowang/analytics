/**
 * Created by xj on 12/13/18.
 */
import db, { quoteIdentifiers } from '../models'
import zlib from 'zlib'
import _ from 'lodash'
import { generate } from 'shortid'
import { Response } from '../utils/Response'
import TrackHeatMapService from '../services/sugo-track-heat-map.service'
import moment from 'moment'
import * as d3 from 'd3'
import shortid from 'shortid'
import SugoDataAnalysisService from '../services/sugo-data-analysis.service'
import { AccessDataOriginalType } from '../../common/constants'

function base64_decode(base64str) {
  const bitmap = new Buffer(base64str, 'base64')
  return bitmap
}

/**
 * @description 热图controller
 * @export
 * @class HeatMapController
 */
export default class HeatMapController {

  constructor() {
    this.heatMapService = TrackHeatMapService.getInstance()
  }

  /**
   * @description 保存热图信息
   * @param {any} ctx
   * @memberOf HeatMapController
   */
  async creatHeatMap(ctx) {
    const { id: userId, company_id } = ctx.session.user
    let { id, app_type, screenshot, name, page_path, app_version, events, event_groups, project_id, appid = null, params, points } = ctx.q
    // if (!event_groups && !points) {
    //   return Response.error(ctx, '操作失败，缺少参数！')
    // }
    if (!appid && app_type === 'web') {
      appid = await SugoDataAnalysisService.findAll({ where: { project_id: project_id, access_type: AccessDataOriginalType.Web } })
      appid = _.get(appid, '0.id', '')
    }
    let screenshot_id = null // sdk保存都会带图片；web不需要
    let screenshotdata
    if (screenshot) {
      let promise = new Promise((resolve, reject) => {
        zlib.gzip(base64_decode(screenshot), (error, result) => {
          if (error) reject(error)
          resolve(result)
        })
      })
      screenshotdata = await promise.then(buff => buff)
      screenshot_id = generate()
    }
    const res = await db.client.transaction(async transaction => {
      const obj = id
        ? await this.heatMapService.findOne({
          id
        })
        : {}

      if (!_.isEmpty(obj)) {
        await this.heatMapService.remove({ id: obj.id }, { transaction })
        if (screenshot_id) {
          await db.HeatmapScreenshot.destroy({ where: { id: obj.screenshot_id }, transaction })
        }
      }
      if (screenshot_id) {
        await db.HeatmapScreenshot.create({
          id: screenshot_id,
          screenshot: screenshotdata
        }, { transaction })
      }
      const result = await this.heatMapService.create({
        appid,
        name,
        page_path,
        events,
        event_groups,
        project_id,
        created_by: userId,
        company_id,
        screenshot_id,
        app_type,
        params,
        points,
        app_version
      }, {
        transaction
      })
      return {
        ...result.get({ plain: true }),
        heatMapId: result.id,
        screenshotId: screenshot_id
      }
    })
    if (res) {
      ctx.body = Response.ok(res)
      return
    }
  }

  async getHeatMap(ctx) {
    const { appid, project_id, pageSize, pageIndex, searchKey, app_type } = ctx.q
    let { company_id } = ctx.session.user
    let res
    let where = _.omitBy({ appid, company_id, project_id, app_type }, v => v === undefined || v === '')

    if (pageSize && pageIndex) {
      if (searchKey) {
        where.$or = [
          { name: { $like: `%${searchKey}%` } },
          { page_path: { $like: `%${searchKey}%` } }
        ]
      }

      res = await TrackHeatMapService.getInstance().findAndCountAll(
        { ...where },
        { raw: true, limit: pageSize, offset: (pageIndex - 1) * pageSize }
      )
      const screenshotIds = res.rows.map(p => p.screenshot_id)
      let screenshots = await db.HeatmapScreenshot.findAll({ where: { id: { $in: screenshotIds } }, raw: true })
      for (let key in screenshots) {
        if (screenshots[key].screenshot) {
          let promise = new Promise((resolve, reject) => {
            zlib.unzip(screenshots[key].screenshot, function (error, result) {
              if (error) reject(error)
              resolve(result)
            })
          })

          let screenshotdata = await promise.then(buff => buff)
          screenshots[key].screenshot = screenshotdata.toString('base64')
        }
      }
      const screenshotMap = _.keyBy(screenshots, p => p.id)
      const heatMapList = res.rows.map(p => {
        return {
          ...p,
          screenshot: _.get(screenshotMap, `${p.screenshot_id}.screenshot`, '')
        }
      })
      res = {
        heatMapList
      }

    } else {
      res = await this.heatMapService.findAll(where, { raw: true })
    }
    ctx.body = Response.ok(res)
    return
  }

  /**
   * @description app 查询已圈选热图配置列表
   * @param {any} ctx
   * @memberOf HeatMapController
   */
  async getHeatMapById(ctx) {
    const { id } = ctx.params
    let res = await this.heatMapService.findOne({ id }, { raw: true })
    if (!res.id) {
      ctx.body = Response.fail('热图不存在')
      return
    }
    let { screenshot } = await db.HeatmapScreenshot.findOne({ where: { id: res.screenshot_id }, raw: true })
    if (screenshot) {
      let screenshotData = await new Promise((resolve, reject) => {
        zlib.unzip(screenshot, function (error, result) {
          if (error) reject(error)
          resolve(result)
        })
      }).then(buff => buff)
      res.screenshot = screenshotData.toString('base64')
    }
    ctx.body = Response.ok(res)
    return
  }

  /**
   * @description web获取已圈选热图列表
   * @param {any} ctx
   * @memberOf HeatMapController
   */
  async getHeatMapsForWeb(ctx) {
    const { page_path, project_id, app_type, heatmapType = 'event' } = ctx.q
    const where = {
      page_path,
      project_id,
      app_type
    }
    if (heatmapType === 'event') { //
      where.points = {
        $eq: null
      }
    } else {
      where.event_groups = {
        $eq: null
      }
    }
    const res = await this.heatMapService.findAll(where, {
      attributes: ['id', 'page_path', 'name', 'project_id', 'app_type'].concat([heatmapType === 'event' ? 'event_groups' : 'points']),
      raw: true
    })
    ctx.body = Response.ok(res)
    return
  }

  /**
   * @description 删除热图圈选记录
   * @param {any} ctx
   * @memberOf HeatMapController
   */
  async deleteHeatMap(ctx) {
    const { id } = ctx.q
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，确实id参数')
    }
    await this.heatMapService.remove({ id })
    ctx.body = Response.ok('删除成功')
    return
  }

  async importHeatMap(ctx) {
    const { heatmaps, projectId } = ctx.request.body
    const { company_id } = ctx.session.user
    let appid = _.get(heatmaps, '0.appid', '')
    if (!appid) {
      ctx.body = Response.fail('导入失败, 缺少目标appid')
      return
    }
    const importScreenIds = heatmaps.map(p => p.screenshot_id)
    // 获取当前token下要删除的的热图id 并且不在要新增的图片列表中
    let delScreenIds = await this.heatMapService.findAll({
      appid,
      screenshot_id: { $notIn: importScreenIds }
    },
    { attributes: ['screenshot_id'], raw: true }
    )
    delScreenIds = delScreenIds.map(p => p.screenshot_id)
    if (delScreenIds.length) {
      // 检查其他app是否引用
      let otherAppUseScreenIds = await this.heatMapService.findAll(
        { appid: { $ne: appid }, screenshot_id: { $in: delScreenIds } },
        { attributes: ['screenshot_id'], raw: true }
      )
      otherAppUseScreenIds = otherAppUseScreenIds.map(p => p.screenshot_id)
      // 排除其他APP引用的截图
      delScreenIds = _.difference(delScreenIds, otherAppUseScreenIds)
    }

    // 获取已经存在的图片信息
    let existsScreenIds = await db.HeatmapScreenshot.findAll({
      where: { id: { $in: importScreenIds } },
      attributes: ['id'],
      raw: true
    })
    existsScreenIds = existsScreenIds.map(p => p.id)

    let screens = []
    // 循环解析图片数据获取要新增的图片id
    for (const key in heatmaps) {
      let screenshotdata = null
      if (heatmaps[key].screenshot) {
        let promise = new Promise((resolve, reject) => {
          zlib.gzip(base64_decode(heatmaps[key].screenshot), function (error, result) {
            if (error) reject(error)
            resolve(result)
          })
        })
        screenshotdata = await promise.then(buff => buff)
        if (!_.includes(existsScreenIds, heatmaps[key].screenshot_id)) {
          screens.push({
            id: heatmaps[key].screenshot_id,
            screenshot: screenshotdata
          })
        }
      }
      _.set(heatmaps, [key], {
        ...heatmaps[key],
        company_id,
        events: JSON.parse(_.get(heatmaps, [key, 'events'], '[]')),
        event_groups: JSON.parse(_.get(heatmaps, [key, 'event_groups'], '[]')),
        points: JSON.parse(_.get(heatmaps, [key, 'points'], '[]')),
        params: JSON.parse(_.get(heatmaps, [key, 'params'], '{}')),
        id: shortid()
      })
    }

    // // 当前app截图并且没有其他项目引用 
    // delScreenIds = _.concat(delScreenIds, _.difference(importScreenIds, existsScreenIds))

    await db.client.transaction(async transaction => {
      await this.heatMapService.remove({ appid }, transaction)
      await db.HeatmapScreenshot.destroy({ where: { id: { $in: delScreenIds } }, transaction })
      await db.HeatmapScreenshot.bulkCreate(screens, { transaction })
      await this.heatMapService.__bulkCreate(heatmaps, transaction)
      return true
    })
    ctx.body = Response.ok('导入成功')
  }

  async exportHeatMap(ctx) {
    const { appid = 'd3a66ce81be70e5e0ce841bcc62f0c67', appType = 'android' } = ctx.q
    //获取标签显示值
    const sql = `SELECT
        proj.datasource_name,
        appid,
        heatmap.name,
        heatmap.page_path,
        heatmap.screenshot_id,
        heatmap.events,
        heatmap.event_groups,
        heatmap.points,
        heatmap.params,
        heatmap.created_by,
        heatmap.app_version,
        heatmap.app_type,
        heatmap.created_at,
        screen.screenshot
      FROM
        sugo_track_heat_map AS heatmap
      LEFT JOIN sugo_heatmap_screenshot AS screen ON heatmap.screenshot_id = screen.id
      LEFT JOIN sugo_projects as proj on heatmap.project_id = proj.id
      WHERE heatmap.appid = ${quoteIdentifiers(`${appid}`)}`
    let [res = []] = await db.client.query(sql)
    for (let key in res) {
      if (res[key].screenshot) {
        let promise = new Promise((resolve, reject) => {
          zlib.unzip(res[key].screenshot, function (error, result) {
            if (error) reject(error)
            resolve(result)
          })
        })
        let screenshotdata = await promise.then(buff => buff)
        _.set(res, [key, 'screenshot'], screenshotdata.toString('base64'))
      }
      _.set(res, [key, 'events'], JSON.stringify(_.get(res, [key, 'events'], [])))
      _.set(res, [key, 'event_groups'], JSON.stringify(_.get(res, [key, 'event_groups'], [])))
      _.set(res, [key, 'points'], JSON.stringify(_.get(res, [key, 'points'], [])))
      _.set(res, [key, 'params'], JSON.stringify(_.get(res, [key, 'params'], {})))
    }
    let content = d3.csvFormat(res)
    let fileName = `${appType}_heatmap_${appid}_${moment().format('YYYY-MM-DD')}.csv`
    ctx.set({
      'Content-Type': 'application/vnd.ms-execl',
      'Content-Disposition': 'attachment;filename=' + fileName,
      'Pragma': 'no-cache',
      'Expires': 0
    })
    ctx.body = content
  }
}

