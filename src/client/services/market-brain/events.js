/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-19 11:40:03
 * @description 智能营销前端service层
 */
import Fetch from 'client/common/fetch-final'

export function fetch(params = {}) {
  return Fetch.get('/app/market-brain-events/list', params)
}

export function update(id, values) {
  return Fetch.put(`/app/market-brain-events/update/${id}`, values)
}

export function create(values) {
  return Fetch.post('/app/market-brain-events/create', values)
}

export function remove(id) {
  return Fetch.delete(`/app/market-brain-events/delete/${id}`)
}

export function findById(id) {
  return  Fetch.get(`/app/market-brain-events/get/${id}`)
}

