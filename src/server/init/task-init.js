/**
 * 间隔循环执行的任务，以及定时任务的初始化
 */
import SugoMonitorService from '../services/sugo-monitor-alarms.service'
import SugoTagHqlService from '../services/sugo-tag-hql.service'
import MarketBrainEventsService from '../services/market-brain/events.service'
import MarketingEventsService from '../services/marketing/events.service'
import marketingActivitysService from '../services/marketing/actives.service'
import ApiResultLogService from '../services/api-result-log.service'
import sugoOfflineCalcModelsController from '../controllers/sugo-offline-calc-models.controller'
import StaffService from '../services/market-brain/staff.service'

export default function initTask() {
  initMonitor()
}

export const initMonitor = () => {
  const monitorService = new SugoMonitorService()
  monitorService.initMonitor()
}

export const initTagHQL = () => {
  const tagHqlService = new SugoTagHqlService()
  tagHqlService.initTasks()
}

export const initMarketBrainEventTasks = () => {
  const eventsService = new MarketBrainEventsService()
  eventsService.initEventTasks()
}

export const initEventTasks = () => {
  const eventsService = new MarketingEventsService()
  eventsService.initEventTasks()
}

export const initActTasks = () => {
  const marketingactivitysrService = new marketingActivitysService()
  marketingactivitysrService.initActsTasks()
}

export const initApiResultLogTasks = () => {
  const apiResultLogService = new ApiResultLogService()
  apiResultLogService.initApiResultLogTasks()
}

export const initOfflineModelTasks = () => {
  sugoOfflineCalcModelsController.initOfflineModelTasks()
}

export const initMarketBrainStaffAndCustomStatistics = () => {
  const staffService = new StaffService()
  staffService.marketBrainSchedule()
}
