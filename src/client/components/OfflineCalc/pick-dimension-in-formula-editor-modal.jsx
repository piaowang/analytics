import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Divider, Modal, Radio, Select } from 'antd';
import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {connect} from 'react-redux'
import {validateFieldsByForm} from '../../common/decorators'
import {immutateUpdate, isDiffByPath} from '../../../common/sugo-utils'
import DruidColumnType, {DruidType, isTimeDimension} from '../../../common/druid-column-type'
import OptionalWrapper from './optional-wrapper'
import OfflineCalcDimLookupMapEditor from './dim-lookup-map-editor'
import {OfflineCalcDimensionExtractableTimePartEnum} from '../../../common/constants'
import {guessDruidTypeByDbDataType} from '../../../common/offline-calc-model-helper'

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 19 }
}
const {Option} = Select

const namespace = 'offline-calc-tables-for-dim-picker'

let mapStateToProps = (state, ownProps) => {
  const tableList = state[namespace] || {}
  const dsList = state['offline-calc-data-sources-for-dim-picker'] || {}
  return {
    offlineCalcTables: tableList.offlineCalcTables,
    offlineCalcDataSources: dsList.offlineCalcDataSources
  }
}


@connect(mapStateToProps)
@Form.create()
export default class PickDimensionInFormulaEditorModal extends React.Component {
  static propTypes = {
    value: PropTypes.object, // {func: useDim | importDim, args: []}
    enableAfterProcess: PropTypes.bool
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'visible')) {
      if (this.props.visible) {
        this.props.form.setFieldsValue(this.props.value)
      } else {
        this.props.form.resetFields()
      }
    }
  }
  
  renderExistedDimensionPicker = () => {
    const { offlineCalcDimensions, value, dimFilter } = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    
    let filterByDsId = getFieldValue('args[0].dsId')
    let filteredDims = (offlineCalcDimensions || []).filter(d => {
      let pickThis = true
      if (dimFilter) {
        pickThis = pickThis && dimFilter(d)
      }
      if (filterByDsId === 'null' || !filterByDsId) {
        pickThis = pickThis && !d.data_source_id
      } else if (filterByDsId !== 'all') {
        pickThis = pickThis && d.data_source_id === filterByDsId
      }
      return pickThis
    })
    return (
      <Form.Item
        label="目标维度"
        {...formItemLayout}
      >
        {getFieldDecorator('args[0].dimId', {
          initialValue: _.get(value, 'args[0].dimId'),
          rules: [
            { required: true, message: '请选择维度' }
          ]
        })(
          <Select
            allowClear
            {...enableSelectSearch}
            onChange={() => {
              setFieldsValue({
                'args[0].castTo': null,
                'args[0].lookupMap': null
              })
            }}
          >
            {filteredDims.map(ds => {
              return (
                <Option key={ds.id} value={ds.id}>{ds.title || ds.name}</Option>
              )
            })}
          </Select>
        )}
      </Form.Item>
    )
  }
  
  renderDimensionImporter = () => {
    let {value, form, offlineCalcTables, fieldFilter = _.identity} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = form
    const dsIdInForm = getFieldValue('args[0].dsId')
    // 以前是从这两个接口读数据
    // `/app/offline-calc/data-sources/${dsIdInForm}/tables`
    // `/app/offline-calc/data-sources/${dsIdInForm}/tables/${getFieldValue('args[0].tableName')}`
    getFieldDecorator('args[0].dataType', {
      initialValue: _.get(value, 'args[0].dataType', DruidColumnType.String)
    })
    return (
      <React.Fragment>
        <Form.Item
          label="所属表"
          {...formItemLayout}
        >
          {getFieldDecorator('args[0].tableName', {
            initialValue: _.get(value, 'args[0].tableName'),
            rules: [
              { required: true, message: '请选择表名' }
            ]
          })(
            <Select
              allowClear
              {...enableSelectSearch}
              onChange={val => {
                // 清空字段项
                setFieldsValue({
                  'args[0].fieldName': null
                })
              }}
            >
              {(offlineCalcTables || []).filter(t => t.data_source_id === dsIdInForm)
                .map(table => {
                  let {name, title} = table
                  return (
                    <Option key={name} value={name}>{title || name}</Option>
                  )
                })}
            </Select>
          )}
        </Form.Item>
  
        <Form.Item
          label="所属字段"
          {...formItemLayout}
        >
          {getFieldDecorator('args[0].fieldName', {
            initialValue: _.get(value, 'args[0].fieldName'),
            rules: [
              { required: true, message: '请选择字段' }
            ]
          })(
            (() => {
              let tableName = getFieldValue('args[0].tableName')
              let fields = tableName
                ? _.get(_.find(offlineCalcTables, t => t.name === tableName), 'params.fieldInfos')
                : []
              return (
                <Select
                  allowClear
                  {...enableSelectSearch}
                  notFoundContent={_.includes(`${fieldFilter}`, 'NUMBER') ? '没有数值维度' : '暂无内容'}
                  onChange={val => {
                    let field = _.find(fields, f => f.field === val)
                    // 因为使用现有维度的话，类型可能会改，所以只在使用 druid 维度时保存类型
                    // TODO fix desc table not return real type, DruidType => DruidNativeType
                    let dataType = null
                    if (field) {
                      dataType = guessDruidTypeByDbDataType(field.type)
                    }
                    setFieldsValue({
                      'args[0].dataType': dataType,
                      'args[0].castTo': null,
                      'args[0].lookupMap': null
                    })
                  }}
                >
                  {(fields || []).filter(f => !f.hide).filter(fieldFilter).map(fieldObj => {
                    return (
                      <Option
                        key={fieldObj.field}
                        value={fieldObj.field}
                      >{fieldObj.field}</Option>
                    )
                  })}
                </Select>
              )
            })()
          )}
        </Form.Item>
      </React.Fragment>
    )
  }
  
  renderLookupMapEditor = () => {
    let {form, value, offlineCalcDimensions} = this.props
    const { getFieldValue } = form
    let dimId = getFieldValue('args[0].dimId')
    const castToType = getFieldValue('args[0].castTo')
    
    let dimName = dimId
      ? _(offlineCalcDimensions).chain().find(d => d.id === dimId).get('name').value()
      : getFieldValue('args[0].fieldName')
    let currType = dimId
      ? _(offlineCalcDimensions).chain().find(d => d.id === dimId).get('type').value()
      : getFieldValue('args[0].dataType')
  
    const mockDim = {name: _.isNumber(castToType) ? '' : dimName, type: _.isNil(castToType) ? currType : castToType}
    return (
      <OptionalWrapper
        ctrlComponent={OfflineCalcDimLookupMapEditor}
        initialValue={{'分组1': {op: 'in', eq: isTimeDimension(mockDim) ? '-1 days' : [], sort: 0}, othersGroupName: '未分组'}}
        mockDim={mockDim}
      />
    )
  }
  
  renderExtractTimePartPicker = (dimId, currType) => {
    let {form, value, offlineCalcDimensions} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = form
  
    const castToType = getFieldValue('args[0].castTo')
    
    let dimName = dimId
      ? _(offlineCalcDimensions).chain().find(d => d.id === dimId).get('name').value()
      : getFieldValue('args[0].fieldName')
    const mockDim = {name: _.isNumber(castToType) ? '' : dimName, type: _.isNil(castToType) ? currType : castToType}
    
    if (!isTimeDimension(mockDim)) {
      return null
    }
    return (
      <Form.Item
        label="周期时提取"
        {...formItemLayout}
      >
        {getFieldDecorator('args[0].extractTimePart', {
          initialValue: _.get(value, 'args[0].extractTimePart'),
          rules: [
          ]
        })(
          <OptionalWrapper
            ctrlComponent={Select}
            initialValue={_.findKey(OfflineCalcDimensionExtractableTimePartEnum, _.identity)}
            onChange={nextTimePart => {
              setFieldsValue({
                'args[0].lookupMap': null
              })
            }}
          >
            {Object.keys(OfflineCalcDimensionExtractableTimePartEnum)
              .map(k => {
                return (
                  <Option key={k} value={k}>{OfflineCalcDimensionExtractableTimePartEnum[k]}</Option>
                )
              })}
          </OptionalWrapper>
        )}
      </Form.Item>
    )
  }
  
  renderAfterProcessSettingCtrl = () => {
    let {form, value, offlineCalcDimensions} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = form
    let dimId = getFieldValue('args[0].dimId')
    let currType = dimId
      ? _(offlineCalcDimensions).chain().find(d => d.id === dimId).get('type').value()
      : getFieldValue('args[0].dataType')
    return (
      <React.Fragment>
        <Divider />
        <Form.Item
          label="类型转换"
          {...formItemLayout}
        >
          {getFieldDecorator('args[0].castTo', {
            initialValue: _.get(value, 'args[0].castTo'),
            rules: [
            ]
          })(
            <OptionalWrapper
              ctrlComponent={Select}
              initialValue={_.find(DruidColumnType, v => v !== currType)}
              onChange={nextCastToType => {
                setFieldsValue({
                  'args[0].lookupMap': null,
                  'args[0].extractTimePart': null
                })
              }}
            >
              {Object.keys(DruidColumnType)
                .filter(k => {
                  return DruidColumnType[k] !== currType
                    && DruidColumnType[k] !== DruidColumnType.DateString
                    && DruidColumnType[k] !== DruidColumnType.Text
                    && DruidColumnType[k] < DruidColumnType.BigDecimal
                })
                .map(k => {
                  return (
                    <Option key={k} >{k}</Option>
                  )
                })}
            </OptionalWrapper>
          )}
        </Form.Item>
  
        {this.renderExtractTimePartPicker(dimId, currType)}
        
        <Form.Item
          label="值分组"
          {...formItemLayout}
        >
          {getFieldDecorator('args[0].lookupMap', {
            // {'Group1': {op: 'in', eq: []}, othersGroupName: 'others'}
            initialValue: _.get(value, 'args[0].lookupMap'),
            rules: [
              {
                validator(type, value, cb) {
                  if (!value) {
                    cb([])
                    return
                  }
                  let groupNames = _.keys(value)
                  let r = _.some(groupNames, g => _.isObject(value[g]) && 'eq' in value[g] && _.isEmpty(value[g].eq))
                    ? [ new Error('请填写完整') ]
                    : []
                  cb(r)
                }
              }
            ]
          })(
            this.renderLookupMapEditor()
          )}
        </Form.Item>
      </React.Fragment>
    )
  }
  
  render() {
    let {onOk, form, value, offlineCalcDataSources, offlineCalcDimensions, enableAfterProcess, ...rest} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = form
    
    return (
      <Modal
        onOk={async () => {
          let commonFields = ['func', 'args[0].dsId', 'args[0].castTo', 'args[0].lookupMap']
          let validField = getFieldValue('func') === 'useDim'
            ? ['args[0].dimId']
            : ['args[0].tableName', 'args[0].fieldName', 'args[0].dataType']
          let res = await validateFieldsByForm(form, [...commonFields, ...validField])
          if (!res) {
            return
          }
          // 设置真实 dsId（当它是 all 时），方便查询依赖
          if (_.get(res, ['args', 0, 'dsId']) === 'all') {
            res = immutateUpdate(res, ['args', 0, 'dsId'], prev => {
              let dimId = _.get(res, ['args', 0, 'dimId'])
              let dimObj = _.find(offlineCalcDimensions, o => o.id === dimId)
              return _.get(dimObj, 'data_source_id', prev)
            })
          }
          onOk(res)
        }}
        width={enableAfterProcess ? 600 : undefined}
        {...rest}
      >
        <Form>
          <Form.Item
            label="引入方式"
            {...formItemLayout}
            className="hide" // 需求变更：去掉维度管理，增加维表管理，只能引入现有的维表的维度（以前是能引入所有）
          >
            {getFieldDecorator('func', {
              initialValue: _.get(value, 'func') || 'importDim',
              rules: [
              ]
            })(
              <Radio.Group
                buttonStyle="solid"
                onChange={ev => {
                  let {value} = ev.target
                  
                  setFieldsValue({
                    'args[0].dsId': value === 'useDim' ? 'all' : null,
                    'args[0].dimId': undefined,
                    'args[0].tableName': null,
                    'args[0].fieldName': null
                  })
                }}
              >
                <Radio.Button value="useDim">使用现有维度</Radio.Button>
                <Radio.Button value="importDim">从数据源选择</Radio.Button>
              </Radio.Group>
            )}
          </Form.Item>
  
          <Form.Item
            label="所属数据源"
            {...formItemLayout}
          >
            {getFieldDecorator('args[0].dsId', {
              initialValue: _.get(value, 'args[0].dsId'),
              rules: getFieldValue('func') === 'useDim'
                ? []
                : [ { required: true, message: '请选择数据源' } ]
            })(
              <Select
                allowClear
                {...enableSelectSearch}
                onChange={async val => {
                  // 清空字段项
                  setFieldsValue({
                    'args[0].dimId': null,
                    'args[0].tableName': null,
                    'args[0].fieldName': null
                  })
                }}
              >
                {getFieldValue('func') === 'useDim'
                  ? [
                    <Option key="all" value="all">不限数据源</Option>,
                    <Option key="null" value="null">跨数据源</Option>
                  ]
                  : []}
                {(offlineCalcDataSources || []).map(ds => {
                  return (
                    <Option key={ds.id} value={ds.id}>{ds.name}</Option>
                  )
                })}
              </Select>
            )}
          </Form.Item>
          
          {getFieldValue('func') === 'useDim'
            ? this.renderExistedDimensionPicker()
            : this.renderDimensionImporter()}
            
          {enableAfterProcess && (getFieldValue('args[0].dimId') || getFieldValue('args[0].fieldName'))
            ? this.renderAfterProcessSettingCtrl()
            : null}
        </Form>
      </Modal>
    )
  }
}
