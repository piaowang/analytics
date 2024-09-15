import React from 'react'
import Bread from '../Common/bread'
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, message, Select, Tooltip } from 'antd';
import _ from 'lodash'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import {sagaSyncModel} from '../Fetcher/saga-sync'
import Fetch from '../../common/fetch-final'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {validateFieldsByForm} from '../../common/decorators'
import { reviewerSagaModelGenerator } from './saga-model-generators'

import { OfflineCalcTargetType, OfflineCalcTargetTypeName } from '../../../common/constants'

const namespace = 'offline-calc-data-reviewer'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

const {Option} = Select

let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  return {
    ...modelState,
    // datasourceCurrent: _.get(state, 'sagaCommon.datasourceCurrent', {}),
    users: _.get(state, 'common.users', [])
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel(reviewerSagaModelGenerator(namespace))
@Form.create()
export default class SetReviewer extends React.Component {
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }
  
  /*componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'offlineCalcDataSourcesBak')) {
      this.props.form.resetFields()
    }
  }*/
  
  onSubmit = async ev => {
    let {offlineCalcSetReviewer, dispatch, form } = this.props
    ev.preventDefault()
    let formVals = await validateFieldsByForm(form)
    if (!formVals) {
      return
    }

    let selected_target_type = formVals.target_type

    let currDs = _.find(offlineCalcSetReviewer, o => o.target_type === selected_target_type)
  
    const isCreating = _.isEmpty(currDs)

    if (isCreating) {
      formVals = _.omit(formVals,'id')
    } else {
      formVals.id = _.get(currDs,'id')
    }

    const currIdInUrl = _.get(currDs,'id')
    let nextDataSources = isCreating
      ? [formVals]
      : offlineCalcSetReviewer.map(d => d.id === currIdInUrl ? {...d, ...formVals} : d)
    await dispatch({
      type: `${namespace}/sync`,
      payload: nextDataSources,
      callback: syncRes => {
        let {resCreate, resUpdate} = syncRes || {}
        if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
          message.warn('没有修改数据，无须保存')
          return
        }
        if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
          // 保存报错
          return
        }
        const isCreated = _.isEmpty(resUpdate)
        message.success((
          <span>{isCreated ? '创建' : '修改'}审核者成功</span>
        ))
        dispatch({
          type: `${namespace}/fetch`
        })
      }
    })
    console.log(formVals)
  }
  
  render() {
    let {users, offlineCalcSetReviewer} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form

    let selected_target_type = getFieldValue('target_type')

    let {SugoRoles} = window.sugo.user
    let userRolesIds = SugoRoles.map(s => s.id)
    let isAdmin = _.some(SugoRoles, s => s.type === 'built-in')
    let currDs = _.find(offlineCalcSetReviewer, o => o.target_type === selected_target_type)
  
    const isCreating = _.isEmpty(currDs)
    if (isCreating) {
      getFieldDecorator('strategy', {
        initialValue: 0
      })
    }
    return (
      <Form
        onSubmit={this.onSubmit}
        className="width600 mg-auto mg3t"
      >
        <Form.Item label="审核主体" {...formItemLayout}>
          {getFieldDecorator('target_type', {
            initialValue: _.get(currDs, 'target_type') || OfflineCalcTargetType.Indices,
            rules: [
              { required: true, message: '必填项' }
            ]
          })(
            <Select
              onChange={(value) => {
                let nextDs = _.find(offlineCalcSetReviewer, o => o.target_type === value)
                setFieldsValue({
                  'reviewer_ids': _.get(nextDs, 'reviewer_ids') || [],
                  'description': ''
                })
              }}
            >
              {Object.keys(OfflineCalcTargetType).filter(t => t in OfflineCalcTargetTypeName)
                .map( i => (
                  <Option key={i} value={OfflineCalcTargetType[i]}>
                    {OfflineCalcTargetTypeName[i]}
                  </Option>
                ))}
            </Select>
          )}
        </Form.Item>
      
        <Form.Item label={(
          <Tooltip
            overlay="请按顺序选择"
            placement="top"
          >
            审核者
            <QuestionCircleOutlined className='color-black mg1l' />
          </Tooltip>
        )} {...formItemLayout}
        >
          {getFieldDecorator('reviewer_ids', {
            initialValue: _.get(currDs, 'reviewer_ids') || [],
            rules: [
              { required: true, message: '必填项' }
            ]
          })(
            <Select
              mode="multiple"
            >
              {
                users.map( user => {
                  let disabled =  isAdmin ? false : !_.some(user?.roles, r => userRolesIds.includes(r.id))
                  return (<Option
                    key={user.id}
                    disabled={disabled}
                    value={user.id}
                  >{user.first_name ? `${user.first_name}(${user.username})` : user.username}</Option>)
                })
              }
            </Select>
          )}
        </Form.Item>
      
        <Form.Item
          label="备注"
          {...formItemLayout}
        >
          {getFieldDecorator('description', {
            initialValue: _.get(currDs, 'description') || ''
          })(<Input />)}
        </Form.Item>
        <Form.Item
          label={'\u00a0'}
          colon={false}
          {...formItemLayout}
        >
          <Button
            type="primary"
            htmlType="submit"
          >{isCreating ? '确认新建' : '保存修改'}</Button>
        </Form.Item>
      </Form>
    );
  }
}
