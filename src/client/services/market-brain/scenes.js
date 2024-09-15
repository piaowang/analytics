/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-19 11:40:52
 * @description 智能营销-营销场景前端service层
 */

import Fetch from 'client/common/fetch-final'

export function fetch(params = {}) {
  return Fetch.get('/app/market-brain-scenes/list', params)
}

export function update(id, values) {
  return Fetch.put(`/app/market-brain-scenes/update/${id}`, values)
}

export function create(values) {
  return Fetch.post('/app/market-brain-scenes/create', values)
}

/**
 * @description删除场景记录
 * @export
 * @param {any} id 场景ID
 * @param {any} model_id 模型ID
 * @returns
 */
export function remove(id, model_id) {
  return Fetch.delete(`/app/market-brain-scenes/delete/${id}`, { model_id })
}
