import { Response } from '../../utils/Response'
import MarketingActivityService from '../../services/marketing/actives.service'
import MarketingResultsService from '../../services/marketing/result.service'
import MarketingTaskDetailsService from '../../services/marketing/task-details.service'
import TasksService from '../../services/marketing/task.service'
import TaskDetails from '../../services/marketing/task-details.service'
import { MARKETING_TASK_TYPE, MARKETING_SEND_STATUS, MARKETING_GROUP_TYPE } from 'common/constants'
import segmentService from '../../services/segment.service'
import _ from 'lodash'
import moment from 'moment'
import sequelize from 'sequelize'

export default class SugoMarketingActivesController {

  constructor() {
    this.marketingActivityService =  new MarketingActivityService()
    this.marketingResultsService = new MarketingResultsService()
    this.marketingTaskDetailsService = new MarketingTaskDetailsService()
    this.tasksService = new TasksService()
    this.taskDetails = new TaskDetails()
    this.db = this.marketingActivityService.db
  }

  async getList(ctx) {
    let { page = 1, pageSize = 10, group_id, where = {} } = ctx.q
    where = _.omitBy(where, o => {
      if (o === 0) return false
      return !o
    })
    if (where.name) {
      where.name = {
        $like: `%${where.name}%`
      }
    }
    if (where.timer) {
      const [ since, until ] = where.timer
      where.timer = {
        date: {
          $between: [
            moment(since).toISOString(),
            moment(until).add(1, 'day').toISOString()
          ]
        }
      }
    }
    if (group_id) where.group_id = group_id
    const res = await this.marketingActivityService.findAndCountAll(where, {
      include: {
        model: this.db.MarketingActivityGroups,
        attributes: ['id','name']
      },
      raw: true,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      order: [['created_at', 'DESC']]
    })
    ctx.body = Response.ok(res)
  }

  async getOne(ctx) {
    const { id } = ctx.q
    const res = await this.marketingActivityService.findOne({id}, { raw: true })
    return ctx.body = Response.ok(res)
  }

  async create(ctx) {
    const { name, status, send_channel } = ctx.q
    const existed = await this.marketingActivityService.findOne({ name })
    if (existed) return ctx.body = Response.fail('已存在活动名称')
    let {user} = ctx.session
    let {company_id, id: user_id} = user
    const params = ctx.q
    Object.assign(params, {
      created_by: user_id,
      send_status: MARKETING_SEND_STATUS.UNSENT,
      company_id
    })
    const res = await this.marketingActivityService.create(params)
    ctx.body = Response.ok()
    const currentDate = new Date()
    await this.marketingActivityService.setSchedule(res.dataValues)
    await this.tasksService.syncTaskStatus({
      data: {
        id: res.dataValues.id,
        name,
        type: 1,
        status,
        start_time: currentDate,
        send_channel,
        created_by: user_id
      },
      type: MARKETING_TASK_TYPE.ACTIVIE
    })
  }

  async update(ctx) {
    const { name, id, status, send_channel } = ctx.q
    const existed = await this.marketingActivityService.findOne({
      name, id: { $ne: id}
    })
    const currentDate = new Date()

    if (existed) return ctx.body = Response.fail('已存在活动名')

    let canEdit = await this.checkCanEdit(ctx.q)
    if (!canEdit) return ctx.body = Response.fail('不能编辑')

    let {user} = ctx.session
    let {company_id, id: user_id} = user
    const params = ctx.q
    Object.assign(params, {
      updated_by: user_id,
      company_id
    })
    const res = await this.marketingActivityService.update(params, { id })
    ctx.body = Response.ok()
    await this.tasksService.syncTaskStatus({
      data: {
        id,
        name,
        type: 1,
        status,
        start_time: currentDate,
        send_channel,
        updated_by: user_id
      },
      type: MARKETING_TASK_TYPE.ACTIVIE
    })
    await this.marketingActivityService.setSchedule(params)
  }

  async delete(ctx) {
    const id = ctx.params.id
    if (!id) return ctx.body = Response.fail('没有id')
    const existed = await this.tasksService.findOne({module_id: id})
    if (existed) return ctx.body = Response.fail('该任务已执行,不能删除')
    await this.marketingActivityService.delete(id)
    await this.tasksService.remove({module_id: id})
    return ctx.body = Response.ok()
  }

  async checkCanEdit(params) {
    //主要作用于检测改效果项目的时候
    const { id } = params

    const item = await this.marketingActivityService.findOne({id},{raw: true})
    let timerDate = _.get(item,'timer.date')
    let timerTime = _.get(item,'timer.time')
    timerDate = ~~timerDate.replace(/\-/g, '')
    timerTime = ~~timerTime.replace(/\:/g, '')
    //昨天的 true
    const isDisableDate = timerDate < ~~moment().format('YYYY-MM-DD').replace(/\-/g, '')
    //时间小于等于当前 true
    const isDisableTime = timerTime <= ~~moment().format('HH:mm').replace(/\:/g, '')

    const isTomorrow = timerDate > ~~moment().format('YYYY-MM-DD').replace(/\-/g, '')

    //昨天的 直接是true  今天的,需要判断时间
    let isDisable = isDisableDate || (
      timerDate === ~~moment().format('YYYY-MM-DD').replace(/\-/g, '') && isDisableTime
    )

    if (isTomorrow) isDisable = false
    let remainParams = _.omit(params, ['id', 'project_id'])
    //改效果项目的时候 去掉这两个就是空的了, 时间的检查就是7天 否则按上面的
    if (_.isEmpty(remainParams)) {
      isDisable = moment(timerDate).add(-6,'day').startOf('day') > moment().startOf('day')
    }
    
    if (isDisable) return false
    return true
  }

  async getResult(ctx) {
    const { id } = ctx.q

    //表格结果
    const resultSet = await this.marketingResultsService.findOne({module_id: id },{ raw: true })

    //活动信息
    let eventInfo = await this.marketingActivityService.findOne({id}, {raw: true})
    const { usergroup_id } = eventInfo
    const userGroup = await segmentService.get({
      where: {
        id: usergroup_id
      }
    })
    const userGroupTitle = _.get(userGroup,'[0].title', '')
    eventInfo.userGroupTitle = userGroupTitle

    //按发送组,对照组分类用户组
    const targetUserGroup = await this.marketingTaskDetailsService.findAll({
      module_id: id
    },{attributes: ['distinct_id', 'group_type'], raw: true})
    let sendGroup = targetUserGroup.filter( i => i.group_type === MARKETING_GROUP_TYPE.SEND).map(i => i.distinct_id)
    let contrastGroup = targetUserGroup.filter(i => i.group_type === MARKETING_GROUP_TYPE.CONTRAST).map(i => i.distinct_id)

    //线图结果统计
    let lineChartResult = await this.marketingActivityService.getLineResult({eventInfo, sendGroup, contrastGroup})

    if (!lineChartResult) return ctx.body = Response.fail('统计失败')

    let res = {
      resultSet,
      eventInfo,
      lineChartResult
    }
    return ctx.body = Response.ok(res)
  }

}
