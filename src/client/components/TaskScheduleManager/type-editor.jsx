import _ from 'lodash'
import React from 'react'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Radio, Modal, message } from 'antd';
import {withPoster} from '../Fetcher/poster'
import {isDiffByPath, toQueryParams, tryJsonParse} from '../../../common/sugo-utils'
import PubSub from 'pubsub-js'
import {RELOAD_TREE} from './constants'
import {sendURLEncoded} from '../../common/fetch-utils'
import { validateFields } from '../../common/decorators'

const RadioGroup = Radio.Group
const FormItem = Form.Item

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 4 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 18 }
  }
}

@Form.create()
@validateFields
export default class TypeEditor extends React.Component {

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(this.props, nextProps, 'value')) {
      this.resetForm()
    }
  }

  resetForm = () => {
    this.props.form.resetFields()
  }

  renderSaveBtn = withPoster(_.identity)(poster => {
    let {value, projectId} = this.props
    let isCreating = !(value && value.id)
    return (
      <Button
        icon={<CheckCircleOutlined />}
        type="success"
        loading={poster.isFetching}
        onClick={async () => {
          if (!projectId) {
            return
          }
          let fieldVals = await this.validateFields()
          if (!fieldVals) {
            return
          }
          let finalVal = {...value, ...fieldVals}
          // TODO call onChange ?
          let res = await poster.fetch(null, {
            ...sendURLEncoded,
            body: toQueryParams(_.pickBy({
              action: isCreating ? 'add' : 'edit',
              id: finalVal.id,
              name: finalVal.name,
              parentId: finalVal.parentId || 0,
              description: finalVal.description || '',
              refProjectId: projectId
            }, v => v || v === 0))
          })
          // {status: "success"}
          res = tryJsonParse(res)
          if ('error' in res) {
            message.warn(`创建任务分类失败：${res.error}`)
          } else {
            this.resetForm()
            message.success('创建任务分类成功')
            PubSub.publish(RELOAD_TREE)
          }
        }}
      >{value.id ? '保存修改' : '新建分类'}</Button>
    );
  })

  renderDeleteBtn = withPoster(_.identity)(poster => {
    let {value} = this.props
    let {onCurrentNodeDeleted} = this.props
    return (
      <Button
        icon={<CloseCircleOutlined />}
        className="mg2l"
        loading={poster.isFetching}
        onClick={async () => {
          Modal.confirm({
            title: `确认删除分类 ${value.name} ？`,
            content: '此操作无法撤销，请谨慎操作',
            okText: '确认',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
              let res = await poster.fetch(null, {
                ...sendURLEncoded,
                body: toQueryParams({
                  treeOperation: 'deleteType',
                  typeId: value.id
                })
              })
              // {status: "success"}
              if (_.get(res, 'status') === 'success') {
                this.resetForm()
                message.success('删除任务分类成功')
                PubSub.publish(RELOAD_TREE)
                onCurrentNodeDeleted()
              } else {
                message.warn(`删除任务分类失败：${_.get(res, 'message') || '未知原因'}`)
              }
            }
          })
        }}
      >删除分类</Button>
    );
  })

  render() {
    let {value, treeData, form} = this.props
    let {getFieldDecorator} = form
    let isCreating = !(value && value.id)

    let selectedTypeId = (isCreating ? value.parentId : value.id) || 0
    let selectedType = _(treeData).chain().get([0, 'types']).find({id: selectedTypeId}).value()
    // 编辑的时候，可以编辑父节点为 当前父节点 或 无
    // 如果是添加的时候，父节点能选 当前节点 父节点 或 无
    let parentType = _.get(selectedType, 'parentId') && _(treeData).chain().get([0, 'types'])
      .find({id: _.get(selectedType, 'parentId')}).value()
    let parentTypeOptions = isCreating ? [selectedType, parentType] : [parentType]

    return (
      <div className="bg-white corner" style={{height: 'calc(100% - 115px - 10px)'}}>
        <Form className="" style={{maxWidth: '1130px', margin: '0 auto', paddingTop: '50px'}}>
          <FormItem
            {...formItemLayout}
            label="父分类"
          >
            {getFieldDecorator('parentId', {
              initialValue: (value.parentId || 0) + ''
            })(
              <RadioGroup >
                {parentTypeOptions.filter(_.identity).map(type => {
                  return (
                    <Radio value={type.id + ''} key={type.id}>{type.name}</Radio>
                  )
                })}
                <Radio value="0" key={0}>无</Radio>
              </RadioGroup>
            )}

          </FormItem>

          <FormItem
            {...formItemLayout}
            label="分类名称"
            required
          >
            {getFieldDecorator('name', {
              initialValue: value.name
            })(
              <Input />
            )}
          </FormItem>

          <FormItem
            {...formItemLayout}
            label="分类描述"
          >
            {getFieldDecorator('description', {
              initialValue: value.description
            })(
              <Input.TextArea autosize={{ minRows: 3 }} />
            )}
          </FormItem>
          <FormItem
            {...formItemLayout}
            label={'\u00a0'}
            className="aligncenter"
            colon={false}
          >
            {this.renderSaveBtn({
              url: '/app/task-schedule/type',
              doFetch: false
            })}

            {value.id
              ? this.renderDeleteBtn({
                url: '/app/task-schedule/manager',
                doFetch: false
              })
              : null}
          </FormItem>
        </Form>
      </div>
    )
  }
}
