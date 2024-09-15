import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import PropTypes  from 'prop-types'
import { Table, Button, Tooltip, Input, Form, Select } from 'antd'
import { DeleteOutlined, PlusOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons'
import _ from 'lodash'
import { getIdBuff, getColumnsKeys } from './utils'
import { COMMON_OPERATION, CALA_TEXT, PREFIX } from './const'
import './dynamic-table.styl'

const { Item } = Form
const { Option } = Select

/**
 * 
 * 已抽取为通用组件, 后期根据其他模块是否使用进行优化
 * 使用 forwardRef 构建组件, 外部可配合useRef使用, 对Table表单进行操作
 * 对外暴露 getData, setData
 * 基本功能是根据原始数据(originList)进行 Table 表单初始化, 之后可在其基础上进行
 * 1. 增/减 记录
 * 2. 整行编辑/保存 --> 每个 Table 单元格中的内容
 * 3. 支持编辑禁用模式, 禁用 配置了禁用状态的单元格
 * 4. 支持新增单元格默认值
 *    配置格式: 
 *    columns = [{
 *      ...otherConfig,
 *      componentConfig: {
 *        cannotEdit: true，
 *        defaultValue: 'default'
 *      }
 *    }]
 * 5. 默认表单项为 Input, 目前额外支持 Select
 * 
 */
const DynamicTable = forwardRef((props, ref) => {

  const { columns, originList, editMode = false, ...rest } = props
  const [form] = Form.useForm()
  const [list, setList] = useState([])

  useEffect(() => {
    setList(getIdBuff(originList))
  }, [originList])

  useImperativeHandle(ref, () => ({
    getData: () => list,
    setData: (data) => setList(data)
  }))

  // 添加/删除 行
  const onCalcList = (action, index) => {
    const tempList = _.cloneDeep(list)
    if(action === CALA_TEXT.add) {
      const newRow = getNewRow()
      const newIndex = tempList.push(newRow) - 1
      setCurFormVal(newRow.id, newIndex, tempList)
    } else if(action === CALA_TEXT.subtract) {
      const keys = _.filter(_.keys(form.getFieldsValue()), attr => !~attr.indexOf(`-${index}`))
      const formData = _.pick(_.cloneDeep(form.getFieldsValue()), keys)
      form.setFieldsValue(formData)
      tempList.splice(index, 1)
    }
    return setList(tempList)
  }

  //  行 编辑/显示 模式
  const onModeChange = async (isEdit, index, id) => {
    const columnKeys = getColumnsKeys(columns)
    if(!isEdit) {
      const tempList = _.cloneDeep(list)
      _.set(tempList, `[${index}].edit`, !isEdit)
      setCurFormVal(id, index, tempList)
      return setList(tempList)
    }
    try {
      const res = await form.validateFields(_.map(columnKeys, key => key + '-' + id))
      const keys = _.keys(res)
      const listData = _.reduce(keys, (acc, cur) => {
        acc[cur.split('-')[0]] = res[cur]
        return acc
      }, {})
      const tempList = _.cloneDeep(list)  
      tempList.splice(index, 1, {
        ...tempList[index],
        ...listData,
        edit: false
      })
      setList(tempList)
    } catch (e) {
      console.error(e)
    }
  }

  // 根据配置 type, 得到对应的表单项, 后期在这里扩展
  const getCurFormComponent = (type, disabled, config) => {
    const { options } = config
    switch(type) {
      case 'select':
        return (
          <Select disabled={disabled}>
            {
              _.map(options, option => {
                return <Option value={option.value} key={option.value}>{option.label}</Option>
              })
            }
          </Select>
        )
      default:
        return <Input disabled={disabled} />
    }
  }
  
  const getColumns = () => {
    const buffItems = _.cloneDeep(columns).concat(COMMON_OPERATION)
    return buffItems.map(item => {
      const { itemConfig = {}, componentConfig = {}, type, ...rest } = item
      let buffItem = { 
        ...rest,
        className: `${PREFIX}-table-${item.dataIndex}`,
        render: (text, record, index) => {
          const disabled = editMode && record.origin && componentConfig.cannotEdit
          return record.edit ? (
            <Item 
              name={`${item.dataIndex}-${record.id}`} 
              rules={[{ required: true, message: `请输入${item.title}` }]}
              {...itemConfig}
            >
              {getCurFormComponent(type, disabled, componentConfig)}
            </Item>
          ) : text
        }
      } 
      if(item.dataIndex === 'operation') {
        buffItem.render = (text, record, index) => {
          if(index >= list.length) {
            return ({ props: { colSpan: 0 } })
          }
          return (
            <>
              <Tooltip title={record.edit ? '保存' : '编辑'}>
                <Button
                  type='link'
                  className='pd1x'
                  onClick={() => onModeChange(record.edit, index, record.id)} 
                >
                  {record.edit ? <CheckOutlined  /> : <EditOutlined />}
                </Button>
              </Tooltip>
              <Tooltip title='删除'>
                <Button 
                  danger
                  type='link'
                  className='pd1x'
                  onClick={() => onCalcList(CALA_TEXT.subtract, index)} 
                >
                  <DeleteOutlined/>
                </Button>
              </Tooltip>
            </>
          )
        }
      }
      return buffItem
    })
  }

  const getFooter = () => {
    return (
      <Button 
        type='dashed' 
        icon={<PlusOutlined />} 
        onClick={() => onCalcList(CALA_TEXT.add)}
      >点击添加新内容</Button>
    )
  }

  const getNewRow = () => {
    const colHaveDefaultVal = _.filter(columns, column => _.get(column, 'componentConfig.defaultValue') !== undefined)
    return { 
      id: new Date().valueOf(), 
      edit: true,
      ..._.reduce(colHaveDefaultVal, (acc, cur) => {
        acc[cur.dataIndex] = _.get(cur, 'componentConfig.defaultValue')
        return acc
      }, {})
    }
  }

  const setCurFormVal = (id, index, tempArr) => {
    form.setFieldsValue({
      ...form.getFieldsValue(),
      ..._.reduce(getColumnsKeys(columns), (acc, cur) => {
        acc[cur + '-' + id] = tempArr[index][cur]
        return acc
      }, {})
    })
  }
  
  return (
    <Form form={form}>
      <Table
        rowKey={'id'}
        className={`dynamic-table ${PREFIX}-table`}
        dataSource={list}
        columns={getColumns()}
        pagination={false}
        footer={getFooter}
        size='small'
        {...rest}
      />
    </Form>
  )
})

DynamicTable.propTypes = {
  columns: PropTypes.array.isRequired,
  originList: PropTypes.array.isRequired,
  editMode: PropTypes.bool
}

export default DynamicTable
