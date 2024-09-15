/*
 * 留存分析入口
 */
import React from 'react'
import _ from 'lodash'
import {Auth} from '../../common/permission-control'
import {Link} from 'react-router'
import {checkPermission} from '../../common/permission-control'
import {Button} from 'antd'
import {browserHistory} from 'react-router'
import {immutateUpdate} from '../../../common/sugo-utils'
import PubSub from 'pubsub-js'
import UserGroupSelector from '../Common/usergroup-selector'
import RetentionDisplayPanels from './retention-panels'
import setStatePromise from '../../common/set-state-promise'
import {renderPageTitle} from '../Common/bread'
import RetentionConfig from './retention-config'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import Alert from '../Common/alert'

const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
const dsSettingPath = '/console/project/datasource-settings'
const canSetDataSource = checkPermission(dsSettingPath)

@withDbDims(props => {
  let dataSourceId = _.get(props.datasourceCurrent, 'id') || ''
  return {
    dataSourceId: dataSourceId,
    doFetch: !!dataSourceId
  }
})
@setStatePromise
export default class RetentionIndex extends React.Component {
  state = {
    allowFetch: false,
    retentionSelected: {},
    tempRetention: {} // 临时状态，不会触发网络调用，点击刷新按钮时写入到 retentionSelected
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    let {id: currRetId} = prevState.retentionSelected
    let {id: nextRetId} = this.state.retentionSelected
    if (!nextRetId && currRetId !== nextRetId) {
      // 切换漏斗，清空界面数据
      this.setState({
        allowFetch: false
      })
    }
  }
  
  componentWillUnmount() {
    PubSub.unsubscribe('retention')
  }
  
  getRetentionMetricalField = () => {
    let { datasourceCurrent, location, dataSourceCompareUserGroups } = this.props
    
    let dataSourceSelected = datasourceCurrent
    let {usergroup_id} = location.query
    let {
      commonMetric = []
    } = dataSourceSelected && dataSourceSelected.params || {}
    if (usergroup_id) {
      let ug = _.find(dataSourceCompareUserGroups, u => u.id === usergroup_id)
      if (ug) {
        commonMetric = [ug.params.groupby]
      }
    }
    return commonMetric[0]
  }
  
  doReload = async () => {
    // if (this.state.isFetchingState !== 0) {
    //   return
    // }
    let {datasourceCurrent} = this.props
    let {retentionSelected} = this.state
    // 项目的 用户事件维度 已经变更，需要修改留存的 用户事件维度 缓存
    let commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || []
    
    
    if (!_.isEqual(_.get(retentionSelected, 'params.retentionDimension'), commonDimensions)) {
      await this.onRetentionUpdate('params', params => {
        return {
          ...params,
          retentionMetricalField: params.retentionMetricalField || this.getRetentionMetricalField(),
          retentionDimension: commonDimensions,
          startStep: _.take(params.startStep, commonDimensions.length),
          endStep: _.take(params.endStep, commonDimensions.length)
        }
      }, 'no-reload')
    }
    
    // 刚进入界面禁止加载
    this.state.allowFetch = true
    
    await this.onRetentionUpdate('', _.identity, 'reload')
  }


  checkProjParams = (_datasource) => {
    let datasource = _datasource || this.props.datasourceCurrent
    if (!datasource) return
    let datasourceSettingsNeeded = []
    if (!_.get(datasource, 'params.commonMetric[0]')) {
      datasourceSettingsNeeded.push('用户ID')
    }
    if (!_.get(datasource, 'params.commonDimensions[0]')) {
      datasourceSettingsNeeded.push('用户行为维度')
    }
    return datasourceSettingsNeeded
  }

  renderSettingGuide = (datasourceSettingsNeeded) => {
    let {projectCurrent} = this.props
    return (
      <div
        className="relative"
        style={{height: 'calc(100vh - 200px)'}}
      >
        <div className="center-of-relative aligncenter">
          <p className="pd2">
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <div className="pd1 aligncenter">
            要使用这个项目的留存分析, 请到
            <Auth
              auth={dsSettingPath}
              alt={<b>场景数据设置</b>}
            >
              <Link
                className="pointer bold mg1x"
                to={`${dsSettingPath}?id=${projectCurrent.id}`}
              >场景数据设置</Link>
            </Auth>
            设定这个项目的
            {
              datasourceSettingsNeeded.map(d => {
                return <b className="color-red mg1x" key={d}>{d}</b>
              })
            }
          </div>
          <div className="pd2">
            {
              canSetDataSource
                ? <Link to={dsSettingPath}>
                  <Button type="primary" className="width140">马上设置</Button>
                </Link>
                : null
            }
          </div>
        </div>
      </div>
    )
  }

