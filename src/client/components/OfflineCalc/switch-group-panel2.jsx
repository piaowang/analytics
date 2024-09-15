import React from 'react'
import { DeleteOutlined, EditOutlined, PlusCircleFilled,ReloadOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Input, message, Modal, Tree } from 'antd';
import _ from 'lodash'
import {withCommonFilterDec} from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {tagSagaModelGenerator} from './saga-model-generators'
import SizeProvider from '../Common/size-provider'
import {isDiffByPath, recurFindDeep, recurFlatten, recurMap} from '../../../common/sugo-utils'
import moment from 'moment'

const { TreeNode } = Tree

const namespace = 'switch-group-panel'


export function makeTree(tags) {
  // hack： 通过修改 created_at 实现排序
  let treeNodes = _(tags).orderBy('created_at', 'asc').map(k => ({
    key: k.id,
    title: k.name,
    parentId: k.parent_id,
    children: []
  })).value()
  let treeNodeDict = _.keyBy(treeNodes, 'key')
  return treeNodes.reduce((arr, k) => {
    if (k.parentId && treeNodeDict[k.parentId]) {
      let parent = treeNodeDict[k.parentId]
      parent.children.push(k)
      return arr
    }
    arr.push(k)
    return arr
  }, [])
}


let mapStateToProps = (state, ownProps) => {
  const runtimeSwitchGroupPanelNamespace = `${namespace}_${ownProps.tagType}`
  const modelState = state[runtimeSwitchGroupPanelNamespace] || {}
  
  const filteredTags = ownProps.searching
    ? (modelState.tags || []).filter(tag => smartSearch(ownProps.searching, tag.name))
    : (modelState.tags || [])
  return {
    ...modelState,
    tagsTree: makeTree(filteredTags),
    users: _.get(state, 'common.users', []),
    runtimeSwitchGroupPanelNamespace
  }
}

const unlimitedGroup = {
  key: 'unlimited',
  title: '不限分组'
}

const intelligentGroup = {
  key: 'intelligent',
  title: '智能分组'
}


