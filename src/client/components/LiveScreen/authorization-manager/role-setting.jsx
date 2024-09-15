import React, { Component } from 'react'
import { Button, Tree, Tabs, Input, Modal, message, Badge } from 'antd'
import { CheckCircleFilled   } from '@ant-design/icons'
import _ from 'lodash'
import { AUTHORIZATION_PERMISSIONS_TYPE } from '~/src/common/constants'
import './index.styl'
const { TreeNode } = Tree

export default class RoleSetting extends Component {

  // FIXME  与 authorization-setting 复用
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
    let { institutionsTree = [], value = [] } = this.props
    this.setState({
      writeSelectInstution: _.get(institutionsTree, '[0].id', ''),
      readSelectInstution: _.get(institutionsTree, '[0].id', ''),
      writeSelectRoles: value.filter(p => p.type === AUTHORIZATION_PERMISSIONS_TYPE.write).map(p => p.id),
      readSelectRoles: value.map(p => p.id)
    })
  }

  componentDidUpdate(prevProps) {
    const { value = [] } = this.props
    if (!_.isEqual(value, prevProps.value)) {
      this.setState({
        writeSelectRoles: value.filter(p => p.type === AUTHORIZATION_PERMISSIONS_TYPE.write).map(p => p.role_id),
        readSelectRoles: value.map(p => p.id)
      })
    }
  }

  renderTreeNodes = (data) => {
    return data.map((item) => {
      return item.children.length
        ? (
          <TreeNode
            level={item.level}
            title={`${item.name}`}
            key={`${item.key}`}
          >
            {item.children && this.renderTreeNodes(item.children)}
          </TreeNode>
        )
        : (
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
    const { writeSelectRoles, readSelectRoles, activeTab, writeSelectInstution, readSelectInstution, searchKey } = this.state
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
            onChange={e => this.setState({ searchKey: e.target.value })}
          />
        </div>
        {
          (roleList.filter(p => _.intersection(ids, p.institutions_id).length)).map(p => {
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
                type={isSelect || writeSelectRoles.includes(p.id) ? 'primary' : ''} 
                onClick={() => {
                  if ( writeSelectRoles.includes(p.id)) {
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
    const { readSelectInstution} = this.state
    const { expandedKeys } = this.state
    return (
      <Tree
        onSelect={v => {
          this.setState({ 
            readSelectInstution: _.first(v),
            writeSelectInstution: _.first(v)  
          })
        }}
        selectedKeys={[readSelectInstution]}
        onExpand={(expandedKeys) => {
          this.setState({expandedKeys})
        }}
        expandedKeys={expandedKeys}
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

  render() {
    const { hide, editVisible, save } = this.props
    const { activeTab, writeSelectRoles, readSelectRoles } = this.state
    return (
      <Modal
        visible={editVisible}
        width={1000}
        wrapClassName="role-setting-model"
        style={{minWidth: '1000px', padding: '5px'}}
        title="授权"
        onCancel={hide}
        onOk={() => save({ 
          writeSelectRoles, 
          readSelectRoles: _.filter(readSelectRoles, role => !~writeSelectRoles.indexOf(role)) 
        })}
        okButtonProps={{ disabled: !writeSelectRoles.length && !readSelectRoles.length }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={v => this.setState({ activeTab: v, searchKey: '' })}
          style={{height: '500px'}}
        >
          {
            [
              {key: 'write', name: '编辑权限'},
              {key: 'read', name: '浏览权限'}
            ].map(item => {
              return (
                <Tabs.TabPane key={item.key} tab={this.renderBadgeTab(item)}>
                  <div className="iblock" style={{width: '33.3%'}}>
                    <div className="border corner mg2r" >
                      <div className="title">机构</div>
                      <div className="content">{this.renderInstutionTree()}</div>
                    </div>
                  </div>
                  <div className="iblock" style={{width: '66.6%'}}>
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
