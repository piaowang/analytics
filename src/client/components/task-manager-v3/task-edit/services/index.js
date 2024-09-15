import Fetch from 'client/common/fetch-final'
import { toQueryParams } from 'common/sugo-utils'
const moduleUrl = '/app/task-schedule-v3'

// fetchTaskNode 获取节点信息
export async function fetchTaskNode(params) {
  return await Fetch.get(`${moduleUrl}/dataSource?action=fetchDataSourceList`, {
    ...params
  })
}

// saveProject 保存项目
export async function saveProject(params) {
  return Fetch.post(`${moduleUrl}/manager?action=saveProject`, null, {
    body: JSON.stringify(params)
  })
}

// saveProject 保存清洗节点配置
export async function saveProjectCleanFile(params) {
  return Fetch.post(`${moduleUrl}/manager?action=saveProjectCleanFile`, null, {
    body: JSON.stringify(params)
  })
}

// saveProject 保存质量节点
export async function saveProjectQualityScript(params) {
  return Fetch.post(`${moduleUrl}/manager?action=saveProjectQualityScript`, null, {
    body: JSON.stringify(params)
  })
}

// saveProject 保存脚本内容
export async function downloadFlinkScript(params) {
  const { fileName, parentJobName, projectId } = params
  return Fetch.get(`${moduleUrl}/manager?action=downloadFlinkScript&projectId=${projectId}&fileName=${fileName}&parentJobName=${parentJobName}`)
}

// saveProject 获取项目信息
export async function fetchFlinkProject(taskId) {
  return Fetch.get(`${moduleUrl}/manager?action=fetchFlinkProject&projectId=${taskId}`)
}

// saveProject 保存数据节点
export async function saveSourceProperties(params) {
  return Fetch.post(`${moduleUrl}/manager?action=saveSourceProperties`, null, {
    body: JSON.stringify(params)
  })
}

// 根据 rpojectId 获取权限内所有数据源列表
export async function fetchAllDbListById(params) {
  return Fetch.get('/app/task-v3/getCheckDB', params)
}

// 获取任务公共属性
export async function fetchFlinkProjectProps({ taskId, jobName }) {
  return Fetch.get(`${moduleUrl}/manager?projectId=${taskId}&action=fetchFlinkProjectProps&parentJobName=${jobName}`)
}

// 设置任务公共属性
export async function setFlinkProjectProps(params) {
  return Fetch.post(`${moduleUrl}/manager?action=setFlinkProjectProps`, null, {
    body: JSON.stringify(params)
  })
}

// fetchSourceList 数据源列表
/**
 * *
 * @param {*} params
 */
export async function fetchAllSourceList(params) {
  const path = toQueryParams({
    action: 'fetchAllSourceList',
    ...params
  })
  return Fetch.get(`${moduleUrl}/dataSource?${path}`)
}

//
export async function fetchQualityScript(params) {
  const path = toQueryParams({
    action: 'fetchQualityScript',
    ...params
  })
  return Fetch.get(`${moduleUrl}/manager?${path}`)
}

//
export async function heartbeat(taskId) {
  return Fetch.get(`${moduleUrl}/manager?projectId=${taskId}&action=heartbeat`)
}
//
export async function fetchCleanProps(params) {
  const { parentJobName, jobName, projectId } = params
  return Fetch.get(`${moduleUrl}/manager?action=fetchCleanProps&parentJobName=${parentJobName}&jobName=${jobName}&projectId=${projectId}`)
}

export async function getScriptTemplate(params) {
  return Fetch.get(`${moduleUrl}/flink?action=fetchTemplateList`)
}

export function execution(model) {
  return Fetch.post(`${moduleUrl}/executor?action=executeFlow`, null, {
    body: JSON.stringify(model)
  })
}

//停止Flink任务的接口，修改为使用azkaban的停止实现，即与离线工作流的停止一致，可以考虑统一离线和实时的调用函数
export function cancelExecution(model) {
  return Fetch.post(`${moduleUrl}/executor?action=cancelFlow`, null, {
    body: JSON.stringify(model)
  })
}

export const queryTaskHistory = async query => {
  const path = toQueryParams({
    action: 'fetchFlinkAllHistory',
    ...query
  })
  return await Fetch.get(`/app/task-schedule-v3/history?${path}`)
}

export const queryLogs = async executionId => {
  return await Fetch.get(`/app/task-schedule-v3/executor?execid=${executionId}&action=fetchexecflow`)
}

/**
 * 获取所有数据源
 */
export const getDatasourceList = async () => {
  return await Fetch.get(`/app/new-task-schedule/dataBase?dataType=dataBaseInfo`)
}

/**
 * 根据数据源id获取数据表
 * @param {*} dsId 数据源Id
 */
export const getDataTableList = async dsId => {
  return await Fetch.post(`/app/task-schedule-v3/realtime?action=tables`, null, { body: JSON.stringify({ dbInfoId: dsId }) })
}

/**
 * 获取表的结构
 * @param {*} params 数据库id 结构
 */
export const getDataFieldsList = async params => {
  return await Fetch.post(`/app/task-schedule-v3/realtime?action=desc`, null, { body: JSON.stringify(params) })
}

/**
 * 保存实时采集节点信息
 * @param {*} params 数据库id 结构
 */
export const saveRealTimeCollect = async params => {
  return await Fetch.post(`/app/task-v3/save-real-time-collect`, params)
}

export const copyTaskNode = async body => {
  return await Fetch.post('/app/task-schedule-v3/manager?action=copyJob', null, body)
}
