import { BaseService } from '../base.service'
import RedisScheduleService from '../redis-schedule.service'
import DruidQueryService from '../druid-query.service'
import segmentService from '../segment.service'
import { MARKETING_EVENT_STATUS, MARKETING_SEND_STATUS, MARKETING_TASK_STATUS, MARKETING_TASK_TYPE, MARKETING_TYPE_COLUMN, MARKETING_SEND_CHANNEL } from 'common/constants'
import DruidQueryServices from '../../services/druid-query.service'
import db from '../../models'
import _ from 'lodash'
import moment from 'moment'

const sendChannelOption = {
  0: {
    func: 'pushSchedule',
    query_dimensions: [MARKETING_TYPE_COLUMN.PUSH, 'distinct_id'],
    sendParam: MARKETING_TASK_TYPE.PUSH
  },
  1: {
    func: 'mailSchedule',
    query_dimensions: [MARKETING_TYPE_COLUMN.SMS, 'distinct_id'],
    sendParam: MARKETING_TYPE_COLUMN.SMS
  }
}

export default class MarketingActivitysService extends BaseService {
  constructor() {
    super('MarketingActivitys')
    this.redisSchedule = new RedisScheduleService({prefix: 'sugo:marketing-activitys:scheduler'})
    this.prefix_key = 'marketing-acts-task'
  }

  async delete(id) {
    await this.redisSchedule.cancelJob(this.getJobKey(id))
    await this.remove({id})
  }

  async setSchedule(params) {
    const { timer, id, status } = params
    //此处判断的不是send_status,判断的是界面上的开启关闭,和event相同
    if (status === MARKETING_EVENT_STATUS.CLOSE) return
    //改效果项目的时候也会过来,此时timer是个空的
    if (_.isEmpty(timer)) return
    let { date: timerDate, time: timerTime } = timer 
    const [Y,M,D] = timerDate.split('-')
    const [H,m] = timerTime.split(':')

    timerDate = ~~timerDate.replace(/\-/g, '')
    timerTime = ~~timerTime.replace(/\:/g, '')
    const nowDay = ~~moment().format('YYYY-MM-DD').replace(/\-/g, '')
    const nowTime = ~~moment().format('HH:mm').replace(/\:/g, '')

    //昨天的 true
    const isDisableDate = timerDate < nowDay
    //时间小于等于当前 true
    const isDisableTime = timerTime <= nowTime

    const isTomorrow = timerDate > nowDay
    //昨天的 直接是true  今天的,需要判断时间
    let isDisable = isDisableDate || (
      timerDate === nowDay && isDisableTime
    )

    if (isTomorrow) isDisable = false
    //申请的时间大于当前一刻,直接return 
    if (isDisable) return
    const key = this.getJobKey(id)
    //不需要年,小于当前时间上面有判断,到这里的时间一定是大于当前时间的
    await this.redisSchedule.addJob(key, {
      // cron: `${s} ${m} ${H} ${D} ${M} *`,
      cron: `0 ${m} ${H} ${D} ${M} *`,
      path: './marketing/actives.service',
      func: 'taskRunning',
      data: JSON.stringify(params),
      counter: 0
    })
  }

  async taskRunning(definition) {
    const params = JSON.parse(definition.data)
    console.log(`start running ${this.prefix_key}`, params.name)
    const { id, usergroup_id, send_channel, updated_by, created_by } = params
    const currentDate = new Date()
    let ds = await this.getUserGroup(usergroup_id)
    let {sendGroup, controlGroup, predict_total, actual_total} = await this.getUserList(params, ds)

    const task = await db.MarketingTasks.findOne({
      where: {
        module_id: id,
        type: MARKETING_TASK_TYPE.ACTIVIE
      }
    })
    const status = task.status

    if (status === MARKETING_TASK_STATUS.PAUSED) {
      await this.redisSchedule.cancelJob(this.getJobKey(id))
      return
    }

    await db.MarketingTasks.update({
      predict_total,
      actual_total,
      status: MARKETING_TASK_STATUS.DONE,
      execute_time: currentDate,
      updated_by: updated_by || created_by
    },{
      where: {
        module_id: id
      }
    })
    //只执行一次
    await this.redisSchedule.cancelJob(this.getJobKey(id))
    if (_.isEmpty(sendGroup)) {   //没有匹配到任何用户 直接把任务暂停了
      await db.MarketingTasks.update({
        predict_total,
        actual_total,
        status: MARKETING_TASK_STATUS.PAUSED,
        updated_by: updated_by || created_by
      },{
        where: {
          module_id: id
        }
      })
      return
    }

    if (send_channel === 0) await this.pushScheduleWork({params, sendGroup, controlGroup})
    if (send_channel === 1) await this.mailScheduleWork({params, sendGroup, controlGroup})

    this.update({ send_status: MARKETING_SEND_STATUS.SUCCESS }, {id})
  }


