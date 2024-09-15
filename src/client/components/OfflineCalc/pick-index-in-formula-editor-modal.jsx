import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Select } from 'antd';
import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {
  indicesSagaModelGenerator
} from './saga-model-generators'
import {validateFieldsByForm} from '../../common/decorators'
import {immutateUpdate, isDiffByPath} from '../../../common/sugo-utils'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}
const {Option} = Select

const namespace = 'pick-offline-calc-indices-in-formula-editor'

let mapStateToProps = (state, ownProps) => {
  const indicesList = state[namespace] || {}
  const dsList = state['offline-calc-data-sources-for-dim-picker'] || {}
  return {
    offlineCalcIndices: indicesList.offlineCalcIndices,
    offlineCalcDataSources: dsList.offlineCalcDataSources
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel([
  indicesSagaModelGenerator(namespace, 'list', {attributes: ['id', 'belongs_id', 'name', 'title', 'data_source_id', 'formula_info', 'tags', 'created_by']})
])
@Form.create()
export default class PickIndexInFormulaEditorModal extends React.Component {
  static propTypes = {
    value: PropTypes.object // {func: useIdx, args: []}
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
  
  renderExistedIndicesPicker = () => {
    const { offlineCalcIndices, value, indexFilter } = this.props
    const { getFieldDecorator, getFieldValue } = this.props.form
    
    let filterByDsId = getFieldValue('args[0].dsId')
    let filteredIndices = (offlineCalcIndices || []).filter(d => {
      let pickThis = true
      if (indexFilter) {
        pickThis = pickThis && indexFilter(d)
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
        label="目标指标"
        {...formItemLayout}
      >
        {getFieldDecorator('args[0].idxId', {
          initialValue: _.get(value, 'args[0].idxId'),
          rules: [
            { required: true, message: '请选择指标' }
          ]
        })(
          <Select
            allowClear
            {...enableSelectSearch}
          >
            {filteredIndices.map(ds => {
              return (
                <Option key={ds.id} value={ds.id}>{ds.title || ds.name}</Option>
              )
            })}
          </Select>
        )}
      </Form.Item>
    )
  }
  
  render() {
    let {onOk, form, value, offlineCalcDataSources, offlineCalcIndices, ...rest} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = form
  
    getFieldDecorator('func', {
      initialValue: 'useIdx'
    })
    return (
      <Modal
        onOk={async () => {
          let res = await validateFieldsByForm(form)
          if (!res) {
            return
          }
          // 设置真实 dsId（当它是 all 时），方便查询依赖
          if (_.get(res, ['args', 0, 'dsId']) === 'all') {
            res = immutateUpdate(res, ['args', 0, 'dsId'], prev => {
              let idxId = _.get(res, ['args', 0, 'idxId'])
              let idxObj = _.find(offlineCalcIndices, o => o.id === idxId)
              return _.get(idxObj, 'data_source_id', prev)
            })
          }
          onOk(res)
        }}
        {...rest}
      >
        <Form>
          <Form.Item
            label="所属数据源"
            {...formItemLayout}
          >
            {getFieldDecorator('args[0].dsId', {
              initialValue: _.get(value, 'args[0].dsId') || 'all',
              rules: [
              ]
            })(
              <Select
                allowClear
                {...enableSelectSearch}
                onChange={async val => {
                  // 清空字段项
                  setFieldsValue({
                    'args[0].idxId': null
                  })
                }}
              >
                <Option key="all" value="all">不限数据源</Option>
                <Option key="null" value="null">跨数据源</Option>
                {(offlineCalcDataSources || []).map(ds => {
                  return (
                    <Option key={ds.id} value={ds.id}>{ds.name}</Option>
                  )
                })}
              </Select>
            )}
          </Form.Item>
          
          {this.renderExistedIndicesPicker()}
        </Form>
      </Modal>
    )
  }
}
