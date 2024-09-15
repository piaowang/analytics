//左侧看板列表
import React from 'react'
import DashboardSingle from './single'
import DashboardOverview from './overview-dashboard'
export default class DashboardIndex extends React.Component {

  state = {
    setCategoryVisable: false,
    selectCategory: [],
    selectDashboard: '',
    isClickCategory: false,
    isDefault: false
  }

  componentDidUpdate(prevProps) {
    const { dashboardsCategory = [] } = this.props
    const { isClickCategory, isDefault } = this.state
    if ((!isClickCategory && dashboardsCategory.length !== prevProps.dashboardsCategory.length) || !isDefault) {
      const categoryIds = dashboardsCategory.filter(p => p.dashboards.length <= sugo.defaultOpenDashboardCategoryLength).map(p => p.id)
      this.setState({ selectCategory: [...categoryIds, 'noCategory'], isDefault: true })
    }
  }

  changeState = (newState) => {
    this.setState(newState)
  }

  render() {
    const { dashboardId } = this.props.params
    if (dashboardId) { 
      return <DashboardSingle changeState={this.changeState} {...this.state} {...this.props} />
    } else {
      return <DashboardOverview changeState={this.changeState} {...this.state} {...this.props} />
    }
  }
}
