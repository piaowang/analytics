import {sagaSyncModel} from '../Fetcher/saga-sync'
import {createPortal, deletePortal, getPortals, updatePortal} from './portals-query-helper'
import {createPortalPage, deletePortalPage, getPortalPages, updatePortalPage} from './portal-pages-query-helper'
import _ from 'lodash'

export const PORTALS_SAGA_MODEL_NS = 'portals-saga-model'
export const PORTAL_PAGES_SAGA_MODEL_NS = 'portal-pages-saga-model'

export const portalsSagaModelGenerator = (ns, extraArgs = {}) => props => {
  let id = _.get(props, 'params.id')
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'portals',
      getEffect: async query => {
        let res = id ? await getPortals({id}) : await getPortals({...extraArgs, ...(query || {})})
        return res
      },
      postEffect: async (model) => {
        return await createPortal(model)
      },
      putEffect: async model => {
        return await updatePortal(model)
      },
      deleteEffect: async model => {
        return await deletePortal(model)
      }
    }
  )
}

export const portalPagesSagaModelGenerator = (ns, portalId) => props => {
  let id = _.get(props, 'params.id')
  
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'portalPages',
      getEffect: async query => {
        if (!portalId || portalId === 'new') {
          return []
        }
        let res = id ? await getPortalPages(portalId, {id}) : await getPortalPages(portalId, query || {})
        return res
      },
      postEffect: async (model) => {
        return await createPortalPage(model)
      },
      putEffect: async model => {
        return await updatePortalPage(model)
      },
      deleteEffect: async model => {
        return await deletePortalPage(model)
      }
    }
  )
}
