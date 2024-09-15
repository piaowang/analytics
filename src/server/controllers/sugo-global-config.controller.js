import sugoGlobalConfig from '../services/sugo-global-config.service'
import { Response } from '../utils/Response'
import Storage from '../services/public-redis-storage.service'
import db from '../models'
import { AccessDataType } from '../../common/constants'
import storageService, { GetSDKConifgPrefix, SDK_CONFIG_KEYS } from '../services/public-redis-storage.service'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'

async function setSdkGlobalConfig(ctx) {
  const { config } = ctx.q
  const oldData = await sugoGlobalConfig.getInstance().findOne({key: 'sdk_submit_click_point'})
  for (let index = 0; index < config.length; index++) {
    let p = config[index]
    const [result, isCreate] = await sugoGlobalConfig.getInstance().findOrCreate(
      { key: p.key },
      { value: p.val.toString(), key: p.key }
    )
    if (!isCreate) {
      await sugoGlobalConfig.getInstance().update(
        { value: p.val.toString(), key: p.key },
        { key: p.key }
      )
    }
  }
  // 修改配送  删除所有sdk接入项目维度缓存
  // const projects = await db.SugoProjects.findAll({
  //   where: {
  //     access_type: AccessDataType.SDK
  //   },
  //   raw: true
  // })
  
  // const submitClickPoint =  _.get(config.find(p => p.key === 'sdk_submit_click_point') || {}, 'val', '0')

  // if(_.get(oldData, 'value', '0') !== submitClickPoint) {
  //   //批量更新sdkVersion
  //   await new SugoTrackEventService().updataConfigDeploy(
  //     projects
  //     .filter(p => _.get(p, 'extra_params.sdk_submit_click_point', '0') === '1')
  //     .map(p => p.id)
  //   )
  // }

  // for (let index = 0; index < projects.length; index++) {
  //   await Storage.SDKDimension.del(projects[index].id)
  //   await Storage.DesktopDecide.delByProjectId(projects[index].id)
  // }
  const perfix = GetSDKConifgPrefix()

  await storageService.GlobalConfig.del(perfix+'|'+ SDK_CONFIG_KEYS.isHeatMapFunc)
  await storageService.GlobalConfig.del(perfix+'|'+ SDK_CONFIG_KEYS.isSugoInitialize)
  await storageService.GlobalConfig.del(perfix+'|'+ SDK_CONFIG_KEYS.uploadLocation)
  await storageService.GlobalConfig.del(perfix+'|'+ SDK_CONFIG_KEYS.forceUpdateConfig)

  return ctx.body = Response.ok('设置成功')
}

async function getSdkGlobalConfig(ctx) {
  const res = await sugoGlobalConfig.getInstance().findAll({ key: { $or: ['sdk_position_config', 'sdk_init', 'sdk_submit_click_point', 'sdk_force_update_config'] } })
  return ctx.body = Response.ok(res)
}

/**
 * 查询全局配置
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let where = ctx.q
  
  let res = await sugoGlobalConfig.getInstance()
    .findAll(where, {
      raw: true,
      order: [['updated_at', 'desc']]
    })
  returnResult(ctx, res)
}

/**
 * 创建全局配置
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = ctx.q
  
  const serv = sugoGlobalConfig.getInstance()
  let res = await serv.create(data)
  returnResult(ctx, res)
}

/**
 * 修改全局配置
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let modId = ctx.params.id
  let patch = ctx.q
  
  const serv = sugoGlobalConfig.getInstance()
  let preMod = await serv.__model.findByPk(modId)
  if (!preMod) {
    returnError(ctx, '该全局配置不存在')
    return
  }
  
  let res = await serv.update(patch, { id: modId })
  returnResult(ctx, res)
}

/**
 * 删除全局配置
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = sugoGlobalConfig.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该全局配置不存在')
    return
  }
  
  let res = await serv.remove({id: delId})
  returnResult(ctx, res)
}

export default {
  setSdkGlobalConfig,
  getSdkGlobalConfig,
  query,
  create,
  update,
  remove
}
