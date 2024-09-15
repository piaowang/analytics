import React, { useState } from 'react'
import { DeleteOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, message, Modal, Select, Table } from 'antd'
import _ from 'lodash'
import { immutateUpdate, move } from '../../../common/sugo-utils'
import './model-output-column-editor.styl'
import { withSizeProvider } from '../Common/size-provider'
import { VisualModelCalcTypeEnum } from '../../../common/constants'
import DruidColumnType from '../../../common/druid-column-type'
import OptionalWrapper from './optional-wrapper'
import { guessDruidStrTypeByDbDataType, timestampFormatForHive } from '../../../common/offline-calc-model-helper'
import HoverHelp from '../Common/hover-help'
import { Anchor } from '../Common/anchor-custom'

function allowDrop(ev) {
  ev.preventDefault()
}

const colWidth = 200
const { Option } = Select

@withSizeProvider
export default class ModelOutputColumnEditor extends React.Component {
  state = {
    editing: false,
    editValue: ''
  }

  onDragStart = ev => {
    let pos = ev.target.getAttribute('data-index')
    ev.dataTransfer.setData('text', `outputCol:${pos}`)
  }

  onDrop = ev => {
    let { value, onChange } = this.props
    ev.preventDefault()
    let data = ev.dataTransfer.getData('text')
    if (!_.startsWith(data, 'outputCol:')) {
      return
    }
    let toPos = ev.target.getAttribute('data-index')
    let [, fromPos] = data.split(':')
    onChange(move(value || [], +fromPos, +toPos))
  }

  // requestNewName = ev => {
  //   let {value, onChange, idxIdDict} = this.props
  //   let pos = ev.target.getAttribute('data-pos')
  //   let {dimId, renameTo, idxId} = _.get(value, pos)
  //   let currName = renameTo || (dimId ? dimId.split('/')[1] : _.get(idxIdDict, [idxId, 'name']))
  //   let newName = currName
  //   Modal.confirm({
  //     title: '请输入新名称',
  //     content: (
  //       <Input
  //         defaultValue={currName}
  //         onChange={ev => {
  //           let {value} = ev.target
  //           newName = value
  //         }}
  //       />
  //     ),
  //     okText: '确认',
  //     cancelText: '取消',
  //     onOk: async () => {
  //       if (!newName) {
  //         message.warn('无法重命名到空名称')
  //         throw new Error('无法重命名到空名称')
  //       }
  //       if (!/^[a-z_]\w+$/i.test(newName)) {
  //         message.warn('只能输入英文字母、下划线和数字，首字符不能为数字')
  //         throw new Error('只能输入英文字母、下划线和数字，首字符不能为数字')
  //       }
  //       onChange(immutateUpdate(value, [pos, 'renameTo'], () => newName))
  //     }
  //   })
  // }

  submitRename = async ev => {
    let { value, onChange } = this.props
    let pos = ev.target.getAttribute('data-pos')
    const { editValue } = this.state
    if (!editValue) {
      message.warn('无法重命名到空名称')
      throw new Error('无法重命名到空名称')
    }
    if (!/^[a-z_]\w+$/i.test(editValue)) {
      message.warn('只能输入英文字母、下划线和数字，首字符不能为数字')
      throw new Error('只能输入英文字母、下划线和数字，首字符不能为数字')
    }
    if (editValue.length > 20) {
      message.warn('不能超过20个字符')
      throw new Error('不能超过20个字符')
    }
    onChange(immutateUpdate(value, [pos, 'renameTo'], () => editValue))
    this.setState({
      editing: false
    })
  }

