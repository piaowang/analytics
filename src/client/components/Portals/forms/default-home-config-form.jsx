import React, { useEffect, useRef, useState } from 'react'
import PubSub from 'pubsub-js'
import _ from 'lodash'
import { Form, Input, Select, Tabs } from 'antd'
import { HOME_PAGE_TEMPLATE_TRANSLATION } from '../constants'
import SmartUploader from '../../LiveScreen/smart-uploader'
import SmallImagePicker from '../../LiveScreen/small-img-picker'
import AppDragGrpups from './app-drag-groups'
import { useRuntimeSagaModels } from '../../Common/runtime-saga-helper'
import {
  applicationSagaSyncModelGen,
  PORTAL_APPS_SAGA_MODEL_NS
} from '../application-management/store'
import { connect } from 'react-redux'
import '../css/default-home-config-form.styl'
import ColorPicker from '../../Common/color-picker'

const layout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 19 }
}

function HomePageConfigForm(props) {
  const { formName, value, onChange, applications, getHomeRef = false, homeTabActiveKey, onHomeTabChange } = props
  const { dispatch } = window.store
  const formRef = useRef()
  if (!getHomeRef) {
    dispatch({
      type: 'portals-saga-model/updateState',
      payload: (state) => {
        state.getHomeRef = formRef
        return { ...state }
      }
    })
  }
  useRuntimeSagaModels(props, [
    applicationSagaSyncModelGen(PORTAL_APPS_SAGA_MODEL_NS)
  ])

  useEffect(() => {
    const token = PubSub.subscribe(
      `portal-page-config-form-validate:${formName}`,
      async (msg, callback = _.noop) => {
        // 参考 src/client/common/decorators.js
        try {
          let res = await formRef.current.validateFields()
          console.log('res=>', res, res && { ...(value || {}), ...res })
          await onChange(res && { ...(value || {}), ...res })
          callback(null, res && { ...(value || {}), ...res })
        } catch (e) {
          e.current = 'home'
          callback(e)
        }
      }
    )
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
      onFinish={(values) => {
      }}
      onFinishFailed={(errorInfo) => {
      }}
    >
      <Tabs activeKey={homeTabActiveKey} defaultActiveKey="base" onChange={onHomeTabChange}>
        <Tabs.TabPane tab="界面基本信息配置" key="base" className="tabs-pane-box" forceRender>
          <Form.Item
            label="选择模板"
            name="templateId"
            rules={[{ required: true, message: '未输入门户名称' }]}
          >
            <Select>
              {_.map(HOME_PAGE_TEMPLATE_TRANSLATION, (name, key) => {
                return <Select.Option key={key} value={key}>{name}</Select.Option>
              })}
            </Select>
          </Form.Item>

          <Form.Item
            label="背景图片"
            name="backgroundImageId"
            getValueFromEvent={(id) => id}
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
          <Form.Item label="名称" name={['params', 'siteName']}>
            <Input />
          </Form.Item>
          <Form.Item label="名称字体颜色" name={['params', 'siteNameColor']}>
            <ColorPicker />
          </Form.Item>
          <Form.Item
            label="顶部背景"
            getValueFromEvent={(id) => id}
            trigger="onPick"
            name={['params', 'topBackgroundImage']}
            extra="建议尺寸：1920 * 80；图片不大于 100KB"
          >
            <SmartUploader />
          </Form.Item>
          <Form.Item label="顶部字体颜色" name={['params', 'rightFontColor']}>
            <ColorPicker />
          </Form.Item>
          <Form.Item label="应用字体颜色" name={['params', 'appsFontColor']}>
            <ColorPicker />
          </Form.Item>
          <Form.Item
            label={
              <span>
                应用卡片背景
                <br />
                （静默状态）
              </span>
            }
            name={['params', 'appBgImgIdle']}
            extra="建议尺寸：200 * 150；图片不大于 100KB"
          >
            <SmallImagePicker
              imgStyle={{
                maxHeight: '80px'
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <span>
                应用卡片背景
                <br />
                （鼠标悬浮）
              </span>
            }
            name={['params', 'appBgImgHover']}
            extra="建议尺寸：200 * 150；图片不大于 100KB"
          >
            <SmallImagePicker
              imgStyle={{
                maxHeight: '80px'
              }}
            />
          </Form.Item>
        </Tabs.TabPane>
        <Tabs.TabPane tab="界面应用配置" key="apps" className="tabs-pane-box" forceRender>
          <Form.Item
            wrapperCol={{ flex: '480px' }}
            name={['params', 'appGroups']} // [{name: '', apps: [{id: '', title: '', logo: '', hoverLogo: ''}]}, ...]
          >
            <AppDragGrpups applications={applications} />

          </Form.Item>
        </Tabs.TabPane>
      </Tabs>
    </Form>
  )
}

export default _.flow([
  connect((state) => {
    return {
      applications: state?.[PORTAL_APPS_SAGA_MODEL_NS]?.applications || []
    }
  })
])(HomePageConfigForm)
