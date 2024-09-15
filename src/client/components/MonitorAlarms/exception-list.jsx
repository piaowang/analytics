
import React from 'react'
import { RollbackOutlined } from '@ant-design/icons';
import { Button, Table, Select, Tooltip, Radio, Modal, Input, Popover, Popconfirm, message } from 'antd'
import Bread from '../Common/bread'
import { Link } from 'react-router'
import Icon from '../Common/sugo-icon'
import setStatePromise from '../../common/set-state-promise'
import DateRangePicker from '../Common/time-picker'
import Fetch from '../../common/fetch-final'
import moment from 'moment'
import _ from 'lodash'
import './style.styl'
import {
  immutateUpdate, immutateUpdates, compressUrlQuery, escape,
  isDiffByPath
} from '../../../common/sugo-utils'
import {findSuitableGranularity, sliceFilterToLuceneFilterStr} from '../../../common/druid-query-utils'
import {convertDateType, isRelative} from 'common/param-transform'
import FixWidthHelper from 'client/components/Common/fix-width-helper-no-hidden'
import * as PubSub from 'pubsub-js'
import {MetricRulesAlarmLevelEnum, MetricRulesAlarmLevelTranslation, AlarmExceptionHandleState} from '../../../common/constants'
import AlarmInterfaceReceiver from './alarm-interface-receiver'
import {synchronizer} from '../Fetcher/synchronizer'
import classNames from 'classnames'
import {checkPermission} from 'client/common/permission-control'
import {enableSelectSearch} from 'client/common/antd-freq-use-props'
import {EMPTY_VALUE_OR_NULL} from 'client/constants/string-constant'
import {isCharDimension} from '../../../common/druid-column-type'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import smartSearch from '../../../common/smart-search'
import AsyncHref from '../Common/async-href'

const {Option} = Select

const iconSty = {
  verticalAlign: 'text-bottom'
}

const canHandleException = checkPermission('put:/app/monitor-alarms/:id/exceptions')
const canInspectSourceData = checkPermission('put:/app/monitor-alarms/exceptions/:id/inspect-source-data') && checkPermission('get:/console/source-data-analytic')

let canAccessExceptionListInMenu = _(window.sugo.menus)
  .some(m => _.some(m.children, sm => sm.title === '监控告警' && sm.children))

const defaultTimeRange = '-1 days'

const getDefaultTime = () => {
  const end = moment().format('YYYY-MM-DD HH:mm:ss')
  const start = moment().add(...defaultTimeRange.split(' ')).format('YYYY-MM-DD HH:mm:ss')
  return [start, end]
}

@synchronizer(({projectCurrent}) => {
  return ({
    url: method => {
      let dict = {GET: `query-all/${projectCurrent && projectCurrent.id}`, POST: 'create', PUT: 'update', DELETE: 'remove'}
      return `/app/monitor-alarms/${dict[method]}`
    },
    modelName: 'monitorAlarms',
    doFetch: !!projectCurrent,
    debounce: 300
  })
})
@synchronizer(() => ({
  url: '/app/monitor-alarms/notify-templates',
  modelName: 'notifyTemplates',
  doFetch: false
}))
@synchronizer(() => ({
  url: '/app/contact/persons',
  modelName: 'contacts',
  doFetch: false
}))
@synchronizer(() => ({
  url: '/app/contact/departments',
  modelName: 'departments',
  doFetch: false
}))
@synchronizer(() => ({
  url: '/app/monitor-alarms/contact-wx/persons',
  modelName: 'wechatPersons',
  doFetch: false
}))
@synchronizer(() => ({
  url: '/app/monitor-alarms/contact-wx/departments',
  modelName: 'wechatDepartments',
  doFetch: false
}))
@synchronizer(() => ({
  url: '/app/alarm/interfaces',
  modelName: 'alarmInterfaces',
  doFetch: false
}))
@setStatePromise
export default class MonitorAlarmExceptions extends React.Component {

  state = {
    sources: [],
    monitor_id: undefined,
    timeRange: defaultTimeRange,
    page: 1,
    pageSize: 20,
    total: 0,
    filterByLevel: null,
    visiblePopoverKey: null,
    savingExceptionIds: [],
    editingException: null,
    selectedRowKeys: [],
    startMultipleHandleCallback: null,
    tempHandleCompletedRemark: null,
    monitorCondFilters: []
  }

  isInitData = false

  componentWillMount() {
    const { projectCurrent } = this.props
    if (!this.isInitData && !_.isEmpty(projectCurrent)) {
      this.reloadExceptions()
    }
  }

