import {returnResult} from '../utils/helper'
import SupervisorService from '../services/druid-supervisor.service'
import CONFIG from '../config'

async function queryLeaderHost(ctx) {
  try {
    let res = await SupervisorService.getLeaderHost()
    returnResult(ctx, res)
    return 
  } catch (e) {
    console.error(e)
  }
  const supervisorHost = CONFIG.druid && CONFIG.druid.supervisorHost
  returnResult(ctx, (supervisorHost || '').replace(/^https?:\/\//i, ''))
}

export default {
  queryLeaderHost
}
