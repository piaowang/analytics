import Fetch from 'client/common/fetch-final'
import { exportFile } from '../../../common/sugo-utils'
import * as d3 from 'd3'
import { message } from 'antd'
import _ from 'lodash'
import moment from 'moment'

export function list(params = {}) {
  return Fetch.get('/app/market-brain-task/list', params )
}

export function getOneDetails(id, params={}) {
  return Fetch.get(`/app/market-brain-task/get-one-details/${id}`, params)
}

export function downLoadFile(data, record) {
  if (_.isEmpty(data)) return message.error('尚未产生数据')
  //record是task记录
  const send_channel_map = ['自动', '手工']
  let send_type_map = ['短信', '手机', '微信']
  const csvKeys = ['活动名称', '执行时间', '触达方式', '发送渠道', 'distinct_id', '会员姓名', '会员手机号', '活动文案', '客户经理ID', '客户经理姓名']
  let csvRows = (data) => data.map( i => ([record.name, i.send_time ? moment(i.send_time).format('YYYY-MM-DD HH:mm:ss') : '', send_channel_map[record.touch_up_way], send_type_map[i.send_type], i.distinct_id, i.user_name, i.mobile, record.content, i.account_manager_id, i.account_manager_name]))

  csvRows = csvRows(data)
  let content = d3.csvFormatRows([csvKeys, ...csvRows])
  exportFile('触达任务.csv', content)
}

/**
 * @description 获取事件任务执行记录
 * @param {any} task_id
 * @param {any} [params={ pageSize, offset }]
 * @returns
 */
export function getExecutions(task_id, params = {}) {
  return Fetch.get(`/app/market-brain-task/get-executions/${task_id}`, params)
}
