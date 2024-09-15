import React, { Component } from 'react'
import Bread from '../../Common/bread'
import { browserHistory } from 'react-router'
import { Form } from '@ant-design/compatible';
import { Button2  } from '../../Common/sugo-icon'
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  Input,
  InputNumber,
  Select,
  Row,
  Col,
  Radio,
  TimePicker,
  DatePicker,
  message,
  Divider,
} from 'antd';
import { validateFieldsAndScroll } from 'client/common/decorators'
import CopyWriting from '../Common/copy-writing'
import { connect } from 'react-redux'
import { withUserGroupsDec } from 'client/components/Fetcher/data-source-compare-user-group-fetcher'
import { UserGroupBuildInTagEnum } from 'common/constants'
import Fetch from 'client/common/fetch-final'
import moment from 'moment'
import _ from 'lodash'
import { enableSelectSearch } from 'client/common/antd-freq-use-props'

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 3 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 10 }
  }
}

const RadioGroup = Radio.Group
const FormItem = Form.Item
const Option = Select.Option

@connect(state => ({ ...state['marketingCreateAct'], ...state['sagaCommon'] }))
@Form.create()
@withUserGroupsDec(() => {
  return ({
    dataSourceId: '',
    doFetch: true,
    cleanDataWhenFetching: true,
    query: {
      where: {
        tags: { $contains: UserGroupBuildInTagEnum.UserGroupWithMarketing }
      }
    }
  })
})
@validateFieldsAndScroll
class createAct extends Component {

