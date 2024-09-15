/* eslint-disable react/prop-types */
import React, { PureComponent } from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Select, Row, Col, DatePicker } from 'antd';
import { validateFieldsAndScroll } from 'client/common/decorators'
import { enableSelectSearch } from 'client/common/antd-freq-use-props'
import _ from 'lodash'
import moment from 'moment'

const FormItem = Form.Item
const Option = Select.Option

@Form.create()
@validateFieldsAndScroll
export default class FilterBox extends PureComponent {

  state = {
    group_id: ''
  }
  
  componentDidMount() {
    if (location.search) {
      let group_id = location.search.replace('?', '')
      this.setState({ group_id })
    }
  }

  renderInput(title, span, keyname, initialValue = undefined) {
    const { getFieldDecorator } = this.props.form
    return (
      <Col md={span} sm={24}>
        <FormItem label={title} className="iflex">
          {getFieldDecorator(`${keyname}`, {
            initialValue
          }) (
            <Input className="width200" placeholder={title} />
          )}
        </FormItem>
      </Col>
    )
  }

  renderSelect(title, span, keyname, option, initialValue = undefined) {
    const { getFieldDecorator } = this.props.form
    return (
      <Col md={span} sm={24}>
        <FormItem label={title} className="iflex">
          {getFieldDecorator(`${keyname}`, {
            initialValue
          }) (
            <Select
              allowClear
              placeholder={title}
              {...enableSelectSearch}
              className="width200"
            >
              {
                option.map( (item, idx) => (
                  <Option key={`sel-item-${idx}`} value={item.value}>{item.name}</Option>
                ))
              }
            </Select>
          )}
        </FormItem>
      </Col>
    )
  }

  submit = async () => {
    const { postFilter } = this.props
    let values = await this.validateFieldsAndScroll()
    if (!values) return
    if(!_.isEmpty(values.timer)) {
      values.timer = values.timer.map(m => m.format('YYYY-MM-DD'))
    } else {
      values.timer = undefined
    }
    postFilter(values)
  }

  render() {
    const { getFieldDecorator } = this.props.form
    const { actGroups = [], loading } = this.props
    const { group_id } = this.state
    return (
      <div className="mg2">
        <Form layout="inline" className="width-80">
          <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
            {this.renderSelect('分组', 8, 'group_id', actGroups.map(o => ({name: o.name, value: o.id})), group_id)}
            {this.renderInput('活动名称', 8, 'name')}
            {this.renderSelect('发送渠道', 8, 'send_channel', [{value: 0, name: 'push'},{ value: 1, name: '短信'}])}
          </Row>
          <Row className="mg2t">
            {this.renderSelect('状态', 8, 'status', [{value: 0, name: '关闭'},{ value: 1, name: '开启' }])}
            <Col span={10} className="line-height38">
              <FormItem label="发送时间" className="iflex">
                {
                  getFieldDecorator('timer', {
                    initialValue: [moment().add(-7, 'days'), moment()]
                  })(
                    <DatePicker.RangePicker
                      className="width250"
                      format="YYYY-MM-DD"
                    />
                  )
                }
              </FormItem>
            </Col>
            <Col><Button loading={loading} type="primary" className="mg3l" onClick={() => this.submit()}>搜索</Button></Col>
          </Row>
        </Form>
      </div>
    )
  }
}