  renderUsergroupSwitcher() {
    let {
      datasourceCurrent,
      location,
      projectList
    } = this.props

    let globalUserGroupId = _.get(location, 'query.usergroup_id')// || ls.gets('current_common_usergroup_id')

    return (
      <div className="itblock">
        <span className="font13">目标用户：</span>
        <UserGroupSelector
          datasourceCurrent={datasourceCurrent}
          projectList={projectList}
          className="width120"
          value={globalUserGroupId}
          onChange={nextUserGroup => {
            // ls.set('current_common_usergroup_id', val)
            browserHistory.push(immutateUpdate(location, 'query.usergroup_id', () => nextUserGroup ? nextUserGroup.id : null))
          }}
        />
      </div>
    )
  }

  onRetentionUpdate = async (path, updater, mode = 'reload') => {
    // mode = no-reload 时更新临时状态，mode = 'reload' 时更新会导致网络调用的状态

    if (mode === 'no-reload') {
      await this.setStatePromise(prevState => {
        return {
          tempRetention: immutateUpdate(prevState.tempRetention, path || [], updater)
        }
      })
      return this.state.tempRetention
    }

    await this.setStatePromise(prevState => {
      let nextRet = immutateUpdate(prevState.tempRetention, path || [], updater)
      return {
        retentionSelected: nextRet,
        tempRetention: nextRet
      }
    })
    return this.state.tempRetention
  }

  renderNoPermissionHint() {
    let {
      dataSourceDimensions,
      datasourceCurrent,
      isFetchingDataSourceDimensions
    } = this.props
    
    if (!isFetchingDataSourceDimensions && dataSourceDimensions.length) {
      let dataSourceSelected = datasourceCurrent
      let commonMetric = _.get(dataSourceSelected, 'params.commonMetric') || []
      let retentionDimension = _.get(dataSourceSelected, 'params.commonDimensions') || []
    
      let dimNameSet = new Set(dataSourceDimensions.map(dbDim => dbDim.name))
      let dbDimAbsent = (retentionDimension || [])
        .concat(commonMetric)
        .filter(dimName => dimName && !dimNameSet.has(dimName))
    
      if (dbDimAbsent.length && dataSourceDimensions.length) {
        return (
          <Alert
            msg={(
              <span>
              查询所需维度在数据维度里未对你所在角色授权，请先到[数据管理-数据维度]列表，批量选择维度，授权角色，或联系管理员给予授权。
                <br/>
              没权限的的维度是：{dbDimAbsent.join('，')}
              </span>
            )}
          />
        )
      }
      return null
    }
  }
  
  render() {
    let { loadingProject, params, dataSourceDimensions, isFetchingDataSourceDimensions } = this.props
    let datasourceSettingsNeeded = this.checkProjParams()
    if (datasourceSettingsNeeded.length && !loadingProject) {
      return this.renderSettingGuide(datasourceSettingsNeeded)
    }
    let {
      projectCurrent,
      datasourceCurrent,
      location
    } = this.props

    let { retentionSelected, tempRetention, allowFetch } = this.state
  
    let retentionIdInUrl = _.get(params, 'retentionId', '')
    const noPermissionHint = this.renderNoPermissionHint()
    return (
      <div className="height-100 retention-main">
        {renderPageTitle('留存分析')}
        <div className="height-100 bg-grey-f7">
          <div className="nav-bar">
            {this.renderUsergroupSwitcher()}
          </div>
          
          <div className="scroll-content always-display-scrollbar relative">
            <div className="chart-container borderb dashed">
              <RetentionConfig
                {...{
                  retentionIdInUrl,
                  datasourceCurrent,
                  retentionSelected,
                  retentionUpdater: this.onRetentionUpdate,
                  dataSourceDimensions,
                  tempRetention,
                  projectCurrent,
                  doReload: this.doReload,
                  location
                }}
              />
              {noPermissionHint}
            </div>
  
            {noPermissionHint
              ? null
              : (
                <RetentionDisplayPanels
                  retentionUpdater={this.onRetentionUpdate}
                  {...{
                    retentionSelected, tempRetention, location, retentionIdInUrl, isFetchingDataSourceDimensions,
                    dataSourceDimensions, allowFetch
                  }}
                />
              )}
          </div>
        </div>
      </div>
    )
  }
}
