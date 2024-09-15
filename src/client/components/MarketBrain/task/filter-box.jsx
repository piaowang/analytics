/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Select, Row, Col, DatePicker } from 'antd';
import { validateFieldsAndScroll } from '../../../common/decorators'
import moment from 'moment'
import _ from 'lodash'
import { SENDCHANNELENUM } from 'common/marketBrain/constants'

const { marketBrain: { 
  feature
} } = window.sugo

const FormItem = Form.Item
const Option = Select.Option

const channelMap = SENDCHANNELENUM[feature]

@Form.create()
@validateFieldsAndScroll
export default class FilterBox extends Component {

  renderInput(title, span, keyname) {
    const { getFieldDecorator } = this.props.form
    return (
      <Col md={span} sm={24}>
        <FormItem label={title} className="iflex">
          {
            getFieldDecorator(`${keyname}`, {
              initialValue: undefined
            })(
              <Input className="width200" placeholder={title}/>
            )
          }
        </FormItem>
      </Col>
    )
  }

  renderSelect(title, span, keyname, option) {
    const { getFieldDecorator } = this.props.form
    return (
      <Col md={span} sm={24}>
        <FormItem label={title} className="iflex">
          {
            getFieldDecorator(`${keyname}`, {
              initialValue: undefined
            })(
              <Select
                allowClear
                className="width200"
                placeholder={title}
              >
                {
                  option.map( (i,idx) => (
                    <Option key={idx} value={i.value}>{i.name}</Option>
                  ))
                }
              </Select>
            )
          }
        </FormItem>
      </Col>
    )
  }

  submit = async () => {
    const { postFilter } = this.props
    let values = await this.validateFieldsAndScroll()
    if (!values) return
    if(_.isEmpty(values.execute_time)) {
      values.execute_time = undefined
    } else {
      values.execute_time = values.execute_time.map(v => moment(v).format('YYYY-MM-DD'))
    }
    postFilter(values)
  }

  render() {
    const { getFieldDecorator, getFieldValue } = this.props.form
    const { loading } = this.props
    return (
      <div>
        <Form layout="inline">
          <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
            {this.renderInput('公司名称', 6, 'jwt_company_name')}
            {this.renderInput('门店名称', 6, 'jwt_store_name')}
            {this.renderInput('活动名称', 6, 'name')}
            <Col span={6}>
              <Button loading={loading} type="primary" className="mg2l" onClick={() => this.submit()}>搜索</Button>
            </Col>
          </Row>
          <Row className="mg2t" gutter={{ md: 8, lg: 24, xl: 48 }}>
            {this.renderSelect('触达方式', 6, 'touch_up_way', [{value: 0, name: '自动'},{ value: 1, name: '人工'}])}
            <Col md={6} sm={24}>
              <Form.Item label="发送渠道" className='iflex'>
                {getFieldDecorator('send_channel')(
                  <Select
                    allowClear
                    placeholder={!_.isNumber(getFieldValue('touch_up_way')) ? '请先选择触达方式' : '请选择渠道'}
                    className="width200"
                  >
                    {
                      !_.isNumber(getFieldValue('touch_up_way')) ? null : channelMap[getFieldValue('touch_up_way')].map( (i, idx) => (
                        <Select.Option key={idx} value={idx}>{i}</Select.Option>
                      ))
                    }
                  </Select>
                )}
              </Form.Item>
            </Col>
            {this.renderSelect('状态', 6, 'status', [
              {value: 0, name: '准备中'},
              { value: 1, name: '运行中'},
              { value: 2, name: '执行中'},
              { value: 3, name: '已暂停'},
              { value: 4, name: '已完成'}
            ])}
            <Col md={6} sm={24} >
              <FormItem className="width350 iflex" label="执行时间">
                {
                  getFieldDecorator('execute_time', {
                    initialValue: [moment().add(-7, 'days'), moment()]
                  })(
                    <DatePicker.RangePicker
                      className="width200"
                      format="YYYY-MM-DD"
                    />
                  )
                }
              </FormItem>
            </Col>
          </Row>
        </Form>
      </div>
    )
  }
}
