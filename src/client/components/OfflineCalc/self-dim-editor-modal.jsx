import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Modal, Input, Select } from 'antd';
import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {connect} from 'react-redux'
import {validateFieldsByForm} from '../../common/decorators'
import PublicSelfDimCalc from './public-self-dim-calc'
import { BusinessDimensionCreateModeEnum, BusinessDimensionTypeEnum } from '../../../common/constants'

const formItemLayout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 14 }
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
    let currVisible = _.startsWith(this.props.visiblePopoverKey, 'selfDimEditor')
    let prevVisible = _.startsWith(prevProps.visiblePopoverKey, 'selfDimEditor')
    if (currVisible !== prevVisible) {
      if (currVisible) {
        this.props.form.setFieldsValue(this.props.value)
      } else {
        this.props.form.resetFields()
      }
    }
  }
  
  renderDimensionName = ({fieldName}) => {
    return fieldName ? fieldName : '设置维度'
  }
  
  render() {
    let {onOk, form, value, visiblePopoverKey, onVisiblePopoverKeyChange, offlineCalcTables, businessDimension, tablesSet, ...rest} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = form
    
    let pre = _.cloneDeep(getFieldValue('args')) 
    if (!_.isEmpty(pre)) {
      if (pre.length < tablesSet.length) {
        let diff = []
        tablesSet.map( i => {
          let temp = i.split('/')
          pre.map( j => {
            let temp1 = j.split('/')
            if (temp[0] === temp1[0] && temp[1] === temp1[1]) return
            diff.push(i)
          })
        })
        setFieldsValue({
          'args': [...pre, ...diff]
        })
      }
    }
    return (
      <Modal
        width={800}
        onOk={async () => {
          let res = await validateFieldsByForm(form)
          if (!res) {
            return
          }
          onOk(res)
          // onVisiblePopoverKeyChange('')
        }}
        visible={_.startsWith(visiblePopoverKey, 'selfDimEditor')}
        onCancel={() => {
          onVisiblePopoverKeyChange('')
        }}
        {...rest}
      >
        <Form>
          <Form.Item
            label="私有业务维度"
            {...formItemLayout}
            required
          >
            {getFieldDecorator('selfDimId', {
              initialValue: _.get(value, 'selfDimId'),
              // trigger: 'onOk',
              rules: [
                { required: true, message: '必填项' }
              ]
            })(
              <Select
                className="width-100"
                showSearch
                allowClear
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={() => {
                  let curr = _.cloneDeep(getFieldValue('args'))
                  setFieldsValue({
                    'args': curr.map( i => {
                      let temp = i.split('/')
                      if (temp.length === 3) temp.pop()
                      return temp.join('/')
                    })
                  })
                }}
              >
                {
                  businessDimension.filter(i => BusinessDimensionCreateModeEnum[i.create_mode] === '私有维度' && i.status === 1).map(i => (
                    <Option key={i.id} value={i.id}>{i.alias || i.name}: {BusinessDimensionTypeEnum[i.type]}</Option>
                  ))
                }
              </Select>
            )}
          </Form.Item>
  
          <Form.Item
            label="包含维度"
            {...formItemLayout}
          >
            {getFieldDecorator('args', {
              initialValue: tablesSet,
              rules: [
                { required: true, message: '必填项' }
              ]
            })(
              <PublicSelfDimCalc 
                visiblePopoverKey={visiblePopoverKey}
                dimNameInfo={_.find(businessDimension, b => b.id === getFieldValue('selfDimId'))}
                onVisiblePopoverKeyChange={onVisiblePopoverKeyChange}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}
