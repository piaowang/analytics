/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-19 11:40:52
 * @description 生命周期前端service
 */

import Fetch from 'client/common/fetch-final'
import {toQueryParams} from 'common/sugo-utils'

export function findOne(project_id) {
  return Fetch.get(`/app/life-cycle/get/${project_id}`)
}

export function create(values) {
  return Fetch.post('/app/life-cycle/create', values)
}

export function update(payload) {
  const { lifeCycle, lifeCycleId } = payload
  return Fetch.put(`/app/life-cycle/update/${lifeCycleId}`, lifeCycle)
}

export function getDimensions(parentId, data) {
  return Fetch.get('/app/dimension/get' + '/' + parentId + '?' + toQueryParams(data))
}

export async function getMeasures(id, data) {
  return await Fetch.get('/app/measure/get' + '/' + id + '?' + toQueryParams(data))
}

export async function findAllUg(payload) {
  return await Fetch.get('/app/life-cycle/get-allug', payload )
}

export async function findPreUg(payload = {}) {
  return await Fetch.get('/app/life-cycle/get-preUg',  payload)
}

export async function findMarketing(payload = {}) {
  return await Fetch.get('/app/marketing-models/list-byLcId', payload)
}

export async function createModel(payload = {}) {
  return await Fetch.get('/app/life-cycle/create-model', payload)
}

export async function contractSegmentWithScene(payload = {}) {
  return await Fetch.post('/app/life-cycle/contract-segment-scene', payload)
}

export async function getLiveScreenThemeList(payload={}){
  return await Fetch.get('/app/live-screen-projection/theme/list', payload)
}
export async function deleteLiveScreenTheme(id){
  return await Fetch.delete('/app/live-screen-projection/theme/'+id)
}

export async function saveLiveScreenTheme(payload = {}){
  return await Fetch.post('/app/live-screen-projection/theme/create',payload)
}

export async function updateLiveScreenTheme(payload = {}){
  return await Fetch.post('/app/live-screen-projection/theme/update',payload)
}

export async function selectLiveScreenThemeById(id){
  return await Fetch.get('/app/live-screen-projection/theme/'+id)
}
