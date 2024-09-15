import Fetch from '../../common/fetch-final'
import {toQueryParams} from '../../../common/sugo-utils'

export async function getPortals(query) {
  const res = await Fetch.get(`/api/portals?${toQueryParams(query)}`)
  console.log('getPortals -> res', res)
  if (!res || !res.success){
    return []
  }
  res.result.count = res.count
  return res && res.result
}

export async function createPortal(inst) {
  const res = await Fetch.post('/app/portals', inst)
  return res && res.result
}

export async function updatePortal(inst) {
  const res = await Fetch.put(`/app/portals/${inst.id}`, inst)
  return res && res.result
}

export async function deletePortal(inst) {
  const res = await Fetch.delete(`/app/portals/${inst.id}`)
  return res && res.result
}
