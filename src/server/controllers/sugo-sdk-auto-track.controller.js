/**
 * Created by fengxj on 11/1/16.
 */
import db from '../models'
import uuid from 'node-uuid'
import qr from 'qr-image'
import CryptoJS from 'crypto-js'
import zlib from 'zlib'
import { returnResult, returnError } from '../utils/helper'
import _ from 'lodash'
import config from '../config'
import multipart from 'koa2-multiparty'
import FetchKit from '../utils/fetch-kit'
import FormData from 'form-data'
import fs from 'fs'
import UploadedFilesSvc from '../services/uploaded-files.service'
import SugoAutoTrackEventService from '../services/sugo-auto-track-event-service'
//heatRedisExpire: 默认1天, //heatEventPastDays默认过去3天的event记录

function base64_decode(base64str) {
  var bitmap = new Buffer(base64str, 'base64')
  return bitmap
}

const sugoSDK = {

  saveEvent: async ctx => {
    let params = ctx.q
    let events = params.events
    let appid = params.token
    if (!appid) {
      return returnError(ctx, 'token为空')
    }
    const dataAnalysis = await db.SugoDataAnalysis.findOne({ where: { id: appid }, attributes: ['project_id'], raw: true })
    if (!dataAnalysis) return returnError(ctx, '接入信息错误')
    const event = _.get(events, '0', {})
    // 判断事件是否存在
    let dbHasEvent = event.id ? await SugoAutoTrackEventService.getInstance().findOne({ id: event.id }, { raw: true }) : {}
    dbHasEvent = !_.isEmpty(dbHasEvent)

    let res = await db.client.transaction(async transaction => {
      if (dbHasEvent) {
        // 更新事件
        await SugoAutoTrackEventService.getInstance().update(
          _.pick(event, ['event_name', 'sugo_autotrack_path', 'sugo_autotrack_position', 'sugo_autotrack_content', 'sugo_autotrack_page_path', 'event_memo']),
          { id: event.id },
          { transaction }
        )
      } else {
        // 保存事件
        const screenshotId = uuid.v4()
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
        await SugoAutoTrackEventService.getInstance().create(
          {
            ..._.pick(event, ['event_name', 'sugo_autotrack_path', 'sugo_autotrack_position', 'sugo_autotrack_content', 'sugo_autotrack_page_path', 'event_memo']),
            event_id: uuid.v4(),
            appid,
            screenshot_id: screenshotId
          },
          { transaction })
      }
      return event
    })
    if (res.error) {
      return returnError(ctx, res.error)
    }
    returnResult(ctx, { success: true })
  },

  /**
   * 获取事件列表
   * */
  getTrackEvents: async ctx => {
    const { token } = ctx.q
    const rows = await db.AutoTrackEvent.findAll({
      where: {
        appid: token
      },
      order: [['updated_on', 'DESC']],
      row: true
    })
    returnResult(ctx, { data: rows })
  },

  /**
   * 获取屏幕截图,从服务器中获取base64
   * */
  getEventSreenshot: async ctx => {
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

  qrCode: async ctx => {
    let { token, redirectPage, secretKey } = ctx.query
    let newSecretKey = secretKey ? secretKey : CryptoJS.MD5(uuid.v4()).toString()
    //global.secret_key_map[token] = secret_key

    let url = `${ctx.protocol}://${ctx.host}/${redirectPage}?token=${token}&sKey=${newSecretKey}&type=full`
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
  // 保存并上传文件
  uploadFile: async ctx => {
    await multipart()(ctx)
    // 获取文件
    const file = ctx.req.files.file
    const reader = fs.createReadStream(file.path)
    const formData = new FormData()
    formData.append('file', reader)
    const headers = formData.getHeaders()

    let uploadRes = await FetchKit.post(`${config.site.file_server_url}/file`, null, {
      body: formData,
      headers: { ...headers, token: config.site.file_server_token, origin: 'http://localhost:8088' }
    })
    const { code, result } = uploadRes
    code === 0 && returnResult(ctx, result, 0, 200)
    returnResult(ctx, result)
  },
  // 保存事件
  saveWebAutoTrackEvent: async ctx => {
    let { token: appid, eventDraft } = ctx.q
    if (!appid) {
      return returnError(ctx, 'token为空')
    }
    const { event_id, event_name, event_type, event_path, page, event_path_type, event_memo, screenshot_id } = eventDraft || {}
    const dataAnalysis = await db.SugoDataAnalysis.findOne({ where: { id: appid }, attributes: ['project_id'], raw: true })
    if (!dataAnalysis) return returnError(ctx, '接入信息错误')
    const dbEvent = await db.AutoTrackEvent.findOne({ where: { event_id: event_id, appid } }, { raw: true })
    if (_.isEmpty(dbEvent)) {
      await db.AutoTrackEvent.create({
        event_name,
        event_type,
        event_path,
        page,
        event_path_type,
        event_memo,
        sugo_autotrack_path: event_path,
        sugo_autotrack_position: '',
        sugo_autotrack_content: event_name,
        sugo_autotrack_page_path: page,
        event_id,
        screenshot_id,
        appid,
        app_version: '0'
      })
    } else {
      await db.AutoTrackEvent.update({
        event_name,
        event_type,
        event_path,
        page,
        screenshot_id,
        event_path_type,
        event_memo,
        sugo_autotrack_path: event_path,
        sugo_autotrack_position: '',
        sugo_autotrack_content: event_name,
        sugo_autotrack_page_path: page,
        app_version: '0'
      }, { where: { event_id, appid } })
    }
    returnResult(ctx, { success: true })
  },
  deleteAutoTrackEvent: async ctx => {
    let { token: appid, id, screenshot_id, isMobile = false } = ctx.q
    if (isMobile) {
      await db.client.transaction(async transaction => {
        await db.TrackEventScreenshot.destroy({
          where: { id: screenshot_id },
          transaction
        })
        // 删除文件服务器中的图片
        await db.AutoTrackEvent.destroy({ where: { id, appid } })
      })
      return returnResult(ctx, { success: true })
    }

    if (!appid) {
      return returnError(ctx, 'token为空')
    }
    // 删除文件服务器中的图片
    await UploadedFilesSvc.deleteById(screenshot_id.split(',')[0])
    await db.AutoTrackEvent.destroy({ where: { id, appid } })
    returnResult(ctx, { success: true })
  },
  getWebAutoTrackEvent: async ctx => {
    const { token, path_name, ...rest } = ctx.q
    //事件草稿表记录
    const eventDrafts = await db.AutoTrackEvent.findAll({
      where: {
        appid: token,
        $or: [
          {
            page: {
              $in: path_name
            }
          }
        ],
        ...rest
      }
    })

    returnResult(ctx, { eventDrafts })
  }
}
export default sugoSDK
