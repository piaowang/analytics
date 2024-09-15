import { BaseService } from '../base.service'
import RedisScheduleService from '../redis-schedule.service'
import druidQueryService from '../druid-query.service'
import segmentService from '../segment.service'
import NissanService from './nissan/nissan-market.service'
import WxjTyjService from './wxjTyj/wxjTyj.service'
import CommonService from './common/common.service'
import { log, err } from '../../utils/log'
import { getMarketingEventCronExpression, checkExpireAndGenCron } from 'common/marketing'
import { MARKETING_TASK_TYPE, MARKETING_EVENT_STATUS, MARKETING_TASK_STATUS, MARKET_BRAIN_EVENT_TIMER_TYPE, MARKET_BRAIN_TOUCH_UP_WAY } from 'common/constants'
import { 
  getAccessTokenWithRedisCache, 
  externalcontactAddMsgTemplate, 
  messageSend,
  getAppChat,
  creatAppChat 
} from '../wechat.service'
import _ from 'lodash'
import db from '../../models'
import moment from 'moment'
import { mapAwaitAll, forAwaitAll } from 'common/sugo-utils';
import { redisSetExpire } from '../../utils/redis'
import conf from '../../config'
import {generate} from 'shortid'

const { externalAddress, site } = conf
const { marketBrain: { feature } } = site

export default class MarketBrainEventsService extends BaseService {

  constructor() {
    super('MarketBrainEvents')
    this.redisSchedule = new RedisScheduleService({prefix: 'sugo:market-brain-events:scheduler'})
    this.prefix_key = 'market-brain-events-task'
    this.nissanService = new NissanService()
    this.wxjTyjService = new WxjTyjService()
    this.commonService = new CommonService()
  }

  async taskRunning({ data }) {
    log(`start running ${this.prefix_key}`, data.name)
    const currentDate = new Date()
    const { id: module_id1 } = data
    const event = await this.findOne({
      id: module_id1
    }, { raw: true })
    if (!event) return
    const { id: module_id, status, timer: { timer_type } } = event
    // 需校验该事件所在的场景是否已关闭，如果已关闭，则不执行 
    const task = await this.db.MarketBrainTasks.findOne({
      where: {
        module_id
      },
      include: [{
        model: db.MarketBrainEvents,
        attributes: ['name'],
        include: [{
          model: db.MarketBrainModels,
          attributes: ['name'],
          include: [{
            model: db.MarketBrainScenes,
            attributes: ['name']
          }]
        }]
      }]
    })
    if (!task) return
    const count = await this.db.MarketBrainTaskExecutions.count({
      where: {
        id: task.id
      },
      raw: true
    })

    const updateTaskData = {
      status: MARKETING_TASK_STATUS.RUNNING,
      execute_time: currentDate
    }
    if (count === 0) {
      updateTaskData.first_execute_time = currentDate
    }
    
    // 更新任务状态为运行中   记得把单次的任务状态更新为完成!!!
    await task.update(updateTaskData, { id: task.id })

    //此处需要处理三个变量组成的排列组合情况 1.是否选了用户群(全人群,精准人群) 2.触达方式 touch_up_way 3.发送渠道 send_channel  同时 场景设置里的表单也应该根据配置变化
    await this.handleByFeature({event, data, task})

    log(`run ${this.prefix_key} success`)

    //根据单次多次来判断是否再添加一次任务 保险起见 判断状态 
    if (timer_type === MARKET_BRAIN_EVENT_TIMER_TYPE.MULTI && status === MARKETING_EVENT_STATUS.OPEN) {
      await this.startAddSchedule({data: event})
    }

  }

  getJobKey(suffix) {
    return `${this.prefix_key}:${suffix}`
  }

  async addScheduleJob(event) {
    if (!event) return
    const { timer, timer_type, status } = event

    if (status !== MARKETING_EVENT_STATUS.OPEN) return
    const key = this.getJobKey(`${event.id}`)
    const { timingDate, timingTimer } = timer
    if (timer_type === MARKET_BRAIN_EVENT_TIMER_TYPE.SINGLE) {
      let cron = checkExpireAndGenCron(timer)
      if (!cron) return 
      if (+moment(timingDate + ' ' + timingTimer) < +moment()) {
        return 
      }
      await this.redisSchedule.addJob(key, {
        // every: '20 seconds', // local test
        cron,
        path: './market-brain/events.service',
        func: 'taskRunning',
        data: event,
        counter: 0
      })
    }

    if (timer_type === MARKET_BRAIN_EVENT_TIMER_TYPE.MULTI) {
      await this.startAddSchedule({data: event})
    }
  }

  async startAddSchedule({ data: event }) {
    //一定是多次的才过来这里
    if (!event) return
    const { timer = {}, timer_type, status } = event

    // await this.removeScheduleJob(event)

    if (timer_type !== MARKET_BRAIN_EVENT_TIMER_TYPE.MULTI && status !== MARKETING_EVENT_STATUS.OPEN) return

    const { realTimers, timingDate, timingTimer, endTimingDate, endTimingTimer } = timer

    const that = this
    await forAwaitAll(realTimers, async (item,idx) => {
      let cron = _.get(item, 'computeIntervalInfo.cronExpression')
      //第0个的cronExpression不能从item里拿 那是个默认的
      if (idx === 0) cron = _.get(timer, 'computeIntervalInfo.cronExpression') 
      if (!cron) return

      await that.redisSchedule.addJob(`${that.prefix_key}:${event.id + ':' + idx}`, {
        cron,
        currentDate: timingDate + ' ' + timingTimer,
        endDate: endTimingDate + ' ' + endTimingTimer,
        path: './market-brain/events.service',
        func: 'taskRunning',
        data: event,
        counter: 0
      })
    })
  }

