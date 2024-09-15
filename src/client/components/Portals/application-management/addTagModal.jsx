import React, { useEffect, useState } from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, message, Modal, Select, Tree } from 'antd'
import _ from 'lodash'
import { batchAddTag, creatAppTagrelation } from './store/queryhelper'
import { makeTagTree, TAG_APP_ORDER_SAGA_MODEL_NS, TAG_ORDER_SAGA_MODEL_NS, TAGS_SAGA_MODEL_NS } from './store'
import { connect } from 'react-redux'
import { dictBy } from '../../../../common/sugo-utils'

const { Option } = Select
const { TreeNode } = Tree
const { Search } = Input

const getParentKey = (key, tree) => {
  let parentKey
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i]
    if (node.children) {
      if (node.children.some(item => item.name === key)) {
        parentKey = node.id
      } else if (getParentKey(key, node.children)) {
        parentKey = getParentKey(key, node.children)
      }
    }
  }
  return parentKey
}

async function submitForBatchOption(arg) {
  const { checkedKeys, appTagRelationData = {}, dispatch, props } = arg
  const { application = [], checkList = [] } = props
  //checkList 已选应用
  // checkedKeys 已选标签
  let newAppTagRelationData = []
  application.map(t => {
    if (_.includes(checkList, t.id)) {
      newAppTagRelationData.push(
        ...checkedKeys.map(item => {
          return { appId: t.id, tagId: item }
        })
      )
    }
    return t
  })

  const pre = appTagRelationData?.appTagRelation || []

  let app_tag = {}

  pre.map(i => {
    if (!checkList.includes(i.appId)) return
    if (!app_tag[i.appId]) app_tag[i.appId] = []
    app_tag[i.appId].push(i.tagId)
  })

  newAppTagRelationData = newAppTagRelationData.map(i => {
    if (!app_tag[i.appId]) app_tag[i.appId] = []
    if (!app_tag[i.appId].includes(i.tagId)) {
      app_tag[i.appId].push(i.tagId)
    }
  })

  const newArray = []
  for (let k in app_tag) {
    app_tag[k].map(i => {
      newArray.push({
        appId: k,
        tagId: i
      })
    })
  }

  let res = await batchAddTag({ data: newArray })
  if (!res.success) return message.error('标签修改失败')
  message.success('标签修改成功')
  dispatch({
    type: 'appTagRelation/fetch'
  })
  dispatch({
    type: `${TAGS_SAGA_MODEL_NS}/fetch`
  })
  dispatch({
    type: `${TAG_APP_ORDER_SAGA_MODEL_NS}/fetch`
  })
  dispatch({
    type: 'getAppTags/fetch'
  })
}

async function submit(arg) {
  const { preKeys, checkedKeys: preChecked, app, dispatch, tagAppOrder_tagId_map } = arg
  if (_.isEmpty(preKeys)) {
    preKeys.push('unTyped')
    preChecked.push('unTyped')
  }
  let checkedKeys = preChecked
  if (!preChecked) checkedKeys.push('unTyped')
  if (preChecked.length > 1) checkedKeys = checkedKeys.filter(i => i !== 'unTyped')

  //preKeys 该应用原来有哪些标签
  // checkedKeys 该应用 选中的标签ids [] 该数据已是最新 不需要另外处理 数据库根据该数据进行删减
  // add.id===
  // tagAppOrder_tagId_map 标签 应用排序

  // 需要整理出 该应用新增了哪些标签 删除了哪些标签 两个数组
  // 再根据这两个数据 修改 标签-应用排序 数组 tagAppOrder_tagId_map 增加或去掉该应用id
  //发3条请求

  const shouldDel = _.difference(preKeys, checkedKeys)
  const shouldAdd = _.difference(checkedKeys, preKeys)

  const shouldChange_tagAppOrderMap = {}
  shouldDel.map(i => {
    if (!tagAppOrder_tagId_map[i]) tagAppOrder_tagId_map[i] = []
    shouldChange_tagAppOrderMap[i] = tagAppOrder_tagId_map[i].filter(j => j !== app)
  })
  shouldAdd.map(i => {
    if (!tagAppOrder_tagId_map[i]) tagAppOrder_tagId_map[i] = []
    if (tagAppOrder_tagId_map[i].includes(app)) return
    shouldChange_tagAppOrderMap[i] = _.concat(tagAppOrder_tagId_map[i], app)
  })

  let res = await creatAppTagrelation({ shouldAdd, shouldDel, shouldChange_tagAppOrderMap, appId: app })

  if (res.msg !== 'success') return false
  dispatch({
    type: 'appTagRelation/fetch'
  })
  dispatch({
    type: `${TAGS_SAGA_MODEL_NS}/fetch`
  })
  dispatch({
    type: `${TAG_APP_ORDER_SAGA_MODEL_NS}/fetch`
  })
  dispatch({
    type: 'getAppTags/fetch'
  })
  message.success('提交成功')
  return true
}

