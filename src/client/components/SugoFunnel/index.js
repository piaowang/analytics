import React from 'react'
import _ from 'lodash'
import { CheckCircleOutlined, CloseOutlined, SaveOutlined } from '@ant-design/icons';
import {Button, Col, Input, message, Popconfirm, Popover, Radio, Row, Select, Tabs, Tooltip} from 'antd'
import {browserHistory, Link} from 'react-router'
import ComparingTable from './comparing-table'
import {withDataSourceDimensions} from '../Fetcher/data-source-dimensions-fetcher'
import moment from 'moment'
import classNames from 'classnames'
import {Auth, checkPermission} from '../../common/permission-control'
import {withFunnels} from '../Fetcher/funnels-fetcher'
import {withHashState} from '../Common/hash-connector'
import LuceneFetcher from '../Fetcher/lucene-fetcher'
import {
  compressUrlQuery,
  dictBy,
  immutateUpdate,
  immutateUpdates,
  insert,
  isDiffByPath
} from '../../../common/sugo-utils'
import {withUserGroups} from '../Fetcher/data-source-compare-user-group-fetcher'
import PubSub from 'pubsub-js'
import DailyTransferModal from './daily-transfer-modal'
import {
  findOrCreateTempUsergroup,
  getUserGroupReadyRemainTimeInSeconds,
  saveAndBrowserInInsight
} from '../../common/usergroup-helper'
import {isGroupDimension, isStringDimension} from '../../../common/druid-column-type'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {SavingFunnelStateEnum} from '../../constants/sugo-funnels'
import Fetch, {handleErr} from '../../common/fetch-final'
import {remoteUrl as URL} from '../../constants'
import Loading from '../../components/Common/loading'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import {dateOptions} from '../Common/time-picker'
import FunnelDisplayPanel from './funnel-display-panel'
import FunnelEditingPanel from './funnel-edit-panel'
import {patchPush, patchReplace} from '../../common/patch-url'
import MultiSelect from '../Common/multi-select'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import {isRelative} from '../../../common/param-transform'
import Icon from '../Common/sugo-icon'
import FetcherAgent from '../Fetcher/fetcher-agent'
import UserGroupSelector, {getUsergroupByBuiltinId, isBuiltinUsergroupId} from '../Common/usergroup-selector'
import {BuiltinUserGroup, GetBuildInUgs} from '../../../common/constants'
import {renderPageTitle} from '../Common/bread'
import {
  genLuceneFetcherDom,
  inspectFunnelLayerUsers,
  onShowLostUser
} from './data-transform'

const {
  distinctDropDownFirstNLimit = 10,
  enableSaveSliceEnhance = false
} = window.sugo
const {TabPane} = Tabs
const {Option} = Select

const canCreate = checkPermission('app/funnel/create')
const canEdit = checkPermission('app/funnel/update')
const canDel = checkPermission('app/funnel/delete')
const canCreateSlice = checkPermission('post:/app/slices/create/slices')

function getScrollContainer() {
  return document.querySelector('.scroll-content')
}

export const CompareTypeEnum = {
  dimensions: 'dimensions',
  userGroups: 'userGroups'
}

//"funnelLayers2d": [
//   [ ["or"], ["我要借款首页", "查询进度"], [null, "登录注册"] ],
//   [null, "立即申请"],
//   [null, "登录注册"]
// ]

export let genInitFunnel = ds => ds ? {
  id: `temp_${ds.id}`,
  funnel_name: '',
  datasource_name: ds.name,
  druid_datasource_id: ds.id,
  params: {
    relativeTime: '-7 days',
    since: moment().add(-7, 'days').format('YYYY-MM-DD'),
    until: moment().format('YYYY-MM-DD'),
    compareType: CompareTypeEnum.dimensions,
    commonDimensions: _.get(ds, 'params.commonDimensions'),
    funnelMetric: _.get(ds, 'params.commonMetric[0]'),
    compareByDimension: '',
    funnelLayers2d: [[], []],
    extraLayerFilters: [],
    extraFilters: [],
    selectedUserGroupIds: [],
    comparingFunnelGroupName: ['总体']
  }
} : {
  funnel_name: '',
  params: {
    relativeTime: '-7 days',
    since: moment().add(-7, 'days').format('YYYY-MM-DD'),
    until: moment().format('YYYY-MM-DD'),
    compareType: CompareTypeEnum.dimensions,
    comparingFunnelGroupName: ['总体'],
    extraLayerFilters: [],
    extraFilters: []
  }
}

let ExcludeDateTypeTitleSet = new Set(['今年', '去年', '最近一年'])
const localDateOptions = immutateUpdate(dateOptions(), 'natural', titleAndDateTypes => {
  return titleAndDateTypes.filter(({title}) => !ExcludeDateTypeTitleSet.has(title))
})

class SugoFunnel extends React.Component {
  state = {
    isLoadingTotalData: false,
    isLoadingDimensionCompareData: false,
    isLoadingUsergroupCompareData: false,
    funnelTotalData: [],
    funnelDataAfterGroupBy: {},
    dailyTransferModalVisible: false,

    savingFunnelState: SavingFunnelStateEnum.Idle,
    tempName: undefined,
    dateRange: [],
    showPop: false
  }

  componentDidMount() {
    PubSub.subscribe('sugoFunnel.showDailyTransferModal', () => {
      this.setState({dailyTransferModalVisible: true})
    })
    PubSub.subscribe('sugoFunnel.onShowLostUser', async (msg, data) => {
      let {isQueryingUsergroup} = this.state
      if (isQueryingUsergroup) return
      this.setState({isQueryingUsergroup: true})
      
      let ug = await onShowLostUser(data, this.props)
      let userGroupWithTotal = await findOrCreateTempUsergroup(ug)
      saveAndBrowserInInsight(userGroupWithTotal)
      
      this.setState({isQueryingUsergroup: false})
      if (data.done) {
        data.done()
      }
    })
    PubSub.subscribe('sugoFunnel.onShowFunnelUser', async (msg, data) => {
      let ug = inspectFunnelLayerUsers(data, this.props)
      let userGroupWithTotal = await findOrCreateTempUsergroup(ug)
      saveAndBrowserInInsight(userGroupWithTotal)
      if (data.done) {
        data.done()
      }
    })
  }

  componentWillUnmount() {
    PubSub.unsubscribe('sugoFunnel.showDailyTransferModal')
    PubSub.unsubscribe('sugoFunnel.onShowLostUser')
    PubSub.unsubscribe('sugoFunnel.onShowFunnelUser')
  }
  