  async prepareAlarmInterfaceReceiverData() {
    let {
      reloadNotifyTemplates, reloadContacts, reloadDepartments, reloadWechatPersons, reloadWechatDepartments,
      reloadAlarmInterfaces
    } = this.props
    reloadNotifyTemplates()
    reloadContacts()
    reloadDepartments()
    reloadWechatPersons()
    reloadWechatDepartments()
    reloadAlarmInterfaces()
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.projectCurrent, this.props.projectCurrent)) {
      this.reloadExceptions(nextProps.projectCurrent)
    }
    if (!_.isEqual(nextProps.dbExceptions, this.props.dbExceptions)) {
      const { rows: sources, count: total } = nextProps.dbExceptions
      this.setState({ sources, total })
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const keys = ['monitor_id', 'timeRange', 'page']
    if(!_.isEqual(_.pick(prevState, keys), _.pick(this.state, keys))) {  //相关参数做了更改
      this.reloadExceptions() //重新获取数据
    } else if (isDiffByPath(this.props, prevProps, 'location.query.handleState')) {
      this.reloadExceptions()
    }
  }

  /**
   * @param where {page, pageSize, detection_time}
   * @memberof AlarmExceptionsFetcher
   */
  findExceptions = async (where) => {
    return await Fetch.get('/app/monitor-alarms/exceptions', where)
  }

  updateException = async (inst) => {
    const res = await Fetch.put(`/app/monitor-alarms/exceptions/${inst.id}`, inst)
    if (!res.result) {
      message.warn('更新失败')
      return
    }
    message.success('更新成功')
    await this.reloadExceptions()
  }

  deleteExceptions = async (id) => {
    return await Fetch.delete(`/app/monitor-alarms/remove-exceptions/${id}`)
  }

  remove = async (id) => {
    const res = await this.deleteExceptions(id)
    if (!res.result) {
      message.warn('删除失败')
      return
    }
    message.success('删除成功')
    await this.reloadExceptions()
  }

  onChangeAlarms = (monitor_id) => {
    this.setState({ monitor_id: monitor_id === 'name:' ? '' : monitor_id })
  }

  onSearchAlarmsByName = _.debounce(val => {
    if (val) {
      this.setState({monitor_id: `name:${val}`})
    }
  }, 1000)

  onTimeChange = async value => {
    const { dateType: relativeTime, dateRange: [since, until] } = value
    await this.setStatePromise({
      timeRange: relativeTime === 'custom' ? [since, until] : relativeTime
    })
  }

  reloadExceptions = async (project) => {
    let { projectCurrent, monitorAlarms, location} = this.props
    let queryForHandleState = _.get(location, 'query.handleState')
    let specifyExceptionId = _.get(location, 'query.exceptionId')
    if (project) {
      projectCurrent = project
      const { getMonitorAlarms } = this.props
      await getMonitorAlarms(null, project.id)
    }
    this.isInitData = true
    let { monitor_id, timeRange, page, pageSize, filterByLevel, monitorCondFilters } = this.state

    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime, 'iso')

    // 按告警筛选
    let filterByMonitorIds = null // null 表示不根据告警 id 过滤
    if (monitor_id) {
      filterByMonitorIds = _.startsWith(monitor_id, 'name:')
        ? monitorAlarms.filter(m => smartSearch(monitor_id.substr(5), m.name)).map(m => m.id)
        : [monitor_id]
    }

    let where = {
      exceptionId: specifyExceptionId,
      project_id: projectCurrent.id,
      page,
      pageSize,
      detection_time: [since, until],
      handleState: queryForHandleState,
      level: filterByLevel,
      monitorIds: filterByMonitorIds,
      // 按产生异常当时的告警条件筛选
      monitorCondFilters
    }
    if (specifyExceptionId) {
      delete where.detection_time
      delete where.level
    }
    const res = await this.findExceptions(where)
    const { result: { rows: sources, count: total } } = res
    await this.setStatePromise({ sources, total })
  }

  reloadExceptionsDebounced = _.debounce(this.reloadExceptions, 1000)

  renderColumn(title, key) {
    return {
      title,
      dataIndex: key,
      key,
      className: 'aligncenter',
      sorter: (a, b) => a[key] > b[key] ? 1 : -1
    }
  }

  renderNotifyStatus = (nodifyStatus, record, idx) => {
    if (!nodifyStatus || nodifyStatus.length === 0) {
      return null
    }
    const getContent = (sources) => {
      return _.map(sources, (o, idx) => {
        return (
          <div className="mg1" key={idx}>
            <p>{o.notify_mode}: {o.state ? '成功' : '失败'}</p>
          </div>
        )
      })
    }
    //totalObj:  {true: 1, false: 1}
    const totalObj = _.countBy(nodifyStatus, o => o.state)
    const sTotal = _.get(totalObj, true, 0)
    const fTotal = _.get(totalObj, false, 0)
    const sContent = getContent(_.filter(nodifyStatus, o => o.state === true))
    const fContent = getContent(_.filter(nodifyStatus, o => o.state === false))
    return (
      <span key={`notify-status-${idx}`}>
        <Popover
          getPopupContainer={() => document.body}
          key={`notify-prop-s-${idx}`}
          placement="right" title="成功"
          content={sContent}
        >
          <span className="pointer mg2r">成功({sTotal})</span>
        </Popover>
        {
          fTotal > 0 ?
            <Popover
              getPopupContainer={() => document.body}
              key={`notify-prop-f-${idx}`}
              placement="right"
              title="失败"
              content={fContent}
            >
              <span className="pointer">失败{fTotal}</span>
            </Popover>
            : null
        }
      </span>
    )
  }

  showHandlingModal(alarmException) {
    if (!this.handlingModalOnceInViewport) {
      this.handlingModalOnceInViewport = true
      this.prepareAlarmInterfaceReceiverData()
    }
    this.setState({
      selectedRowKeys: [],
      visiblePopoverKey: 'alarm-exception-list-handling-modal',
      editingException: _.pick(alarmException, ['id', 'handle_info'])
    })
  }

  showIgnoringModal(alarmException) {
    this.setState({
      selectedRowKeys: [],
      visiblePopoverKey: 'alarm-exception-list-ignoring-modal',
      editingException: _.pick(alarmException, ['id', 'handle_info'])
    })
  }

  showCompletingModal(alarmException) {
    this.setState({
      selectedRowKeys: [],
      visiblePopoverKey: 'alarm-exception-list-completing-modal',
      editingException: _.pick(alarmException, ['id', 'handle_info'])
    })
  }

  /**
   * 根据告警异常记录，生成日志分析的超链接
   * 筛选条件取监控告警的 druid 查询条件，时间范围重新设置到告警最后一次发生的时间段
   * @param alarmException
   * @returns {string}
   */
  genSourceAnalyticHref(alarmException) {
    let {monitorAlarms} = this.props
    let {monitor_id, detection_time} = alarmException
    let monitorAlarm = _.find(monitorAlarms, ma => ma.id === monitor_id)
    if (!monitorAlarm) {
      return 'javascript:'
    }

    // 读取记录发送异常当时的查询条件，避免告警条件修改后影响异常的排查
    let filters = _.get(alarmException, 'query_params.filters') || _.get(monitorAlarm, 'query_params.filters')

    let timeFltIdx = _.findIndex(filters, flt => flt.col === '__time')
    if (timeFltIdx === -1) {
      return 'javascript:'
    }

    if (isRelative(filters[timeFltIdx].eq)) {
      filters = immutateUpdate(filters, [timeFltIdx, 'eq'], prevEq => {
        let relativeTime = isRelative(prevEq) ? prevEq : 'custom'
        let [since, until] = relativeTime === 'custom' ? prevEq : convertDateType(relativeTime, 'iso', 'tool')
        let duration = moment(until).diff(since, 'ms')
        return [moment(detection_time).subtract(duration, 'ms').toISOString(), detection_time]
      })
    }

    // contains or in convert to lucene filter
    let luceneFilter = ''
    let shouldConvertThisFlt = flt => _.endsWith(flt.op, 'contains') || (_.endsWith(flt.op, 'in') && flt.col !== '__time')

    let willNotConvertFilters = filters
    let preConvertFilters = filters.filter(shouldConvertThisFlt)

    if (_.some(preConvertFilters)) {
      willNotConvertFilters = filters.filter(flt => !shouldConvertThisFlt(flt))
      luceneFilter = preConvertFilters.map(flt => sliceFilterToLuceneFilterStr(flt)).join(' AND ')
    }
    const cond = {
      select: ['*'],
      selectOrderDirection: 'desc',
      filters: luceneFilter
        ? [...willNotConvertFilters, { col: '*', op: 'luceneFilter', eq: [luceneFilter] }]
        : willNotConvertFilters,
      dimensionExtraSettingDict: {__time: {granularity: findSuitableGranularity(filters[timeFltIdx].eq)[0]}},
      openWith: 'source-data-analytic'
    }
    return `/console/source-data-analytic#${compressUrlQuery(cond)}`
  }

  handlingModalOnceInViewport = false

  renderForwardHandlingModal() {
    let {
      notifyTemplates, contacts, departments, wechatPersons, wechatDepartments, isFetchingNotifyTemplates,
      isFetchingContacts, isFetchingDepartments, isFetchingWechatDepartments, isFetchingWechatPersons, alarmInterfaces
    } = this.props
    let {visiblePopoverKey, editingException, startMultipleHandleCallback, sources, savingExceptionIds} = this.state
    let visible = visiblePopoverKey === 'alarm-exception-list-handling-modal'
    return (
      <Modal
        title="告警操作-处理告警"
        width={600}
        wrapClassName="vertical-center-modal"
        visible={visible}
        onCancel={() => this.setState({visiblePopoverKey: null, editingException: null, startMultipleHandleCallback: null})}
        footer={(
          <div className="aligncenter">
            <Button
              key="downloadBtn"
              type="primary"
              loading={editingException && _.includes(savingExceptionIds, editingException.id)}
              onClick={async () => {
                let forwardAlarmType = _.get(editingException, 'handle_info.forwardAlarmTypes[0]') || {}
                let {curTemplate, receivers, receiverDepartment} = forwardAlarmType
                if (!curTemplate) {
                  message.warn('请选择告警模版')
                  return
                }
                if (_.isEmpty(receivers) && !receiverDepartment) {
                  message.warn('请选择接收人或接收部门')
                  return
                }

                // 自动补充备注
                let forwardTo = ''
                if (_.isEmpty(receivers)) {
                  let dep = _.find(wechatDepartments, wd => wd.id === +receiverDepartment) || _.find(departments, {id: receiverDepartment})
                  forwardTo = _.get(dep, 'name')
                } else {
                  let contactsDict = _.keyBy([...wechatPersons, ...contacts], c => c.userid || c.id)
                  forwardTo = receivers.map(rId => _.get(contactsDict[rId], 'name')).filter(_.identity).join('、')
                }

                let delta = immutateUpdates(editingException,
                  'handle_info.remark', () => `${moment().format('YYYY-MM-DD HH:mm:ss')} 转发 ${forwardTo} 处理`,
                  'handle_info.handleState', () => AlarmExceptionHandleState.handling,
                  'handle_info.completeTime', () => moment().toISOString())
                if (startMultipleHandleCallback) {
                  return startMultipleHandleCallback(delta)
                }

                this.setState({savingExceptionIds: [...savingExceptionIds, editingException.id]})
                // 发送告警通知给被转发人
                let alarmException = _.find(sources, {id: editingException.id})
                let sendNotificationSucc = await this.forwardNotification(alarmException, delta.handle_info)
                if (!sendNotificationSucc) {
                  message.warn('转发告警异常失败')
                  this.setState(prevState => ({
                    savingExceptionIds: prevState.savingExceptionIds.filter(id => id !== editingException.id)
                  }))
                  return
                }
                await this.updateException(delta)
                PubSub.publish('exception-list-count-refresh')
                this.setState(prevState => ({
                  visiblePopoverKey: null,
                  editingException: null,
                  savingExceptionIds: prevState.savingExceptionIds.filter(id => id !== editingException.id)
                }))
              }}
            >确认处理</Button>
          </div>
        )}
      >
        <Radio.Group
          value={visiblePopoverKey}
          onChange={ev => {
            this.setState({
              visiblePopoverKey: ev.target.value
            })
          }}
        >
          <Radio.Button value="alarm-exception-list-handling-modal">转发处理</Radio.Button>
          <Radio.Button value="alarm-exception-list-direct-handling-modal">直接处理</Radio.Button>
        </Radio.Group>

        <AlarmInterfaceReceiver
          className="mg2t"
          isFetchingNotifyTemplates={isFetchingNotifyTemplates}
          isFetchingContacts={isFetchingContacts}
          isFetchingDepartments={isFetchingDepartments}
          isFetchingWechatPersons={isFetchingWechatPersons}
          isFetchingWechatDepartments={isFetchingWechatDepartments}
          alarmInterfaces={alarmInterfaces}
          departments={departments || []}
          notifyTemplates={notifyTemplates || []}
          dbContacts={contacts || []}
          wechatPersons={wechatPersons}
          wechatDepartments={wechatDepartments}
          templateLayout="vertical"
          value={_.get(editingException, 'handle_info.forwardAlarmTypes[0]')}
          onChange={newState => {
            this.setState({
              editingException: immutateUpdate(editingException,
                'handle_info.forwardAlarmTypes[0]', () => newState)
            })
          }}
        />
      </Modal>
    )
  }

  renderDirectHandlingModal() {
    let {visiblePopoverKey, editingException, savingExceptionIds, startMultipleHandleCallback} = this.state
    return (
      <Modal
        title="告警操作-处理告警"
        wrapClassName="vertical-center-modal"
        visible={visiblePopoverKey === 'alarm-exception-list-direct-handling-modal'}
        onCancel={() => this.setState({visiblePopoverKey: null, editingException: null, startMultipleHandleCallback: null})}
        footer={(
          <div className="aligncenter">
            <Button
              key="downloadBtn"
              type="primary"
              loading={editingException && _.includes(savingExceptionIds, editingException.id)}
              onClick={async () => {
                let {remark} = editingException.handle_info
                if (_.size(remark) > 250) {
                  message.warn('备注内容不能超过 250 个字符')
                  return
                }
                let delta = immutateUpdates(editingException,
                  'handle_info.handleState', () => AlarmExceptionHandleState.handled,
                  'handle_info.completeTime', () => moment().toISOString()
                )
                if (startMultipleHandleCallback) {
                  return startMultipleHandleCallback(delta)
                }
                this.setState({savingExceptionIds: [...savingExceptionIds, editingException.id]})
                await this.updateException(delta)
                PubSub.publish('exception-list-count-refresh')
                this.setState(prevState => ({
                  visiblePopoverKey: null,
                  editingException: null,
                  savingExceptionIds: prevState.savingExceptionIds.filter(id => id !== editingException.id)
                }))
              }}
            >确认处理</Button>
          </div>
        )}
      >
        <Radio.Group
          value={visiblePopoverKey}
          onChange={ev => {
            this.setState({
              visiblePopoverKey: ev.target.value
            })
          }}
        >
          <Radio.Button value="alarm-exception-list-handling-modal">转发处理</Radio.Button>
          <Radio.Button value="alarm-exception-list-direct-handling-modal">直接处理</Radio.Button>
        </Radio.Group>

        <FixWidthHelper
          toFix="first"
          toFixWidth="40px"
          className="mg2t"
        >
          备注：
          <Input.TextArea
            placeholder="最多 250 个字符"
            rows={5}
            value={_.get(editingException, 'handle_info.remark') || undefined}
            onChange={ev => {
              this.setState({editingException: immutateUpdate(editingException, 'handle_info.remark', () => ev.target.value)})
            }}
          />
        </FixWidthHelper>
      </Modal>
    )
  }

  renderIgnoringModal() {
    let {visiblePopoverKey, editingException, savingExceptionIds, startMultipleHandleCallback} = this.state
    return (
      <Modal
        title="告警操作-忽略告警"
        wrapClassName="vertical-center-modal"
        visible={visiblePopoverKey === 'alarm-exception-list-ignoring-modal'}
        onCancel={() => this.setState({visiblePopoverKey: null, editingException: null, startMultipleHandleCallback: null})}
        footer={(
          <div className="aligncenter">
            <Button
              key="downloadBtn"
              type="primary"
              loading={editingException && _.includes(savingExceptionIds, editingException.id)}
              onClick={async () => {
                let {remark} = editingException.handle_info
                if (_.size(remark) > 250) {
                  message.warn('备注内容不能超过 250 个字符')
                  return
                }
                let delta = immutateUpdates(editingException,
                  'handle_info.handleState', () => AlarmExceptionHandleState.ignored,
                  'handle_info.completeTime', () => moment().toISOString())
                if (startMultipleHandleCallback) {
                  return startMultipleHandleCallback(delta)
                }
                this.setState({savingExceptionIds: [...savingExceptionIds, editingException.id]})
                await this.updateException(delta)
                PubSub.publish('exception-list-count-refresh')
                this.setState(prevState => ({
                  visiblePopoverKey: null,
                  editingException: null,
                  savingExceptionIds: prevState.savingExceptionIds.filter(id => id !== editingException.id)
                }))
              }}
            >确认忽略</Button>
          </div>
        )}
      >
        <FixWidthHelper
          toFix="first"
          toFixWidth="40px"
        >
          备注：
          <Input.TextArea
            placeholder="最多 250 个字符"
            rows={5}
            value={_.get(editingException, 'handle_info.remark') || undefined}
            onChange={ev => {
              this.setState({editingException: immutateUpdate(editingException, 'handle_info.remark', () => ev.target.value)})
            }}
          />
        </FixWidthHelper>
      </Modal>
    )
  }

  renderHandleCompletedModal() {
    let {visiblePopoverKey, editingException, savingExceptionIds, startMultipleHandleCallback, tempHandleCompletedRemark} = this.state
    return (
      <Modal
        title="告警操作-完成告警"
        wrapClassName="vertical-center-modal"
        visible={visiblePopoverKey === 'alarm-exception-list-completing-modal'}
        onCancel={() => this.setState({visiblePopoverKey: null, editingException: null, startMultipleHandleCallback: null})}
        footer={(
          <div className="aligncenter">
            <Button
              key="downloadBtn"
              type="primary"
              loading={editingException && _.includes(savingExceptionIds, editingException.id)}
              onClick={async () => {
                let remark = tempHandleCompletedRemark
                if (_.size(remark) > 250) {
                  message.warn('备注内容不能超过 250 个字符')
                  return
                }
                let delta = prevException => immutateUpdates(prevException,
                  'handle_info.handleState', () => AlarmExceptionHandleState.handled,
                  'handle_info.completeTime', () => moment().toISOString(),
                  'handle_info.remark', prevRemark => _.trim(`${prevRemark || ''}\n${remark || ''}`))
                if (startMultipleHandleCallback) {
                  return startMultipleHandleCallback(delta)
                }
                this.setState({savingExceptionIds: [...savingExceptionIds, editingException.id]})
                await this.updateException(delta(editingException))
                PubSub.publish('exception-list-count-refresh')
                this.setState(prevState => ({
                  visiblePopoverKey: null,
                  editingException: null,
                  savingExceptionIds: prevState.savingExceptionIds.filter(id => id !== editingException.id),
                  tempHandleCompletedRemark: null
                }))
              }}
            >确定完成</Button>
          </div>
        )}
      >
        <FixWidthHelper
          toFix="first"
          toFixWidth="60px"
        >
          补充备注：
          <Input.TextArea
            placeholder="最多 250 个字符"
            rows={5}
            value={tempHandleCompletedRemark || undefined}
            onChange={ev => {
              this.setState({tempHandleCompletedRemark: ev.target.value})
            }}
          />
        </FixWidthHelper>
      </Modal>
    )
  }

  forwardNotification = async (exception, handleInfo) => {
    let {monitorAlarms, projectList} = this.props
    let {id: monitorAlarmId, project_id} = exception.SugoMonitorAlarm

    let proj = _.find(projectList, {id: project_id})
    let monitorAlarm = _.find(monitorAlarms, {id: monitorAlarmId})

    const params = {
      failureTimeOverwrite: exception.detection_time,
      dbThreshold: _.get((exception.trigger_rules || '').match(/【(\d+)】/), [1], 100),
      query_params: monitorAlarm.query_params,
      metric_rules: monitorAlarm.metric_rules,
      alarm_types: handleInfo.forwardAlarmTypes,
      project_name: proj.name,
      name: monitorAlarm.name || '测试告警',
      project_id: proj.id
    }
    // 告警
    // res: {"result":{"time":"2017-08-30T02:49:13.292Z","state":true,"notify_mode":"短信告警"},"code":0}
    const res = await Fetch.post('/app/monitor-alarms/interface-test', params)
    if (!res) {
      return false
    }
    const { result: [{ notify_mode, time, state }] } = res
    return state
  }

  batchOpWarpper = func => async (ids, delta) => {
    this.setState(prevState => ({savingExceptionIds: [...prevState.savingExceptionIds, ...ids]}))
    try {
      await func(ids, delta)
      this.reloadExceptions()
      PubSub.publish('exception-list-count-refresh')
    } catch (e) {
      console.log(e)
    }
    let editingExceptionIdsSet = new Set(ids)
    this.setState(prevState => ({
      visiblePopoverKey: null,
      editingException: null,
      savingExceptionIds: prevState.savingExceptionIds.filter(id => !editingExceptionIdsSet.has(id)),
      startMultipleHandleCallback: null,
      tempHandleCompletedRemark: null
    }))
  }

  doBatchForwardAndMod = this.batchOpWarpper(async (ids, delta) => {
    if (_.isFunction(delta)) {
      throw new Error('Not implemented: 暂时只有 doBatchMod 实现了自定义更新功能')
    }
    let {sources} = this.state
    let exceptionIdDict = _.keyBy(sources, 'id')
    let succCount = 0
    for (let eId of ids) {
      // 发送告警通知给被转发人
      let alarmException = exceptionIdDict[eId]
      let forwardSucc = await this.forwardNotification(alarmException, delta.handle_info)
      if (!forwardSucc) {
        message.warn(`转发失败，成功 ${succCount} 条，共 ${_.size(ids)} 条`)
        return
      }
      let modRes = await Fetch.put(`/app/monitor-alarms/exceptions/${eId}`, _.isFunction(delta) ? delta(alarmException) : delta)
      if (!modRes.result) {
        message.warn(`更新失败，成功 ${succCount} 条，共 ${_.size(ids)} 条`)
        return
      }
      succCount += 1
    }
    message.success('更新成功')
  })

  doBatchMod = this.batchOpWarpper(async (ids, delta) => {
    let succCount = 0
    let {sources} = this.state
    let exceptionIdDict = _.keyBy(sources, 'id')
    for (let eId of ids) {
      const res = await Fetch.put(`/app/monitor-alarms/exceptions/${eId}`, _.isFunction(delta) ? delta(exceptionIdDict[eId]) : delta)
      if (!res.result) {
        message.warn(`更新失败，成功 ${succCount} 条，共 ${_.size(ids)} 条`)
        return
      }
      succCount += 1
    }
    message.success('更新成功')
  })

  renderBatchOpSelect() {
    let {location} = this.props
    let {selectedRowKeys, sources} = this.state
    let queryForHandleState = _.get(location, 'query.handleState')

    if (queryForHandleState === AlarmExceptionHandleState.unhandled) {
      return (
        <Select
          className="mg2l"
          value=""
          onChange={op => {
            if (!op) {
              return
            }
            if (_.isEmpty(selectedRowKeys)) {
              message.warn('请先选择至少一个未处理的异常')
              return
            }
            this.state.startMultipleHandleCallback = async delta => {
              if (_.isFunction(delta)) {
                let prevDelta = delta
                delta = inst => prevDelta(_.omit(inst, 'id'))
              } else {
                delta = _.omit(delta, 'id')
              }
              // 获得了对单个的修改，将修改应用到所有选中的异常
              if (op === 'handle') {
                if (delta.handle_info.handleState === AlarmExceptionHandleState.handling) {
                  this.doBatchForwardAndMod(selectedRowKeys, delta)
                } else {
                  this.doBatchMod(selectedRowKeys, delta)
                }
              } else if (op === 'ignore') {
                this.doBatchMod(selectedRowKeys, delta)
              }
            }

            let firstSelectedException = _.find(sources, {id: selectedRowKeys[0]})
            if (op === 'handle') {
              this.showHandlingModal(firstSelectedException)
            } else if (op === 'ignore') {
              this.showIgnoringModal(firstSelectedException)
            }
          }}
        >
          <Option value="">批量操作</Option>
          <Option value="handle">处理</Option>
          <Option value="ignore">忽略</Option>
        </Select>
      )
    } else if (queryForHandleState === AlarmExceptionHandleState.handling) {
      return (
        <Select
          className="mg2l"
          value=""
          onChange={op => {
            if (!op) {
              return
            }
            if (_.isEmpty(selectedRowKeys)) {
              message.warn('请先选择至少一个处理中的异常')
              return
            }
            this.state.startMultipleHandleCallback = async delta => {
              if (_.isFunction(delta)) {
                let prevDelta = delta
                delta = inst => prevDelta(_.omit(inst, 'id'))
              } else {
                delta = _.omit(delta, 'id')
              }
              // 获得了对单个的修改，将修改应用到所有选中的异常
              this.doBatchMod(selectedRowKeys, delta)
            }

            let firstSelectedException = _.find(sources, {id: selectedRowKeys[0]})
            this.showCompletingModal(firstSelectedException)
          }}
        >
          <Option value="">批量操作</Option>
          <Option value="complete">完成</Option>
        </Select>
      )
    }
    return null
  }

  genTableCols() {
    let {location, monitorAlarms} = this.props
    let {savingExceptionIds} = this.state
    let queryForHandleState = _.get(location, 'query.handleState')
    let editingExceptionIdsSet = new Set(savingExceptionIds)

    let monitorAlarmsIdDict = _.keyBy(monitorAlarms, 'id')
    return [
      {
        ...this.renderColumn('告警名称', 'monitor_id'),
        render: (val) => {
          return _.get(monitorAlarmsIdDict, [val, 'name'])
        }
      },
      this.renderColumn('异常告警值', 'trigger_rules'),
      {
        ...this.renderColumn('告警等级', 'alarm_level'),
        render: (level) => {
          return level && MetricRulesAlarmLevelTranslation[level] || ''
        }
      },
      {
        title: '异常检测时间',
        width: 130,
        dataIndex: 'detection_time',
        key: 'detection_time',
        className: 'aligncenter elli',
        render: val => {
          if (!val) return null
          return moment(val).format('YYYY-MM-DD HH:mm')
        },
        sorter: (a, b) => a.detection_time > b.detection_time ? 1 : -1
      }, {
        title: '告警通知时间',
        width: 130,
        dataIndex: 'alarm_notify_time',
        className: 'aligncenter elli',
        key: 'alarm_notify_time',
        render: val => {
          if (!val) return null
          return moment(val).format('YYYY-MM-DD HH:mm')
        },
        sorter: (a, b) => a.alarm_notify_time > b.alarm_notify_time ? 1 : -1
      },
      {
        title: '通知状态',
        dataIndex: 'notify_status',
        className: 'aligncenter',
        key: 'notify_status',
        render: (text, record, index) => this.renderNotifyStatus(text, record, index)
      },
      {
        title: '异常次数',
        dataIndex: 'check_counter',
        className: 'aligncenter',
        key: 'check_counter',
        render: val => {
          return '第' + (val === null ? 0 : val) + '次'
        },
        sorter: (a, b) => a.check_counter > b.check_counter ? 1 : -1
      },
      queryForHandleState === AlarmExceptionHandleState.handled
        ? {
          title: '完成时间',
          width: 130,
          className: 'aligncenter elli',
          render: (id, rec) => {
            let timeStr = _.get(rec, 'handle_info.completeTime')
            return timeStr && moment(timeStr).format('YYYY-MM-DD HH:mm')
          }
        }
        : null,
      queryForHandleState === AlarmExceptionHandleState.ignored
        ? {
          title: '处理时间',
          width: 130,
          className: 'aligncenter elli',
          render: (id, rec) => {
            let timeStr = _.get(rec, 'handle_info.completeTime')
            return timeStr && moment(timeStr).format('YYYY-MM-DD HH:mm')
          }
        }
        : null,
      queryForHandleState && queryForHandleState !== AlarmExceptionHandleState.unhandled
        ? {
          title: '处理备注',
          className: 'aligncenter mw240',
          render: (id, rec) => {
            return (
              <pre className="alignleft wrap">{_.get(rec, 'handle_info.remark') || ''}</pre>
            )
          }
        }
        : null,
      {
        title: '操作',
        key: 'op',
        className: 'aligncenter minw60',
        render: (text, obj) => {
          /* {
            handleState: 'unhandled' // unhandled, handling, ignored, handled
            remark: '',
            extraAlarmTypes: [
             {
                curInterface: '', // 告警接口ID (通知模版?)
                receivers: []     // 接收人ID
              }
            ]
          } */
          let handleState = _.get(obj, 'handle_info.handleState') || 'unhandled'
          let disabledHandle = editingExceptionIdsSet.has(obj.id)
          let disabledClass = {disabled: disabledHandle}

          let delBtn = (
            <Popconfirm
              title={'确定此异常记录吗？'}
              placement="topLeft"
              onConfirm={() => this.remove(obj.id)}
            >
              <Tooltip title="删除监控" placement="right">
                <Icon type="close-circle-o" className="mg2x font16 color-grey pointer exception-del-btn" style={iconSty}/>
              </Tooltip>
            </Popconfirm>
          )
          let detailBtn = (
            <AsyncHref
              className={classNames('mg1x pointer', {hide: !canInspectSourceData})}
              initFunc={() => this.genSourceAnalyticHref(obj)}
              target="_blank"
            >详情</AsyncHref>
          )
          switch (handleState) {
            case 'unhandled':
              return (
                <div className="aligncenter">
                  <span
                    className={classNames('mg1x', {pointer: !disabledHandle, hide: !canHandleException}, disabledClass)}
                    onClick={() => {
                      if (disabledHandle) {
                        message.warn('请等待操作完成')
                        return
                      }
                      this.showHandlingModal(obj)
                    }}
                  >处理</span>
                  <span
                    className={classNames('mg1x', {pointer: !disabledHandle, hide: !canHandleException}, disabledClass)}
                    onClick={() => {
                      if (disabledHandle) {
                        message.warn('请等待操作完成')
                        return
                      }
                      this.showIgnoringModal(obj)
                    }}
                  >忽略</span>
                  {detailBtn}
                  {delBtn}
                </div>
              )
            case 'handling':
              return (
                <div className="aligncenter">
                  <span
                    className={classNames('mg1x', {pointer: !disabledHandle, hide: !canHandleException}, disabledClass)}
                    onClick={() => {
                      if (disabledHandle) {
                        message.warn('请等待操作完成')
                        return
                      }
                      this.showCompletingModal(obj)
                    }}
                  >完成</span>
                  {detailBtn}
                  {delBtn}
                </div>
              )
            case 'handled':
            case 'ignored':
            default:
              return (
                <div className="aligncenter">
                  {detailBtn}
                  {delBtn}
                </div>
              )
          }
        }
      }].filter(_.identity)
  }

  renderMonitorConditionsFilter = (props = {}) => {
    let {projectCurrent} = this.props
    let {visiblePopoverKey, monitorCondFilters} = this.state
    return (
      <Popover
        title={
          [
            <span key="title" className="font14 mg2r">按产生异常当时的告警条件筛选</span>,
            <Icon
              key="close"
              type="close-circle-o"
              className="fright fpointer font14 color-red"
              onClick={() => {
                this.setState({visiblePopoverKey: ''})
              }}
            />
          ]
        }
        placement="bottom"
        arrowPointAtCenter
        trigger="click"
        visible={visiblePopoverKey === 'monitorCondFilter'}
        onVisibleChange={_.noop}
        content={(
          <CommonDruidFilterPanel
            key="filters"
            className={'mw460 monitorCondFilter'}
            dimensionOptionFilter={isCharDimension}
            getPopupContainer={() => document.querySelector('.monitorCondFilter')}
            projectId={projectCurrent && projectCurrent.id}
            timePickerProps={{}}
            dataSourceId={projectCurrent.datasource_id}
            headerDomMapper={_.noop}
            filters={monitorCondFilters || []}
            onFiltersChange={nextFilters => {
              this.setState({monitorCondFilters: nextFilters}, this.reloadExceptionsDebounced)
            }}
          />
        )}
      >
        <Button
          className="mg2l iblock"
          onClick={() => {
            this.setState({
              visiblePopoverKey: visiblePopoverKey === 'monitorCondFilter' ? '' : 'monitorCondFilter'
            })
          }}
          {...props}
        >按产生异常当时的告警条件筛选{_.size(monitorCondFilters) ? `（${_.size(monitorCondFilters)}）` : null}</Button>
      </Popover>
    )
  }

  render() {
    let { loading, monitorAlarms, location } = this.props
    let specifyExceptionId = _.get(location, 'query.exceptionId')
    const {
      monitor_id, sources, timeRange, page, pageSize, total, filterByLevel, selectedRowKeys,
      savingExceptionIds
    } = this.state
    let savingExceptionIdsSet = new Set(savingExceptionIds)
    let tableColumns = this.genTableCols()

    const rowSelection = {
      selectedRowKeys,
      onChange: (selectedRowKeys, selectedRows) => {
        this.setState({selectedRowKeys})
      },
      getCheckboxProps: record => ({
        disabled: savingExceptionIdsSet.has(record.id)
      })
    }
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    return (
      <div className="height-100 bg-white">
        <Bread
          path={[{name: '监控告警-异常记录'}]}
        >
          <Link to="/console/monitor-alarms">
            <Button
            type="ghost"
            icon={<RollbackOutlined />}
            className="mg1r iblock"
            >返回告警列表</Button>
          </Link>
        </Bread>
        <div className="fix">
          <div className="mg3x mg2y">
            <div className="itblock mg1l">
              <span className="mg2r">异常检测时间</span>
              <DateRangePicker
                className="width250 mg2r"
                style={{marginBottom: '3px'}}
                alwaysShowRange
                hideCustomSelection
                dateType={relativeTime}
                dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
                onChange={this.onTimeChange}
                disabled={!!specifyExceptionId}
              />

              <span className="mg2r">告警级别</span>
              <Select
                dropdownMatchSelectWidth={false}
                className="mg2r width100"
                value={filterByLevel || ''}
                onChange={val => {
                  this.setState({filterByLevel: val}, () => {
                    this.reloadExceptions()
                  })
                }}
                disabled={!!specifyExceptionId}
              >
                <Option key="none" value="">全部</Option>

                {_.keys(MetricRulesAlarmLevelEnum).map(level => {
                  return <Option key={level} value={level}>{MetricRulesAlarmLevelTranslation[level]}</Option>
                })}
              </Select>

              <Select
                allowClear
                placeholder="全部告警"
                dropdownMatchSelectWidth={false}
                style={{ minWidth: 200 }}
                value={monitor_id || undefined}
                onChange={this.onChangeAlarms}
                disabled={!!specifyExceptionId}
                {...enableSelectSearch}
                onSearch={this.onSearchAlarmsByName}
              >
                <Option key="searchByName" value={`name:${_.startsWith(monitor_id, 'name:') ? monitor_id.substr(5) : ''}`}>
                  {_.startsWith(monitor_id, 'name:') && monitor_id.substr(5)
                    ? `模糊搜索：${monitor_id.substr(5)}`
                    : _.startsWith(monitor_id, 'name:') ? monitor_id.substr(5) : '可直接输入关键字进行模糊搜索'}
                </Option>
                {monitorAlarms.map(m => {
                  return <Option key={m.id} value={m.id}>{m.name}</Option>
                })}
              </Select>

              {this.renderMonitorConditionsFilter({disabled: !!specifyExceptionId})}
            </div>
            <span className="fright">
              <Button
                type="primary"
                onClick={() => this.reloadExceptions()}
              >刷新</Button>
              {!canHandleException ? null : this.renderBatchOpSelect()}
            </span>
          </div>
        </div>
        <div className="pd3x sugo-monitor-alarm overscroll-y" style={{height: 'calc(100% - 44px - 67px)'}}>
          <Table
            loading={loading}
            bordered
            rowSelection={canAccessExceptionListInMenu ? rowSelection : undefined}
            size="small"
            rowKey="id"
            columns={tableColumns}
            dataSource={sources}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: page => this.setState({ page }),
              showQuickJumper: true,
              showTotal: total => `共 ${total} 条`
            }}
          />
        </div>
        {this.renderForwardHandlingModal()}
        {this.renderDirectHandlingModal()}
        {this.renderIgnoringModal()}
        {this.renderHandleCompletedModal()}
      </div>
    );
  }
}
