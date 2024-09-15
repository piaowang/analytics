import FunnelDisplayPanel from '../SugoFunnel/funnel-display-panel'
import React from 'react'
import _ from 'lodash'
import {withUserGroupsDec} from '../Fetcher/data-source-compare-user-group-fetcher'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {BuiltinUserGroup, GetBuildInUgs} from '../../../common/constants'
import {CompareTypeEnum, genInitFunnel} from '../SugoFunnel'
import {immutateUpdate, immutateUpdates, insert, isDiffByPath, isDiffBySomePath} from '../../../common/sugo-utils'
import {convertDateType, isRelative} from '../../../common/param-transform'
import {genLuceneFetcherDom, inspectFunnelLayerUsers, onShowLostUser} from '../SugoFunnel/data-transform'
import Loading from '../Common/loading'
import MultiSelect from '../Common/multi-select'
import {
  findOrCreateTempUsergroup,
  getUserGroupReadyRemainTimeInSeconds,
  saveAndBrowserInInsight
} from '../../common/usergroup-helper'
import { SaveOutlined } from '@ant-design/icons';
import {Button, Col, Input, message, Radio, Row, Select, Tabs, Tooltip} from 'antd'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {isGroupDimension, isStringDimension} from '../../../common/druid-column-type'
import Icon from '../Common/sugo-icon'
import PubSub from 'pubsub-js'
import showPopover from '../Common/free-popover'
import {connect} from 'react-redux'
import {bindActionCreators} from 'redux'
import {addUsergroup} from '../../actions'
import TimePicker from '../Common/time-picker'
import moment from 'moment'
import BoundaryTimeFetcher from '../Fetcher/boundary-time-fetcher'
import PropTypes from 'prop-types'

const TabPane = Tabs.TabPane

const {distinctDropDownFirstNLimit = 10} = window.sugo

const mapStateToProps = (state, ownProps) => {
  let dsId = _.get(ownProps, 'initFunnel.druid_datasource_id')
  const datasourceCurrent = dsId && _.find(ownProps.datasourceList, ds => ds.id === dsId)
  return datasourceCurrent ? { datasourceCurrent } : {}
}
const mapDispatchToProps = dispatch => bindActionCreators({ addUsergroup }, dispatch)

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withUserGroupsDec((props) => {
  let dsId = _.get(props, 'initFunnel.druid_datasource_id') || _.get(props, 'datasourceCurrent.id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!(dsId && !props.disabledComparing)
  }
})
@connect(mapStateToProps, mapDispatchToProps)
export default class FunnelFacade extends React.Component {
  static propTypes = {
    initFunnel: PropTypes.object, // 初始化漏斗
    funnelLayers2d: PropTypes.array, // 初始化漏斗层级，与 initFunnel 至少传一个
    location: PropTypes.object, // router location
    dataSourceDimensions: PropTypes.array, // 业务维度
    useMaxTimeLoader: PropTypes.bool, // 是否自动切换时间范围到最新的数据
    showSettingControl: PropTypes.bool, // 隐藏设置控件
    disabledComparing: PropTypes.bool, // 禁用漏斗对比
    saveUserGroupWhenInspect: PropTypes.bool // 保存角色而不是查看用户列表
  }
  
  static defaultProps = {
    dataSourceDimensions: [],
    useMaxTimeLoader: true,
    showSettingControl: true,
    saveUserGroupWhenInspect: true
  }

  state = {
    vizType: 'funnel',
    currFunnel: null,
    isLoadingTotalData: false,
    funnelTotalData: [],
    isLoadingComparingData: false,
    funnelComparingData: {},
    popupSavePanelValue: {}
  }
  