  async removeScheduleJob(event) {
    if (!event) return
 
    const { timer = {} } = event
    const { realTimers = [] } = timer
    
    const key = this.getJobKey(`${event.id}`)
    log('stop market-brain-event => ', event.name, key)
    await this.redisSchedule.cancelJob(key)
 
    realTimers.map( async (item, idx) => {
      const id = event.id + ':' + idx
      const key = this.getJobKey(`${id}`)
      log('stop market-brain-event => ', event.name, key)
      
      await this.redisSchedule.cancelJob(key)
    })
  }

  async getUserList(
    event, userGroup, settingNameDict, 
    { 
      mobile: setting_mobile, 
      store_id: setting_store_id, 
      member_id: setting_member_id, 
      user_name: setting_user_name, 
      company_id: setting_company_id, 
      account_manager_id, 
      account_manager_name,
      wechat_openid 
    } ) {
    const { usergroup_id, jwt_company_id, jwt_store_id } = event
    const { druid_datasource_id } = userGroup

    let userTotal = _.get(userGroup, 'params.total', 0)
    let userList = []
    try {
      // 获取分群用户列表
      const userIdDimension = _.get(userGroup, 'params.groupby', 'distinct_id')

      let filters = [{
        'col': userIdDimension,
        'op': 'lookupin',
        'eq': usergroup_id
      }]
      if (jwt_company_id && jwt_company_id !== 'null') {
        if (!_.get(settingNameDict[setting_company_id], 'name')) return {
          userTotal: 0,
          userList: {}
        }
        filters.push({
          'col': settingNameDict[setting_company_id].name,
          'op': 'in',
          'eq': jwt_company_id
        })
      }

      if (jwt_store_id && jwt_store_id !== 'null') {
        if (!_.get(settingNameDict[setting_store_id], 'name')) return {
          userTotal: 0,
          userList: {}
        }
        filters.push({
          'col': settingNameDict[setting_store_id].name,
          'op': 'in',
          'eq': jwt_store_id
        })
      }
      let dimensions = _.uniq(_.compact([
        _.get(settingNameDict[setting_mobile], 'name'), 
        userIdDimension, 
        'distinct_id',
        _.get(settingNameDict[setting_user_name], 'name'), 
        _.get(settingNameDict[setting_member_id], 'name'), 
        _.get(settingNameDict[account_manager_name], 'name'), 
        _.get(settingNameDict[account_manager_id], 'name'),
        _.get(settingNameDict[wechat_openid], 'name')
      ])
      )

      userList = await druidQueryService.queryByExpression({
        druid_datasource_id,
        filters,
        dimensions,
        'dimensionExtraSettings': [
          {
            'limit': 99999,
            'sortDirect': 'desc',
            'sortCol': '_tempMetric_distinct_id_NCxCRFNKW'
          }
        ],
        'customMetrics': [
          {
            'name': '_tempMetric_distinct_id_NCxCRFNKW',
            'formula': `$main.filter($${userIdDimension}.isnt(null)).countDistinct($${userIdDimension})`,
            'dimName': `${userIdDimension}`,
            'dimParams': {}
          }
        ],
        'selectOrderDirection': 'desc',
        'splitType': 'groupBy',
        'queryEngine': 'tindex'
      })
    } catch (e) {
      throw Error(e)
    }

    if (_.get(userList, '[0].resultSet.length', 0) < userTotal) {
      userTotal = _.get(userList, '[0].resultSet.length', 0)
    }
    return {
      userTotal,
      userListBak: _.get(userList, '[0].resultSet', []),
      //keyby时 多个手机号只会取一个
      userList: _.keyBy(_.get(userList, '[0].resultSet', []), 'distinct_id')
    }
  }

  async getMarketBrainTaskDetails(
    { sendUsers, 
      data, 
      task_id, 
      execute_id, 
      userGroup, 
      settingNameDict, 
      marketBrainSetting: { 
        mobile: setting_mobile, 
        store_id: setting_store_id, 
        member_id: setting_member_id, 
        user_name: setting_user_name, 
        company_id:setting_company_id, 
        account_manager_id, 
        account_manager_name,
        wechat_openid
      } 
    }
  ) {
    const { id, touch_up_way, copywriting, updated_by, created_by } = data
    const userIdDimension = _.get(userGroup, 'params.groupby', 'distinct_id')
    // 从场景设置里找channelDimension
    const marketbrainTaskDetails = sendUsers.map(item => ({
      distinct_id: item[userIdDimension],
      member_id: item[_.get(settingNameDict[setting_member_id], 'name')],
      task_id,
      module_id: id,
      execute_id,
      user_name: item[_.get(settingNameDict[setting_user_name], 'name')],
      openid: item[_.get(settingNameDict[wechat_openid], 'name')],
      account_manager_name: item[_.get(settingNameDict[account_manager_name], 'name')],
      account_manager_id: item[_.get(settingNameDict[account_manager_id], 'name')],
      mobile: item[_.get(settingNameDict[setting_mobile], 'name')],
      send_type: touch_up_way,
      send_state: 0, // 0 未发送
      created_by: updated_by || created_by
    }))
    return marketbrainTaskDetails
  }

