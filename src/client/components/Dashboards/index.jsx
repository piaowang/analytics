import React from 'react'
import _ from 'lodash'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from 'client/actions/dashboards' 


class Dashboards extends React.Component {

  componentWillMount() {
    this.props.getDashboards()
    this.props.getDashboardsCategory()
    this.props.getSlices()
  }

  render() {
    let { props } = this
    const props0 = _.omit(props, 'children')
    const childrenWithProps = React.Children.map(props.children,
      child => React.cloneElement(child, {...props0})
    )
    
    return (
      //className="height-100 bg-grey-f7" 背景颜色对发布看板输入密码页面会影响
      <div className="height-100 asdasd">{childrenWithProps}</div>
    )
  }
}

let Wrapped = (()=>{
  function ExcludeStoppedProject(props) {
    let {datasourceList: datasources, dashboards, dashboardsCategory} = props
    // 数据源不激活则隐藏看板内的单图
    let activeDataSourcesIdSet = new Set(datasources.map(ds => ds.id))
    let sliceFilter = sl => activeDataSourcesIdSet.has(sl.druid_datasource_id)
    let validDashboards = dashboards
      .map(dsb => ({...dsb, slices: dsb.slices.filter(sliceFilter)}))
      .filter(dsb => {
        return activeDataSourcesIdSet.has(dsb.datasource_id)
          || _.get(dsb.params, 'allowAddSlicesCrossProjects') /*静态跨项目看板*/
      })

    //根据过滤好的Datasources来过滤Dashboard里头的slices
    let slices = props.slices.filter(sliceFilter)
    let sliceTree = slices.reduce((prev, s) => {
      prev[s.id] = s
      return prev
    }, {})

    const otherProps = {
      ...props,
      datasources,
      slices,
      sliceTree,
      dashboards: validDashboards,
      dashboardsCategory
    }

    return (
      <Dashboards {...otherProps} />
    )
  }

  const mapStateToProps = state => state.common
  const mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)
  return connect(mapStateToProps, mapDispatchToProps)(ExcludeStoppedProject)
})()

export default Wrapped
