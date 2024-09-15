/**
 * Created by xj on 17-9-26.
 */
import Resource from '../resource'

const $resource = {
  getDimensionsByToken: Resource.create('/app/sdk-auto-track/get-dimensionsbytoken'),  //获取维度信息
  eventList: Resource.create('/app/sdk-auto-track/get/track-events'),                  //已部署获取事件列表
  eventScreenshot: Resource.create('/app/sdk-auto-track/get/event-screenshot'),  //获取事件截图
  delEvent: Resource.create('/app/sdk-auto-track/del-event'),                   //删除事件
  saveEvent: Resource.create('/app/sdk-auto-track/saveevent')                          //保存事件
}


/**
 * 将接口返回值处理成标准 ResponseStruct
 * @param success
 * @param result
 * @param message
 * @return {ResponseStruct}
 */
function struct(success, result, message) {
  return {
    success,
    result,
    message,
    code: 200,
    type: 'json'
  }
}

export default {
  /**
   * 获取维度
   * 
   * @param {any} query 
   * @returns 
   */
  async getDimensionsByToken(query) {
    const res = await $resource.getDimensionsByToken.get({}, query).json()
    return struct(true, res.result, null)
  },
  /**
   * 获取已部署事件列表
   * 
   * @param {any} query 
   * @returns 
   */
  async eventList(query) {
    const { result } = await $resource.eventList.get({}, query).json()
    return struct(true, result.data, null)
  },
  /**
   * 获取事件图片
   *
   * @param {any} data
   * @returns 
   */
  async eventScreenshot(data) {
    const res = await $resource.eventScreenshot.get({}, data).json()
    return res
  },
  /**
   * 保存事件
   * 
   * @param {any} data 
   * @returns 
   */
  async saveEvent(data) {
    const res = await $resource.saveEvent.post({}, data).json()
    return struct(true, res, null)
  },
  /**
   * 保存事件
   * 
   * @param {any} data 
   * @returns 
   */
  async delEvent(data) {
    const res = await $resource.delEvent.post({}, data).json()
    return struct(true, res, null)
  }
}
