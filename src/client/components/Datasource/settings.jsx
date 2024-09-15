import React from 'react'
import { CloseCircleOutlined, QuestionCircleOutlined, RollbackOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { message, Button, Steps, Select } from 'antd';
import * as bus from '../../databus/datasource'
import _ from 'lodash'
import {validateFields} from '../../common/decorators'
import {Link} from 'react-router'
import setStatePromise from '../../common/set-state-promise'
import {immutateUpdate, isDiffByPath} from '../../../common/sugo-utils'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {checkPermission} from '../../common/permission-control'

const canConfigUserActionDims = checkPermission('post:/app/datasource/config-user-action-dims')

const createForm = Form.create
const FormItem = Form.Item
const Step = Steps.Step
const {Option} = Select
let formItemLayout = {
  labelCol: { span: 10 },
  wrapperCol: { span: 14 }
}
const userActionTypes = ['页面名称', '事件名称', '事件类型']
@validateFields
@setStatePromise
class Settings extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      datasource: _.cloneDeep(props.datasourceCurrent)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(nextProps, this.props, 'datasourceCurrent')) {
      this.setState({
        datasource: _.cloneDeep(nextProps.datasourceCurrent)
      }, this.props.form.resetFields)
    }
  }

  submit = async () => {
    let values = await this.validateFields()
    if (!values) return
    let {datasource} = this.state
    let {setProp} = this.props
    let did = datasource.id

    this.setState({
      loading: true
    })
    let requestData = {
      params: {
        ..._.get(datasource, 'params', {}),
        ...values
      }
    }
    let res = await bus.editDatasource(did, requestData)
      
    this.setState({
      loading: false
    })
    if (!res) return
    message.success('更新成功', 2)
    setProp({
      type: 'update_datasources',
      data: {
        id: did,
        requestData
      }
    })
  }

  reset = () => {
    this.setState({
      datasource: _.cloneDeep(this.props.datasourceCurrent)
    }, this.props.form.resetFields)
  }

  renderNoDimension() {
    return (
      <FormItem {...formItemLayout} label="">
        请检查该项目维度是否授权或隐藏，请到[数据管理->数据维度]授权维度,或[排查和隐藏]开放维度。
      </FormItem>
    )
  }

  renderUserActions(getFieldDecorator, commonDimensions, dimensions) {

    return userActionTypes.map((action, index) => {
      let label = '用户行为维度' + '-' + action
      return (
        <FormItem {...formItemLayout} label={label} key={action + index} >
          {
            getFieldDecorator(
              `commonDimensions[${index}]`,
              {
                rules: [
                  { type: 'string', message: '请选择' }
                ],
                initialValue: commonDimensions[index]
              })(
              <Select
                allowClear
                {...enableSelectSearch}
              >
                {dimensions.map(d => {
                  return (
                    <Select.Option key={d.name} value={d.name}>
                      {d.title || d.name}
                    </Select.Option>
                  )
                })}
              </Select>
            )
          }
        </FormItem>
      )
    })
  }

  renderContent() {
    let { dimensions } = this.props
    let {datasource} = this.state
    // 过滤非string类型维度
    dimensions = dimensions.filter(dim => dim.type === 2)
    const {getFieldDecorator} = this.props.form
    const {
      commonDimensions = [],
      commonSession,
      titleDimension
    } = (datasource && datasource.params) || {}

    return (
      <div>
        <FormItem {...formItemLayout} label="SessionID">
          {
            getFieldDecorator(
              'commonSession',
              {
                rules: [
                  { type: 'string', required: false, message: '请选择一个选项' }
                ],
                initialValue: commonSession
              })(
              <Select
                allowClear
                {...enableSelectSearch}
              >
                {dimensions.map(d => {
                  return (
                    <Select.Option key={d.name} value={d.name}>
                      {d.title || d.name}
                    </Select.Option>
                  )
                })}
              </Select>
            )
          }
        </FormItem>
        <FormItem {...formItemLayout} label="路径分析维度">
          {
            getFieldDecorator(
              'titleDimension',
              {
                rules: [
                  { type: 'string', required: false, message: '请选择一个选项' }
                ],
                initialValue: titleDimension
              })(
              <Select
                allowClear
                {...enableSelectSearch}
              >
                {dimensions.map(d => {
                  return (
                    <Select.Option key={d.name} value={d.name}>
                      {d.title || d.name}
                    </Select.Option>
                  )
                })}
              </Select>
            )
          }
        </FormItem>
        {this.renderUserActions(getFieldDecorator, commonDimensions, dimensions)}
      </div>
    )
  }

  render() {
    let {
      dimensions
    } = this.props
    let {loading} = this.state
    // 过滤非string类型维度
    dimensions = dimensions.filter(dim => dim.type === 2)
    const showDimensionsEditor = !!(dimensions && dimensions.length)

    return (
      <div className="height-100 bg-white">
        <div className="datasource-setting">
          <div className="split-line" />
          <div>
            <div className="left fleft">
              <Form layout="horizontal" onSubmit={this.submit}>
                <FormItem {...formItemLayout} label="使用场景">
                  <Select
                    value="user_action"
                    dropdownMatchSelectWidth={false}
                    {...enableSelectSearch}
                  >
                    <Option value="user_action">
                      用户行为场景
                    </Option>
                  </Select>
                </FormItem>
                {
                  showDimensionsEditor
                    ? this.renderContent()
                    : this.renderNoDimension()
                }
                <hr />
                <div className="ant-col-18 ant-col-offset-6">
                  <Link to={'/console/project'}>                    
                    <Button
                      type="ghost"
                      icon={<RollbackOutlined />}
                      className="mg1r iblock"
                    >返回</Button>
                  </Link>
                  <Button
                    type="ghost"
                    icon={<CloseCircleOutlined />}
                    className="mg1r iblock"
                    onClick={this.reset}
                  >重置</Button>
                  <Button
                    type="success"
                    icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
                    className="iblock"
                    onClick={this.submit}
                    disabled={!canConfigUserActionDims}
                    title={canConfigUserActionDims ? null : '您无权限进行设置，请联系管理员'}
                  >{loading ? '提交中...' : '提交'}</Button>
                </div>
              </Form>
            </div>
            <div className="right autocscroll-setting">
              <div className="mg2t">
                <QuestionCircleOutlined className="mg1l mg1r" />
                用户行为数据设置说明
              </div>
              <div className="mg2t">
                <p className="mg1b">Q1. 设置用户行为数据的用处</p>
                <p className="mg1b">设置用户行为数据是设置该项目要接入的数据源，用于在做数据分析的时候使用已接入的数据进行分析，最常见的是用户的行为分析，包括漏斗分析、留存分析、分布分析和用户行为路径分析等。</p>
              </div>
              <div className="mg2t">
                <p className="mg1b">Q2. 设置用户行为数据的各维度说明</p>
                <p className="mg1b">1. SessionID: 标识用户会话状态唯一性的维度，每次只能设置一个维度，记录包括用户的访问时长、访问时间间隔、登录和注册来源等用户访问服务器的维度。</p>
                <p className="mg1b">2. 路径分析维度: 指定设置（路径分析需要的）页面名称或页面路径维度。</p>
                <p className="mg1b">3. 路径分析: 标识用户访问页面的标题维度。</p>
                <p className="mg1b">4. 用户行为维度: 标识用户行为事件的维度，可以设置多个用户行为的维度，记录包括用户的点击、浏览、启动和提交订单等用户行为的维度。</p>
              </div>
              <div className="mg2t">
                <p className="mg1b">Q3. 用户行为场景举例</p>
                <p className="mg1b">以电商场景的漏斗分析为例子，在完成前面的数据接入、维度设置、指标设置之后，在场景数据设置用户ID、SessionID和用户行为维度后，对应漏斗就可以有用户属性、用户行为属性和用户访问服务器的session记录，选择维度和数值后即可做漏斗的分析（整体流程图如下）</p>
              </div>
              <div className="mg2t">
                <Steps direction="vertical">
                  <Step status="wait" title="数据接入" />
                  <Step title="维度设置" />
                  <Step title="指标设置" />
                  <Step title="场景数据设置" />
                  <Step title="选中维度和数值" />
                  <Step title="完成漏斗分析" />
                </Steps>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default createForm()(Settings)
