import React from 'react'
import Login from '../../pages/login'
import {UploadedFileType} from '../../../../common/constants'
import UploadedFileFetcher from '../../Fetcher/uploaded-files-fetcher'
import _ from 'lodash'
import * as d3 from 'd3'
import {Helmet} from 'react-helmet'

export default function DefaultLogin({config, ...rest}) {

  //清楚门户登录记录
  sessionStorage.portalId = null
  
  let {backgroundImageId: loginBgImgId, params} = config || {}
  let finalConfig = _.defaults({}, params || {}, window.sugo)
  let {primaryColor = '#6969d7'} = finalConfig
  
  // language=CSS
  const runtimeCss = primaryColor && `
    .btn-login {
      background-color: ${primaryColor};
      border-color: ${primaryColor};
    }
    .btn-login:hover{
      background-color: ${d3.color(primaryColor).brighter(0.97).hex()};
      border-color: ${d3.color(primaryColor).brighter(0.97).hex()};
    }
  ` || ''
  if (loginBgImgId) {
    return (
      <UploadedFileFetcher
        fileId={loginBgImgId}
        type={UploadedFileType.Image}
        useOpenAPI
      >
        {({isFetching, data: [singleFile]}) => {
          if (isFetching || !singleFile) {
            return null
          }
          return (
            <React.Fragment>
              <Helmet>
                <link rel="stylesheet" href={`${window.sugo.cdn}/css/login.styles.css?${window.sugo.version}`} />
              </Helmet>
              <style>{runtimeCss}</style>
              <Login
                {...rest}
                {...finalConfig}
                loginBgImgUrl={singleFile.path}
                loginLogoName={finalConfig.logoImg || finalConfig.loginLogoName}
                redirect={`${window.location.pathname}?t=${Date.now()}`}
              />
            </React.Fragment>
          )
        }}
      </UploadedFileFetcher>
    )
  }
  return (
    <React.Fragment>
      <Helmet>
        <link rel="stylesheet" href={`${window.sugo.cdn}/css/login.styles.css?${window.sugo.version}`} />
      </Helmet>
      <style>{runtimeCss}</style>
      <Login
        {...rest}
        {...finalConfig}
        loginLogoName={finalConfig.logoImg || finalConfig.loginLogoName}
        redirect={`${window.location.pathname}?t=${Date.now()}`}
      />
    </React.Fragment>
  )
}
