import { returnError, returnResult } from '../utils/helper'
import SugoLiveScreenService from '../services/sugo-livescreen.service'
import SugoExamineService from '../services/sugo-examine.service'
import db from '../models'
import _ from 'lodash'
import SugoLivescreenRoleService from '../services/sugo-livescreen-role.service'
import { EXAMINE_TYPE, EXAMINE_STATUS_TRANSLATE, EXAMINE_STATUS } from '../../common/constants'
import moment from 'moment'
import SugoLivescreenPublishService from '../services/sugo-livescreen-publish.service'


async function get(ctx) {
  const { user } = ctx.session
  const { company_id = null } = user || {}
  // query 可包含 id / is_template
  const query = ctx.q
  let result = {}
  let authorizationMap = {}

  if (query.id) {
    // 获取授权给我的
    const authorization = await SugoLivescreenRoleService.getInstance().findAll({ livescreen_id: query.id, status: 1 }, { raw: true })
    authorizationMap =  _.reduce(authorization, (r,v) => {
      if (_.get(r,v.livescreen_id, 0) === 1) {
        return r
      }
      r[v.livescreen_id] = v.type
      return r
    }, {})
    result = await SugoLiveScreenService.getOneScreen(company_id, user, { id: query.id })
    result = [result.toJSON()]
  } else {
    // 获取授权给我的
    const authorization = await SugoLivescreenRoleService.getInstance().findAll({ role_id: { $in: _.get(user, 'SugoRoles', []).map(p => p.id) }, status: 1 }, { raw: true })
    authorizationMap =  _.reduce(authorization, (r,v) => {
      if (_.get(r,v.livescreen_id, 0) === 1) {
        return r
      }
      r[v.livescreen_id] = v.type
      return r
    }, {})
    // 获取大屏信息
    result = await db.SugoLiveScreen.findAll({
      where: {
        ...(query.title ? { title: query.title } : {}),
        $and: {
          $or: [{ created_by: user.id }, { id: _.keys(authorizationMap) || [] }]
        }
      },
      raw: true,
      order: [['updated_at', 'DESC']]
    })
  }

  // 获取审核信息
  let examineMap = await SugoExamineService.getInstance().getExamineStatus(EXAMINE_TYPE.liveScreen, result.map(p => p.id))
  const tempExamineMap = await SugoExamineService.getInstance().getExamineStatus(EXAMINE_TYPE.liveScreenTemplate, result.map(p => p.id))
  examineMap = { ...examineMap, ...tempExamineMap }
  // 设置权限
  result = result.map(p => {
    const authorizationType = p.created_by === user.id ? 3 : _.get(authorizationMap, `${p.id}`, -1)
    const examineStatus = _.get(examineMap, `${p.id}.status`, 0)
    return {
      ...p,
      authorizationType,
      examineStatus: examineStatus !== EXAMINE_STATUS.wait
        && moment(p.updated_at).isAfter(_.get(examineMap, `${p.id}.updated_at`, 0))
        ? 0
        : examineStatus // 判断是否是审核通过以后再修改
    }
  })
  returnResult(ctx, query.id ? _.first(result) : result)
}
async function create(ctx) {
  let { user } = ctx.session
  let { company_id, id: user_id } = user

  const livescreenInst = ctx.q

  if (!livescreenInst || !livescreenInst.title) {
    returnError(ctx, 'invalid live screen content')
    return
  }

  const { title, template, is_template, category_id } = livescreenInst
  const isDupli = await SugoLiveScreenService.checkTitleDupli(company_id, title, user_id)
  if (isDupli) {
    returnError(ctx, `保存失败，大屏名称[${title}]已存在`, 409)
    return
  }
  const template_id = template === 'blank' ? '' : template

  const created = await SugoLiveScreenService.createLiveScreen(company_id, user_id, title, template_id, is_template, category_id)

  returnResult(ctx, created)
}


async function update(ctx) {
  const { user } = ctx.session
  const { company_id, id: user_id } = user

  const { livescreen, forAddComps = [], forUpdateComps = [], forDeleteComps = [] } = ctx.q
  const { id } = livescreen

  if (!livescreen || !id) {
    returnError(ctx, 'invalid live screen content')
    return
  }

  const res = await SugoLiveScreenService.updateLiveScreen(
    company_id,
    user_id, id,
    _.omit(livescreen, 'id'),
    forAddComps,
    forUpdateComps,
    forDeleteComps
  )

  returnResult(ctx, res)
}

