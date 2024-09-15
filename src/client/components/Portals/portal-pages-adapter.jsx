import React, {useEffect} from 'react'
import {useRuntimeSagaModels} from '../Common/runtime-saga-helper'
import {
  PORTAL_PAGES_SAGA_MODEL_NS,
  portalPagesSagaModelGenerator,
  PORTALS_SAGA_MODEL_NS,
  portalsSagaModelGenerator
} from './portals-saga-model'
import _ from 'lodash'
import {connect} from 'react-redux'
import Exception from '../Exception'
import {Skeleton} from 'antd'
import DefaultLogin from './templates/default-login'
import DefaultHome from './templates/default-home'
import {PORTAL_PAGES_TYPE_ENUM} from './constants'
import UnavailablePage from './templates/default-unavailable'
import {set as setSessionStorage} from '../../common/session-storage'

/**
 * 门户页面适配器，根据路由，来查询关联的门户页面，然后根据是否登录，渲染不同的页面
 * @param props
 * @returns {*}
 * @constructor
 */
function PortalPagesAdapter(props) {
  const {isFetchingPortals, portals = [], isFetchingPortalPages, portalPages = [], params} = props
  const portalBasePath = params && params.splat
  const currentPortal = _.first(portals)
  
  useRuntimeSagaModels(props, [
    portalsSagaModelGenerator(PORTALS_SAGA_MODEL_NS, {basePath: portalBasePath})
  ], [portalBasePath])
  
  useRuntimeSagaModels(props, [
    portalPagesSagaModelGenerator(PORTAL_PAGES_SAGA_MODEL_NS, currentPortal && currentPortal.id)
  ], [currentPortal && currentPortal.id])
  
  useEffect(() => {
    setSessionStorage('fromPortal', currentPortal?.basePath || '')
  }, [currentPortal?.basePath || ''])
  
  if (isFetchingPortals === false && _.isEmpty(portals)) {
    return (
      <Exception type="404" />
    )
  }
  
  if (isFetchingPortals || _.isNil(isFetchingPortals)) {
    return (
      <Skeleton className="mg3" />
    )
  }
  if (currentPortal?.status === 0) {
    return (
      <UnavailablePage />
    )
  }
  
  let currUser = _.get(window, 'sugo.user')
  if (_.isEmpty(currUser)) {
    return (
      <DefaultLogin config={_.find(portalPages, p => p.type === PORTAL_PAGES_TYPE_ENUM.login)} />
    )
  }
  return (
    <DefaultHome
      basePath={currentPortal?.basePath}
      config={_.find(portalPages, p => p.type === PORTAL_PAGES_TYPE_ENUM.home)}
    />
  )
}



export default _.flow([
  connect(props => {
    return {
      ...(props[PORTALS_SAGA_MODEL_NS] || {}),
      ...(props[PORTAL_PAGES_SAGA_MODEL_NS] || {})
    }
  })
])(PortalPagesAdapter)
