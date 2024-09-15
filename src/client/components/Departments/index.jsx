import React from 'react'
import Bread from '../Common/bread'
import { SaveOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Tree, Modal, Input, message } from 'antd';
import _ from 'lodash'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {isDiffByPath, recurFindDeep, recurMap} from '../../../common/sugo-utils'
import HoverHelp from '../Common/hover-help'
import {generate} from 'shortid'
import {departmentsSagaModelGenerator, makeTree} from './department-picker'

const { TreeNode } = Tree

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

const namespace = 'departmentsMgr'


let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  return {
    ...modelState
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel(departmentsSagaModelGenerator(namespace))
export default class DepartmentsMgr extends React.Component {
  // https://ant.design/components/tree-cn
  state = {
    gData: [],
    expandedKeys: [],
    selectedKeys: []
  };
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'departments')) {
      const {departments} = this.props
      this.setState({
        gData: makeTree(departments || []),
        expandedKeys: _.uniq((departments || []).map(d => d.parent_id))
      })
    }
  }
  
  onDragEnter = info => {
    console.log(info)
    // expandedKeys 需要受控时设置
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
    const data = [...this.state.gData]
    
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
      gData: data
    })
  };
  
  loop = data => {
    return data.map(item => {
      if (item.children && item.children.length) {
        return (
          <TreeNode key={item.key} title={item.title}>
            {this.loop(item.children)}
          </TreeNode>
        )
      }
      return <TreeNode key={item.key} title={item.title}/>
    })
  }
  
  askName = (prevName, onOk) => {
    let cache = prevName
    Modal.confirm({
      title: '请输入部门名称',
      content: (
        <Input
          defaultValue={prevName}
          onChange={ev => {
            let {value} = ev.target
            cache = value
          }}
        />
      ),
      onOk: () => {
        if (!cache) {
          message.warn('部门名称不能为空')
          return
        }
        if (cache === prevName) {
          return
        }
        onOk(cache)
      }
    })
  }
  
  render() {
    const {expandedKeys, selectedKeys, gData} = this.state
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '部门管理' }
          ]}
        />
        <Form
          className="width600 mg-auto mg3t"
        >
          <Form.Item
            label={<HoverHelp addonBefore="部门架构 " content="可拖拽设置部门层级关系" />}
            {...formItemLayout}
          >
            <Tree
              expandedKeys={expandedKeys}
              selectedKeys={selectedKeys}
              draggable
              blockNode
              onDragEnter={this.onDragEnter}
              onDrop={this.onDrop}
              onSelect={selectedKeys => this.setState({selectedKeys})}
              onExpand={expandedKeys => this.setState({expandedKeys})}
            >
              {this.loop(gData)}
            </Tree>
          </Form.Item>
  
          <Form.Item
            label="操作"
            {...formItemLayout}
          >
            <Button
              onClick={() => {
                this.askName(null, newName => {
                  let [parentKey] = selectedKeys
                  const newNode = {
                    key: generate(),
                    title: newName,
                    parentId: parentKey || null,
                    children: []
                  }
                  let parentNode = parentKey && recurFindDeep(gData, t => t.children, t => t.key === parentKey)
                  if (parentNode) {
                    let nextTree = recurMap(gData, t => _.findKey(t, _.isArray), t => {
                      return t.key === parentKey ? {...t, children: [...t.children, newNode]} : t
                    })
                    this.setState({
                      gData: nextTree,
                      expandedKeys: _.uniq([...expandedKeys, parentKey])
                    })
                    return
                  }
                  this.setState({
                    gData: [...gData, newNode]
                  })
                })
              }}
            >添加部门</Button>
            {_.isEmpty(selectedKeys) ? null : (
              <React.Fragment>
                <Button
                  className="mg2l"
                  onClick={() => {
                    let [targetKey] = selectedKeys
                    let n = recurFindDeep(gData, t => t.children, t => t.key === targetKey)
                    this.askName(n.title, newName => {
                      let nextTree = recurMap(gData, t => _.findKey(t, _.isArray), t => {
                        return t.key === targetKey ? {...t, title: newName} : t
                      })
                      this.setState({
                        gData: nextTree
                      })
                    })
                  }}
                >修改部门名称</Button>
                <Button
                  className="mg2l"
                  type="danger"
                  onClick={() => {
                    let [targetKey] = selectedKeys
                    let n = recurFindDeep(gData, t => t.children, t => t.key === targetKey)
                    if (!_.isEmpty(n.children)) {
                      message.warn('此部门有下级部门，不能删除，请先移除下级部门')
                      return
                    }
                    let nextTree = recurMap(gData.filter(c => c.key !== targetKey), t => _.findKey(t, _.isArray), t => {
                      return _.some(t.children, c => c.key === targetKey)
                        ? { ...t, children: t.children.filter(c => c.key !== targetKey) }
                        : t
                    })
                    this.setState({
                      gData: nextTree,
                      selectedKeys: null
                    })
                  }}
                >删除部门</Button>
              </React.Fragment>
            )}
          </Form.Item>
          
          <Form.Item
            label={'\u00a0'}
            colon={false}
            {...formItemLayout}
          >
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => {
                function flatTree(tree, nodeToDbObj) {
                  return _.flatMap(tree, (n, idx) => {
                    return [nodeToDbObj(n), ...flatTree(n.children || [], nodeToDbObj)]
                  })
                }
  
                let prevDepDict = _.keyBy(this.props.departments, 'id')
                let nextDeps = flatTree(gData, t => {
                  let prev = prevDepDict[t.key]
                  return {
                    ...prev,
                    id: t.key,
                    name: t.title,
                    parent_id: t.parentId
                  }
                })
                
                this.props.dispatch({
                  type: `${namespace}/sync`,
                  payload: nextDeps,
                  callback: syncRes => {
                    let {resCreate, resUpdate, resDelete} = syncRes || {}
                    if (_.isEmpty(resCreate) && _.isEmpty(resUpdate) && _.isEmpty(resDelete)) {
                      message.warn('没有修改数据，无须保存')
                      return
                    }
                    if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate)) && _.isEmpty(_.compact(resDelete))) {
                      // 保存报错
                      return
                    }
                    message.success('保存部门成功')
                  }
                })
              }}
            >保存</Button>
          </Form.Item>
        </Form>
      </React.Fragment>
    );
  }
}
