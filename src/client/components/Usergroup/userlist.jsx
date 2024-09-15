import React from 'react'
import _ from 'lodash'
import { DownloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Input, message, Popover, Select, Table, Tabs } from 'antd'
import Bread from '../Common/bread'
import { withUserGroupsDec } from '../Fetcher/data-source-compare-user-group-fetcher'
import Link from '../Common/link-nojam'
import * as d3 from 'd3'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import { browserHistory } from 'react-router'
import UsergroupFiltersPreview from './ug-filters-preview'
import { withDbDims } from '../Fetcher/data-source-dimensions-fetcher'
import { checkPermission, PermissionLink } from '../../common/permission-control'
import { withSizeProvider } from '../Common/size-provider'
import { exportFile, groupBy, immutateUpdate, insert, isDiffByPath } from '../../../common/sugo-utils'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import moment from 'moment'
import { defaultFormat } from '../../../common/param-transform'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import LitePopInput from '../Common/lite-pop-input'
import UserGroupUserFetcher from '../Fetcher/usergroup-user-fetcher'
import * as ls from '../../common/localstorage'
import FetchFinal from '../../common/fetch-final'
import smartSearch from '../../../common/smart-search'
import { withUserGroupLookupsDec } from '../Fetcher/usergroup-lookups-fetcher'
import Timer from '../Common/timer'
import withAutoFocus from '../Common/auto-focus'
import { getUserGroupReadyRemainTimeInSeconds, isUserGroupCanNotEdit, rebuildUserGroupMeasureIfNeeded } from '../../common/usergroup-helper'
import classNames from 'classnames'
import { UserGroupBuildInTagEnum } from '../../../common/constants'
import AsyncTaskRunner from '../Common/async-task-runner'
import { doQuerySliceData } from '../../common/slice-data-transform'
import { Anchor } from '../Common/anchor-custom'

const canEditUg = checkPermission('post:/app/usergroup/update')
const canInspectDetails = checkPermission('get:/console/inspect-user/:id')
const canDownloadUserlist = checkPermission('get:/app/usergroup/:id/users/download')

const { cutvUserListDiyDimName, cutvUserListDiyDemandDimName } = window.sugo
let diyDimKeys = Object.keys(cutvUserListDiyDimName)
let DIYDIM = []
diyDimKeys.map(i => {
  DIYDIM.push({
    title: cutvUserListDiyDimName[i],
    dimName: i
  })
})

const DIYDIMNAME = DIYDIM.map(i => i.dimName)

const InputWithAutoFocus = withAutoFocus(Input)

let percentFormat = d3.format('.2%')
let defaultDateformat = defaultFormat()

const TABLE_PAGE_SIZE = 10

export const genTableMetrics = ({ eventNameDimName, durationDimName, eventTimeDimName }) => {
  let d30Before = moment().add(-30, 'day').startOf('day').toISOString()
  return [
    eventNameDimName &&
      eventTimeDimName && {
        name: 'vv',
        formula: `$main.filter('${d30Before}' <= $${eventTimeDimName}).filter($${eventNameDimName} == '浏览').count()`,
        title: '最近30天浏览次数'
      },
    durationDimName &&
      eventTimeDimName && {
        name: 'durationSum',
        formula: `$main.filter('${d30Before}' <= $${eventTimeDimName}).sum($${durationDimName})`,
        title: '最近30天访问时长',
        formatter: metricValueFormatterFactory('duration-complete')
      },
    eventTimeDimName && {
      name: 'maxTime',
      formula: `$main.max($${eventTimeDimName})`,
      title: '最近一次访问时间',
      formatter: val => moment(val).format(defaultDateformat)
    }
  ].filter(_.identity)
}