@withCommonFilterDec()
@connect(mapStateToProps)
@withRuntimeSagaModel(tagSagaModelGenerator(namespace))
export default class SwitchGroupPanel extends React.Component {
  state = {
    expandedKeys: ['unlimited'],
    selectedKeys: ['unlimited'],
    treeData: null
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'tags')) {
      const {tags} = this.props
      this.setState({
        expandedKeys: ['unlimited', ..._.uniq((tags || []).map(d => d.parent_id))]
      })
    }
  }
  
  createOrModTag = tagId => {
    let {groupTitle, dispatch, tags, tagType, runtimeSwitchGroupPanelNamespace} = this.props
    let {selectedKeys, expandedKeys} = this.state
    let selectedTagId = selectedKeys[0] === 'unlimited' ? null : selectedKeys[0]
    
    let tag = tagId && _.find(tags, t => t.id === tagId)
    let newName = _.get(tag, 'name') || ''
    Modal.confirm({
      title: `${tag ? '修改' : '添加'}${groupTitle}分组`,
      content: (
        <Input
          placeholder="分组名称"
          defaultValue={newName}
          onChange={ev => newName = ev.target.value}
        />
      ),
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        if (!newName) {
          message.warn('请先输入名称')
          throw new Error('请先输入名称')
        }
        if (!/^\s*(\S+)\s*$/.test(newName)) {
          message.warn('组名内部不能包含空格')
          throw new Error('组名内部不能包含空格')
        }
        let pendingTagNameTrimmed = _.trim(newName)
        if (32 < _.size(pendingTagNameTrimmed)) {
          message.warn('组名太长')
          throw new Error('组名太长')
        }
        dispatch({
          type: `${runtimeSwitchGroupPanelNamespace}/sync`,
          payload: tag
            ? tags.map(t => t.id === tagId ? {...t, name: newName} : t)
            : [...(tags || []), {
              name: pendingTagNameTrimmed,
              type: tagType,
              project_id: null,
              parent_id: selectedTagId
            }],
          callback: syncRes => {
            let {resCreate, resUpdate} = syncRes || {}
            if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
              message.warn('没有修改数据，无须保存')
              return
            }
            if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
              // 保存报错
              return
            }
            const isCreated = _.isEmpty(resUpdate)
            message.success((
              <span>{isCreated ? '创建' : '修改'}分组成功</span>
            ))
            if (selectedTagId) {
              this.setState({
                expandedKeys: _.uniq([...expandedKeys, selectedTagId])
              })
            }
          }
        })
      }
    })
  }
  
  renderAddTagBtn = () => {
    let {treeData} = this.state
    if (treeData) {
      return null
    }
    return (
      <PlusCircleFilled
        className="pointer font16"
        title="添加分组"
        onClick={() => {
          this.createOrModTag()
        }} />
    );
  }
  
  renderEditTagBtn = (tagId) => {
    if (tagId === 'unlimited' || tagId === 'intelligent') {
      return null
    }
    return (
      <EditOutlined
        className="mg1r hover-display-iblock"
        onClick={() => {
          this.createOrModTag(tagId)
        }} />
    );
  }
  
  renderDelTagBtn = (tagId) => {
    if (tagId === 'unlimited' || tagId === 'intelligent') {
      return null
    }
    let {groupTitle, tags, onTagDelete, onTagSelected, dispatch, runtimeSwitchGroupPanelNamespace, tagsTree} = this.props
    let tag = tagId && _.find(tags, t => t.id === tagId)
    return (
      <DeleteOutlined
        className="hover-display-iblock color-red"
        onClick={() => {
          Modal.confirm({
            title: `确认删除 ${tag.name} ？`,
            content: (
              <div className="color-red">分组里面的{groupTitle}会移除出此组</div>
            ),
            okText: '确认',
            cancelText: '取消',
            onOk: async () => {
              // 如果删除根分类，则下面的分类都删除
              let rootTag = recurFindDeep(tagsTree, n => n.children, n => n.key === tag.id)
              let preDelTagKeys = recurFlatten([rootTag]).map(n => n.key)
              let preDelTagKeysSet = new Set(preDelTagKeys)
              dispatch({
                type: `${runtimeSwitchGroupPanelNamespace}/sync`,
                payload: (tags || []).filter(o => !preDelTagKeysSet.has(o.id))
              })
              onTagDelete && onTagDelete(tag)
              this.onSelect([])
            }
          })
        }} />
    );
  }
  
  renderTreeNodes = (data, validWidth) => {
    let {expandedKeys, treeData} = this.state
    return data.map(item => {
      let {key, title, children} = item
      const icon = <LegacyIcon type={_.includes(expandedKeys, item.key) ? 'folder-open' : 'folder'} />
      return (
        <TreeNode
          icon={icon}
          title={(
            <div
              className="itblock elli alignright hover-display-trigger"
              style={{width: validWidth}}
            >
              <span className="fleft">{title}</span>
              {treeData ? null : this.renderEditTagBtn(key)}
              {treeData ? null : this.renderDelTagBtn(key)}
            </div>
          )}
          key={key}
          dataRef={item}
        >
          {_.isEmpty(children) ? null : this.renderTreeNodes(children, validWidth - 18)}
        </TreeNode>
      )
    });
  };
  
  onExpand = expandedKeys => {
    this.setState({
      expandedKeys,
      autoExpandParent: false
    })
  }
  
  onSelect = (selectedKeys) => {
    let {onTagSelected, tags} = this.props
    let selectedTagId = selectedKeys[0] || 'unlimited'
    let dbTag = selectedTagId === 'intelligent'
      ? { id: 'auto_generate' }
      : _.find(tags, t => t.id === selectedTagId)
    onTagSelected(dbTag)
    this.setState({ selectedKeys: [selectedTagId] })
  }
  
  onDragEnter = info => {
    this.setState({
      expandedKeys: info.expandedKeys
    })
  }
  
  onDrop = info => {
    console.log(info)
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
    const data = [...this.state.treeData]
    
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
        dragObj.parentId = item.key
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
        dragObj.parentId = item.key
      })
    } else {
      let ar
      let i
      loop(data, dropKey, (item, index, arr) => {
        ar = arr
        i = index
        dragObj.parentId = item.parentId
      })
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj)
      } else {
        ar.splice(i + 1, 0, dragObj)
      }
    }
    
    this.setState({
      treeData: data
    })
  };
  
  renderSettingBtn = () => {
    let {treeData} = this.state
    return (
      <React.Fragment>
        <LegacyIcon
          type={treeData ? 'save' : 'setting'}
          className="pointer font16 mg1l"
          theme="filled"
          title={treeData ? '保存当前顺序' : '调整顺序'}
          onClick={() => {
            if (!treeData) {
              this.setState({
                treeData: _.cloneDeep(this.props.tagsTree)
              })
              return
            }
            
            let {tags, dispatch, runtimeSwitchGroupPanelNamespace} = this.props
            let tagIdDict = _.keyBy(tags, 'id')
            function flatTree(tree, nodeToDbObj) {
              return _.flatMap(tree, (n, idx) => {
                return [nodeToDbObj(n), ...flatTree(n.children || [], nodeToDbObj)]
              })
            }
            let now = Date.now()
            let nextTags = flatTree(treeData, t => {
              return {
                ...(tagIdDict[t.key] || {}),
                id: t.key,
                name: t.title,
                parent_id: t.parentId
              }
            }).map((dbTags, i) => {
              // hack： 通过修改 created_at 实现排序
              return {
                ...dbTags,
                created_at: moment(now).add(i, 's').toDate()
              }
            })
            dispatch({
              type: `${runtimeSwitchGroupPanelNamespace}/sync`,
              payload: nextTags,
              callback: syncRes => {
                let {resCreate, resUpdate, resDelete} = syncRes || {}
                if (_.isEmpty(resCreate) && _.isEmpty(resUpdate) && _.isEmpty(resDelete)) {
                  message.warn('没有修改数据，无须保存')
                  this.setState({
                    treeData: null
                  })
                  return
                }
                if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate)) && _.isEmpty(_.compact(resDelete))) {
                  // 保存报错
                  return
                }
                message.success('保存分组排序成功')
                this.setState({
                  treeData: null,
                  expandedKeys: ['unlimited', ..._.uniq((tags || []).map(d => d.parent_id))]
                })
              }
            })
          }}
        />
        {!treeData ? null : (
          <ReloadOutlined
            className="pointer font16 mg1l"
            theme="filled"
            title="取消调整顺序"
            onClick={() => {
              this.setState({
                treeData: null
              })
            }}
          />
        )}
      </React.Fragment>
    );
  }
  
  render() {
    let {tags, tagsTree, keywordInput: SearchBox, groupTitle, selectedTagId, onTagSelected} = this.props
    let {treeData, expandedKeys, selectedKeys} = this.state
    let treeInfo = treeData || [{
      ...unlimitedGroup,
      children: tagsTree
    },
    groupTitle === '指标' ? '' : intelligentGroup
    ].filter(_.identity)
    return (
      <React.Fragment>
        <div style={{padding: '0 12px'}}>
          <div style={{padding: '16px 0 16px'}} className="alignright">
            <span className="fleft">{groupTitle}分组</span>
            {this.renderAddTagBtn()}
            {this.renderSettingBtn()}
          </div>
          <SearchBox placeholder="搜索分组..." />
        </div>
    
        <div style={{marginTop: '10px'}}>
          <SizeProvider>
            {({spWidth, spHeight}) => {
              return (
                <Tree
                  onExpand={this.onExpand}
                  expandedKeys={expandedKeys}
                  autoExpandParent
                  onSelect={this.onSelect}
                  selectedKeys={selectedKeys}
                  showIcon
                  draggable={!!treeData}
                  onDragEnter={this.onDragEnter}
                  onDrop={this.onDrop}
                >
                  {this.renderTreeNodes(treeInfo, spWidth - 24 * 2 - 5 * 2)}
                </Tree>
              )
            }}
          </SizeProvider>
        </div>
      </React.Fragment>
    )
  }
}
