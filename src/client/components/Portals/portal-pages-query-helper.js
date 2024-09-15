import Fetch from '../../common/fetch-final'
import {toQueryParams} from '../../../common/sugo-utils'

export async function getPortalPages(portalId, query) {
  const res = await Fetch.get(`/api/portals/${portalId}/pages/?${toQueryParams(query)}`)
  if (!res || !res.success) {
    return []
  }
  res.result.count = res.count
  return res && res.result
}

export async function createPortalPage(inst) {
  const res = await Fetch.post(`/app/portals/${inst.portalId}/pages`, inst)
  return res && res.result
}

export async function updatePortalPage(inst) {
  const res = await Fetch.put(`/app/portals/${inst.portalId}/pages/${inst.id}`, inst)
  return res && res.result
}

export async function deletePortalPage(inst) {
  const res = await Fetch.delete(`/app/portals/${inst.portalId}/pages/${inst.id}`)
  return res && res.result
}