  state = {
    date: '',
    time: ''
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.props.item, nextProps.item)) {
      this.setState({
        time: _.get(nextProps,'item.timer.time', ''),
        date: _.get(nextProps,'item.timer.date', '')
      })
    }
  }

  componentWillUnmount() {
    this.props.dispatch({type: 'marketingCreateAct/change', payload: { item: {} }})
  }

  changeProps = (payload) => {
    this.props.dispatch({
      type: 'marketingCreateAct/change',
      payload
    })
  }

  submit = async (isDisable) => {
    if (isDisable) return message.error('该活动已经执行, 不允许从此页面提交修改')
    const { item } = this.props
    const { time, date } = this.state
    let values = await this.validateFieldsAndScroll()
    if(!values) return
    values.timer = {
      date,
      time
    }
    const isOverTime = this.checkCanSubmit(date,time)
    if (isOverTime) return message.error('申请时间小于等于当前一刻')
    let res
    if (!values) return
    if (!_.isEmpty(_.omit(item, 'group_id'))) {
      res = await Fetch.post('/app/marketing-actives/update', Object.assign(item, values))
    } else {
      res = await Fetch.post('/app/marketing-actives/create', values)
    }
    if (!_.get(res,'success')) return message.error(_.get(res,'message',''))
    await this.saveCopyWriting(values)
    message.success('提交成功')
    this.close()
  }

  async saveCopyWriting(values) {
    const { send_channel, copywriting } = values
    await Fetch.post('/app/marketing-copywriting/create', { send_channel, copywriting })
  }

  close = () => {
    browserHistory.push('/console/marketing-acts')
    this.changeProps({group_id: ''})
  }

  checkCanSubmit(date,time) {
    let timerDate = ~~date.replace(/\-/g, '')
    let timerTime = ~~time.replace(/\:/g, '')
    const nowDay = ~~moment().format('YYYY-MM-DD').replace(/\-/g, '')
    const nowTime = ~~moment().format('HH:mm').replace(/\:/g, '')
    //昨天的 true
    const isDisableDate = timerDate < nowDay
    //时间小于等于当前 true
    const isDisableTime = timerTime <= nowTime

    const isTomorrow = timerDate > nowDay

    //昨天的 直接是true  今天的,需要判断时间
    const isDisable = isDisableDate || (
      timerDate === nowDay && isDisableTime
    )
    if (isTomorrow) return false
    return isDisable
  }

  renderUserGroupDetail() {
    const { dataSourceCompareUserGroups: userGroups } = this.props
    let { getFieldValue } = this.props.form
    let selectedUsergroupId = getFieldValue('usergroup_id')
    const targetUserGroups = _.find(userGroups, o => o.id === selectedUsergroupId )
    return (
      <div className="mg2l">该分群人数{_.get(targetUserGroups,'params.total')}人,{moment(_.get(targetUserGroups,'compute_time')).format('YYYY-MM-DD HH:mm:ss')}版本</div>
    )
  }

  render() {
    let { getFieldDecorator, getFieldValue } = this.props.form
    let { actGroups, projectList, dataSourceCompareUserGroups: userGroups , item = {} } = this.props
    let timerDate = _.get(item,'timer.date', moment().add(1,'day').format('YYYY-MM-DD'))
    let timerTime = _.get(item,'timer.time', moment().add(1,'min').format('HH:mm'))

    const isDisable = this.checkCanSubmit(timerDate, timerTime)

    userGroups = userGroups.map( i => {
      const projectName = _.get(_.find(projectList, o => o.datasource_id === i.druid_datasource_id), 'name')
      return {
        ...i,
        projectName
      }
    })
    return (
      <div className="scroll-content always-display-scrollbar">
        <Bread
          path={[{name: '活动营销中心'},{ name: '活动管理', link: '/console/marketing-acts' },{ name: _.isEmpty(item) ? '新建' : '编辑' }]}
        >
          <Button2
            icon="sugo-back"
            className="mg1l"
            onClick={() => browserHistory.goBack()}
          >
            返回
          </Button2>
        </Bread>
        <Divider orientation="left">
          <h3>基本信息</h3>
        </Divider>
        <Form layout="horizontal">
          <FormItem {...formItemLayout} label="所属活动分组" hasFeedback>
            {getFieldDecorator('group_id', {
              initialValue: item.group_id
            })(
              <Select
                allowClear
                {...enableSelectSearch}
                placeholder="请选择活动分组"
              >
                {
                  actGroups.map( i => (
                    <Option key={i.id} value={i.id}>{i.name}</Option>
                  ))
                }
              </Select>
            )}
          </FormItem>
          <FormItem  {...formItemLayout} label="活动名称" hasFeedback>
            {getFieldDecorator('name', {
              rules: [{
                required: true,
                message: '请输入活动分组名称',
                whitespace: true
              }, {
                min: 1,
                max: 50,
                type: 'string',
                message: '1~50个字符'
              }],
              initialValue: item.name
            })(
              <Input type="text" />
            )}
          </FormItem>
          <FormItem  {...formItemLayout} label="是否开启">
            {getFieldDecorator('status', {
              rules: [{
                required: true,
                message: '不能为空'
              }],
              initialValue: item.status || 1
            })(
              <RadioGroup>
                <Radio value={1}>开启</Radio>
                <Radio value={0}>关闭</Radio>
              </RadioGroup>
            )}
          </FormItem>
          <Divider orientation="left">
            <h3>设置营销策略</h3>
          </Divider>
          <FormItem {...formItemLayout} label="发送日期">
            {getFieldDecorator('timer.date', {
              rules: [{
                required: true,
                message: '不能为空'
              }],
              initialValue: _.get(item,'timer.date') ? moment(_.get(item,'timer.date')) : null
            })(
              <DatePicker
                disabledDate={(current) => current && current < moment().startOf('day')}
                disabled={isDisable}
                className="width200 mg2r"
                format={'YYYY-MM-DD'}
                onChange={(v) => {
                  this.setState({
                    date: v.format('YYYY-MM-DD')
                  })
                }}
              />
            )}
          </FormItem>
          <FormItem  {...formItemLayout} label="发送时间">
            {getFieldDecorator('timer.time', {
              rules: [{
                required: true,
                message: '不能为空'
              }],
              initialValue: _.get(item,'timer.time') ? moment(_.get(item,'timer.date') + ' ' + _.get(item,'timer.time')) : null
            })(
              <TimePicker
                className="width200 mg2r"
                disabled={isDisable}
                format={'HH:mm'}
                onChange={(v) => {
                  this.setState({
                    time: v.format('HH:mm')
                  })
                }}
              />
            )}
          </FormItem>
          <FormItem  {...formItemLayout} label="用户群">
            {getFieldDecorator('usergroup_id', {
              rules: [{
                required: true,
                message: '不能为空'
              }],
              initialValue:item.usergroup_id
            })(
              <Select
                showSearch
                placeholder="请选择用户群"
                filterOption={(inputValue, option) => option.props.children.toLowerCase().indexOf(inputValue.toLowerCase()) >= 0}
                optionFilterProp="children"
              >
                {
                  userGroups.map(i => (
                    <Option key={i.id} value={i.id}>{i.title}<span className="mg2l color-grey">所属项目:{i.projectName}</span></Option>
                  ))
                }
              </Select>
            )}
          </FormItem>
          {
            getFieldValue('usergroup_id')
              ?
              <Row>
                <Col span={4} />
                <Col span={20}>{this.renderUserGroupDetail()}</Col>
              </Row>
              :
              null
          }
          <FormItem {...formItemLayout} label="是否更新人群">
            {getFieldDecorator('usergroup_strategy', {
              rules: [{
                required: true,
                message: '不能为空'
              }],
              initialValue: _.get(item,'usergroup_strategy', 1)
            })(
              <RadioGroup>
                <Radio value={0}>发送时更新人群</Radio>
                <Radio value={1}>发送时不更新人群</Radio>
              </RadioGroup>
            )}
          </FormItem>
          {
            <CopyWriting
              form={this.props.form}
              formItemLayout={formItemLayout}
              item={item}
            />
          }
          <FormItem  {...formItemLayout} label="发送比例">
            {getFieldDecorator('send_ratio', {
              initialValue: item.send_ratio || 100,
              rules: [{
                required: true,
                message: '请设置发送比例'
              }]
            })(

              <InputNumber min={1} max={100} step={0.1} className="width80"/>
            )}  
            <span className="ant-form-text mg1l">%</span>
          </FormItem>
          <Divider orientation="left">
            <h3>效果报告指标</h3>
          </Divider>
          <FormItem {...formItemLayout} label="效果数据所属项目" hasFeedback>
            {getFieldDecorator('project_id', {
              initialValue: _.get(item,'project_id', '')
            })(
              <Select
                showSearch
                placeholder="请选择项目"
                optionFilterProp="children"
                filterOption={(inputValue, option) => option.props.children.toLowerCase().indexOf(inputValue.toLowerCase()) >= 0}
              >
                {
                  projectList.filter( i => i.access_type === 1).map( i => (
                    <Option key={i.id} value={i.id}>{i.name}</Option>
                  ))
                }
              </Select>
            )}
          </FormItem>
          <Form.Item
            wrapperCol={{
              xs: { span: 24, offset: 0 },
              sm: { span: 16, offset: 8 }
            }}
          >
            <Button className="mg2r" onClick={() => this.close()}>取消</Button>
            <Button type="primary" className="mg2r" onClick={() => this.submit(isDisable)}>保存</Button>
          </Form.Item>
        </Form>
      </div>
    );
  }
}

export default createAct
