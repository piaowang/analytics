import { CheckOutlined, CopyOutlined, WarningOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Radio, DatePicker, Input, message, Popover, Button, Switch } from 'antd';
import {shareStatus, shareType } from '../constants'
import _ from 'lodash'
import moment from 'moment'
import { connect } from 'react-redux'
import { dispatch } from 'd3'
import React, { useRef, useEffect, useState } from 'react'
import setFieldValue from '../../PioProjects/form-render/set-field-value'
import 'moment/locale/zh-cn'
moment.locale('zh-cn')

import zhCN from 'antd/lib/locale-provider/zh_CN'
import locale from 'antd/es/date-picker/locale/zh_CN'
import copyTextToClipboard from '../../../common/copy'
import Fetch from '../../../common/fetch-final.js'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}
const DateOptions = [
  {id: 'unlimited', name: '无限制', key: 'unlimited'},
  {id: 'P1D', name: '1天', key: 'P1D'},
  {id: 'P3D', name: '3天', key: 'P3D'},
  {id: 'P7D', name: '7天', key: 'P7D'},
  {id: 'P15D', name: '15天', key: 'P15D'},
  {id: 'P1M', name: '一个月', key: 'P1M'}
]

function EditModal(props) {
  const {dispatch, onRefresh, shareInfo, visible, namespace, title, screenId, form: {getFieldDecorator, validateFields, setFieldsValue, getFieldValue, resetFields}, container } = props
  const cacheValue = useRef('')
  const [isEncrypt, setIsEncrypt] = useState(false)
  const [showDeleteHint, setShowDeleteHint] = useState(false)
  const [max_age, setMax_age] = useState(null)
  const [timeType, setTimeType] = useState('relativeTime')

  const changeState = (payload) => {
    dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  useEffect(() => {
    if(cacheValue.current === '') {
      cacheValue.current = JSON.stringify(shareInfo)
    } 
    let age = _.get(shareInfo, 'max_age', null)
    setMax_age(age)
    setTimeType(_.isEmpty(age) ? 'customTime' : 'relativeTime')
  }, [shareInfo])

  useEffect(() => {
    if(getFieldValue('type') === '1') {
      setIsEncrypt(true)
    } else {
      setIsEncrypt(false)
    }
  }, [getFieldValue('type')])

  const onSaveShare = () => {
    if (_.isEmpty(shareInfo)) {
      return changeState({isShowEditModal: false })
    }
    validateFields((err, value) => {
      if(err || JSON.stringify(value) === cacheValue.current) return 
      const params = {
        ...value,
        max_age: max_age,
        id: shareInfo.id,
        shareContentName: _.get(shareInfo, 'params.shareContentName', '')
      }

      dispatch({
        type: `${namespace}/saveShareInfo`,
        payload: params,
        callback: () =>  {
          onRefresh()
          changeState({isShowEditModal: false })
        }
      })
    })

  }

  const changeIntervalToNum = (cur, dead) => {
    if(_.isEmpty(shareInfo) || dead === null) return null // 无限制为null
    if(moment(dead).isBefore(cur)) return ''
    const interval = moment(cur).from(moment(dead), true)
    const arr = interval.split(' ')
    if(arr[1] === '天') {
      return (arr[0]).toString()
    } else if (arr[1] === '小时') {
      return '1'
    }
    return ''
  }

  const doCopy = () => {
    let id = _.get(shareInfo, 'id', '')
    if (!id) {
      message.warn('请先启用分享')
      return
    }
    copyTextToClipboard(`${location.origin}/share/${id}`,
      () => message.success('复制分享链接成功'),
      () => message.warn('复制分享链接失败，请手动复制'))
  }

  return (
    <Modal
      maskClosable={false}
      visible={visible}
      title={`${_.get(shareInfo, 'params.shareContentName', '') || title} - 分享编辑`}
      onOk={() => onSaveShare()}
      onCancel={() => {
        changeState({ isShowEditModal: false })
        setFieldsValue({
          'deadline': shareInfo && shareInfo.deadline ? moment(shareInfo.deadline) : moment().add(1, 'd'),
          'value': _.get(shareInfo, 'params.restrictionsContent.value', ''),
          'type': _.get(shareInfo, 'params.restrictionsContent.value', '')? '1': '2'
        })
        if (_.get(shareInfo, 'id', '')) {
          props.dispatch({
            type: `${namespace}/getShareById`,
            payload: {id: shareInfo.id }
          })
        }
        onRefresh()

      }}
      okText="确定"
    >
      <Form>
        {
          namespace === 'top-tool-bar' 
            ? <Form.Item
              label="发布分享"
              {...formItemLayout}
            >
              <Popover
                title="确认取消分享？"
                trigger="click"
                content={(
                  <React.Fragment>
                    <div className="mg2b"><WarningOutlined className="color-red" /> 下次再启用分享时，分享链接会发生变化</div>
                    <div className="alignright">
                      <Button
                        onClick={() => setShowDeleteHint(false)}
                      >取消</Button>
                      <Button
                        type="primary"
                        className="mg2l"
                        onClick={() => {
                          if (showDeleteHint) {
                            props.dispatch({
                              type: `${namespace}/deleteShare`,
                              payload: {id: shareInfo.id },
                              callback: () => {
                                props.dispatch({
                                  type: `${namespace}/getShareById`,
                                  payload: {id: shareInfo.id }
                                })
                              }
                            })
                          }                 
                          setShowDeleteHint(false)
                        }}
                      >确认</Button>
                    </div>
                  </React.Fragment>
                )}
                visible={showDeleteHint}
              >
                <Switch
                  checked={!_.isEmpty(shareInfo)}
                  onChange={checked => {
                    if (!_.isEmpty(shareInfo)) {
                      setShowDeleteHint(!_.isEmpty(shareInfo))
                      return
                    }
                    validateFields(async(err, value) => {
                      if(err || JSON.stringify(value) === cacheValue.current) return 
                      const params = {
                        ...value,
                        max_age: _.isEmpty(max_age) ? 'unlimited' : max_age,
                        content_type: 2,
                        content_id: screenId,
                        params: {
                          ...(value.params || {}),
                          shareContentName: title
                        }
                      }
                      let res = await Fetch.post('/app/sharing', params)
                      if (_.isEmpty(res)) {
                        return message.warning('创建分享失败')
                      }
                      message.success('创建分享成功')

                      props.dispatch({
                        type: `${namespace}/getShareById`,
                        payload: {id: res.result.id}
                      })
                      
                      // dispatch({
                      //   type: `${namespace}/creatShare`,
                      //   payload: params,
                      //   callback: () =>  {
                      //     props.dispatch({
                      //       type: `${namespace}/getShareById`,
                      //       payload: {content_id: screenId}
                      //     })
                      //   }
                      // })
                    })
                  }}
                />
              </Popover>
            </Form.Item>
            : null
        }
        <Form.Item
          label="分享链接"
          {...formItemLayout}
        >
          <Input
            readOnly
            addonAfter={(
              <CopyOutlined className="fpointer" onClick={doCopy} />
            )}
            value={
              _.get(shareInfo, 'id', '') 
                ? `${location.origin}/share/${_.get(shareInfo, 'id', '')}`
                : undefined
            }
            placeholder="未启用分享"
            onClick={doCopy}
          />
        </Form.Item>
        <Form.Item {...formItemLayout} label="分享类型">
          {getFieldDecorator('type', {
            initialValue: _.get(shareInfo, 'params.restrictionsContent.value', '')? '1': '2'
          })(
            <Radio.Group>
              {_.map(shareType, (v, k) => ({ id: k, name: v })).map(o => (<Radio key={o.id} value={o.id}>{o.name}</Radio>))}
            </Radio.Group>
          )}
        </Form.Item>
        {isEncrypt && <Form.Item {...formItemLayout} label="验证方式">
          {getFieldDecorator('value', {
            initialValue: _.get(shareInfo, 'params.restrictionsContent.value', ''),
            rules: [
              {
                pattern: /^[a-zA-Z0-9]+$/g,
                message: '只能是数字、字母和中文组成!'
              },
              // { require: getFieldValue('type') === '1' ? true : false },
              { max: 16, message: '密码不多于16位' },
              { min: 3, message: '密码不少于3位' }
            ]
          })(
            <Input.Password style={{width: 200}} addonBefore="加密验证" />
          )}
        </Form.Item>}
        <Form.Item {...formItemLayout} label="有效期">
          <Radio.Group value={timeType} >
            <Radio.Button value="relativeTime" onClick={() => {
              setTimeType('relativeTime')
            }}
            >相对时间</Radio.Button>
            <Radio.Button value="customTime" onClick={() => {
              setTimeType('customTime')
            }}
            >自定义时间</Radio.Button>
          </Radio.Group>
          <br/>
          {getFieldDecorator('deadline', {
            initialValue: shareInfo && shareInfo.deadline ? moment(shareInfo.deadline) : moment().add(1, 'd'),
            rules: [{
              meassage: '有效期应大于当前时间',
              validator: function(rule, value, callback) {
                setMax_age(null)
                if(moment(value).isBefore(moment())){
                  return callback(rule.meassage)
                }
                return callback()
              }
            }]
          })(
            timeType === 'customTime' ? 
              <DatePicker
                showToday={false}
                style={{ width: 150, marginBottom: '10px' }}
                locale={locale}
              />
              : <div/>
          )}
          {timeType === 'relativeTime' 
            ? <Radio.Group value={max_age} >
              {DateOptions.map(o => (
                <Radio.Button value={o.id} key={o.key} 
                  style={{
                    position: 'relative',
                    background: max_age === o.id ? '#1890ff' : 'white',
                    borderColor: max_age === o.id ? '#1890ff' : '#d9d9d9',
                    boxShadow: '0px 0 0 0 #1890ff'
                  }}
                  onClick={() => {
                    setMax_age(o.id)
                    setFieldsValue({
                      'deadline': moment().add(1, 'd')
                    })
                  }}
                >
                  {o.name}
                  {
                    max_age === o.id 
                      ? <CheckOutlined className="absolute bottom0 left0" />
                      : null
                  }
                </Radio.Button>
              ))}
            </Radio.Group>
            : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
}

// export default Form.create({})(EditModal)
let namespace1 = 'share-manager'
let namespace2 = 'top-tool-bar'
export const EditModal1 = connect(state => ({ ...state[namespace1] }))(Form.create({})(EditModal))
export const EditModal2 = connect(state => ({ ...state[namespace2] }))(Form.create({})(EditModal))

