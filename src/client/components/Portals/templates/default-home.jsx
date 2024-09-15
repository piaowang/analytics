import React, { useMemo } from 'react'
import _ from 'lodash'
import UploadedFileFetcher from '../../Fetcher/uploaded-files-fetcher'
import { UploadedFileType } from '../../../../common/constants'
import NavigationStart from '../../Home/navigation-start'
import { useRuntimeSagaModels } from '../../Common/runtime-saga-helper'
import {
  applicationSagaSyncModelGen,
  PORTAL_APPS_SAGA_MODEL_NS
} from '../application-management/store'
import { connect } from 'react-redux'

function convertToPortalFormat(appGroups, appBgImgIdle, appsDict) {
  const baseUrl =
    '/_bc/sugo-analytics-static/assets/images/gzrailway/nav-start'
  const { appsPermissions = ['all'] } = window.sugo.user
  return _.map(appGroups, (g) => {
    // 过滤权限
    if(appsPermissions[0] !=='all'){
      g.apps = g.apps.filter((v) => {
        return appsPermissions.indexOf(v.id) >= 0
      })
    }
    return {
      title: g.name || '已发布应用',
      children: _.map(g.apps, (appRef) => {
        let app = appsDict?.[appRef.id]
        return {
          path: app?.url || '#',
          title: appRef.title || app?.name || '(未命名应用)',
          iconPng: appRef.logo || `${baseUrl}/icon_yunyingjuece.png`,
          iconHoverPng: appRef.hoverLogo, // 新增属性
          openWay: app?.openWay, // 新增属性
          bgPng: appBgImgIdle || `${baseUrl}/pho_yunyingjuece.png`,
          type: 'application',
          icon: 'sugo-projects',
          iconColor: {
            background: 'linear-gradient(to bottom, #9F9BF7, #7772FF)',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontSize: '30px'
          },
          titleStyle: {
            fontWeight: 800,
            fontSize: '20px'
          }
        }
      })
    }
  })
}

function DefaultHome(props) {
  const { config, applications, isMin, ...rest } = props
  if (!config) return null
  //门户地址登录记录门户信息
  if (!isMin) {
    localStorage.portalId = config.portalId
    localStorage.portalbasePath = props.basePath
  }
  let { backgroundImageId: loginBgImgId, params } = config || {}
  let finalConfig = _.defaults({}, params || {}, window.sugo)

  useRuntimeSagaModels(props, [
    applicationSagaSyncModelGen(PORTAL_APPS_SAGA_MODEL_NS)
  ])

  const appsDict = useMemo(() => _.keyBy(applications, 'id'), [
    _.size(applications)
  ])

  let { appBgImgIdle, appBgImgHover } = finalConfig
  let appGroups = convertToPortalFormat(
    finalConfig.appGroups,
    appBgImgIdle,
    appsDict
  )
  console.log('DefaultHome -> appGroups', appGroups)
  // language=CSS
  const runtimeCss =
    (appBgImgHover &&
      `
    #navigation-start .item-box:hover {
      background: url(${appBgImgHover}) 0% 0% / 290px 164px no-repeat transparent !important;
    }
  `) ||
    ''
  if (loginBgImgId) {
    return (
      <React.Fragment>
        <style>{runtimeCss}</style>

        <UploadedFileFetcher
          fileId={loginBgImgId}
          type={UploadedFileType.Image}
          useOpenAPI
        >
          {({ isFetching, data: [singleFile] }) => {
            if (isFetching || !singleFile) {
              return null
            }
            return (
              <NavigationStart
                {...rest}
                {...finalConfig}
                appGroups={appGroups}
                loginBgImgUrl={singleFile.path}
              />
            )
          }}
        </UploadedFileFetcher>
      </React.Fragment>
    )
  }

  return (
    <React.Fragment>
      <style>{runtimeCss}</style>
      <NavigationStart {...rest} {...finalConfig} appGroups={appGroups} />
    </React.Fragment>
  )
}

export default _.flow([
  connect((state) => {
    return {
      applications: state?.[PORTAL_APPS_SAGA_MODEL_NS]?.applications || []
    }
  })
])(DefaultHome)
