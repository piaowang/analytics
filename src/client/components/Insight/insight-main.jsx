import React from 'react'
import Fetch from '../../common/fetch-final'
import { EditOutlined, FilterOutlined, InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Spin, Button, Tooltip, message, Popover } from 'antd'
import Bread from '../Common/bread'
import _ from 'lodash'
import { Link } from 'react-router'
import moment from 'moment'
import setStatePromiseDec from '../../common/set-state-promise'
import * as ls from '../../common/localstorage'
import UsergroupSelect from './insight-usergroup-select'
import InsightUsers from './insight-users'
import InsightEventCounts from './insight-event-count'
import InsightEvents from './insight-events'
import GroupForAllUsers from './group-for-all-user'
import { convertDateType, isRelative } from 'common/param-transform'
import { Auth, checkPermission } from '../../common/permission-control'
import { tryJsonParse } from '../../../common/sugo-utils'
import {DefaultDruidQueryCacheOpts, withExtraQuery} from '../../common/fetch-utils'

export const insghtLSId = 'insight_change_project'
function defaultTime () {
  let relativeTime = '-7 days'
  let [since, until] = convertDateType('-7 days')
  return {
    relativeTime,
    since,
    until
  }
}
const maxDurationInDays = 31
let canAdd = checkPermission('/app/usergroup/create')

@setStatePromiseDec
export default class Insight extends React.Component {

