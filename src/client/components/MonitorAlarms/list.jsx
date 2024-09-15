import React from 'react'
import { PlusCircleOutlined } from '@ant-design/icons'
import { Button, Table, Tooltip, Popconfirm, Input, Popover } from 'antd'
import Bread from '../Common/bread'
import { Link } from 'react-router'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import smartSearch from '../../../common/smart-search'
import HoverHelp from '../Common/hover-help'
import helpLinkMap from 'common/help-link-map'
import Icon from '../Common/sugo-icon'
import moment from 'moment'
import _ from 'lodash'
import classnames from 'classnames'
import './style.styl'
import { Auth, checkPermission } from '../../common/permission-control'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import { isCharDimension } from '../../../common/druid-column-type'
import { genMonitorConditionFilterPredicate } from '../../../common/monitorHelper'
import { Anchor } from '../Common/anchor-custom'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/monitor-alarms']

const canUpdateMonitorAlarm = checkPermission('put:/app/monitor-alarms/update/:id')
const canDeleteMonitorAlarm = checkPermission('delete:/app/monitor-alarms/remove/:id')

let canAccessExceptionListInMenu = _(window.sugo.menus).some(m => _.some(m.children, sm => sm.title === '监控告警' && sm.children))

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

const iconSty = {
  verticalAlign: 'text-bottom'
}

/**
 * 监控告警列表
 */
@connect(mapStateToProps, mapDispatchToProps)
export default class MonitorAlarms extends React.Component {
  state = {
    search: '',
    visiblePopoverKey: '',
    monitorCondFilters: []
  }

  isInitData = false

