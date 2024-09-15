import SugoExamineService from '../services/sugo-examine.service'
import SugoLiveScreenService from '../services/sugo-livescreen.service'
import { UserService } from '../services/user.service'
import { Response } from '../utils/Response'
import shortid, { generate } from 'shortid'
import _ from 'lodash'
import SugoExamineConfigService from '../services/sugo-examine-config.service'
import { EXAMINE_TYPE, EXAMINE_STATUS } from '../../common/constants'
import moment from 'moment'
import LiveScreenPublishServices from '../services/sugo-livescreen-publish.service'
import db from '../models'

export default class SugoExamineController {

  constructor() {
    this.examineSer = SugoExamineService.getInstance()
    this.userSer = UserService.getInstance()
    this.examineConfigSer = SugoExamineConfigService.getInstance()
    this.liveScreenPublishSer = LiveScreenPublishServices.getInstance()
  }

  // TODO 添加审核
  async create(ctx) {
    const { user } = ctx.session
    const { institutions_id, id: userId, company_id } = user
    const { modelType, modelId } = ctx.q
    let status = 1
    let examineUser = ''
    let config = {
      info: [],
      id: null
    }
    // 获取流程配置
    const exConfig = await this.examineConfigSer.findOne({ model_type: modelType === EXAMINE_TYPE.liveScreenTemplate ? EXAMINE_TYPE.liveScreen : modelType, institution_id: institutions_id }, { raw: true })
    if (_.isEmpty(exConfig) || _.isEmpty(exConfig.info)) {
      //return ctx.body = Response.fail('没有配置审核流程')
      const transaction = await db.client.transaction({ autocommit: true })
      status = 2
      examineUser = userId
      try {
        await this.liveScreenPublishSer.publishLivescreen(modelId, transaction)
        await transaction.commit()
        // return ctx.body = Response.ok({msg: '审核通过'})
      } catch(error) {
        await transaction.rollback()
        return ctx.body = Response.fail(error.message)
      }
    } else {
      config = exConfig
      examineUser = _.get(exConfig, 'info.0.handlerId')
    }
    await this.examineSer.create({
      id: shortid(),
      model_type: modelType,
      model_id: modelId,
      status,
      examine_user: examineUser,
      examine_step: 1,
      created_by: userId,
      updated_by: userId,
      company_id,
      examine_info: config.info,
      config_id: config.id
    })
    return ctx.body = Response.ok()
  }

  // 取消审核
  async cancel(ctx) {
    const { user } = ctx.session
    const { id: userId } = user
    const { id } = ctx.q

    await this.examineSer.update({ status: 0 }, { created_by: userId, id })
    return ctx.body = Response.ok()
  }

  // TODO 获取大屏审核信息
  async getExamineInfo(ctx) {
    const { user } = ctx.session
    const { id: userId } = user
    const { modelType, modelId } = ctx.q
    const res = await this.examineSer.findOne({ created_by: userId, model_type: modelType, model_id: modelId }, { raw: true })
    return ctx.body = Response.ok(res)
  }

  // 获取我发起的审核
  async getSendList(ctx) {
    const { user } = ctx.session
    const { modelType } = ctx.q
    const { id: userId } = user
    let res = await this.examineSer.findAll({
      created_by: userId,
      model_type: modelType === EXAMINE_TYPE.liveScreen
        ? { $in: [EXAMINE_TYPE.liveScreen, EXAMINE_TYPE.liveScreenTemplate] }
        : modelType
    },
    { raw: true, order: [['updated_at', 'DESC']] })
    let dataMap = {}
    if (modelType === EXAMINE_TYPE.liveScreen || modelType === EXAMINE_TYPE.liveScreenTemplate) {
      dataMap = await SugoLiveScreenService.findAll({
        id: { $in: res.map(p => p.model_id) }
      }, { raw: true })
    }
    dataMap = _.keyBy(dataMap, p => p.id)
    res = res.map(p => ({ ...p, model_name: _.get(dataMap, `${p.model_id}.title`) }))
    return ctx.body = Response.ok(res)
  }

  // 获取我审核的
  async getExamineList(ctx) {
    const { user } = ctx.session
    const { id: userId } = user
    const { modelType } = ctx.q
    let res = await this.examineSer.findAll({
      model_type: modelType === EXAMINE_TYPE.liveScreen
        ? { $in: [EXAMINE_TYPE.liveScreen, EXAMINE_TYPE.liveScreenTemplate] }
        : modelType, 
      status: { $ne: EXAMINE_STATUS.notsubmit }
    }, { raw: true, order: [['updated_at', 'DESC']] })
    res = res.filter(p => {
      const { examine_step } = p
      const objs = _.slice(p.examine_info, 0, examine_step)
      return _.some(objs, p => p.handlerId === userId)
    })
    let dataMap = {}
    if (modelType === EXAMINE_TYPE.liveScreen || modelType === EXAMINE_TYPE.liveScreenTemplate) {
      dataMap = await SugoLiveScreenService.findAll({
        id: { $in: res.map(p => p.model_id) }
      }, { raw: true })
    }
    dataMap = _.keyBy(dataMap, p => p.id)
    let userMap = await this.userSer.findAll({ id: { $in: res.map(p => p.created_by) } }, { raw: true })
    userMap = _.keyBy(userMap, p => p.id)
    res = res.map(p => ({ ...p, model_name: _.get(dataMap, `${p.model_id}.title`), created_by_name: _.get(userMap, `${p.created_by}.first_name`) }))
    return ctx.body = Response.ok(res)
  }
  // 审核功能
  async examine(ctx) {
    const { user } = ctx.session
    const { id: userId } = user
    const { examieStatus, message, id } = ctx.q
    let obj = await this.examineSer.findOne({ id }, { raw: true })
    const { examine_info, examine_step } = obj
    if (!examieStatus) {
      await this.examineSer.update({
        status: 3,
        examine_info: examine_info.map((p, i) => {
          return (i + 1) === examine_step
            ? { ...p, examieStatus: 3, examineMsg: message, handlerAt: moment().format('YYYY-MM-DD HH:mm:ss') }
            : p
        })
      }, { id })
      return ctx.body = Response.ok()
    }
    if (examine_step < examine_info.length) {
      await this.examineSer.update({
        examine_step: examine_step + 1,
        status: 1,
        examine_user: _.get(examine_info, `${examine_step}.handlerId`, ''),
        examine_info: examine_info.map((p, i) => {
          return (i + 1) === examine_step
            ? { ...p, handlerAt: moment().format('YYYY-MM-DD HH:mm:ss'), examieStatus: 2, examineMsg: message }
            : p
        })
      }, { id })
      return ctx.body = Response.ok()
    } else {
      const transaction = await db.client.transaction({ autocommit: true })
      try {
        await this.examineSer.update({
          status: 2,
          examine_info: examine_info.map((p, i) => {
            return (i + 1) === examine_step
              ? { ...p, handlerAt: moment().format('YYYY-MM-DD HH:mm:ss'), examieStatus: 2, examineMsg: message }
              : p
          })
        }, { id }, { transaction })
        await this.liveScreenPublishSer.publishLivescreen(obj.model_id, transaction)
        await transaction.commit()
        return ctx.body = Response.ok()
      } catch (error) {
        await transaction.rollback()
        return ctx.body = Response.fail(error.message)
      }
    }
  }
  //删除
  async delete(ctx) {
    const { user } = ctx.session
    const { id } = ctx.q
    const { id: userId } = user
    const res = await this.examineSer.remove({ id, created_by: userId })
    return ctx.body = Response.ok(res)
  }
}
