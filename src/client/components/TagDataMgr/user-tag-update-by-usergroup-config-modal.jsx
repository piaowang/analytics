import { CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Modal, Radio, Select, message } from 'antd';
import _ from 'lodash'
import CronPicker from '../Common/cron-picker'
import React from 'react'
import TagPicker from '../TaskScheduleManager/tag-picker'
import {
  UserGroupBuildInTagEnum,
  UserTagUpdateTaskTypeEnum,
  UserTagUpdateTaskUpdateStrategyEnum,
  UserTagUpdateTaskUpdateStrategyTranslation
} from '../../../common/constants'
import {validateFieldsAndScroll} from '../../common/decorators'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {synchronizer} from '../Fetcher/synchronizer'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {immutateUpdate, isDiffBySomePath} from '../../../common/sugo-utils'
import {untypedTreeId} from '../TagManager/tag-type-list'
import {MultipleValuesTypeOffset} from '../../../common/druid-column-type'

const {Item: FormItem} = Form
const {Group: RadioGroup} = Radio
const {Option} = Select

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}

const getPopupContainer = () => document.querySelector('.userTagUpdateByUserGroupTaskModal div.ant-modal-body')

@withContextConsumer(ContextNameEnum.ProjectInfo)
@Form.create()
@validateFieldsAndScroll
export default class UserTagUpdateByUserGroupConfigModal extends React.Component {

  componentWillReceiveProps(nextProps) {
    if (isDiffBySomePath(this.props, nextProps, 'value', 'value.id')) {
      this.resetForm()
    }
  }

  checkRules = (rule, value, callback) => {
    const { cronExpression } = value
    if (!cronExpression || cronExpression === '* * * * *') {
      callback('请设置调度频率!')
      return
    }
    callback()
  }

  handleSubmit = async () => {
    const { value, onChange, projectCurrent } = this.props

    let newData = await this.validateFieldsAndScroll()
    if (!newData) {
      return
    }
    if (!_.trim(_.get(newData, 'title', ''))) {
      message.error('标题不能为空!')
      return
    }
    newData = immutateUpdate(newData, 'params.userGroupTagId', () => UserGroupBuildInTagEnum.UserGroupWithoutLookup)
    const res = await onChange({
      ...(value || {}),
      ...newData,
      project_id: projectCurrent && projectCurrent.id,
      type: UserTagUpdateTaskTypeEnum.UpdateByUserGroup
    })
    if (res && (!_.head(res.resCreate) || !_.head(res.resUpdate))) {
      return
    }
    this.onCancel()
  }

  onCancel = () => {
    let {onVisibleChange} = this.props
    onVisibleChange(false)
  }

  resetForm = () => {
    this.props.form.resetFields()
  }

  renderTagSelector = synchronizer(_.identity)(syncRes => {
    const {dbTags, value} = this.props
    const { getFieldDecorator, getFieldValue } = this.props.form
    const {tagTypeMappings} = syncRes
    const selectedType = getFieldValue('params.userTagUpdates[0].typeId')

    const targetTagIds = (tagTypeMappings || []).filter(m => m.tag_tree_id === selectedType).map(m => m.dimension_id)
    const targetTagIdsSet = new Set(targetTagIds)
    return (
      <FormItem {...formItemLayout} label="标签">
        {getFieldDecorator('params.userTagUpdates[0].tagName', {
          initialValue: _(value).chain().get('params.userTagUpdates[0].tagName').thru(val => _.isArray(val) ? val[0] : val).value(),
          rules: [{ required: true, message: '请选择标签' }]
        }) (
          <Select
            placeholder="请选择标签"
            {...enableSelectSearch}
            getPopupContainer={getPopupContainer}
          >
            {(dbTags || []).filter(dbTag => {
              return _.isEmpty(selectedType)
                ? true
                : selectedType === untypedTreeId
                  ? !targetTagIdsSet.has(dbTag.id)
                  : targetTagIdsSet.has(dbTag.id)
            }).map(dbTag => {
              return (
                <Option key={dbTag.id} value={dbTag.name}>{dbTag.title || dbTag.name}</Option>
              )
            })}
          </Select>
        )}
      </FormItem>
    )
  })

  render() {
    const { value, onChange, saving, visible, datasourceCurrent, dbUgs, dbTags } = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue} = this.props.form

