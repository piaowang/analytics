/*
 * 路径分析
 */
import React from 'react'
import _ from 'lodash'
import InsightMain, {insghtLSId} from './insight-main'
import * as ls from '../../common/localstorage'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class InsightIndex extends React.Component {

  componentWillReceiveProps(nextProps) {

    if (this.onUnload) return

    let nid = nextProps.datasourceCurrent.id
    let tid = this.props.datasourceCurrent.id
    let {datasource, id} = this.props.location.query
    let pid = nextProps.location.query.id
    if (
      tid &&
      nid !== tid
    ) {
      if (ls.get(insghtLSId)) {
        ls.set(insghtLSId, '')
      } else {
        this.onUnload = true
        this.props.changeUrl({
          datasource: nid,
          id: pid === id ? '' : undefined
        }, 'replace')
      }
      return
    }
    // if (!datasource) {
    //   setTimeout(() => {
    //     this.props.changeUrl({
    //       datasource: nid
    //     }, 'replace')
    //   }, 10)
    // }

    //如果url指定了id或者datasource，并且跟顶部菜单不一致
    //主动切换顶部菜单

    let {usergroups, changeProject, projectList} = nextProps
    let nDatasourceId = _.get(
      _.find(usergroups, p => {
        return id
          ? p.id === id
          : p.druid_datasource_id === datasource
      }),
      'druid_datasource_id'
    )
    let proj = _.find(projectList, {
      datasource_id: nDatasourceId
    })
    if (
      proj && nid !== nDatasourceId
    ) {
      changeProject(proj.id)
      ls.set(insghtLSId, true)
      setTimeout(() => {
        this.props.changeUrl({
          datasource: nDatasourceId
        }, 'replace')
      }, 10)
    }
  }

  componentWillUnmount() {
    this.onUnload = false
  }

  render() {
    return (
      <InsightMain
        {...this.props}
      />
    )
  }
}