  showSaveUserGroupPopover = (dom) => {
    let {popupSavePanelValue} = this.state
    let hidePopover = null
    let popoverContent = (
      <div className="width300">
        <Tabs defaultActiveKey="saveAs" onChange={null}>
          <TabPane
            tab="另存为"
            key="saveAs"
          >
            <div className="pd1b">
              <span className="block mg1b">用户群名称:</span>
              <Input
                className="block width-100"
                defaultValue={_.get(popupSavePanelValue, 'title')}
                onChange={ev => {
                  let { value } = ev.target
                  this.setState({
                    popupSavePanelValue: { ...popupSavePanelValue, title: value }
                  })
                }}
              />
            </div>
            <div className="pd1b">
              <span className="block mg1b">用户群备注:</span>
              <Input
                className="block width-100"
                defaultValue={_.get(popupSavePanelValue, 'description')}
                onChange={ev => {
                  let { value } = ev.target
                  this.setState({
                    popupSavePanelValue: { ...popupSavePanelValue, description: value }
                  })
                }}
              />
            </div>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              className="width-100 mg2t"
              onClick={() => this.handlePopSaveUserSubmit(hidePopover)}
            >保存</Button>
          </TabPane>
        </Tabs>
      </div>
    )
    hidePopover = showPopover(dom, popoverContent)
  }
  
  handlePopSaveUserSubmit = (callback) => {
    let { popupSavePanelValue: nextUg } = this.state
    this.props.addUsergroup(nextUg, res => {
      if (res) {
        const dom = (
          <span>
            添加分群成功
            <a href={`/console/usergroup/${res.result.id}/users`} className="pointer mg1l">查看用户群用户</a>
          </span>
        )
        message.success(dom, 15)
      }
    })
    
    if (callback) {
      callback()
    }
  }

  getFunnel(datasourceCurrent, timeRange = undefined) {
    let {funnelLayers2d, initFunnel} = this.props
    
    return immutateUpdate(initFunnel || genInitFunnel(datasourceCurrent),
      'params', prev => {
        if (timeRange) {
          let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
          let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
          return {
            ...prev,
            relativeTime,
            since,
            until,
            funnelLayers2d: funnelLayers2d || prev.funnelLayers2d
          }
        }
        return { ...prev, funnelLayers2d: funnelLayers2d || prev.funnelLayers2d }
      })
  }

  componentWillMount() {
    let {datasourceCurrent} = this.props
    this.setState({currFunnel: this.getFunnel(datasourceCurrent)})
  }

  componentDidMount() {
    PubSub.subscribe('sugoFunnel.onShowLostUser', async (msg, data) => {
      let {isQueryingUsergroup, currFunnel} = this.state
      if (isQueryingUsergroup) return
      
      let {location, datasourceCurrent, dataSourceCompareUserGroups, saveUserGroupWhenInspect} = this.props
      let lostUserUg = onShowLostUser(data, {location, datasourceCurrent, dataSourceCompareUserGroups, currFunnel})
    
      if (saveUserGroupWhenInspect) {
        await new Promise(resolve => this.setState({ popupSavePanelValue: lostUserUg }, resolve))
        this.showSaveUserGroupPopover(data.dom)
      } else {
        let userGroupWithTotal = await findOrCreateTempUsergroup(lostUserUg)
        saveAndBrowserInInsight(userGroupWithTotal)
      }
      if (data.done) {
        data.done()
      }
    })
    PubSub.subscribe('sugoFunnel.onShowFunnelUser', async (msg, data) => {
      let {saveUserGroupWhenInspect} = this.props
      let ug = this.genFunnelLayerUserGroup(data)
      
      if (saveUserGroupWhenInspect) {
        await new Promise(resolve => this.setState({ popupSavePanelValue: ug }, resolve))
        this.showSaveUserGroupPopover(data.dom)
      } else {
        let userGroupWithTotal = await findOrCreateTempUsergroup(ug)
        saveAndBrowserInInsight(userGroupWithTotal)
      }
      if (data.done) {
        data.done()
      }
    })
  }

  componentWillUnmount() {
    PubSub.unsubscribe('sugoFunnel.onShowLostUser')
    PubSub.unsubscribe('sugoFunnel.onShowFunnelUser')
  }
  
  componentDidUpdate(prevProps, prevState) {
    if (isDiffBySomePath(this.props, prevProps, 'datasourceCurrent', 'initFunnel')) {
      let {datasourceCurrent} = this.props
      this.setState({currFunnel: this.getFunnel(datasourceCurrent)})
    }
  }
  
