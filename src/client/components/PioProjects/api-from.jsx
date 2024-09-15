import React, {useImperativeHandle, useState,useEffect } from 'react'
import { Form, Input, Select } from 'antd'

const { Option } = Select
const { TextArea } = Input


const BasicForm = React.memo((props) => {
  const [apiNameValidate, setApiNameValidate] = useState({
    validateStatus: 'success',
    errorMsg: '格式错误！只支持汉字、英文、数字、下划线，且只能以英文或汉字开头，3-64个字符。',
    tips: '支持汉字、英文、数字、下划线，且只能以英文或汉字开头，3-64个字符。'
  })
  const [apiUrlValidate, setApiUrlValidate] = useState({
    validateStatus: 'success',
    errorMsg: 'API路径格式有误',
    tips: '调用路径样例：/get/data'
  })
  useEffect(() => {
    const submitForm = () => {
      return new Promise((resolve) => {
        form.validateFields().then((res) => {
          resolve(res)
        }).catch((err) => {
          console.log(err)
        })
      })
    }
    props.setForm(submitForm)
  })

  const [form] = Form.useForm()
  const layout = {
    labelCol: {
      xs: { span: 28 },
      sm: { span: 4 }
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 16 }
    }
  }
  return (
    <Form form={form} {...layout} >
      <Form.Item
        label='API名称'
        required
        name='apiName'
        help={apiNameValidate.validateStatus === 'error' ? apiNameValidate.errorMsg : apiNameValidate.tips}
        validateStatus={apiNameValidate.validateStatus}
        validateTrigger='onBlur'
        rules={[
          {
            required: true,
            validator(rule,value) {
              if(!value){
                setApiNameValidate({
                  ...apiNameValidate,
                  validateStatus: 'error',
                  errorMsg: '请输入API名称'
                })
                return Promise.reject('请输入API名称')
              }
              const reg = /^[\u4E00-\u9FA5A-Za-z][\u4E00-\u9FA5A-Za-z0-9_]{2,63}$/g
              if (reg.test(value)) {
                setApiNameValidate({
                  ...apiNameValidate,
                  validateStatus: 'success'
                })
                return Promise.resolve()
              } else {
                setApiNameValidate({
                  ...apiNameValidate,
                  validateStatus: 'error',
                  errorMsg: 'API名称格式错误'
                })
                return Promise.reject('API名称格式错误')
              }
            }
          }
        ]}
      >
        <Input placeholder='请输入API名称' maxLength={64} />
      </Form.Item>
      <Form.Item
        label='调用路径'
        name='apiUrl'
        required
        validateTrigger='onBlur'
        help={apiUrlValidate.validateStatus === 'error' ? apiUrlValidate.errorMsg : apiUrlValidate.tips}
        validateStatus={apiUrlValidate.validateStatus}
        rules={[
          { 
            required: true,
            validator(rule,value) {
              if(!value){
                setApiUrlValidate({
                  ...apiUrlValidate,
                  validateStatus: 'error',
                  errorMsg: '请输入调用路径'
                })
                return Promise.reject('请输入调用路径')
              }
              const reg = /^\/[a-zA-Z0-9]/
              if (reg.test(value)) {
                setApiUrlValidate({
                  ...apiUrlValidate,
                  validateStatus: 'success'
                })
                return Promise.resolve()
              } else {
                setApiUrlValidate({
                  ...apiUrlValidate,
                  validateStatus: 'error',
                  errorMsg: 'API路径格式有误'
                })
                return Promise.reject('API路径格式有误')
              }
            }
          }
        ]}
      >
        <Input placeholder='请输入调用路径' disabled={props.isEdit || !!props.id} addonBefore='/data-api' />
      </Form.Item>
      <Form.Item label='API查询时间基准' required>
        <Form.Item name='apiTimebase' getValueFromEvent={(event) => {
          const value = event.target.value
          if (/[^\d]/g.test(value)) {
            return value.replace(/[^\d]/g, '')
          } else if (value === '') {
            return ''
          }
          return parseInt(value)
        }} noStyle rules={[
          { required: true, message: '请输入API查询时间基准', whitespace: true, type: 'number' }
          // {pattern:/[0-9]+/,message:'API查询时间只能是数字'},
        ]}
        >
          <Input placeholder='请输入API查询时间基准' className='width400' />
        </Form.Item>
        &nbsp;&nbsp;&nbsp;S
      </Form.Item>
      <Form.Item
        label='API请求方式'
        name='requestMethod'
        required
        rules={[
          { required: true, message: '请选择API请求方式', whitespace: true }
        ]}
      >
        <Select placeholder='请选择API请求方式' className='width400'>
          <Option value={'post'}>POST</Option>
          <Option value={'get'}>GET</Option>
        </Select>
      </Form.Item>
      <Form.Item label='描述' name='apiRemark' >
        <TextArea rows={4} placeholder='请输入描述' />
      </Form.Item>
    </Form>
  )
})

export default BasicForm
