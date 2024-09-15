
import db from '../../../models'
import _ from 'lodash'
import conf from '../../../config'
import { log, err } from '../../../utils/log'
import druidQueryService from '../../druid-query.service'
import { JPush } from 'jpush-async'
import { MARKETING_TASK_TYPE, MARKETING_EVENT_STATUS, MARKETING_TASK_STATUS, MARKET_BRAIN_EVENT_TIMER_TYPE, MARKET_BRAIN_TOUCH_UP_WAY } from 'common/constants'
import { SENDCHANNELENUM, DEFAULTCHANNELENUM } from 'common/marketBrain/constants'

//这个保存的是自己的企业微信 现有管理客户和客户的客户的企业微信的需求
const { 
  JPush: JPushConfig,
  site: {
    marketBrain: { 

  } } } = conf

export default class CommonService  {
  constructor() {
    this.prefix_key = 'market-brain-events-task'
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

    if (!isPrecise) {
      // 创建任务执行记录 有usergroup_id 精准人群（执行中） 没有则全人群 已完成
      let execution = await db.MarketBrainTaskExecutions.create(executionParams)
      return { execution }
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
    userGroup = await db.Segment.findByPk(event.usergroup_id)
    executionParams = {
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

    execution = await db.MarketBrainTaskExecutions.create(executionParams)

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
    await db.MarketBrainTaskDetails.bulkCreate(taskDetails)

    predict_total = userTotal
    if (touch_up_way === MARKET_BRAIN_TOUCH_UP_WAY.AUTO) {
      actual_total = taskDetails.length
      if (actual_total > predict_total) actual_total = predict_total
    }

    if (event.send_channel === 3) {

      await execution.update({
        predict_total: _.get(userGroup,'params.total'), 
        actual_total: taskDetails.length > predict_total ? predict_total : taskDetails.length, 
        updated_by,
        status: MARKETING_TASK_STATUS.DONE
      }, { id: execution.id })
    } else {
      await execution.update({
        predict_total, 
        actual_total, 
        updated_by,
        status: MARKETING_TASK_STATUS.DONE
      }, { id: execution.id })
    }
    // 更新任务执行记录状态为已完成

    return { 
      userList: userListBak,
      marketBrainSetting,
      settingNameDict,
      execution,
      userGroup
    }
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

  async genJpushNotification({ platform, title, content, extra}) {
    let notification = []

    platform.map( i => {
      if (i === 'ios' || i === 'ios-product') {
        notification.push(JPush.ios({
          title,
          'body': content 
        }, 'default', '+1', true, extra))
        return 
      }

      if (i === 'android') {
        notification.push(JPush.android('alert', 'title', null, extra))
        return 
      }

      if (i === 'winphone') {
        notification.push(JPush.winphone('alert', 'title', null, extra))
        return 
      }
    })

    return notification
  }

  async preciseJpushPropelling({ event, userList, userGroup }) {
    const { name, usergroup_id, touch_up_way, send_channel, jwt_company_id, jwt_store_id, copywriting: { platform, title, content, jpushExtra, pushTarget },guide_content, jwt_store_name } = event
    //发送渠道是极光推送 且精准人群 才触发下方逻辑
    if (SENDCHANNELENUM['common'][touch_up_way][send_channel] !== DEFAULTCHANNELENUM['jPush'] || !usergroup_id) return

    const extra = {}
    jpushExtra.map( i => {
      extra[i.key] = i.val
    })
    
    const notification = await this.genJpushNotification({ platform, title, content, extra})

    const userIdDimension = _.get(userGroup, 'params.groupby', 'distinct_id')
    const targetUser = userList.map( i => i[userIdDimension])

    _.chunk(targetUser, 1000).map( async (i) => {
      //注意600次/分钟限制
      const audience = pushTarget === 0 ? JPush.registration_id(i) : JPush.alias(i)
      await this.doJpush({ platform, notification, audience })
    })
  }

  async doJpush({ platform = [], notification = [], audience }) {
    const { appKey, masterSecret } = JPushConfig

    if (_.isEmpty(JPushConfig)) {
      log(`run ${this.prefix_key || 'test Jpush'} fail`)
      return
    }
    if (!appKey || !masterSecret || _.isEmpty(platform) || _.isEmpty(notification) || !audience ) {
      log(`run ${this.prefix_key || 'test Jpush'} fail`)
      return
    } 

    const client = JPush.buildClient(JPushConfig)

    let isIosProduct = false

    if (platform.includes('ios-product')) {
      platform = platform.filter(i => i !== 'ios-product')
      isIosProduct = true
      platform.push('ios')
    }


    client.push()
      .setOptions(null, 1800, null, isIosProduct)
      .setPlatform(...platform)
      .setAudience(audience)
      .setNotification(...notification)
      .send((err, res) => {
        if (err) {
          if (err instanceof JPush.APIConnectionError) {
            log(`run ${this.prefix_key} fail, Jpush error======`)
            console.log(err.message)
          } else if (err instanceof JPush.APIRequestError) {
            console.log(err.message)
          }
        } else {
          console.log('Sendno: ' + res.sendno)
          console.log('Msg_id: ' + res.msg_id)
        }
      })
  }
}