@withUserGroupLookupsDec(({ datasourceCurrent }) => ({
  dataSourceId: datasourceCurrent && datasourceCurrent.id
}))
@withDbDims(({ datasourceCurrent }) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true
  }
})
@withUserGroupsDec(({ datasourceCurrent, params }) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  let ugId = params.ugId
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    cleanDataWhenFetching: true,
    onData: ugs => {
      if (!_.startsWith(ugId, 'temp_') && !_.some(ugs.result, ug => ug.id === ugId)) {
        browserHistory.push('/console/usergroup/all/users/' + _.get(location, 'search', ''))
      }
    }
  }
})
export default class UserList extends React.Component {
  state = {
    totalUserCount: null,
    userIdDimNameOverwrite: null,
    searchForUserId: null,
    loadingCsvData: false,
    visiblePopoverKey: null,
    tempUserGroupOverwrite: {},
    userListLoaded: [],
    tablePageIdx: 0
  }

  componentWillReceiveProps(nextProps) {
    let pId = _.get(this.props.projectCurrent, 'id')
    let nextpId = _.get(nextProps.projectCurrent, 'id')
    if (pId !== nextpId) {
      if (!pId) {
        this.setState({ totalUserCount: null })
      } else {
        browserHistory.push('/console/usergroup')
      }
    } else if (isDiffByPath(this.props, nextProps, 'params.ugId')) {
      this.setState({ searchForUserId: null, userListLoaded: [], tablePageIdx: 0 })
    }
  }

  renderPopupSavePanelForm = ug => {
    let { addUserGroup, reloadUserGroups, getUsergroups } = this.props
    let { title, description } = this.state.tempUserGroupOverwrite || {}
    return (
      <div>
        <div className='pd1b'>
          <span className='block mg1b'>用户群名称:</span>
          <InputWithAutoFocus
            value={title === undefined ? ug.title : title}
            className='block width-100'
            onChange={e => {
              this.setState({ tempUserGroupOverwrite: { title: e.target.value, description } })
            }}
          />
        </div>
        <div className='pd1b'>
          <span className='block mg1b'>用户群备注:</span>
          <Input
            value={description === undefined ? ug.description : description}
            className='block width-100'
            onChange={e => {
              this.setState({ tempUserGroupOverwrite: { title, description: e.target.value } })
            }}
          />
        </div>
        <Button
          type='primary'
          onClick={async () => {
            let ugPreCreate = _.defaultsDeep({}, this.state.tempUserGroupOverwrite, ug)
            // 如果丢弃过 measure 则重建
            let ugRebuild = rebuildUserGroupMeasureIfNeeded(ugPreCreate)

            let ugAddedTag = immutateUpdate(ugRebuild, 'tags', () => [UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup])
            let res = await addUserGroup(ugAddedTag)
            if (res && res.result) {
              message.success('保存用户群成功')
              this.setState({ visiblePopoverKey: null, tempUserGroupOverwrite: {} })
              await reloadUserGroups()

              await getUsergroups() // redux 状态更新
              browserHistory.push(`/console/usergroup/${res.result.id}/users`)
            }
          }}
          icon={<SaveOutlined />}
          className='width-100 mg2t'
        >
          保存
        </Button>
      </div>
    )
  }

  renderPopupSavePanel = ug => {
    return (
      <div className='width300'>
        <Tabs defaultActiveKey='save-as'>
          <Tabs.TabPane tab='另存为' key='save-as'>
            {this.renderPopupSavePanelForm(ug)}
          </Tabs.TabPane>
        </Tabs>
      </div>
    )
  }