  /**
   * @description 批量开启/关闭事件任务状态(场景启用、停用时需批量更新事件任务状态)
   * @param {any} { model_id, scene_id, status }
   */
  async batchModifyEventScheduleJobs({ model_id, scene_id, status }) {
    if (!model_id || !scene_id || status === undefined) {
      throw new Error('model_id or scene_id is undefined')
    }

    // 查找所有相关场景下已开启的事件列表
    const events = await this.findAll({
      model_id,
      scene_id
    }, { raw: true })

    if (!events.length) {
      return
    }
    log(`场景状态${status === MARKETING_EVENT_STATUS.CLOSE ? '停用' : '启用'}批量同步事件任务状态`)
    const results = events.map(data => {
      if (status === MARKETING_EVENT_STATUS.CLOSE && data.belongs === 1) {
        // 停用场景操作需停止该场景下所有已启用事件任务
        data.status = MARKETING_EVENT_STATUS.CLOSE
        this.update(data, { id: data.id })
        return this.removeScheduleJob(data)
      } else if (status === MARKETING_EVENT_STATUS.OPEN && data.belongs === 1) {
        // 启用场景需开启该场景下所有已启用事件任务
        data.status = MARKETING_EVENT_STATUS.OPEN
        this.update(data, { id: data.id })
        return this.addScheduleJob(data)
      }

      if (status === MARKETING_EVENT_STATUS.CLOSE && data.belongs === 0) {
        // 停用场景操作需停止该场景下所有已启用事件任务
        data.tactics_status = MARKETING_EVENT_STATUS.CLOSE
        return this.update(data, { id: data.id })
      } else if (status === MARKETING_EVENT_STATUS.OPEN && data.belongs === 0) {
        // 启用场景需开启该场景下所有已启用事件任务
        data.tactics_status = MARKETING_EVENT_STATUS.OPEN
        return this.update(data, { id: data.id })
      }
    })
    await Promise.all(results)
  }

  async initEventTasks() {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    const sql = `
      SELECT event.* FROM sugo_market_brain_models AS model, sugo_market_brain_scenes AS scene, sugo_market_brain_events AS event
      WHERE model.id=scene.model_id AND event.model_id=model.id AND event.scene_id=scene.id
      AND scene.status=1 AND event.status=1
    `
    const events = await this.findBySQL(sql)
    if (!events.length) {
      return
    }
    log('初始智能营销-营销事件定时任务: ', events.length)
    // 清除当前模块所有相关定时任务key
    await this.redisSchedule.clearJobs()
    process.nextTick(async () => {
      await Promise.all(events.map(data => this.addScheduleJob(data)))
    })
  }


  async doTaskRunningAccordingToExistedUserId({event, data, task}) {
    const currentDate = new Date()
    //event 数据库里查出来的 最新的记录
    const { created_by, updated_by, copywriting: { content, url },guide_content, jwt_company_id, jwt_store_id, jwt_company_name, jwt_store_name } = event
    // data 生成定时任务时的event记录 其实和event是同一个东西 因为当修改活动时 定时任务一定会重新添加
    const { name, touch_up_way, send_channel } = data
    const task_id = task.id // 任务ID
    let execution
    let datasource
    let userGroup
    let actual_total = 0
    let predict_total = 0
    const isPrecise = Boolean(event.usergroup_id)

    if (!isPrecise) {
      // 创建任务执行记录 有usergroup_id 精准人群（执行中） 没有则全人群 已完成
      return await this.doneExecutions({event, task})
    }

    //执行时 是否更新用户群 在掌车情景中 用户群每天自己更新 如果活动也更新用户群 存在频繁更新用户群的可能
    // await segmentService.update({
    //   update: { updated_by },
    //   query: {
    //     where: {
    //       id: event.usergroup_id
    //     }
    //   }
    // })
    userGroup = await this.db.Segment.findByPk(event.usergroup_id)
    let executionParams = {
      task_id,
      execute_time: currentDate,
      status:  MARKETING_TASK_STATUS.EXECUTING,
      name,
      usergroup_id: event.usergroup_id,
      jwt_company_id, 
      jwt_store_id,
      jwt_company_name, 
      jwt_store_name,
      scene_model_name: _.get(task,'MarketBrainEvent.MarketBrainModel.MarketBrainScenes[0].name', '') + '-' + _.get(task,'MarketBrainEvent.MarketBrainModel.name', ''),
      content: _.template(content)({ url }),
      url,
      guide_content,
      usergroup_title: _.get(userGroup, 'title'),
      usergroup_comment: _.get(userGroup, 'description'),
      touch_up_way,
      send_channel,
      created_by
    }

    execution = await this.db.MarketBrainTaskExecutions.create(executionParams)

    const execute_id = execution.id

    const { druid_datasource_id } = userGroup
    datasource = await db.SugoDatasources.findOne({
      where: {
        id: druid_datasource_id
      },
      raw: true,
      attributes: ['params']
    })
    //场景设置中预设的值
    const marketBrainSetting = _.get(datasource, 'params.marketBrain', {
      // mobile,
      // store_id,
      // user_name,
      // company_id
    })

    //场景设置中预设的值
    let { 
      mobile: setting_mobile, 
      store_id: setting_store_id, 
      user_name: setting_user_name, company_id:setting_company_id, 
      member_id,
      account_manager_id, 
      account_manager_name, 
      wechat_openid 
    } = marketBrainSetting

    const settingName = await db.SugoDimensions.findAll({
      where: {
        id: {
          $or: _.uniq(_.compact([
            setting_mobile, 
            member_id,
            setting_store_id, 
            setting_user_name, 
            setting_company_id, 
            account_manager_id, 
            account_manager_name, 
            wechat_openid
          ]))
        }
      }, raw: true
    })

    const settingNameDict = _.keyBy(settingName, 'id')

    const { userTotal, userList, userListBak } = await this.getUserList(event, userGroup, settingNameDict, marketBrainSetting)
    // 组装文案信息
    const taskDetails = await this.getMarketBrainTaskDetails({
      sendUsers: _.values(userList),
      data: event,
      execute_id,
      task_id,
      userGroup,
      settingNameDict,
      marketBrainSetting
    })

    // 写入任务明细记录
    await this.db.MarketBrainTaskDetails.bulkCreate(taskDetails)

    predict_total = userTotal
    if (touch_up_way === MARKET_BRAIN_TOUCH_UP_WAY.AUTO) {
      // 否则 actual_total 为0 手动执行时 人工通过一条 actual_total + 1
    //  actual_total = userTotal
     actual_total = taskDetails.length
     if (actual_total > predict_total) actual_total = predict_total
   }

    // 更新任务执行记录状态为已完成
    await execution.update({
      predict_total, 
      actual_total, 
      updated_by,
      status: MARKETING_TASK_STATUS.DONE
    }, { id: execution.id })

    return { 
      userList: userListBak,
      marketBrainSetting,
      settingNameDict,
      execution
    }
  }

