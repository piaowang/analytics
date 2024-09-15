import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Modal, Radio, Select } from 'antd';
import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {connect} from 'react-redux'
import {validateFieldsByForm} from '../../common/decorators'
import {immutateUpdate, isDiffByPath} from '../../../common/sugo-utils'
import PickDimensionInFormulaEditorModal from './pick-dimension-in-formula-editor-modal'
import {statisticsTypeList, statisticsTypeTextMap} from '../../common/constans'
import DruidColumnType, {DruidColumnTypeInverted} from '../../../common/druid-column-type'
import FiltersEditorForOfflineCalc from './filters-editor-for-offline-calc'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}
const {Option} = Select

const namespace = 'create-offline-calc-index-in-formula-editor'

let mapStateToProps = (state, ownProps) => {
  const tableSyncState = state['offline-calc-tables-for-dim-picker'] || {}
  return {
    offlineCalcTables: tableSyncState.offlineCalcTables
  }
}


@connect(mapStateToProps)
@Form.create()
export default class CreateIndexInFormulaEditorModal extends React.Component {
  static propTypes = {
    value: PropTypes.object // {func: useDim | importDim, args: []}
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    let currVisible = _.startsWith(this.props.visiblePopoverKey, 'createIndexInFormula')
    let prevVisible = _.startsWith(prevProps.visiblePopoverKey, 'createIndexInFormula')
    if (currVisible !== prevVisible) {
      if (currVisible) {
        this.props.form.setFieldsValue(this.props.value)
      } else {
        this.props.form.resetFields()
      }
    }
  }
  
  renderDimensionInFormulaEditModal = () => {
    let {visiblePopoverKey, onVisiblePopoverKeyChange} = this.props
    
    return (
      <PickDimensionInFormulaEditorModal
        title="指标定义 / 设置统计维度"
        visible={_.endsWith(visiblePopoverKey, 'importDimensionToIndex')}
        onCancel={() => {
          onVisiblePopoverKeyChange(visiblePopoverKey.replace(/\|.+?$/, ''))
        }}
        onOk={nextVal => {
          onVisiblePopoverKeyChange(visiblePopoverKey.replace(/\|.+?$/, ''))
        }}
      />
    );
  }
  
  renderDimensionName = ({fieldName}) => {
    return fieldName ? fieldName : '设置维度'
  }
  
  render() {
    let {onOk, form, value, visiblePopoverKey, onVisiblePopoverKeyChange, offlineCalcTables, ...rest} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = form
  
    getFieldDecorator('func', {
      initialValue: 'createIdx'
    })
    let currDimInfo = _.isEmpty(getFieldValue('args[0].dim'))
      ? _.get(value, 'args[0].dim')
      : getFieldValue('args[0].dim')
    let {dataType = DruidColumnType.String} = _.get(currDimInfo, 'args[0]') || {}
    let statisticsTypeKeys = (statisticsTypeList[DruidColumnTypeInverted[dataType]] || statisticsTypeList.string)
      .filter(k => k !== 'last') // 暂不支持 last 聚合
    
    return (
      <Modal
        width={600}
        onOk={async () => {
          let res = await validateFieldsByForm(form)
          if (!res) {
            return
          }
          // 排除筛选器中 eq 为空的项，或者未设置维度的项
          res = immutateUpdate(res, ['args', 0, 'filters'], flts => {
            return (flts || []).filter(f => !(_.isEmpty(f.dim) || _.isEmpty(_.compact(f.eq))))
          })
          onOk(res)
          onVisiblePopoverKeyChange('')
        }}
        visible={_.startsWith(visiblePopoverKey, 'createIndexInFormula')}
        onCancel={() => {
          onVisiblePopoverKeyChange('')
        }}
        {...rest}
      >
        <Form>
          <Form.Item
            label="指标定义"
            {...formItemLayout}
            required
          >
            {getFieldDecorator('args[0].dim', {
              initialValue: _.get(value, 'args[0].dim'),
              trigger: 'onOk',
              rules: [
                { required: true, message: '必填项' }
              ]
            })(
              this.renderDimensionInFormulaEditModal()
            )}
            统计维度
            <Button
              className="mg2x iblock"
              onClick={() => {
                onVisiblePopoverKeyChange(`${visiblePopoverKey}|importDimensionToIndex`)
              }}
            >{this.renderDimensionName(_.get(getFieldValue('args[0].dim'), 'args[0]', {}))}</Button>
            的
            {getFieldDecorator('args[0].aggregator', {
              initialValue: _.get(value, 'args[0].aggregator') || 'count',
              rules: [
              ]
            })(
              <Select className="width100 mg2l iblock" >
                {statisticsTypeKeys.map((type, i) => {
                  return (
                    <Option key={i} value={type}>{statisticsTypeTextMap[type]}</Option>
                  )
                })}
              </Select>
            )}
          </Form.Item>
  
          <Form.Item
            label="限定条件"
            {...formItemLayout}
          >
            {getFieldDecorator('args[0].filters', {
              initialValue: _.get(value, 'args[0].filters') || [],
              rules: [
              ]
            })(
              <FiltersEditorForOfflineCalc
                title="指标定义 / 设置筛选维度"
                visiblePopoverKey={visiblePopoverKey}
                onVisiblePopoverKeyChange={onVisiblePopoverKeyChange}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}