  componentWillReceiveProps(nextProps) {
    let {params: {funnelId}, router, sugoFunnels, datasourceCurrent, currFunnel} = this.props
    let {updateHashState,
      sugoFunnels: nextSugoFunnels, params: {funnelId: nextFunnelId}, datasourceCurrent: nextDataSource,
      currFunnel: nextFunnel} = nextProps

    // 切换漏斗后，清除临时名称，避免保存时仍然看到上次输入的名称
    if (nextFunnel && _.get(currFunnel, 'funnel_name') !== nextFunnel.funnel_name) {
      this.setState({
        tempName: undefined
      })
    }

    // 数据源变更时切换地址
    if (!_.isEqual(datasourceCurrent, nextDataSource)) {
      // 直接通过 id 访问某个漏斗
      let nextFunnelForDs = _.find(nextSugoFunnels, fu => fu.druid_datasource_id === nextDataSource.id)
      // 切换数据源后，无须保留 query 和 hash
      if (nextFunnelForDs) {
        browserHistory.push(`/console/funnel/${nextFunnelForDs.id}`)
      } else if (!_.isEmpty(nextSugoFunnels)) { // 漏斗被删除才跳转到新建
        // 跳转到新建
        browserHistory.push('/console/funnel')
      }
    }
    // 后退时需要重新选择刚刚的数据源
    else if (!_.isEqual(sugoFunnels, nextSugoFunnels)) {
      if (!currFunnel) {
        // 直接通过 id 访问某个漏斗
        let nextFunnel = _.find(nextSugoFunnels, fu => fu.id === nextFunnelId)
        updateHashState({
          vizType: 'funnel',
          hideLineChartSteps: [],
          currFunnel: nextFunnel
        }, true)
      } else {
        // TODO 简化重复逻辑
        let currDsId = _.get(currFunnel, 'druid_datasource_id')
        // 漏斗项目与当前项目不同时，切换项目
        if (currDsId && datasourceCurrent && currDsId !== datasourceCurrent.id) {
          let proj = _.find(nextProps.projectList, p => p.datasource_id === currDsId)
          if (proj) {
            nextProps.changeProject(proj.id)
          }
        }
      }
    }

    // 切换漏斗／创建漏斗
    if (funnelId !== nextFunnelId) {
      if (nextFunnelId && nextFunnelId !== 'new') {
        let nextFunnel = _.startsWith(nextFunnelId, 'temp_')
          ? currFunnel
          : _.find(nextSugoFunnels, fu => fu.id === nextFunnelId)

        // 按产品要求，始终使用最新的数据源环境配置
        let commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions')
        if (commonDimensions && !_.isEqual(commonDimensions, nextFunnel.params.commonDimensions)) {
          nextFunnel = immutateUpdate(nextFunnel, 'params.commonDimensions', () => commonDimensions)
        }

        updateHashState({
          vizType: 'funnel',
          hideLineChartSteps: [],
          currFunnel: nextFunnel
        }, true, () => {
          this.autoSelectFirstComparingTerm()
        })

        // TODO 简化重复逻辑
        let nextDsId = _.get(nextFunnel, 'druid_datasource_id')
        // 漏斗项目与当前项目不同时，切换项目
        if (nextDsId && datasourceCurrent && nextDsId !== datasourceCurrent.id) {
          let proj = _.find(nextProps.projectList, p => p.datasource_id === nextDsId)
          if (proj) {
            nextProps.changeProject(proj.id)
          }
        }
      } else if (nextFunnelId === 'new') {
        updateHashState({
          vizType: 'funnel',
          hideLineChartSteps: [],
          currFunnel: genInitFunnel(nextDataSource)
        }, true)
      } else if (!nextFunnelId) {
        // 直接通过 id 访问某个漏斗
        let nextFunnelForDs = _.find(nextSugoFunnels, fu => fu.druid_datasource_id === nextDataSource.id)
        if (nextFunnelForDs) {
          patchReplace(`/console/funnel/${nextFunnelForDs.id}`)
        } else {
          // 跳转到新建
          patchPush('/console/funnel/new')
        }
      }
    } /*else if (!router.location.hash && nextFunnelId !== 'new') {
      // 用户再次点击了导航的话，重新加载当前漏斗，避免 hash 被清空
      let nextFunnel = _.find(nextSugoFunnels, fu => fu.id === nextFunnelId)
      updateHashState({
        vizType: 'funnel',
        hideLineChartSteps: [],
        currFunnel: nextFunnel
      }, true)
    }*/

    // 因为 统计字段需要直接使用分群的统计字段，所以分群变更后，需要设置统计字段
    // 没有选择分群时，能够选择 统计字段，否则不能选择
    if (isDiffByPath(this.props, nextProps, 'location.query.usergroup_id')
      && _.get(this.props, 'currFunnel.druid_datasource_id') === _.get(datasourceCurrent, 'id')) {
      this.resetGroupByField(nextProps)
    }
  }

  resetGroupByField(nextProps) {
    let commonMetric = _.get(nextProps.datasourceCurrent, 'params.commonMetric')
    if (_.isEmpty(commonMetric)) {
      return
    }
    let {updateHashStateByPath} = this.props
    let nextUgId = _.get(nextProps, 'location.query.usergroup_id')

    let nextUg = isBuiltinUsergroupId(nextUgId)
      ? getUsergroupByBuiltinId(nextUgId, nextProps.datasourceCurrent)
      : (nextUgId && _.find(nextProps.usergroups, ug => ug.id === nextUgId))

    if (nextUg) {
      let nextMetricalField = nextUg.params.groupby
      updateHashStateByPath('currFunnel.params.funnelMetric', () => nextMetricalField)
    } else {
      updateHashStateByPath('currFunnel.params.funnelMetric', () => commonMetric[0])
    }
  }

  isEditing() {
    let pathName = _.get(this.props, 'router.location.pathname') || window.location.pathname
    return _.endsWith(pathName, '/new') || _.endsWith(pathName, '/editing')
  }

  isLoadingChartData = () => {
    let {isLoadingTotalData, isLoadingDimensionCompareData, isLoadingUsergroupCompareData} = this.state
    return isLoadingTotalData || isLoadingDimensionCompareData || isLoadingUsergroupCompareData
  }


  genLuceneFetcher(currFunnel, extraProps = {}) {
    let {dataSourceDimensions, location, datasourceCurrent, dataSourceCompareUserGroups} = this.props

    let globalUserGroupId = _.get(location, 'query.usergroup_id') //|| ls.gets('current_common_usergroup_id')
    return genLuceneFetcherDom({
      currFunnel,
      extraFetcherProps: {
        onFetchingStateChange: isLoading => {
          if (isLoading) {
            this.setState({isLoadingTotalData: true})
          }
        },
        onData: statisticData => {
          this.setState({
            funnelTotalData: this.normalizeData(statisticData),
            isLoadingTotalData: false
          })
        },
        onFetcherUnmount: () => this.setState({isLoadingTotalData: false}),
        ...extraProps
      },
      dataSourceDimensions,
      globalUserGroupId,
      datasourceCurrent,
      dataSourceCompareUserGroups
    })
  }

  normalizeFunnelEvent = (event, checkingStep = 2) => {
    let vPrev = event[`第 ${checkingStep - 1} 步`]
    let vCurr = event[`第 ${checkingStep} 步`]
    if (vCurr === undefined) {
      return event
    }
    if (vPrev < vCurr) {
      return this.normalizeFunnelEvent({...event, [`第 ${checkingStep} 步`]: vPrev}, checkingStep + 1)
    }
    return this.normalizeFunnelEvent(event, checkingStep + 1)
  }

  normalizeData(inputArr) {
    // {v: "FunnelResultRow", timestamp: "2017-06-22T16:00:00.000Z", event: {第 1 步: 27, 第 2 步: 1},…}
    // 限制 第 2 步 不能超过 第 1 步，第 3 步 不能超过 第 2 步...
    if (_.isEmpty(inputArr)) {
      return inputArr
    }
    let [head, ...rest] = inputArr

    return [immutateUpdate(head, ['event'], this.normalizeFunnelEvent), ...this.normalizeData(rest)]
  }

  deleteFunnel = async funnelId => {
    let {reloadSugoFunnels} = this.props
    if (!funnelId || funnelId === 'new') {
      message.success('删除失败，未选择漏斗')
      return
    }
    let res = await Fetch.delete(`${URL.DELETE_SUGO_FUNNELS}/${funnelId}`)
    if (res) {
      message.success('删除成功', 2)

      this.setState({
        savingFunnelState: SavingFunnelStateEnum.Idle
      })

      // 漏斗列表变更后会自动调整，逻辑在 index.componentWillReceiveProps
      await reloadSugoFunnels()
    }
  }

  checkNewName = key => {
    const { currFunnel: { id: currentFunnelId, funnel_name } } = this.props
    const { tempName } = this.state
    this.setState({savingFunnelState: SavingFunnelStateEnum.Checking})
    let newName = tempName === undefined ? funnel_name : tempName
    if (key === 'update') {
      this.checkSameFunnelName(currentFunnelId, newName)
    } else {
      this.checkSameFunnelName(null, newName)
    }
  }

  renderFunnelSwitcher() {
    let {
      sugoFunnels,
      datasourceCurrent,
      params: {funnelId: funnelIdInUrl},
      currFunnel
    } = this.props

    let {
      id: currentFunnelId
    } = currFunnel || genInitFunnel(datasourceCurrent)

    let isLoadingChartData = this.isLoadingChartData()

    let commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || []

    let noCommonDims = !commonDimensions || commonDimensions.length === 0

    return (
      <div className={classNames('itblock', {hide: noCommonDims})} >
        <span>常用漏斗：</span>
        <Select
          getPopupContainer={getScrollContainer}
          {...enableSelectSearch}
          className="width200"
          defaultActiveFirstOption={false}
          placeholder="请选择"
          dropdownMatchSelectWidth={false}
          value={_.startsWith(funnelIdInUrl, 'temp_') ? '临时漏斗': funnelIdInUrl || undefined}
          disabled={isLoadingChartData}
          onChange={val => {
            if (!isLoadingChartData && currentFunnelId !== val) {
              patchPush('/console/funnel/' + val)
            }
          }}
        >
          {sugoFunnels.filter(funnel => funnel.druid_datasource_id === datasourceCurrent.id).map(f => {
            return (
              <Select.Option key={f.id} value={'' + f.id}>{f.funnel_name}</Select.Option>
            )
          })}
        </Select>
      </div>
    )
  }

