import React from 'react'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {sagaSyncModel} from '../Fetcher/saga-sync'
import Fetch from '../../common/fetch-final'
import _ from 'lodash'
import {TreeSelect} from 'antd'
import {isDiffByPath} from '../../../common/sugo-utils'

const {TreeNode} = TreeSelect

const namespace = 'departments-picker'
export const departmentsSagaModelGenerator = ns => props => {
  if (props.reuseSagaModel || props.hasOwnProperty('departments')) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'departments',
      getEffect: async () => {
        let res = await Fetch.get('/app/contact/departments')
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/contact/departments', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/contact/departments/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/contact/departments/${model.id}`)
      }
    }
  )
}

export function makeTree(departments) {
  let treeNodes = _(departments).orderBy('created_at', 'asc').map(k => ({
    key: k.id,
    title: k.name,
    parentId: k.parent_id,
    children: []
  })).value()
  let treeNodeDict = _.keyBy(treeNodes, 'key')
  return treeNodes.reduce((arr, k) => {
    if (k.parentId) {
      let parent = treeNodeDict[k.parentId]
      parent.children.push(k)
      return arr
    }
    arr.push(k)
    return arr
  }, [])
}


let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  return {
    ...modelState
  }
}
@connect(mapStateToProps)
@withRuntimeSagaModel(departmentsSagaModelGenerator(namespace))
export default class DepartmentPicker extends React.Component {
  state = {
    gData: [],
    expandedKeys: []
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'departments')) {
      const {departments} = this.props
      this.setState({
        gData: makeTree(departments || []),
        expandedKeys: _.uniq((departments || []).map(d => d.parent_id))
      })
    }
  }
  
  loop = data => {
    return data.map(item => {
      if (item.children && item.children.length) {
        return (
          <TreeNode key={item.key} title={item.title} value={item.key}>
            {this.loop(item.children)}
          </TreeNode>
        )
      }
      return <TreeNode key={item.key} title={item.title} value={item.key}/>
    })
  }
  
  render() {
    const {expandedKeys, gData} = this.state
    const { disabled } = this.props
    return (
      <TreeSelect
        showSearch
        disabled={disabled}
        style={{ width: 300 }}
        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
        placeholder="请选择部门"
        allowClear
        multiple
        treeDefaultExpandAll
        treeExpandedKeys={expandedKeys}
        onTreeExpand={expandedKeys => this.setState({ expandedKeys })}
        {...this.props}
      >
        {this.loop(gData)}
      </TreeSelect>
    )
  }
}