  mailScheduleWork = async ({ params, sendGroup, controlGroup }) => {
    const { id, copywriting, updated_by, created_by } = params
    let { content, url } = copywriting
    content = content.replace('${url}', url + `?module_id=${id}`)

    let task = await db.MarketingTasks.findOne({where: { module_id: id }, raw: true})
    const { id: task_id } = task
    let bulkCreateParams = sendGroup.map( i => ({
      distinct_id: Object.keys(i)[0],
      task_id,
      module_id: id,
      group_type: 0, // 0 发送组
      mobile: Object.values(i)[0],
      content,
      send_state: 0,
      send_type: 1,  //1短信
      created_by: updated_by || created_by
    }))
    if (!_.isEmpty(controlGroup)) {
      bulkCreateParams = bulkCreateParams.concat( controlGroup.map( i => ({
        distinct_id: Object.keys(i)[0],
        task_id,
        module_id: id,
        group_type: 1, // 1 对比组
        send_type: 1,  //1短信
        created_by: updated_by || created_by
      })))
    }
    await db.MarketingTaskDetails.bulkCreate(bulkCreateParams)
  }

  pushScheduleWork = async ({params, sendGroup, controlGroup}) => {
    const { id, copywriting, updated_by, created_by } = params
    let { title, content, pushland } = copywriting

    let task = await db.MarketingTasks.findOne({where: { module_id: id }, raw: true})
    const { id: task_id } = task
    let bulkCreateParams = sendGroup.map( i => ({
      distinct_id: Object.keys(i)[0],
      task_id,
      module_id: id,
      token: Object.values(i)[0],
      group_type: 0, // 0 发送组
      title,
      content,
      page_code: pushland,
      send_state: 0, //0未发送
      send_type: 0,  //0 push
      created_by: updated_by || created_by
    }))
    if (!_.isEmpty(controlGroup)) {
      bulkCreateParams = bulkCreateParams.concat( controlGroup.map( i => ({
        distinct_id: Object.keys(i)[0],
        task_id,
        module_id: id,
        group_type: 1, // 1 对比组
        send_type: 0,  //0 push
        created_by: updated_by || created_by
      })))
    }
    await db.MarketingTaskDetails.bulkCreate(bulkCreateParams)
  }

  cancelSchedule = async (name, send_channel, id, status, user_id) => {
    // status 0 暂停 1 开启

    //定时任务删掉
    await this.redisSchedule.cancelJob(this.getJobKey(id))

    //已建立任务表的修改任务表状态
    let params = {
      predict_total: 0,
      actual_total: 0,
      module_id: id,
      execute_time: null,
      name,
      type: 1,   //1 活动营销
      status: status === 0 ? MARKETING_TASK_STATUS.PAUSED : MARKETING_TASK_STATUS.RUNNING, // 1 运行中　３　已暂停
      send_type: send_channel,
      start_time: moment()
    }
    let existTaskRecord = await db.MarketingTasks.findOne({
      where: { module_id: id }
    })
    if (existTaskRecord) {
      //更新记录
      params.updated_by = user_id
      await db.MarketingTasks.update(params,{
        where: {
          module_id: id
        }
      })
    } else {
      params.created_by = user_id
      await db.MarketingTasks.create(params)
    }
  }

  getUserGroup = async (usergroup_id) => {
    return await segmentService.get({
      where: {
        id: usergroup_id
      }
    })
  }