  renderBread() {

    return (
      <div className="nav-bar">
        {renderPageTitle('漏斗分析')}
        {this.renderUsergroupSwitcher()}
      </div>
    )
  }

  renderMetricalFieldSelector() {
    let {
      dataSourceDimensions,
      currFunnel,
      updateHashStateByPath,
      isLoadingChartData,
      datasourceCurrent
    } = this.props

    let {funnelMetric, commonMetric} = _.get(currFunnel, 'params') || {}

    if (!commonMetric || !commonMetric.length) {
      if (datasourceCurrent) {
        commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
      }
    }
    if (_.size(commonMetric) <= 1) {
      return null
    }
    let currUserGroupId = _.get(this.props, 'location.query.usergroup_id')
    if (currUserGroupId && currUserGroupId !== 'all' && currUserGroupId !== BuiltinUserGroup.newVisitUsers) {
      // 没有选择分群时，才能够选择 统计字段，否则不能选择
      return
    }

    let dimensionsDict = dictBy(dataSourceDimensions.filter(dim => dim.title), dim => dim.name, dim => dim.title)
    return (
      <div className="itblock fright">
        <div className="itblock mg1r line-height28">切换用户类型为</div>
        <Select
          {...enableSelectSearch}
          getPopupContainer={getScrollContainer}
          placeholder="未设置用户类型"
          className="width160"
          onChange={val => {
            if (!isLoadingChartData) {
              updateHashStateByPath('currFunnel.params.funnelMetric', () => val)
            }
          }}
          value={funnelMetric}
        >
          {commonMetric.map(cm => {
            return (
              <Option key={cm} value={cm}>{dimensionsDict[cm] || cm}</Option>
            )
          })}
        </Select>

        <div className="mg1l itblock font16 line-height28">
          <Popover
            content={(
              <div className="pd2">
                <p>选择
                  {commonMetric.map((t, i) => (<b className="color-green"
                    key={i}
                                               >{i ? ', ' : null}{dimensionsDict[t] || t}</b>))}
                  中的一种标识访问用户的ID</p>
              </div>
            )}
            placement="right"
          >
            <Icon type="question-circle-o"/>
          </Popover>
        </div>
      </div>
    )
  }

  renderUsergroupSwitcher() {
    let {
      datasourceCurrent,
      location,
      projectList
    } = this.props

    let globalUserGroupId = _.get(location, 'query.usergroup_id')// || ls.gets('current_common_usergroup_id')

    return (
      <div className="itblock">
        <span className="font13">目标用户：</span>
        <UserGroupSelector
          datasourceCurrent={datasourceCurrent}
          projectList={projectList}
          className="width120"
          value={globalUserGroupId}
          onChange={nextUserGroup => {
            // ls.set('current_common_usergroup_id', val)
            browserHistory.push(immutateUpdate(location, 'query.usergroup_id', () => nextUserGroup ? nextUserGroup.id : null))
          }}
        />
      </div>
    )
  }