async function recycleLiveScreen(ctx) {
  const { user } = ctx.session
  const { company_id } = user

  const { livescreenId } = ctx.params
  const { isPublish } = ctx.q

  if (!livescreenId) {
    returnError(ctx, 'livecreenId is false')
    return
  }
  if(isPublish) {
    await SugoLivescreenPublishService.getInstance().recycleLiveScreen(company_id, livescreenId)
  } else {
    await SugoLiveScreenService.recycleLiveScreen(company_id, livescreenId)
  }

  returnResult(ctx, true)
}

async function reductionLiveScreen(ctx) {
  const { user } = ctx.session
  const { company_id } = user

  const { livescreenId } = ctx.params
  const { isPublish } = ctx.q

  if (!livescreenId) {
    returnError(ctx, 'livecreenId is false')
    return
  }

  if(isPublish) {
    await SugoLivescreenPublishService.getInstance().reductionLiveScreen(company_id, livescreenId)
  } else {
    await SugoLiveScreenService.reductionLiveScreen(company_id, livescreenId)
  }

  returnResult(ctx, true)
}

async function cleanRecycle(ctx) {
  const { user } = ctx.session
  const { company_id } = user
  let livescreenIds = await db.SugoLiveScreen.findAll({ where: { status: 0, company_id, created_by: user.id }, raw: true })
  let publishLivescreenIds = await db.SugoLivescreenPublish.findAll({ where: { status: 0, company_id, created_by: user.id }, raw: true })
  livescreenIds = livescreenIds.map(p => p.id)
  publishLivescreenIds = publishLivescreenIds.map(p => p.id)

  await db.client.transaction(async transaction => {
    // 先删除所有组件
    await db.SugoLiveScreenComponent.destroy({ where: { screen_id: { $in: livescreenIds } }, transaction })
    // 删除审核表中的数据
    await db.SugoExamine.destroy({ where: { model_id: { $in: livescreenIds }, model_type: { $in: [EXAMINE_TYPE.liveScreen, EXAMINE_TYPE.liveScreenTemplate] } }, transaction })
    await db.SugoLiveScreen.destroy({  where: { id: {$in: livescreenIds}, company_id  },   transaction  })
    // 先删除所有组件
    await db.SugoLivescreenPublishComponent.destroy({ where: { screen_id: { $in: publishLivescreenIds } }, transaction })
    await db.SugoLivescreenPublish.destroy({  where: { id: {$in: publishLivescreenIds}, company_id  },   transaction  })
  })

  returnResult(ctx, true)
}

async function deleteLiveScreen(ctx) {
  const { user } = ctx.session
  const { company_id } = user

  const { livescreenId } = ctx.params

  if (!livescreenId) {
    returnError(ctx, 'livecreenId is false')
    return
  }

  const res = await SugoLiveScreenService.deleteLiveScreen(company_id, livescreenId)

  returnResult(ctx, res)
}

async function copy(ctx) {
  const { user: { id: user_id, company_id } } = ctx.session
  const { livescreenId } = ctx.params
  if (!livescreenId) {
    returnError(ctx, 'livescreenId is false')
    return
  }
  const res = await SugoLiveScreenService.copyLiveScreen(company_id, user_id, livescreenId)
  returnResult(ctx, res)
}

// 保存模板方法
async function saveTemplate(ctx) {
  const { user } = ctx.session
  const { company_id, id: user_id } = user
  const { livescreen = {}, forAddComps = [], forUpdateComps = [], forDeleteComps = [] } = ctx.q
  const { id, ...info } = livescreen
  const res = await SugoLiveScreenService.saveLiveScreenTemplate(
    id,
    info,
    user_id,
    company_id,
    forAddComps,
    forUpdateComps,
    forDeleteComps
  )
  returnResult(ctx, res)
}

async function getGroupInfo(ctx) {
  const { user } = ctx.session
  const { company_id } = user
  const { id } = ctx.params
  const res = await db.SugoLiveScreen.findOne({
    where: { id, company_id },
    raw: true
  })
  returnResult(ctx, res)
}

async function moveGroup(ctx) {
  const { user } = ctx.session
  const { company_id } = user
  const { id, category_id } = ctx.q
  const res = await db.SugoLiveScreen.update(
    { category_id },
    {
      where: { id, company_id }
    })
  returnResult(ctx, { id, category_id, company_id })
}


export default { cleanRecycle, get, create, update, reductionLiveScreen, recycleLiveScreen, deleteLiveScreen, copy, saveTemplate, getGroupInfo, moveGroup }
