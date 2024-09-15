import Resource from '../resource'

const $resource = {
  list: Resource.create('/app/project/access/query/dimension')
}

/**
 * @param success
 * @param result
 * @param message
 * @return {ResponseStruct}
 */
function struct (success, result, message) {
  return {
    success,
    result,
    message,
    type: 'json',
    code: 200
  }
}

export default {
  /**
   * 查询分析表的维度
   * @param {Array<String>} analysis_ids - 分析表id数组
   * @return {Promise.<ResponseStruct>}
   */
  async list(analysis_ids){
    const res = await $resource.list.get({}, { analysis_ids }).json()
    const ret = res.result
    return struct(ret.success, ret.model, ret.message)
  }
}
