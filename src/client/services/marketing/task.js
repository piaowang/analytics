import Fetch from 'client/common/fetch-final'
import { exportFile } from '../../../common/sugo-utils'
import * as d3 from 'd3'
import { message } from 'antd'
import _ from 'lodash'
import moment from 'moment'

export function list(params = {}) {
  return Fetch.get('/app/marketing-task/list', params )
}

export function getOneDetails(id, params={}) {
  return Fetch.get(`/app/marketing-task/get-one-details/${id}`, params)
}

export function downLoadFile(data, record) {
  if (_.isEmpty(data)) return message.error('尚未产生数据')
  const send_type = _.get(record, 'send_type', null)
  
  const option = {
    1: {
      csvKeys: ['执行时间', 'distinct_id', '手机号', '文案内容'],
      csvRows: (data) => data.map( i => ([moment(i.created_at).format('YYYY-MM-DD HH:mm:ss'),i.distinct_id, i.mobile, i.content])),
      title: `短信-${record.name} ${moment(record.execute_time).format('YYYYMMDD HH:mm:ss')}.csv`
    },
    0: {
      csvKeys: ['执行时间', 'distinct_id', 'token', '标题', '文案内容', '落地页编码', '落地页中文名称'],
      csvRows: (data) => data.map( i => ([moment(i.created_at).format('YYYY-MM-DD HH:mm:ss'), i.distinct_id, i.token, i.title, i.content, i.page_code, i.page_name])),
      title: `push-${record.name} ${moment(record.execute_time).format('YYYYMMDD HH:mm:ss')}.csv`
    }
  }
  const csvKeys = option[send_type].csvKeys
  let csvRows = option[send_type].csvRows(data)
  let content = d3.csvFormatRows([csvKeys, ...csvRows])
  exportFile(option[send_type].title, content)
}

/**
 * @description 获取事件任务执行记录
 * @param {any} task_id
 * @param {any} [params={ pageSize, offset }]
 * @returns
 */
export function getExecutions(task_id, params = {}) {
  return Fetch.get(`/app/marketing-task/get-executions/${task_id}`, params)
}
