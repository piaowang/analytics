import EventsService from '../../services/market-brain/events.service'
import MarketingTaskExecution from '../../services/market-brain/task-execution.service'
import TasksService from '../../services/market-brain/task.service'
import MarketBrainTaskDetailsService from '../../services/market-brain/task-details.service'
import { Response } from '../../utils/Response'
import _ from 'lodash'
import db from '../../models'

export default class SugoMarketBrainResultController {

  constructor() {
    this.eventsService =  new EventsService()
    this.taskExecutionService = new MarketingTaskExecution()
    this.tasksService = new TasksService()
    this.marketBrainTaskDetailsService = new MarketBrainTaskDetailsService()
  }

  async fetchOneById(ctx) {
    const { id } = ctx.q
    let event = await this.eventsService.findOne({ id }, { raw: true })
    if (!event || !event.params) return ctx.body = Response.fail()


    // let sql = `
    //   SELECT SUM(execution.predict_total) as predict_total_sum, SUM(execution.actual_total) as actual_total_sum 
    //   FROM sugo_market_brain_task_executions as execution, sugo_market_brain_tasks as task 
    //   where task."module_id"=:id AND execution."task_id" = task."id"
    // `
    // let lastExecuteRecord = await this.taskExecutionService.findBySQL(sql, { id })

    let task = await this.tasksService.findOne({ module_id: id }, { raw: true, attributes: ['id'] })

    let lastExecuteRecord = await this.taskExecutionService.findOne({ task_id: task.id },{
      attributes: ['id', 'name','predict_total', 'actual_total', 'usergroup_title', 'touch_up_way', 'send_channel', 'url','created_at', 'updated_at'],
      order: [
        ['execute_time', 'DESC']
      ],
      raw: true
    })

    //目标人数= 认领了几个
    let countPredictSql = `
      select COUNT(id), who_claim from sugo_market_brain_task_details
      WHERE execute_id=:execute_id AND who_claim is not null group by who_claim
    `
    let predict_count = await this.marketBrainTaskDetailsService.findBySQL(countPredictSql, { execute_id: lastExecuteRecord.id })

    // 触达人数 有send_time 算实际发送 企微的 send_time定时更新
    let countActualSql = `
      select COUNT(id), who_claim from sugo_market_brain_task_details
      WHERE execute_id=:execute_id AND send_time is not null group by who_claim
    `
    let actual_count = await this.marketBrainTaskDetailsService.findBySQL(countActualSql, { execute_id: lastExecuteRecord.id })

    const { jwt_company_id, jwt_store_id } = event

    let staffWhere = {}
    if (jwt_company_id && jwt_company_id !== 'null') staffWhere.company_id = jwt_company_id
    if (jwt_store_id && jwt_store_id !== 'null') staffWhere.store_id = jwt_store_id
    let staffInfo = await db.MarketBrainStaff.findAll({
      where: staffWhere,
      raw: true,
      attributes: ['name','mobile','staff_id', 'shareid']
    })

    const detailsGroupByStaffIdCountTargetSql = `
      select count(id), who_claim from sugo_market_brain_task_details
      WHERE execute_id=:execute_id AND who_claim is not null
      group by who_claim
    `
    const detailsGroupByStaffIdCountSentSql = `
      select count(id), who_claim from sugo_market_brain_task_details
      WHERE execute_id=:execute_id AND send_time is not null AND who_claim is not null
      group by who_claim
    `
    let detailsGroupByStaffIdCountTarget = await db.client.query(detailsGroupByStaffIdCountTargetSql, { 
      replacements: {
        execute_id: lastExecuteRecord.id
      },
      type: db.client.QueryTypes.SELECT
    })
    let detailsGroupByStaffIdCountSent = await db.client.query(detailsGroupByStaffIdCountSentSql, { 
      replacements: {
        execute_id: lastExecuteRecord.id
      },
      type: db.client.QueryTypes.SELECT
    })

    //用于staff_id 换 shareid i.who_claim = staff_id
    const staffInfoStaffidToShareIdMap = _.keyBy(staffInfo,'staff_id')
    let detailsCountGroupByStaffId = {}
    detailsGroupByStaffIdCountTarget.map( i => {
      i.who_claim = i.who_claim.replace(jwt_company_id + jwt_store_id, '')
      if (_.get(staffInfoStaffidToShareIdMap[i.who_claim],'shareid')) {
        detailsCountGroupByStaffId[staffInfoStaffidToShareIdMap[i.who_claim].shareid] = {
          target: i.count
        }
      }
    })
    detailsGroupByStaffIdCountSent.map( i => {
      i.who_claim = i.who_claim.replace(jwt_company_id + jwt_store_id, '')
      if (_.get(staffInfoStaffidToShareIdMap[staffInfoStaffidToShareIdMap[i.who_claim].shareid],'shareid')) {
        detailsCountGroupByStaffId[staffInfoStaffidToShareIdMap[i.who_claim].shareid] = {
          ...detailsCountGroupByStaffId[staffInfoStaffidToShareIdMap[i.who_claim].shareid],
          actual: i.count
        }
      }
    })

    return ctx.body = Response.ok({
      ..._.omit(lastExecuteRecord, ['id']),
      params: event.params,
      url: lastExecuteRecord.url,
      predict_count,
      actual_count,
      staffInfo,
      detailsCountGroupByStaffId
    })

  }

}
