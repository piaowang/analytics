/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-19 11:40:03
 * @description 智能营销前端service层
 */
import Fetch from 'client/common/fetch-final'

export function fetch(params = {}) {
  return Fetch.get('/app/marketing-events/list', params)
}

export function update(id, values) {
  return Fetch.put(`/app/marketing-events/update/${id}`, values)
}

export function create(values) {
  return Fetch.post('/app/marketing-events/create', values)
}

export function remove(id) {
  return Fetch.delete(`/app/marketing-events/delete/${id}`)
}

export function findById(id) {
  return  Fetch.get(`/app/marketing-events/get/${id}`)
}

export function getResult(id) {
  return Fetch.get(`/app/marketing-events/get-result/${id}`)
}

export function getResultByDate(id, timeRange) {
  return Fetch.post('/app/marketing-events/get-resultbydate', { id, timeRange })
}

export function checkIsLifeCycleScene(payload) {
  return Fetch.get('/app/marketing-events/check-islcscene', payload)
}
