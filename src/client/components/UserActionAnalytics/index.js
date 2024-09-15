import React from 'react'
import { withSlices } from '../Fetcher/slices-fetcher'
import _ from 'lodash'
import { CloseOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import { Select, Popover, Tooltip, Button, Input, Row, Col, message, Tabs, Popconfirm } from 'antd'
import { withHashState } from '../Common/hash-connector'
import { withDataSourceDimensions } from '../Fetcher/data-source-dimensions-fetcher'
import { withDataSourceMeasures } from '../Fetcher/data-source-measures-fetcher'
import { withUserGroups } from '../Fetcher/data-source-compare-user-group-fetcher'
import classNames from 'classnames'
import {immutateUpdate, immutateUpdates, isDiffByPath} from '../../../common/sugo-utils'
import { browserHistory, Link } from 'react-router'
import Alert from '../Common/alert'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {DruidColumnTypeInverted, isTimeDimension} from '../../../common/druid-column-type'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import {
  checkVizTypeEnable,
  vizTypeHintMapForUserAction,
  vizTypeIconMap,
  vizTypeNameMap
} from '../../constants/viz-component-map'
import SliceChartFacade from '../Slice/slice-chart-facade'
import {defaultFormat} from '../../../common/param-transform'
import moment from 'moment'
import {dateOptions} from '../Common/time-picker'
import {findOrCreateTempUsergroup, saveAndBrowserInInsight, sliceToUsergroup} from '../../common/usergroup-helper'
import {Auth, checkPermission} from '../../common/permission-control'
import * as dashboardActions from '../../actions/dashboards'
import SingleDistinct from '../Common/distinct-cascade'
import MaxTimeFetcher from '../Fetcher/max-time-fetcher'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import DimensionSettingPopover, {possibleLimit as DIMENSION_POSSIBLE_LIMIT} from '../Analytic/dimension-setting-popover'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import { bindActionCreators } from 'redux'
import {includeCookie, noCache, recvJSON} from '../../common/fetch-utils'
import Icon from '../Common/sugo-icon'
import UserGroupSelector, {getUsergroupByBuiltinId, isBuiltinUsergroupId} from '../Common/usergroup-selector'
import {transformBuiltinUserGroups} from 'common/druid-query-utils'
import {BuiltinUserGroup} from 'common/constants'
import {insightUserById} from 'client/common/usergroup-helper'
import {PermissionLink} from 'client/common/permission-control'
import {isNumberDimension} from 'common/druid-column-type'
import extractNumberRange from 'common/number-range'
import {renderPageTitle} from '../Common/bread'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'

const canCreate = checkPermission('post:/app/slices/userAction/')
const canEdit = checkPermission('put:/app/slices/userAction/:id')
const canDelete = checkPermission('delete:/app/slices/userAction/:id')

const defaultFormat0 = defaultFormat()
const TabPane = Tabs.TabPane
let noCacheParams = _.defaultsDeep({}, recvJSON, noCache, includeCookie)
const SavingSliceStateEnum = {
  Idle: 0,
  Checking: 1,
  CheckingFailure: 2,
  HasSameName: 3,
  CanSave: 4,
  Saving: 5,
  EmptyName: 6
}

const getMetrics = (retentionMetricalField = 'distinct_id', ssid = 'session_id') => {
  let metrics = [
    {
      'title': '总次数',
      'name': '_tempMetric_eventCount',
      'formula': '$main.count()',
      'pattern': '.0f',
      'group': 0,
      'description': '点击事件总量'
    },
    {
      'title': '总人数',
      'name': '_tempMetric_userCount',
      'formula': `$main.countDistinct($${retentionMetricalField})`,
      // 'formula': `$main.countDistinct($${retentionMetricalField}, 'sketch', 5)`,
      'pattern': '.0f'
    },
    {
      'title': '平均次数',
      'name': '_tempMetric_eventMeanBySession',
      'formula': `$main.count()/$main.countDistinct($${ssid})`,
      'pattern': '.2f',
      'group': 0,
      'description': '平均每个会话的点击量'
    },
    {
      'title': '人均次数',
      'name': '_tempMetric_eventMeanByUser',
      'formula': `$main.count()/$main.countDistinct($${retentionMetricalField})`,
      'pattern': '.2f',
      'group': 0,
      'description': '平均每人的点击量'
    },
    {
      'title': '总时长',
      'name': '_tempMetric_durationCount',
      'formula': '$main.sum($duration)',
      'pattern': '.2f'
    },
    {
      'title': '平均浏览时长',
      'name': '_tempMetric_durationMeanBySession',
      'formula': `$main.sum($duration)/$main.countDistinct($${ssid})`,
      'pattern': '.2f'
    },
    {
      'title': '人均浏览时长',
      'name': '_tempMetric_durationMeanByUser',
      'formula': `$main.sum($duration)/$main.countDistinct($${retentionMetricalField})`,
      'pattern': '.2f'
    }
  ]
  return metrics
}

const DefaultMaxSubQueryCount = 125
let ExcludeDateTypeTitleSet = new Set(['今年', '去年', '最近一年'])
const localDateOptions = immutateUpdate(dateOptions(), 'natural', titleAndDateTypes => {
  return titleAndDateTypes.filter(({ title }) => !ExcludeDateTypeTitleSet.has(title))
})
const { OptGroup, Option } = Select

function appendDimension(updateHashStateByPath, dataSourceDimensions, dimension) {
  updateHashStateByPath('slice.params', prevParams => {
    // 删除原先的 dimensionExtraSettings
    prevParams = immutateUpdate(prevParams, 'dimensionExtraSettingDict', prevDict => _.omit(prevDict))
    // 如果选择了时间列，按时间升序
    if (_.some(dataSourceDimensions, dbDim => dbDim.name === dimension && isTimeDimension(dbDim))) {
      prevParams = immutateUpdate(prevParams, `dimensionExtraSettingDict.${dimension}`, prevSetting => {
        return {
          ...(prevSetting || {}),
          sortCol: dimension,
          sortDirect: 'asc'
        }
      })
    }
    let newde = immutateUpdate(prevParams, 'dimensions', () => [dimension])//...prevDimensions,
    return newde
  })
}

const defaultDate = {
  relativeTime: '-30 days',
  since: moment().add(-30, 'd').format('YYYY-MM-DD'),
  until: moment().format('YYYY-MM-DD')
}

const getPopupContainer = () => document.querySelector('.scroll-content')

class UserActionAnalytic extends React.Component {

  state = {
    savingState: SavingSliceStateEnum.Idle,
    saveAsSavingState: SavingSliceStateEnum.Idle,
    isLoadingChartData: false,
    visiblePopoverKey: null,
    saveAsName: '',
    querySlice: null,
    retentionMetricalField: '',
    eventDateFileter: {
      since: '',
      until: ''
    },
    selectSaveTabPane: 'saveAs'
  }

  componentWillMount() {
    let { slice } = this.props
    if (slice) {
      this.setState({
        saveAsName: slice.slice_name,
        querySlice: null
      })
    }
  }

  componentWillReceiveProps(nextProps) {
    let { params: nextParams, slices } = nextProps
    let { params, datasourceCurrent, reloadSlices, dataSourceCompareUserGroups } = this.props
    if (datasourceCurrent.id !== nextProps.datasourceCurrent.id) {
      reloadSlices()
      browserHistory.push('/console/user-action-analytics')
      this.setState({ querySlice: null })
    }
    if (slices.length && nextParams.sliceId !== params.sliceId ) {
      let newSlice
      if (!nextParams.sliceId) {
        newSlice = genEmptySlice(datasourceCurrent && datasourceCurrent.id)
      } else {
        newSlice = _.find(slices, v => v.id === nextParams.sliceId)
      }
      if (newSlice) {
        let currUgId = _.get(nextProps, 'location.query.usergroup_id')
        if (currUgId && currUgId !== 'all') {
          let selectGroups = isBuiltinUsergroupId(currUgId)
            ? getUsergroupByBuiltinId(currUgId, nextProps.datasourceCurrent)
            : _.find(dataSourceCompareUserGroups, p => p.id === currUgId)

          if (selectGroups) {
            newSlice = immutateUpdate(newSlice, 'params.filters', p => {
              return [...p, { eq: selectGroups.id, col: _.get(selectGroups, 'params.groupby'), op: 'lookupin' }]
            })
          }
        }
        this.setState({
          selectSaveTabPane: nextParams.sliceId && canEdit ? 'update' : 'saveAs',
          saveAsName : newSlice.slice_name,
          querySlice: newSlice.id ? newSlice : null
        })
        this.props.updateHashStateByPath('slice', () => newSlice)
      }
    }
  
    if (isDiffByPath(this.props.slice, nextProps.slice, 'druid_datasource_id')) {
      this.commonDimsSet = null
    }
    if ((nextProps.datasourceCurrent.id !== datasourceCurrent.id || !this.state.retentionMetricalField) && _.get(nextProps.datasourceCurrent, 'params.commonMetric')) {
      this.setState({ retentionMetricalField: nextProps.datasourceCurrent.params.commonMetric[0] })
    }

    // 因为 统计字段需要直接使用分群的统计字段，所以分群变更后，需要设置统计字段
    // 没有选择分群时，能够选择 统计字段，否则不能选择
    if (isDiffByPath(this.props, nextProps, 'location.query.usergroup_id')
      && _.get(this.props, 'slice.druid_datasource_id') === _.get(datasourceCurrent, 'id')
    ) {
      this.resetGroupByField(nextProps)
    }
  }

  resetGroupByField(nextProps) {
    let commonMetric = _.get(nextProps.datasourceCurrent, 'params.commonMetric')
    if (_.isEmpty(commonMetric)) {
      return
    }
    let nextUgId = _.get(nextProps, 'location.query.usergroup_id')
    let nextUg = nextUgId && (isBuiltinUsergroupId(nextUgId)
      ? getUsergroupByBuiltinId(nextUgId, nextProps.datasourceCurrent)
      : _.find(nextProps.dataSourceCompareUserGroups, ug => ug.id === nextUgId))

    if (nextUg) {
      let nextMetricalField = nextUg.params.groupby
      this.onChangeMetricalField(nextMetricalField)
    } else {
      this.onChangeMetricalField(commonMetric[0])
    }
  }

  toggleInOverview = () => {
    let {slice} = this.props
    dashboardActions.updateOverview(
      slice,
      this.updateSlicePropFactory('inOverview', !slice.inOverview)
    )
  }

  toggleSubscribed = () => {
    let {slice} = this.props
    dashboardActions.updateSliceSubscribe(
      slice,
      this.updateSlicePropFactory('subscribed', !slice.subscribed)
    )
  }

  afterShare = slice => {
    this.updateSlicePropFactory('shareToRoles', slice.shareToRoles)()
  }

  switchSlices = (slId) => {
    browserHistory.push(`/console/user-action-analytics/${slId}`)
  }

  async saveSlice(isSaveToNew = false, savingStateName = 'savingState', extraOverwrite = null) {
    let { slice, saveSlice, projectCurrent, reloadSlices } = this.props
    let newSlice = immutateUpdate(slice, 'params.openWith', () => 'UserActionAnalytics')
    if (extraOverwrite) {
      newSlice = {...newSlice, ...extraOverwrite}
    }
    if (!newSlice.druid_datasource_id) {
      newSlice.druid_datasource_id = projectCurrent.datasource_id
    }

    if (!newSlice.slice_name.trim()) {
      this.setState({[savingStateName]: SavingSliceStateEnum.EmptyName})
      message.error('保存失败: 名称不能为空')
      return
    }

    if (!_.get(newSlice, 'params.vizType')) {
      message.error('保存失败: 没有选择图表类型')
      return
    }

    if (_.get(newSlice, 'params.metrics', []).length === 0) {
      message.error('保存失败: 没有设置事件')
      return
    }


    if (isSaveToNew) {
      delete newSlice.id
      newSlice.shareRoles = []
      newSlice.shares = []
    }

    this.setState({[savingStateName]: SavingSliceStateEnum.Saving})

    let res = await saveSlice(newSlice)
    if (res && res.status === 409) {
      this.setState({[savingStateName]: SavingSliceStateEnum.HasSameName })
    }
    if (res && 400 <= res.status) {
      return
    }
    this.setState({
      [savingStateName]: SavingSliceStateEnum.Idle,
      showSavingModel: false
    })
    message.success('保存成功', 2)
    await reloadSlices()
    if (isSaveToNew) {
      let sid = res.result.id || newSlice.id
      browserHistory.push(`/console/user-action-analytics/${sid}`)
    }
  }

  saveAsNewSlice = (isSaveToNew = true) => {
    let { saveAsName } = this.state
    let { slice } = this.props
    if (!saveAsName && slice) saveAsName = slice.slice_name
    if (!saveAsName) {
      message.warn('请先输入新单图名称')
      return
    }
    this.saveSlice(isSaveToNew, 'saveAsSavingState', { slice_name: saveAsName })
  }

  onSaveAsSliceNameChange = ev => {
    let val = ev.target.value
    this.setState({
      saveAsName: val,
      saveAsSavingState: SavingSliceStateEnum.Idle,
      visiblePopoverKey: null
    })
  }

  onQueryClick = () => {
    let currUgId = _.get(this.props, 'location.query.usergroup_id')
    let { slice, dataSourceCompareUserGroups, projectCurrent } = this.props
    if (currUgId && currUgId !== 'all') {
      let selectGroups = isBuiltinUsergroupId(currUgId)
        ? getUsergroupByBuiltinId(currUgId, this.props.datasourceCurrent)
        : _.find(dataSourceCompareUserGroups, p => p.id === currUgId)

      slice = immutateUpdate(slice, 'params.filters', p => {
        return [...p, { eq: selectGroups.id, col: _.get(selectGroups, 'params.groupby'), op: 'lookupin' }]
      })
    }
    if (!slice.druid_datasource_id) {
      slice.druid_datasource_id = projectCurrent.datasource_id
      slice.datasource_name = projectCurrent.datasource_name
    }
    if (_.isEqual(slice, this.state.querySlice)) {
      let reloadDruidDataFunc = _.get(this._sliceChartFacade, 'props.reloadDruidData')
      if (reloadDruidDataFunc) {
        reloadDruidDataFunc(undefined, noCacheParams)
      }
    } else {
      this.setState({ querySlice: slice })
    }
  }

  renderSaveAsButton() {
    let { saveAsName, saveAsSavingState, selectSaveTabPane } = this.state
    let { slice } = this.props
    let savePop = (
      <Tabs
        activeKey={selectSaveTabPane}
        className="width300"
        onChange={(val) => this.setState({selectSaveTabPane: val})}
      >
        {!_.get(slice, 'id') || !canEdit ? null : (
          <TabPane tab="更新当前事件" key="update">
            <Row>
              <Col className="pd1" span={24}>事件名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={saveAsName}
                  className="width-100"
                  onChange={this.onSaveAsSliceNameChange}
                  placeholder="未输入名称"
                />
              </Col>
              <Col className="pd1 alignright" span={24}>
                {/*saveTip*/}
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  className="width-100"
                  onClick={async () => {
                    await this.saveAsNewSlice(false)
                  }}
                  loading={saveAsSavingState === SavingSliceStateEnum.Saving.Saving}
                >更新</Button>
              </Col>
            </Row>
          </TabPane>
        )}

        {!canCreate ? null : (
          <TabPane tab="另存为新事件" key="saveAs">
            <Row>
              <Col className="pd1" span={24}>事件名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={saveAsName}
                  className="width-100"
                  onChange={this.onSaveAsSliceNameChange}
                  placeholder="未输入名称"
                />
              </Col>
              <Col className="pd1 alignright" span={24}>
                {/*saveTip*/}
                <Button
                  icon={<SaveOutlined />}
                  type="primary"
                  className="width-100"
                  onClick={async () => {
                    await this.saveAsNewSlice(true)
                  }}
                  loading={saveAsSavingState === SavingSliceStateEnum.Saving.Saving}
                >保存</Button>
              </Col>
            </Row>
          </TabPane>
        )}
      </Tabs>
    )
    return (
      <div>
        {(canCreate || (canEdit && _.get(slice, 'id'))) ? (
          <Popover
            key={_.get(slice, 'id') || 'temp'}
            content={savePop}
            placement="bottomRight"
          >
            <Button
              type="success"
              className="mg1r"
              icon={<SaveOutlined />}
            >{slice.id ? '保存' : '保存常用事件'}</Button>
          </Popover>
        ) : null}

        {!canDelete ? null : (
          <Popconfirm
            title={`确定删除事件分析 "${slice.slice_name}" 么？`}
            placement="topLeft"
            onConfirm={this.onDeleteSlice}
            className={classNames('mg1r', { hide: !slice.id })}
          >
            <Button
              icon={<CloseOutlined />}
              className={classNames('mg1r', { hide: !slice.id })}
            >删除</Button>
          </Popconfirm>
        )}
      </div>
    );
  }

  onInspectUserGroup = async () => {
    let { slice, datasourceCurrent } = this.props
    let dataSourceOfSlice = datasourceCurrent
    let metricalField = _.get(dataSourceOfSlice, 'params.commonMetric[0]')
    let commonSession = _.get(dataSourceOfSlice, 'params.commonSession')
    let commonDim = _.get(dataSourceOfSlice, 'params.commonDimensions[0]')

    if (!metricalField) {
      message.error('此项目没有设置 用户ID，不能查看分群')
      return
    }
    if (!commonSession) {
      message.error('此项目没有设置 SessionID，不能查看分群')
      return
    }
    if (!commonDim) {
      message.error('此项目没有设置 用户行为维度，不能查看分群')
      return
    }
    let userGroup = await sliceToUsergroup(slice, metricalField, {}, {
      backToRefererTitle: '查看关联单图',
      refererLink: `/console/user-action-analytics/${slice.id}`,
      backToRefererHint: '这个分群由行为事件分析创建，点击查看关联的单图'
    })
    let userGroupWithTotal = await findOrCreateTempUsergroup(userGroup)
    saveAndBrowserInInsight(userGroupWithTotal)
  }

  isEditable = () => {
    return true
  }

  isSavable = () => {
    return this.isEditable()
  }

  renderTempMetricTile = ({ disabled, style, ...rest }) => {
    let { dataSourceDimensions, slice, updateHashStateByPath, projectCurrent, datasourceCurrent } = this.props
    let commonDims = _.get(datasourceCurrent, 'params.commonDimensions') || []
    let { customMetrics, filters } = slice.params
    let { eventDateFileter } = this.state
    filters = filters.filter(p => p.filterType === 'event')
    let metricFiltersColNameDict = _.keyBy(filters, flt => flt.col)
    let dbDimNameDict = _.keyBy(dataSourceDimensions, dbDim => dbDim.name)
    let metrics = getMetrics(this.state.retentionMetricalField, datasourceCurrent.params.commonSession)
    var event = _.map(_.filter(slice.params.filters, f => f.col === 'event_type' || f.col === 'event_name'), p => {
      return p.eq.length ? p.eq[0] : ''
    })
    if (_.without(event, '停留', '').length) {
      _.pullAt(metrics, [4, 5, 6])
    }
    let selectMetics = _.get(this.props, 'slice.params.metrics[0]')
    return (
      <div className="itblock" style={style} {...rest}>
        {commonDims.map((commDimName) => {
          let dbDim = dbDimNameDict[commDimName]
          let {eq} = metricFiltersColNameDict[commDimName] || {}
          let prevLayerValues = _.filter(commonDims, p => p !== commDimName).map(commDimName0 => {
            if (!(commDimName0 in metricFiltersColNameDict)) {
              return null
            }
            let {col, eq} = metricFiltersColNameDict[commDimName0]
            return {col, val: eq[0]}
          }).filter(_.identity)
          if (!dbDim) {
            return null
          }
          return (
            <SingleDistinct
              getPopupContainer={getPopupContainer}
              dbDim={dbDim}
              disabled={disabled}
              key={commDimName}
              doFetch={false}
              showSelectAll
              since={eventDateFileter.since}
              until={eventDateFileter.until}
              dataSourceId={projectCurrent.datasource_id}
              prevLayerValues={prevLayerValues}
              value={eq}
              showAllowClear={false}
              onChange={v => {
                if (v !== '停留' && _.findIndex(metrics, p => p.name === selectMetics) > 3) {
                  updateHashStateByPath('slice.params', prev => {
                    return {
                      ...prev,
                      metrics: [metrics[0].name],
                      customMetrics: [metrics[0]]
                    }
                  })
                }
                updateHashStateByPath('slice.params.filters', metricModel => {
                  _.remove(metricModel, p => p.col === commDimName)
                  return [
                    ...metricModel,
                    {
                      col: commDimName,
                      op: 'equal',
                      eq: [v],
                      dimParams: dbDim.params,
                      filterType: 'event'
                    }]
                })
              }}
            />
          )
        })}
        <div className="iblock">的
          <Select
            getPopupContainer={getPopupContainer}
            className="iblock width120 mg1l"
            value={(customMetrics && customMetrics.length) ? customMetrics[0].name : metrics[0].name}
            disabled={disabled}
            onChange={this.onChangeMetric}
          >
            {
              metrics.map((p) => <Option key={p.name} value={p.name}>{p.title}</Option>)
            }
          </Select>
        </div>
      </div>
    )
  }

  onRemoveMetricClick = ev => {
    let metricName = ev.target.getAttribute('data-metric-name')

    let {updateHashStateByPath} = this.props
    updateHashStateByPath('slice.params', prevParams => {
      if (_.startsWith(metricName, '_tempMetric_')) {
        // 删除原先的 _tempMetric_
        prevParams = immutateUpdate(prevParams, 'tempMetricDict', prevDict => _.omit(prevDict, metricName))
      }
      return immutateUpdate(prevParams, 'metrics', prevMetrics => prevMetrics.filter(m => m !== metricName))
    })
  }

  renderDimSelector = ({dimName, ...rest}) => {
    let { slice, dataSourceDimensions} = this.props

    // 维度不能重复，只能从未选择的维度开始筛选
    let selectedDimSet = new Set(slice.params.dimensions.filter(name => name !== dimName))
    let dimsCanBeAppend = dataSourceDimensions.filter(dbDim => !selectedDimSet.has(dbDim.name))

    let commDimsSet = this.getCommonDimensionsSet()

    let commonDims = dimsCanBeAppend.filter(dbDim => commDimsSet.has(dbDim.name))

    let otherDims = dimsCanBeAppend.filter(dbDim => !commDimsSet.has(dbDim.name))
    return (
      <Select
        getPopupContainer={getPopupContainer}
        {...enableSelectSearch}
        dropdownMatchSelectWidth={false}
        value="选择分组查看"
        onChange={val => {
          this.onAppendDimension(dimName, val)
        }}
        {...rest}
        className="width150 mg2r"
        size='middle'
      >
        <OptGroup label="事件属性">
          {commonDims.map(dbDim => {
            return (
              <Option value={dbDim.name} key={dbDim.name}>{dbDim.title || dbDim.name}</Option>
            )
          })}
        </OptGroup>
        <OptGroup label="其他属性">
          {otherDims.map(dbDim => {
            return (
              <Option key={dbDim.name} value={dbDim.name}>{dbDim.title || dbDim.name}</Option>
            )
          })}
        </OptGroup>
      </Select>
    )
  }

  onRemoveDimensionClick = ev => {
    let dimName = ev.target.getAttribute('data-dimension-name')

    let {updateHashStateByPath} = this.props
    updateHashStateByPath('slice.params', prevParams => {
      // 删除原先的 dimensionExtraSettings
      prevParams = immutateUpdate(prevParams, 'dimensionExtraSettingDict', prevDict => _.omit(prevDict, dimName))
      return immutateUpdate(prevParams, 'dimensions', prevDims => prevDims.filter(m => m !== dimName))
    })
  }

  onRemoveFilterClick = ev => {
    let filterIdx = ev.target.getAttribute('data-filter-idx') * 1

    let {updateHashStateByPath} = this.props
    updateHashStateByPath('slice.params.filters', prevFilters => prevFilters.filter((f, i) => i !== filterIdx))
  }

  onChangeMetric = (val) => {
    let { datasourceCurrent, updateHashStateByPath } = this.props
    let metrics = getMetrics(this.state.retentionMetricalField, datasourceCurrent.params.commonSession)
    let metric = _.find(metrics, p => p.name === val)
    updateHashStateByPath('slice.params', prev => {
      return immutateUpdates(prev,
        'metrics', () => [metric.name],
        'customMetrics', () => [metric],
        `dimensionExtraSettingDict[${prev.dimensions[0]}].sortCol`,
        () => prev.dimensions[0])
    })
  }

  onDeleteSlice = async () => {
    let { slice, delSlice, reloadSlices } = this.props
    await delSlice(slice)
    message.success('删除成功', 2)
    await reloadSlices()
    browserHistory.push('/console/user-action-analytics')
  }

  onChangeMetricalField = (val) => {
    this.setState({ retentionMetricalField: val })
    let { updateHashStateByPath, datasourceCurrent } = this.props
    let selectedMetrics = this.props.slice.params.customMetrics
    let metricsNameDict = _.keyBy(getMetrics(val, datasourceCurrent.params.commonSession), 'name')
    let newMetrics = selectedMetrics.map(p => metricsNameDict[p.name])
    updateHashStateByPath('slice.params', prev => {
      return immutateUpdate(prev, '', p => {
        return { ...p, customMetrics: newMetrics }
      })
    })
  }

  onAppendDimension = (dimName, dimension) => {
    let { updateHashStateByPath, dataSourceDimensions } = this.props
    appendDimension(updateHashStateByPath, dataSourceDimensions, dimension, dimName)
  }

  onAppendFilter = () => {
    let {dataSourceDimensions, updateHashStateByPath} = this.props
    if (!dataSourceDimensions[0]) {
      message.error('没有属性项可选')
      return
    }
    updateHashStateByPath('slice.params.filters', prevFilters => {
      let dbDim = dataSourceDimensions[0]
      return [...prevFilters, {
        col: dbDim.name,
        op: 'in',
        eq: isTimeDimension(dbDim) ? '-1 days' : [],
        type: DruidColumnTypeInverted[dbDim.type]
      }]
    })
  }

  calcMaxDimLimitByIndex({ dimIdx, dimensions, dimensionExtraSettingDict, maxSubQueryCount = DefaultMaxSubQueryCount, smallerThanMin = 2 }) {
    // 最后一个维度无限制，因为它只会进行一次子查询
    if (dimIdx === dimensions.length - 1) {
      return _.last(DIMENSION_POSSIBLE_LIMIT)
    }
    // 最后一个维度的 limit 不影响查询次数
    let otherDimLimitProduct = _.take(dimensions, dimensions.length - 1)
      .filter((dimName, idx) => idx !== dimIdx)
      .map(dimName => _.get(dimensionExtraSettingDict, `${dimName}.limit`) || 10)
      .reduce((p, curr) => p * curr, 1)
    let myMax = maxSubQueryCount / otherDimLimitProduct
    return _.findLast(DIMENSION_POSSIBLE_LIMIT, pl => pl <= myMax) || smallerThanMin
  }

  renderSettingsForm() {
    let {
      slice,
      dataSourceDimensions,
      projectCurrent,
      updateHashStateByPath,
      slices,
      isFetchingDataSourceDimensions
    } = this.props
    let {
      dimensions,
      filters,
      vizType
    } = _.get(slice, 'params') || {}

    let { retentionMetricalField } = this.state
    if (!dataSourceDimensions.length) return null
    let {
      renderTempMetricTile: TempMetricTile,
      renderDimSelector: DimSelector
    } = this
    let { visiblePopoverKey } = this.state
    filters = filters.filter(p => p.filterType !== 'event')
    let isEditable = this.isEditable()
    let metricSettingTiles = (<TempMetricTile disabled={!isEditable} />)
    let dbDimNameDict = _.keyBy(dataSourceDimensions, 'name')
    let dimensionSettingTiles = dimensions.map((dimName, i) => {
      let dbDim = dbDimNameDict[dimName]
      let sortableDims = vizType === 'table_flat'
        ? [dbDim, ...dimensions.filter(dimName0 => dimName0 !== dimName).map(dimName => dbDimNameDict[dimName])]
        : [dbDim]
      let noExtraSetting = vizType === 'table_flat' && 0 < i
      return (
        <div
          key={dimName}
          className="itblock analytic"
        >
          <DimensionSettingPopover
            visible={visiblePopoverKey === `维度:${dimName}`}
            onVisibleChange={visible => {
              this.setState({ visiblePopoverKey: visible && `维度:${dimName}` })
            }}
            key={dimName}
            value={slice.params.dimensionExtraSettingDict[dimName] || {
              limit: 10,
              sortDirect: 'desc',
              sortCol: dimName
            }}
            sortOptions={[...sortableDims, ...slice.params.customMetrics]}
            onChange={newSetting => {
              updateHashStateByPath('slice.params.dimensionExtraSettingDict', (dimensionExtraSettingDict) => {
                return { ...dimensionExtraSettingDict, [dimName]: newSetting }
              })
            }}
            disabledSortColAndLimit={noExtraSetting}
          >
            <FixWidthHelper
              toFix="last"
              toFixWidth="20px"
              className="dem-group"
              draggable
              onDragStart={ev => {
                ev.dataTransfer.setData('text', `维度:${dimName}`)
              }}
            >
              <div style={{ marginLeft: 10 }} className="elli">{dbDimNameDict[dimName].title || dimName}</div>
              <Icon
                type="cross"
                className="dem-del"
                data-dimension-name={dimName}
                onClick={ev => {
                  ev.stopPropagation()
                  this.onRemoveDimensionClick(ev)
                }}
              />
            </FixWidthHelper>
          </DimensionSettingPopover>
          {/*{isEditable ? (
              <div className="itblock width30 aligncenter">
                <Icon
                  type="cross-circle-o"
                  className="iblock font16 pointer color-red"
                  data-dimension-name={dimName}
                  onClick={this.onRemoveDimensionClick}
                />
              </div>
            ) : null}*/}
        </div>
      )
    })
    slices = slices.filter(p => p.params.openWith === 'UserActionAnalytics' && p.druid_datasource_id === projectCurrent.datasource_id && window.sugo.user.id === p.created_by )
    return (
      <div>
        <Row>
          <Col span={18}>
            <div className="line-height32 mg2b">
              常用事件：
              <Select
                getPopupContainer={getPopupContainer}
                {...enableSelectSearch}
                dropdownMatchSelectWidth={false}
                onChange={this.switchSlices}
                //disabled={!isEditable}
                notFoundContent={isFetchingDataSourceDimensions ? '加载中' : '无法找到'}
                value={slice.id}
                className="width200 mg1l"
              >
                <Option key="defaultselect" value="">请选择</Option>
                {slices.map(ds => {
                  return (
                    <Option
                      key={ds.id}
                      value={ds.id}
                    >{ds.slice_name}</Option>
                  )
                })}
              </Select>
            </div>
          </Col>
          <Col span={6}>
            <div className="fright">
              {this.renderSaveAsButton()}
            </div>
          </Col>
        </Row>

        <div className="line-height32 mg2b">
          选择行为事件：
          {metricSettingTiles}
          {/*<Icon
              key="appendBtn"
              type="plus-circle-o"
              className="iblock pointer font16 mg1l"
              onClick={this.onAppendMetric}
            />*/}
        </div>

        <div className="line-height32 mg2b">
          <DimSelector
            disabled={!isEditable}
            className="itblock width250 mg2r"
            size="large"
          />
          {dimensionSettingTiles}
          {/*{!isEditable
              ? dimensionSettingTiles
              : dimensionSettingTiles.concat([(
                <Icon
                  key="appendBtn"
                  type="plus-circle-o"
                  className="iblock pointer font16 mg1l"
                  onClick={this.onAppendDimension}
                />
              )])}*/}
        </div>
        <div className="mg0 bordert dashed">
          <Row className="mg2t mg2b">
            <Col span={18}>
              <div>
                <CommonDruidFilterPanel
                  getPopupContainer={getPopupContainer}
                  projectId={projectCurrent.id}
                  dataSourceId={projectCurrent.datasource_id}
                  timePickerProps={{
                    dateTypes: localDateOptions,
                    className: 'iblock width260 mg2r',
                    disabled: false,
                    showPop: false
                  }}
                  filters={filters}
                  onFiltersChange={nextFilters => {
                    updateHashStateByPath('slice.params.filters', (f) => {
                      return [
                        ...f.filter(p => p.filterType === 'event'),
                        ...nextFilters
                      ]
                    })
                  }}
                />
              </div>
            </Col>
            <Col span={6}>
              {this.renderMetricalFieldSelector({retentionMetricalField, dbDimNameDict})}
            </Col>
          </Row>
        </div>
        <div>
          <Button onClick={this.onQueryClick} className="width100" icon={<SearchOutlined />} type="primary">查询</Button>
        </div>
      </div>
    );
  }

  renderMetricalFieldSelector({retentionMetricalField, dbDimNameDict}) {
    let { datasourceCurrent } = this.props

    let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
    if (_.size(commonMetric) <= 1) {
      return null
    }
    let currUserGroupId = _.get(this.props, 'location.query.usergroup_id')
    if (currUserGroupId && currUserGroupId !== 'all') {
      // 没有选择分群时，才能够选择 统计字段，否则不能选择
      return
    }

    return (
      <div className="fright mg1r iblock">
        <div className="itblock mg1r line-height28">用户类型：</div>
        <Select
          getPopupContainer={getPopupContainer}
          {...enableSelectSearch}
          placeholder="未设置用户类型"
          className="width160"
          onChange={this.onChangeMetricalField}
          value={retentionMetricalField}
        >
          {
            datasourceCurrent.params.commonMetric
              ? (datasourceCurrent.params.commonMetric.map(dimName => {
                let dbDim = dbDimNameDict[dimName]
                return (
                  <Option key={dimName} value={dimName}>{dbDim && dbDim.title || dimName}</Option>
                )
              }))
              : null
          }
        </Select>
      </div>
    )
  }

  getCommonDimensionsSet() {
    if (this.commonDimsSet && this.commonDimsSet.size) {
      return this.commonDimsSet
    }
    let currDs = this.props.datasourceCurrent
    this.commonDimsSet = new Set(_.get(currDs, 'params.commonDimensions') || [])
    return this.commonDimsSet
  }

  renderSettingsPanel() {
    let {projectCurrent} = this.props

    if (!projectCurrent.datasource_id) {
      return (
        <div className="pd3">
          <Alert msg="未选择数据源"/>
        </div>
      )
    }

    return (
      <div className="pd2y pd3x bg-grey-f7">
        {this.renderSettingsForm()}
      </div>
    )
  }

  onVizTypeChange(nextVizType) {
    let {updateHashStateByPath} = this.props
    updateHashStateByPath('slice.params', oriParams => {
      let newPar = {...oriParams, vizType: nextVizType}
      if (_.includes(['pie', 'number', 'dist_bar', 'horizontal_bar', 'line', 'map', 'balance_bar'], nextVizType)) {
        newPar.dimensions = _.take(newPar.dimensions, 1)
      }
      if (_.startsWith(nextVizType, 'multi_dim_') || _.includes(['pie', 'number', 'map', 'heat_map', 'balance_bar'], nextVizType)) {
        newPar.metrics = _.take(newPar.metrics, 1)
      }
      return newPar
    })
  }

  inspectUserGroupByUserCountMetric = async ev => {
    let dimVal = ev.currentTarget.getAttribute('data-dimVal')
    let {datasourceCurrent, dimNameDict, dataSourceMeasures} = this.props
    let { querySlice, retentionMetricalField } = this.state

    // 某个维度值对应的人数
    if (dimVal) {
      let firstDim = _.get(querySlice, 'params.dimensions[0]')
      querySlice = immutateUpdate(querySlice, 'params.filters', flts => {
        let dbDim = dimNameDict[firstDim]
        let flt = {col: firstDim, op: 'in', eq: [dimVal], containsNull: dimVal === EMPTY_VALUE_OR_NULL}
        if (isTimeDimension(dbDim)) {
          let granularity = _.get(querySlice, `params.dimensionExtraSettingDict['${firstDim}'].granularity`) || 'P1D'
          if (flt.containsNull) {
            let nullTime = moment.tz('1970-01-01 00:00:00.000', 'Asia/Shanghai').format()
            flt.eq = [nullTime, nullTime]
          } else {
            flt.eq[1] = moment(flt.eq[0]).add(moment.duration(granularity)).format()
          }
          flt.type = 'date'
        } else if (isNumberDimension(dbDim)) {
          let range = extractNumberRange(dimVal)
          if (range) {
            let [from, to] = range
            flt.eq = [from, to]
          } else {
            flt.eq = [+range, (+range) + 10]
          }
          flt.type = 'number'
        }
        return [...flts.filter(flt => flt.col !== firstDim), flt]
      })
    }

    // 转换内置分群至普通分群
    let builtInUgFlt = _.find(_.get(querySlice, 'params.filters'), flt => _.includes(flt.eq + '', 'builtin'))
    if (builtInUgFlt) {
      querySlice = immutateUpdates(querySlice,
        'params.filters', flts => {
          let timeRangeFlt = _.find(querySlice.params.filters, flt => flt.col === '__time')
            || {col: '__time', op: 'in', eq: ['1000', '3000']}
          return transformBuiltinUserGroups(flts, timeRangeFlt, datasourceCurrent)
        },
        // 不移除 __time 会影响内置分群的判断
        'params.filters', flts => {
          return _.includes(builtInUgFlt.eq + '', BuiltinUserGroup.allLoginUsers) ? flts : flts.filter(flt => flt.col !== '__time')
        })
    }

    let ug = await sliceToUsergroup(querySlice, retentionMetricalField, _.keyBy(dataSourceMeasures, 'name'), {
      backToRefererTitle: '查看关联单图',
      refererLink: `/console/user-action-analytics/${querySlice.id}`,
      backToRefererHint: '这个分群由行为事件分析创建，点击查看关联的单图'
    })
    let userGroupWithTotal = await findOrCreateTempUsergroup(ug)
    saveAndBrowserInInsight(userGroupWithTotal)
  }

  inspectUserById = ev => {
    let {commonDimensions = [], commonSession} = _.get(this.props.datasourceCurrent, 'params')
    if (!commonDimensions || !commonDimensions[0]) {
      message.warn(
        <span>请先在<PermissionLink to="/console/project/datasource-settings">场景数据设置</PermissionLink>配置好 用户行为维度</span>, 8
      )
      return
    }
    if (!commonSession) {
      message.warn(
        <span>请先在<PermissionLink to="/console/project/datasource-settings">场景数据设置</PermissionLink>配置好 SessionID</span>, 8
      )
      return
    }
    let { querySlice } = this.state
    let firstDim = _.get(querySlice, 'params.dimensions[0]')
    let fieldValue = ev.currentTarget.getAttribute('data-dimVal')
    insightUserById(fieldValue, firstDim)

  }

  makeUserCountInspectable = tableProps => {
    if (!('dataSource' in tableProps)) {
      return tableProps
    }
    if (_.some(tableProps.columns, col => col.key === '_tempMetric_userCount')) {
      let { querySlice } = this.state
      let firstDim = _.get(querySlice, 'params.dimensions[0]')
      return immutateUpdate(tableProps, 'columns', cols => cols.map(c => {
        return c.key === '_tempMetric_userCount'
          ? {...c,
            render: (val, record, idx) => {
              let originalVal = (c.render || _.identity)(val, record, idx)
              return (
                <a
                  className="pointer"
                  className="color-main"
                  data-dimVal={firstDim && !record.isTotalRow ? _.get(record, [firstDim], '') || EMPTY_VALUE_OR_NULL : ''}
                  onClick={this.inspectUserGroupByUserCountMetric}
                >{originalVal}</a>
              )
            }}
          : c
      }))
    }
    return tableProps
  }

  makeUserIdInspectable = tableProps => {
    if (!('dataSource' in tableProps)) {
      return tableProps
    }
    let {commonMetric = [], loginId} = _.get(this.props.datasourceCurrent, 'params')
    let { querySlice } = this.state
    let firstDim = _.get(querySlice, 'params.dimensions[0]')

    if (!_.includes(commonMetric, firstDim) && firstDim !== loginId) {
      return tableProps
    }
    return immutateUpdate(tableProps, 'columns', cols => cols.map(c => {
      return c.key === firstDim
        ? {
          ...c,
          render: (val, record, idx) => {
            let originalVal = (c.render || _.identity)(val, record, idx)
            if (record.isTotalRow) {
              return originalVal
            }
            let wrapHref = val => (<a
              className="color-main pointer"
              data-dimVal={firstDim && !record.isTotalRow && _.get(record, [firstDim]) || ''}
              onClick={this.inspectUserById}
            >{val}</a>)
            return _.isObject(originalVal) && 'children' in originalVal
              ? immutateUpdate(originalVal, 'children', oc => wrapHref(oc))
              : wrapHref(originalVal)
          }
        }
        : c
    }))
  }

  renderBottomPanel() {
    let { slice, updateHashStateByPath, isFetchingDataSourceDimensions, isFetchingDataSourceMeasures,
      dataSourceDimensions, dataSourceMeasures, projectCurrent } = this.props
    let { vizType, metrics } = _.get(slice, 'params') || {}
    let { isLoadingChartData, querySlice } = this.state
    if (!projectCurrent.datasource_id) {
      return null
    }
    let noDimAndMetricPermission = !isFetchingDataSourceDimensions && !isFetchingDataSourceMeasures
      && !dataSourceDimensions.length && !dataSourceMeasures.length
    return (
      <div className="pd3x bordert dashed slice-panel bg-fb">
        <FixWidthHelper
          toFix="first"
          toFixWidth="92px"
          className="height550"
          wrapperClass="height-100"
        >
          <div
            className="border radius report-content"
            style={{ height: 'calc(100%)' }}
          >
            <div className="pd2 height36 font14 report-titile aligncenter">图表类型</div>
            <div className="bordert report-content">
              {_.keys(vizTypeIconMap).filter(chartType => {
                return chartType === 'table_flat' || chartType === 'dist_bar' || chartType === 'pie' || chartType === 'line'
              }).map(chartType => {
                let isActive = chartType === vizType
                let btnHoverHint = vizTypeHintMapForUserAction[chartType]
                // 未选择指标时、全都可选
                let isDisabled = vizType && metrics.length && !checkVizTypeEnable(chartType, slice.params)
                return (
                  <Tooltip
                    title={`${vizTypeNameMap[chartType] || chartType} : ${btnHoverHint}`}
                    key={chartType}
                    placement="right"
                  >
                    <div
                      className={classNames('itblock width50 height50 mg1r mg1b relative report-icon', {
                        'disabled btn-disabled-style': isDisabled || isLoadingChartData,
                        'bg-purple': isActive,
                        'viz-disable-btn': isDisabled,
                        'viz-switch-btn': !isDisabled
                      })}
                      onClick={ev => {
                        if (!isDisabled || ev.shiftKey) {
                          this.onVizTypeChange(chartType)
                        }
                      }}
                    >
                      <Icon
                        title={vizTypeNameMap[chartType] || chartType}
                        type={vizTypeIconMap[chartType]}
                        className={classNames('font30 center-of-relative', { 'color-white': isActive })}
                      />
                    </div>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          <div
            className="border radius report height-100"
          >
            <div className="pd2 height-100">
              {
                noDimAndMetricPermission
                  ? (
                    <p className="aligncenter empty-tip color-red"><Icon type="notification" />
                      单图中统计条件在 数据指标/数据维度 里未对你所在角色授权，请先到[数据管理-数据指标/数据维度]给角色授权
                    </p>
                  )
                  : (
                    vizType && querySlice
                      ? (
                        <SliceChartFacade
                          innerRef={ref => this._sliceChartFacade = ref}
                          wrapperClassName="always-display-scrollbar-horizontal-all"
                          style={{ minHeight: '500px' }}
                          slice={querySlice}
                          isThumbnail={false}
                          showLegend
                          onUnmount={() => this.setState({ isLoadingChartData: false })}
                          onLoadingStateChange={isLoading => this.setState({ isLoadingChartData: isLoading })}
                          onSettingsChange={newChartSettings => {
                            updateHashStateByPath('slice.params.chartExtraSettings', prevChartSettings => {
                              return { ...prevChartSettings, ...newChartSettings }
                            })
                          }}
                          optionsOverwriter={_.flow(this.makeUserCountInspectable, this.makeUserIdInspectable)}
                        />)
                      : (
                        <div className="height-100 relative">
                          <div className="aligncenter center-of-relative">
                            <img
                              className="itblock"
                              src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/ui-nothing.png`}
                              alt="Error hint"
                            />
                            <p className="aligncenter radius empty-tip mg2t">请执行查询</p>
                          </div>
                        </div>
                      )
                  )
              }
            </div>
          </div>
        </FixWidthHelper>
      </div>
    )
  }

  isHasInitTimeFlt() {
    let {slice} = this.props
    let {filters} = _.get(slice, 'params') || {}
    return _.some(filters, flt => flt.col === '__time' && flt.op === 'in' && flt.eq === '-1 day')
  }

  onMaxTimeLoaded = maxTime => {
    this.setState({
      eventDateFileter: {
        since: moment(maxTime).endOf('day').format(defaultFormat0),
        until: moment(maxTime).add(-90, 'days').format(defaultFormat0)
      }
    })
  }

  renderSettingGuide = (hasDims, hasSession) => {
    let { projectCurrent } = this.props
    return (
      <div className="center-of-relative aligncenter">
        <img
          className="itblock"
          src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/ui-nothing.png`}
          alt="Error hint"
        />
        <p className="mg2y">
          要使用事件分析, 请到
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
          {hasDims ? <b className="color-red mg1x" key={1}>用户行为维度</b> : null}
          {hasSession ? <b className="color-red mg1x" key={2}>SessionID</b> : null}
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
    let userGroupId = _.get(this.props, 'location.query.usergroup_id')
    let { datasourceCurrent, projectCurrent, projectList, location } = this.props
    let commonDims = _.get(datasourceCurrent, 'params.commonDimensions') || []
    let commonSession = _.get(datasourceCurrent, 'params.commonSession')
    if (!commonDims.length || !commonSession) {
      return this.renderSettingGuide(!commonDims.length, !commonSession)
    }
    //let noValidDataSource = !datasourceCurrent || !datasourceCurrent.params.commonMetric || !datasourceCurrent.params.commonDimensions
    return (
      <div className="user-action-analytics height-100 bg-white width-100">
        {renderPageTitle('事件分析')}
        <div className="nav-bar">
          <div className="itblock">
            <span className="font13">目标用户：</span>
            <UserGroupSelector
              datasourceCurrent={datasourceCurrent}
              projectList={projectList}
              className="width250"
              value={userGroupId}
              onChange={nextUserGroup => {
              // ls.set('current_common_usergroup_id', val)
                browserHistory.push(immutateUpdate(location, 'query.usergroup_id', () => nextUserGroup ? nextUserGroup.id : null))
              }}
            />
          </div>
        </div>
        <div className="scroll-content always-display-scrollbar relative">
          {this.renderSettingsPanel()}
          {this.renderBottomPanel()}
          <MaxTimeFetcher
            dataSourceId={projectCurrent.datasource_id}
            doFetch={!!(projectCurrent.datasource_id && this.isHasInitTimeFlt())}
            onMaxTimeLoaded={this.onMaxTimeLoaded}
          />
        </div>
      </div>
    )
  }
}

let genEmptySlice = (dataSourceId) => ({
  id: '',
  slice_name: '',
  druid_datasource_id: dataSourceId,
  params: {
    vizType: 'table_flat',
    metrics: [getMetrics()[0].name],
    dimensions: [],
    filters: [{ col: '__time', op: 'in', eq: defaultDate.relativeTime }],
    dimensionExtraSettingDict: {},
    customMetrics: [getMetrics()[0]]
  }
})

export default (() => {
  let WithDimensions = withDataSourceDimensions(UserActionAnalytic, props => {
    let dataSourceId = props.projectCurrent.datasource_id || ''
    return {
      dataSourceId: dataSourceId,
      doFetch: !!dataSourceId,
      exportNameDict: true
    }
  })
  let WithMeasures = withDataSourceMeasures(WithDimensions, props => {
    let dataSourceId = props.projectCurrent.datasource_id || ''
    return {
      dataSourceId: dataSourceId,
      doFetch: !!dataSourceId
    }
  })

  let WitUserGroups = withUserGroups(WithMeasures, props => {
    let dataSourceId = props.projectCurrent.datasource_id || ''
    return {
      dataSourceId: dataSourceId,
      doFetch: !!dataSourceId
    }
  })
  let WithSlices= withSlices(WitUserGroups, props => ({ doFetch: props.visible }))

  let WithHashState = withHashState(WithSlices, undefined, ({datasourceCurrent}) => ({
    slice: genEmptySlice(datasourceCurrent && datasourceCurrent.id)
  }))
  let mapStateToProps = state => state.common
  let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)
  return connect(mapStateToProps, mapDispatchToProps)(WithHashState)
})()
