import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Divider, Select, Tooltip } from 'antd';
import _ from 'lodash'

const FormItem = Form.Item
const { Option } = Select
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

class DimensionSetting extends Component {

  state = {}

  renderUserDimensionItem = () => {
    const { content = {}, tagDimensions } = this.props
    const { getFieldDecorator } = this.props.form
    let dimensionItems = [
      <FormItem
        label={<span>
          用户ID
          <Tooltip title="指用户唯一标识，用于识别用户">
            <QuestionCircleOutlined />
          </Tooltip>
        </span>}
        className="mg1b"
        key="dimension_userid"
        hasFeedback
        {...formItemLayout}
      >
        {getFieldDecorator('dimensions.userIdKey', {
          rules: [{
            required: true, message: '用户ID必选！'
          }],
          initialValue: _.get(content, 'dimensions.userIdKey', '')
        })(
          <Select className="width200">
            {tagDimensions.map(p => <Option key={`db-option2-${p.name}`} value={p.name}>{p.title || p.name}</Option>)}
          </Select>
        )}
      </FormItem>
    ]
    if (content.type === 1) {
      dimensionItems.push(<FormItem
        label={<span>
          注册时间
          <Tooltip title="指用户的注册时间，用于计算是否新用户">
            <QuestionCircleOutlined />
          </Tooltip>
        </span>}
        className="mg1b"
        key="diemns_time"
        hasFeedback
        {...formItemLayout}
                          >
        {getFieldDecorator('dimensions.registerTimeKey', {
          rules: [{
            required: true, message: '注册时间必选!'
          }],
          initialValue: _.get(content, 'dimensions.registerTimeKey', '')
        })(
          <Select className="width200">
            {tagDimensions.map(p => <Option key={`db-option2-${p.id}`} value={p.name}>{p.title || p.name}</Option>)}
          </Select>
        )}
      </FormItem>)
    }
    return dimensionItems
  }

  renderTransactionDimensionItem = () => {
    const { content = {}, transactionDimensions } = this.props
    const { getFieldDecorator } = this.props.form
    if (content.type === 1) {
      return [
        <FormItem
          label={<span>
            购买时间
            <Tooltip title="指用户订单的购买时间，用于计算时间范围">
              <QuestionCircleOutlined />
            </Tooltip>
          </span>}
          className="mg1b"
          key="diemns_time"
          hasFeedback
          {...formItemLayout}
        >
          {getFieldDecorator('dimensions.buyTimeKey', {
            rules: [{
              required: true, message: '购买时间必选!'
            }],
            initialValue: _.get(content, 'dimensions.buyTimeKey', '')
          })(
            <Select className="width200">
              {transactionDimensions.map(p => <Option key={`db-option2-${p.name}`} value={p.name}>{p.title || p.name}</Option>)}
            </Select>
          )}
        </FormItem>];
    }
    return [
      <FormItem
        label={<span>
          购买时间
          <Tooltip title="指用户订单的购买时间，用于计算时间范围">
            <QuestionCircleOutlined />
          </Tooltip>
        </span>}
        className="mg1b"
        key="diemns_time"
        hasFeedback
        {...formItemLayout}
      >
        {getFieldDecorator('dimensions.buyTimeKey', {
          rules: [{
            required: true, message: '购买时间必选!'
          }],
          initialValue: _.get(content, 'dimensions.buyTimeKey', '')
        })(
          <Select className="width200">
            {transactionDimensions.map(p => <Option key={`db-option2-${p.name}`} value={p.name}>{p.title || p.name}</Option>)}
          </Select>
        )}
      </FormItem>,
      <FormItem
        label={<span>
          购买金额
          <Tooltip title="指用户订单的购买金额，用于计算业绩贡献">
            <QuestionCircleOutlined />
          </Tooltip>
        </span>}
        className="mg1b"
        key="diemns_amount"
        hasFeedback
        {...formItemLayout}
      >
        {getFieldDecorator('dimensions.buyAmountKey', {
          rules: [{
            required: true, message: '购买金额必选!'
          }],
          initialValue: _.get(content, 'dimensions.buyAmountKey', '')
        })(
          <Select className="width200">
            {transactionDimensions.map(p => <Option key={`db-option2-${p.name}`} value={p.name}>{p.title || p.name}</Option>)}
          </Select>
        )}
      </FormItem>];
  }

  renderActionDimensionItem = () => {
    const { content = {}, actionDimensions } = this.props
    const { getFieldDecorator } = this.props.form
    return [
      <FormItem
        label={<span>
          行为时间
          <Tooltip title="指用户订单的交互行为时间，用于计算是否活跃">
            <QuestionCircleOutlined />
          </Tooltip>
        </span>}
        className="mg1b"
        key="behaviorTimeKey"
        hasFeedback
        {...formItemLayout}
      >
        {getFieldDecorator('dimensions.behaviorTimeKey', {
          initialValue: _.get(content, 'dimensions.behaviorTimeKey', '')
        })(
          <Select className="width200">
            {actionDimensions.map(p => <Option key={`db-option2-${p.name}`} value={p.name}>{p.title || p.name}</Option>)}
          </Select>
        )}
      </FormItem>
    ];
  }


  render() {
    const { content = {} } = this.props
    return (
      <div>
        <Divider orientation="left">模型维度</Divider>
        <div>
          <div className="width20 borderr iblock">用户</div>
          <div style={{ width: 'calc( 100% - 20px )' }} className="iblock">
            {this.renderUserDimensionItem()}
          </div>
        </div>
        <div>
          <div className="width20 borderr iblock">用户交易</div>
          <div style={{ width: 'calc( 100% - 20px )' }} className="iblock">
            {this.renderTransactionDimensionItem()}
          </div>
        </div>
        {
          content.type === 1
            ? (
              <div>
                <div className="width20 borderr iblock">用户行为</div>
                <div style={{ width: 'calc( 100% - 20px )' }} className="iblock">
                  {this.renderActionDimensionItem()}
                </div>
              </div>)
            : null
        }
      </div >
    )
  }
}

DimensionSetting.propTypes = {

}

export default DimensionSetting
