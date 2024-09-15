/*
 * 流量分析入口
 */
import React from 'react'
import _ from 'lodash'
import TrafficMain from './main'
import {Auth} from '../../common/permission-control'
import {Link} from 'react-router'
import {withApps} from '../Fetcher/app-fetcher'
import {AccessDataOriginalType} from '../../../common/constants'

const sdkAccessTypeSet = new Set([AccessDataOriginalType.Android, AccessDataOriginalType.Ios, AccessDataOriginalType.Web])

const dsSettingPath = '/console/project/datasource-settings'

@withApps(props => {
  let {projectCurrent} = props
  let currProjId = projectCurrent && projectCurrent.id || ''
  return {
    projectId: currProjId,
    doFetch: !!currProjId
  }
})
class TAIndex extends React.Component {

  renderRequire() {
    let {projectCurrent} = this.props
    return (
      <div className="pd3 aligncenter">
        该项目还没有配置
        <b className="color-red">用户ID</b>,
        请到
        <Auth
          className="pointer bold mg1x"
          auth={dsSettingPath}
          alt={<b>场景数据设置</b>}
        >
          <Link
            className="pointer bold mg1x"
            to={`${dsSettingPath}?id=${projectCurrent.id}`}
          >场景数据设置</Link>
        </Auth>
        设定<b className="color-red mg1x">用户ID</b>
        为 用户唯一ID 或 设备ID
        <p>
          <b className="color-red mg1x" >注意：目前流量分析只支持 SDK 项目</b>
        </p>
      </div>
    )
  }

  render() {
    let {
      datasourceCurrent,
      apps,
      isFetchingApps
    } = this.props
    if (!datasourceCurrent || !datasourceCurrent.id || isFetchingApps) {
      return (
        <div className="pd3 aligncenter font20 color-grey">
          加载中...
        </div>
      )
    }
    let isSdkProject = _.some(apps, app => sdkAccessTypeSet.has(app.access_type))
      || _.get(datasourceCurrent, 'params.isSDKProject')
    if (!isSdkProject || !_.get(datasourceCurrent, 'params.commonMetric[0]')) {
      return this.renderRequire()
    }
    return (
      <TrafficMain
        {...this.props}
      />
    )
  }
}

export default TAIndex
