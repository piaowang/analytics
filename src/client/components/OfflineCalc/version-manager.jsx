import React from 'react'
import Bread from '../Common/bread'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Modal, Select, Table, Tree } from 'antd';
import _ from 'lodash'
import {Link} from 'react-router'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import { OfflineCalcTargetType } from '../../../common/constants'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import IndicesEdit from './indices-edit'
import {dictBy} from '../../../common/sugo-utils'
import ModelsEdit from './models-edit2'

const {Option} = Select
const { TreeNode } = Tree
const Search = Input.Search

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

const getParentKey = (key, tree) => {
  let parentKey
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i]
    if (node.children) {
      if (node.children.some(item => item.key === key)) {
        parentKey = node.key
      } else if (getParentKey(key, node.children)) {
        parentKey = getParentKey(key, node.children)
      }
    }
  }
  return parentKey
}

@connect(state => {
  const indicesList = state['pick-offline-calc-indices-in-formula-editor'] || {}
  return { 
    ...state['sagaCommon'], 
    ...state['offlineCalcVersionManager'],
    indicesIdDict: dictBy(indicesList.offlineCalcIndices, o => o.id),
    users: _.get(state, 'common.users', []) 
  }
})
@Form.create()
export default class OfflineCalcVersionManager extends React.Component {
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }

  dispatch(func, payload) {
    this.props.dispatch({
      type: `offlineCalcVersionManager/${func}`,
      payload
    })
  }

  changeProps(payload) {
    this.props.dispatch({
      type: 'offlineCalcVersionManager/change',
      payload
    })
  }

  onExpand = expandedKeys => {
    this.changeProps({
      expandedKeys,
      autoExpandParent: false
    })
  };


  onChange = e => {
    const { tree, treeDataList } =this.props
    const value = e.target.value
    const expandedKeys = treeDataList
      .map(item => {
        if (item.title.indexOf(value) > -1) {
          return getParentKey(item.key, tree)
        }
        return null
      })
      .filter((item, i, self) => item && self.indexOf(item) === i)

    this.changeProps({
      expandedKeys,
      searchValue: value,
      autoExpandParent: true
    })
  }

  onDrop = info => {
    const dropKey = info.node.props.eventKey
    const dragKey = info.dragNode.props.eventKey
    const dropPos = info.node.props.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])

    const loop = (data, key, callback) => {
      data.forEach((item, index, arr) => {
        if (item.key === key) {
          return callback(item, index, arr)
        }
        if (item.children) {
          return loop(item.children, key, callback)
        }
      })
    }
    const data = [...this.props.tree]

    // Find dragObject
    let dragObj
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1)
      dragObj = item
    })

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, item => {
        item.children = item.children || []
        // where to insert 示例添加到尾部，可以是随意位置
        item.children.push(dragObj)
      })
    } else if (
      (info.node.props.children || []).length > 0 && // Has children
      info.node.props.expanded && // Is expanded
      dropPosition === 1 // On the bottom gap
    ) {
      loop(data, dropKey, item => {
        item.children = item.children || []
        // where to insert 示例添加到尾部，可以是随意位置
        item.children.unshift(dragObj)
      })
    } else {
      let ar
      let i
      loop(data, dropKey, (item, index, arr) => {
        ar = arr
        i = index
      })
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj)
      } else {
        ar.splice(i + 1, 0, dragObj)
      }
    }

    this.changeProps({
      tree: data
    })
  };
  
  renderColumns() {
    let { users } = this.props
    return [
      {
        title: '版本',
        dataIndex: 'version',
        key: 'version'
      },
      {
        title: '发布者',
        dataIndex: 'created_by',
        key: 'created_by',
        render: (val) => {
          let user = users.find(o => o.id === val)
          return `${_.get(user,'first_name')}(${_.get(user,'username')})`
        }
      },
      {
        title: '审核人',
        dataIndex: 'review_status',
        key: 'review_status',
        render: (val) => {
          let rl = val.reviewer_list.list
          let res = ''
          rl.map( i => res += `  ${_.get(users.find(o => o.id === i),'first_name')}(${_.get(users.find(o => o.id === i),'username')})`)
          return res
        }
      }, 
      {
        title: '查看历史版本',
        dataIndex: 'clone',
        key: 'clone',
        render: (clone, record) => {
          if (record.target_type + '' === OfflineCalcTargetType.IndicesModel) {
            return <Link to={`/console/offline-calc/models/${record.id}?targetType=viewVersion`}>查看</Link>
          }
          return (
            <a
              onClick={() => this.changeProps({diffModalVisible: true, clone})}
            >
              查看
            </a>
          )
        }
      }
    ]
  }

  renderIndices(offlineCalcIndices) {
    
    let currDim = _.get(offlineCalcIndices, [0]) || offlineCalcIndices

    return (
      <Form className="mg2t">
        <IndicesEdit 
          onlyRenderItem
          curr={currDim}
          params={{ id: _.get(currDim,'id')}}
          disabled
        />
      </Form>
    )
  }

  renderIndicesModel(offlineCalcModels) {
    return (
      <div className="mg2t" style={{width: '1300px',height: '800px'}}>
        <ModelsEdit
          offlineCalcModels={[offlineCalcModels]}
          params={{id:''}}
          disabled
          reuseSagaModel
        />
      </div>
    )
  }

  render() {
    const { tree, list, diffModalVisible, clone, selectedType, expandedKeys, searchValue } = this.props

    const renderDiffList = {
      [OfflineCalcTargetType.Indices]: this.renderIndices(clone),
      [OfflineCalcTargetType.IndicesModel]: this.renderIndicesModel(clone)
    }

    const loop = data =>
      data.map(item => {
        const index = item.title.indexOf(searchValue)
        const beforeStr = item.title.substr(0, index)
        const afterStr = item.title.substr(index + searchValue.length)
        const title =
        index > -1 ? (
          <span>
            {beforeStr}
            <span style={{ color: '#f50' }}>{searchValue}</span>
            {afterStr}
          </span>
        ) : (
          <span>{item.title}</span>
        )
        if (item.children) {
          return (
            <TreeNode key={item.key} title={title}>
              {loop(item.children)}
            </TreeNode>
          )
        }
        return <TreeNode key={item.key} title={title} />
      })

    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '版本管理' }
          ]}
        />
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic"
        >
          <div
            defaultWeight={1}
            className="itblock height-100"
            style={{
              padding: '10px 5px 10px 10px'
            }}
          >
            <div className="bg-white corner height-100 pd2 overscroll-y">
              <div>
                <Search style={{ marginBottom: 8,boxSizing:'border-box',paddingTop:'0px',paddingBottom:'0px' }} placeholder="搜索节点" onChange={this.onChange} />
              </div>
              <div>
                <Tree
                  className="draggable-tree"
                  draggable
                  blockNode
                  expandedKeys={expandedKeys}
                  onDrop={this.onDrop}
                  onExpand={this.onExpand}
                  onSelect={(selectedKeys, a) => {
                    let key = selectedKeys[0]
                    let targetType = key && key.substr(-1)
                    let id = key && key.substring(0, key.length -1)
                    this.changeProps({ selectedType: targetType })
                    if (id) {
                      this.dispatch('fetchVersionList', { id })
                    }
                  }}
                >
                  {loop(tree)}
                </Tree>
              </div>
            </div>
          </div>
  
          <div
            className="itblock height-100 "
            style={{padding: '10px 10px 10px 5px'}}
            defaultWeight={5}
          >
            <div className="pd3x pd2y bg-white corner height-100 overscroll-y">
              <Table
                rowKey="id"
                bordered
                defaultWeight={5}
                dataSource={selectedType ? list : []}
                columns={this.renderColumns()}
              />
            </div>
          </div>
        </HorizontalSplitHelper>
        <Modal
          visible={diffModalVisible}
          onCancel={() => this.changeProps({ diffModalVisible: false })}
          onOk={() => this.changeProps({ diffModalVisible: false })}
          className={selectedType === OfflineCalcTargetType.IndicesModel ? 'width-90': null}
        >
          {renderDiffList[selectedType]}
        </Modal>
      </React.Fragment>
    )
  }
}
