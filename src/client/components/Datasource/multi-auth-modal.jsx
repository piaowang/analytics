import React from 'react'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import {Button, Modal, Spin, message, Tooltip} from 'antd'
import _ from 'lodash'
import setStatePromiseDec from '../../common/set-state-promise'

const typeMap = {
  datasource: '数据源',
  dimension: '维度',
  measure: '指标'
}

@setStatePromiseDec
export default class AuthModal extends React.Component {

  state = {
    show: false,
    action: 'auth',
    loading: false,
    role_ids: []
  }

  auth = () => {
    let defaultRoles = window.sugo.user.SugoRoles.map(p => p.id)
    this.setState({
      action: 'auth',
      show: true,
      role_ids: defaultRoles
    })
  }

  deAuth = () => {
    this.setState({
      action: 'deAuth',
      show: true,
      role_ids: []
    })
  }
  authAll = () => {
    let defaultRoles = window.sugo.user.SugoRoles.map(p => p.id)
    this.setState({
      action: 'authAll',
      show: true,
      role_ids: defaultRoles
    })
  }

  deAuthAll = () => {
    this.setState({
      action: 'deAuthAll',
      show: true,
      role_ids: []
    })
  }

  hide = () => {
    this.setState({
      show: false
    })
  }

  onClick = id => {
    let {role_ids} = this.state
    if (role_ids.includes(id)) {
      this.setState({
        role_ids: role_ids.filter(r => r !== id)
      })
    } else {
      this.setState({
        role_ids: role_ids.concat(id)
      })
    }
  }

  submit = async () => {
    let {action, role_ids} = this.state
    let {data, keys, updater, setProp, type} = this.props
    await this.setStatePromise({
      loading: true
    })
    if (action === 'authAll' || action === 'deAuthAll') {
      keys = data.map(p => p.id)
    }
    for (let id of keys) {
      let obj = _.find(data, {id})
      let roleIds = obj.role_ids
      let roleIdsRes = (action === 'auth' || action === 'authAll')
        ? _.uniq([...roleIds, ...role_ids])
        : _.without(roleIds, ...role_ids)
      if (_.isEqual(roleIds.sort(), roleIdsRes.sort())) continue
      let res = await updater(id, {
        role_ids: roleIdsRes
      })

      if (res) {
        setProp({
          type: 'update_' + type + 's',
          data: {
            id,
            role_ids: roleIdsRes
          }
        })
      }
    }
    await this.setStatePromise({
      loading: false
    })
    
    message.success('操作完成', 2)
    this.hide()
  }

  render() {
    let {roles, data, type, keys, datasource} = this.props
    let {show, action, role_ids, loading} = this.state
    let title = (action === 'auth' || action === 'authAll') 
      ? '授权给角色'
      : '对角色取消授权'
    let typeTxt = typeMap[type]

    let dataIdDict = _.keyBy(data, d => d.id)
    let names = keys.map(id => {
      let item = dataIdDict[id] || {}
      return item.title || item.name
    })

    let footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={this.hide}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={loading ? 'loading' : 'check-circle-o'} />}
          className="iblock"
          disabled={!role_ids.length}
          onClick={this.submit}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )
    let desc
    if (action === 'auth') {
      desc = (
        <h3>
          将把{typeTxt}:
          <b>{names.join(', ')}</b>
          授权给下面选中的角色
        </h3>
      )
    } else if (action === 'deAuth') {
      desc = (
        <h3>
          将<b className="color-red">取消</b>下面选中的角色对{typeTxt}:
          <b>{names.join(', ')}</b>
          的查看权限
        </h3>
      )
    } else if (action === 'authAll') {
      desc = (
        <h3>
          将把所有{typeTxt}
          授权给下面选中的角色
        </h3>
      )
    } else if (action === 'deAuthAll') {
      desc = (
        <h3>
          将<b className="color-red">取消</b>下面选中的角色对所有{typeTxt}
          的查看权限
        </h3>
      )
    }
   
    let roles0 = roles.filter(r => r.type !== 'built-in')
    return (
      <Modal
        visible={show}
        title={title}
        footer={footer}
        width={600}
        onCancel={this.hide}
      >
        {desc}
        <hr className="mg1y" />
        <Spin spinning={loading}>
          <div className="pd1y">
          {
            roles0.map((role, i) => {
              let {id, name} = role
              let selected = role_ids.includes(id)
              let btn = selected ? 'primary' : 'ghost'
              let disabled = (action === 'deAuthAll' || action === 'deAuth') 
                ? false
                : (datasource && datasource.role_ids && !datasource.role_ids.includes(id))
              let button = (
                <Button
                  type={btn}
                  icon={<CheckCircleOutlined />}
                  key={i + 'role' + role.id}
                  className="mg1r mg1b"
                  onClick={() => this.onClick(id)}
                  disabled={disabled}
                >{name}</Button>
              )
              return disabled
                ? <Tooltip 
                    key={i + 'role' + role.id} 
                    title={`该${name}（角色）没授予${datasource.title}项目权限，请先到数据管理->项目列表：${datasource.title}项目授权设置。`}
                  >
                    {button}
                  </Tooltip>
                  : button
              })
            }
          </div>
        </Spin>
      </Modal>
    );
  }
}

