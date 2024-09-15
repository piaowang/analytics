import React from 'react'
import _ from 'lodash'
import { browserHistory } from 'react-router'
import { CloseOutlined, RollbackOutlined, SaveOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Select, Input, Tooltip, Switch, Popconfirm, Spin, message } from 'antd';
import {immutateUpdate, immutateUpdates} from '../../../common/sugo-utils'
import { validateFieldsAndScroll } from '../../common/decorators'
import setStatePromise from '../../common/set-state-promise'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import { dateOptions } from '../Common/time-picker'
import Bread from '../Common/bread'
import Icon from '../Common/sugo-icon'
import Link from '../Common/link-nojam'
import { ALARM_UNUSUAL_RULES } from '../../../common/constants'
import deepCopy from '../../../common/deep-copy'
import AlarmTimeInput from './alarm-time-input'
import AlarmRuleInput from './alarm-rule-input'
import AlarmInterfaceReceiver from './alarm-interface-receiver'
import {Auth, checkPermission} from '../../common/permission-control'
import './style.styl'
import {synchronizer} from '../Fetcher/synchronizer'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import CommonSaveModal from '../Common/save-modal'
import classNames from 'classnames'
import {convertDateType, isRelative} from '../../../common/param-transform'
import moment from 'moment'

const FormItem = Form.Item

const canModContacts = checkPermission('/app/contact/persons/:personId')
const canModAlarmInterface = checkPermission('/app/alarm/interfaces/:id')

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 12 }
}

const formItemLayout412 = {
  labelCol: { span: 4 },
  wrapperCol: { span: 12 }
}

const formItemLayout2 = {
  labelCol: { span: 4 },
  wrapperCol: { span: 12 }
}

const horizontalLayout = {
  wrapperCol: { span: 12, offset: 4 }
}

// let ExcludeDateTypeTitleSet = new Set(['今年', '去年', ''])
const localDateOptions = immutateUpdate(dateOptions(), 'natural', titleAndDateTypes => {
  // return titleAndDateTypes.filter(({ title }) => !ExcludeDateTypeTitleSet.has(title))
  return []
})

/**
 * 创建或者编辑监控告警
 */
