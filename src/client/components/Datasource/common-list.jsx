import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from '../../actions'
import DimensionsTable from './dimensions-table'
import MeasuresTable from './measures-table'
import _ from 'lodash'

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class DimensionsIndex extends React.Component {

  componentWillMount() {
    this.props.getRoles()
    this.props.getUsers()
  }

  componentWillReceiveProps(nextProps) {
    let nid = nextProps.datasourceCurrent.id
    let tid = this.props.datasourceCurrent.id
    let {id} = this.props.location.query

    //id为空情况
    if (
      nid &&
      nid !== id &&
      !id
    ) {
      return this.props.changeUrl({
        id: nid
      }, 'replace')
    }

    //切换项目
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
            id: nid
          })
        }, 1)
      }
      return
    }

    //如果url指定了id或者datasource_id，并且跟顶部菜单不一致
    //主动切换顶部菜单
    let {changeProject, projectList, datasourceList} = nextProps
    let nDatasourceId = _.get(
      _.find(datasourceList, {id}),
      'id'
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
        id
      }, 'replace')
    }
  }

  render() {
    let isMeasure = this.props.location.pathname.includes('/console/measure')
    if (isMeasure) {
      return <MeasuresTable {...this.props} />
    }
    return <DimensionsTable {...this.props} />
  }
}
