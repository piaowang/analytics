import React, { useRef, useState } from 'react'
import Bread from '../Common/bread'
import { Button, Divider, Form, Input, message, Switch, Tabs, Affix, Row, Col } from 'antd'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import { getSagaState, useRuntimeSagaModels } from '../Common/runtime-saga-helper'
import { PORTAL_PAGES_SAGA_MODEL_NS, portalPagesSagaModelGenerator, PORTALS_SAGA_MODEL_NS, portalsSagaModelGenerator } from './portals-saga-model'
import _ from 'lodash'
import { browserHistory } from 'react-router'
import { connect } from 'react-redux'
import { forAwaitAll, hashCode, immutateUpdate } from '../../../common/sugo-utils'
import { PAGE_TYPE_CONFIG_FORM_DICT, PAGE_TYPE_TEMPLATE_DICT, PORTAL_PAGES_TYPE_ENUM, PORTAL_PAGES_TYPE_TRANSLATION } from './constants'
import { generate } from 'shortid'
import PubSub from 'pubsub-js'
import Rect from '../Common/react-rectangle'
import SizeProvider from '../Common/size-provider'
import Timer from '../Common/timer'

const { TabPane } = Tabs

const formlayout = {
  labelCol: { flex: '100px' },
  wrapperCol: { flex: 1, style: { marginRight: '20px' } }
}

const layout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 19 }
}
const tailLayout = {
  wrapperCol: { offset: 4, span: 20 }
}