@Form.create()
@synchronizer(() => ({
  url: '/app/monitor-alarms/notify-templates',
  modelName: 'notifyTemplates',
  debounce: 400
}))
@synchronizer(() => ({
  url: '/app/contact/persons',
  modelName: 'contacts',
  debounce: 600
}))
@synchronizer(() => ({
  url: '/app/contact/departments',
  modelName: 'departments',
  debounce: 500
}))
@synchronizer(() => ({
  url: '/app/monitor-alarms/contact-wx/persons',
  modelName: 'wechatPersons',
  debounce: 1400
}))
@synchronizer(() => ({
  url: '/app/monitor-alarms/contact-wx/departments',
  modelName: 'wechatDepartments',
  debounce: 1500
}))
@synchronizer(() => ({
  url: '/app/alarm/interfaces',
  modelName: 'alarmInterfaces',
  debounce: 1500
}))
@validateFieldsAndScroll
@setStatePromise
export default class MonitorAlarmForm extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.defalutState = {
      loading: false,
      query_params: {
        filters: [{
          col: '__time',
          op: 'in',
          eq: '-15 minutes'
        }],
        metrics: []
      },
      monitorAlarmsEditing: null
    }
    this.state = {
      ...this.defalutState
    }
    this.isInitData = false
  }

  componentWillMount() {
    const { projectCurrent } = this.props
    if (!this.isInitData && !_.isEmpty(projectCurrent)) {
      this.initData(projectCurrent)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.projectCurrent, this.props.projectCurrent)) {
      const { monitorAlarmsEditing } = this.state
      // 编辑模式时，切换项目调整到新增页面
      if (monitorAlarmsEditing) {
        browserHistory.push('/console/monitor-alarms/create')
        const { datasource_id } = nextProps.projectCurrent
        this.setState({ ...this.defalutState })
        nextProps.getMeasures(datasource_id, { limit: 999 })
        this.reset()
        return
      }
      this.initData(nextProps.projectCurrent)
    }
  }

  reset = () => {
    this.props.form.resetFields()
  }

  initData = async (projectCurrent) => {
    this.isInitData = true
    const { getMeasures, getMonitorAlarms, params } = this.props
    const { datasource_id } = projectCurrent
    await getMeasures(datasource_id, { limit: 999 })
    const { id: monitorId } = params
    // 加载更新监控告警记录
    if (monitorId) {
      const res = await getMonitorAlarms(monitorId)
      const { result: { query_params } } = res
      await this.setStatePromise({
        monitorAlarmsEditing: res.result,
        query_params
      })
    }
  }

  // 解析设定告警方式设置的值并赋值到formData
  setAlarmTypes = (formData) => {
    let alarm_types = []
    _.each(formData, (val, key) => {
      if (_.startsWith(key, 'alarmType-')) {
        // 删除模板显示状态
        delete(val.showTmpl)
        alarm_types.push(val)
        delete(formData[key])
      }
    })
    formData.alarm_types = alarm_types
    return formData
  }

  onSave = async (e) => {
    e.preventDefault()
    const { projectCurrent, measures } = this.props
    let { query_params, monitorAlarmsEditing } = this.state
    const { addMonitorAlarms, updateMonitorAlarms } = this.props
    let formData = await this.validateFieldsAndScroll()
    if (!formData) {
      return
    }
    // 设置告警方式
    formData = this.setAlarmTypes(formData)
    // 过滤器设置数据源id
    query_params.druid_datasource_id = projectCurrent.datasource_id
    // 设置过滤条件
    formData.query_params = query_params
    formData.project_id = projectCurrent.id
    // 冗余项目名称用于发送告警通知模板
    formData.project_name = projectCurrent.name
    // 设置查询的metric——id
    const metric = _.get(formData, 'metric_rules.metric')
    formData.query_params.metrics = [metric]
    // 冗余指标别名用于发送告警通知模板
    formData.metric_rules.title = _.get(measures.filter(m => m.name === metric), '[0].title', '')
    // debug(formData, 'formData=')
    let res
    if (monitorAlarmsEditing) {
      // 注意：这里是赋值缓存到redis的值，在scheduler-job.server检查用到实例对象的属性都要在这里赋值，因为没有查询数据库
      // 目前主要用到监控记录(monitor)的id,name,status,company_id属性
      // status,company_id这两个属性在表单没有所以需要手动赋值
      formData.status = monitorAlarmsEditing.status
      formData.company_id = monitorAlarmsEditing.company_id
      res = await updateMonitorAlarms(monitorAlarmsEditing.id, formData)

      // 更新策略后自动起监控任务
      if (formData.status !== 1) {
        let update = {...monitorAlarmsEditing, ...formData}
        update.status = 1
        update.check_counter = 0
        update.prev_monitor_result = null
        update.prev_monitor_time = null
        updateMonitorAlarms(monitorAlarmsEditing.id, update, true)
      }
    } else {
      res = await addMonitorAlarms(formData)
    }
    if (!res) {
      message.success('操作失败')
      return
    }
    message.success('操作成功')
    browserHistory.push('/console/monitor-alarms')
  }

  onFiltersChange = filters => {
    let query_params = deepCopy(this.state.query_params)
    query_params.filters = filters
    this.setState({ query_params })
  }

  renderConditionTemplateWrapper = synchronizer(
    ({projectCurrent}) => {
      let pId = _.get(projectCurrent, 'id') || ''
      return ({
        url: '/app/monitor-alarm-condition-templates',
        modelName: 'templates',
        doFetch: !!pId,
        doSync: true,
        debounce: 500,
        query: { project_id: pId }
      })
    }
  )(({children, templates, isFetchingTemplates, isSyncingTemplates, reloadTemplates, modifyTemplates}) => {
    let {projectCurrent, form} = this.props
    let {selectedConditionTemplateId, visiblePopoverKey, query_params} = this.state
    let selectedTemplateIdx = selectedConditionTemplateId && _.findIndex(templates, {id: selectedConditionTemplateId})
    let selectedTemplate = 0 <= selectedTemplateIdx && templates[selectedTemplateIdx]
    return (
      <div className="relative" >
        {/* 灰色背景效果 */}
        <div
          className="bg-dark-white corner"
          style={{
            position: 'absolute',
            top: -12,
            left: 20,
            width: '70%',
            height: 'calc(100% + 12px + 12px)'
          }}
        >
          {'\u00a0'}
        </div>
        <FormItem
          {...formItemLayout412}
          label="告警模版"
        >
          <Select
            {...enableSelectSearch}
            allowClear
            placeholder={_.isEmpty(templates) ? '还没有告警模版' : '请选择告警模版'}
            className="width200 iblock"
            disabled={isFetchingTemplates}
            value={selectedConditionTemplateId || undefined}
            onChange={val => {
              // 合并模版的筛选条件，直接替换其他
              let nextTemplate = _.find(templates, {id: val})
              if (nextTemplate) {
                this.setState(currState => {
                  return immutateUpdates(currState,
                    'selectedConditionTemplateId', () => val,
                    'query_params', () => nextTemplate.query_params)
                }, () => {
                  form.setFieldsValue({
                    time_rules: nextTemplate.time_rules,
                    metric_rules: nextTemplate.metric_rules
                  })
                })
              } else {
                this.setState({selectedConditionTemplateId: null})
              }
            }}
          >
            {templates.map((template) => {
              return (
                <Select.Option key={template.id} value={template.id}>
                  {template.name}
                </Select.Option>
              )
            })}
          </Select>


          <span className="fright">
            <CommonSaveModal
              placement="bottom"
              modelType="条件模版"
              currModelName={selectedTemplate && selectedTemplate.name || ''}
              visible={visiblePopoverKey === 'monitor-alarm-condition-template-save-modal'}
              onVisibleChange={visible => {
                this.setState({visiblePopoverKey: visible && 'monitor-alarm-condition-template-save-modal'})
              }}
              canSaveAsOnly={!selectedTemplate}
              onSaveAs={async newName => {
                let formData = await this.validateFieldsAndScroll(['time_rules', 'metric_rules'])
                if (!formData) {
                  return
                }
                let {time_rules, metric_rules} = formData
                let res = await modifyTemplates([_.size(templates)], () => ({
                  project_id: projectCurrent.id, time_rules, metric_rules, query_params, name: newName
                }))
                if (res && !_(res.resCreate).compact().isEmpty()) {
                  message.success('保存条件模版成功!')
                  reloadTemplates()
                }
              }}
              onUpdate={async (newName) => {
                let formData = await this.validateFieldsAndScroll(['time_rules', 'metric_rules'])
                if (!formData) {
                  return
                }
                let {time_rules, metric_rules} = formData
                let res = await modifyTemplates([selectedTemplateIdx], prev => ({
                  id: prev.id, project_id: projectCurrent.id, time_rules, metric_rules, query_params, name: newName
                }))
                if (res.resUpdate) {
                  message.success('保存成功!')
                  reloadTemplates()
                }
              }}
            >
              <Button
                loading={isSyncingTemplates}
                type="success"
                icon={<SaveOutlined />}
                size="default"
              >保存条件模版</Button>
            </CommonSaveModal>

            <Popconfirm
              title="确定要删除这个条件模版吗？"
              onConfirm={async () => {
                this.setState({selectedConditionTemplateId: null})
                let res = await modifyTemplates([], templates0 => templates0.filter(t => t.id !== selectedTemplate.id))
                if (res.resDelete) {
                  message.success('删除成功!')
                  reloadTemplates()
                }
              }}
            >
              <Button
                className={classNames('mg1l', {hide: !selectedTemplate})}
                type="default"
                icon={<CloseOutlined />}
              >删除</Button>
            </Popconfirm>
          </span>
        </FormItem>

        {children}
      </div>
    );
  })

  /**
   * 渲染设定监控条件
   * @memberof MonitorCreate
   */
  renderFilters = () => {
    const {  projectCurrent } = this.props
    const { id: projectId, datasource_id: dataSourceId } = projectCurrent
    if (!dataSourceId) return null
    const { query_params: { filters } } = this.state
    let props = {
      projectId,
      dataSourceId,
      timePickerProps: {
        dateTypes: localDateOptions,
        className: 'iblock width260 mg2r'
      },
      filters: filters,
      onFiltersChange: this.onFiltersChange,
      queryDistinctValueTimeRangeOverwrite: (timeFltEq, searchingKeyword) => {
        let defaultRange = searchingKeyword ? '-365 days' : '-7 days'
        let [defaultSince, defaultUntil] = convertDateType(defaultRange, 'iso', 'tool')

        let relativeTime = isRelative(timeFltEq) ? timeFltEq : 'custom'
        let [since, until] = relativeTime === 'custom' ? timeFltEq : convertDateType(relativeTime, 'iso', 'tool')
        return [
          moment(since).isBefore(defaultSince) ? since : defaultSince,
          moment(until).isAfter(defaultUntil) ? until : defaultUntil
        ]
      },
      getPopupContainer: () => document.querySelector('.scroll-content')
    }
    return (
      <FormItem
        key="filters"
        {...formItemLayout412}
        label={(
          <span>
            设定监控条件&nbsp;
            <Tooltip placement="topLeft" title="过滤条件作用于监控项的监控范围">
              <Icon type="question-circle-o" />
            </Tooltip>
          </span>
        )}
      >
        <CommonDruidFilterPanel {...props} />
      </FormItem>
    )
  }

  checkTimeInput = (rule, value, callback) => {
    const { time, unit } = value
    if (unit === 'minutes' && time < 1) {
      callback('最小允许设置1分钟!')
      return
    } else if (time === 0 && unit === 'hours') {
      callback('必须大于0小时!')
      return
    }
    callback()
  }

  checkRuleInput = (rule, value, callback) => {
    const { metric, rules } = value
    if (!metric) {
      callback('请选择检测指标')
      return
    }
    if (_.some(rules, ({operator, threshold}) => (operator === 'greaterThan' || operator === 'lessThan') && isNaN(threshold))) {
      callback('请输入检查阀值')
      return
    }
    if (
      _.some(rules, ({operator, threshold, thresholdEnd}) => {
        return (operator === 'between' || operator === 'exclude') && (isNaN(threshold) || isNaN(thresholdEnd))
      })
    ) {
      callback('请输入完整的阀值范围')
      return
    }
    callback()
  }

  checkAlarmReceiver = (rule, value, callback) => {
    const { curTemplate, receivers, receiverDepartment } = value
    if (!curTemplate) {
      callback('请选择告警模版')
      return
    }
    if (_.isEmpty(receivers) && !receiverDepartment) {
      callback('请选择接收人或接收部门')
      return
    }
    callback()
  }

  /**
   * 渲染设定告警目标
   * @memberof MonitorCreate
   */
  renderAlarmRules = () => {
    const { measures } = this.props
    const { getFieldDecorator } = this.props.form
    const { monitorAlarmsEditing } = this.state
    return (
      <div key="alarmRules">
        <FormItem
          className="zIndex4"
          {...formItemLayout2}
          label={(
            <span>
            设定告警目标&nbsp;
              <Tooltip
                placement="topLeft"
                title={
                  <div>
                    <p>告警目标为发出告警的阀值，</p>
                    <p>监控项达到该阀值就会发生异常告警</p>
                  </div>
                }
              >
                <Icon type="question-circle-o" />
              </Tooltip>
            </span>
          )}
        >
          <div className="pd2x">
            {getFieldDecorator('time_rules', {
              initialValue: _.get(monitorAlarmsEditing, 'time_rules', { time: 5, unit: 'minutes' }),
              rules: [{ validator: this.checkTimeInput }]
            })( <AlarmTimeInput /> )}
          </div>
        </FormItem>
        <FormItem
          {...horizontalLayout}
          className="relative edit-alarm-form-item"
        >

          {getFieldDecorator('metric_rules', {
            initialValue: _.get(monitorAlarmsEditing, 'metric_rules', { metric: '', rules: [{operator: 'greaterThan'}] }),
            rules: [{ validator: this.checkRuleInput }]
          })( <AlarmRuleInput measures={measures} /> )}
        </FormItem>
      </div>
    )
  }

  renderManagerButtons = () => {
    return (
      <FormItem
        {...formItemLayout}
        label={(
          <span>
            设定告警方式&nbsp;
            <Tooltip
              placement="topLeft"
              title={
                <div>
                  <p>告警消息通知的发送方式</p>
                  <p>目前支持短信，邮件，自定义接口发送方式</p>
                </div>
              }
            >
              <Icon type="question-circle-o" />
            </Tooltip>
          </span>
        )}
      >
        {!canModAlarmInterface && !canModContacts ? (
          <span className="color-grey">（你没有编辑告警接口或通讯录权限，如需要修改它们，请联系管理员）</span>
        ) : null}
        <Auth auth="/console/monitor-alarms/notify-templates-management">
          <Link to="/console/monitor-alarms/notify-templates-management">
            <span
              className="pointer mg2r"
            >
              <Icon type="usb" className="mg1r" />
              编辑通知模版
            </span>
          </Link>
        </Auth>
        <Auth auth="/console/monitor-alarms/contacts-management">
          <Link to="/console/monitor-alarms/contacts-management">
            <span
              className="pointer"
            >
              <Icon type="edit" className="mg1r" />
            编辑通讯录
            </span>
          </Link>
        </Auth>
      </FormItem>
    )
  }

  removeInterfaceReceiver = (curIdx) => {
    const { form } = this.props
    let formData = form.getFieldsValue()
    // 设置告警方式
    let realAlarmTypes = _(formData)
      .pickBy((val, key) => _.startsWith(key, 'alarmType-'))
      .toPairs()
      .orderBy(p => +p[0].split('-')[1])
      .map(p => p[1])
      .value()

    if (realAlarmTypes.length === 1) { // 至少保留一项
      message.warn('请至少设置一项告警方式')
      return
    }
    // mod alarmType-idx
    let nextAlarmTypes = realAlarmTypes.filter((t, idx) => idx !== curIdx)
    let formStateObj = _(nextAlarmTypes)
      .map((t, idx) => `alarmType-${idx}`)
      .zipObject(nextAlarmTypes)
      .value()
    form.setFieldsValue({
      alarm_types: nextAlarmTypes,
      ...formStateObj
    })
  }

  addInterfaceReceiver = () => {
    const { form } = this.props
    const alarm_types = form.getFieldValue('alarm_types')
    const nextAlarmTypes = alarm_types.concat({ curInterface: '', receivers: []})
    form.setFieldsValue({
      alarm_types: nextAlarmTypes
    })
  }

  // 渲染告警方式
  renderChooseInterface = () => {
    const { getFieldDecorator, getFieldValue } = this.props.form
    const {
      notifyTemplates, departments, contacts: dbContacts = [],  wechatDepartments, wechatPersons, alarmInterfaces,
      isFetchingNotifyTemplates, isFetchingContacts, isFetchingWechatPersons, isFetchingWechatDepartments,
      isFetchingDepartments
    } = this.props
    const { monitorAlarmsEditing, query_params } = this.state
    const initialValue = [{
      curInterface: '',
      receivers: []
    }]
    getFieldDecorator('alarm_types', {
      initialValue: _.get(monitorAlarmsEditing, 'alarm_types', initialValue)
    })
    const alarm_types = getFieldValue('alarm_types')
    return alarm_types.map((obj, idx) => {
      if (!obj) return null
      return (
        <FormItem
          {...horizontalLayout}
          key={`alarm-receiver-item-${idx}`}
          required={false}
          className="relative"
        >
          {getFieldDecorator(`alarmType-${idx}`, {
            initialValue: obj,
            rules: [{ validator: this.checkAlarmReceiver }]
          })(
            <AlarmInterfaceReceiver
              className="border-alarm-tmpl"
              isFetchingDepartments={isFetchingDepartments}
              isFetchingContacts={isFetchingContacts}
              isFetchingNotifyTemplates={isFetchingNotifyTemplates}
              isFetchingWechatDepartments={isFetchingWechatDepartments}
              isFetchingWechatPersons={isFetchingWechatPersons}
              alarmInterfaces={alarmInterfaces}
              wechatPersons={wechatPersons}
              wechatDepartments={wechatDepartments}
              departments={departments}
              notifyTemplates={notifyTemplates}
              dbContacts={dbContacts}
            /> )}
          {_.size(alarm_types) <= 1 ? null :
            <Icon
              title="删除告警方式"
              className="dynamic-delete-button iblock font16 vertical-center-of-relative pointer color-red line-height32"
              type="minus-circle"
              onClick={() => this.removeInterfaceReceiver(idx)}
            />
          }
        </FormItem>
      )
    })
  }

  render() {
    const { loading: loadingMonitor, form: {getFieldDecorator} } = this.props
    const  { loading, monitorAlarmsEditing } = this.state
    const title = `${monitorAlarmsEditing ? '编辑' : '新建'}告警策略`
    let CondTemplate = this.renderConditionTemplateWrapper

    return (
      <div className="height-100 bg-white">
        <Bread
          path={[{ name: title }]}
        >
          <Link to={'/console/monitor-alarms'}>
            <Button
              type="ghost"
              icon={<RollbackOutlined />}
              className="mg1r iblock"
            >返回</Button>
          </Link>
        </Bread>
        <div className="scroll-content always-display-scrollbar relative">
          <div className="pd2y pd3x">
            <Spin spinning={loadingMonitor} className="left">
              <Form layout="horizontal" onSubmit={this.submit}>
                <FormItem {...formItemLayout} label="告警名称" className="zIndex4">
                  {getFieldDecorator('name',{
                    rules: [{ type: 'string', required: true, message: '请填写告警名称且长度不超过25', max: 25 }],
                    initialValue: _.get(monitorAlarmsEditing, 'name', '')
                  })( <Input /> )}
                </FormItem>

                <CondTemplate projectCurrent={this.props.projectCurrent}>

                  {this.renderFilters()}

                  {this.renderAlarmRules()}

                </CondTemplate>

                {this.renderManagerButtons()}

                {this.renderChooseInterface()}

                <Form.Item {...horizontalLayout}>
                  <span
                    className="pointer"
                    onClick={this.addInterfaceReceiver}
                    title="增加一个条件"
                  >
                    <Icon className="mg1r" type="plus-circle-o" />
                    增加一个告警方式
                  </span>
                </Form.Item>

                <FormItem
                  {...formItemLayout}
                  label={(
                    <span>
                    设定告警规则&nbsp;
                      <Tooltip
                        placement="topLeft"
                        title={
                          <div>
                            <p>1. 异常根据检测的次数发出衰减式告警通知，规律如下：</p>
                            <p className="mg2l">1，2，3，5，8，13，21，34，55，89，144，233，377，610，987，1597，2584，4181，6765；</p>
                            <p>2.	每一次的检测发生异常都会发出告警通知；</p>
                            <p>3.	第一次的检测发生异常发送一次通知后，后面的异常不再通知，直至恢复正常</p>
                          </div>
                        }
                      >
                        <Icon type="question-circle-o" />
                      </Tooltip>
                    </span>
                  )}
                >
                  {getFieldDecorator('alarm_rule', {
                    rules: [{ type: 'string', required: true, message: '请选择告警方式' }],
                    initialValue: _.get(monitorAlarmsEditing, 'alarm_rule', 'fibonacci')
                  })(
                    <Select showSearch allowClear optionFilterProp="children">
                      {ALARM_UNUSUAL_RULES.map((rule) => {
                        return (
                          <Select.Option key={rule.key} value={rule.key}>
                            {rule.val}
                          </Select.Option>
                        )
                      })}
                    </Select>
                  )
                  }
                </FormItem>
                <FormItem
                  {...formItemLayout}
                  label={(
                    <span>
                      恢复正常通知&nbsp;
                      <Tooltip
                        placement="topLeft"
                        title={
                          <div>
                            <p>开启后每次异常的恢复均会发送通知信息，</p>
                            <p>关闭则不发送恢复正常的通知信息</p>
                            <p className="color-red">恢复正常后会重置异常次数为零</p>
                          </div>
                        }
                      >
                        <Icon type="question-circle-o" />
                      </Tooltip>
                    </span>
                  )}
                >
                  {getFieldDecorator('alarm_recovery', {
                    valuePropName: 'checked',
                    initialValue: _.get(monitorAlarmsEditing, 'alarm_recovery', false)
                  })( <Switch /> )}
                </FormItem>
                <div className="ant-col-18 ant-col-offset-6">
                  {
                    monitorAlarmsEditing ?
                      <p className="color-red mg2b">
                      注意：更新后会重置异常次数为零
                      </p> : null
                  }
                  <Button
                    type="success"
                    icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
                    className="iblock mg2r"
                    onClick={this.onSave}
                  >{loading ? '保存中...' : '保存'}</Button>
                  <Link to={'/console/monitor-alarms'}>
                    <Button
                      type="ghost"
                      icon={<RollbackOutlined />}
                      className="mg1r iblock"
                    >取消</Button>
                  </Link>
                </div>
              </Form>
            </Spin>
          </div>
        </div>
      </div>
    );
  }
}
