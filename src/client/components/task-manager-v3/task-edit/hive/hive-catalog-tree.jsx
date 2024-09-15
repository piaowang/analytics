import React, { useState, useEffect } from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import PubSub from 'pubsub-js'
import taskV3HiveModel, { namespace } from './hive-catalog-model'
import withRuntimeSagaModel from '../../../Common/runtime-saga-helper'
import { Tree, Spin, Input, Tooltip, Select } from 'antd'
import { DoubleRightOutlined } from '@ant-design/icons'
import { useMemo } from 'react'

function HiveCatalogTree(props) {
  const { treeData = [], loading = false, onSelectItem, dateInfo = [], id } = props
  const [defdbid, setDefdbid] = useState('')
  const [state, setState] = useState({
    expandedKeys: [], // 展开的key
    checkKeys: [], // 选中的key
    searchKey: '' // 搜索关键字
  })

  const onChangeDbid = dbid => {
    props.dispatch({
      type: `${namespace}/changeState`,
      payload: { loading: true }
    })
    props.dispatch({
      type: `${namespace}/getHiveCatalog`,
      payload: { dbInfoId: dbid }
    })
    setDefdbid(dbid)
    PubSub.publish(`hive.changeDbId.${id}`, dbid)
  }

  useEffect(() => {
    if (dateInfo.length > 0) {
      let defid = dateInfo[0]?.id
      onChangeDbid(defid)
    } else {
      props.dispatch({
        type: `${namespace}/changeState`,
        payload: { loading: false }
      })
    }
  }, [dateInfo])

  const handleOpenNode = key => {
    const [schem, table] = key.split('##')
    // 点击schem节点
    if (!table) {
      setState({
        ...state,
        expandedKeys: _.some(state.expandedKeys, p => p === key) ? state.expandedKeys.filter(p => p !== key) : [...state.expandedKeys, key]
      })
      return
    }
    // 已展开节点 则收缩
    if (_.some(state.expandedKeys, p => p === key)) {
      setState({ ...state, expandedKeys: state.expandedKeys.filter(p => p !== key) })
      return
    }
    // 获取字段结构
    props.dispatch({
      type: `${namespace}/getHiveTableFields`,
      payload: {
        tableName: table,
        dbName: schem
      }
    })
    setState({ ...state, expandedKeys: [...state.expandedKeys, key] })
  }

  /**
   * 单击节点处理
   * @param {*} id
   * @param {*} node
   */
  const handleSelect = (id, node) => {
    const key = _.get(node, 'node.key', '')
    const [, , field] = key.split('##')
    // 点击的是字段节点
    if (field) {
      onSelectItem(field)
      return
    }
    handleOpenNode(key)
  }

  const handleCheck = val => {
    setState({ ...state, checkKeys: val })
  }

  const handleBatchAddFields = () => {
    const val = state.checkKeys
      .map(p => {
        // 节点key为: schem##tablename##fieldname
        const [, , field] = p.split('##')
        return field
      })
      .join(',')
    onSelectItem(val)
    setState({ ...state, checkKeys: [] })
  }

  const handleSearchChange = _.debounce(val => {
    setState({ ...state, searchKey: val })
  }, 500)

  const handlerExpanded = (expandedKeys, { expanded, node }) => {
    const key = _.get(node, 'key', '')
    handleOpenNode(key)
  }

  const data = useMemo(() => {
    if (state.searchKey) {
      return treeData.filter(p => {
        // 过滤schem包含关键字或者表名包含关键字
        return _.includes(p.title, state.searchKey) || _.some(p.children, c => _.includes(c.title, state.searchKey))
      })
    }
    return treeData
  }, [treeData, state.searchKey])

  return (
    <Spin spinning={loading}>
      <div className='font16 bold pd1'>
        <div className='selBox'>
          <div className='width-70'>数据源</div>
          <Select
            style={{ margin: '10px 0', width: '100%' }}
            showSearch
            placeholder='请选择数据源'
            optionFilterProp='children'
            defaultValue={defdbid}
            value={defdbid}
            onChange={val => onChangeDbid(val)}
          >
            {dateInfo.map(p => (
              <Select.Option key={p.id} value={p.id}>
                {p.dbAlais}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div className='width-70 iblock'>数据目录</div>
        <div className='width-30 alignright iblock'>
          <Tooltip title='将选中的字段添加到编辑器中'>
            <DoubleRightOutlined onClick={handleBatchAddFields} />
          </Tooltip>
        </div>
      </div>
      <div className='pd1'>
        <Input placeholder='搜索...' onChange={e => handleSearchChange(e.target.value)} />
      </div>
      {!treeData.length || !defdbid ? (
        <div style={{ textAlign: 'center', lineHeight: '60px' }}>暂无数据~</div>
      ) : (
        <Tree
          treeData={data}
          expandedKeys={state.expandedKeys}
          onSelect={handleSelect}
          onCheck={handleCheck}
          checkedKeys={state.checkKeys}
          showIcon
          checkable
          onExpand={handlerExpanded}
        />
      )}
    </Spin>
  )
}

const withSaga = withRuntimeSagaModel(taskV3HiveModel)(HiveCatalogTree)
export default connect(state => ({ ...state[namespace] }))(withSaga)