//标签管理
function AddTagModal(props) {
  const { visible, handleCancel, cleanCheckList, batchOperation, checkList = [], app, tagList, tagOrders, tagAppOrder, appTagRelationData } = props

  const [checkedKeys, setcheckedKeys] = useState([])
  const [preKeys, setPreKeys] = useState([])
  const [expandedKeys, setExpandedKeys] = useState([])
  const [tagSearchVal, setTagSearchVal] = useState('')

  const { dispatch } = window.store

  const tagAppOrder_tagId_map = dictBy(
    tagAppOrder,
    tagAppOrder => tagAppOrder?.tagId,
    v => v?.appIdOrder
  )
  const tagListMap = _.keyBy(tagList, 'id')

  const tree = makeTagTree(tagList, tagOrders)

  useEffect(() => {
    if (checkList.length !== 1) {
      setExpandedKeys([])
      setcheckedKeys([])
      setPreKeys([])
      return
    }
    const tempArr = []
    const expanded = []
    const temp = appTagRelationData?.appTagRelation || []

    temp.map((i, idx) => {
      if (i.appId === checkList[0]) {
        tempArr.push(i.tagId)
        if (!tagListMap[i.tagId].parentId) return
        expanded.push(tagListMap[i.tagId].parentId)
      }
    })

    setExpandedKeys(expanded)
    setcheckedKeys(tempArr)
    setPreKeys(tempArr)
  }, [checkList.length])

  function recurTreeNode(item) {
    const index = item.name.indexOf(tagSearchVal)
    const beforeStr = item.name.substr(0, index)
    const afterStr = item.name.substr(index + tagSearchVal.length)
    const title =
      index > -1 ? (
        <span>
          {beforeStr}
          <span style={{ color: '#f50' }}>{tagSearchVal}</span>
          {afterStr}
        </span>
      ) : (
        <span>{item.name}</span>
      )

    return (
      <TreeNode title={title} key={item.id}>
        {(item?.children || []).map(i => recurTreeNode(i))}
      </TreeNode>
    )
  }

  return (
    <Modal
      width='654px'
      bodyStyle={{
        height: '530px',
        overflowY: 'scroll'
      }}
      maskClosable={false}
      visible={visible}
      title={'选择应用标签'}
      okText='提交'
      cancelText='取消'
      onCancel={() => {
        handleCancel()
        setcheckedKeys([])
        setTagSearchVal('')
        setExpandedKeys([])
      }}
      onOk={async () => {
        if (batchOperation) {
          // !!只有多选模式才判断有没有选 单选可以不选标签
          if (_.isEmpty(checkedKeys)) return message.error('没选择任何标签')
          await submitForBatchOption({
            checkedKeys,
            appTagRelationData,
            dispatch,
            props
          })
          handleCancel()
          setTagSearchVal('')
          cleanCheckList()
        } else {
          let msg = await submit({ preKeys, checkedKeys, app: checkList[0], tagAppOrder_tagId_map, dispatch })
          if (!msg) {
            return message.error('提交失败')
          }
          handleCancel()
          setTagSearchVal('')
          cleanCheckList()
        }
      }}
    >
      <React.Fragment>
        <Search
          className='my-tag-search'
          allowClear
          placeholder='输入标签名称'
          style={{ fontSize: '14px' }}
          size='large'
          onChange={e => setTagSearchVal(e.target.value)}
          value={tagSearchVal}
          onSearch={value => {
            const expandedKeys = tagList
              .map(item => {
                if (item.name.indexOf(value) > -1) {
                  return getParentKey(item.name, tree)
                }
                return null
              })
              .filter((item, i, self) => item && self.indexOf(item) === i)

            let temp = []
            function findParent(i) {
              if (tagListMap[i]?.parentId) {
                temp.push(tagListMap[i]?.parentId)
                findParent(tagListMap[i]?.parentId)
              }
            }
            expandedKeys.map(i => {
              temp.push(i)
              findParent(i)
            })
            temp = _.union(temp)
            setTagSearchVal(value)
            setExpandedKeys(temp)
          }}
        />
        <Tree
          checkable
          checkStrictly
          expandedKeys={expandedKeys}
          checkedKeys={checkedKeys}
          onCheck={e => {
            setcheckedKeys(e.checked)
          }}
          onExpand={(e, { node }) => {
            let target = node.props.eventKey
            let next = []
            if (expandedKeys.includes(target)) {
              next = expandedKeys.filter(i => i !== target)
              return setExpandedKeys(next)
            }
            return setExpandedKeys(_.concat(expandedKeys, target))
          }}
        >
          {tree.filter(i => i.id !== 'unTyped').map(i => recurTreeNode(i))}
        </Tree>
      </React.Fragment>
    </Modal>
  )
}

export default _.flow([
  connect(state => {
    return {
      tagList: _.get(state, [TAGS_SAGA_MODEL_NS, 'applicationTags']),
      tagOrders: _.get(state, [TAG_ORDER_SAGA_MODEL_NS, 'tagOrders']) || [],
      tagAppOrder: _.get(state, [TAG_APP_ORDER_SAGA_MODEL_NS, 'tagAppOrders']) || [],
      appTagRelationData: (state && state.appTagRelation) || []
    }
  }),
  Form.create()
])(AddTagModal)
