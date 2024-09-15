import React, { Component } from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Button, Divider, Input, Radio, message, Tooltip, InputNumber } from 'antd';
import { validateFieldsAndScroll } from 'client/common/decorators'
import Bread from '~/components/common/bread'
import Icon,{Button2} from '~/components/common/sugo-icon'
import _ from 'lodash'
import './css.styl'
import { connect } from 'react-redux'
import { namespace } from './store/events'
import { enableSelectSearch } from 'client/common/antd-freq-use-props'
import { withUserGroupsDec } from 'client/components/Fetcher/data-source-compare-user-group-fetcher'
import { UserGroupBuildInTagEnum } from 'common/constants'
import SendTimerTypes, { defaultRealTimer } from './send-timer-types'
import moment from 'moment'
import { browserHistory } from 'react-router'
import EffectSettingsMap from '../Common/effect-settings'
import CopyWritingMap from '../Common/copy-writing'

const { marketBrain: { 
  feature,
  shouldSetGlobalSceneParams
} } = window.sugo

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

  componentDidMount() {
    const { location: { pathname = '' } } = this.props
    this.pageLocate = 'event'
    if (pathname.includes('acts')) {
      this.pageLocate = 'active'
    }

    this.userRole = 'admin'
    if (window.sugo.jwtData) {
      const { jwt_company_id, jwt_store_id } = _.get(window,'sugo.jwtData.others', {})
      if (jwt_company_id || jwt_store_id) {
        this.userRole = 'jwtUser'
      }
      if (!jwt_company_id && !jwt_store_id) {
        this.userRole = 'jwtAdmin'
      }
    }
  }

  componentWillUnmount() {
    this.timer = null
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/change`,
      payload
    })
  }

  checkUrlValidator(values) {
    if (feature !== 'czbbb') return true
    const { copywriting: { url }, touch_up_way, send_channel } = values
    if (touch_up_way === 1 && send_channel === 2 && this.pageLocate === 'active') {
      let reg = /^(https?:\/\/)([0-9a-z.]+)(:[0-9]+)?([/0-9a-z.]+)?(\?[0-9a-z&=]+)?(#[0-9-a-z]+)?/i
      if (!reg.test(url)) {
        return false
      }
    }
    return true
  }

  saveHandler = async () => {
    const { editRecord, dispatch, baseEvent } = this.props
    const values = await this.validateFieldsAndScroll()
    if(!values) {
      return
    }

    if (!_.get(values,'timer.endTimingDate')) {
      values.timer.endTimingDate = moment().format('YYYY-MM-DD')
    }
    if (!_.get(values,'timer.endTimingTimer')) {
      values.timer.endTimingTimer = moment().format('HH:mm')
    }
 
    if (values.timer_type === 0) {
      //timer.realTimers[0] 就是一个默认的 实际上第一个不从这里拿
      values.timer.realTimers = [_.get(values, 'timer.realTimers[0]')]
    }

    if (!this.checkUrlValidator(values) && feature === 'czbbb') return message.error('触达方式人工 渠道微信时，链接必须非空且完整')

    if (!values.usergroup_id) values.usergroup_id = null
    const { status } = values
    const { timingDate = '', timingTimer = '', endTimingDate = '', endTimingTimer ='' } = _.get(values, 'timer', {})
    if (+moment().startOf('m') + 1000 * 60 > +moment(timingDate + ' ' + timingTimer) && status === 1) {
      return message.error('执行时间或开始时间不应过早于当前时间')
    }

    if ((+moment(endTimingDate + ' ' + endTimingTimer)) - (+moment(timingDate + ' ' + timingTimer)) <= 60 * 60 * 1000 && status === 1 && values.timer_type === 1) {
      return message.error('结束时间应晚于开始时间至少1小时')
    }
    // 处理模型&场景ID
    const [ model_id, scene_id ] = values.selected_values.split('|')
    values.model_id = model_id
    values.scene_id = scene_id

    values.belongs = 1 //策略0 活动1
    //对活动来说没有这个值
    if (this.pageLocate === 'event') {
      values.status = 0
      values.belongs = 0 //策略0 活动1
    } else {
      values.tactics_status = null
    }

    dispatch({
      type: `${namespace}/save`,
      payload: {
        id: baseEvent ? '' : editRecord.id,
        values: values
      }
    })

    if (this.pageLocate === 'event') {
      return browserHistory.push('/console/market-brain-events')
    }
    return browserHistory.push('/console/market-brain-acts')
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

  renderGUide() {
    const { getFieldDecorator, getFieldValue } = this.props.form
    let { selected_values, editRecord, datasourceList = [], dataSourceCompareUserGroups: dbUgs, treeLevels = [], baseEvent, projectList = [] } = this.props

    let disabled = false
    if (this.pageLocate === 'event' && this.userRole === 'jwtUser') disabled = true

    return (
      <Form.Item
        {...formItemLayout}
        label="活动内容指南"
      >
        {getFieldDecorator('guide_content', {
          initialValue: _.get(editRecord, 'guide_content'),
          rules: [{ required: true, message: '请输入活动内容指南' }]
        })(
          <Input.TextArea rows={5} disabled={disabled} />
        )}
      </Form.Item>
    )
  }

  renderCopyWriting() {
    const { getFieldDecorator, getFieldValue } = this.props.form
    let { selected_values, editRecord, datasourceList = [], dataSourceCompareUserGroups: dbUgs, treeLevels = [], baseEvent, projectList = [] } = this.props
    const CopyWriting = CopyWritingMap[feature]

    let disabled = false
    if (this.pageLocate === 'event' && this.userRole === 'jwtUser') disabled = true
    return (
      CopyWriting &&
      <CopyWriting
        item={editRecord}
        form={this.props.form}
        formItemLayout={formItemLayout}
        disabled={disabled}
        pageLocate={this.pageLocate}
      />
    )
  }

  renderEffectSetting() {
    const { getFieldDecorator, getFieldValue } = this.props.form
    let { selected_values, editRecord, datasourceList = [], dataSourceCompareUserGroups: dbUgs, treeLevels = [], baseEvent, projectList = [] } = this.props
    const EffectSettings = EffectSettingsMap[feature]

    let disabled = false
    if (this.pageLocate === 'event' && this.userRole === 'jwtUser') disabled = true
    return (
      EffectSettings &&
      <React.Fragment>
        <Divider orientation="left">
          <h3>效果设置</h3>
        </Divider>
        <EffectSettings
          onlyForm={true}
          projectList={projectList}
          item={editRecord}
          form={this.props.form}
          formItemLayout={formItemLayout}
        />
      </React.Fragment>
    )
  }

  render() {
    const { getFieldDecorator, getFieldValue } = this.props.form
    let { selected_values, editRecord, datasourceList = [], dataSourceCompareUserGroups: dbUgs, treeLevels = [], baseEvent, projectList = [] } = this.props
    let dataSourceListIdDict = _.keyBy(datasourceList, 'id')
    let tempDbUgs = []
    dbUgs.map( i => {
      const projectName = _.get(dataSourceListIdDict[i.druid_datasource_id],'title')

      if (shouldSetGlobalSceneParams) {
        //该项目场景数据设置没设置过营销大脑的参数 过滤掉
        if (! _.get(dataSourceListIdDict[i.druid_datasource_id],'params.marketBrain.company_id') || ! _.get(dataSourceListIdDict[i.druid_datasource_id],'params.marketBrain.store_id')) return
        if (!_.get(dataSourceListIdDict[i.druid_datasource_id],'params.marketBrain.mobile')) return
      }
      tempDbUgs.push({
        ...i,
        projectName
      })
    })
    const timerType = getFieldValue('timer_type') || 0
    const title = `${selected_values ? '修改' : '新建'}${this.pageLocate === 'active' ? '活动' : '营销策略'}`

    let path = [
      { name: '营销策略中心' },
      { name: '营销策略', link: '/console/market-brain-events' },
      { name: title }
    ]
    if (this.pageLocate === 'active') {
      path = [
        { name: '活动管理中心' },
        { name: '活动管理', link: '/console/market-brain-events' },
        { name: title }
      ]
    }


    let disabled = false
    if (this.pageLocate === 'event' && this.userRole === 'jwtUser') disabled = true

    const that = this
    const renderFormByFeature = {
      common: [
        that.renderCopyWriting,
        that.renderEffectSetting
      ],
      czbbb: [
        that.renderGUide,
        that.renderCopyWriting,
        that.renderEffectSetting
      ],
      nissan: [
        that.renderCopyWriting
      ],
      wxjTyj: [
        that.renderCopyWriting,
        that.renderEffectSetting
      ]
    }

    return (
      <div className="marketing-events-container scroll-content always-display-scrollbar">
        <Bread path={path}>
          <Button2
            icon="sugo-back"
            className="mg1l"
            onClick={() => browserHistory.goBack()}
          >
            返回
          </Button2>
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
                  disabled={disabled}
                  getPopupContainer={node => node.parentNode}
                  placeholder="请选择模型&场景"
                >
                  {
                    treeLevels.map(model => {
                      return (
                        <Select.OptGroup key={`p-tree-${model.id}`} label={model.name}>
                          {
                            model.MarketBrainScenes.map(scene => (
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
              label={`${this.pageLocate === 'active' ? '活动' : '策略'}名称`}
            >
              {getFieldDecorator('name', {
                rules: [{
                  required: true,
                  message: `${this.pageLocate === 'active' ? '活动' : '策略'}名称`
                }, {
                  min: 1,
                  max: 25,
                  type: 'string',
                  message: '1~25个字符'
                }],
                initialValue: baseEvent ? '' : _.get(editRecord, 'name', '')
              }) (
                <Input disabled={disabled} placeholder={`${this.pageLocate === 'active' ? '活动' : '策略'}名称`} />
              )}
            </Form.Item>
            {
              this.pageLocate === 'event'
                ?
                <Form.Item
                  {...formItemLayout}
                  label="是否开启"
                >
                  {getFieldDecorator('tactics_status', {
                    initialValue: _.get(editRecord, 'tactics_status', 1)
                  })(
                    <Radio.Group disabled={disabled}>
                      <Radio defaultChecked value={1}>开启</Radio>
                      <Radio value={0}>关闭</Radio>
                    </Radio.Group>
                  )}
                </Form.Item>
                :
                <Form.Item
                  {...formItemLayout}
                  label="是否开启"
                >
                  {getFieldDecorator('status', {
                    initialValue:  baseEvent ? 1 : _.get(editRecord, 'status', 1)
                  })(
                    <Radio.Group disabled={disabled}>
                      <Radio defaultChecked value={1}>开启</Radio>
                      <Radio value={0}>关闭</Radio>
                    </Radio.Group>
                  )}
                </Form.Item>
            }
            <Divider orientation="left">
              <h3>设置营销策略</h3>
            </Divider>
            <Form.Item
              {...formItemLayout}
              style={{marginBottom: 0}}
              label="营销时机"
            >
              {getFieldDecorator('timer_type', {
                initialValue: _.get(editRecord, 'timer_type', 0),
                rules: [{
                  required: true,
                  message: '请选择营销时机'
                }]
              })(
                <Radio.Group 
                  disabled={disabled}
                >
                  <Radio defaultChecked value={0}>单次</Radio>
                  <Radio value={1}>多次</Radio>
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
                    realTimers: [defaultRealTimer],
                    computeIntervalInfo: {
                      cronExpression: '0 * * * *'
                    },
                    timingDate: moment(new Date(), 'YYYY-MM-DD').format('YYYY-MM-DD'),
                    timingTimer: moment(new Date(), 'HH:mm').add(1,'m').format('HH:mm'),
                    endTimingDate: moment(new Date(), 'YYYY-MM-DD').format('YYYY-MM-DD'),
                    endTimingTimer: moment(new Date(), 'HH:mm').add(2,'H').format('HH:mm')
                  })
                }) (
                  <SendTimerTypes disabled={disabled} timerType={timerType}/>
                )
              }
            </Form.Item>
            <Form.Item
              {...formItemLayout}
              className="mg2t"
              label="用户群"
            >
              {getFieldDecorator('usergroup_id', {
                initialValue: _.get(editRecord, 'usergroup_id'),
                rules: this.pageLocate === 'event' ? [] : [{ required: true, message: '请选择用户群' }]
              }) (
                <Select
                  {...enableSelectSearch}
                  allowClear
                  getPopupContainer={node => node.parentNode}
                  disabled={disabled}
                  placeholder="请选择用户群"
                >
                  {(tempDbUgs || []).map(dbUg => {
                    return (
                      <Option key={dbUg.id} value={dbUg.id}>{dbUg.title}<span className="mg2l color-grey">所属项目:{dbUg.projectName}</span></Option>
                    )
                  })}
                </Select>
              )}
              {this.renderUserGroupDetail()}
            </Form.Item>
            {
              renderFormByFeature[feature].map( item => (item.call(that)))
            }
            <Form.Item
              wrapperCol={{
                xs: { span: 24, offset: 0 },
                sm: { span: 16, offset: 8 }
              }}
            >
              <Button disabled={disabled} className="mg2r" onClick={() => history.go(-1)}>取消</Button>
              <Button disabled={disabled} type="primary" onClick={this.saveHandler}>保存</Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    );
  }
}
