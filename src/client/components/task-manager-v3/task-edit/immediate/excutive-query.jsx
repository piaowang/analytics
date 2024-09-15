import React from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Row, Col, DatePicker, Input, Select, Button } from 'antd'
import moment from 'moment'
import _ from 'lodash'

const { Item: FItem } = Form
const { Option } = Select
const dateFormat = 'MM/DD/YYYY'

const MyModal = props => {
  const {
    search,
    clearParams,
    form: { getFieldDecorator, validateFields, resetFields }
  } = props

  const submit = () => {
    validateFields((err, value) => {
      if (err) {
        return
      }
      const data = _.mapValues(value, (v, k) => {
        if (k === 'begin' && v) {
          return moment(v).startOf('d').format('MM/DD/YYYY HH:mm')
        }
        if (k === 'end' && v) {
          return moment(v).endOf('d').format('MM/DD/YYYY HH:mm')
        }
        if (k === 'status' && v === 'all') {
          return ''
        }
        return v
      })
      search(_.omitBy(data, p => !p))
    })
  }

  const cancel = () => {
    resetFields()
    clearParams()
  }

  return (
    <Form>
      <Row>
        <Col span={6}>
          <FItem noStyle label='任务名称' labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
            {getFieldDecorator('flowcontain', {})(<Input />)}
          </FItem>
        </Col>
        <Col span={5}>
          <FItem noStyle label='开始时间' labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
            {getFieldDecorator('begin', {
              initialValue: moment().add(-7, 'd')
            })(<DatePicker format={dateFormat} />)}
          </FItem>
        </Col>
        <Col span={5}>
          <FItem noStyle label='结束时间' labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
            {getFieldDecorator('end', {
              initialValue: moment()
            })(<DatePicker format={dateFormat} />)}
          </FItem>
        </Col>
        <Col span={4}>
          <FItem label='状态' labelCol={{ span: 9 }} wrapperCol={{ span: 15 }} noStyle>
            {getFieldDecorator('status', {
              initialValue: 'all'
            })(
              <Select className='width65'>
                <Option key={1} value='all'>
                  全部
                </Option>
                <Option key={2} value='kill'>
                  终止
                </Option>
                <Option key={3} value='success'>
                  成功
                </Option>
                <Option key={4} value='fail'>
                  失败
                </Option>
              </Select>
            )}
          </FItem>
        </Col>
        <Col span={4} className='alignright'>
          <FItem noStyle>
            <Button type='primary' onClick={submit} className='mg2r'>
              查询
            </Button>
            <Button type='danger' onClick={cancel}>
              重置
            </Button>
          </FItem>
        </Col>
      </Row>
    </Form>
  )
}

export default Form.create()(MyModal)