  getUserList = async (params, ds) => {
    const {usergroup_id, usergroup_strategy, updated_by, created_by, company_id, send_channel, send_ratio } = params
    const datasource_id = _.get(ds,'[0].druid_datasource_id')
    let datasource = await db.SugoDatasources.findByPk(datasource_id, { raw: true })
    let druid_datasource_id
    if (datasource.type === 2 ) {
      druid_datasource_id = datasource_id
    } else {
      let project = await db.SugoProjects.findByPk(_.get(ds,'[0].params.relatedUserTagProjectId'), { raw: true })
      druid_datasource_id = project.datasource_id
    }
    let userList = []
    let sendGroup = []
    let controlGroup = []
    let predict_total, actual_total
    //发送时更新人群
    if (usergroup_strategy === 0) {
      const update = _.pick(_.get(ds, '[0]', {}), [
        'title',
        'params',
        'description',
        'usergroupIds',
        'tags'
      ])
      update.updated_by = updated_by || created_by
      const query = {
        where: {
          company_id,
          id: usergroup_id
        }
      }
      await segmentService.update({
        update,
        query
      })
    }
    try {
      let userGroup = await this.getUserGroup(usergroup_id)
      const userIdDimension = _.get(userGroup, 'params.groupby', 'distinct_id')
      let select = [MARKETING_TYPE_COLUMN.PUSH]
      if (send_channel === MARKETING_SEND_CHANNEL.SMS) select = [MARKETING_TYPE_COLUMN.SMS]
      select.push(userIdDimension)
      predict_total = _.get(userGroup, '[0].params.total',0)
      predict_total = Math.round(predict_total * send_ratio * 0.01)
      userList = await DruidQueryService.queryByExpression({
        druid_datasource_id,
        'timezone': 'Asia/Shanghai',
        'granularity': 'P1D',
        'filters': [{
          'col': 'distinct_id',
          'op': 'lookupin',
          'eq': usergroup_id
        }],
        // 'select': sendChannelOption[send_channel].query_dimensions,
        select,
        enableDesensitiz: false,
        selectLimit: 9999999,
        'selectOrderDirection': 'desc',
        'splitType': 'groupBy',
        'queryEngine': 'tindex'
      })
      userList = userList.map( i => (
        {[i[userIdDimension]]: i[sendChannelOption[send_channel].sendParam]}
      ))
      sendGroup = userList.filter( i => !_.isEmpty(Object.values(i)[0]))
      if (sendGroup.length > predict_total) {
        sendGroup = _.take(_.shuffle(sendGroup), predict_total)
      } 
      actual_total = sendGroup.length
      controlGroup = _.differenceWith(userList,sendGroup, _.isEqual)
    } catch (e) {
      throw Error(e)
    }
    return { sendGroup, controlGroup, predict_total, actual_total}
  }

  getJobKey(suffix) {
    return `${this.prefix_key}:${suffix}`
  }

