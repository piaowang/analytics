/**
 * Created on 15/03/2017.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { CheckOutlined, CloseCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Select, Button, message } from 'antd'
import Fetch from '../../common/fetch-final'
import { Scene } from '../RFM/interface'
import { SceneType, DIMENSION_TYPES } from '../../../common/constants'
import {checkPermission} from '../../common/permission-control'
import { withDbDims } from 'client/components/Fetcher/data-source-dimensions-fetcher'
import { validateFields } from '../../common/decorators'
import { editDatasource } from '../../databus/datasource'
import { isDiffByPath } from '../../../common/sugo-utils'

const canConfigRFMDims = checkPermission('post:/app/datasource/config-rfm-dims')

@withDbDims(({ datasourceCurrent }) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return ({
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    datasourceType: 'all'
  })
})
@validateFields
class SceneMarketBrain extends React.Component {
  
  static defaultProps = {
    dataSourceDimensions: [],
    projects: [],
    project: {},
    onProjectChange: () => {}
  }
  
  static propTypes = {
    dataSourceDimensions: PropTypes.array.isRequired,
    projects: PropTypes.array.isRequired,
    project: PropTypes.object.isRequired
  }
  
  constructor (props, context) {
    super(props, context)
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

  async onSubmit () {
    let values = await this.validateFields()
    if (!values) {
      return
    }
    let { datasource } = this.state

    let dsId = _.get(datasource, 'id') || ''
    this.setState({
      loading: true
    })
    let requestData = {
      params: {
        ..._.get(datasource, 'params', {}),
        marketBrain: values
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
  
  reset () {
    this.props.form.resetFields()
  }
  
  render () {
    const { dataSourceDimensions: dimensions, form:{ getFieldDecorator } } = this.props
    const { datasource } = this.state
    const layout = {
      labelCol: { span: 10 },
      wrapperCol: { span: 12 }
    }
    const generateDimensionsSelector = (prop) => {
      let dim = dimensions
      if (prop === 'string') {
        dim = dimensions.filter(d => d.type === DIMENSION_TYPES.string)
      }
      
      if (prop === 'num') {
        dim = dimensions.filter(d => {
          return d.type === DIMENSION_TYPES.long ||
            d.type === DIMENSION_TYPES.int ||
            d.type === DIMENSION_TYPES.float || 
            d.type === DIMENSION_TYPES.string
        })
      }
      return (
        <Select
          dropdownMatchSelectWidth={false}
        >
          {dim.map(d => {
            return (
              <Select.Option key={d.id} value={d.id}>
                {d.title || d.name}
              </Select.Option>
            )
          })}
        </Select>
      )
    }
    return (
      <div className='height-100 bg-white'>
        <div className='datasource-setting'>
          <div className='left fleft' style={{height:'70%'}}>
            <div className='height-100'>
              <Form style={{ padding: '20px 40px' }}>
                <Form.Item label='公司ID' {...layout} hasFeedback>
                  {getFieldDecorator(
                    'company_id',
                    {
                      initialValue: _.get(datasource, 'params.marketBrain.company_id')
                    }
                  )(
                    generateDimensionsSelector('num')
                  )}
                </Form.Item>
                <Form.Item label='门店ID' {...layout} hasFeedback>
                  {getFieldDecorator(
                    'store_id',
                    {
                      initialValue: _.get(datasource, 'params.marketBrain.store_id')
                    }
                  )(
                    generateDimensionsSelector('num')
                  )}
                </Form.Item>
                <Form.Item label='会员ID' {...layout} hasFeedback>
                  {getFieldDecorator(
                    'member_id',
                    {
                      initialValue: _.get(datasource, 'params.marketBrain.member_id')
                    }
                  )(
                    generateDimensionsSelector('num')
                  )}
                </Form.Item>
                <Form.Item label='会员姓名' {...layout} hasFeedback>
                  {getFieldDecorator(
                    'user_name',
                    {
                      initialValue: _.get(datasource, 'params.marketBrain.user_name')
                    }
                  )(
                    generateDimensionsSelector('num')
                  )}
                </Form.Item>
                <Form.Item label='会员手机号' {...layout} hasFeedback>
                  {getFieldDecorator(
                    'mobile',
                    {
                      initialValue: _.get(datasource, 'params.marketBrain.mobile')
                    }
                  )(
                    generateDimensionsSelector('num')
                  )}
                </Form.Item>
                <Form.Item label='客户经理ID' {...layout} hasFeedback>
                  {getFieldDecorator(
                    'account_manager_id',
                    {
                      initialValue: _.get(datasource, 'params.marketBrain.account_manager_id')
                    }
                  )(
                    generateDimensionsSelector('num')
                  )}
                </Form.Item>
                <Form.Item label='客户经理姓名' {...layout} hasFeedback>
                  {getFieldDecorator(
                    'account_manager_name',
                    {
                      initialValue: _.get(datasource, 'params.marketBrain.account_manager_name')
                    }
                  )(
                    generateDimensionsSelector('num')
                  )}
                </Form.Item>
                <Form.Item label='微信openid' {...layout} hasFeedback>
                  {getFieldDecorator(
                    'wechat_openid',
                    {
                      initialValue: _.get(datasource, 'params.marketBrain.wechat_openid')
                    }
                  )(
                    generateDimensionsSelector('num')
                  )}
                </Form.Item>
              </Form>
              
            </div>
          </div>
          <div className='right fleft'>
            <div className='pd2l'>
              <div className='mg2t'>
                <QuestionCircleOutlined className='mg1l mg1r' />
                营销大脑设置说明
              </div>
              <div className='mg2t'>
                <p className='mg1b'>Q1.设置公司ID、门店ID的用处</p>
                <p className='mg1b'>使用营销策略生成营销活动时，通过公司ID、门店ID细化用户分群。</p>
              </div>
              <div className='mg2t'>
                <p className='mg1b'>Q2.设置会员姓名、会员手机号的用处</p>
                <p className='mg1b'>活动执行时，用于获取分群中的会员姓名与会员手机号。</p>
              </div>
            </div>
          </div>

          <hr style={{ clear:'both'}}/>
          <div className='aligncenter'>
            <Button
              className='mg2r'
              icon={<CloseCircleOutlined />}
              onClick={() => this.reset()}
            >
                  重置
            </Button>
            <Button
              type='success'
              icon={<CheckOutlined />}
              onClick={() => this.onSubmit()}
              disabled={!canConfigRFMDims}
              title={canConfigRFMDims ? undefined : '您无权限进行设置，请联系管理员'}
            >
                  提交
            </Button>
          </div>
        </div>
      </div>
    )
  }
}

export default Form.create()(SceneMarketBrain)