  async preciseWechatPropelling({event, userList, marketBrainSetting, settingNameDict, execution }) {
    const { name, usergroup_id, touch_up_way, send_channel, jwt_company_id, jwt_store_id, copywriting: { content, url },guide_content, jwt_store_name } = event

    //发送渠道是微信 且精准人群 才触发下方逻辑
    if (touch_up_way !== 1 || send_channel !== 2 || !usergroup_id) return

    //非门店人员创建的活动 不触发下方逻辑
    if ((!jwt_company_id || jwt_company_id === 'null') && (!jwt_store_id || jwt_store_id === 'null')) return

    //场景设置没有设置会员id字段对应的tindex维度 不触发逻辑
    let memberIdTindexFieldName = _.get(settingNameDict[marketBrainSetting.member_id],'name')
    if (!memberIdTindexFieldName) return

    let { cooperate = {}, cooperateWhere } = await this.getCooperateParams(jwt_company_id, jwt_store_id)
    

    const { corpid, custom_contact_secret } = cooperate

    //没有存该门店企业微信信息 不触发下方逻辑
    if (!corpid || !custom_contact_secret) return

    let staffList = await this.db.MarketBrainStaff.findAll({
      where: {
        ...cooperateWhere,
        userid: { $ne: null }
      },
      raw: true
    })
    let shopKeeperAndBoss = await this.db.MarketBrainStaff.findAll({
      where: {
        ...cooperateWhere,
        userid: { $ne: null },
        staff_position: { $in: ['老板', '店长']}
      },
      attributes: ['id','userid'],
      raw: true
    })
    shopKeeperAndBoss = shopKeeperAndBoss.map( i => i.userid)
    //该门店没有录入员工 或 没有开通客户联系的员工 不触发逻辑
    if (_.isEmpty(staffList)) return
    const userIdList = staffList.map( i => i.userid)
    const pgStaffUserIdDict = _.keyBy(staffList, 'userid')

    const pgCustomList = await this.db.MarketBrainCustom.findAll({
      where: {
        sa_id: {
          $or: userIdList
        }
      },
      raw: true
    })

    //开通了客户联系的员工没有客户 不触发逻辑
    if (_.isEmpty(pgCustomList)) return

    const accessToken = await getAccessTokenWithRedisCache(corpid, custom_contact_secret)
    //存储的企业微信信息不能换到accessToken 不触发逻辑
    if (!accessToken) return

    let userListWeChatOpenIdDict = _.keyBy(userList, _.get(settingNameDict[marketBrainSetting.wechat_openid], 'name'))

    let settingOpenId_title = _.get(settingNameDict[marketBrainSetting.wechat_openid], 'title')
    let customDictKey = 'descripe'
    if (settingOpenId_title.includes('open')) customDictKey = 'openid'
    if (settingOpenId_title.includes('union')) customDictKey = 'unionid'
    
    let staffWithCustomDict = {}
    pgCustomList.map( i => {
      if (!i.openid) return
      //该用户不在本次活动范围内
      if (!userListWeChatOpenIdDict[i[customDictKey]]) return
      if (!staffWithCustomDict[i.sa_id]) return staffWithCustomDict[i.sa_id] = [{ openid: i[customDictKey], userid: i.userid }]

      staffWithCustomDict[i.sa_id].push({ openid: i[customDictKey], userid: i.userid })
    })

    let who_claim
    let targetStaffList = []
    for (let k in staffWithCustomDict) {
      if (!pgStaffUserIdDict[k].staff_id) continue

      let targetPgStaff = pgStaffUserIdDict[k]
      let staff = targetPgStaff.company_id + targetPgStaff.store_id + targetPgStaff.staff_id
      who_claim = who_claim ? who_claim + ',' + staff : staff
      targetStaffList.push(targetPgStaff.userid)

      let params = {
        sender:  k,
        external_userid: staffWithCustomDict[k].map( i => i.userid),
        text: {
          content
        },
        link: {
          title: name,
          picurl: `${externalAddress}/_bc/sugo-analytics-static/assets/images/logo.png`,
          desc: jwt_store_name,
          url: url.includes('?') ? url + `&shareid=${pgStaffUserIdDict[k].shareid}` : url + `?shareid=${pgStaffUserIdDict[k].shareid}`
        }
      }
      let externalcontactAddMsgTemplateRes = await externalcontactAddMsgTemplate(accessToken, params)
      const { fail_list, msgid } = externalcontactAddMsgTemplateRes

      if (_.get(pgStaffUserIdDict[k], '')) continue

      await mapAwaitAll(staffWithCustomDict[k], async (i) => {
        if (fail_list.includes(i.userid)) return
        await this.db.MarketBrainTaskDetails.update({
          msgid,
          who_claim: jwt_company_id + jwt_store_id + pgStaffUserIdDict[k].staff_id
        }, {
          where: {
            execute_id: execution.id,
            member_id:  _.get(userListWeChatOpenIdDict[i.openid], memberIdTindexFieldName)
          }
        })
      })

    }

    // 所有本次活动的客户的sa都认领了
    await execution.update({
      who_claim
    }, { id: execution.id })


    //检测该活动是否存在群聊 不存在则新建群聊
    const existedAppChat = await getAppChat({accessToken: accessToken, chatid: event.id})

    if (existedAppChat) return

    let chatUserList
    staffList.map( i => i.userid && chatUserList.push(i.userid))
    let appChatParams = {
      accessToken: accessToken, 
      userList: _.concat(chatUserList, shopKeeperAndBoss), 
      chatName: event.name, 
      chatid: event.id
    }

    if (!_.isEmpty(shopKeeperAndBoss)) appChatParams.owner = shopKeeperAndBoss[0]
    await creatAppChat(appChatParams)

  }

