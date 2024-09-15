import React from 'react'

import { CheckCircleOutlined, CloseCircleOutlined, CloseOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'

import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'

import { Tree, Tooltip, message, Input, Modal } from 'antd'
import _ from 'lodash'
import { dictBy, groupBy } from '../../../../common/sugo-utils'
import { withCommonFilter } from '../../Common/common-filter'
import smartSearch from '../../../../common/smart-search'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import cataLogTreeModel, { namespace } from './catalog-tree-model'
import { connect } from 'react-redux'
import '../css.styl'
import { validateFields } from '../../../common/decorators'
import { treeFilter, getTypeKeysByKey, makeTreeNode, recurFindPathNodeKeys, recurFlatten, treeNode2KeyStr, treeNodeKeyStr, getTreeTypeId, validInputName } from '../constants'
import SugoIcon from '../../Common/sugo-icon'

const FormItem = Form.Item

const typeIcon = <SugoIcon className='font16' type='sugo-task-category' />
const typeExpandedIcon = <SugoIcon className='font16' type='sugo-task-category' />
const taskIcon = <SugoIcon className='font14' type='sugo-task-table' />

@withRuntimeSagaModel(cataLogTreeModel)
@connect(props => props[namespace] || {})
@withCommonFilter
@Form.create()
@validateFields
export default class TaskTree extends React.Component {
  componentDidMount() {
    let { innerRef } = this.props
    if (_.isFunction(innerRef)) {
      innerRef(this)
    }
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  getSelectTypeChlidList = selectedKeys => {
    if (selectedKeys.length) {
      this.props.dispatch({
        type: `${namespace}/getDataFields`,
        payload: {
          selectedKeys
        }
      })
    }
    // const { cataLogTreeInfo } = this.props
    // const selectKey = selectedKeys[0]
    // if (selectKey && _.startsWith(selectKey, 'type-')) {
    //   const key = selectKey.substr(5)
    //   let keys = getTypeKeysByKey([key], cataLogTreeInfo.types)
    //   const keyByTypes = _.keyBy(cataLogTreeInfo.types, 'id')
    //   let listData = cataLogTreeInfo.tasks.filter(p => keys.includes(p.typeId.toString()))
    //   listData = listData.map(o => ({
    //     ...o, dbName: _.get(keyByTypes, `db${o.dbId}.dbName`)
    //   }))
    //   this.changeState({ selectedKeys, listData })
    // } else if (selectKey) {
    //   this.props.dispatch({
    //     type: `${namespace}/getDataFields`,
    //     payload: {
    //       selectedKeys
    //     }
    //   })
    // }
  }

  expandToSeeNode = selectedKey => {
    let { expandedKeys, treeData } = this.props
    let allParentIds = recurFindPathNodeKeys(treeData, selectedKey).filter(k => k !== selectedKey)
    this.changeState({ expandedKeys: _.uniq([...expandedKeys, ...allParentIds]) })
  }

  // 代码来源 antd Tree 拖动示例 https://ant.design/components/tree-cn/
  onDrop = info => {
    const dropKey = info.node.props.eventKey
    const dragKey = info.dragNode.props.eventKey
    const dropPos = info.node.props.pos.split('-')
    const olDdropPos = info.dragNode.props.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])
    // diff: only allow drag to type
    if (dropPos.length < 3 || olDdropPos[1] === '0' || olDdropPos[1] !== dropPos[1] || (!info.dropToGap && !_.startsWith(dropKey, 'type-'))) {
      return
    }

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
    const data = [...this.props.treeData]
    let dragObj
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1)
      dragObj = item
    })
    if (info.dropToGap) {
      let ar = []
      let i = 0
      loop(data, dropKey, (item, index, arr) => {
        ar = arr
        i = index
        dragObj.parentKey = item.parentKey // diff: reset parent
      })
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj)
      } else {
        ar.splice(i + 1, 0, dragObj)
      }
    } else {
      loop(data, dropKey, item => {
        item.children = item.children || []
        // where to insert 示例添加到尾部，可以是随意位置
        item.children.push(dragObj)
        dragObj.parentKey = item.key // diff: set parent
      })
    }
    this.changeState({ treeData: data })
  }

  renderTreeNodes = treeData => {
    let { expandedKeys } = this.props
    return treeData.map(node => {
      if (_.startsWith(node.key, 'type-')) {
        const title = (
          <div className='edit-tree-icon width-100 itblock'>
            <div className='elli itblock task-tree-title'>{node.title}</div>
            {node.parentKey && !_.startsWith(node.key, 'type-db-')
              ? [
                  <EditOutlined
                    key='editIcon'
                    className='pointer font14 iblock color-blue'
                    style={{ marginLeft: '5px' }}
                    onClick={() => {
                      this.changeState({ selectTypeKey: node.key, showEditType: true })
                    }}
                  />,
                  <CloseOutlined
                    key='closeIcon'
                    className='pointer font14 iblock color-disable'
                    style={{ marginLeft: '20px' }}
                    onClick={() => {
                      this.props.dispatch({
                        type: `${namespace}/deleteType`,
                        payload: { id: treeNodeKeyStr(node.key) }
                      })
                    }}
                  />
                ]
              : null}
          </div>
        )
        return (
          <Tree.TreeNode icon={_.includes(expandedKeys, node.key) ? typeExpandedIcon : typeIcon} {...node} dataRef={node} title={title}>
            {this.renderTreeNodes(node.children)}
          </Tree.TreeNode>
        )
      }
      return <Tree.TreeNode icon={taskIcon} {...node} dataRef={node} title={<div className='elli itblock task-tree-title'>{node.title}</div>} />
    })
  }

  cancelEditOrder = () => {
    let treeData = makeTreeNode(this.props.cataLogTreeInfo)
    this.changeState({ treeData: treeData, editingOrder: false })
  }

  genSortInfo = treeData => {
    let flattedTree = recurFlatten(treeData).filter(p => p.key.indexOf('-db-') === -1 && (p.parentKey || '').indexOf('-db-') === -1)
    let taskNameIdDict = dictBy(
      _.get(this.props, 'cataLogTreeInfo[0].tasks'),
      t => t.id,
      t => t.name
    )
    let sortInfo = {
      order: groupBy(
        flattedTree,
        n => (n.parentKey && n.parentKey) || -1,
        arr => arr.map(n => n.key)
      ),
      type: groupBy(
        flattedTree.filter(n => !_.startsWith(n.key, 'type-')),
        n => (n.parentKey && n.parentKey.substr(5)) || 0,
        arr => arr.map(n => ({ projectId: n.key, projectName: taskNameIdDict[n.key] }))
      ),
      tree: groupBy(
        flattedTree.filter(n => _.startsWith(n.key, 'type-')),
        n => (n.parentKey && n.parentKey.substr(5)) || 0,
        arr => arr.map(treeNode2KeyStr)
      )
    }
    return sortInfo
  }

  onExpand = (expandedKeys, { expanded, node }) => {
    this.changeState({ expandedKeys })
  }

  saveOrder = async () => {
    const { treeData } = this.props
    let sortInfo = this.genSortInfo(treeData)
    this.props.dispatch({
      type: `${namespace}/saveOrder`,
      payload: { sortInfo }
    })
  }

  renderEmptyHint = () => {
    return (
      <div key='noData' className='aligncenter pd3y'>
        暂无内容，请先创建
      </div>
    )
  }

  renderTopButton = () => {
    let { setCurrentSearching, editingOrder, selectedKeys, cataLogTreeInfo } = this.props
    if (editingOrder) {
      return [
        <Tooltip title='取消设置排序' key='cancel'>
          <CloseCircleOutlined className='font16 pointer mg2r' onClick={this.cancelEditOrder} />
        </Tooltip>,
        <Tooltip key='save' visible placement='rightTop' title='可拖拽节点进行排序，点击保存操作'>
          <CheckCircleOutlined className='font16 pointer' onClick={this.saveOrder} />
        </Tooltip>
      ]
    }
    return [
      <Tooltip title='新增分类' key='add'>
        <PlusOutlined
          className='pointer font16 mg1r'
          onClick={() => {
            if (!selectedKeys.length) {
              message.error('请先选择任务分类节点!')
              return
            }
            const selectObj = cataLogTreeInfo.types.find(p => `type-${p.id}` === selectedKeys[0])
            if (selectedKeys[0].indexOf('db-') >= 0 || _.get(selectObj, 'actionType', 0) === 1) {
              message.error('源数据层不能添加分类!')
              return
            }
            if (!selectObj) {
              message.error('数据表不能添加分类!')
              return
            }
            this.changeState({ selectTypeKey: '', showEditType: true })
          }}
        />
      </Tooltip>,
      <Tooltip title='设置任务排序' key='order'>
        <SugoIcon
          type='sugo-task-category-sort'
          className='pointer font16'
          onClick={() => {
            setCurrentSearching('')
            this.changeState({ editingOrder: true })
          }}
        />
      </Tooltip>
    ]
  }

  renderTree = () => {
    let { searching, listData, editingOrder, expandedKeys, selectedKeys } = this.props
    let filteredTreeData = searching ? listData.filter(p => p.TABLE_NAME.indexOf(searching) > 0) : listData
    const dataBase = filteredTreeData.map(p => p.TABLE_SCHEM)
    return _.isEmpty(filteredTreeData) ? (
      this.renderEmptyHint()
    ) : (
      <Tree
        title='treeData'
        key='tree'
        showIcon
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        onExpand={this.onExpand}
        draggable={editingOrder}
        onDrop={this.onDrop}
        onSelect={this.getSelectTypeChlidList}
      >
        {_.uniq(dataBase).map(p => {
          const children = filteredTreeData.filter(d => d.TABLE_SCHEM === p)
          return (
            <Tree.TreeNode icon={typeExpandedIcon} key={`type-${p}`} title={p}>
              {children.map(c => {
                return <Tree.TreeNode icon={taskIcon} key={`${p}##${c.TABLE_NAME}`} title={<div className='elli itblock task-tree-title'>{c.TABLE_NAME}</div>} />
              })}
            </Tree.TreeNode>
          )
        })}
      </Tree>
    )
    // let { searching, treeData, editingOrder, expandedKeys, selectedKeys } = this.props
    // let filteredTreeData = treeFilter(treeData, n => smartSearch(searching, n.title))
    // return _.isEmpty(filteredTreeData)
    //   ? this.renderEmptyHint()
    //   : (
    //     <Tree
    //       title="treeData"
    //       key="tree"
    //       showIcon
    //       expandedKeys={expandedKeys}
    //       selectedKeys={selectedKeys}
    //       onExpand={this.onExpand}
    //       draggable={editingOrder}
    //       onDrop={this.onDrop}
    //       onSelect={this.getSelectTypeChlidList}
    //     >
    //       {this.renderTreeNodes(filteredTreeData)}
    //     </Tree>
    //   )
  }

  ok = async () => {
    const { selectedKeys, selectTypeKey, cataLogTreeInfo } = this.props
    const values = await this.validateFields()
    if (!values) return
    const parentId = selectTypeKey ? cataLogTreeInfo.types.find(p => `type-${p.id}` === selectTypeKey).parentId : treeNodeKeyStr(_.get(selectedKeys, '0', ''))
    this.props.dispatch({
      type: `${namespace}/editTypeName`,
      payload: { id: treeNodeKeyStr(selectTypeKey), name: values.name, parentId }
    })
    this.props.form.resetFields()
  }

  cancel = () => {
    this.changeState({ showEditType: false })
    this.props.form.resetFields()
  }

  renderEditTypeModal = () => {
    let {
      form: { getFieldDecorator },
      showEditType,
      selectTypeKey,
      cataLogTreeInfo
    } = this.props
    return (
      <Modal
        maskClosable={false}
        title={selectTypeKey ? '编辑分类名称' : '新增分类'}
        wrapClassName='vertical-center-modal'
        visible={showEditType}
        onOk={this.ok}
        onCancel={this.cancel}
      >
        <Form onSubmit={this.handleSubmit}>
          <FormItem label='分类名称' hasFeedback>
            {getFieldDecorator('name', {
              rules: [
                {
                  required: true,
                  message: '分类名称必填!'
                },
                ...validInputName
              ],
              initialValue: selectTypeKey ? cataLogTreeInfo.types.find(p => `type-${p.id}` === selectTypeKey).name : ''
            })(<Input />)}
          </FormItem>
        </Form>
      </Modal>
    )
  }

  render() {
    let { keywordInput, editingOrder } = this.props
    let Search = keywordInput
    return (
      <div className='task-schedule-tree corner overscroll-y always-display-scrollbar' style={{ paddingTop: '5px' }}>
        <Search className='tree-search-box pd1x' placeholder='搜索...' key='search' disabled={editingOrder} />
        {this.renderTree()}
        {/* {this.renderEditTypeModal()} */}
      </div>
    )
  }
}