  renderTopPanel() {
    let {
      params: {funnelId: funnelIdInUrl},
      datasourceCurrent,
      currFunnel = genInitFunnel(datasourceCurrent)
    } = this.props

    let {
      id: currentFunnelId
    } = currFunnel || genInitFunnel(datasourceCurrent)

    const { savingFunnelState } = this.state

    let isEditing = this.isEditing()
    // let isLoadingChartData = this.isLoadingChartData()
    let isCreating = !currentFunnelId || _.startsWith(currentFunnelId, 'temp_')

    let commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || []

    let noCommonDims = !commonDimensions || commonDimensions.length === 0

    let saveFunnelPopContent = funnelIdInUrl && this.genSaveFunnelPopoverContent(currFunnel)
    return (
      <div className="pd2t pd3x">
        {this.renderFunnelSwitcher()}
  
        {!funnelIdInUrl ? null : (
          <div className="fright">
            <Auth auth="post:/app/slices/create/slices">
              <Popover
                content={this.genSaveSlicePopoverContent(currFunnel)}
                placement="bottomLeft"
              >
                <Button
                  className={classNames('mg1r', {hide: noCommonDims || !canCreateSlice || !enableSaveSliceEnhance})}
                  type="success"
                  loading={savingFunnelState === SavingFunnelStateEnum.Saving}
                  icon={<CheckCircleOutlined />}
                >保存成单图</Button>
              </Popover>
            </Auth>
  
            {!saveFunnelPopContent ? null : (
              <Popover
                key={funnelIdInUrl}
                content={saveFunnelPopContent}
                placement="bottomLeft"
              >
                <Button
                  className={classNames({hide: noCommonDims})}
                  type="success"
                  loading={savingFunnelState === SavingFunnelStateEnum.Saving}
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    this.checkNewName(isCreating ? 'saveAs' : 'update')
                  }}
                >{_.startsWith(funnelIdInUrl, 'temp_') ? '保存常用漏斗' : '保存'}</Button>
              </Popover>
            )}

            {canDel && !(isEditing || _.startsWith(currentFunnelId, 'temp_'))
              ? (
                <Popconfirm
                  title="确定要删除这个漏斗吗？"
                  onConfirm={() => {
                    this.deleteFunnel(funnelIdInUrl)
                  }}
                >
                  <Button
                    className={classNames('mg1l', {hide: noCommonDims})}
                    type="default"
                    icon={<CloseOutlined />}
                  >删除</Button>
                </Popconfirm>
              ) : null
            }
          </div>
        )}
      </div>
    );
  }

  onChangeDate = ({dateType, dateRange: [since, until]}) => {
    const maxDurationInDays = 90

    if (maxDurationInDays < moment(until).diff(since, 'day')) {
      message.error(`最长只能查询 ${maxDurationInDays} 天,结束时间已自动切换为最大值`, 5)

      this.setState({
        dateRange: [since, moment(since).add(maxDurationInDays, 'days').format('YYYY-MM-DD HH:mm:ss.SSS')],
        showPop: true
      })
      return
    }
    let {updateHashStateByPath} = this.props

    updateHashStateByPath('currFunnel.params', prev => {
      return {
        ...prev,
        relativeTime: dateType,
        since,
        until
      }
    })
    this.setState({
      dateRange: [],
      showPop: false
    })
  }

  renderDruidFilterPanel() {
    let {
      updateHashStateByPath,
      datasourceCurrent,
      currFunnel,
      projectCurrent
    } = this.props

    let {
      params: {
        relativeTime,
        since,
        until,
        extraFilters
      } = {}
    } = currFunnel || genInitFunnel(datasourceCurrent)

    let isLoadingChartData = this.isLoadingChartData()

    let {dateRange = [], showPop} = this.state

    return (
      <CommonDruidFilterPanel
        getPopupContainer={getScrollContainer}
        className="itblock"
        projectId={projectCurrent.id}
        dataSourceId={projectCurrent.datasource_id}
        headerDomMapper={headerDiv => {
          let temp0 = immutateUpdate(headerDiv, 'props.className', prevClass => classNames(prevClass, 'line-height32'))
          return immutateUpdate(temp0, 'props.children', prevChilds => {
            return insert(prevChilds, 1, this.renderFunnelGranularitySwitcher())
          })
        }}
        timePickerProps={{
          dateTypes: localDateOptions,
          className: 'iblock width260 mg2r',
          disabled: isLoadingChartData,
          dateType: relativeTime,
          dateRange: 0 < dateRange.length ? dateRange : [since, until],
          showPop: showPop,
          onChange: this.onChangeDate
        }}
        filters={extraFilters}
        onFiltersChange={nextFilters => {
          updateHashStateByPath('currFunnel.params.extraFilters', () => nextFilters)
        }}
      />
    )
  }

  renderFunnelGranularitySwitcher() {
    let {updateHashStateByPath, currFunnel} = this.props
    let granularity = _.get(currFunnel, 'params.granularity')

    let isLoadingChartData = this.isLoadingChartData()
    return (
      <div className="itblock mg2r" key="funnelGranularitySwitcher">
        <span className="iblock mg1r">转化周期</span>
        <div className="iblock mg1r">
          <Select
            getPopupContainer={getScrollContainer}
            dropdownMatchSelectWidth={false}
            value={granularity && granularity.match(/P\dD/) || 'P1D'}
            style={{width: 80}}
            disabled={isLoadingChartData}
            onChange={val => {
              updateHashStateByPath('currFunnel.params.granularity', () => val)
            }}
          >
            {_.range(7).map(i => {
              return (
                <Select.Option
                  key={i}
                  value={`P${i + 1}D`}
                >{`${i + 1} 天`}</Select.Option>
              )
            })}
          </Select>
        </div>
        <div className="iblock">
          <Popover
            content={(
              <p className="pd2">“转化周期”是用户在转化路径中允许的最长时间，如果完成转化目标的时间跨度超过“转化周期”，将被算作流失。</p>
            )}
          >
            <Icon type="question-circle-o"/>
          </Popover>
        </div>
      </div>
    );
  }

  renderDisplayTypeSwitcher() {
    let {vizType, updateHashState} = this.props

    return (
      <Radio.Group
        className="fright"
        style={{marginLeft: 10}}
        onChange={ev => {
          let isLoadingChartData = this.isLoadingChartData()
          if (!isLoadingChartData) {
            updateHashState({
              vizType: ev.target.value,
              hideLineChartSteps: []
            })
          }
        }}
        value={vizType}
      >
        <Radio.Button value="funnel">
          <Tooltip title="漏斗转化率">
            <Icon type="sugo-horizontal-bars" className="mg1r itbblock-force"/>
            条形图
          </Tooltip>
        </Radio.Button>
        <Radio.Button value="line">
          <Tooltip title="漏斗趋势图">
            <Icon type="line-chart" className="mg1r"/>
            趋势图
          </Tooltip>
        </Radio.Button>
      </Radio.Group>
    )
  }

  renderCreateOrEditButtons() {
    let {
      params: {funnelId: funnelIdInUrl},
      location
    } = this.props

    return (
      <div className="pd2x pd2t">
        {canCreate
          ? (
            <Button
              type="primary"
              className="mg2l width100"
              onClick={() => {
                patchPush('/console/funnel/new')
              }}
            >创建新漏斗</Button>
          ) : null}
        {funnelIdInUrl ? (
          <Button
            className="mg1l width100"
            onClick={() => {
              patchPush(`/console/funnel/${funnelIdInUrl}/editing${location.hash}`)
            }}
          >编辑漏斗</Button>
        ) : null}
      </div>
    )
  }

  renderComparingFunnel() {
    let {
      dataSourceDimensions,
      datasourceCurrent,
      currFunnel = genInitFunnel(datasourceCurrent),
      vizType,
      hideLineChartSteps,
      updateHashState,
      dataSourceCompareUserGroups,
      location,
      dimNameDict
    } = this.props

    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let isLoadingChartData = this.isLoadingChartData()

    let {funnelTotalData, funnelDataAfterGroupBy} = this.state

    let comparingFunnelGroupName = _.get(currFunnel, 'params.comparingFunnelGroupName') || ['总体']
    return (
      <Row gutter={16} className="pd3x">
        <Col span={12}>
          <FunnelDisplayPanel
            isComparing
            {...{
              location,
              dataSourceCompareUserGroups,
              datasourceCurrent,
              dataSourceDimensions,
              dimNameDict,
              vizType,
              hideLineChartSteps,
              isLoadingChartData,
              funnelTotalData,
              funnelDataAfterGroupBy,
              currFunnel,
              onLineChartStepToggle: stepIndex => this.toggleStep(stepIndex),
              funnelCompareGroupName: comparingFunnelGroupName[0],
              className: 'comparing-left',
              onCancelComparing: () => {
                updateHashState(prevState => {
                  return immutateUpdate(prevState, 'currFunnel.params.comparingFunnelGroupName', prev => _.drop(prev, 1))
                })
              }
            }}
          />
        </Col>

        <Col span={12}>
          <FunnelDisplayPanel
            isComparing
            {...{
              location,
              dataSourceCompareUserGroups,
              datasourceCurrent,
              dataSourceDimensions,
              dimNameDict,
              vizType,
              hideLineChartSteps,
              isLoadingChartData,
              funnelTotalData,
              funnelDataAfterGroupBy,
              currFunnel,
              onLineChartStepToggle: stepIndex => this.toggleStep(stepIndex),
              funnelCompareGroupName: comparingFunnelGroupName[1],
              className: 'comparing-right',
              onCancelComparing: () => {
                updateHashState(prevState => {
                  return immutateUpdate(prevState, 'currFunnel.params.comparingFunnelGroupName', prev => _.take(prev, 1))
                })
              }
            }}
          />
        </Col>
      </Row>
    )
  }

  onComparingFunnelDataChange = nextComparingFunnelGroupName => {
    let {updateHashState, currFunnel} = this.props
    let comparingFunnelGroupName = _.get(currFunnel, 'params.comparingFunnelGroupName') || ['总体']
    if (_.isEqual(comparingFunnelGroupName, nextComparingFunnelGroupName)) {
      return
    }
    updateHashState({
      vizType: 'funnel',
      hideLineChartSteps: [],
      currFunnel: immutateUpdate(currFunnel, 'params.comparingFunnelGroupName', () => nextComparingFunnelGroupName)
    })
  }

  renderComparingSetting() {
    let {
      dataSourceDimensions,
      isFetchingDataSourceDimensions, isLoadingFunnelStatisticData,
      currFunnel,
      updateHashStateByPath,
      dataSourceCompareUserGroups
    } = this.props

    let {
      compareByDimension,
      compareByDimensionDistinctValues = [],
      funnelMetric,
      compareType = CompareTypeEnum.dimensions,
      selectedUserGroupIds
    } = _.get(currFunnel, 'params') || {}

    const createCompareUserGroupsSelect = () => {
      let {isFetchingDataSourceCompareUserGroups, datasourceCurrent} = this.props

      let {firstVisitTimeDimName, firstLoginTimeDimName, loginId} = _.get(datasourceCurrent, 'params') || {}

      let options = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]
      let validUsergroupIdsSet = new Set(options.map(ug => ug.id))
      return (
        <Loading
          isLoading={isFetchingDataSourceCompareUserGroups}
          indicatePosition="right"
          className="itblock width200"
        >
          <MultiSelect
            getPopupContainer={getScrollContainer}
            options={options}
            optionDisabledPredicate={ug => {
              switch (ug.id) {
                case BuiltinUserGroup.newVisitUsers:
                  return !firstVisitTimeDimName
                case BuiltinUserGroup.allLoginUsers:
                  return !loginId
                case BuiltinUserGroup.newLoginUsers:
                  return !firstLoginTimeDimName || !loginId
                default: {
                  let remainTime = getUserGroupReadyRemainTimeInSeconds(ug)
                  return remainTime > 0 // 创建30s内不许使用
                }
              }
            }}
            getValueFromOption={ug => ug.id}
            getTitleFromOption={ug => {
              let {title} = ug
              switch (ug.id) {
                case BuiltinUserGroup.newVisitUsers:
                  return firstVisitTimeDimName ? title : `${title}: 使用此分群前需先到“场景数据设置”设置“首次访问时间”维度`
                case BuiltinUserGroup.allLoginUsers:
                  return loginId ? title : `${title}: 使用此分群前需先到“场景数据设置”设置“登录ID”维度`
                case BuiltinUserGroup.newLoginUsers:
                  return (firstLoginTimeDimName && loginId) ? title : `${title}: 使用此分群前需先到“场景数据设置”设置“首次登录时间”和“登录ID”维度`
                default: {
                  //创建30s内不许使用
                  let remainTime = getUserGroupReadyRemainTimeInSeconds(ug)
                  return 0 < remainTime ? `分群"${title}"数据创建中，${remainTime}秒后刷新页面可以使用` : title
                }
              }
            }}
            className="width220"
            style={{marginRight: 10, marginLeft: 10}}
            placeholder="选择用户群"
            isLoading={isFetchingDataSourceCompareUserGroups}
            value={(selectedUserGroupIds || []).filter(ugId => validUsergroupIdsSet.has(ugId))}
            onChange={vals => {
              if (vals.length > 5) {
                message.warn('最多选择 5 个筛选项', 3)
              }

              let nextUgIds = _.takeRight(vals.filter(_.identity), 5)
              updateHashStateByPath('currFunnel.params.selectedUserGroupIds', () => nextUgIds, undefined, () => {
                this.autoSelectFirstComparingTerm()
              })
            }}
          />
        </Loading>
      )
    }

    const createCompareFieldSelect = () => {
      const {
        currFunnel: {
          params: {
            relativeTime,
            since,
            until
          } = {},
          druid_datasource_id
        } = {}
      } = this.props

      return (
        <DruidDataFetcher
          dbDimensions={dataSourceDimensions}
          dataSourceId={druid_datasource_id}
          dimensions={[compareByDimension]}
          metrics={[]}
          customMetrics={[{name: 'count', formula: '$main.count()'}]}
          doFetch={!!(druid_datasource_id && compareByDimension)}
          filters={[{col: '__time', op: 'in', eq: isRelative(relativeTime) ? relativeTime : [since, until]}]}
          dimensionExtraSettingDict={{
            [compareByDimension]: {sortCol: 'count', sortDirect: 'desc', limit: distinctDropDownFirstNLimit}
          }}
          groupByAlgorithm="topN"
        >
          {({isFetching, data, fetch}) => {
            let topN = (data || []).map(d => d[compareByDimension]).filter(_.identity)
            return (
              <MultiSelect
                getPopupContainer={getScrollContainer}
                options={topN}
                className="width200"
                isLoading={isFetching}
                value={compareByDimensionDistinctValues}
                onChange={vals => {
                  if (vals.length > 10) {
                    message.warn('最多选择 10 个筛选项', 3)
                    updateHashStateByPath('currFunnel.params.compareByDimensionDistinctValues', () => _.take(vals, 10))
                    return
                  }
                  updateHashStateByPath('currFunnel.params.compareByDimensionDistinctValues', () => vals, undefined, () => {
                    this.autoSelectFirstComparingTerm()
                  })
                }}
                onSearch={keyword => {
                  if (keyword) {
                    fetch(prevBody => {
                      return immutateUpdate(prevBody, 'filters', () => {
                        return [{col: compareByDimension, op: 'contains', eq: [keyword], ignoreCase: true}]
                      })
                    })
                  } else {
                    fetch()
                  }
                }}
              />
            )
          }}
        </DruidDataFetcher>
      )
    }

    const createCompareDimensionSelect = () => {
      return (
        <Loading
          isLoading={isFetchingDataSourceDimensions}
          indicatePosition="right"
          className="itblock width200 pd1r"
        >
          <Select
            getPopupContainer={getScrollContainer}
            className="width-100"
            {...enableSelectSearch}
            allowClear
            notFoundContent={isFetchingDataSourceDimensions ? '加载中' : '无法找到'}
            dropdownMatchSelectWidth={false}
            placeholder="维度对比"
            value={compareByDimension || undefined}
            onChange={val => {
              if (!isFetchingDataSourceDimensions && !isLoadingFunnelStatisticData) {
                updateHashStateByPath('currFunnel.params', prevParams => {
                  return {
                    ...prevParams,
                    compareByDimension: val || null,
                    compareByDimensionDistinctValues: []
                  }
                }, undefined, () => {
                  this.onComparingFunnelDataChange(['总体'])
                })
              }
            }}
          >
            {/* 时间维度不参与对比 */}
            {
              dataSourceDimensions
                .filter(d => isStringDimension(d) && !isGroupDimension(d))
                .map((g) =>
                  (<Select.Option key={g.name} value={g.name}>
                    {g.title || g.name}
                  </Select.Option>)
                )
            }
          </Select>
        </Loading>
      )
    }

    const isUserGroups = compareType !== CompareTypeEnum.dimensions

    return (
      <div className="pd3x pd2t mg2t bg-fb bordert dashed">
        <div className="fleft pd1r">
          <Radio.Group
            value={compareType}
            onChange={ev => {
              if (!isFetchingDataSourceDimensions && !isLoadingFunnelStatisticData) {
                let val = ev.target.value
                updateHashStateByPath('currFunnel.params.compareType', () => val, undefined, () => {
                  this.autoSelectFirstComparingTerm(val)
                })
              }
            }}
          >
            <Radio.Button value={CompareTypeEnum.dimensions}>维度对比</Radio.Button>
            <Radio.Button
              checked={compareType === CompareTypeEnum.userGroups}
              value={CompareTypeEnum.userGroups}
            >用户群对比</Radio.Button>
          </Radio.Group>
        </div>
        {
          isUserGroups
            ? createCompareUserGroupsSelect()
            : createCompareDimensionSelect()
        }
        {isUserGroups || compareByDimension === null ? null : createCompareFieldSelect()}

        {this.renderDisplayTypeSwitcher()}

      </div>
    )
  }

  autoSelectFirstComparingTerm = (compareType = _.get(this.props.currFunnel, 'params.compareType')) => {
    let {
      currFunnel,
      dataSourceCompareUserGroups,
      datasourceCurrent
    } = this.props

    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let {
      compareByDimensionDistinctValues = [],
      selectedUserGroupIds,
      comparingFunnelGroupName = ['总体']
    } = _.get(currFunnel, 'params') || {}

    let notTotalComparingGroups = comparingFunnelGroupName.filter(n => n !== '总体')

    if (compareType === CompareTypeEnum.dimensions) {
      if (_.some(notTotalComparingGroups, gn => _.includes(compareByDimensionDistinctValues, gn))) {
        // 已经选择了，不需要再选
        return
      }
      this.onComparingFunnelDataChange(['总体', _.get(compareByDimensionDistinctValues, '[0]')].filter(_.identity))
    } else {
      let selectedUgTitles = selectedUserGroupIds
        .map(ugId => _.find(dataSourceCompareUserGroups, {id: ugId})).filter(_.identity).map(ug => ug.title)

      if (_.some(notTotalComparingGroups, gn => _.includes(selectedUgTitles, gn))) {
        // 已经选择了，不需要再选
        return
      }
      let ugId = _.find(selectedUserGroupIds, ugId => _.some(dataSourceCompareUserGroups, ug0 => ug0.id === ugId))
      let ug = ugId && _.find(dataSourceCompareUserGroups, ug0 => ug0.id === ugId)
      this.onComparingFunnelDataChange(['总体', ug && ug.title].filter(_.identity))
    }
  }

  renderDimensionComparingFunnelFetcher({currFunnel}) {
    let {
      params: {
        compareByDimension,
        compareByDimensionDistinctValues = []
      } = {}
    } = currFunnel

    // 注意：本身漏斗的查询是支持通过 dimension 参数来一次查询多个值的对比数据，但是因为后来发现一次查询，
    // 服务器只能返回 250 条数据，所以对比值太多的时候会查不出 total 数据，所以后面暂定改为分开查询
    let genSingleDimComparingDataFetcher = dimDistinctVal => this.genLuceneFetcher(
      immutateUpdate(currFunnel, 'params.extraFilters', flts => {
        return insert(flts, 0, {
          col: compareByDimension,
          op: 'equal',
          eq: [dimDistinctVal] // compareByDimensionDistinctValues
        })
      }),
      {
        // dimension: compareByDimension,
        onFetcherUnmount: () => this.setState({isLoadingDimensionCompareData: false})
      })

    return (
      <FetcherAgent
        fetcherComponent={LuceneFetcher}
        initState={{
          /* _funnel 只为触发重新加载全部数据 */
          _funnel: immutateUpdate(currFunnel, 'params', p => _.omit(p, 'comparingFunnelGroupName')),
          isAgentFetching: !_.isEmpty(compareByDimensionDistinctValues),
          dVals: compareByDimensionDistinctValues
        }}
        getFetcherProps={state => {
          let dVal = _.first(state.dVals)
          let {props} = genSingleDimComparingDataFetcher(dVal)
          return {...props, onFetcherUnmount: null, doFetch: !!dVal}
        }}
        setStateWhenFetchDone={(data, agentCurrState) => {
          // 往 event 写入分群信息
          let dVal = _.first(agentCurrState.dVals)

          let nextAccData = {...(agentCurrState.accData || {}), [dVal]: data}
          let nextQueue = _.drop(agentCurrState.dVals, 1)

          if (_.isEmpty(nextQueue)) {
            // done query
            this.setState({
              funnelDataAfterGroupBy: nextAccData,
              isLoadingDimensionCompareData: false
            }, () => {
              this.autoSelectFirstComparingTerm()
            })
            return {
              isAgentFetching: false,
              dVals: nextQueue,
              accData: {}
            }
          } else {
            this.setState({funnelDataAfterGroupBy: nextAccData})
            return {
              dVals: nextQueue,
              accData: nextAccData
            }
          }
        }}
        onFetchingStateChange={isLoading => {
          if (isLoading) {
            this.setState({isLoadingDimensionCompareData: true})
          }
        }}
        onFetcherUnmount={() => this.setState({isLoadingDimensionCompareData: false})}
      />
    )
  }

  renderUserGroupComparingFunnelFetcher({currFunnel}) {
    let { dataSourceCompareUserGroups, isFetchingDataSourceCompareUserGroups, datasourceCurrent } = this.props
    let {
      params: {
        selectedUserGroupIds,
        funnelMetric
      } = {}
    } = currFunnel
    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let genSingleUgDataFetcher = ugId => {
      let ug = _.find(dataSourceCompareUserGroups, u => u.id === ugId)
      let funnelMetric0 = _.get(ug, 'params.groupby')
      return this.genLuceneFetcher(
        immutateUpdate(currFunnel, 'params.extraFilters', flts => {
          return insert(flts, 0, {
            op: 'lookupin',
            col: funnelMetric0 || funnelMetric,
            eq: ugId
          })
        }),
        {
          doFetch: !isFetchingDataSourceCompareUserGroups,
          onFetcherUnmount: () => this.setState({isLoadingUsergroupCompareData: false})
        }
      )
    }

    return (
      <FetcherAgent
        fetcherComponent={LuceneFetcher}
        initState={{
          /* _funnel 只为触发重新加载全部数据 */
          _funnel: immutateUpdate(currFunnel, 'params', p => _.omit(p, 'comparingFunnelGroupName')),
          isAgentFetching: !isFetchingDataSourceCompareUserGroups && !_.isEmpty(selectedUserGroupIds),
          ugIdsToFetch: selectedUserGroupIds
        }}
        getFetcherProps={state => {
          let ugId = _.first(state.ugIdsToFetch)
          let {props} = genSingleUgDataFetcher(ugId)
          return {...props, onFetcherUnmount: null, doFetch: ugId ? props.doFetch : false}
        }}
        setStateWhenFetchDone={(data, agentCurrState) => {
          // 往 event 写入分群信息
          let ugIdDoneQuery = _.first(agentCurrState.ugIdsToFetch)
          let ugNameDoneQuery = _.get(_.find(dataSourceCompareUserGroups, ug => ug.id === ugIdDoneQuery), 'title')

          let nextAccData = {...(agentCurrState.accData || {}), [ugNameDoneQuery]: data}
          let nextQueue = _.drop(agentCurrState.ugIdsToFetch, 1)

          if (_.isEmpty(nextQueue)) {
            // done query
            this.setState({
              funnelDataAfterGroupBy: nextAccData,
              isLoadingUsergroupCompareData: false
            }, () => {
              this.autoSelectFirstComparingTerm()
            })
            return {
              isAgentFetching: false,
              ugIdsToFetch: nextQueue,
              accData: {}
            }
          } else {
            this.setState({funnelDataAfterGroupBy: nextAccData})
            return {
              ugIdsToFetch: nextQueue,
              accData: nextAccData
            }
          }
        }}
        onFetchingStateChange={isLoading => {
          if (isLoading) {
            this.setState({isLoadingUsergroupCompareData: true})
          }
        }}
        onFetcherUnmount={() => this.setState({isLoadingUsergroupCompareData: false})}
      />
    )
  }

  renderFunnelDetail() {
    let {
      params: {funnelId: funnelIdInUrl},
      dataSourceDimensions,
      datasourceCurrent,
      currFunnel,
      vizType,
      hideLineChartSteps,
      updateHashStateByPath,
      dimNameDict,
      dataSourceCompareUserGroups,
      location
    } = this.props
    if (!currFunnel) {
      currFunnel = genInitFunnel(datasourceCurrent)
    }

    let {
      druid_datasource_id,
      params: {
        compareType = CompareTypeEnum.dimensions,
        compareByDimension,
        compareByDimensionDistinctValues = [],
        selectedUserGroupIds,
        commonDimensions,
        funnelLayers2d = [],
        granularity,
        comparingFunnelGroupName = ['总体']
      } = {}
    } = currFunnel

    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let {funnelTotalData, funnelDataAfterGroupBy, dailyTransferModalVisible} = this.state

    // 判断维度权限
    let allDimPreCheckPermission = (commonDimensions || []).concat(datasourceCurrent && datasourceCurrent.params.commonMetric || [])
    let dbDimAbsent = allDimPreCheckPermission.filter(dimName => !(dimName in dimNameDict))

    if (!compareType) {
      compareType = CompareTypeEnum.dimensions
    }
    let isEditing = this.isEditing()
    let isLoadingChartData = this.isLoadingChartData()
  
    // TODO 建议重写加载数据逻辑，改用 saga-model 或 async-task-runner
    return (
      <div className="sugoFunnels height-100 scroll-content relative always-display-scrollbar bg-grey-f7" >
        {!isEditing ? this.genLuceneFetcher(currFunnel) : null}

        {!isEditing && compareType === CompareTypeEnum.dimensions
        && compareByDimension && !_.isEmpty(compareByDimensionDistinctValues)
          ? this.renderDimensionComparingFunnelFetcher({currFunnel})
          : null}

        {!isEditing && compareType === CompareTypeEnum.userGroups && !_.isEmpty(selectedUserGroupIds)
          ? this.renderUserGroupComparingFunnelFetcher({currFunnel})
          : null}

        {this.renderBread()}

        {this.renderTopPanel()}

        {this.renderCreateOrEditButtons()}

        <hr className="mg2y borderb dashed"/>

        <div className="pd3x pd2t">
          {this.renderDruidFilterPanel()}

          {this.renderMetricalFieldSelector()}
        </div>

        {this.renderComparingSetting()}

        <div className="bg-fb pd1b pd3t">
          {comparingFunnelGroupName[1] ? this.renderComparingFunnel() : (
            <FunnelDisplayPanel
              {...{
                location,
                dataSourceCompareUserGroups,
                datasourceCurrent,
                dataSourceDimensions,
                dimNameDict,
                vizType,
                hideLineChartSteps,
                isLoadingChartData,
                funnelTotalData,
                funnelDataAfterGroupBy,
                currFunnel,
                onLineChartStepToggle: stepIndex => this.toggleStep(stepIndex),
                funnelCompareGroupName: comparingFunnelGroupName[0],
                className: 'comparing-left'
              }}
            />
          )}

          {/* 漏斗对比 */}
          {!isEditing && funnelIdInUrl && !dbDimAbsent.length
          && commonDimensions && commonDimensions.length !== 0 && 1 <= funnelLayers2d.length
            ? (
              <div className="mg3 funnel-card">
                <ComparingTable
                  {...this.props}
                  currFunnel={currFunnel}
                  funnelTotalData={funnelTotalData}
                  funnelDataAfterGroupBy={funnelDataAfterGroupBy}
                  isLoadingFunnelStatisticData={isLoadingChartData}
                  comparingFunnelGroupName={comparingFunnelGroupName}
                  onComparingFunnelDataChange={this.onComparingFunnelDataChange}
                />
              </div>
            )
            : null}
        </div>

        <DailyTransferModal
          visible={dailyTransferModalVisible}
          onVisibleChange={visible => {
            this.setState({dailyTransferModalVisible: visible})
          }}
          comparingFunnelGroupName={comparingFunnelGroupName}
          {...{funnelTotalData, funnelLayers2d, funnelDataAfterGroupBy, granularity: granularity || 'P1D'}}
        />
      </div>
    )
  }

  toggleStep(step) {
    let {hideLineChartSteps, updateHashState} = this.props

    if (_.includes(hideLineChartSteps, step)) {
      updateHashState({
        hideLineChartSteps: hideLineChartSteps.filter(s => s !== step),
        vizType: hideLineChartSteps.length === 1 ? 'funnel' : 'line'
      })
    } else {
      updateHashState({
        hideLineChartSteps: hideLineChartSteps.concat([step]).sort(),
        vizType: 'line'
      })
    }
  }

  saveFunnel = async (nextFunnel) => {
    let {reloadSugoFunnels} = this.props
    const { tempName } = this.state
    let newName = _.trim(tempName === undefined ? nextFunnel.funnel_name : tempName)
    this.setState({savingFunnelState: SavingFunnelStateEnum.Saving})

    // TODO 只保存有用的参数 params
    let newFunnel = {
      ...nextFunnel,
      funnel_name: newName
    }

    // 这个接口返回的不是 json 所以不能用 Fetch utils
    let url = newFunnel.id ? URL.UPDATE_SUGO_FUNNELS : URL.CREATE_SUGO_FUNNELS
    let res = await Fetch.post(url, newFunnel)
    this.setState({savingFunnelState: SavingFunnelStateEnum.Idle})

    if (res && !res.error) {
      message.success('保存成功', 2)
      this.setState({showSavePop: false})
      // 漏斗列表变更后会自动调整，逻辑在 index.componentWillReceiveProps
      await reloadSugoFunnels()
      // 如果是新建的就切换到新建的记录
      let newFunnelId = _.get(res, 'result.id')
      if (newFunnelId !== nextFunnel.id && newFunnelId) {
        patchPush('/console/funnel/' + newFunnelId)
        return newFunnelId
      }
      return nextFunnel.id
    }
  }

  handleSave = async (type) => {
    const { currFunnel, sugoFunnels } = this.props
    const { tempName } = this.state
    let newName = _.trim(tempName === undefined ? currFunnel.funnel_name : tempName)
    const saveId = type === 'saveAs' ? null : currFunnel.id
    if (!newName) {
      message.error('漏斗名称不能为空')
      return
    }
    if (_.some(sugoFunnels || [], r => r.druid_datasource_id === currFunnel.druid_datasource_id && r.id !== saveId && r.funnel_name === newName)) {
      message.error(`保存失败，存在重名的漏斗: ${newName}`)
      return
    }
    let f2d = _.get(currFunnel, 'params.funnelLayers2d', [])
    if (f2d.length < 2) {
      message.error('漏斗步骤太少，不能保存')
      return
    }
    // updateHashStateByPath('currFunnel.funnel_name', () => newName)
    if (type === 'saveAs' || _.startsWith(currFunnel.id, 'temp_')) {
      return await this.saveFunnel(_.omit(currFunnel, 'id'))
    }
    return await this.saveFunnel(currFunnel)
  }

  checkSameFunnelName = _.debounce(async(funnelId = 0, newName) => {
    if (!newName) {
      this.setState({savingFunnelState: SavingFunnelStateEnum.CheckingFailureNoName})
      return
    }
    this.setState({savingFunnelState: SavingFunnelStateEnum.Checking})

    let res = await Fetch.get(`/app/funnel/get/?name=${newName}&exclude_id=${funnelId}`)
    if (!res) {
      this.setState({savingFunnelState: SavingFunnelStateEnum.CheckingFailure})
      return
    }
    let {result} = res
    if (result.length !== 0) {
      this.setState({savingFunnelState: SavingFunnelStateEnum.HasSameName})
    } else {
      this.setState({savingFunnelState: SavingFunnelStateEnum.CanSave})
    }
  }, 1300)

  genSaveFunnelPopoverContent(currFunnel) {
    let {id: currentFunnelId, funnel_name} = currFunnel
    let {tempName, savingFunnelState} = this.state
    let canSaveOnly = !currentFunnelId || _.startsWith(currentFunnelId, 'temp_')
    if (!canCreate && !(canEdit && !canSaveOnly)) {
      return null
    }
    return (
      <Tabs
        defaultActiveKey={canSaveOnly || !canEdit ? 'saveAs' : 'update'}
        className="width300"
        onChange={this.checkNewName}
      >
        {canSaveOnly || !canEdit ? null : (
          <TabPane tab="更新当前漏斗" key="update" disabled={canSaveOnly}>
            <Row>
              <Col className="pd1" span={24}>漏斗名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={tempName === undefined ? funnel_name : tempName}
                  className="width-100"
                  onChange={ev => {
                    this.checkSameFunnelName(currFunnel.id, ev.target.value)
                    this.setState({tempName: ev.target.value})
                  }}
                  placeholder="未输入名称"
                />
              </Col>
              <Col className="pd1 alignright" span={24}>
                {/*saveTip*/}
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  className="width-100"
                  onClick={() => this.handleSave('update')}
                  //disabled={savingFunnelState === SavingFunnelStateEnum.Checking || savingFunnelState === SavingFunnelStateEnum.HasSameName}
                  loading={savingFunnelState === SavingFunnelStateEnum.Saving}
                >更新</Button>
              </Col>
            </Row>
          </TabPane>
        )}

        {!canCreate ? null : (
          <TabPane tab="另存为新漏斗" key="saveAs">
            <Row>
              <Col className="pd1" span={24}>漏斗名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={tempName === undefined ? funnel_name : tempName}
                  className="width-100"
                  onChange={ev => {
                    this.checkSameFunnelName(null, ev.target.value)
                    this.setState({tempName: ev.target.value})
                  }}
                  placeholder="未输入名称"
                />
              </Col>
              <Col className="pd1 alignright" span={24}>
                {/*saveTip*/}
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  className="width-100"
                  onClick={() => this.handleSave('saveAs')}
                  //disabled={savingFunnelState === SavingFunnelStateEnum.Checking || savingFunnelState === SavingFunnelStateEnum.HasSameName}
                  loading={savingFunnelState === SavingFunnelStateEnum.Saving}
                >保存</Button>
              </Col>
            </Row>
          </TabPane>
        )}
      </Tabs>
    );
  }
  
  genSaveSlicePopoverContent(currFunnel) {
    let {projectCurrent} = this.props
    let {id: currentFunnelId, funnel_name} = currFunnel
    let {tempName, savingFunnelState} = this.state
    const tempSliceName = tempName === undefined ? `漏斗 ${funnel_name || '未命名漏斗'} 的关联单图` : tempName
    return (
      <Tabs className="width300" >
        {!canCreateSlice ? null : (
          <TabPane tab="另存为单图" key="saveAs">
            <Row>
              <Col className="pd1" span={24}>单图名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={tempSliceName}
                  className="width-100"
                  onChange={ev => {
                    this.setState({tempName: ev.target.value})
                  }}
                  placeholder="未输入名称"
                />
              </Col>
              <Col className="pd1 alignright" span={24}>
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  className="width-100"
                  onClick={async () => {
                    let isCreating = !currentFunnelId || _.startsWith(currentFunnelId, 'temp_')
                    if (isCreating) {
                      // 根据单图名称解析出漏斗名
                      let funnelName = _.trim(tempSliceName.replace(/^漏斗|的关联单图$/g, '')) || '未命名漏斗'
                      await new Promise(resolve => this.setState({tempName: funnelName}, resolve))
                    }
                    const funnelId = isCreating ? await this.handleSave('saveAs') : currentFunnelId
                    if (!funnelId) {
                      return
                    }
                    let createSliceRes = await Fetch.post('/app/slices/create/slices', {
                      druid_datasource_id: projectCurrent.datasource_id,
                      slice_name: tempSliceName,
                      params: {
                        vizType: 'sugo_funnel',
                        openWith: 'SugoFunnel',
                        chartExtraSettings: { relatedFunnelId: funnelId }
                      }
                    })
                    if (createSliceRes) {
                      message.success('保存单图成功')
                    }
                  }}
                  loading={savingFunnelState === SavingFunnelStateEnum.Saving}
                >保存</Button>
              </Col>
            </Row>
          </TabPane>
        )}
      </Tabs>
    );
  }

  renderSettingGuide = () => {
    let {projectCurrent} = this.props
    return (
      <div className="center-of-relative aligncenter">
        <img
          className="itblock"
          src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/ui-nothing.png`}
          alt="Error hint"
        />
        <p className="mg2y">
          要使用漏斗分析, 请到
          <Auth
            className="mg1x"
            auth="/console/project/datasource-settings"
            alt={<b>场景数据设置</b>}
          >
            <Link
              className="pointer bold mg1x"
              to={`/console/project/datasource-settings?id=${projectCurrent && projectCurrent.id}`}
            >场景数据设置</Link>
          </Auth>
          为此项目设定
          <b className="color-red mg1x" key={1}>用户行为维度</b>
        </p>
        <Link
          className="pointer bold"
          to={`/console/project/datasource-settings?id=${projectCurrent && projectCurrent.id}`}
        >
          <Button type="primary" className="width140">马上设置</Button>
        </Link>
      </div>
    )
  }

  render() {
    let isEditing = this.isEditing()
    let isLoadingChartData = this.isLoadingChartData()
    let {
      vizType, hideLineChartSteps, currFunnel, datasourceCurrent, dataSourceDimensions,
      updateHashStateByPath, params: {funnelId: funnelIdInUrl}, sugoFunnels, projectCurrent
    } = this.props

    let {funnelTotalData, funnelDataAfterGroupBy} = this.state

    let comparingFunnelGroupName = _.get(currFunnel, 'params.comparingFunnelGroupName') || ['总体']

    let commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || []
    if (!commonDimensions || commonDimensions.length === 0) {
      return (
        <div className="relative height-100">
          {this.renderSettingGuide()}
        </div>
      )
    }

    if (!funnelIdInUrl) {
      return (
        <div className="sugoFunnels height-100 scroll-content relative always-display-scrollbar">
          {this.renderBread()}

          {this.renderTopPanel()}

          {this.renderCreateOrEditButtons()}
        </div>
      )
    }

    if (isEditing) {
      return (
        <div className="sugoFunnels height-100 scroll-content relative always-display-scrollbar pd3b">
          {this.renderBread()}
          <div className="pd3x pd1t font16">
            {funnelIdInUrl === 'new' ? '创建漏斗' : '编辑漏斗'}
          </div>
          <FunnelEditingPanel
            {...{
              projectCurrent,
              funnelIdInUrl,
              sugoFunnels,
              dataSourceDimensions,
              vizType,
              isEditing,
              hideLineChartSteps,
              isLoadingChartData,
              updateHashStateByPath,
              funnelTotalData,
              funnelDataAfterGroupBy,
              currFunnel,
              onLineChartStepToggle: stepIndex => this.toggleStep(stepIndex),
              funnelCompareGroupName: comparingFunnelGroupName[0],
              genInitFunnel: () => genInitFunnel(datasourceCurrent),
              datasourceCurrent
            }}
          />

          <hr className="mg2y borderb dashed"/>

          <div className="pd3x pd1t">
            {this.renderDruidFilterPanel()}
            {this.renderMetricalFieldSelector()}
          </div>

          <Button
            type="primary"
            className="width160 mg2t mg3l"
            disabled={(_.get(currFunnel, 'params.funnelLayers2d') || []).length < 2}
            onClick={() => {
              let funnel0 = currFunnel
              console.log("1111111111111111",currFunnel)
              if (!funnel0.id) {
                funnel0 = {...currFunnel, id: `temp_${this.props.selectedGroupKey}`}
              }
              funnel0 = immutateUpdates(funnel0, 'params.funnelLayers2d', lArr => {
                return lArr.map(subLayer => {
                  // 排除空的子层
                  // [["or"],["xxx"], [], ["bbb"]] -> [["or"], ["xxx"], ["bbb"]]
                  // [["or"],["xxx"],[]] -> ["xxx"]
                  if (_.isArray(subLayer[0])) {
                    let [cond, ...subLayerArr] = subLayer
                    subLayerArr = subLayerArr.filter(_.some)
                    if (subLayerArr.length === 1) {
                      return _.take(subLayerArr[0], commonDimensions.length)
                    }
                    return [cond, ...subLayerArr.map(sl => _.take(sl, commonDimensions.length))]
                  } else {
                    // 排除无用的值
                    return _.take(subLayer, commonDimensions.length)
                  }
                })
              }, 'params.commonDimensions', commonDimensions => {
                return _.get(datasourceCurrent, 'params.commonDimensions') || commonDimensions
              })

              let hash = compressUrlQuery(JSON.stringify({
                vizType: 'funnel',
                hideLineChartSteps: [],
                currFunnel: funnel0
              }))
              if (funnelIdInUrl) {
                patchReplace(`/console/funnel/${funnel0.id}#${hash}`)
              } /*else if (sugoFunnels[0]) {
                browserHistory.replace(`/console/funnel/${sugoFunnels[0].id}#${hash}`)
              }*/
            }}
          >{funnelIdInUrl === 'new' ? '完成创建' : '确认修改'}</Button>
        </div>
      )
    }
    return this.renderFunnelDetail()
  }
}

