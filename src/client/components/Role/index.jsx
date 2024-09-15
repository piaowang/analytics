/*
 * 用户扩群
 */
import React from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import _ from 'lodash'
import './role.styl'

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class RoleIndex extends React.Component {

  componentWillMount() {
    this.getData()
  }

  getData = async () => {
    let {getDatasources, getRoles, getPermissions, customUpdate} = this.props
    let ds = await getDatasources({
      withCount: 1,
      includeChild: 1,
      noAuth: 1
    }, false, false, false)
    let roles
    //无需审核的时候获取角色列表数据
    if(!window.sugo.enableDataChecking){
      roles = await getRoles(false)
    }
    let perms = await getPermissions(false)
    let update = {
      roles:  roles ? roles.result : [],
      permissions: perms ? perms.result : [],
      datasources: ds
        ? ds.result || ds
        : []
    }
    customUpdate(update)
  }

  refreshDatasources = async () => {
    let {getDatasources} = this.props
    await getDatasources({
      withCount: 1,
      includeChild: 1,
      noAuth: 1
    }, false, false, true, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache,no-store',
        'Pragma': 'no-cache',
        'Expires': 0
      }
    })
  }

  render() {
    const props = {
      ..._.omit(this.props, 'children'),
      refreshDatasources: this.refreshDatasources
    }
    const childrenWithProps = React.Children.map(
      this.props.children,
      child => React.cloneElement(child, {...props})
    )

    return (
      <div className="height-100">
        {childrenWithProps}
      </div>
    )
  }
}

