/*
 * 路径分析
 */
import React from 'react'
import _ from 'lodash'
import PAForm from './pa-form'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import {Auth} from '../../common/permission-control'
import Link from '../Common/link-nojam'
import {Button} from 'antd'

const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
const dsSettingPath = '/console/project/datasource-settings'

const mapStateToProps = state => state.common
const mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class PAIndex extends React.Component {

  componentWillMount() {
    this.props.getUsergroups()
  }

  componentWillReceiveProps(nextProps) {

    let nid = nextProps.datasourceCurrent.id
    let tid = this.props.datasourceCurrent.id
    let {datasource_id, id} = this.props.location.query
    if (datasource_id === nid) {
      this.onChange = false
    }

    if (
      tid &&
      nid !== tid
    ) {
      if (this.shouldNotChangeProject) {
        this.shouldNotChangeProject = false
      }
      else {
        this.onChange = true
        setTimeout(() => {
          this.props.changeUrl({
            datasource_id: nid,
            usergroup_id: 'all',
            id: ''
          })
        }, 1)
      }
      return
    } else if (!datasource_id && nid) {
      return this.props.changeUrl({
        datasource_id: nid,
        id: id || ''
      }, 'replace')
    } else if (typeof id === 'undefined') {
      return this.props.changeUrl({
        id: ''
      }, 'replace')
    }

    //如果url指定了id或者datasource_id，并且跟顶部菜单不一致
    //主动切换顶部菜单

    let {pathAnalysis, changeProject, projectList} = nextProps
    let nDatasourceId = _.get(
      _.find(pathAnalysis, p => {
        return id
          ? p.id === id
          : p.datasource_id === datasource_id
      }),
      'datasource_id'
    )
    let proj = _.find(projectList, {
      datasource_id: nDatasourceId
    })
    if (
      proj && nid !== nDatasourceId &&
      !this.onChange
    ) {
      this.shouldNotChangeProject = true
      changeProject(proj.id)
      this.props.changeUrl({
        datasource_id: nDatasourceId,
        id: ''
      }, 'replace')
    }
  }

  checkProjParams = (_datasource) => {
    let datasource = _datasource || this.props.datasourceCurrent
    if (!datasource || !datasource.id) return []
    let datasourceSettingsNeeded = []
    if (!_.get(datasource, 'params.titleDimension')) {
      datasourceSettingsNeeded.push('路径分析维度')
    }
    if (!_.get(datasource, 'params.commonSession')) {
      datasourceSettingsNeeded.push('SessionID')
    }
    if (!_.get(datasource, 'params.commonMetric')) {
      datasourceSettingsNeeded.push('用户ID')
    }
    if (!_.get(datasource, 'params.commonDimensions')) {
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
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <div className="pd2t">
            要使用这个项目的路径分析, 请到
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
                return <b className="color-red mg1x" key={d}>[{d}]</b>
              })
            }
          </div>
          <div className="pd2t">
            <Auth
              auth={dsSettingPath}
              alt={<b>场景数据设置</b>}
            >
              <Link to={`${dsSettingPath}?id=${projectCurrent.id}`}>
                <Button type="primary">马上设置</Button>
              </Link>
            </Auth>
          </div>
        </div>
      </div>
    )
  }

  render() {
    let {loadingProject} = this.props
    if (!loadingProject) {
      let datasourceSettingsNeeded = this.checkProjParams()
      if (
        datasourceSettingsNeeded.length
      ) {
        return this.renderSettingGuide(datasourceSettingsNeeded)
      }
    }
    return (
      <PAForm
        {...this.props}
      />
    )
  }
}
