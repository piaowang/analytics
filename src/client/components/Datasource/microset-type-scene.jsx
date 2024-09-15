import React from 'react'
import { CloseCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Button, message } from 'antd';
import { validateFields } from '../../common/decorators'
import _ from 'lodash'
import { isStringDimension, isTimeDimension } from '../../../common/druid-column-type'
import { editDatasource } from '../../databus/datasource'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import DistinctSelect from '../Common/distinct-cascade'
import { immutateUpdate, immutateUpdates, isDiffByPath } from '../../../common/sugo-utils'
import { withDbDims } from 'client/components/Fetcher/data-source-dimensions-fetcher'
import { TAG_DEFAULT_DIMENSIONS } from '../../../common/sdk-access-dimensions'

const { Item: FormItem } = Form
const { Option } = Select

let formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 }
}

const DefaultDim = TAG_DEFAULT_DIMENSIONS.map(p => p[0])

@withDbDims(({ datasourceCurrent }) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return ({
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    datasourceType: 'all'
  })
})
@Form.create()
@validateFields

export default class MicroSetTypeScene extends React.Component {

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
    let { datasource } = this.state

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

  renderUserIdDimSelector({ strDims, commonMicroPicture }) {
    const { getFieldDecorator } = this.props.form

    return (
      <FormItem {...formItemLayout} label="微观画像搜索条件">
        {
          getFieldDecorator(
            'commonMicroPicture',
            {
              rules: [
                { type: 'array', required: true, message: '最少请选择1项' }
                // {
                //   validator: (rule, value, callback) => {
                //     if (5 < _.size(value)) {
                //       callback('最多可选择5项')
                //     } else {
                //       callback()
                //     }
                //   }
                // }
              ],
              initialValue: commonMicroPicture
            })(
            <Select
              mode="multiple"
              allowClear
              {...enableSelectSearch}
              placeholder="请选择..."
            >
              {strDims.map(d => {
                return <Option key={d.name} value={d.name}>{d.title || d.name}</Option>
              })}
            </Select>
          )
        }
      </FormItem>
    )
  }

  renderBaseInfoSelector({ strDims, microPictureBaseInfo }) {
    const { getFieldDecorator } = this.props.form

    return (
      <FormItem {...formItemLayout} label="微观画像基础信息字段">
        {
          getFieldDecorator(
            'microPictureBaseInfo',
            {
              rules: [
                { type: 'array', required: true, message: '最少请选择1项' }
              ],
              initialValue: microPictureBaseInfo || DefaultDim
            })(
            <Select
              mode="multiple"
              allowClear
              {...enableSelectSearch}
              placeholder="请选择..."
            >
              {strDims.map(d => {
                return <Option key={d.name} value={d.name}>{d.title || d.name}</Option>
              })}
            </Select>
          )
        }
      </FormItem>
    )
  }

  renderFormItems() {
    let { datasource } = this.state
    let { dataSourceDimensions: dimensions } = this.props
    let strDims = dimensions
    const {
      commonMicroPicture, microPictureBaseInfo
    } = (datasource && datasource.params) || {}

    return (
      <div>
        {this.renderUserIdDimSelector({ strDims, commonMicroPicture })}

        {this.renderBaseInfoSelector({ strDims, microPictureBaseInfo })}
        <FormItem />
      </div>
    )
  }

  render() {
    let { loading } = this.state
    let { dataSourceDimensions: dimensions } = this.props

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
                微观画像设置说明
              </div>

              <div className="mg2t">
                <p className="mg1b">Q1. 设置微观画像的用处</p>
                <p className="mg1b">用于微观画像搜索条件。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