    const dsId = datasourceCurrent && datasourceCurrent.id || ''
    const currTagName = _(value).chain().get('params.userTagUpdates[0].tagName')
      .thru(val => _.isArray(val) ? val[0] : val).value()
    const pendingTagName = getFieldValue('params.userTagUpdates[0].tagName') || currTagName
    let isMultiValueTag = _(dbTags).chain().find({name: pendingTagName})
      .thru(dbTag => dbTag && MultipleValuesTypeOffset <= dbTag.type).value()
    return (
      <Modal
        title="创建用户群定义标签"
        visible={visible}
        onCancel={this.onCancel}
        width={700}
        className="userTagUpdateByUserGroupTaskModal"
        footer={(
          <div className="alignright">
            <Button
              type="ghost"
              icon={<CloseCircleOutlined />}
              className="mg1r iblock"
              onClick={this.onCancel}
            >取消</Button>
            <Button
              type="success"
              icon={<CheckOutlined />}
              loading={saving}
              className="mg1r iblock"
              onClick={this.handleSubmit}
            >{saving ? '提交中...' : '提交'}</Button>
          </div>
        )}
      >
        <Form>
          <FormItem {...formItemLayout} label="标题">
            {getFieldDecorator('title', {
              initialValue: value && value.title,
              rules: [{ required: true, message: '请输入标签计算任务标题' }]
            }) (
              <Input placeholder="标签计算任务标题" />
            )}
          </FormItem>

          <FormItem {...formItemLayout} label="描述">
            {getFieldDecorator('params.description', {
              initialValue: _.get(value, 'params.description')
            }) (
              <Input.TextArea placeholder="标签计算任务描述" rows={4} />
            )}
          </FormItem>

          <FormItem {...formItemLayout} label="用户群组">
            标签计算群
          </FormItem>

          <FormItem {...formItemLayout} label="用户群">
            {getFieldDecorator('params.userGroupId', {
              initialValue: _.get(value, 'params.userGroupId'),
              rules: [{ required: true, message: '请选择用户群' }]
            }) (
              <Select
                placeholder="请选择用户群"
                {...enableSelectSearch}
                getPopupContainer={getPopupContainer}
              >
                {(dbUgs || []).map(dbUg => {
                  return (
                    <Option key={dbUg.id} value={dbUg.id}>{dbUg.title}</Option>
                  )
                })}
              </Select>
            )}
          </FormItem>

          <FormItem {...formItemLayout} label="标签类别">
            {getFieldDecorator('params.userTagUpdates[0].typeId', {
              initialValue: _(value).chain().get('params.userTagUpdates[0].typeId').thru(val => _.isArray(val) ? val[0] : val).value()
            }) (
              <TagPicker
                placeholder="按分类筛选标签"
                dataSource={datasourceCurrent}
                treeCheckable={false}
                tagTypeOnly
                onChange={val => {
                  setFieldsValue({'params.userTagUpdates[0].tagName': undefined})
                }}
                getPopupContainer={getPopupContainer}
              />
            )}
          </FormItem>

          {this.renderTagSelector({
            url: '/app/tag-type/get',
            modelName: 'tagTypeMappings',
            doFetch: !!dsId,
            query: { where: { datasource_id: dsId }}
          })}

          <FormItem {...formItemLayout} label="标签值">
            {getFieldDecorator('params.userTagUpdates[0].targetValue', {
              initialValue: _.get(value, 'params.userTagUpdates[0].targetValue'),
              rules: [{ required: true, message: '请输入标签将要设置的目标值' }]
            }) (
              isMultiValueTag
                ? (
                  <Select
                    mode="tags"
                    placeholder="请输入标签将要设置的目标值，按回车继续添加"
                  />
                )
                : (
                  <Input placeholder="请输入标签将要设置的目标值" />
                )
            )}
          </FormItem>
          
          <FormItem {...formItemLayout} label="清空标签旧数据" style={{marginBottom: '6px'}}>
            {getFieldDecorator('params.clearCurrentTagOldData', {
              initialValue: _.get(value,'params.clearCurrentTagOldData') || false
            }) (
              <RadioGroup >
                <Radio value={false} >否</Radio>
                <Radio value >是</Radio>
              </RadioGroup>
            )}
          </FormItem>

          <FormItem {...formItemLayout} label="周期" style={{marginBottom: '6px'}}>
            {getFieldDecorator('params.updateStrategy', {
              initialValue: _.get(value, 'params.updateStrategy') || UserTagUpdateTaskUpdateStrategyEnum.Manual
            }) (
              <RadioGroup >
                {_.keys(UserTagUpdateTaskUpdateStrategyEnum).map(k => {
                  return (
                    <Radio value={UserTagUpdateTaskUpdateStrategyEnum[k]} key={k}>{UserTagUpdateTaskUpdateStrategyTranslation[k]}</Radio>
                  )
                })}
              </RadioGroup>
            )}
          </FormItem>

          {getFieldValue('params.updateStrategy') === UserTagUpdateTaskUpdateStrategyEnum.Interval
            ? (
              <FormItem {...formItemLayout} label={'\u00a0'} colon={false} style={{marginBottom: 0}}>
                <div style={{marginLeft: '64px'}}>
                  {getFieldDecorator('params.cronInfo', {
                    initialValue: _.get(value, 'params.cronInfo', { unitType: '0', period: 'day', cronExpression: '0 0 * * *' }),
                    rules: [{ validator: this.checkRules }]
                  }) (
                    <CronPicker getPopupContainer={getPopupContainer} />
                  )}
                </div>
              </FormItem>
            )
            : null}
        </Form>
      </Modal>
    );
  }

}