  typeCastingConfigureForm = props => {
    let { fieldType, onChange, value } = props
    let [tempState, setTempState] = useState(value)
    const formItemLayout = {
      labelCol: { span: 8 },
      wrapperCol: { span: 16 }
    }
    let srcDruidType = _.capitalize(guessDruidStrTypeByDbDataType(fieldType))
    let validDruidTypeDict = _.pickBy(DruidColumnType, v => {
      return v !== DruidColumnType.DateString && v !== DruidColumnType.Text && v < DruidColumnType.BigDecimal
    })
    return (
      <Form>
        <Form.Item label='原类型' {...formItemLayout} style={{ marginBottom: '8px' }}>
          {fieldType}
        </Form.Item>

        <Form.Item label='类型转换' {...formItemLayout} style={{ marginBottom: '8px' }}>
          <OptionalWrapper
            ctrlComponent={Select}
            value={tempState.castTo}
            initialValue={_.findKey(validDruidTypeDict, (v, k) => k !== srcDruidType)}
            onChange={nextCastToType => {
              const nextTempState = {
                ...tempState,
                castTo: nextCastToType,
                /* 因为不知道 hive insert 时的日期格式规范，所以暂定中间表始终使用 iso 格式的字符串 */
                parseDateFormat: (srcDruidType === 'String' && nextCastToType === 'Date') || srcDruidType === 'Date' ? timestampFormatForHive : undefined,
                castToDateFormat: srcDruidType === 'Date' && nextCastToType === 'String' ? timestampFormatForHive : undefined
              }
              delete nextTempState.isMainTimeDim
              setTempState(nextTempState)
              onChange(nextTempState)
            }}
          >
            {Object.keys(validDruidTypeDict).map(k => {
              return (
                <Option key={k} disabled={k === srcDruidType} title={k === srcDruidType ? '不能转换为原类型' : undefined}>
                  {k}
                </Option>
              )
            })}
          </OptionalWrapper>
        </Form.Item>

        {/* 因为不知道 hive insert 时的日期格式规范，所以暂定中间表始终使用 iso 格式的字符串 */}
        {(srcDruidType === 'String' && tempState.castTo === 'Date') || srcDruidType === 'Date' ? (
          <Form.Item
            label={
              <HoverHelp
                addonBefore='解析日期格式 '
                content={
                  <Anchor target='_blank' href='https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html'>
                    查看语法文档
                  </Anchor>
                }
              />
            }
            {...formItemLayout}
            style={{ marginBottom: '8px' }}
          >
            <Input
              value={tempState.parseDateFormat}
              onChange={ev => {
                let { value } = ev.target
                const nextTempState = { ...tempState, parseDateFormat: value }
                setTempState(nextTempState)
                onChange(nextTempState)
              }}
              placeholder='请输入日期解析格式'
            />
          </Form.Item>
        ) : null}

        {srcDruidType === 'Date' && tempState.castTo === 'String' ? (
          <Form.Item
            label={
              <HoverHelp
                addonBefore='日期格式化 '
                content={
                  <Anchor target='_blank' href='https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html'>
                    查看语法文档
                  </Anchor>
                }
              />
            }
            {...formItemLayout}
            style={{ marginBottom: '8px' }}
          >
            <Input
              value={tempState.castToDateFormat}
              onChange={ev => {
                let { value } = ev.target
                const nextTempState = { ...tempState, castToDateFormat: value }
                setTempState(nextTempState)
                onChange(nextTempState)
              }}
              placeholder='请输入日期格式化格式'
            />
          </Form.Item>
        ) : null}
      </Form>
    )
  }