  async fullPropelling({event,  execution}) {
    const { name, usergroup_id, touch_up_way, send_channel, jwt_company_id, jwt_store_id, copywriting: { content, url },guide_content, jwt_store_name } = event

    //发送渠道是微信 且没有人群 才触发下方逻辑
    if (send_channel !== 2 || usergroup_id) return

    //非门店人员创建的活动 不触发下方逻辑
    if ((!jwt_company_id || jwt_company_id === 'null') && (!jwt_store_id || jwt_store_id === 'null')) return

    let { cooperate = {}, cooperateWhere } = await this.getCooperateParams(jwt_company_id, jwt_store_id)

    const { corpid, marketing_secret, enterprise_app_id } = cooperate

    //没有存该门店企业微信信息 不触发下方逻辑
    if (!corpid || !marketing_secret || !enterprise_app_id) return

    let staffList = await this.db.MarketBrainStaff.findAll({
      where: {
        ...cooperateWhere,
        userid: { $ne: null }
      },
      raw: true
    })
    let shopKeeperAndBoss = await this.db.MarketBrainStaff.findAll({
      where: {
        ...cooperateWhere,
        userid: { $ne: null },
        staff_position: { $in: ['老板', '店长']}
      },
      raw: true
    })
    shopKeeperAndBoss = shopKeeperAndBoss.map( i => i.userid)
    //该门店没有录入员工 或 没有开通客户联系的员工 不触发逻辑
    if (_.isEmpty(staffList)) return

    const accessToken = await getAccessTokenWithRedisCache(corpid, marketing_secret)

    await mapAwaitAll(staffList, async i => {

      // 短连接逻辑 企业微信不支持重定向 暂时废弃
      // let shortId = generate()
      // let jwtMessage = `${i.company_id}/${i.store_id}/${i.staff_id}/${execution.id}`
      // let jwtMessage = `actualUrl-${url}`
      // await redisSetExpire('marketBrainH5-' + shortId + '-fullPropelling', 1 * 24 * 60 * 60,  jwtMessage)
      let final_url = url.includes('?') ? `${url}&shareid=${i.shareid}` : `${url}?shareid=${i.shareid}`
      let params = {
        "touser" : `${i.userid}`,
        "msgtype" : "news",
        "agentid": +enterprise_app_id,
        "news": {
          "articles": [
            {
              "title": name,
              "description": jwt_store_name,
              // "url" : `${externalAddress}/api/market-brain-execution/short/${shortId}`,
              "url": `${final_url}`,
              picurl: `${externalAddress}/_bc/sugo-analytics-static/assets/images/logo.png`,
            },
          ]
        },
        'enable_id_trans': 0,
        'enable_duplicate_check': 0
      }
      let textparams = {
        'touser' : `${i.userid}`,
        'msgtype' : 'text',
        'agentid' : +enterprise_app_id,
        'text' : {
          content
        },
        'enable_id_trans': 0,
        'enable_duplicate_check': 0
      }
      await messageSend(accessToken, textparams)
      await messageSend(accessToken, params)
    })
    //全人群活动不走旧的认领逻辑 此处不需要认领操作


    //检测该活动是否存在群聊 不存在则新建群聊
    const existedAppChat = await getAppChat({accessToken: accessToken, chatid: event.id})

    if (existedAppChat) return

    let chatUserList = []
    staffList.map( i => i.userid && chatUserList.push(i.userid))
    let appChatParams = {
      accessToken: accessToken, 
      userList: _.concat(chatUserList, shopKeeperAndBoss), 
      chatName: event.name, 
      chatid: event.id
    }

    if (!_.isEmpty(shopKeeperAndBoss)) appChatParams.owner = shopKeeperAndBoss[0]
    await creatAppChat(appChatParams)
  }

