import Fetch from '../../../../common/fetch-final'
import {immutateUpdate} from '../../../../../common/sugo-utils'

const requestBase = '/app'


//template
export async function getAllApptag(query) {
  const res = await Fetch.get(`${requestBase}/portal-tags`)
  return res && res.result
}


export async function getAllApplication(query) {
  const res = await Fetch.get(`/api/portal-apps`)
  return res && res.result
}

export async function creatApplication(query) {
  const res = await Fetch.post(`${requestBase}/portal-apps`, query)
  return res && res.result
}

export async function deleteApplication(query) {
  const res = await Fetch.delete(`${requestBase}/portal-apps/${query.id}`)
  return res && res.result
}

export async function updateApplication(query) {
  const res = await Fetch.put(`${requestBase}/portal-apps/${query.id}`,query)
  return res
}
export async function createApptag(obj) {
  obj = immutateUpdate(obj, 'newTag.parentId', pId => pId || null)
  return await Fetch.post(`${requestBase}/portal-tags`, obj)
}

export async function editTag(query) {
  return await Fetch.put(`${requestBase}/portal-tags/${query.id}`, query)
}

export async function deleteTag(tagId) {
  return await Fetch.delete(`${requestBase}/portal-tags/${tagId}`)
}


export async function getAllAppTagrelation(query) {
  const res = await Fetch.get(`${requestBase}/portal-app-tag-relations`)
  return res && res.result
}

export async function creatAppTagrelation(query) {
  const res = await Fetch.post(`${requestBase}/portal-app-tag-relations`, query)
  return res && res.result
}

export async function deleteAppTagrelation(query) {
  const res = await Fetch.delete(`${requestBase}/portal-app-tag-relations/${query.id}`)
  return res && res.result
}

export async function updateAppTagrelation(query) {
  const res = await Fetch.put(`${requestBase}/portal-app-tag-relations/${query.id}`,query)
  return res
}

export async function batchAddTag(data) {
  const res = await Fetch.post(`${requestBase}/portal-app-tag-relations/batch-add-tag`, data)
  return res && res.result
}

export async function changeTagAppOrder(data) {
  const res = await Fetch.post(`${requestBase}/portal-app-tag-relations/change-order`, data)
  return res && res.result
}

export async function getTagOrder() {
  const res = await Fetch.get(`${requestBase}/portal-tag-orders`)
  return res?.result
}

export async function createTagOrder(data) {
  const res = await Fetch.post(`${requestBase}/portal-tag-orders`, data)
  return res?.result
}

export async function updateTagOrder(data) {
  const res = await Fetch.put(`${requestBase}/portal-tag-orders/${data.id}`, data)
  return res?.result
}

export async function deleteTagOrder(data) {
  const res = await Fetch.delete(`${requestBase}/portal-tag-orders/${data.id}`)
  return res?.result
}