  renderGroupsSelector({ ug, userIdDimName }) {
    let { dataSourceCompareUserGroups, datasourceCurrent } = this.props
    let userGroups = dataSourceCompareUserGroups.filter(ug => !_.get(ug, 'params.openWith'))
    let { visiblePopoverKey } = this.state
    let ugRemark = _.get(ug, 'description')
    return (
      <div style={{ padding: '10px 10px 0 10px' }}>
        <div className='borderb pd3x pd2b bg-white corner' style={{ padding: '10px' }}>
          <strong className='pd2r'>用户群：</strong>
          <Select
            value={(ug && ug.id) || 'all'}
            className='width250 mg2r'
            onChange={segment_id => {
              browserHistory.push(`/console/usergroup/${segment_id}/users`)
            }}
            {...enableSelectSearch}
            dropdownMatchSelectWidth={false}
          >
            <Select.Option value='all' key='all'>
              全部访问用户
            </Select.Option>
            {_.compact([ug && _.startsWith(ug.id, 'temp_') ? ug : null, ...userGroups]).map(seg => {
              let title = seg.title
              if (_.startsWith(seg.id, 'temp_')) {
                if (_.get(seg, 'params.backToRefererTitle') === '查看关联路径分析') {
                  title = '临时用户群：路径分析'
                } else if (_.get(seg, 'params.funnelId')) {
                  title = '临时用户群：漏斗分析'
                }
              }
              return (
                <Select.Option value={seg.id} key={seg.id}>
                  {title}
                </Select.Option>
              )
            })}
          </Select>

          {!ugRemark ? null : <span className='color-grey mg2r'>备注：{ugRemark}</span>}
          {!DIYDIMNAME.includes(userIdDimName) ? this.renderUserCount({ ug, userIdDimName }) : this.renderUserCountWithDiyDim({ ug, userIdDimName: cutvUserListDiyDemandDimName })}

          <div className='fright pd1r'>
            {ug && _.startsWith(ug.id, 'temp_') ? (
              <Popover
                placement='bottom'
                content={this.renderPopupSavePanel(ug)}
                trigger='click'
                visible={visiblePopoverKey === 'showSaveUserGroupPopover'}
                onVisibleChange={isVisible => {
                  this.setState({ visiblePopoverKey: isVisible && 'showSaveUserGroupPopover' })
                }}
              >
                <Button icon={<SaveOutlined />} type='success'>
                  保存为用户群
                </Button>
              </Popover>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  renderUserCount({ ug, userIdDimName }) {
    let { datasourceCurrent } = this.props
    let dsId = _.get(datasourceCurrent, 'id') || ''

    let ugId = (ug && ug.id) || 'all'
    return (
      <DruidDataFetcher
        dataSourceId={dsId}
        doFetch={!!(dsId && userIdDimName)}
        customMetrics={[{ name: 'totalUserCount', formula: `$main.countDistinct($${userIdDimName}, 'sketch', 6)` }]}
        onData={data => {
          let totalUserCount = _.get(data, '[0].totalUserCount')
          this.setState({ totalUserCount })
        }}
      >
        {({ total }) => {
          let { totalUserCount = 0 } = total || {}
          let ugPreComputedValue = (ugId === 'all' ? totalUserCount : _.get(ug, 'params.total')) || 0
          return (
            <div className='iblock'>
              {totalUserCount < 1 ? null : (
                <span className='color-purple'>
                  共 {ugPreComputedValue} 人，占总人数 {percentFormat(Math.min(1, ugPreComputedValue / totalUserCount))}
                </span>
              )}
            </div>
          )
        }}
      </DruidDataFetcher>
    )
  }

  renderUserCountWithDiyDim({ ug, userIdDimName }) {
    let { datasourceCurrent } = this.props
    let dsId = _.get(datasourceCurrent, 'id') || ''

    let ugId = (ug && ug.id) || 'all'
    return (
      <DruidDataFetcher
        dataSourceId={dsId}
        doFetch={!!(dsId && userIdDimName)}
        customMetrics={[{ name: 'totalUserCount', formula: `$main.countDistinct($${userIdDimName}, 'sketch', 6)` }]}
        onData={data => {
          let totalUserCount = _.get(data, '[0].totalUserCount')
          this.setState({ totalUserCount })
        }}
      >
        {({ total }) => {
          let { totalUserCount = 0 } = total || {}
          let ugPreComputedValue = (ugId === 'all' ? totalUserCount : _.get(ug, 'params.total')) || 0
          return (
            <div className='iblock'>
              {totalUserCount < 1 ? null : (
                <span className='color-purple'>
                  共 {ugPreComputedValue} 人，占总人数 {percentFormat(Math.min(1, ugPreComputedValue / totalUserCount))}
                </span>
              )}
            </div>
          )
        }}
      </DruidDataFetcher>
    )
  }

  mergeMultiArea = (userList, userIdDimName) => {
    let dict = groupBy(
      userList,
      ev => ev[userIdDimName],
      evs => {
        // 合并 最近30天访问次数 vv，最近30天访问时长 durationSum 和 最近一次访问时间 maxTime
        if (evs.length === 1) {
          return evs[0]
        } else {
          let mostRecentlyEvent = _.maxBy(evs, ev => moment(ev.maxTime).valueOf())
          return {
            ...mostRecentlyEvent,
            vv: _.sumBy(evs, 'vv'),
            durationSum: _.sumBy(evs, 'durationSum')
          }
        }
      }
    )
    return _.values(dict)
  }

  async loadUserList(userGroup, userIdDimName, limit = 500) {
    if (DIYDIMNAME.includes(userIdDimName)) return await this.loadUserListWithDiyDim(userGroup, userIdDimName)

    let { datasourceCurrent, dimNameDict } = this.props
    let { searchForUserId } = this.state
    let dsId = _.get(datasourceCurrent, 'id') || ''

    if (userGroup) {
      // 读取临时分群用户
      let ugTemp = _.startsWith(userGroup.id, 'temp_') ? userGroup : immutateUpdate(userGroup, 'params.md5', () => `usergroup_${userGroup.id}`)
      let res = await FetchFinal.get('/app/usergroup/info', {
        query: UserGroupUserFetcher.userGroupToQuery({ userGroup: ugTemp, pageIndex: 0, pageSize: limit })
      })
      let { count, ids, totalCount } = res || {}
      if (searchForUserId) {
        ids = ids.filter(id => smartSearch(searchForUserId, id))
      }
      return (ids || []).map(id => ({ [userIdDimName]: id }))
    } else {
      // 全部用户

      if (!(userIdDimName in dimNameDict)) {
        return []
      }
      let res = await doQuerySliceData({
        druid_datasource_id: dsId,
        params: {
          filters: [searchForUserId && { col: userIdDimName, op: 'contains', eq: [searchForUserId], ignoreCase: true }].filter(_.identity),
          dimensions: [userIdDimName],
          dimensionExtraSettingDict: { [userIdDimName]: { limit: limit } },
          groupByAlgorithm: 'topN'
        }
      })
      return _.get(res, [0, 'resultSet']) || []
    }
  }

  async loadUserListWithDiyDim(userGroup, userIdDimName, limit = 500) {
    let { datasourceCurrent, dimNameDict } = this.props
    let { searchForUserId } = this.state
    if (!searchForUserId) return []

    let demandDimName = cutvUserListDiyDemandDimName

    if (userGroup) {
      let ugTemp = _.startsWith(userGroup.id, 'temp_') ? userGroup : immutateUpdate(userGroup, 'params.md5', () => `usergroup_${userGroup.id}`)
      let res = await FetchFinal.get('/app/usergroup/info', {
        query: UserGroupUserFetcher.userGroupToQuery({ userGroup: ugTemp, pageIndex: 0, pageSize: limit })
      })
      let res0 = await FetchFinal.get('/app/usergroup/get-user-diycol', { userIdDimName, filter: searchForUserId, demandDimName, limit })
      res0 = _.get(res0, 'result', [])
      if (_.isEmpty(res0)) return []
      res0 = res0.map(i => i[demandDimName])
      let { count, ids, totalCount } = res || {}
      ids = ids.filter(id => res0.includes(id))
      return (ids || []).map(id => ({ [userIdDimName]: id }))
    }

    let res = await FetchFinal.get('/app/usergroup/get-user-diycol', { userIdDimName, filter: searchForUserId, demandDimName, limit })
    res = _.get(res, 'result', [])
    if (_.isEmpty(res)) return []
    userIdDimName = demandDimName

    if (!(userIdDimName in dimNameDict)) {
      return []
    }

    let dsId = _.get(datasourceCurrent, 'id') || ''

    let druidRes = await doQuerySliceData({
      druid_datasource_id: dsId,
      params: {
        filters: [
          {
            col: userIdDimName,
            op: 'in',
            eq: res.map(i => i[userIdDimName])
          }
        ],
        dimensions: [userIdDimName],
        dimensionExtraSettingDict: { [userIdDimName]: { limit: limit } },
        groupByAlgorithm: 'topN'
      }
    })
    return _.get(druidRes, [0, 'resultSet']) || []
  }

  loadTableData = async ({ userGroup, userIdDimName, tableMetrics }) => {
    let { datasourceCurrent, dimNameDict } = this.props
    let { totalUserCount, tablePageIdx, userListLoaded, searchForUserId } = this.state
    let dsId = _.get(datasourceCurrent, 'id') || ''
    let userList = userListLoaded

    // 如果仅仅是页面变化，则不需要重新查询 userList
    if (_.isEmpty(userList)) {
      userList = await this.loadUserList(userGroup, userIdDimName, searchForUserId ? 1000 : 500)
      this.setState({ userListLoaded: userList })
    }
    if (_.isEmpty(userList)) {
      return []
    }
    if (DIYDIMNAME.includes(userIdDimName)) {
      userIdDimName = cutvUserListDiyDemandDimName
    }
    let res = await doQuerySliceData({
      druid_datasource_id: dsId,
      params: {
        filters: [
          !_.isEmpty(userList) && {
            col: userIdDimName,
            op: 'in',
            eq: _(userList)
              .drop(TABLE_PAGE_SIZE * tablePageIdx)
              .take(TABLE_PAGE_SIZE)
              .map(d => d[userIdDimName])
              .value()
          }
        ].filter(_.identity),
        dimensions: [userIdDimName, 'sugo_nation', 'sugo_province', 'sugo_city'].filter(dimName => dimName in dimNameDict),
        splitType: 'groupBy',
        dimensionExtraSettingDict: { [userIdDimName]: { limit: 9999 } },
        customMetrics: tableMetrics,
        withGlobalMetrics: false
      }
    })
    return _.get(res, [0, 'resultSet']) || []
  }

  renderUserList = withSizeProvider(({ ug, spWidth, userIdDimName }) => {
    let { datasourceCurrent, dimNameDict } = this.props
    // 全部用户群时，如果有多个 id 列，则允许用户选择
    if (!ug && !userIdDimName) {
      return (
        <div className='color-grey pd3 aligncenter'>
          此项目尚未设置用户ID维度，请前往
          <PermissionLink to={'/console/project/datasource-settings'}>场景数据设置</PermissionLink>
          进行设置
        </div>
      )
    }
    let { totalUserCount, tablePageIdx, userListLoaded: userList, searchForUserId } = this.state
    let tableMetrics = genTableMetrics({
      durationDimName: 'duration' in dimNameDict ? 'duration' : null,
      eventNameDimName: 'event_name' in dimNameDict ? 'event_name' : null,
      eventTimeDimName: 'event_time' in dimNameDict ? 'event_time' : '__time'
    })
    return (
      <AsyncTaskRunner
        args={[{ userGroup: ug, userIdDimName, tableMetrics }, tablePageIdx, searchForUserId, dimNameDict]}
        doRun={!!(datasourceCurrent && datasourceCurrent.id && userIdDimName)}
        task={this.loadTableData}
      >
        {({ result: finalUserList, isLoading: isFetching }) => {
          if (DIYDIMNAME.includes(userIdDimName)) {
            userIdDimName = cutvUserListDiyDemandDimName
          }
          let precomputedVal = (ug && _.get(ug, 'params.total')) || totalUserCount
          let cols = this.genColumns(ug, userIdDimName, tableMetrics)
          let contentWidth = _.sum(cols.map(col => col.width))

          // 前端去重
          let rowsOfThisPage = _.isEmpty(userList) ? [] : (finalUserList || []).filter(d => d[userIdDimName])
          let tableData = this.mergeMultiArea(rowsOfThisPage, userIdDimName)
          let total = _.size(userList)
          return (
            <div>
              <Table
                ref={ref => (this._userListTable = ref)}
                bordered
                rowKey={userIdDimName}
                loading={isFetching}
                className='always-display-scrollbar-horizontal-all'
                dataSource={tableData}
                scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth }}
                columns={contentWidth < spWidth ? cols.map(col => _.omit(col, 'fixed')) : cols}
                pagination={{
                  current: tablePageIdx + 1,
                  total,
                  pageSize: TABLE_PAGE_SIZE,
                  onChange: page => {
                    this.setState({
                      tablePageIdx: page - 1
                    })
                  },
                  showTotal: total => {
                    if (searchForUserId) {
                      if (precomputedVal > 1000 && total === 1000) {
                        return `共 ${precomputedVal} 条，搜索结果为其中 ${total} 条，达到加载上限`
                      }
                      return `共 ${precomputedVal} 条，搜索结果为其中 ${total} 条`
                    }
                    if (precomputedVal > 500 && total === 500) {
                      return `共 ${precomputedVal} 条，界面上加载了 ${total} 条，达到加载上限`
                    }
                    return `共 ${precomputedVal} 条，界面上加载了 ${total} 条`
                  }
                }}
              />
            </div>
          )
        }}
      </AsyncTaskRunner>
    )
  })

  genColumns(ug, userDimName, tableMetrics) {
    let { dimNameDict } = this.props
    if (!dimNameDict[userDimName]) {
      return []
    }
    let fromUgId = ug && ug.id
    let cols = [dimNameDict[userDimName], ...tableMetrics]
      .map(col => {
        let { title, name, formatter } = col
        return {
          title: title || name,
          dataIndex: name,
          key: name,
          fixed: name === userDimName ? 'left' : undefined,
          width: 150,
          render:
            name === userDimName
              ? (val, row, idx) => {
                  if (idx === undefined) {
                    // 导出 csv，不要返回 dom
                    return val
                  }
                  if (!canInspectDetails) {
                    return val
                  }
                  return (
                    <Anchor
                      className='elli mw400'
                      href={fromUgId ? `/console/inspect-user/${val}?ugId=${fromUgId}&userDimName=${userDimName}` : `/console/inspect-user/${val}?userDimName=${userDimName}`}
                      target='_blank'
                    >
                      {val}
                    </Anchor>
                  )
                }
              : formatter
        }
      })
      .filter(_.identity)
    if (_.some(['sugo_nation', 'sugo_province', 'sugo_city'], dimName => dimName in dimNameDict)) {
      return insert(cols, 1, {
        title: '最近访问地区',
        dataIndex: 'sugo_nation',
        key: 'sugo_nation',
        width: 150,
        render: (val, record) => {
          return `${record.sugo_nation || ''}${record.sugo_province || ''}${record.sugo_city || ''}`
        }
      })
    }
    return cols
  }

  renderMiscBar({ ug, userIdDimName }) {
    let { datasourceCurrent, dimNameDict } = this.props
    let { searchForUserId, loadingCsvData } = this.state
    let userIdCandidates = _.cloneDeep(_.get(datasourceCurrent, 'params.commonMetric', []))
    dimNameDict = _.cloneDeep(dimNameDict)
    DIYDIM.map(i => {
      let dimName = i.dimName
      let title = i.title
      userIdCandidates.push(dimName)
      dimNameDict[dimName] = { title }
    })
    return (
      <div className='pd2b'>
        <div className='iblock width300'>
          <span>用户 ID 类型：</span>
          <Select
            className='width200'
            value={userIdDimName}
            onChange={val => {
              this.setState({ userIdDimNameOverwrite: val, userListLoaded: [], tablePageIdx: 0, searchForUserId: null })
            }}
            {...enableSelectSearch}
            dropdownMatchSelectWidth={false}
            disabled={ug && _.startsWith(ug.id, 'temp_')}
          >
            {userIdCandidates.map(dimName => {
              return (
                <Select.Option key={dimName} value={dimName}>
                  {_.get(dimNameDict, [dimName, 'title']) || dimName}
                </Select.Option>
              )
            })}
          </Select>
        </div>

        <div className='iblock width160'>
          <Input.Search
            placeholder={`请输入${_.get(dimNameDict, [userIdDimName, 'title']) || userIdDimName}`}
            onSearch={val => {
              if (searchForUserId === val) return
              this.setState({ searchForUserId: val, userListLoaded: [], tablePageIdx: 0 })
            }}
            enterButton
          />
        </div>

        <LitePopInput
          title='请选择下载量'
          defaultValue={100}
          type='select'
          options={[{ name: '100' }, { name: '500' }, { name: '1000' }]}
          onChange={amount => this.downloadUserList(amount, userIdDimName)}
          placement='bottomRight'
        >
          <Button icon={<DownloadOutlined />} className={classNames('fright', { hide: !canDownloadUserlist })} loading={loadingCsvData}>
            下载
          </Button>
        </LitePopInput>
      </div>
    )
  }

  downloadUserList = async (amount, userIdDimName) => {
    let { dataSourceCompareUserGroups: userGroups, params, datasourceCurrent, dimNameDict } = this.props
    let ugId = _.get(params, 'ugId')
    let ug = _.find(userGroups, ug => ug.id === ugId)

    this.setState({ loadingCsvData: true })

    let userListRes = await this.loadUserList(ug, userIdDimName, amount)

    let userIds = (userListRes || []).map(d => d[userIdDimName])

    let tableMetrics = genTableMetrics({
      durationDimName: 'duration' in dimNameDict ? 'duration' : null,
      eventNameDimName: 'event_name' in dimNameDict ? 'event_name' : null,
      eventTimeDimName: 'event_time' in dimNameDict ? 'event_time' : '__time'
    })
    let res = await doQuerySliceData({
      druid_datasource_id: datasourceCurrent && datasourceCurrent.id,
      params: {
        filters: [{ col: userIdDimName, op: 'in', eq: userIds }],
        dimensions: [userIdDimName, 'sugo_nation', 'sugo_province', 'sugo_city'].filter(dimName => dimName in dimNameDict),
        splitType: 'groupBy',
        dimensionExtraSettingDict: { [userIdDimName]: { limit: 99999 } },
        customMetrics: tableMetrics,
        withGlobalMetrics: false
      }
    })

    this.setState({ loadingCsvData: false })

    let nonDistinctUserList = _.get(res, '[0].resultSet')
    // 前端去重
    let arr = this.mergeMultiArea(nonDistinctUserList, userIdDimName)

    let { columns } = this._userListTable.props
    let sortedKeys = columns.map(tCol => tCol.title)
    let sortedRows = arr.map(d =>
      columns.map(tCol => {
        let render = tCol.render
        let val = d[tCol.dataIndex]
        return render ? render(val, d) : val
      })
    )

    let content = d3.csvFormatRows([sortedKeys, ...sortedRows])

    exportFile(`用户群 ${(ug && ug.title) || '全部访问用户'} 的用户列表_${moment().format('YYYY-MM-DD')}.csv`, content)
  }

  renderBuildingUserGroupHint({ ug }) {
    let secondNeedToWait = getUserGroupReadyRemainTimeInSeconds(ug)

    return (
      <Timer
        interval={1000}
        onTick={() => {
          this.forceUpdate(() => {
            if (secondNeedToWait <= 1) {
              this.props.reloadUserGroupLookups()
            }
          })
        }}
      >
        {() => {
          return <div className='pd3 aligncenter color-grey'>用户群正在创建，请在 {secondNeedToWait} 秒后再试</div>
        }}
      </Timer>
    )
  }

  recomputeUserGroup = async ug => {
    let { reloadUserGroups, updateUserGroup } = this.props
    let res = await updateUserGroup(immutateUpdate(ug, 'params.random', () => Date.now()))
    if (res && res.result) {
      await reloadUserGroups()
    }
  }

  renderNoLookupHint({ ug }) {
    let { userGroupLookups, isFetchingUserGroupLookups, isFetchingDataSourceCompareUserGroups } = this.props
    if (isFetchingUserGroupLookups) {
      return <div className='bg-white corner pd3 aligncenter color-grey'>正在检查用户群是否过期...</div>
    } else if (ug && !_.startsWith(ug.id, 'temp_') && !_.includes(userGroupLookups, `usergroup_${ug.id}`)) {
      return (
        <div className='bg-white corner pd3 aligncenter color-999'>
          用户群已过期，请
          <a className='color-purple mg1x pointer' onClick={isFetchingDataSourceCompareUserGroups ? undefined : () => this.recomputeUserGroup(ug)}>
            重新计算
          </a>
        </div>
      )
    } else {
      return null
    }
  }

  render() {
    let { dataSourceCompareUserGroups: userGroups, dimNameDict, params, datasourceCurrent, projectCurrent } = this.props

    let ugId = _.get(params, 'ugId')
    let ug = _.startsWith(ugId, 'temp_') ? ls.get(ugId) : _.find(userGroups, ug => ug.id === ugId)

    let { userIdDimNameOverwrite } = this.state
    let userIdDimName = userIdDimNameOverwrite || _.get(ug, 'params.groupby') || _.get(datasourceCurrent, 'params.commonMetric[0]')
    let { updated_at, created_at } = ug || {}
    let mNow = moment()
    let secondsAfterCreate = mNow.diff(created_at, 'seconds')
    let secondsAfterUpdate = mNow.diff(updated_at, 'seconds')

    let isBuildingUserGroup = ug && !_.startsWith(ug.id, 'temp_') && (secondsAfterCreate < 30 || secondsAfterUpdate < 30)
    let noLookupHint = ugId !== 'all' && this.renderNoLookupHint({ ug })
    return (
      <div className='height-100 usergroup-userlist'>
        <Bread path={[{ name: '用户群列表', link: '/console/usergroup' }, { name: '用户列表' }]}>
          <Button onClick={() => browserHistory.push('/console/usergroup')}>返回</Button>
        </Bread>

        <div className='overscroll-y' style={{ height: 'calc(100% - 44px)' }}>
          {this.renderGroupsSelector({ ug, userIdDimName })}

          {!ug ? null : (
            <div style={{ padding: '10px 10px 0' }}>
              <UsergroupFiltersPreview
                projectId={projectCurrent && projectCurrent.id}
                userGroup={ug}
                dimNameDict={dimNameDict}
                userGroups={userGroups}
                extra={
                  ug && !_.startsWith(ug.id, 'temp') && canEditUg && !isUserGroupCanNotEdit(ug) ? (
                    <Link to={`/console/usergroup/${(ug && ug.id) || ''}`}>
                      <Button>编辑</Button>
                    </Link>
                  ) : null
                }
              />
            </div>
          )}

          <div style={{ padding: '10px 10px' }}>
            <div className='bg-white corner pd2'>
              {isBuildingUserGroup || noLookupHint ? null : this.renderMiscBar({ ug, userIdDimName })}
              {isBuildingUserGroup ? this.renderBuildingUserGroupHint({ ug }) : noLookupHint || this.renderUserList({ ug, userIdDimName })}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