  async getCooperateParams(jwt_company_id, jwt_store_id) {
    let cooperateWhere = {}
    if (jwt_company_id && jwt_company_id !== 'null') cooperateWhere.company_id = jwt_company_id
    if (jwt_store_id && jwt_store_id !== 'null') cooperateWhere.store_id = jwt_store_id
    let cooperate = await this.db.MarketBrainCooperate.findOne({
      where: cooperateWhere, 
      raw: true,
      attributes: ['corpid', 'custom_contact_secret', 'address_book_secret', 'marketing_secret', 'enterprise_app_id']
    })

    return { cooperate, cooperateWhere }
  }

  async delete(id) {
    await this.db.MarketBrainTaskDetails.destroy({
      where: {
        module_id: id
      }
    })

    let taskId = await this.db.MarketBrainTasks.findOne({
      where: {
        module_id: id
      },
      attributes: ['id'],  
      raw: true
    })

    if (taskId) {
      await this.db.MarketBrainTaskExecutions.destroy({
        where: {
          task_id: taskId.id
        }
      })
  
      await this.db.MarketBrainTasks.destroy({
        where: {
          module_id: id
        }
      })
    }

    await this.remove({ id })
  }

  async doneExecutions({event, task}) {

    const currentDate = new Date()
    //event 数据库里查出来的 最新的记录
    const { created_by, updated_by, copywriting: { content, url },guide_content, jwt_company_id, jwt_store_id, jwt_company_name, jwt_store_name, name, touch_up_way, send_channel } = event
    const task_id = task.id // 任务ID

    let executionParams = {
      task_id,
      execute_time: currentDate,
      status: MARKETING_TASK_STATUS.DONE,
      name,
      jwt_company_id, 
      jwt_store_id,
      jwt_company_name, 
      jwt_store_name,
      scene_model_name: _.get(task,'MarketBrainEvent.MarketBrainModel.MarketBrainScenes[0].name', '') + '-' + _.get(task,'MarketBrainEvent.MarketBrainModel.name', ''),
      content: _.template(content)({ url }),
      url,
      guide_content,
      usergroup_comment: '',
      touch_up_way,
      send_channel,
      created_by,
      updated_by
    }

    let execution = await this.db.MarketBrainTaskExecutions.create(executionParams)
    return { execution }
  }

  async executingExecute({event, task, userGroup}) {
    const currentDate = new Date()

    const { created_by, updated_by, copywriting: { content, url },guide_content, jwt_company_id, jwt_store_id, jwt_company_name, jwt_store_name, name, touch_up_way, send_channel } = event

    const task_id = task.id // 任务ID

    let executionParams = {
      task_id,
      execute_time: currentDate,
      status:  MARKETING_TASK_STATUS.EXECUTING,
      name,
      usergroup_id: event.usergroup_id,
      jwt_company_id, 
      jwt_store_id,
      jwt_company_name, 
      jwt_store_name,
      scene_model_name: _.get(task,'MarketBrainEvent.MarketBrainModel.MarketBrainScenes[0].name', '') + '-' + _.get(task,'MarketBrainEvent.MarketBrainModel.name', ''),
      content: _.template(content)({ url }),
      url,
      guide_content,
      usergroup_title: _.get(userGroup, 'title'),
      usergroup_comment: _.get(userGroup, 'description'),
      touch_up_way,
      send_channel,
      created_by
    }

    let execution = await this.db.MarketBrainTaskExecutions.create(executionParams) 
    return execution
  }

  async handleByFeature({event, data, task}) {
    const that = this
    const handleMap = {
      common: that.commonHandler,
      czbbb: that.czbbbHandler,
      nissan: that.nissanHandler,
      wxjTyj: that.wxjTyjHandler
    }
    const fn = handleMap[feature]
    await fn && fn.apply(this, [{event, data, task}])
  }

  async wxjTyjHandler({event, data, task}) {
    const doTaskRunningAccordingToExistedUserIdRes = await this.wxjTyjService.doTaskRunningAccordingToExistedUserId({event, data, task})

    const { 
      userList, 
      userGroup 
    } = doTaskRunningAccordingToExistedUserIdRes

    await this.wxjTyjService.preciseJpushPropelling({
      event,
      userList,
      userGroup
    })
  }