  componentWillMount() {
    const { projectCurrent } = this.props
    if (!this.isInitData && !_.isEmpty(projectCurrent)) {
      this.initData(projectCurrent)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.projectCurrent, this.props.projectCurrent)) {
      this.initData(nextProps.projectCurrent)
      this.setState({ monitorCondFilters: [] })
    }
  }

  initData = async projectCurrent => {
    this.isInitData = true
    const { getMonitorAlarms } = this.props
    getMonitorAlarms(null, projectCurrent.id)
  }

  modifyStatus = record => {
    const { updateMonitorAlarms } = this.props
    let update = { ...record }
    update.status = record.status ? 0 : 1
    // 启动监控告警任务时重置参数
    if (update.status) {
      update.check_counter = 0
      update.prev_monitor_result = null
      update.prev_monitor_time = null
    }
    updateMonitorAlarms(record.id, update, true)
  }

  deleteMonitor(id) {
    this.props.delMonitorAlarms(id)
  }

  renderMonitorConditionsFilter = () => {
    let { projectCurrent } = this.props
    let { visiblePopoverKey, monitorCondFilters } = this.state
    return (
      <Popover
        title={[
          <span key='title' className='font14 mg2r'>
            按告警条件筛选
          </span>,
          <Icon
            key='close'
            type='close-circle-o'
            className='fright fpointer font14 color-red'
            onClick={() => {
              this.setState({ visiblePopoverKey: '' })
            }}
          />
        ]}
        placement='bottom'
        arrowPointAtCenter
        trigger='click'
        visible={visiblePopoverKey === 'monitorCondFilter'}
        onVisibleChange={_.noop}
        content={
          <CommonDruidFilterPanel
            key='filters'
            className={'mw460 monitorCondFilter'}
            dimensionOptionFilter={isCharDimension}
            getPopupContainer={() => document.querySelector('.monitorCondFilter')}
            projectId={projectCurrent && projectCurrent.id}
            timePickerProps={{}}
            dataSourceId={projectCurrent.datasource_id}
            headerDomMapper={_.noop}
            filters={monitorCondFilters || []}
            onFiltersChange={nextFilters => {
              this.setState({ monitorCondFilters: nextFilters })
            }}
          />
        }
      >
        <Button
          className='mg2r'
          onClick={() => {
            this.setState({
              visiblePopoverKey: visiblePopoverKey === 'monitorCondFilter' ? '' : 'monitorCondFilter'
            })
          }}
        >
          按告警条件筛选{_.size(monitorCondFilters) ? `（${_.size(monitorCondFilters)}）` : null}
        </Button>
      </Popover>
    )
  }

  render() {
    let { monitorAlarms, loading, projectCurrent } = this.props
    let { search, monitorCondFilters } = this.state
    let tableColumns = [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        className: 'aligncenter',
        sorter: (a, b) => (a.name > b.name ? 1 : -1)
      },
      {
        title: '告警状态',
        key: 'status',
        dataIndex: 'status',
        className: 'aligncenter',
        render: (status, record) => {
          const state = status === 1 ? '监控中' : '已暂停'
          const title = status === 1 ? '暂停此监控告警' : '恢复此监控告警'
          return (
            <span className='inline width60 alignleft'>
              <span className={classnames('mg1l iblock', status ? 'color-green' : 'color-grey')}>{state}</span>
              <Popconfirm
                title={
                  <div>
                    <p>{`是否要是否要${title}`}</p>
                    {status !== 1 ? <p className='color-red'>注意：此操作会重置异常次数为零。</p> : null}
                  </div>
                }
                placement='rightBottom'
                onConfirm={() => this.modifyStatus(record)}
              >
                <Tooltip title={title}>
                  <Icon type={status ? 'sugo-pause' : 'sugo-play'} className='color-grey pointer font14 mg1r iblock proj-control-icon hover-color-main' />
                </Tooltip>
              </Popconfirm>
            </span>
          )
        },
        sorter: (a, b) => (a.status > b.status ? 1 : -1)
      },
      {
        title: '检测频率',
        dataIndex: 'time_rules',
        className: 'aligncenter',
        render: time_rules => {
          return (
            <div className='relative'>
              每隔{time_rules.time}
              {time_rules.unit === 'minutes' ? '分钟' : '小时'}
            </div>
          )
        },
        sorter: (a, b) => (a.druid_datasource_id > b.slice_status_dict ? 1 : -1)
      },
      {
        title: '上次检测时间',
        width: 130,
        dataIndex: 'prev_monitor_time',
        className: 'aligncenter',
        key: 'prev_monitor_time',
        render: val => {
          if (!val) return null
          return moment(val).format('YYYY-MM-DD HH:mm')
        },
        sorter: (a, b) => (a.prev_monitor_time > b.prev_monitor_time ? 1 : -1)
      },
      {
        title: '告警创建时间',
        width: 130,
        dataIndex: 'created_at',
        className: 'aligncenter',
        key: 'created_at',
        render: val => {
          if (!val) return null
          return moment(val).format('YYYY-MM-DD HH:mm')
        },
        sorter: (a, b) => (moment(a.created_at).valueOf() > moment(b.created_at).valueOf() ? 1 : -1)
      },
      {
        title: '上次检测结果',
        dataIndex: 'prev_monitor_result',
        className: 'aligncenter',
        key: 'prev_monitor_result',
        render: val => {
          if (val === null) return null
          return val === 1 ? '正常' : '异常'
        },
        sorter: (a, b) => (a.prev_monitor_result > b.prev_monitor_result ? 1 : -1)
      },
      {
        title: '异常次数',
        dataIndex: 'check_counter',
        className: 'aligncenter',
        key: 'check_counter',
        render: val => {
          return (val === null ? 0 : val) + '次'
        },
        sorter: (a, b) => (a.check_counter > b.check_counter ? 1 : -1)
      },
      {
        title: '操作',
        key: 'op',
        className: 'aligncenter',
        render: (text, obj) => {
          return (
            <div className='aligncenter'>
              {!canUpdateMonitorAlarm ? null : (
                <Tooltip title='编辑项目' placement='left'>
                  <Link to={`/console/monitor-alarms/update/${obj.id}`}>
                    <Icon type='edit' className='font16 color-grey pointer' style={iconSty} />
                  </Link>
                </Tooltip>
              )}
              {!canDeleteMonitorAlarm ? null : (
                <Popconfirm
                  title={
                    <div>
                      <p>{`确定删除监控 "${obj.name}" 吗？`}</p>
                      <p className='color-red'>注意：与监控关联的异常记录都会被删除。</p>
                    </div>
                  }
                  placement='topLeft'
                  onConfirm={() => this.deleteMonitor(obj.id)}
                >
                  <Tooltip title='删除监控' placement='right'>
                    <Icon type='close-circle-o' className='mg2x font16 color-grey pointer' style={iconSty} />
                  </Tooltip>
                </Popconfirm>
              )}
            </div>
          )
        }
      }
    ]
    let sources = monitorAlarms ? monitorAlarms.filter(d => d.project_id === projectCurrent.id && (!search || smartSearch(search, d.name))) : []

    if (!_.isEmpty(monitorCondFilters)) {
      sources = sources.filter(genMonitorConditionFilterPredicate(monitorCondFilters, m => _.get(m, 'query_params.filters')))
    }
    return (
      <div className='height-100 bg-white'>
        <Bread
          path={[{ name: '配置告警策略' }]}
          extra={
            <HoverHelp
              content={
                <p>
                  指的是通过设置监控条件，当触发监控条件后，系统就会自动发送短信和邮件给对应的接收人，
                  <br />
                  完成一次系统化的监控告警通知，让监控信息可以第一时间触达相关被通知的人。
                  <br />
                  <Anchor href={helpLink} target='_blank' className='pointer'>
                    <Icon type='export' /> 查看帮助文档
                  </Anchor>
                </p>
              }
              type='no'
              className='font14 mg1l color-grey'
              title='监控告警分析说明'
              placement='topRight'
              link={helpLink}
              arrowPointAtCenter
            />
          }
        >
          <Auth auth='post:/app/monitor-alarms/create'>
            <Link to='/console/monitor-alarms/create'>
              <Button type='primary' icon={<PlusCircleOutlined />}>
                新建告警策略
              </Button>
            </Link>
          </Auth>
        </Bread>
        <div className='fix'>
          <div className='pd3x fleft pd2y'>
            <div className='itblock mg1l'>
              <Input className='mg2r width250' placeholder='请输入搜索的监控告警名称' onChange={e => this.setState({ search: e.target.value })} />
              {canAccessExceptionListInMenu ? null : (
                <Link to='/console/monitor-alarms/exceptions/all'>
                  <Button type='primary' className='mg2r'>
                    查看异常告警记录
                  </Button>
                </Link>
              )}
              <Button className='mg2r' onClick={() => this.initData(projectCurrent)}>
                刷新
              </Button>
              {this.renderMonitorConditionsFilter()}
            </div>
          </div>
        </div>
        <div className='pd3x sugo-monitor-alarm overscroll-y' style={{ height: 'calc(100% - 44px - 67px)' }}>
          <Table
            loading={loading}
            bordered
            size='small'
            rowKey='id'
            columns={tableColumns}
            dataSource={sources}
            pagination={{
              total: sources.length,
              showSizeChanger: true,
              defaultPageSize: 30
            }}
          />
        </div>
      </div>
    )
  }
}
