import React, { Component } from 'react'
import { Button, Tree, Tabs, Input, Modal, message, Badge } from 'antd'
import { CheckCircleFilled   } from '@ant-design/icons'
import _ from 'lodash'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import LivescreenRoleManager, { namespace } from './model'
import { connect } from 'react-redux'
import { AUTHORIZATION_PERMISSIONS_TYPE } from '~/src/common/constants'
import './index.styl'

const { TreeNode } = Tree

@connect(state => {
  return { ...state[namespace] }
})
@withRuntimeSagaModel(LivescreenRoleManager)
export default class AuthorizationSetting extends Component {

  // FIXME  与 role-setting 复用
  state = {
    writeSelectInstution: '',
    writeSelectRoles: [],
    readSelectInstution: '',
    readSelectRoles: [],
    activeTab: 'write',
    searchKey: '',
    expandedKeys:[]
  }

  componentDidMount() {
    const { list = [] } = this.props
    if (!_.isEmpty(list)) {
      this.setState({
        writeSelectRoles: list.filter(p => p.type === AUTHORIZATION_PERMISSIONS_TYPE.write).map(p => p.role_id),
        readSelectRoles: list.map(p => p.role_id)
      })
    }
  }

  componentDidUpdate(prevProps) {
    const { list = [] } = this.props
    if (!_.isEqual(list, prevProps.list)) {
      this.setState({
        writeSelectRoles: list.filter(p => p.type === AUTHORIZATION_PERMISSIONS_TYPE.write).map(p => p.role_id),
        readSelectRoles: list.map(p => p.role_id)
      })
    }
  }

  renderTreeNodes = (data) => {
    return data.map(item => {
      return item.children.length ? (
        <TreeNode
          level={item.level}
          title={`${item.name}`}
          key={`${item.key}`}
        >
          {item.children && this.renderTreeNodes(item.children)}
        </TreeNode>
      ) : (
        <TreeNode
          level={item.level}
          title={`${item.name}`}
          key={`${item.key}`}
        />
      )
    })
  }

  renderRoles = () => {
    const { roleList = [], institutionsList = [] } = this.props
    const { 
      writeSelectRoles, 
      readSelectRoles, 
      activeTab, 
      writeSelectInstution, 
      readSelectInstution, 
      searchKey
    } = this.state
    const getInstutioIds = (id) => {
      const objs = institutionsList.filter(p => p.parent === id)
      if (objs.length) {
        const ids = _.map(objs, p => getInstutioIds(p.id))
        return _.uniq(_.flattenDeep([id, ids]))
      }
      return [id]
    }

    let userInstitutions = getInstutioIds(sugo.user.institutions_id)

    let ids = activeTab === 'write'
      ? (writeSelectInstution ? getInstutioIds(writeSelectInstution) : userInstitutions)
      : (readSelectInstution ? getInstutioIds(readSelectInstution) : userInstitutions)
    ids = ids.filter(_.identity)
    ids = _.intersection(ids, userInstitutions)
    // 获取所有的子机构ID
    return (
      <div>
        <div className="mg2b">
          <Input 
            placeholder="请输入角色名称过滤" 
            className="width300" 
            onChange={e => this.setState({ searchKey: e.target.value })} 
          />
        </div>
        {
          roleList.filter(p => _.intersection(ids, p.institutions_id).length).map(p => {
            if (searchKey && !_.includes(p.name, searchKey)) {
              return null
            }
            if (activeTab === 'write') {
              const isSelect = writeSelectRoles.includes(p.id)
              return (
                <Button 
                  key={`role_${p.id}`} 
                  className="mg1b mg1r" 
                  type={isSelect ? 'primary' : ''} 
                  onClick={() => {
                    this.setState({ 
                      writeSelectRoles: isSelect ? writeSelectRoles.filter(r => r !== p.id) : [...writeSelectRoles, p.id], 
                      readSelectRoles: isSelect ? readSelectRoles.filter(r => r !== p.id) : (
                        !~readSelectRoles.indexOf(p.id) ? [...readSelectRoles, p.id] : [...readSelectRoles]
                      )
                    })
                  }}
                >{p.name}</Button>
              )
            }
            const isSelect = readSelectRoles.includes(p.id)
            return (
              <Button 
                key={`role_${p.id}`} 
                className="mg1b mg1r" 
                type={isSelect ? 'primary' : ''} 
                onClick={() => {
                  if(!!~writeSelectRoles.indexOf(p.id)) {
                    return message.warning('请先取消对应的编辑权限')
                  }
                  this.setState({ 
                    readSelectRoles: isSelect ? readSelectRoles.filter(r => r !== p.id) : [...readSelectRoles, p.id]
                  })
                }}
              >{p.name}</Button>
            )
          })
        }
      </div>
    )
  }

  renderInstutionTree = () => {
    const { institutionsTree = {} } = this.props
    const { writeSelectInstution, expandedKeys } = this.state
    return (
      <Tree
        onExpand={(expandedKeys) => {
          this.setState({expandedKeys})
        }}
        onSelect={v => {
          this.setState({
            writeSelectInstution: _.first(v), 
            readSelectInstution: _.first(v)
          })
        }}
        expandedKeys={expandedKeys}
        selectedKeys={[writeSelectInstution]}
      >
        {this.renderTreeNodes(institutionsTree)}
      </Tree>
    )
  }

  renderBadgeTab = (item) => {
    const { key, name } = item
    const { writeSelectRoles, readSelectRoles } = this.state
    if(key === 'write') {
      return writeSelectRoles.length ? (
        <Badge offset={[20, 0]} count={<CheckCircleFilled />}>{name}</Badge>
      ) : name
    } else if(key === 'read') {
      return readSelectRoles.length ? (
        <Badge offset={[20, 0]} count={<CheckCircleFilled />}>{name}</Badge>
      ) : name
    }
    return null
  }

  save = () => {
    const { hide } = this.props
    const { writeSelectRoles, readSelectRoles } = this.state
    this.props.dispatch({
      type: `${namespace}/updateAuthorization`,
      payload: { 
        writeRoles: writeSelectRoles, 
        readRoles: _.filter(readSelectRoles, role => !~writeSelectRoles.indexOf(role))  
      },
      cb: hide
    })
  }

  render() {
    const { hide, visible, title } = this.props
    const { activeTab, writeSelectRoles, readSelectRoles } = this.state
    return (
      <Modal
        visible={visible}
        width={800}
        title={title}
        onCancel={hide}
        onOk={() => this.save()}
        okButtonProps={{ disabled: !writeSelectRoles.length && !readSelectRoles.length }}
        wrapClassName="authorization-setting-model"
      >
        <Tabs
          activeKey={activeTab}
          onChange={v => this.setState({ activeTab: v, searchKey: '' })}
          style={{ height: '500px' }}
        >
          {
            [{
              key: 'write', name: '编辑权限'
            }, { 
              key: 'read', name: '浏览权限'
            }].map(item => {
              return (
                <Tabs.TabPane key={item.key} tab={this.renderBadgeTab(item)}>
                  <div className="iblock" style={{ width: '33.3%' }}>
                    <div className="border corner mg2r" >
                      <div className="title">机构</div>
                      <div className="content">{this.renderInstutionTree()}</div>
                    </div>
                  </div>
                  <div className="iblock" style={{ width: '66.6%' }}>
                    <div className="border corner mg2r" >
                      <div className="title">角色</div>
                      <div className="content">
                        {this.renderRoles()}
                      </div>
                    </div>
                  </div>
                </Tabs.TabPane>
              )
            })
          }
        </Tabs>
      </Modal>
    )
  }
}