  static renderSettingGuide (project) {
    return (
      <div className="center-of-relative aligncenter">
        <img
          className="itblock"
          src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/ui-nothing.png`}
          alt="Error hint"
        />
        <p className="mg2y">
          要使用用户细查, 请到
          <Auth
            className="mg1x"
            auth="/console/project/datasource-settings"
            alt={<b>场景数据设置</b>}
          >
            <Link
              className="pointer bold mg1x"
              to={`/console/project/datasource-settings?id=${project && project.id}`}
            >场景数据设置</Link>
          </Auth>
          为此项目设定
          <b className="color-red mg1x" key={1}>用户ID</b>
        </p>
        <Link
          className="pointer bold"
          to={`/console/project/datasource-settings?id=${project && project.id}`}
        >
          <Button type="primary" className="width140">马上设置</Button>
        </Link>
      </div>
    )
  }

  constructor (props, context) {
    super(props, context)
    const pageSize = 100
    const defTime = defaultTime()
    this.users = new GroupForAllUsers().setPageSize(pageSize).setParams(defTime)
    this.state = {
      loadingEventCount: false,
      loadingEventList: false,
      loadingUser: false,
      loadingData: false,
      eventList: [],
      eventCountList: [],
      //event: {},
      usergroup: {},
      users: [],
      nomoreUsers: false,
      pageSize,
      pageIndex: 0,
      dimensions: [],
      eventDate: '',
      ...defTime,
      showPop: false,
      needSettingGuide: null
    }
  }

  componentWillMount () {
    this.getData()
  }

  componentWillReceiveProps (nextProps) {
    let { id, groupby, user, datetype } = nextProps.location.query
    let {
      usergroups,
      datasourceCurrent
    } = nextProps
    let nid = datasourceCurrent.id
    let tid = this.props.datasourceCurrent.id

    //切换项目
    if (
      tid &&
      nid !== tid
    ) {
      this.users = new GroupForAllUsers()
        .setDataSource(datasourceCurrent)
        .setParams(defaultTime())
      return this.pickDatasource(nextProps)
    }

    //查询特定用户id
    let { since, until, relativeTime } = defaultTime()
    if (datetype) {
      let queryDateType = tryJsonParse(decodeURI(datetype))
      relativeTime = isRelative(queryDateType) ? queryDateType : 'custom'
      let resdate = relativeTime === 'custom' ? queryDateType : convertDateType(relativeTime)
      since = resdate[0]
      until = resdate[1]
      this.users.setParams({ since, until, relativeTime })
    }

    let mod = this.users
      .setDataSource(datasourceCurrent)
      .getModel()

    // 所有用户
    if (
      id &&
      datasourceCurrent.id &&
      id === mod.id &&
      //usergroups.length &&
      !_.find(usergroups, { id })
    ) {
      if (!groupby) {
        groupby = _.get(datasourceCurrent, 'params.commonMetric[0]')
        if (!groupby) {
          return this.setState({ needSettingGuide: nextProps.projectCurrent })
        }
        this.users.setGroupBy(groupby)
      } else if (groupby !== mod.params.groupby) {
        this.users.setGroupBy(groupby)
      } else {
        return
      }

      return this.selectUsergroup(this.users.getModel(), user)
    }

    if (
      id &&
      datasourceCurrent.id &&
      id.indexOf('__temp') > -1 &&
      usergroups.length &&
      !_.find(usergroups, { id }) &&
      user &&
      groupby
    ) {
      let ug = {
        id,
        title: '临时分群',
        druid_datasource_id: datasourceCurrent.id,
        params: {
          groupby,
          total: 1,
          since,
          until,
          relativeTime
        }
      }

      this.props.setProp({
        type: 'set_usergroups',
        data: [
          ug,
          ...usergroups.filter(
            u => !u.id.includes('__temp')
          )
        ]
      })
      return this.selectUsergroup(ug, user)
    }

    //选择分群
    if (
      usergroups.length &&
      id &&
      id !== this.state.usergroup.id
    ) {
      let usergroup = _.find(usergroups, { id }) ||
        ls.get(id) ||
        usergroups.filter(
          n => n.druid_datasource_id === datasourceCurrent.id
        )[0]
      if (usergroup) {
        return this.selectUsergroup(usergroup)
      }
    }

    //id=''
    if (!id) {
      this.pickDatasource(nextProps)
    }

  }

  componentWillUnmount () {
    this.cleanUsergroup()
  }

  cleanUsergroup = () => {
    let usergroups = _.cloneDeep(this.props.usergroups)
    this.props.setProp(
      'set_usergroups',
      usergroups.filter(u => !u.id.includes('__temp'))
    )
  }

  getData = async () => {
    await this.props.getUsergroups()
  }

  pickDatasource = nextProps => {
    let { id } = nextProps.datasourceCurrent
    let nextUsergroup = this.users.getModel()
    if (nextUsergroup.id) {
      return this.selectUsergroup(nextUsergroup)
    }
    this.setState({
      needSettingGuide: null,
      usergroup: nextUsergroup
    }, () => {
      setTimeout(
        () => {
          this.props.changeUrl({
            id: nextUsergroup.id || '',
            datasource: id,
            groupby: nextUsergroup.params.groupby
          }, 'replace')
        }, 10
      )
    })
  }

  selectUsergroup = (usergroup, user) => {

    let { id, params: { groupby } } = usergroup
    let { location: { query }, datasourceCurrent } = this.props

    groupby = usergroup.params.groupby || _.get(datasourceCurrent, 'params.commonMetric[0]')

    let mod = this.users.getModel()
    if (id === mod.id && groupby !== mod.params.groupby) {
      this.users.setGroupBy(groupby)
    }

    let { usergroup: stateUsergroup } = this.state

    if (usergroup.druid_datasource_id !== stateUsergroup.druid_datasource_id) {
      this.getDimensions(usergroup.druid_datasource_id)
    }

    // 只是user发生了变化，直接查询user即可，不必再跳路由
    if (query && user && usergroup.id === query.id && user === query.user) {
      return this.setState({ usergroup }, () => setTimeout(this.getUsers, 20))
    }

    let { relativeTime, since, until } = usergroup.params
    let [from, to] = relativeTime === 'custom'
      ? [since, until]
      : convertDateType(relativeTime)

    this.props.changeUrl({
      id: usergroup.id,
      datasource: usergroup.druid_datasource_id,
      groupby,
      // 凡是选择了新的分群,全部设置用户为空
      user: _.isString(user) ? user : ''
    }, 'replace')

    this.setState({
      needSettingGuide: null,
      usergroup,
      pageIndex: 0,
      relativeTime,
      since: from,
      until: to
    }, () => {
      setTimeout(this.getUsers, 20)
    })

  }

  getUsers = async (pageIndex = 0, pageSize = this.state.pageSize) => {
    let { user } = this.props.location.query
    let { usergroup } = this.state
    let { dataConfig } = window.sugo
    // usergroup.params = JSON.parse(usergroup.params)
    let groupId = usergroup.params.md5 ? usergroup.params.md5 : 'usergroup_' + usergroup.id
    let query = {
      groupReadConfig: {
        pageIndex, // 页数
        pageSize //每页条数
      },
      dataConfig: {
        ...dataConfig,
        groupId // 用户分群redis key：groupId_1,
      }
    }
    this.setState({
      loadingUser: true
    })

    let res, total
    if (groupId.indexOf('usergroup___temp') > -1) {
      res = {
        ids: [user]
      }
    } else if (usergroup.id === this.users.getModel().id) {
      total = await this.users.getCount()

      if (usergroup.params.total !== total) {
        let next = { ...usergroup }
        next.params.total = total
        this.setState({ usergroup: next })
      }

      res = await this.users.next()
      res = { ids: res }
      this.users.setParams({ total })

    } else {
      res = await Fetch.get('/app/usergroup/info', { query })
    }

    this.setState({
      loadingUser: false
    })

    if (!res) return
    let users = res.ids.slice(0)
    let change = {
      nomoreUsers: users.length < pageSize
    }

    if (!users.length && !pageIndex) {
      return this.setState({
        eventCountList: [],
        eventList: [],
        users: []
      })
    }

    users = pageIndex
      ? _.uniq([...this.state.users, ...users])
      : users

    Object.assign(change, {
      users,
      pageIndex
    })

    this.setState(
      change,
      pageIndex
        ? _.noop
        : () => {
          if (!user && users[0]) {
            this.selectUser(users[0], 'replace')
          } else {
            this.getUserEventCount()
          }
        }
    )

  }

  selectUser = (user, action = 'push') => {
    this.props.changeUrl({
      user
    }, action)
    setTimeout(this.getUserEventCount, 20)
  }

  selectEventDate = eventDate => {
    this.setState({
      eventDate
    }, this.getEvents)
  }

  onChangeDate = ({
    dateType,
    dateRange: [since, until]
  }) => {
    let relativeTime = dateType
    let duration = moment.duration(moment(until).diff(moment(since))).asDays()
    if (duration > maxDurationInDays && dateType === 'custom') {
      message.error(`所选时间范围不能大于${maxDurationInDays}天,结束时间已自动切换为最大值`, 15)

      this.setState({
        showPop: true,
        since,
        until: moment(since).add(maxDurationInDays, 'days').format()
      })
      return
    }
    this.setState({
      relativeTime,
      since,
      until,
      showPop: false
    }, this.getUserEventCount)
  }

  getUserEventCount = async () => {
    let { user, groupby } = this.props.location.query
    if (!user) return
    await this.setStatePromise({ loadingEventCount: true })
    let {
      usergroup,
      since,
      until,
      relativeTime
    } = this.state

    let [from, to] = relativeTime === 'custom'
      ? [since, until]
      : convertDateType(relativeTime)

    let metric = '_tempMetric_0'
    let res = await Fetch.get(
      withExtraQuery('/app/slices/query-druid', DefaultDruidQueryCacheOpts),
      {
        druid_datasource_id: usergroup.druid_datasource_id,
        since: from,
        until: to,
        //timezone: 'Asia/Shanghai',
        dimensions: ['__time'],
        metrics: [],
        customMetrics: [{
          name: metric,
          formula: '$main.count()'
        }],
        dimensionExtraSettings: [{
          sortCol: '__time',
          sortDirect: 'desc',
          limit: 9999
        }],
        vizType: 'table',
        granularity: 'P1D',
        filters: [
          {
            eq: [user],
            col: groupby,
            type: 'string',
            op: 'in'
          }
        ],
        groupByAlgorithm: 'groupBy'
      }
    )
    await this.setStatePromise({ loadingEventCount: false })
    if (!res) return
    let arr = (_.get(res, '[0].resultSet') || []).filter(r => r[metric] > 0)
    if (!arr.length) {
      this.setState({
        eventList: [],
        eventCountList: []
      })
      return message.warn('这个用户在当前时间范围没有事件', 10)
    }

    let eventCountList = arr
      .sort((a, b) => {
        return a.__time > b.__time ? -1 : 1
      })
      .map(date => {
        return {
          name: moment(date.__time).format('MM-DD ddd'),
          data: moment(date.__time).format('YYYY-MM-DD'),
          value: date[metric]
        }
      })

    await this.setStatePromise({
      eventCountList
    })

    await this.setStatePromise({
      eventDate: eventCountList[0]
    })
    return this.getEvents()

  }

  getDimensions = async (id) => {
    this.setState({
      loadingData: true
    })
    let res = await Fetch.get(`/app/dimension/get/${id}`, {
      noauth: 1
    })
    await this.setStatePromise({
      loadingData: false
    })
    if (!res) return
    await this.setStatePromise({
      dimensions: res.data
    })
  }

  getEvents = async (selectLimit = 100) => {
    let { user, groupby } = this.props.location.query
    let {
      id: did,
      params: {
        isSDKProject
      }
    } = this.props.datasourceCurrent
    let {
      eventDate,
      dimensions
    } = this.state
    this.setStatePromise({
      loadingEventList: true
    })
    if (!dimensions.length) {
      await this.getDimensions()
      dimensions = this.state.dimensions
    }
    let date = eventDate.data
    let keys = dimensions.map(d => d.name).concat('__time')
    let q = {
      druid_datasource_id: did,
      since: moment(date).toISOString(),
      until: moment(date).add(1, 'days').add(-1, 'ms').toISOString(),
      granularity: 'P1D',
      filters: [{
        col: groupby,
        op: 'equal',
        eq: [user],
        type: 'string'
      }],
      select: ['*'],
      selectLimit,
      groupByAlgorithm: 'groupBy',
      selectOrderBy: '__time',
      selectOrderDirection: 'asc'
    }
    let res = await Fetch.get(withExtraQuery('/app/slices/query-druid', DefaultDruidQueryCacheOpts), q)

    this.setStatePromise({
      loadingEventList: false
    })
    if (!res) return

    let eventList = res.map(r => {
      return _.pick(r, keys)
    })
      .sort(
        isSDKProject
          ? (a, b) => {
            return a.event_time < b.event_time ? 1 : -1
          }
          : (a, b) => {
            return a.__time < b.__time ? 1 : -1
          }
      )

    await this.setStatePromise({
      eventList
    })

    return eventList

  }

  changeDate = eventDate => {
    this.setState({
      eventDate
    }, this.getEvents)
  }

  renderDateNav = () => {
    let { eventCountList, eventDate } = this.state
    let len = eventCountList.length
    let index = _.findIndex(eventCountList, e => e.data === eventDate.data)
    let prevDate = index ? eventCountList[index - 1] : null
    let nextDate = index === len - 1 ? null : eventCountList[index + 1]
    return (
      <span className="mg2l iblock">
        {
          prevDate
            ? (
              <Button
                onClick={() => this.changeDate(prevDate)}
                type="ghost"
                className="mg1r"
              >
              前一个日期
              </Button>
            )
            : null
        }
        {
          nextDate
            ? (
              <Button
                onClick={() => this.changeDate(nextDate)}
                type="ghost"
                className="mg1r"
              >下一个日期</Button>
            ) : null
        }
      </span>
    )
  }

  renderUserGroupEditButton = (usergroup) => {
    let { id } = this.props.location.query
    return (id && (id.indexOf('__temp') === -1 && id !== this.users.getModel().id)) // 如果[不是]自定义查询临时分群, 显示按钮
      ? <Auth auth="/app/usergroup/update">
      <Link to={`/console/usergroup/${usergroup.id}`}>
        <Button type="info" icon={<EditOutlined />}>编辑分群</Button>
      </Link>
    </Auth>
      : null
  }

  renderEmpty = () => {
    return this.props.loading
      ? null
      : (
        <div
          className="bordert dashed relative"
          style={{ height: 'calc(100vh - 80px - 49px)' }}
        >
          <div
            className="relative"
            style={{ height: 'calc(100vh - 100px)' }}
          >
            <div className="center-of-relative aligncenter">
              <InfoCircleOutlined className="font100 color-purple" />
              <br/>
              <br/>
              当前项目还没有用户分群, 请新建用户分群。
              <br/>
              <br/>
              <div className="height100 relative">
                {
                  canAdd
                    ? <Link to="/console/usergroup/new">
                      <Button type="primary">新建用户分群</Button>
                    </Link>
                    : null
                }
              </div>
            </div>
          </div>
        </div>
      );
  }

  renderBread = (usergroup) => {
    let help = (<div>
      <p>用户细查是与用户分群功能是紧密相关的，它</p>
      <p>可以进一步帮助您了解某个群体内的用户在您</p>
      <p>的产品内的行为轨迹，从而清晰地展现用户与</p>
      <p>产品的整个交互过程。</p>
    </div>)
    let extra = (
      <Popover content={help} trigger="hover" placement="bottomLeft">
        <QuestionCircleOutlined className="font14" />
      </Popover>
    )

    let {
      backToRefererTitle,
      backToRefererHint,
      refererLink
    } = usergroup.params || {}

    let funnelId = (usergroup.params || {}).funnelId
    return (
      <Bread
        path={[
          {
            name: '用户细查',
            link: '/console/insight'
          }
        ]}
        extra={extra}
      >
        {
          funnelId
            ? <Link to={`/console/funnel/${funnelId}`}>
            <Tooltip
              title="这个分群由漏斗流失分析创建，点击查看关联的漏斗"
              placement="bottomRight"
            >
              <Button
                type="ghost"
                icon={<FilterOutlined />}
                className="mg1r"
              >查看关联漏斗</Button>
            </Tooltip>
          </Link>
            : null
        }
        {
          backToRefererTitle
            ? (
            <Link to={refererLink}>
              <Tooltip
                
                  title={backToRefererHint}
                  placement="bottomRight"
                >
                  <Button type="ghost" icon={<FilterOutlined />}
                    className="mg1r"
                  >{backToRefererTitle}</Button>
                </Tooltip>
              </Link>
            )
            : null
        }
        {
          this.renderUserGroupEditButton(usergroup)
        }
      </Bread>
    )
  }

  render () {

    let {
      usergroups: usergroupsAll,
      datasourceList: datasources,
      loading: propLoading,
      changeUrl,
      loadingProject,
      datasourceCurrent: datasource,
      location: {
        query
      }
    } = this.props

    let {
      loadingEventCount,
      loadingEventList,
      eventList,
      loadingUser,
      eventCountList,
      //event,
      nomoreUsers,
      usergroup,
      loadingData,
      users,
      pageSize,
      pageIndex,
      dimensions,
      eventDate,
      relativeTime,
      since,
      until,
      needSettingGuide
    } = this.state

    if (needSettingGuide !== null) {
      return Insight.renderSettingGuide(needSettingGuide)
    }

    let loading = loadingData || loadingProject || propLoading
    let { user, groupby } = this.props.location.query
    let usersMod = this.users.getModel()

    let usergroups = [usersMod].concat(usergroupsAll.filter(
      u => u.druid_datasource_id === datasource.id
    ))
    if (
      !usergroups.length &&
      !ls.get(query.id)
    ) {
      return this.renderEmpty()
    }
    let dimensionTree = dimensions.reduce((prev, dim) => {
      prev[dim.name] = dim.title || dim.name
      return prev
    }, {})

    let dimension = _.find(dimensions, { name: groupby }) || { name: groupby }
    let groupbyTitle = dimension.title || dimension.name
    let style = { height: window.innerHeight - 161 }
    let groupByList = (_.get(datasource, 'params.commonMetric') || []).map(name => {
      const dim = _.find(dimensions, { name }) || {}
      return {
        title: dim.title || dim.name,
        value: name,
        ownGroup: usersMod.id
      }
    })
    let props1 = {
      usergroups,
      usergroup,
      datasource,
      query,
      onChange: this.selectUsergroup,
      changeUrl,
      datasources,
      groupByList,
      groupbyTitle,
      user
    }

    let props2 = {
      users,
      changeUrl,
      user,
      onChange: this.selectUser,
      usergroup,
      datasource,
      datasources,
      loading: loadingUser,
      groupbyTitle,
      pageSize,
      pageIndex,
      nomoreUsers,
      getUsers: this.getUsers,
      style,
      dimensions,
      relativeTime,
      dimensionTree,
      since,
      until,
      loadingEventCount,
      loadingEventList
    }

    let props3 = {
      eventDate,
      eventCountList,
      onChange: this.selectEventDate,
      loading: loadingEventCount,
      groupbyTitle,
      user,
      relativeTime,
      since,
      until,
      onChangeDate: this.onChangeDate,
      style,
      showPop: this.state.showPop
    }

    let props4 = {
      eventDate,
      eventList,
      query,
      loading: loadingEventList,
      user,
      dimensionTree,
      dimensions,
      datasource,
      getEvents: this.getEvents,
      groupbyTitle,
      style,
      dateNav: this.renderDateNav(),
      loadingEventCount
    }

    return (
      <div className="height-100 insight-main">
        {this.renderBread(usergroup)}
        <Spin spinning={loading} style={style}>
          <div className="scroll-content">
            <div id="insight">
              <div className="pd2y pd2x insight-top-bar bg-grey-f7 bordert">
                <UsergroupSelect
                  {...props1}
                />
              </div>
              <div
                className="insight-wrapper relative font14"
                style={style}
              >
                <InsightUsers
                  {...props2}
                />
                <InsightEventCounts
                  {...props3}
                />
                <InsightEvents
                  {...props4}
                />
              </div>
            </div>
          </div>
        </Spin>
      </div>
    )
  }
}
