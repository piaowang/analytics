import SugoSharingService from '../services/sugo-sharing.service'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import {toQueryParams} from '../../common/sugo-utils'
import {jwtSign} from '../init/jwt-login-middleware'
import {SharingTypeEnum, SharingRestrictionsTypeEnum} from '../../common/constants'
import moment from 'moment'
import {UserService} from '../services/user.service'
import config from '../config'
import SugoLivescreenPublisService  from '../services/sugo-livescreen-publish.service'
import SugoLivescreenPublisComponentService  from '../services/sugo-livescreen-publish-component.service'
import SugoLivescreenService  from '../services/sugo-livescreen.service'
import db from '../models'
import {Response} from '../utils/Response'

/**
 * 查询多个分享
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let where = _.isEmpty(ctx.q) ? ctx.query : ctx.q
  where.content_type = SharingTypeEnum.Dashboard
  let res = await SugoSharingService.getInstance().findAll(where, { order: [['updated_at', 'desc']]})
  returnResult(ctx, res)
}

/**
 * 创建分享
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  let { content_id, content_type } = data

  // 避免 project_id 为空字符串，数据库只是限制不能为 null
  if (Number(_.get(data, 'contentType')) <= 0) {
    returnError(ctx, 'contentType 不存在')
    return
  }
  const serv = SugoSharingService.getInstance()
  if (data.power) {
    data.params = {
      ...data.params,
      power: data.power
    }
  }
  let res = await serv.create({...data, company_id, created_by: id})
  returnResult(ctx, res)
}

/**
 * 修改分享
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user

  const serv = SugoSharingService.getInstance()
  let preModTask = await serv.__model.findByPk(modId)
  if (!preModTask) {
    returnError(ctx, '该任务不存在')
    return
  }

  patch.params = {
    ...patch.params,
    power: patch.power
  }

  let res = await SugoSharingService.getInstance().update({...patch, updated_by: id}, { id: modId, company_id })
  returnResult(ctx, res)
}

/**
 * 删除分享
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id

  const serv = SugoSharingService.getInstance()
  let preDelTask = await serv.findByPk(delId)
  if (!preDelTask) {
    returnError(ctx, '该任务不存在')
    return
  }

  // 如果是大屏分享，暂时删除分享记录，// TODO 根据获取需求与此逻辑独立分开
  if (preDelTask.content_type === SharingTypeEnum.LiveScreenPub) {
    await SugoLivescreenPublisService.getInstance().remove({id: preDelTask.content_id})
  }

  let res = await serv.remove({id: delId})
  returnResult(ctx, res)
}

let buildInExtraQueryDict = {
  [SharingTypeEnum.Dashboard]: {
    hideTopNavigator: 1,
    hideLeftNavigator: 1,
    hideDashboardList: 1
  },
  [SharingTypeEnum.LiveScreen]: {}
}

async function accessContent(ctx) {
  let shareId = ctx.params.id
  if (!_.trim(shareId)) {
    ctx.render('404', {...ctx.local, hint: '400 分享内容 id 不能为空'})
    return
  }
  
  const serv = SugoSharingService.getInstance()
  let dbShare = await serv.__model.findOne({
    where: {id: shareId},
    raw: true
  })
  if (!dbShare) {
    ctx.render('404', {...ctx.local, hint: '404 分享内容不存在'})
    return
  }
  let { content_type, content_id, max_age = 'unlimited', params, updated_at, deadline } = dbShare
  // check sharing expire
  let remainAgeInSec = max_age === 'unlimited'
    ? 'unlimited'
    : moment.duration(max_age).asSeconds() - moment().diff(updated_at, 's')
  if (_.isEmpty(max_age) && (SharingTypeEnum.LiveScreen === content_type 
  || SharingTypeEnum.LiveScreenPub === content_type)) {
    remainAgeInSec = moment(deadline).endOf('d').diff(moment(updated_at), 's')
  }
  if (_.isNumber(remainAgeInSec) && remainAgeInSec <= 0) {
    ctx.render('404', {...ctx.local, hint: '401 分享有效期已过'})
    return
  }
  // redirect to content and add jwt
  const redirectDict = {
    [SharingTypeEnum.Dashboard]: `/console/dashboards/${content_id}`,
    [SharingTypeEnum.LiveScreen]: `/livescreen/${content_id}`,
    [SharingTypeEnum.LiveScreenPub]: `/livescreenPub/${content_id}`,
  }
  const pathScopesDict = {
    [SharingTypeEnum.Dashboard]: [`/console/dashboards/${content_id}`],
    [SharingTypeEnum.LiveScreen]: [`/livescreen/${content_id}`],
    [SharingTypeEnum.LivescreenPub]: [`/livescreenPub/${content_id}`]
  }

  const {power} = params
  const sharAuthor = {
    'export-excel': '/app/dashboards/export-excel',
    'subscribe': '/app/dashboards/subscribe',
    'global-filter': '/app/dashboards/global-filter',
    'code': '/app/dashboards/code',
    'download': '/app/dashboards/download'
  }
  
  const redirect = redirectDict[content_type]
  // const apiScopes = [...apiScopesDict[content_type]]
  // const extraQuery = extraQueryDict[content_type]
  let apiScopesDict = {
    [SharingTypeEnum.Dashboard]: [ '/console/dashboards' ],
    [SharingTypeEnum.LiveScreen]: []
  }
  const apiScopes = apiScopesDict[content_type]
  const buildInExtraQuery = buildInExtraQueryDict[content_type]

  const pathScopes = pathScopesDict[content_type]
  let queryStr = ''

  if (_.isArray(power)) {
    power.forEach(name => sharAuthor[name] && apiScopes.push(sharAuthor[name]))
  }

  if (!_.get(params, 'restrictionsContent.type', '') !== SharingRestrictionsTypeEnum.institutions) {
    const shareCreator = await UserService.getInstance().__model.findOne({
      where: {id: dbShare.created_by, company_id: dbShare.company_id},
      raw: true
    })
    const token = jwtSign(shareCreator, {apiScopes, pathScopes, expiresIn: remainAgeInSec})
    queryStr = toQueryParams({
      ...buildInExtraQuery,
      jwtSign: token,
      ...(ctx.query || {}),
      isSharePage:true
    })
  }

  const url = redirect + (_.includes(redirect, '?') ? '&' : '?') + queryStr
  let {favicon, cdn, siteName} = config.site
  cdn = cdn || ''
  let faviconUrl = -1 < favicon.indexOf('http') ? favicon : (favicon ? cdn + '/' + favicon : cdn + '/favicon.ico')
  // ctx.redirect(ctx.origin + url)
  // 为了能够实时限制用户能否访问，需要保持 url 为 /share/:shareId
  ctx.set('Content-type', 'text/html')
  ctx.body = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
    <link rel="shortcut icon" href="${faviconUrl}">
    <title>${siteName}分享页</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        height: 100%;
      }
      iframe { display: block; }
    </style>
</head>
<body>
<iframe width="100%" height="100%" src="//${ctx.host + url}" frameborder="0"></iframe>
</body>
</html>`
}

async function getShareLivescreen(ctx) {
  let { user } = ctx.session
  let { id: userId } = user
  let res = await SugoSharingService.getInstance().findAll({ created_by: userId, $or: [{content_type: SharingTypeEnum.LiveScreenPub}, {content_type: SharingTypeEnum.LiveScreen}] }, { order: [['updated_at', 'desc']] })
  returnResult(ctx, res)
}

async function getShareList(ctx) {
  let { user } = ctx.session
  let { company_id } = user
  let where = {}
  where.company_id = company_id
  where.content_type = {$in: [SharingTypeEnum.LiveScreenPub, SharingTypeEnum.LiveScreen]}
  const {pSize, page, type, status, search } = ctx.q

  if(search) where['params.shareContentName'] = { $like: `%${search}%`}

  if(type && type === '1') {
    where['params.restrictionsContent.type'] = {$eq: 1}
  } else  if (type && type === '2') {
    where['params.restrictionsContent.type'] = {$or: [ 2, null] }
  }

  if(status && status === '0') {
    where.deadline = {$and: [{$ne: null}, {$lt: moment()}]}
  } else if(status && status === '1') {
    where.deadline = {$or: [null, {$gte: moment()}]}
  }

  const res = await SugoSharingService.getInstance().findAndCountAll(where, {
    order: [['created_at', 'DESC']],
    offset: (page - 1)*pSize , limit: pSize
  })
  return ctx.body = Response.ok(res)
}

async function getShareById(ctx) {
  const {id } = ctx.q
  const res = await SugoSharingService.getInstance().findOne({id })
  return ctx.body = Response.ok(res)
}

async function saveShareInfo(ctx) {
  const {id, type, deadline, value, shareContentName, max_age } = ctx.q
  let encrypt = {}
  if(type === '1') {
    encrypt = {type: 1, value}
  }
  const params = {
    shareContentName,restrictionsContent: encrypt
  }
  await SugoSharingService.getInstance().update({
    params, max_age, deadline: deadline? moment(deadline).format('YYYY-MM-DD hh:mm:ss'): null, created_at: moment()
  }, {id })
  return ctx.body = Response.ok()
}

async function cancelShare(ctx) {
  const { id } = ctx.q
  await SugoSharingService.getInstance().update({
    deadline: moment().subtract(1, 'days'),
    max_age: 'P0D'
  }, { id })
  return ctx.body = Response.ok()
}

async function deleteShare(ctx) {
  const { id } = ctx.q
  await SugoSharingService.getInstance().remove({id})
  return ctx.body = Response.ok()
}

export default {
  query,
  create,
  update,
  remove,
  accessContent,
  getShareLivescreen,
  getShareList,
  getShareById,
  saveShareInfo,
  cancelShare,
  deleteShare
}
