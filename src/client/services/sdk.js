import Fetch from 'client/common/fetch-final'

const profix = '/app/sdk'
/**
 * 根据版本获取埋点草稿列表
 * @param {*} token appid
 * @param {*} appVersion 版本号
 */
export async function getTrackEventsDraft(token, appVersion) {
  return await Fetch.get(`${profix}/get/track-events-draft`, { token, app_version: appVersion })
}

/**
 * 删除草稿事件
 * @param {*} token appid
 * @param {*} appVersion 版本号
 * @param {*} events 删除的事件
 */
export async function delTrackEventsDraft(token, appVersion, events) {
  return await Fetch.post(`${profix}/saveevent`, { token, app_version: appVersion, events })
}

/**
 * 保存草稿事件
 * @param {*} token appid
 * @param {*} appVersion 版本号
 * @param {*}   保存的事件对象
 */
export async function saveTrackEventsDraft(token, appVersion, events) {
  return await Fetch.post(`${profix}/saveevent`, { token, app_version: appVersion, events })
}

/**
 * 根据版本获取页面草稿列表
 * @param {*} token appid
 * @param {*} appVersion 版本号
 */
export async function getPageInfoDraft(token, appVersion) {
  return await Fetch.get(`${profix}/get/page-info-draft`, { token, app_version: appVersion })
}
/**
 * 删除草稿页面信息
 * @param {*} pageInfoId 页面信息唯一id
 */
export async function delPageInfoDraft(pageInfoId) {
  return await Fetch.post(`${profix}/delete-page-info-draft`, { pageInfoId })
}
/**
 * 保存草稿页面信息
 * @param {*} pageInfos 页面信息集合
 * @param {*} token appid
 * @param {*} app_version app版本号 
 */
export async function savePageInfoDraft(pageInfos, token, appVersion) {
  return await Fetch.post(`${profix}/save-page-info`, { pageInfos, token, app_version: appVersion })
}

/**
 * 获取埋点截图信息
 * @param {*} token appid
 * @param {*} appVersion app版本
 * @param {*} eventId 时间ID
 */
export async function getEventSreenshot(token, appVersion, screenshotId) {
  return await Fetch.get(`${profix}/get/event-screenshot-draft`, { screenshot_id: screenshotId, token, app_version: appVersion })
}

/**
 * 部署埋点信息
 * @param {*} token appid 
 * @param {*} appVersion app版本信息
 */
export async function deployEvent(token, appVersion) {
  return await Fetch.post(`${profix}/deployevent`, { token, app_version: appVersion })
}
/**
 * 二维码扫描页面 
 * @param {*} token appid 
 * @param {*} redirectPage 页面路径 
 * @param {*} secretKey 随机的唯一id
 */
export async function qrCode(token, redirectPage, secretKey) {
  return await Fetch.get(`${profix}/qrCode`, { token, redirectPage, secretKey })
}

/**
 * 创建版本信息 
 * @param {*} appid appid
 * @param {*} appVersion 新版本版本号
 * @param {*} status 状态
 */
export async function createAppVersion(appid, appVersion, status) {
  return await Fetch.get(`${profix}/app-version/create`, { appid, app_version: appVersion, status })
}
/**
 * 复制版本埋点
 * @param {*} token appid
 * @param {*} appVersion 目标版本号
 * @param {*} copyVersion 要复制的版本号
 */
export async function copyEvents(token, appVersion, copyVersion) {
  return await Fetch.post(`${profix}/copyevents`, { token, app_version: appVersion, copy_version: copyVersion })
}

/**
 * 获取所有版本信息
 * @param {*} token appid
 */
export async function getAppVersionList(token) {
  return await Fetch.get(`${profix}/get/app-versions`, { token })
}

/**
 * 根据token获取维度信息
 * @param {*} token appid
 */
export async function getDimensionList(token) {
  return await Fetch.get('/app/sdk/get-dimensionsbytoken', { token })
}

/**
 * 获取全埋点圈选的事件
 * @param {*} token appid
 */
export async function getAutoTrackEvents(token) {
  return await Fetch.get('/app/sdk-auto-track/get/track-events', { token })
}

/**
 * 保存全埋点圈选事件
 * @param {*} token appid
 */
export async function saveAutoTrackEvents(token, events) {
  return await Fetch.post('/app/sdk-auto-track/saveevent', { token, events })
}

/**
 * 删除全埋点圈选事件
 * @param {*} token appid
 */
export async function delAutoTrackEvent(token, id, screenshotId, isMobile) {
  return await Fetch.post('/app/sdk-auto-track/del-event', { token, id, screenshot_id: screenshotId, isMobile })
}

/**
 * 删除appversion版本
 * @param {*} token appid
 */
export async function deleteAppVersion(token, appVersion) {
  return await Fetch.post('/app/sdk/app-version/delete', { token, appVersion })
}
