import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Divider, Input, message, Popconfirm, Radio } from 'antd'
import React from 'react'
import { appTagOrderSagaSyncModelGen, appTagSagaSyncModelGen, TAG_APP_ORDER_SAGA_MODEL_NS, TAG_ORDER_SAGA_MODEL_NS, TAGS_SAGA_MODEL_NS } from './store'
import { createApptag, deleteTag, editTag } from './store/queryhelper'
import _ from 'lodash'
import { connect } from 'react-redux'
import { dictBy } from '../../../../common/sugo-utils'
import { validateFieldsByForm } from '../../../common/decorators'
import { useRuntimeSagaModels } from '../../Common/runtime-saga-helper'
import { APP_MGR_SAGA_MODEL_NS } from './models'

const KEY_NONE_TYPE = 'not-typed'

async function submit(props) {
  const { dispatch, tagList, orderMap, form, isEditing, selectedItem, tagListMap } = props
  let values = await validateFieldsByForm(form)
  if (!values) return message.error('请填写必填项')

  let existedName = tagList.find(i => i.id !== selectedItem.id && i.name === values.name)
  if (existedName?.parentId === selectedItem.parentId) {
    return message.error('同级下存在同名标签')
  }
  if (!isEditing) {
    let res = await createApptag({ newTag: values, orderMap })
    if (!res?.success) return message.error('创建失败')
    message.success('创建成功')
    dispatch({
      type: `${TAGS_SAGA_MODEL_NS}/fetch`
    })
    dispatch({
      type: `${TAG_APP_ORDER_SAGA_MODEL_NS}/fetch`
    })
    form.resetFields()
    return
  }

  if (values?.name === selectedItem?.name) return message.error('没有修改,无需保存')
  if (!values?.name) return message.error('请填写标签名称')
  let res = await editTag({ id: selectedItem?.id, name: values?.name })
  if (!res?.success) return message.error('编辑失败')
  message.success('编辑成功')
  dispatch({
    type: `${TAGS_SAGA_MODEL_NS}/fetch`
  })
  dispatch({
    type: `${TAG_APP_ORDER_SAGA_MODEL_NS}/fetch`
  })
  form.resetFields()
}

async function delTag({ tagId, dispatch }) {
  let res = await deleteTag(tagId)
  if (!res?.success) return message.error('删除标签失败')
  message.success('删除标签成功')
  dispatch({
    type: 'application-management/change',
    payload: {
      selectedTag: ''
    }
  })
  dispatch({
    type: `${TAGS_SAGA_MODEL_NS}/fetch`
  })
  dispatch({
    type: `${TAG_APP_ORDER_SAGA_MODEL_NS}/fetch`
  })
}

//标签管理
function CreateTag(props) {
  const { selectedTag, tagList, tagOrders } = props
  useRuntimeSagaModels(props, [appTagSagaSyncModelGen(TAGS_SAGA_MODEL_NS), appTagOrderSagaSyncModelGen(TAG_APP_ORDER_SAGA_MODEL_NS)])

  const tagListMap = _.keyBy(tagList, 'id')
  const orderMap = dictBy(
    tagOrders,
    o => o.appTagId,
    v => v.order
  )

  const { dispatch } = window.store

  const formItemLayout = {
    labelCol: { span: 4 },
    wrapperCol: { span: 18 }
  }

  const { getFieldDecorator } = props.form

  const { selectedKeys, isCreate, tagTypeTree = {}, setRightContentView } = props

  const isDefault = !isCreate && tagTypeTree.id === KEY_NONE_TYPE && _.includes(selectedKeys, KEY_NONE_TYPE)

  const isEditing = props?.isEditing

  const changeMode = props?.changeMode || null

  const selectedItem = tagListMap[selectedTag] || {}

  const editName = selectedItem?.name

  //  系统标签不能编辑
  const disableUntype = selectedTag === 'unTyped' && isEditing
  return (
    <React.Fragment>
      <div className='pd3'>
        {isEditing ? (
          <Button type='primary' style={{ color: '#6969D7' }} onClick={() => changeMode('main-tree-right-tag-type-create')}>
            <span style={{ color: '#ffffff' }}>添加应用标签</span>
          </Button>
        ) : null}
        <Divider orientation='left'>应用标签信息</Divider>

        <Form layout='horizontal'>
          {isEditing ? null : (
            <Form.Item {...formItemLayout} label='父标签'>
              {getFieldDecorator('parentId', {
                initialValue: selectedTag !== 'unTyped' ? selectedTag : ''
              })(
                <Radio.Group>
                  <Radio key='noparent' value=''>
                    无
                  </Radio>
                  {selectedTag && selectedTag !== 'unTyped' ? (
                    <Radio key='father-node' value={selectedTag}>
                      {tagListMap[selectedTag]?.name}
                    </Radio>
                  ) : null}
                </Radio.Group>
              )}
            </Form.Item>
          )}
          <Form.Item {...formItemLayout} label='标签名称' hasFeedback>
            {isDefault
              ? '未分类'
              : getFieldDecorator('name', {
                  rules: [
                    {
                      min: 2,
                      max: 20,
                      type: 'string',
                      required: true,
                      pattern: new RegExp(/^[\S]/, 'g'),
                      message: '请输入标签名称，长度为2至20个字符,且开头不能为空'
                    }
                  ],
                  initialValue: isEditing ? editName : ''
                })(<Input type='text' autoComplete='off' holder='标签分类名称，不超过20个字符' disabled={disableUntype} />)}
          </Form.Item>
        </Form>
      </div>
      <div
        style={{
          marginLeft: '190px'
        }}
      >
        <Button type='primary' disabled={disableUntype} className='mg1r iblock' onClick={() => submit({ dispatch, tagList, orderMap, isEditing, selectedItem, ...props })}>
          保存
        </Button>
        {isEditing ? (
          <Popconfirm okText='确认' cancelText='取消' title='确定删除该标签?' onConfirm={() => delTag({ tagId: selectedTag, dispatch })}>
            <Button type='danger' className='mg1r iblock' disabled={disableUntype}>
              删除
            </Button>
          </Popconfirm>
        ) : null}
        <Button
          type='cancle'
          className='mg1r iblock'
          onClick={() => {
            props.form.resetFields()
            if (isEditing) {
              setRightContentView()
              dispatch({
                type: 'application-management/change',
                payload: {
                  selectedTag: ''
                }
              })
              // props.form.resetFields()
              return
            }
            // props.form.resetFields()
            setRightContentView('main-tree-right-tag-type-edit')
          }}
        >
          返回
        </Button>
      </div>
    </React.Fragment>
  )
}

export default _.flow([
  connect(state => {
    return {
      selectedTag: state[APP_MGR_SAGA_MODEL_NS].selectedTag,
      tagList: _.get(state, [TAGS_SAGA_MODEL_NS, 'applicationTags']) || [],
      tagOrders: _.get(state, [TAG_ORDER_SAGA_MODEL_NS, 'tagOrders']) || []
    }
  }),
  Form.create()
])(CreateTag)
