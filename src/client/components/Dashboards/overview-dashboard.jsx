
import React from 'react'
import DashboardList from './dashboard-list'
import OverviewList from '../Overview'
import NewDashboards from '../Overview/new-dashboards'

export default class OverviewDashboard extends React.PureComponent {
  render() {
    let { 
      dashboards, 
      datasourceCurrent, 
      dashboardsCategory, 
      getDashboardsCategory, 
      params = {}, 
      projectCurrent,
      setCategoryVisable,
      selectCategory,
      selectDashboard,
      changeState,
      isClickCategory,
      projectList
    } = this.props
    return (
      <div className={'dashboard-wrap height-100 mode-show'} > 
        <div className="scroll-content always-display-scrollbar">
          <div
            id='dashboard-overview-bg'
            className="relative form-wrapper"
            style={{minHeight: '100%'}}
          >
            <DashboardList
              setCategoryVisable={setCategoryVisable}
              selectCategory={selectCategory}
              selectDashboard={selectDashboard}
              changeState={changeState}
              isClickCategory={isClickCategory}
              dashboards={dashboards}
              dashboardsCategory={dashboardsCategory}
              datasourceCurrent={datasourceCurrent}
              projectCurrent={projectCurrent}
              currentDashboard={{id: 'overview'}}
              reoloadDashBoardCategory={getDashboardsCategory}
              dashboardId={params.dashboardId}
              projectList={projectList}
            />
            {
              !selectDashboard || selectDashboard === 'creatDashboard' 
                ? <div className="slices-body">
                  <NewDashboards/>
                </div>
                : null
            }
            {
              selectDashboard === 'overview' 
                ? <div className="slices-body">
                  <OverviewList {...this.props} />
                </div>
                : null
            }
          </div>
        </div>
      </div>
    )
  }
}
