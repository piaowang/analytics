import React from 'react'
import { CloseCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Button, message } from 'antd';
import {validateFields} from '../../common/decorators'
import _ from 'lodash'
import {isStringDimension, isTimeDimension} from '../../../common/druid-column-type'
import {editDatasource} from '../../databus/datasource'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import DistinctSelect from '../Common/distinct-cascade'
import {immutateUpdate, immutateUpdates, isDiffByPath} from '../../../common/sugo-utils'

const {Item: FormItem} = Form
const {Option} = Select

let formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 }
}

@Form.create()
@validateFields
export default class UserTypeScene extends React.Component {

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
    if (!values) {
      return
    }
    let {datasource} = this.state

    let dsId = _.get(datasource, 'id') || ''
    this.setState({
      loading: true
    })
    let requestData = {
      params: {
        ..._.get(datasource, 'params', {}),
        ...values
      }
    }
    let res = await editDatasource(dsId, requestData)

    this.setState({
      loading: false
    })
    if (!res) return
    message.success('更新成功', 2)

    this.props.setProp({
      type: 'update_datasources',
      data: {
        id: dsId,
        requestData
      }
    })
  }

  reset = () => {
    this.setState({
      datasource: _.cloneDeep(this.props.datasourceCurrent)
    }, this.props.form.resetFields)
  }

  renderNoDimHint() {
    return (
      <FormItem {...formItemLayout} label="">
        请检查该项目维度是否授权或隐藏，请到[数据管理->数据维度]授权维度,或[排查和隐藏]开放维度。
      </FormItem>
    )
  }

  renderUserIdDimSelector({strDims, commonMetric}) {
    const {getFieldDecorator} = this.props.form

    return (
      <FormItem {...formItemLayout} label="用户ID">
        {
          getFieldDecorator(
            'commonMetric',
            {
              rules: [
                { type: 'array', required: true, message: '最少请选择1项' },
                {
                  validator: (rule, value, callback) => {
                    if (5 < _.size(value)) {
                      callback('最多可选择5项')
                    } else {
                      callback()
                    }
                  }
                }
              ],
              initialValue: commonMetric
            })(
            <Select
              mode="multiple"
              allowClear
              {...enableSelectSearch}
              placeholder="请选择..."
            >
              {strDims.map(d => {
                return (
                  <Option key={d.name} value={d.name}>{d.title || d.name}</Option>
                )
              })}
            </Select>
          )
        }
      </FormItem>
    )
  }

  renderDimPicker({dbDims, initialValue, paramName, label}) {
    const {getFieldDecorator} = this.props.form
    return (
      <FormItem {...formItemLayout} label={label} >
        {
          getFieldDecorator(
            paramName,
            {
              rules: [ { type: 'string', message: '请选择' } ],
              initialValue: initialValue
            })(
            <Select
              {...enableSelectSearch}
              allowClear
              placeholder="请选择..."
            >
              {dbDims.map(d => {
                return (
                  <Option key={d.name} value={d.name}>{d.title || d.name}</Option>
                )
              })}
            </Select>
          )
        }
      </FormItem>
    )
  }

  renderFormItems() {
    let { dimensions } = this.props
    let { datasource } = this.state

    let strDims = dimensions.filter(isStringDimension)
    let timeDims = dimensions.filter(isTimeDimension)
    const {
      commonMetric,
      loginId,
      firstVisitTimeDimName,
      firstLoginTimeDimName
    } = (datasource && datasource.params) || {}

    return (
      <div>
        {this.renderUserIdDimSelector({strDims, commonMetric})}

        {this.renderDimPicker({
          label: '会员ID',
          initialValue: loginId,
          paramName: 'loginId',
          dbDims: strDims
        })}

        {this.renderDimPicker({
          label: '首次访问时间',
          initialValue: firstVisitTimeDimName,
          paramName: 'firstVisitTimeDimName',
          dbDims: timeDims
        })}

        {this.renderDimPicker({
          label: '首次登录时间',
          initialValue: firstLoginTimeDimName,
          paramName: 'firstLoginTimeDimName',
          dbDims: timeDims
        })}
      </div>
    )
  }

  render() {
    let { dimensions } = this.props
    let { loading } = this.state

    return (
      <div className="height-100 bg-white">
        <div className="datasource-setting">
          <div className="split-line" />
          <div>
            <div className="left fleft">
              <Form layout="horizontal" onSubmit={this.submit}>
                {_.some(dimensions, isStringDimension) ? this.renderFormItems() : this.renderNoDimHint()}

                <hr />

                <div className="aligncenter">
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
                  >{loading ? '提交中...' : '提交'}</Button>
                </div>
              </Form>
            </div>

            <div className="right autocscroll-setting">
              <div className="mg2t">
                <QuestionCircleOutlined className="mg1l mg1r" />
                用户类型数据设置说明
              </div>

              <div className="mg2t">
                <p className="mg1b">Q1. 设置用户类型数据的用处</p>
                <p className="mg1b">设置用户类型数据用于做数据分析时对目标用户的细分分析，如新访问用户，新登录用户的细分，常用于用户的行为分析。</p>
              </div>
              <div className="mg2t">
                <p className="mg1b">Q2. 设置用户类型数据的各维度说明</p>
                <p className="mg1b">1. 用户ID: 标识用户唯一性的维度，可同时设置多个识别用户唯一性的维度，包括用户ID、设备ID、电话、邮箱等。</p>
                <p className="mg1b">2. 登录ID：标识用户的业务唯一性的维度，如会员ID。用于统计登录用户。</p>
                <p className="mg1b">3. 首次访问时间：记录用户的第一次访问时间的维度，用于分析新访问用户的行为。</p>
                <p className="mg1b">4. 首次登录时间：记录用户的第一次登录时间的维度，用于分析新登陆用户的行为。</p>
              </div>
              <div className="mg2t">
                <p className="mg1b">Q3. 用户类型分析场景</p>
                <p className="mg1b">完成用户类型数据的设置后，即可在留存分析、漏斗分析等工具中，选择目标用户为新访问用户/新登录用户进行行为分析。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