  async commonHandler({event, data, task}) {
    const doTaskRunningAccordingToExistedUserIdRes = await this.commonService.doTaskRunningAccordingToExistedUserId({event, data, task})

    const { 
      userList, 
      userGroup 
    } = doTaskRunningAccordingToExistedUserIdRes

    await this.commonService.preciseJpushPropelling({
      event,
      userList,
      userGroup
    })
  }

  async czbbbHandler({event, data, task}) {

    const doTaskRunningAccordingToExistedUserIdRes = await this.doTaskRunningAccordingToExistedUserId({event, data, task})

    if (!_.isEmpty(doTaskRunningAccordingToExistedUserIdRes)) {

      const { 
        userList, 
        marketBrainSetting, 
        settingNameDict, 
        execution 
      } = doTaskRunningAccordingToExistedUserIdRes
      await this.preciseWechatPropelling({
        event, 
        userList, 
        marketBrainSetting, 
        settingNameDict,
        execution
      })

    }

    const { execution } = doTaskRunningAccordingToExistedUserIdRes

    await this.fullPropelling({ event, execution })
  }

  async nissanHandler({event, task}) {
    const { id, created_by, updated_by, usergroup_id, copywriting: { content, url },guide_content, jwt_company_id, jwt_store_id, jwt_company_name, jwt_store_name, touch_up_way } = event

    const isPrecise = Boolean(usergroup_id)

    //东风日产 暂时都是精准人群活动
    if (!isPrecise) {
      // await this.doneExecutions({ event, task })
      return
    }
    
    const userGroup = await this.db.Segment.findByPk(event.usergroup_id)
    let execution = await this.executingExecute({event, task, userGroup})

    const { 
      userTotal,
      userListBak,
      userList
    } = await this.nissanDetailsHandler({execution, userGroup})
    //组装文案信息---------------------------
    // 写入任务明细记录
    const userIdDimension = _.get(userGroup, 'params.groupby', 'distinct_id')

    //openid user_name send_time到店时间 mobile faceid(是否需要转换成图片地址?)(只是id的话搞到msgid里)  从tindex里来

    /**
     * open_id 写的是 union_id
     * who_claim 写的是 头像文件名
     * send_time 写的是 到店时间
     */
    await this.db.MarketBrainTaskDetails.bulkCreate(_.values(userList).map( (i,idx) => ({
      task_id: task.id,
      module_id: id,
      execute_id: execution.id,
      distinct_id: i.fid,
      send_type: touch_up_way,
      send_state: 1, // 1 已发送
      created_by: updated_by || created_by,
      user_name: i.username, //用户名
      mobile: i.mobile,
      send_time: i.send_time,  //到店时间
      openid: i.unionid,
      who_claim: i.fimg  //faceimage
    })))
    //-------------------------------------------------

    let predict_total = userTotal

    let actual_total = _.values(userList).length
    if (actual_total > predict_total) actual_total = predict_total

    // 更新任务执行记录状态为已完成
    await execution.update({
      predict_total,
      actual_total,
      updated_by,
      status: MARKETING_TASK_STATUS.DONE
    }, { id: execution.id })

    // 从这里开始按渠道区分!!!  区分渠道往企业微信推内容

    //应用消息推送
    await this.nissanService.appPush({event, execution, userList: userListBak})

    //到店应用消息发送
    await this.nissanService.arriveAppPush({event, execution, userList: userListBak})

    //客户联系人发送
    await this.nissanService.contactPush({event, execution, userList: userListBak})

    //短信发送
    await this.nissanService.smsContact({event, execution, userList: userListBak})
  }

