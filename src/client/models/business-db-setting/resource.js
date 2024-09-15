/**
 * Created by asd on 17-7-12.
 */

import Resource from '../resource'

const $resource = {
  list: Resource.create('/app/businessdbsetting/list'),
  create: Resource.create('/app/businessdbsetting/create'),
  update: Resource.create('/app/businessdbsetting/update'),
  delete: Resource.create('/app/businessdbsetting/delete'),
  test: Resource.create('/app/businessdbsetting/test'),
  updateState: Resource.create('/app/businessdbsetting/updatestate')
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
   * 创建业务数据库设置
   * @param {Object} data
   * @return {Promise.<ResponseStruct>}
   */
  async create(data, isUindex) {
    return await $resource.create.post({}, { businessdbsetting: data, isUindex }).json()
  },

  /**
   * 更新设置
   * @param data
   * @return {Promise<ResponseStruct>}
   */
  async update(data) {
    return await $resource.update.post({}, data).json()
  },

  /**
   * 获取业务数据库设置列表
   * @return {Promise.<ResponseStruct>}
   */
  async list(company_id) {
    return await $resource.list.post({}, { company_id }).json()
  },


  /**
   * 删除设置
   * @param id
   * @return {Promise<ResponseStruct>}
   */
  async delete(id) {
    return await $resource.delete.post({}, { id }).json()
  },

  /**
   * 测试连接
   * @param id
   * @return {Promise<ResponseStruct>}
   */
  async test(model) {
    return await $resource.test.post({}, model).json()
  },

  /**
   * 修改状态
   * 
   * @param {any} id 
   * @param {any} state 
   * @param {any} dataSourceId 
   * @returns 
   */
  async updateState(id, state, dataSourceId) {
    return await $resource.updateState.post({}, { id, state, dataSourceId }).json()
  }
}