  onConfigTypeCasting = ev => {
    let { value, onChange, tableIdDict } = this.props
    let pos = ev.target.getAttribute('data-pos')
    // [{dimId: 'tableId/field', renameTo: 'xx', castTo, parseDateFormat, castToDateFormat}]
    const outputCol = _.get(value, pos)
    let { dimId, renameTo, omitInGroupByMode } = outputCol

    let [tableId, fieldName] = dimId.split('/')
    let table = tableIdDict[tableId]
    let field = _.find(_.get(table.params, 'fieldInfos') || [], f => f.field === fieldName)
    const fieldType = field && field.type

    let nextOutputCol = outputCol
    let TypeCastingConfigureForm = this.typeCastingConfigureForm
    Modal.confirm({
      title: '设置类型转换',
      content: (
        <TypeCastingConfigureForm
          fieldType={fieldType}
          value={outputCol}
          onChange={o => {
            nextOutputCol = o
          }}
        />
      ),
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        onChange(immutateUpdate(value, [pos], () => ({ dimId, renameTo, omitInGroupByMode, ...nextOutputCol })))
      }
    })
  }

  typeCastingConfigureForm = props => {
    let { fieldType, onChange, value } = props
    let [tempState, setTempState] = useState(value)
    const formItemLayout = {
      labelCol: { span: 8 },
      wrapperCol: { span: 16 }
    }
    let srcDruidType = _.capitalize(guessDruidStrTypeByDbDataType(fieldType))
    let validDruidTypeDict = _.pickBy(DruidColumnType, v => {
      return v !== DruidColumnType.DateString && v !== DruidColumnType.Text && v < DruidColumnType.BigDecimal
    })
    return (
      <Form>
        <Form.Item label='原类型' {...formItemLayout} style={{ marginBottom: '8px' }}>
          {fieldType}
        </Form.Item>

        <Form.Item label='类型转换' {...formItemLayout} style={{ marginBottom: '8px' }}>
          <OptionalWrapper
            ctrlComponent={Select}
            value={tempState.castTo}
            initialValue={_.findKey(validDruidTypeDict, (v, k) => k !== srcDruidType)}
            onChange={nextCastToType => {
              const nextTempState = {
                ...tempState,
                castTo: nextCastToType,
                /* 因为不知道 hive insert 时的日期格式规范，所以暂定中间表始终使用 iso 格式的字符串 */
                parseDateFormat: (srcDruidType === 'String' && nextCastToType === 'Date') || srcDruidType === 'Date' ? timestampFormatForHive : undefined,
                castToDateFormat: srcDruidType === 'Date' && nextCastToType === 'String' ? timestampFormatForHive : undefined
              }
              delete nextTempState.isMainTimeDim
              setTempState(nextTempState)
              onChange(nextTempState)
            }}
          >
            {Object.keys(validDruidTypeDict).map(k => {
              return (
                <Option key={k} disabled={k === srcDruidType} title={k === srcDruidType ? '不能转换为原类型' : undefined}>
                  {k}
                </Option>
              )
            })}
          </OptionalWrapper>
        </Form.Item>

        {/* 因为不知道 hive insert 时的日期格式规范，所以暂定中间表始终使用 iso 格式的字符串 */}
        {(srcDruidType === 'String' && tempState.castTo === 'Date') || srcDruidType === 'Date' ? (
          <Form.Item
            label={
              <HoverHelp
                addonBefore='解析日期格式 '
                content={
                  <Anchor target='_blank' href='https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html'>
                    查看语法文档
                  </Anchor>
                }
              />
            }
            {...formItemLayout}
            style={{ marginBottom: '8px' }}
          >
            <Input
              value={tempState.parseDateFormat}
              onChange={ev => {
                let { value } = ev.target
                const nextTempState = { ...tempState, parseDateFormat: value }
                setTempState(nextTempState)
                onChange(nextTempState)
              }}
              placeholder='请输入日期解析格式'
            />
          </Form.Item>
        ) : null}

        {srcDruidType === 'Date' && tempState.castTo === 'String' ? (
          <Form.Item
            label={
              <HoverHelp
                addonBefore='日期格式化 '
                content={
                  <Anchor target='_blank' href='https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html'>
                    查看语法文档
                  </Anchor>
                }
              />
            }
            {...formItemLayout}
            style={{ marginBottom: '8px' }}
          >
            <Input
              value={tempState.castToDateFormat}
              onChange={ev => {
                let { value } = ev.target
                const nextTempState = { ...tempState, castToDateFormat: value }
                setTempState(nextTempState)
                onChange(nextTempState)
              }}
              placeholder='请输入日期格式化格式'
            />
          </Form.Item>
        ) : null}
      </Form>
    )
  }

  onConfigTypeCasting = ev => {
    let { value, onChange, tableIdDict } = this.props
    let pos = ev.target.getAttribute('data-pos')
    // [{dimId: 'tableId/field', renameTo: 'xx', castTo, parseDateFormat, castToDateFormat}]
    const outputCol = _.get(value, pos)
    let { dimId, renameTo, omitInGroupByMode } = outputCol

    let [tableId, fieldName] = dimId.split('/')
    let table = tableIdDict[tableId]
    let field = _.find(_.get(table.params, 'fieldInfos') || [], f => f.field === fieldName)
    const fieldType = field && field.type

    let nextOutputCol = outputCol
    let TypeCastingConfigureForm = this.typeCastingConfigureForm
    Modal.confirm({
      title: '设置类型转换',
      content: (
        <TypeCastingConfigureForm
          fieldType={fieldType}
          value={outputCol}
          onChange={o => {
            nextOutputCol = o
          }}
        />
      ),
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        onChange(immutateUpdate(value, [pos], () => ({ dimId, renameTo, omitInGroupByMode, ...nextOutputCol })))
      }
    })
  }

  removeByPos = pos => {
    let { value, onChange } = this.props
    onChange(_.filter(value, (oc, i) => i !== pos))
  }

  renderOutputColumnsOrigin = () => {
    let { offlineCalcTables, idxIdDict, value, onChange, disabled } = this.props
    // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]

    const cols = _.map(value, (oc, i) => {
      let { dimId, renameTo, idxId } = oc
      if (dimId) {
        let [tableId, fieldName] = dimId.split('/')
        let table = _.find(offlineCalcTables, t => t.id === tableId)
        if (!table) {
          return null
        }
        return {
          title: (
            <div
              className='output-col elli alignright hover-display-trigger'
              draggable={!disabled}
              data-index={i}
              onDragStart={this.onDragStart}
              onDrop={this.onDrop}
              onDragOver={allowDrop}
            >
              <span className='fleft ignore-mouse'>{`${fieldName}（${table.title || table.name}）`}</span>
              {disabled ? null : <DeleteOutlined className='pointer hover-display-iblock color-red' onClick={() => this.removeByPos(i)} />}
            </div>
          ),
          dataIndex: 'rowFor',
          width: colWidth,
          key: i,
          render: (rowFor, record) => {
            if (rowFor === 'renameTo') {
              if (disabled) {
                return renameTo || fieldName
              }
              return (
                <a className='pointer' onClick={this.requestNewName} data-pos={i}>
                  {renameTo || fieldName}
                </a>
              )
            }
            if (rowFor === 'dataType') {
              let table = _.find(offlineCalcTables, t => t.id === tableId)
              let field = table && _.find(_.get(table.params, 'fieldInfos') || [], f => f.field === fieldName)
              return field && field.type
            }
            return 'error'
          }
        }
      }

      if (idxId) {
        let idx = idxIdDict[idxId]
        return (
          idx && {
            title: (
              <div
                className='output-col elli alignright hover-display-trigger'
                draggable={!disabled}
                data-index={i}
                onDragStart={this.onDragStart}
                onDrop={this.onDrop}
                onDragOver={allowDrop}
              >
                <span className='fleft ignore-mouse'>{idx.title ? `${idx.name}（${idx.title}）` : idx.name}</span>
                {disabled ? null : <DeleteOutlined className='pointer hover-display-iblock color-red' onClick={() => this.removeByPos(i)} />}
              </div>
            ),
            dataIndex: 'rowFor',
            width: colWidth,
            key: i,
            render: (rowFor, record) => {
              if (rowFor === 'renameTo') {
                if (disabled) {
                  return renameTo || idx.name
                }
                return (
                  <a className='pointer' onClick={this.requestNewName} data-pos={i}>
                    {renameTo || idx.name}
                  </a>
                )
              }
              if (rowFor === 'dataType') {
                return 'NUMBER'
              }
              return 'error'
            }
          }
        )
      }

      return null
    })
    console.log(cols, 'cols===')
    return [
      {
        title: '输出列：',
        dataIndex: 'rowFor',
        width: 100,
        key: 'desc',
        render: (rowFor, record) => {
          if (rowFor === 'renameTo') {
            return '重命名：'
          }
          if (rowFor === 'dataType') {
            return '数据类型：'
          }
          return 'error'
        }
      },
      ...cols
    ].filter(_.identity)
  }

  renderOutputColumns = () => {
    let { tableIdDict = {}, idxIdDict = {}, value, showValue, disabled, calcType } = this.props
    const { editing, editValue } = this.state
    // [{dimId: 'tableId/field', renameTo: 'xx', castTo: 'xx', parseDateFormat, castToDateFormat}, {idxId: 'xxx', renameTo: 'xxx'}]

    if (showValue === 'all') {
      return this.renderOutputColumnsOrigin()
    }

    const isCalcTypeEqGroupBy = calcType === VisualModelCalcTypeEnum.GroupBy
    const cols = _.map(value, (oc, i) => {
      let { dimId, renameTo, idxId, omitInGroupByMode, castTo } = oc
      if (isCalcTypeEqGroupBy && omitInGroupByMode) {
        return null
      }

      if (dimId && showValue === 'indicesModel') {
        let [tableId, fieldName] = dimId.split('/')
        let table = tableIdDict[tableId] || { id: tableId, name: '(维表已删除)' }
        return {
          title: (
            <div
              className='output-col elli hover-display-trigger relative'
              draggable={!disabled}
              data-index={i}
              onDragStart={this.onDragStart}
              onDrop={this.onDrop}
              onDragOver={allowDrop}
            >
              <div className='itblock ignore-mouse elli' style={{ maxWidth: `${colWidth}px`, padding: '0 8px' }}>{`${fieldName}（${table.title || table.name}）`}</div>
              {disabled ? null : (
                <DeleteOutlined className='absolute pointer hover-display-iblock color-red' style={{ top: '10px', right: '10px' }} onClick={() => this.removeByPos(i)} />
              )}
            </div>
          ),
          dataIndex: 'rowFor',
          width: colWidth,
          key: i,
          render: (rowFor, record) => {
            if (rowFor === 'renameTo') {
              if (disabled) {
                return renameTo || fieldName
              }
              return editing === i ? (
                <Input
                  value={editValue}
                  autoFocus
                  onChange={e =>
                    this.setState({
                      editValue: e.target.value
                    })
                  }
                  data-pos={i}
                  onPressEnter={this.submitRename}
                  onBlur={this.submitRename}
                />
              ) : (
                <a
                  className='pointer'
                  onClick={() => {
                    this.setState({
                      editing: i,
                      editValue: renameTo || fieldName
                    })
                  }}
                >
                  {renameTo || fieldName}
                </a>
              )
            }
            if (rowFor === 'dataType') {
              let table = tableIdDict[tableId]
              let field = table && _.find(_.get(table.params, 'fieldInfos') || [], f => f.field === fieldName)
              const fieldType = field && field.type
              if (!fieldType) {
                return '(维度已删除)'
              }
              return (
                // editing === i + 'value'
                // ?
                // <Input

                // />
                // :
                <a
                  className='pointer'
                  onClick={this.onConfigTypeCasting}
                  data-pos={i}
                  // onPressEnter={this.submitRename}
                  // onBlur={this.submitRename}
                  // onClick={() => {
                  //   this.setState({
                  //     editing: i + 'value',
                  //     editValue: castTo ? `${fieldType} -> ${castTo}` : fieldType
                  //   })
                  // }}
                >
                  {castTo ? `${fieldType} -> ${castTo}` : fieldType}
                </a>
              )
            }
            return 'error'
          }
        }
      }

      if (idxId && showValue === 'indices') {
        let idx = idxIdDict[idxId] || { id: idxId, name: '(指标已删除)' }
        return {
          title: (
            <div
              className='output-col elli hover-display-trigger relative'
              draggable={!disabled}
              data-index={i}
              onDragStart={this.onDragStart}
              onDrop={this.onDrop}
              onDragOver={allowDrop}
            >
              <div className='itblock ignore-mouse elli' style={{ maxWidth: `${colWidth}px`, padding: '0 8px' }}>
                {idx.title ? `${idx.name}（${idx.title}）` : idx.name}
              </div>
              {disabled ? null : (
                <DeleteOutlined className='absolute pointer hover-display-iblock color-red' style={{ top: '10px', right: '10px' }} onClick={() => this.removeByPos(i)} />
              )}
            </div>
          ),
          dataIndex: 'rowFor',
          width: colWidth,
          key: i,
          render: (rowFor, record) => {
            if (rowFor === 'renameTo') {
              if (disabled) {
                return renameTo || idx.name
              }
              return editing === i ? (
                <Input
                  value={editValue}
                  autoFocus
                  onChange={e =>
                    this.setState({
                      editValue: e.target.value
                    })
                  }
                  data-pos={i}
                  onPressEnter={this.submitRename}
                  onBlur={this.submitRename}
                />
              ) : (
                <a
                  className='pointer'
                  onClick={() => {
                    this.setState({
                      editing: i,
                      editValue: renameTo || idx.name
                    })
                  }}
                >
                  {renameTo || idx.name}
                </a>
              )
            }
            if (rowFor === 'dataType') {
              return 'NUMBER'
            }
            return 'error'
          }
        }
      }

      return null
    })
    return [
      {
        title: '输出列：',
        dataIndex: 'rowFor',
        width: 100,
        key: 'desc',
        render: (rowFor, record) => {
          if (rowFor === 'renameTo') {
            return '重命名：'
          }
          if (rowFor === 'dataType') {
            return '数据类型：'
          }
          return 'error'
        }
      },
      ...cols
    ].filter(_.identity)
  }

  render() {
    let { value, spWidth, disabled } = this.props
    // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]
    // 列宽比 100% 大的话，启用水平滚动
    const columns = _.isEmpty(value) ? [] : this.renderOutputColumns()
    let contentWidth = _.sum(columns.map(col => col.width || colWidth))
    return (
      <Table
        className={`model-output-column-editor${disabled ? '-disabled' : ''}`}
        size='small'
        bordered
        rowKey={(d, i) => i}
        dataSource={_.isEmpty(value) ? [] : [{ rowFor: 'renameTo' }, { rowFor: 'dataType' }]}
        columns={columns}
        pagination={false}
        scroll={contentWidth < spWidth ? undefined : { x: contentWidth }}
        locale={{
          emptyText: '暂无内容，请拖拽指标到中央的关系图或选择维表字段'
        }}
      />
    )
  }
}