  async nissanDetailsHandler({execution, userGroup}) {
    const execute_id = execution.id
    const userIdDimension = _.get(userGroup, 'params.groupby', 'distinct_id')

    const { id: usergroup_id, druid_datasource_id } = userGroup
    let datasource = await db.SugoDatasources.findOne({
      where: {
        id: druid_datasource_id
      },
      raw: true,
      attributes: ['params']
    })


    /** 获取用户群 需要抽成函数 */
    let userTotal = _.get(userGroup, 'params.total', 0)
    let userList = []
    let faceIdList = []
    try {
      //把该群的faceId 全部查回来
      faceIdList = await druidQueryService.queryByExpression(   {
        "druid_datasource_id": druid_datasource_id,
        "timezone": "Asia/Shanghai",
        "dimensions": [
          "fid"
        ],
        "granularity": "P1D",
        "filters": [
          {
            "col": userIdDimension,
            "op": "lookupin",
            "eq": usergroup_id
          },
          {
            "col": "fid",
            "op": "not in",
            "eq": [
              "空字符串 / NULL"
            ],
            "type": "string",
            "containsNull": true
          }
        ],
        "dimensionExtraSettings": [
          {
            "limit": 99999,
            "sortDirect": "desc"
          }
        ],
        "customMetrics": [
          {
            "name": "_tempMetric_fid_C6qFNcGQU",
            "formula": "$main.filter($fid.isnt(null)).countDistinct($fid)",
            "dimName": "fid",
            "dimParams": {}
          }
        ],
        "splitType": "groupBy",
        "queryEngine": "tindex"
      })
      faceIdList = _.get(faceIdList, '[0].resultSet', [])
      faceIdList = faceIdList.map( i => i.fid)

      if (faceIdList.length) {
      //到店时间  这个查询按分钟粒度 会有很多废数据
      let temp0 = await druidQueryService.queryByExpression({
        "druid_datasource_id": "GHMq9QlGIB",
        "timezone": "Asia/Shanghai",
        "dimensions": [
          "fid",
          "__time"
        ],
        "metrics": [
          "tindex_9_MpxgIJm_project_w7ZLfGGyo_total"
        ],
        "granularity": "PT1H",
        "filters": [
          {
            "col": "fid",
            "op": "in",
            "eq": faceIdList,
            "type": "string"
          },
          {
            "col": "channel",
            "op": "in",
            "eq": [
              "挂屏应用"
            ],
            "type": "string",
            "containsNull": true
          }
        ],
        "dimensionExtraSettings": [
          {
            "limit": 99999,
            "sortDirect": "desc",
            "sortCol": "tindex_9_MpxgIJm_project_w7ZLfGGyo_total"
          },
          {
            "sortCol": "__time",
            "sortDirect": "desc",
            "limit": 1,
            "granularity": "PT1M"
          }
        ],
        "splitType": "tree",
        "queryEngine": "tindex"
      })

      temp0 = _.get(temp0, '[0].resultSet', [])

      //查unionid 用户名  
      let temp1 = await druidQueryService.queryByExpression( {
        "druid_datasource_id": "GHMq9QlGIB",
        "timezone": "Asia/Shanghai",
        "dimensions": [
          "fid",
          "handset",
          "unionid",
          "nickname"
        ],
        "granularity": "P1D",
        "filters": [
          {
            "col": "fid",
            "op": "in",
            "eq": faceIdList,
            "type": "string"
          },
          {
            "col": "unionid",
            "op": "not in",
            "eq": [
              "空字符串 / NULL"
            ],
            "type": "string",
            "containsNull": true
          }
        ],
        "dimensionExtraSettings": [
          {
            "limit": 99999,
            "sortDirect": "desc"
          },
          {
            "limit": 10,
            "sortDirect": "desc"
          },
          {
            "limit": 10,
            "sortDirect": "desc"
          },
          {
            "limit": 10,
            "sortDirect": "desc"
          }
        ],
        "select": [
          "fid",
          "handset",
          "unionid",
          "nickname"
        ],
        "selectLimit": 99999,
        "selectOrderDirection": "desc",
        "splitType": "groupBy",
        "queryEngine": "tindex"
      })

      //查头像
      let temp2 = await druidQueryService.queryByExpression({
        "druid_datasource_id": "GHMq9QlGIB",
        "timezone": "Asia/Shanghai",
        "dimensions": [
          "fid",
          "fimg"
        ],
        "granularity": "P1D",
        "filters": [
          {
            "col": "fid",
            "op": "in",
            "eq": faceIdList,
            "type": "string"
          },
          {
            "col": "fimg",
            "op": "not in",
            "eq": [
              "空字符串 / NULL"
            ],
            "type": "string",
            "containsNull": true
          }
        ],
        "dimensionExtraSettings": [
          {
            "limit": 99999,
            "sortDirect": "desc"
          },
          {
            "limit": 99999,
            "sortDirect": "desc"
          }
        ],
        "customMetrics": [
          {
            "name": "_tempMetric_fid_9YfHlHLRx",
            "formula": "$main.filter($fid.isnt(null)).countDistinct($fid)",
            "dimName": "fid",
            "dimParams": {}
          }
        ],
        "splitType": "tree",
        "queryEngine": "tindex"
      })

      temp2 = _.get(temp2, '[0].resultSet', [])

      let temp0FidMap = {}
      temp0.map( i => {
        if (!temp0FidMap[i.fid]) temp0FidMap[i.fid] = i.__time_GROUP[0].__time
      })

      let temp1FidMap = {}
      temp1.map( i => {
        if (!temp1FidMap[i.fid]) temp1FidMap[i.fid] = i
        temp1FidMap[i.fid] = {
          "fid": i.fid,
          "fimg": _.get(temp1FidMap[i.fid],'fimg') || i.fimg,
          "unionid": _.get(temp1FidMap[i.fid],'unionid') || i.unionid,
          "nickname": _.get(temp1FidMap[i.fid],'nickname') || i.nickname
        }
      })

      let temp2FidMap = {}
      temp2.map( i => {
        if (!temp2FidMap[i.fid]) temp2FidMap[i.fid] = i.fimg_GROUP[0].fimg
      })


      userList = faceIdList.map( i => {
        return {
          fid: i,
          send_time: temp0FidMap[i],
          unionid: _.get(temp1FidMap[i], 'unionid', ''),
          username: _.get(temp1FidMap[i], 'nickname'),
          fimg: temp2FidMap[i],
          mobile: _.get(temp1FidMap[i], 'handset'),
        }
      })
      }

    } catch(e) {
      throw Error(e)
    }

    if (userList.length < userTotal) {
      userTotal = userList.length
    }

    /***************************************************** */

    return {
      userTotal,
      userListBak: userList,
      //keyby时 多个手机号只会取一个
      userList: _.keyBy(userList, 'fid')
    }
  }
}