  async getLineResult({eventInfo, sendGroup, contrastGroup }) {

    let lineChartResult = {
      sendGroupRevisit: [],
      sendGroupOpen: [],
      contrastGroupRevisit: []
    }

    //回访数查询
    let sendGroupRevisit = []
    let contrastGroupRevisit = []

    const { project_id, timer, id } = eventInfo
    if (!project_id) return false
    const projectRes = await db.SugoProjects.findOne({where: { id: project_id }, raw: true, attributes:['datasource_id']})
    let druid_datasource_id = projectRes.datasource_id

    const send_time = moment(timer.date + ' ' + timer.time)
    let since = _.cloneDeep(send_time).format('YYYY-MM-DD HH:mm:ss')
    const until = _.cloneDeep(send_time).add(24,'hour').format('YYYY-MM-DD HH:mm:ss')
    if (!_.isEmpty(sendGroup) && druid_datasource_id) {
      sendGroupRevisit = await DruidQueryServices.queryByExpression({
        druid_datasource_id,
        'timezone': 'Asia/Shanghai',
        'dimensions': ['__time'],
        'granularity': 'PT1H',
        'filters': [{
          'col': '__time',
          'op': 'in',
          'eq': [since, until],
          'type': 'date'
        }, {
          'col': 'event_name',
          'op': 'in',
          'eq': ['浏览'],
          'type': 'string'
        }, {
          'col': 'distinct_id',
          'op': 'in',
          'eq': sendGroup,
          'type': 'string'
        }],
        'dimensionExtraSettings': [{
          'sortCol': '__time',
          'sortDirect': 'asc',
          'limit': 25,
          'granularity': 'PT1H'
        }],
        isAccumulate: true,
        'customMetrics': [{
          'name': 'send_group_revisit',
          'formula': '$main.filter($distinct_id.isnt("")).countDistinct($distinct_id)',
          'dimName': 'distinct_id',
          'dimParams': {}
        }],
        'splitType': 'tree',
        'queryEngine': 'tindex'
      })
      lineChartResult.sendGroupRevisit = _.get(sendGroupRevisit,'[0].resultSet', [])
    }
    if (!_.isEmpty(contrastGroup) && druid_datasource_id) {
      contrastGroupRevisit = await DruidQueryServices.queryByExpression({
        druid_datasource_id,
        'timezone': 'Asia/Shanghai',
        'dimensions': ['__time'],
        'granularity': 'PT1H',
        'filters': [{
          'col': '__time',
          'op': 'in',
          'eq': [since, until],
          'type': 'date'
        }, {
          'col': 'event_name',
          'op': 'in',
          'eq': ['浏览'],
          'type': 'string'
        }, {
          'col': 'distinct_id',
          'op': 'in',
          'eq': contrastGroup,
          'type': 'string'
        }],
        'dimensionExtraSettings': [{
          'sortCol': '__time',
          'sortDirect': 'asc',
          'limit': 25,
          'granularity': 'PT1H'
        }],
        isAccumulate: true,
        'customMetrics': [{
          'name': 'contrast_group_revisit',
          'formula': '$main.filter($distinct_id.isnt("")).countDistinct($distinct_id)',
          'dimName': 'distinct_id',
          'dimParams': {}
        }],
        'splitType': 'tree',
        'queryEngine': 'tindex'
      })
      lineChartResult.contrastGroupRevisit = _.get(contrastGroupRevisit, '[0].resultSet', [])
    }

    //打开数统计
    let sendGroupCount = []
    if (!_.isEmpty(sendGroup) && druid_datasource_id) {
      sendGroupCount = await DruidQueryServices.queryByExpression({
        druid_datasource_id,
        'timezone': 'Asia/Shanghai',
        'dimensions': ['__time'],
        'granularity': 'PT1H',
        'filters': [{
          'col': '__time',
          'op': 'in',
          'eq': [since, until],
          'type': 'date'
        }, {
          'col': 'module_id',
          'op': 'in',
          'eq': [id],
          'type': 'string'
        },{
          'col': 'open_state',
          'op': 'in',
          'eq': [1, 1],
          'type': 'number'
        },{
          'col': 'distinct_id',
          'op': 'in',
          'eq': sendGroup,
          'type': 'string'
        }],
        'dimensionExtraSettings': [{
          'sortCol': '__time',
          'sortDirect': 'asc',
          'limit': 25,
          'granularity': 'PT1H'
        }],
        isAccumulate: true,
        'customMetrics': [{
          'name': 'send_group_open',
          'formula': '$main.filter($distinct_id.isnt("")).countDistinct($distinct_id)',
          'dimName': 'distinct_id',
          'dimParams': {}
        }],
        'splitType': 'tree',
        'queryEngine': 'tindex'
      })
      lineChartResult.sendGroupOpen = _.get(sendGroupCount,'[0].resultSet', [])
    }

    return lineChartResult
  }

  async initActsTasks() {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    // 清理历史缓存中的配置
    await this.redisSchedule.clearJobs() // 清除当前模块所有相关定时任务key
    const res = await this.findAll({ send_status: MARKETING_SEND_STATUS.UNSENT }, { raw: true })
    process.nextTick(async () => {
      await Promise.all(res.map(data => this.setSchedule(data)))
    })
  }
}
