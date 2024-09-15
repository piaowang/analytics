import { Button, Checkbox, Input, Popover, Table, Tag } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { immutateUpdate } from 'common/sugo-utils'
import BreakPointSelect from './break-point-select'
import _ from 'lodash'
import './index.styl'

const { Search } = Input

/**
 * @description
 * 源数据表配置组件
 * @export
 * @param {any} props
 * @returns
 */
export function InputTablesSelect(props) {
  const { onChange, inputDsId, value = [], onOutputEdit } = props
  const handleChange = tableName => {
    const newVal = _.clone(value).filter(p => p.tableName !== tableName)
    onChange(newVal)
  }

  // 添加输出配置
  const handleAdd = tableName => {
    // 在 ./model.js 的 outputEdit 可以找到支持的类型
    onOutputEdit({ type: 'add', tableName: tableName, show: true })
    console.log('弹框展示原输出配置tab页')
  }

  const handlePOPClose = p => {
    onOutputEdit({ type: 'del', opId: p.opId })
    console.log('触发删除：', p)
  }
  const handlePOPClick = p => {
    onOutputEdit({ type: 'edit', ...p, show: true })
    console.log('要查看的输出配置：', p)
  }

  const handelChangeBreakPoint = values => {
    const index = _.findIndex(value, p => p.tableName === values.tableName)
    const val = immutateUpdate(value, index, () => values)
    onChange(val)
  }

  return (
    <Table
      columns={[
        { dataIndex: 'tableName', title: '表名' },
        { dataIndex: 'breakPoint', title: '配置', render: (v, obj) => <BreakPointSelect value={obj} onChange={handelChangeBreakPoint} inputDsId={inputDsId} /> },
        {
          dataIndex: 'partOutPut',
          title: '输出配置',
          render: (v, obj) => {
            return _.map(obj.partOutPut, p => (
              <div key={`tag-${p.id}`} style={{ maxWidth: '100%' }}>
                <Tag
                  style={{ cursor: 'pointer', display: 'inline-block', whiteSpace: 'normal' }}
                  key={p.opId}
                  closable
                  onClose={() => handlePOPClose(p)}
                  onClick={() => handlePOPClick(p)}
                >
                  {p.dbAlais}：{p.writerTable}
                </Tag>
              </div>
            ))
          }
        },
        {
          dataIndex: 'operation',
          title: '操作',
          render: (v, obj) => (
            <>
              <Button Button onClick={() => handleAdd(obj.tableName)} type='link'>
                添加输出配置
              </Button>
              <Button Button onClick={() => handleChange(obj.tableName)} type='link'>
                删除
              </Button>
            </>
          )
        }
      ]}
      size='small'
      dataSource={value}
      scroll={{ y: 'calc(100vh - 500px)' }}
      pagination={false}
    />
  )
}

export function InputTablesSelectButton(props) {
  const { onChange, tables = [], value = [], getPopupContainer } = props
  const [selectTables, setSelectTables] = useState([])
  const [searchKey, setSearchKey] = useState('')
  const [showSetPanel, setShowSetPanel] = useState(false)

  const hidePanel = function (e) {
    setShowSetPanel(false)
  }

  useEffect(() => {
    setSelectTables(value.map(p => p.tableName))
  }, [props.value])

  useEffect(() => {
    window.addEventListener('click', hidePanel)
    return () => {
      window.removeEventListener('click', hidePanel)
    }
  }, [])

  const handleOk = () => {
    const oldTables = value.map(p => p.tableName)
    const newData = _.difference(selectTables, oldTables).map(p => {
      return {
        tableName: p,
        breakPoint: null
      }
    })
    const oldData = value.filter(p => _.includes(selectTables, p.tableName))
    onChange([...oldData, ...newData])
    setShowSetPanel('')
    setSelectTables([])
    setShowSetPanel(false)
  }

  const handleChangeSearch = _.throttle(val => setSearchKey(val), 200)
  const handleCheck = val => {
    const has = _.includes(selectTables, val)
    if (has) {
      setSelectTables(selectTables.filter(p => p !== val))
      return
    }
    setSelectTables([...selectTables, val])
  }

  const data = useMemo(() => {
    if (searchKey) {
      return tables.filter(p => _.includes(p, searchKey))
    } else {
      return tables
    }
  }, [tables, searchKey])

  const handleSelectAll = checked => {
    if (checked) {
      setSelectTables(data)
    } else {
      setSelectTables([])
    }
  }

  const content = (
    <div onClick={e => e.stopPropagation()}>
      <div className='pd1'>
        <Search placeholder='查询表名' onChange={e => handleChangeSearch(e.target.value)} />
      </div>
      <div className='mg1'>
        <Checkbox checked={data.length === selectTables.length} onChange={e => handleSelectAll(e.target.checked)}>
          全选
        </Checkbox>
      </div>
      <div className='pd1 bordert borderb height200 overscroll-y always-display-scrollbar'>
        {data.map((p, idx) => {
          return (
            <div key={`ckb-${idx}`} className='mg1t'>
              <Checkbox checked={_.includes(selectTables, p)} disabled={_.some(value, v => v.tableName === p)} onChange={() => handleCheck(p)}>
                {p}
              </Checkbox>
            </div>
          )
        })}
      </div>
      <div className='alignright pd1'>
        <Button onClick={() => setShowSetPanel(false)}>取消</Button>
        <Button className='mg2l' onClick={handleOk} type='primary'>
          确定
        </Button>
      </div>
    </div>
  )

  return (
    <Popover placement='bottom' overlayClassName='break-point-tables-popover' content={content} visible={showSetPanel} getPopupContainer={getPopupContainer}>
      <Button
        onClick={e => {
          e.stopPropagation()
          setShowSetPanel(true)
        }}
      >
        添加
      </Button>
    </Popover>
  )
}
