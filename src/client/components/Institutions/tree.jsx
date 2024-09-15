import React, {Fragment} from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Tree, Input } from 'antd'
import ImportFile from './import-file'

const { TreeNode } = Tree
const { Search } = Input

const DictionaryTree = ({
  data= [],
  details,
  importFile,
  hidenImportModal,
  modalVisible,
  id: selectId
}) => {
  const [id, setId] = React.useState()
  const [, setLevel] = React.useState()
  const [treeData, setTreeData] = React.useState(data)
  const [expandedKeys, setExpandedKeys] = React.useState([])
  React.useEffect(()=>{
    updateTreeData([...data])
    // setTreeData([...data])
    let defaultExpandedKeys = _.reduce(data, (r, v) => {
      r.push(v.key)
      r = _.concat(r, _.get(v, 'children', []).map(p => p.key))
      return r
    }, [])
    setExpandedKeys(defaultExpandedKeys)
  }, [data])


  
  const change = (value) => {
    const newTree = []
    if (value) {
      filterNode(data, value, newTree)
      // setTreeData(newTree)
      updateTreeData(newTree)
    } else {
      // setTreeData([...data])
      updateTreeData([...data])
    }
    let getData = value ? newTree : data
    let defaultExpandedKeys = _.reduce(getData, (r, v) => {
      r.push(v.key)
      r = _.concat(r, _.get(v, 'children', []).map(p => p.key))
      return r
    }, [])
    setExpandedKeys(defaultExpandedKeys)
  }

 

  const filterNode = (tree, inputValue, rusult) => {
    for(let i=0; i<tree.length; i+=1) {
      const node = tree[i]
      const {name, key} = node
      if (node.children.length === 0) {
        if (name.indexOf(inputValue) !== -1 || key.indexOf(inputValue) !== -1) {
          rusult.push({...node, children: []})
        }
      } else {
        const children = node.children
        const newChildren = []
        if (name.indexOf(inputValue) !== -1 || key.indexOf(inputValue) !== -1) {
          rusult.push({...node, children: newChildren})
          filterNode(children, inputValue, newChildren)
        } else {
          filterNode(children, inputValue, newChildren)
          if(newChildren.length !== 0) {
            rusult.push({...node, children: newChildren})
          }
        }
      }
    } 
  }

  const renderTreeNodes = (data) => data.map((item) => {
    return item.children.length
      ? (
        <TreeNode
          level={item.level}
          title={`${item.name}`}
          key={`${item.key}`}
        >
          {item.children && renderTreeNodes(item.children)}
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

  const handleTreeSelect = ([id], e) =>{
    const { level } = e.node.props
    if (id) {
      checkNodeSelect(id, level)
    }
  }

  // 更新节点数据
  function updateTreeData(treeData = []) {
    const getId = _.get(treeData, [0, 'id'])
    if (!(selectId || id) && getId) {
      checkNodeSelect(getId)
    }
    setTreeData(treeData)
  }

  // 切换显示节点
  function checkNodeSelect(id, level) {
    setId(id)
    details({ id })
    setLevel(level)
  }

  return (
    <Fragment>
      <div>
        <div>
          <div className="bg-white">
            <div className="tag-types-title pd1b">
              <div className="fix">
                <div className="fleft">机构部门</div>
              </div>
            </div>
            <div className="ant-divider ant-divider-horizontal" style={{margin: '10px 0 15px 0'}} />
          </div>
        </div>
      </div>
      <Search style={{ marginBottom: 8 }} placeholder="搜索部门" onSearch={change} />
      {
        treeData.length
          ? <Tree
            selectedKeys={[id || selectId]}
            expandedKeys={expandedKeys}
            onSelect={handleTreeSelect}
            onExpand={(expandedKeys) => {
              setExpandedKeys(expandedKeys)
            }}
          >
            {renderTreeNodes(treeData)}
          </Tree >
          : null
      }
      <ImportFile importFile={importFile} visible={modalVisible} cancel={hidenImportModal} />
    </Fragment>
  )
}

DictionaryTree.propTypes  = {
  data: PropTypes.array,
  details: PropTypes.func,
  add: PropTypes.func,
  importFile: PropTypes.func
}

export default DictionaryTree
