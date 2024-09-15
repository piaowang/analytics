import React from 'react'
import {browserHistory} from 'react-router'
import DashboardForm from './dashboard-form'
import _ from 'lodash'
import * as ls from '../../common/localstorage'
import {listPath, DSBChangeProjLSId} from './dashboard-common'
import { isMobile, RESPONSIVE_PAGE_MAX_WIDTH } from 'common';
export default class DashboardSingle extends React.Component {
  
  componentDidMount() {
    this.windowSizeChangeListener = _.debounce(() => {
      if (isMobile() && (window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH)) {
        window.location.reload()
      }
    }, 500)
    window.addEventListener('resize', this.windowSizeChangeListener)
  }
  
  UNSAFE_componentWillReceiveProps(nextProps) {
    let nid = nextProps.datasourceCurrent.id
    let tid = this.props.datasourceCurrent.id
    let {dashboards, changeProject, projectList} = this.props
    if (
      tid &&
      nid !== tid
    ) {
      if (ls.get(DSBChangeProjLSId)) {
        ls.set(DSBChangeProjLSId, '')
      }
      else {
        let next = _.find(dashboards, ds => {
          return ds.datasource_id === nid
        })
        let url = next
          ? `${listPath}/${next.id}`
          : listPath
        browserHistory.push(url)
      }
      return
    }
    // 后退 切换看板时自动切换项目
    let {dashboardId} = nextProps.params
    const dashboard = _.find(dashboards, {id: dashboardId})
    let nDatasourceId = _.get(dashboard, 'datasource_id')
    let proj = _.find(projectList, { datasource_id: nDatasourceId })

    if (proj && nid !== nDatasourceId && !_.get(dashboard, 'params.allowAddSlicesCrossProjects')) {
      changeProject(proj.id)
      return ls.set(DSBChangeProjLSId, true)
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.windowSizeChangeListener)
  }

  render() {
    return <DashboardForm {...this.props} />
  }

}