const formWidth = '500px'
function PortalEdit(props) {
  const { portals = [], portalPages = [] } = props
  const { dispatch } = window.store
  const [activeKey, setActiveKey] = useState('login')
  // const [portalLogin, setPortalLogin] = useState({})
  const [homeTabActiveKey, setHomeTabActiveKey] = useState('base')

  const portalFormRef = useRef()
  let currentPortalId = _.get(props, 'params.id')
  const currentPortal = currentPortalId !== 'new' ? _.first(portals) : { id: 'new' }

  useRuntimeSagaModels(props, [portalsSagaModelGenerator(PORTALS_SAGA_MODEL_NS)], [currentPortalId])

  useRuntimeSagaModels(props, [props => portalPagesSagaModelGenerator(PORTAL_PAGES_SAGA_MODEL_NS, currentPortal && currentPortal.id)()], [currentPortal && currentPortal.id])
  const formKey = hashCode(JSON.stringify(currentPortal || {}))

  //预览
  const getRead = async () => {
    try {
      //异步验证所有表单
      await forAwaitAll(_.keys(PORTAL_PAGES_TYPE_ENUM), async type => {
        await new Promise((resolve, reject) => {
          PubSub.publish(`portal-page-config-form-validate:${type}`, (errors, values) => {
            if (errors) {
              setActiveKey(errors.current)
              reject(errors)
            } else {
              resolve(values)
            }
          })
        })
      })
    } catch (e) {
      message.warn('表单未通过验证，无法预览')
      return
    }
    // setPortalHome(getHomeRef.current.getFieldsValue())
    // setPortalLogin(getLoginRef.current.getFieldsValue())
  }
  // 基础属性表单提交
  const onSubmitAll = async values => {
    try {
      //异步验证所有表单
      await forAwaitAll(_.keys(PORTAL_PAGES_TYPE_ENUM), async type => {
        await new Promise((resolve, reject) => {
          PubSub.publish(`portal-page-config-form-validate:${type}`, (errors, values) => {
            if (errors) {
              setActiveKey(errors.current)
              reject(errors)
            } else {
              resolve(values)
            }
          })
        })
      })
    } catch (e) {
      message.warn('表单未通过验证，无法保存')
      return
    }
    values = { ...values, status: values.status ? 1 : 0 }
    const nextPortal = {
      ...(currentPortal || {}),
      ...values,
      id: currentPortal.id === 'new' ? generate() : currentPortal.id
    }

    await new Promise((resolve, reject) => {
      dispatch({
        type: `${PORTALS_SAGA_MODEL_NS}/sync`,
        payload: [nextPortal],
        callback: ({ resCreate }) => {
          let created = _.first(resCreate)
          if (created) {
            message.success('新建成功')
            browserHistory.push(`/console/portals-mgr/${created.id}`)
          }
          resolve()
        }
      })
    })
    const { portalPages } = getSagaState(PORTAL_PAGES_SAGA_MODEL_NS)
    const nextPortalPages = currentPortal.id === 'new' ? _.map(portalPages, p => ({ ...p, portalId: nextPortal.id })) : portalPages
    dispatch({
      type: `${PORTAL_PAGES_SAGA_MODEL_NS}/sync`,
      payload: nextPortalPages,
      callback: ({ resCreate, resUpdate }) => {
        if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
          message.success('保存成功')
          return
        }
        if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
          // 保存报错
          // message.success('保存失败，请联系管理员')
          return
        }
        message.success('保存成功')
      }
    })
  }
  return (
    <div className='height-100 contain-docs-analytic'>
      <Bread path={[{ name: '数据应用中心' }, { name: '智能数据门户', link: '/console/portals-mgr' }, { name: '门户编辑' }]} />

      <div
        style={{
          minHeight: 'calc(100% - 43px)',
          height: 1,
          padding: '10px'
        }}
        className='overscroll-y'
      >
        <div className='bg-white corner'>
          <div style={{ padding: '4px 0px' }}>
            <Divider orientation='left'>基础属性</Divider>
            <Form
              {...formlayout}
              ref={portalFormRef}
              key={formKey}
              name='basic'
              initialValues={{
                ...(currentPortal || {}),
                status: _.get(currentPortal, 'status') || 0
              }}
              onFinish={onSubmitAll}
              onFinishFailed={errorInfo => {}}
            >
              <Row>
                <Col span={12}>
                  <Form.Item label='门户名称' name='name' rules={[{ required: true, message: '未输入门户名称' }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label='状态' name='status' rules={[]} valuePropName='checked'>
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={12}>
                  <Form.Item
                    label='门户地址'
                    name='basePath'
                    rules={[{ required: true, message: '地址不符合规则', pattern: /^\w+$/ }]}
                    extra={
                      <Timer interval={1000}>
                        {() => {
                          // 用 timer 临时解决 extra 没有更新的问题
                          const currBasePath = (portalFormRef.current && portalFormRef.current.getFieldValue('basePath')) || null
                          return (currBasePath && `${window.location.origin}/${currBasePath}`) || null
                        }}
                      </Timer>
                    }
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        </div>

        <div
          style={{
            minHeight: 'calc(100% - 260px)',
            marginTop: '10px',
            paddingBottom: '100px'
          }}
          className='bg-white corner relative'
        >
          <Tabs
            activeKey={activeKey}
            defaultActiveKey='login-page'
            onChange={val => {
              setActiveKey(val)
            }}
          >
            {_.map(PORTAL_PAGES_TYPE_TRANSLATION, (name, key) => {
              let portalPageIndex = _.findIndex(portalPages, p => p.type === key)

              let portalPage = portalPageIndex === -1 ? { type: key, portalId: currentPortal && currentPortal.id } : portalPages[portalPageIndex]

              const subFormKey = hashCode(JSON.stringify(portalPage))

              console.log('portalPage:', portalPage)

              const FormComp = PAGE_TYPE_CONFIG_FORM_DICT[key]
              const PreviewComp = PAGE_TYPE_TEMPLATE_DICT[key][portalPage.templateId]
              return (
                <TabPane tab={<div className='pd2x'>{name}</div>} key={key} forceRender>
                  <FixWidthHelper toFix='last' toFixWidth={formWidth} wrapperStyle={{ flex: 1 }}>
                    {/* <Affix offsetBottom={0} target={() => document.querySelector('.overscroll-y')}> */}
                    <div className='pd2x'>
                      <div className='mg1t' style={{ marginBottom: '10px' }}>
                        效果预览（请先提交）：
                      </div>
                      {PreviewComp ? (
                        <Rect aspectRatio={16 / 9}>
                          <SizeProvider>
                            {({ spWidth, spHeight }) => {
                              const [fakeScreenWidth, fakeScreenHeight] = [1920, 1080]
                              return (
                                <div
                                  style={{
                                    width: fakeScreenWidth,
                                    height: fakeScreenHeight,
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: `translate(-50%, -50%) scale(${spWidth / fakeScreenWidth})`
                                  }}
                                  className='border ignore-mouse'
                                >
                                  <PreviewComp className='height-100' config={portalPage} isMin />
                                </div>
                              )
                            }}
                          </SizeProvider>
                        </Rect>
                      ) : (
                        <div className='pa3 color-gray font14'>请先选择模板</div>
                      )}
                    </div>
                    {/* </Affix> */}
                    <FormComp
                      key={`${subFormKey}-${key}`}
                      homeTabActiveKey={homeTabActiveKey}
                      onHomeTabChange={val => {
                        setHomeTabActiveKey(val)
                      }}
                      formName={key}
                      value={portalPage}
                      onChange={next => {
                        dispatch({
                          type: `${PORTAL_PAGES_SAGA_MODEL_NS}/updateState`,
                          payload: prevState => {
                            console.log('prevState:', prevState)
                            return immutateUpdate(prevState, 'portalPages', pages => {
                              return portalPageIndex === -1 ? [...(pages || []), next] : _.map(pages, (p, i) => (i === portalPageIndex ? next : p))
                            })
                          }
                        })
                      }}
                    />
                  </FixWidthHelper>
                </TabPane>
              )
            })}
          </Tabs>

          <div style={{ height: 100, padding: '28px 42px' }} className='bordert absolute bottom0 width-100'>
            <Form {...layout} style={{ width: formWidth }}>
              <Form.Item>
                <Button
                  className='mg2r'
                  onClick={() => {
                    browserHistory.push('/console/portals-mgr')
                  }}
                >
                  返回
                </Button>
                <Button style={{ marginRight: '18px' }} onClick={getRead}>
                  预览
                </Button>
                <Button
                  type='primary'
                  onClick={() => {
                    portalFormRef.current.submit()
                  }}
                >
                  提交
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default _.flow([
  connect(props => ({
    ...(props[PORTALS_SAGA_MODEL_NS] || {}),
    ...(props[PORTAL_PAGES_SAGA_MODEL_NS] || {})
  }))
])(PortalEdit)