  genFunnelLayerUserGroup = ({layerIdx, funnelCompareGroupName}) => {
    let { datasourceCurrent, dataSourceCompareUserGroups } = this.props
    let { currFunnel } = this.state
    
    return inspectFunnelLayerUsers({layerIdx, funnelCompareGroupName}, {
      datasourceCurrent, dataSourceCompareUserGroups, currFunnel,
      location: null
    })
  }
  
  onComparingFunnelDataChange = nextComparingFunnelGroupName => {
    let {currFunnel} = this.state
    let comparingFunnelGroupName = _.get(currFunnel, 'params.comparingFunnelGroupName') || ['总体']
    if (_.isEqual(comparingFunnelGroupName, nextComparingFunnelGroupName)) {
      return
    }
    this.setState({
      vizType: 'funnel',
      hideLineChartSteps: [],
      currFunnel: immutateUpdate(currFunnel, 'params.comparingFunnelGroupName', () => nextComparingFunnelGroupName)
    })
  }

  renderComparingSetting() {
    let {
      dataSourceDimensions,
      isFetchingDataSourceDimensions,
      dataSourceCompareUserGroups
    } = this.props

    let {currFunnel} = this.state

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
              if (vals.length > 1) {
                message.warn('最多选择 1 个筛选项', 3)
              }

              let nextUgIds = _.takeRight(vals.filter(_.identity), 1)
              this.setState({
                currFunnel: immutateUpdate(currFunnel, 'params.selectedUserGroupIds', () => nextUgIds)
              }, () => {
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
      } = this.state

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
                options={topN}
                className="width200"
                isLoading={isFetching}
                value={compareByDimensionDistinctValues}
                onChange={vals => {
                  if (vals.length > 1) {
                    message.warn('最多选择 1 个筛选项', 3)
                    vals = _.takeRight(vals, 1)
                  }
                  this.setState({
                    currFunnel: immutateUpdate(currFunnel, 'params.compareByDimensionDistinctValues', () => vals)
                  }, () => {
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
            className="width-100"
            {...enableSelectSearch}
            allowClear
            notFoundContent={isFetchingDataSourceDimensions ? '加载中' : '无法找到'}
            dropdownMatchSelectWidth={false}
            placeholder="维度对比"
            value={compareByDimension || undefined}
            onChange={val => {
              this.setState({
                currFunnel: immutateUpdate(currFunnel, 'params', prev => ({
                  ...prev,
                  compareByDimension: val || null,
                  compareByDimensionDistinctValues: []
                }))
              }, () => {
                this.onComparingFunnelDataChange(['总体'])
              })
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
      <div className="mg2b">
        <div className="fleft pd1r">
          <Radio.Group
            value={compareType}
            onChange={ev => {
              let val = ev.target.value
              this.setState({
                currFunnel: immutateUpdate(currFunnel, 'params.compareType', () => val)
              }, () => {
                this.autoSelectFirstComparingTerm(val)
              })
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

  autoSelectFirstComparingTerm = (compareType = _.get(this.state.currFunnel, 'params.compareType')) => {
    let {currFunnel} = this.state
    let {
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

  renderDisplayTypeSwitcher() {
    let {vizType} = this.state
    return (
      <Radio.Group
        className="fright"
        style={{marginLeft: 10}}
        onChange={ev => {
          this.setState({
            vizType: ev.target.value
          })
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

  renderComparingFunnels() {
    let {
      dataSourceDimensions,
      datasourceCurrent,
      dataSourceCompareUserGroups,
      location,
      dimNameDict,
      showSettingControl
    } = this.props

    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let {funnelTotalData, funnelComparingData, currFunnel, isLoadingTotalData, isLoadingComparingData, vizType} = this.state
    let isLoadingChartData = isLoadingTotalData

    let {
      compareByDimensionDistinctValues = [],
      compareType = CompareTypeEnum.dimensions,
      selectedUserGroupIds
    } = _.get(currFunnel, 'params') || {}

    let comparingFunnelGroupName = compareType === CompareTypeEnum.dimensions
      ? _.get(compareByDimensionDistinctValues, '[0]')
      : _(selectedUserGroupIds).chain()
        .find(ugId => _.some(dataSourceCompareUserGroups, ug0 => ug0.id === ugId))
        .thru(ugId => ugId && _.find(dataSourceCompareUserGroups, ug0 => ug0.id === ugId))
        .get('title')
        .value()
    return (
      <Row gutter={16}>
        <Col span={12}>
          <FunnelDisplayPanel
            isComparing
            showLeavingUserInspectBtn={showSettingControl}
            {...{
              location,
              dataSourceCompareUserGroups,
              datasourceCurrent,
              dataSourceDimensions,
              dimNameDict,
              vizType,
              hideLineChartSteps: [],
              isLoadingChartData,
              funnelTotalData,
              funnelDataAfterGroupBy: funnelComparingData,
              currFunnel,
              // onLineChartStepToggle: stepIndex => this.toggleStep(stepIndex),
              funnelCompareGroupName: '总体',
              className: 'comparing-left'
            }}
          />
        </Col>

        <Col span={12}>
          <FunnelDisplayPanel
            isComparing
            showLeavingUserInspectBtn={showSettingControl}
            {...{
              location,
              dataSourceCompareUserGroups,
              datasourceCurrent,
              dataSourceDimensions,
              dimNameDict,
              vizType,
              hideLineChartSteps: [],
              isLoadingChartData: isLoadingComparingData,
              funnelTotalData,
              funnelDataAfterGroupBy: funnelComparingData,
              currFunnel,
              // onLineChartStepToggle: stepIndex => this.toggleStep(stepIndex),
              funnelCompareGroupName: comparingFunnelGroupName,
              className: 'comparing-right',
              onCancelComparing: () => {
                this.setState(() => {
                  return {
                    currFunnel: immutateUpdates(currFunnel,
                      'params.compareByDimensionDistinctValues', () => [],
                      'params.selectedUserGroupIds', () => []
                    )
                  }
                })
              }
            }}
          />
        </Col>
      </Row>
    )
  }

  genComparingLuceneFetcherDom() {
    let {datasourceCurrent, dataSourceCompareUserGroups, dataSourceDimensions} = this.props
    let {currFunnel, isLoadingComparingData} = this.state
    if (!currFunnel) {
      return null
    }
    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let {
      compareByDimension,
      compareByDimensionDistinctValues = [],
      compareType = CompareTypeEnum.dimensions,
      selectedUserGroupIds,
      funnelMetric
    } = _.get(currFunnel, 'params') || {}

    if (compareType === CompareTypeEnum.dimensions) {
      return genLuceneFetcherDom({
        currFunnel: immutateUpdate(currFunnel, 'params.extraFilters', flts => {
          return insert(flts, 0, {
            col: compareByDimension,
            op: 'equal',
            eq: _.take(compareByDimensionDistinctValues, 1)
          })
        }),
        extraFetcherProps: {
          // dimension: compareByDimension,
          onFetchingStateChange: isLoading => {
            if (isLoading) {
              this.setState({isLoadingComparingData: true})
            }
          },
          onFetcherUnmount: () => this.setState({isLoadingComparingData: false}),
          onData: statisticData => {
            this.setState({
              funnelComparingData: {[compareByDimensionDistinctValues[0]]: statisticData},
              isLoadingComparingData: false
            }, () => {
              this.autoSelectFirstComparingTerm()
            })
          }
          // ...extraProps
        },
        // globalUserGroupId: null,
        dataSourceDimensions,
        datasourceCurrent,
        dataSourceCompareUserGroups
      })
    }

    let ugId = _.get(selectedUserGroupIds, [0])
    let ug = ugId && _.find(dataSourceCompareUserGroups, u => u.id === ugId)

    if (!ug) {
      return null
    }
    return genLuceneFetcherDom({
      currFunnel: immutateUpdate(currFunnel, 'params.extraFilters', flts => {
        return insert(flts, 0, {
          op: 'lookupin',
          col: _.get(ug, 'params.groupby') || funnelMetric,
          eq: ugId
        })
      }),
      extraFetcherProps: {
        onFetchingStateChange: isLoading => {
          if (isLoading) {
            this.setState({isLoadingComparingData: true})
          }
        },
        onFetcherUnmount: () => this.setState({isLoadingComparingData: false}),
        onData: statisticData => {
          this.setState({
            funnelComparingData: {[ug.title]: statisticData},
            isLoadingComparingData: false
          }, () => {
            this.autoSelectFirstComparingTerm()
          })
        }
        // ...extraProps
      },
      // globalUserGroupId: null,
      dataSourceDimensions,
      datasourceCurrent,
      dataSourceCompareUserGroups
    })
  }
  
  renderTimeRangePicker() {
    let {datasourceCurrent, useMaxTimeLoader} = this.props
    let {currFunnel} = this.state
    let {relativeTime, since, until} = _.get(currFunnel, 'params') || {}
    return (
      <div className="borderl2 mg2y selecter-flow-scroll">
        <span className="mg2x iblock">筛选时间：</span>
        <TimePicker
          className="width280"
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
            const nextTimeRange = relativeTime === 'custom' ? [since, until] : relativeTime
            this.setState({
              currFunnel: this.getFunnel(datasourceCurrent, nextTimeRange)
            })
          }}
        />
        <BoundaryTimeFetcher
          dataSourceId={datasourceCurrent && datasourceCurrent.id || ''}
          doQueryMinTime={false}
          doFetch={!_.isEmpty(datasourceCurrent) && useMaxTimeLoader}
          onTimeLoaded={data => {
            let {maxTime} = data || {}
            if (!maxTime) {
              return
            }
            const nextTimeRange = [
              moment(maxTime).add(-7, 'day').startOf('second').toISOString(),
              moment(maxTime).add(1, 's').startOf('second').toISOString() // 上边界为开区间，需要加 1 s
            ]
            this.setState({
              currFunnel: this.getFunnel(datasourceCurrent, nextTimeRange)
            })
          }}
        />
      </div>
    )
  }

  render() {
    let {
      datasourceCurrent, dataSourceCompareUserGroups, dataSourceDimensions, dimNameDict, showSettingControl,
      disabledComparing
    } = this.props

    let {vizType, currFunnel, isLoadingTotalData, funnelTotalData} = this.state
    if (!currFunnel) {
      return null
    }
    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let {
      compareByDimensionDistinctValues = [],
      compareType = CompareTypeEnum.dimensions,
      selectedUserGroupIds
    } = _.get(currFunnel, 'params') || {}

    let isComparing = compareType === CompareTypeEnum.dimensions
      ? !_.isEmpty(compareByDimensionDistinctValues)
      : !_.isEmpty(selectedUserGroupIds)
    return (
      <div style={{minWidth: '600px'}}>
        {genLuceneFetcherDom({
          currFunnel,
          extraFetcherProps: {
            onFetchingStateChange: isLoading => {
              if (isLoading) {
                this.setState({isLoadingTotalData: true})
              }
            },
            onData: statisticData => {
              this.setState({
                funnelTotalData: statisticData,
                isLoadingTotalData: false
              })
            },
            onFetcherUnmount: () => this.setState({isLoadingTotalData: false})
            // ...extraProps
          },
          // globalUserGroupId: null,
          dataSourceDimensions,
          datasourceCurrent,
          dataSourceCompareUserGroups
        })}

        {isComparing && !disabledComparing ? this.genComparingLuceneFetcherDom() : null}

        {showSettingControl ? this.renderComparingSetting() : null}
        
        {showSettingControl ? this.renderTimeRangePicker() : null}

        {isComparing && !disabledComparing ? this.renderComparingFunnels() : (
          <FunnelDisplayPanel
            showLeavingUserInspectBtn={showSettingControl}
            {...{
              style: {margin: '0px'},
              dataSourceCompareUserGroups,
              datasourceCurrent,
              dataSourceDimensions,
              dimNameDict,
              vizType,
              hideLineChartSteps: [],
              isLoadingChartData: isLoadingTotalData,
              funnelTotalData,
              funnelDataAfterGroupBy: [],
              currFunnel,
              // onLineChartStepToggle: this.toggleStep,
              funnelCompareGroupName: '总体',
              className: 'comparing-left'
            }}
          />
        )}

      </div>
    )
  }
}
