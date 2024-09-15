import React, { Component } from 'react'
import NavigationBox from './navigation-box'
import UploadedFileFetcher from '../../Fetcher/uploaded-files-fetcher'
import {UploadedFileType} from '../../../../common/constants'

import _ from 'lodash'
import './navigation-start.styl'
import PortalsHeader from './portals-header'

class NavigationStart extends Component {

  constructor(props) {
    super(props)
    this.state = {  }
  }

  render() {
    const baseUrl = '/_bc/sugo-analytics-static/assets/images/gzrailway/nav-start'
    const {
      loginBgImgUrl = `${baseUrl}/pho_bg.png`,
      logoImg,
      siteName,
      appBgImgIdle='',
      appBgImgHover='',
      appGroups,
      topBackgroundImage,
      rightFontColor, // 顶部字体颜色
      siteNameColor, // logo文字颜色
      appsFontColor // 应用字体颜色
    } = this.props
    const datasource = !_.isEmpty(appGroups) ? appGroups : []

    return (  
      <div
        id="navigation-start"
        className="gzrailway-navigation-start height-100 pd3b"
        style={{
          backgroundColor: '#374675',
          background: `transparent url(${loginBgImgUrl}) no-repeat`,
          backgroundSize: 'cover',
          height: '100%',
          width: '100%',
          overflowY: 'auto'
        }}
      >
        {
          topBackgroundImage ?
          <UploadedFileFetcher
            fileId={topBackgroundImage}
            type={UploadedFileType.Image}
            useOpenAPI
          >
            {({isFetching, data: [singleFile]}) => {
              if (isFetching || !singleFile) {
                return null
              }
              return (
                <PortalsHeader
                  {...{siteName,logoImg, rightFontColor, siteNameColor, appsFontColor, topBackgroundImage: `transparent url(${singleFile.path})`}}
                />
              )
            }}
          </UploadedFileFetcher>
          : <PortalsHeader {...{siteName,logoImg, rightFontColor, siteNameColor, appsFontColor}} />
        }
        {/* <PortalsHeader {...{siteName,logoImg, topBackgroundImage}} /> */}
        {
          datasource.map( (ds, dsX) => (
            <NavigationBox
              key={'navigaton-start-page-navbox-list' + dsX}
              title={ds.title}
              icon={ds.icon}
              appBgImgIdle={appBgImgIdle}
              appBgImgHover = {appBgImgHover}
              datasource={ds.children}
              appsFontColor={appsFontColor}
            />
          ))
        }
      </div>
    )
  }
}
 
export default NavigationStart
