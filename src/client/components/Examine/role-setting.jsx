import React, { Component } from 'react'
import { Button, Tree, Tabs, Input } from 'antd'
import _ from 'lodash'
const { TreeNode } = Tree

export default class RoleSetting extends Component {

  state = {
    writeSelectInstution: '',
    writeSelectRoles: [],
    readSelectInstution: '',
    readSelectRoles: [],
    activeTab: 'write',
    searchKey: ''
  }

  componentWillMount() {
    const { value = [] } = this.props
    if (!_.isEmpty(value)) {
      this.setState({
        writeSelectRoles: value.filter(p => p.type === 1).map(p => p.id),
        readSelectRoles: value.filter(p => p.type === 0).map(p => p.id)
      })
    }
  }

  // componentDidUpdate(preProps, preState) {
  //   const { value = [] } = this.props
  //   if (value !== preProps.values) {
  //     this.setState({
  //       writeSelectRoles: value.filter(p => p.type === 1).map(p => p.id),
  //       readSelectRoles: value.filter(p => p.type === 0).map(p => p.id)
  //     })
  //   }
  // }

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
    const { roleList = [], institutionsList = [], institutionsTree = {} } = this.props
    const { writeSelectRoles, readSelectRoles, activeTab, writeSelectInstution, readSelectInstution, searchKey } = this.state
    let ids = []
    const getInstutioIds = (id) => {
      const objs = institutionsList.filter(p => p.parent === id)
      if (objs.length) {
        ids = [...ids, ...objs.map(p => p.id)]
        _.each(objs, p => getInstutioIds(p.id))
      }
    }
    if (activeTab === 'write') {
      getInstutioIds(writeSelectInstution)
      ids.push(writeSelectInstution)
    } else {
      getInstutioIds(readSelectInstution)
      ids.push(readSelectInstution)
    }
    // 获取所有的子机构ID

    return (<div>
      <div className="mg2b"><Input placeholder="请输入角色名称过滤" className="width300" onChange={e => this.setState({ searchKey: e.target.value })} /></div>
      {
        (_.isEmpty(ids) ? roleList : roleList.filter(p => _.intersection(ids, p.institutions_id).length)).map(p => {
          if (searchKey && !_.includes(p.name, searchKey)) {
            return null
          }
          if (activeTab === 'write') {
            const isSelect = writeSelectRoles.includes(p.id)
            return (<Button key={`role_${p.id}`} className="mg1b mg1r" type={isSelect ? 'primary' : ''} onClick={() => {
              let val = isSelect ? writeSelectRoles.filter(r => r !== p.id) : [...writeSelectRoles, p.id]
              this.setState({ writeSelectRoles: val })
            }}>{p.name}</Button>)
          }
          const isSelect = readSelectRoles.includes(p.id)
          return (<Button key={`role_${p.id}`} className="mg1b mg1r" type={isSelect ? 'primary' : ''} onClick={() => {
            let val = isSelect ? readSelectRoles.filter(r => r !== p.id) : [...readSelectRoles, p.id]
            this.setState({ readSelectRoles: val })
          }}>{p.name}</Button>)
        })
      }
    </div>)
  }

  renderInstutionTree = () => {
    const { institutionsList = [], institutionsTree = {} } = this.props
    const { activeTab } = this.state
    return (<Tree
      onSelect={v => {
        if (activeTab === 'write') {
          this.setState({ writeSelectInstution: _.first(v) })
          return
        }
        this.setState({ readSelectInstution: _.first(v) })

      }}
    >
      {this.renderTreeNodes(institutionsTree)}
    </Tree>)
  }

  render() {
    const { save, hide } = this.props
    const { activeTab, writeSelectRoles, readSelectRoles } = this.state
    return (
      <div>
        <Tabs
          activeKey={activeTab}
          onChange={v => this.setState({ activeTab: v, writeSelectInstution: '', readSelectInstution: '', searchKey: '' })}
          tabBarExtraContent={<div><Button className="mg2r" onClick={() => save({ writeSelectRoles, readSelectRoles })}>保存</Button>
            <Button onClick={hide} className="mg2r" >取消</Button>
          </div>}
        >
          <Tabs.TabPane key="write" tab="编辑权">
            <div className="width300 itblock">{this.renderInstutionTree()}</div>
            <div className="iblock" style={{ width: 'calc(100% - 300px)' }}>{this.renderRoles()}</div>
          </Tabs.TabPane>
          <Tabs.TabPane key="read" tab="浏览权">
            <div className="width300 itblock">{this.renderInstutionTree()}</div>
            <div className="iblock" style={{ width: 'calc(100% - 300px)' }}>{this.renderRoles()}</div>
          </Tabs.TabPane>
        </Tabs>

      </div>
    )
  }
}
