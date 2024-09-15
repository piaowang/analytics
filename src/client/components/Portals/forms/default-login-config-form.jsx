import React, {useEffect, useRef} from 'react'
import PubSub from 'pubsub-js'
import _ from 'lodash'
import {Form, Input, Select} from 'antd'
import {LOGIN_PAGE_TEMPLATE_ENUM, LOGIN_PAGE_TEMPLATE_TRANSLATION} from '../constants'
import SmartUploader from '../../LiveScreen/smart-uploader'
import SmallImagePicker from '../../LiveScreen/small-img-picker'
import ColorPicker from '../../Common/color-picker'

const layout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 19 }
}

export default function LoginPageConfigForm({formName, value, onChange ,getLoginRef = false}) {
  const formRef = useRef()
  const { dispatch } = window.store
  if(!getLoginRef){
    dispatch({
      type: 'portals-saga-model/updateState',
      payload: (state) => {
        state.getLoginRef = formRef
        return {...state}
      }
    })
  }
  useEffect(() => {
    const token = PubSub.subscribe(`portal-page-config-form-validate:${formName}`, async (msg, callback = _.noop) => {
      
      // 参考 src/client/common/decorators.js
      try {
        let res = await formRef.current.validateFields()
        onChange(res && {...(value || {}), ...res})
        callback(null, res && {...(value || {}), ...res})
      } catch (e) {
        e.current='login'
        callback(e)
      }
    })
    return () => {
      PubSub.unsubscribe(token)
    }
  }, [])
  
  return (
    <Form
      {...layout}
      ref={formRef}
      name={formName}
      initialValues={value}
      onFinish={values => {
      }}
      onFinishFailed={errorInfo => {
      }}
    >
      <Form.Item
        label="选择模板"
        name="templateId"
        rules={[{ required: true, message: '请选择登录模板' }]}
      >
        <Select>
          {_.map(LOGIN_PAGE_TEMPLATE_TRANSLATION, (name, key) => {
            return (
              <Select.Option key={key} value={key}>{name}</Select.Option>
            )
          })}
        </Select>
      </Form.Item>
      
      <Form.Item
        label="背景图片"
        name="backgroundImageId"
        getValueFromEvent={id => id}
        trigger="onPick"
        extra="建议尺寸：1920 * 1080；图片不大于 2MB"
      >
        <SmartUploader />
      </Form.Item>
      
      <Form.Item
        label="Logo 图片"
        name={['params', 'logoImg']}
        extra="建议尺寸：200 * 80；图片不大于 100KB"
      >
        <SmallImagePicker
          imgStyle={{
            maxHeight: '80px'
          }}
        />
      </Form.Item>
      
      <Form.Item
        label="名称"
        name={['params', 'siteName']}
      >
        <Input />
      </Form.Item>
      
      <Form.Item
        label="按钮配色"
        name={['params', 'primaryColor']}
      >
        <ColorPicker />
      </Form.Item>
      
      <Form.Item
        label="版权所有"
        name={['params', 'copyrightTextLogin']}
      >
        <Input />
      </Form.Item>
      
      <Form.Item
        label="版本"
        name={['params', 'version']}
      >
        <Input />
      </Form.Item>
    </Form>
  )
}
