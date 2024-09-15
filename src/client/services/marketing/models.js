/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-19 11:40:03
 * @description 智能营销前端service层
 */
import Fetch from 'client/common/fetch-final'

export function fetch(params = {}) {
  return Fetch.get('/app/marketing-models/list', params)
}

export function update(id, values) {
  return Fetch.put(`/app/marketing-models/update/${id}`, values)
}

export function create(values) {
  return Fetch.post('/app/marketing-models/create', values)
}

export function remove(id) {
  return Fetch.delete(`/app/marketing-models/delete/${id}`)
}

export function getModelsTreeLevels() {
  return Fetch.get('/app/marketing-models/tree-levels')
}