let Wrapped = (() => {
  let WithHashState = withHashState(SugoFunnel, undefined, ({datasourceCurrent, sugoFunnels, params}) => {
    let initTargetId = params.funnelId
    // sugoFunnels 未加载完，等它加载完后会初始化
    if (_.isEmpty(sugoFunnels) && (initTargetId && initTargetId !== 'new')) {
      return ({
        vizType: 'funnel',
        hideLineChartSteps: [],
        currFunnel: undefined
      })
    }
    let dsId = datasourceCurrent && datasourceCurrent.id || ''
    let firstFunnel = _.find(sugoFunnels, fu => fu.druid_datasource_id === dsId)
    return ({
      vizType: 'funnel',
      hideLineChartSteps: [],
      currFunnel: firstFunnel ? firstFunnel : genInitFunnel(datasourceCurrent)
    })
  })
  function ExcludeStoppedProject(props) {
    let {projectList, sugoFunnels} = props
    let activeDataSourcesIdSet = new Set(projectList.map(p => p.datasource_id))
    let funnelFilter = sl => activeDataSourcesIdSet.has(sl.druid_datasource_id)
    return (
      <WithHashState {...{...props, sugoFunnels: sugoFunnels.filter(funnelFilter)}} />
    )
  }

  let WithSugoFunnels = withFunnels(ExcludeStoppedProject, ({params, datasourceList, datasourceCurrent}) => {
    let dsId = datasourceCurrent && datasourceCurrent.id || ''
    return {
      // fix #2290 加载完数据源后再加载漏斗，避免没有数据源时，漏斗被 ExcludeStoppedProject 完全过滤，然后无法选中
      dataSourceId: dsId,
      doFetch: !!(dsId && datasourceList),
      onLoaded: funnels => {
        // 自动选择有效的漏斗，并切换数据源
        let dsId = datasourceCurrent && datasourceCurrent.id
        let currDsFunnels = funnels.filter(fu => fu.druid_datasource_id === dsId)

        let initTargetId = params.funnelId

        let firstFunnel = currDsFunnels[0]
        if (!firstFunnel) {
          // 默认选择一个数据源
          let hash = compressUrlQuery(JSON.stringify({
            vizType: 'funnel',
            hideLineChartSteps: [],
            currFunnel: genInitFunnel(datasourceCurrent)
          }))
          patchReplace(`/console/funnel/new#${hash}`)
        } else if (!initTargetId || !_.some(currDsFunnels, fu => fu.id === initTargetId)) {
          // 修改、新增、保存、删除
          patchPush('/console/funnel/' + firstFunnel.id)
        }
      }
    }
  })
  let WithUserGroups = withUserGroups(WithSugoFunnels, (props) => {
    let dsId = _.get(props, 'datasourceCurrent.id') || ''
    return {
      dataSourceId: dsId,
      doFetch: !!dsId
    }
  })
  return withDataSourceDimensions(WithUserGroups, props => {
    let dsId = _.get(props, 'datasourceCurrent.id') || ''
    return {
      dataSourceId: dsId,
      doFetch: !!dsId,
      exportNameDict: true
    }
  })
})()

export default Wrapped
