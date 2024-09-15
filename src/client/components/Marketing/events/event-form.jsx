/* eslint-disable react/prop-types */
/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-03-20 13:07:27
 * @modify date 2019-03-20 13:07:27
 * @description 自定义营销中心-营销事假新增、修改
 */
import React, { Component } from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Button, Divider, Input, Radio, Tooltip, InputNumber } from 'antd';
import { validateFieldsAndScroll } from 'client/common/decorators'
import Bread from '~/components/common/bread'
import Icon from '~/components/common/sugo-icon'
import { Button2 } from '~/components/common/sugo-icon'
import _ from 'lodash'
import './css.styl'
import { connect } from 'react-redux'
import { namespace } from './store/events'
import { enableSelectSearch } from 'client/common/antd-freq-use-props'
import { withUserGroupsDec } from 'client/components/Fetcher/data-source-compare-user-group-fetcher'
import { UserGroupBuildInTagEnum } from 'common/constants'
import SendTimerTypes, { defaultRealTimer } from './send-timer-types'
import CopyWriting from '../Common/copy-writing'
import moment from 'moment'
import { browserHistory } from 'react-router'
import Fetch from 'client/common/fetch-final'

const Option = Select.Option

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

@connect(state => ({
  ...state[namespace],
  loading: state.loading.models[namespace]
}))
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
@Form.create()
@validateFieldsAndScroll
export default class EventForm extends Component {

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/change`,
      payload
    })
  }

  checkTimerHandler = (rule, value, callback)  => {
    // console.log(value, 'value-------')
    // TODO 校验时间段是否合法
    callback()
  }

  checkIsLifeCycleScene = async(model_id, scene_id) => {
    this.props.form.setFieldsValue({
      usergroup_id: ''
    })
    this.props.dispatch({
      type: `${namespace}/checkIsLifeCycleScene`,
      payload: {
        model_id, scene_id
      }
    })
  }

  saveHandler = async () => {
    const { editRecord, dispatch } = this.props
    const values = await this.validateFieldsAndScroll()
    if(!values) {
      return
    }
    // 处理模型&场景ID
    const [ model_id, scene_id ] = values.selected_values.split('|')
    values.model_id = model_id
    values.scene_id = scene_id
    await this.saveCopyWriting(values)
    dispatch({
      type: `${namespace}/save`,
      payload: {
        id: editRecord.id,
        values
      }
    })
  }

  async saveCopyWriting(values) {
    const { send_channel, copywriting } = values
    await Fetch.post('/app/marketing-copywriting/create', { send_channel, copywriting })
  }

  renderUserGroupDetail = () => {
    const { dataSourceCompareUserGroups: dbUgs, form: { getFieldValue } } = this.props
    const selectedUsergroupId = getFieldValue('usergroup_id')
    if (!selectedUsergroupId) {
      return null
    }
    const dbUg = _.find(dbUgs, o => o.id === selectedUsergroupId )
    return (
      <div className="mg2l color-999">
        <span className="mg1r">该分群人数：{_.get(dbUg,'params.total')}人,</span>
        {moment(_.get(dbUg,'compute_time')).format('YYYY-MM-DD HH:mm:ss')}版本
      </div>
    )
  }

  render() {
    const { getFieldDecorator, getFieldValue } = this.props.form
    let { selected_values, editRecord, projectList = [], dataSourceCompareUserGroups: dbUgs, treeLevels = [], lcSegment = [] } = this.props

    let tempUg = _.isEmpty(lcSegment) ? dbUgs : lcSegment
    dbUgs = tempUg.map( i => {
      const projectName = _.get(_.find(projectList, o => o.datasource_id === i.druid_datasource_id), 'name')
      return {
        ...i,
        projectName
      }
    })

    const timerType = getFieldValue('timer_type')
    const title = `${selected_values ? '修改' : '新建'}营销事件`
    return (
      <div className="marketing-events-container scroll-content always-display-scrollbar">
        <Bread  path={[
          { name: '自定义营销中心' },
          { name: '营销事件', link: '/console/marketing-events' },
          { name: title }
        ]}
        >
          {/* <Button
            icon={<LegacyIcon type="sugo-back" />}
            className="mg1l"
            onClick={() => browserHistory.goBack()}
          >返回</Button> */}

          <Button
            icon={<LegacyIcon type="sugo-back" />}
            className="mg1l"
            onClick={() => browserHistory.goBack()}
          ></Button>

        </Bread>
        <div className="mg3 relative">
          <div className="absolute" style={{top: -15, right: 10}}>
            {_.isEmpty(editRecord) ? null : (
              <span className="color-999">
                {/* <span className="bold mg1r">创建人：</span>
            <span className="">{editRecord.created_by}</span> */}
                <span className="bold mg1x">创建时间：</span>
                <span>{moment(editRecord.created_at).format('YYYY-MM-DD HH:mm')}</span>
                {/* <span className="bold mg1x">最后修改人：</span>
                <span>{editRecord.updated_by}</span> */}
                <span className="bold mg1x">修改时间：</span>
                <span>{moment(editRecord.updated_at).format('YYYY-MM-DD HH:mm')}</span>
              </span>
            )}
          </div>
          <Divider orientation="left">
            <h3>基本信息</h3>
          </Divider>
          <Form
            layout="horizontal"
          >
            <Form.Item
              {...formItemLayout}
              label="所属模型&场景"
            >
              {getFieldDecorator('selected_values', {
                initialValue: selected_values,
                rules: [{
                  required: true,
                  message: '请选择模型&场景'
                }]
              }) (
                <Select
                  {...enableSelectSearch}
                  placeholder="请选择模型&场景"
                  onChange={(v) => {
                    let model_id = v.split('|')[0]
                    let scene_id = v.split('|')[1]
                    this.checkIsLifeCycleScene(model_id, scene_id)
                  }}
                >
                  {
                    treeLevels.map(model => {
                      return (
                        <Select.OptGroup key={`p-tree-${model.id}`} label={model.name}>
                          {
                            model.MarketingScenes.map(scene => (
                              <Select.Option
                                key={`c-tree-${scene.id}`}
                                value={[model.id, scene.id].join('|')}
                              >{scene.name}</Select.Option>
                            ))
                          }
                        </Select.OptGroup>
                      )
                    })
                  }
                </Select>
              )}
            </Form.Item>
            <Form.Item
              {...formItemLayout}
              label="事件名称"
            >
              {getFieldDecorator('name', {
                rules: [{
                  required: true,
                  message: '请输入模型名称'
                }, {
                  min: 1,
                  max: 50,
                  type: 'string',
                  message: '1~50个字符'
                }],
                initialValue: _.get(editRecord, 'name', '')
              }) (
                <Input placeholder="请输入事件名称" />
              )}
            </Form.Item>
            <Form.Item
              {...formItemLayout}
              label="是否开启"
            >
              {getFieldDecorator('status', {
                initialValue: _.get(editRecord, 'status', 1)
              })(
                <Radio.Group>
                  <Radio defaultChecked value={1}>开启</Radio>
                  <Radio value={0}>关闭</Radio>
                </Radio.Group>
              )}
            </Form.Item>
            <Divider orientation="left">
              <h3>设置营销策略</h3>
            </Divider>
            <Form.Item
              {...formItemLayout}
              style={{marginBottom: 0}}
              label="营销时机"
            >
              {getFieldDecorator('timer_type', {
                initialValue: _.get(editRecord, 'timer_type', 0)
              })(
                <Radio.Group>
                  <Radio defaultChecked value={0}>定时发送</Radio>
                  <Radio value={1}>实时发送</Radio>
                </Radio.Group>
              )}
            </Form.Item>
            <Form.Item
              labelCol={{ span: 3 }}
              wrapperCol={{ span: 10, offset: 3 }}
              className="timing-timer"
            >
              {
                getFieldDecorator('timer', {
                  initialValue: _.get(editRecord, 'timer', {
                    timerType, // 营销时机
                    realTimers: [defaultRealTimer],
                    timingTimer: moment(new Date(), 'HH:mm').format('HH:mm')
                  })
                  // rules: [{ validator: this.checkTimerHandler }]
                }) (
                  <SendTimerTypes timerType={timerType}/>
                )
              }
            </Form.Item>
            <Form.Item
              {...formItemLayout}
              label="用户群"
            >
              {getFieldDecorator('usergroup_id', {
                initialValue: _.get(editRecord, 'usergroup_id'),
                rules: [{ required: true, message: '请选择用户群' }]
              }) (
                <Select
                  {...enableSelectSearch}
                  placeholder="请选择用户群"
                >
                  {(dbUgs || []).map(dbUg => {
                    return (
                      <Option key={dbUg.id} value={dbUg.id}>{dbUg.title}<span className="mg2l color-grey">所属项目:{dbUg.projectName}</span></Option>
                    )
                  })}
                </Select>
              )}
              {this.renderUserGroupDetail()}
            </Form.Item>
            <CopyWriting
              item={editRecord}
              form={this.props.form}
              formItemLayout={formItemLayout}
            />
            <Form.Item
              {...formItemLayout}
              label="发送比例"
            >
              {getFieldDecorator('send_ratio', {
                initialValue: _.get(editRecord, 'send_ratio', 100),
                rules: [{
                  required: true,
                  message: '请设置发送比例'
                }]
              }) (
                <InputNumber min={1} max={100} step={0.1} className="width80" />
              )}
              <span className="ant-form-text mg1l">%</span>
            </Form.Item>
            <Divider orientation="left">
              <h3>设置营销策略</h3>
            </Divider>
            <Form.Item
              {...formItemLayout}
              label="效果数据所属项目"
            >
              {getFieldDecorator('project_id', {
                initialValue: _.get(editRecord, 'project_id')
              }) (
                <Select
                  allowClear
                  showSearch
                  className="width-90"
                  placeholder="请选择项目"
                  optionFilterProp="children"
                  filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                >
                  {
                    projectList.filter( i => i.access_type === 1).map(item => {
                      return <Select.Option key={`project-item-${item.id}`} value={item.id}>{item.name}</Select.Option>
                    })
                  }
                </Select>
              )}
              <Tooltip placement="rightTop" title="尽量在事件发送前配置好效果数据所属项目">
                <Icon type="question-circle" className="mg1l font14" />
              </Tooltip>
            </Form.Item>
            <Form.Item
              wrapperCol={{
                xs: { span: 24, offset: 0 },
                sm: { span: 16, offset: 8 }
              }}
            >
              <Button className="mg2r" onClick={() => history.go(-1)}>取消</Button>
              <Button type="primary" onClick={this.saveHandler}>保存</Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    );
  }
}
