import React from 'react'
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Card, Popover, Select, Radio, message, Spin, Checkbox } from 'antd';
import _ from 'lodash'
import RetentionLineChart from './retention-line-chart'
import RetentionTable from './retention-table'
import LuceneFetcher from '../Fetcher/lucene-fetcher'
import {escape, dictBy, immutateUpdate, insert, immutateUpdates} from '../../../common/sugo-utils'
import Loading from '../Common/loading'
import {convertDateType, isRelative} from '../../../common/param-transform'
import Alert from '../Common/alert'
import {isStringDimension, isGroupDimension} from '../../../common/druid-column-type'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import MultiSelect from '../Common/multi-select'
import {getUserGroupReadyRemainTimeInSeconds} from '../../common/usergroup-helper'
import FetcherAgent from '../Fetcher/fetcher-agent'
import {genFinalLuceneFilter, transformBuiltinUserGroups} from '../../../common/druid-query-utils'
import {isBuiltinUsergroupId} from '../Common/usergroup-selector'
import {BuiltinUserGroup, GetBuildInUgs} from '../../../common/constants'
import {withUserGroupsDec} from '../Fetcher/data-source-compare-user-group-fetcher'
import {findSuitableRetentionGranularity, getStepPairs, transformData} from './retention-helper'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import PropTypes from 'prop-types'

const {distinctDropDownFirstNLimit = 10} = window.sugo
const Option = Select.Option
const {Group: RadioGroup, Button: RadioButton} = Radio

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withUserGroupsDec(({datasourceCurrent}) => {
  let dataSourceId = datasourceCurrent && datasourceCurrent.id || ''
  return {
    dataSourceId: dataSourceId,
    doFetch: !!dataSourceId
  }
})

export default class RetentionDisplayPanels extends React.Component {
  static propTypes = {
    hideSettingControl: PropTypes.bool
  }

  state = {
    comparingStepsData: [
      // 包含对比步骤的漏斗数据
      /* { totalRetentionData: null,
           compareByDimensionRetentionData: null,
           compareByUserGroupRetentionData: null
      } */
    ],
    isFetchingState: 0
  }

  componentWillReceiveProps(nextProps) {
    let {id: currRetId} = this.props.retentionSelected
    let {id: nextRetId} = nextProps.retentionSelected
    if (!nextRetId && currRetId !== nextRetId) {
      // 切换漏斗，清空界面数据
      this.setState({
        comparingStepsData: []
      })
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    // 只变更了某个 isFetching 状态，最终 isFetchingChartData 语义没变
    if (this.state.isFetchingState !== 0 && nextState.isFetchingState !== 0) {
      let alreadyChecked = ['isFetchingState']
      if (!_.isEqual(nextProps, this.props)
        || !_.isEqual(_.omit(this.state, alreadyChecked), _.omit(nextState, alreadyChecked))) {
        return true
      }
      return false
    }
    return true
  }

  getRetentionMetricalField = () => {
    let { datasourceCurrent, location, dataSourceCompareUserGroups } = this.props

    let dataSourceSelected = datasourceCurrent
    let usergroup_id = _.get(location, 'query.usergroup_id')
    let {
      commonMetric = []
    } = dataSourceSelected && dataSourceSelected.params || {}
    if (usergroup_id) {
      let ug = _.find(dataSourceCompareUserGroups, u => u.id === usergroup_id)
      if (ug) {
        commonMetric = [ug.params.groupby]
      }
    }
    return commonMetric[0]
  }

  genLuceneFetcher = (retentionSelected, propsPatch = _.identity) => {
    let { datasourceCurrent, location, dataSourceDimensions, dataSourceCompareUserGroups } = this.props
    let dataSourceSelected = datasourceCurrent
    let {
      granularityType = 'P1D',
      relativeTime,
      since,
      until,
      startStep,
      endStep,
      retentionMetricalField,
      retentionDimension,
      extraFilters,
      retentionType
    } = retentionSelected.params || {}
    if (!relativeTime || !retentionMetricalField) {
      return null
    }

    // 应用全局的分群，不会覆盖已经带有分群条件的查询
    let globalUserGroupId = _.get(location, 'query.usergroup_id') //|| ls.gets('current_common_usergroup_id')
    if (_.some(extraFilters, flt => flt.op === 'lookupin')) {
      // 使用分群的统计字段
      retentionMetricalField = _.chain(extraFilters)
        .find(flt => flt.op === 'lookupin')
        .get('col')
        .value() || retentionMetricalField
    } else if (globalUserGroupId && globalUserGroupId !== 'all' && globalUserGroupId !== 'undefined') {
      let funnelMetricOverwrite = isBuiltinUsergroupId(globalUserGroupId)
        ? _.get(_.find(GetBuildInUgs(datasourceCurrent), ug => ug.id === globalUserGroupId), 'params.groupby')
        : _.get(_.find(dataSourceCompareUserGroups, u => u.id === globalUserGroupId), 'params.groupby')
      retentionMetricalField = funnelMetricOverwrite || retentionMetricalField
      let ugFilter = {
        op: 'lookupin',
        col: retentionMetricalField,
        eq: globalUserGroupId
      }
      extraFilters = insert(extraFilters, 0, ugFilter)
    }

    extraFilters = _(extraFilters || []).flatMap(flt => {
      if (flt.op !== 'lookupin') {
        return [flt]
      }
      let ugId = _.isArray(flt.eq) ? flt.eq[0] : flt.eq
      if (isBuiltinUsergroupId(ugId)) {
        let {firstVisitTimeDimName, firstLoginTimeDimName} = _.get(datasourceCurrent, 'params') || {}
        // 新访问用户，需要传首次访问时间到 timeField
        // 新登录用户，需要传首次登录时间到 timeField
        // 全部登录用户，需要排除 loginId 的空值
        if (ugId === BuiltinUserGroup.newVisitUsers) {
          propsPatch = _.flow([propsPatch, props => ({...props, timeField: firstVisitTimeDimName})])
          return []
        } else if (ugId === BuiltinUserGroup.newLoginUsers) {
          propsPatch = _.flow([propsPatch, props => ({...props, timeField: firstLoginTimeDimName})])
          return []
        } else if (ugId === BuiltinUserGroup.allLoginUsers) {
          let timeRangeFlt = {col: '__time', op: 'in', eq: isRelative(relativeTime) ? relativeTime : [since, until]}
          return transformBuiltinUserGroups([flt], timeRangeFlt, datasourceCurrent)
        } else {
          return []
        }
      }
      return [flt]
    }).value()

    if (!retentionType || retentionType === 'anyEvent') {
      startStep = []
      endStep = []
    } else if (retentionType === 'sameEvent') {
      endStep = startStep // 旧版 功能留存， endStep 为空，需要兼容
    }
  
    let startFilter = _.zip(retentionDimension, startStep).filter(([rd, s]) => rd && s)
      .map(([rd, s]) => `(${rd}:${escape(s)})`).join(' AND ') || '*:*'
    let endFilter = _.zip(retentionDimension, endStep).filter(([rd, s]) => rd && s)
      .map(([rd, s]) => `(${rd}:${escape(s)})`).join(' AND ') || '*:*'

    let props0 = {
      queryType: 'retention',
      dataSourceName: dataSourceSelected && dataSourceSelected.name || '',
      field: retentionMetricalField,
      granularity: granularityType,
      relativeTime: relativeTime,
      since,
      until,
      filter: genFinalLuceneFilter(extraFilters, dataSourceDimensions),
      doFetch: !!dataSourceSelected,
      /*    onData: data => {
        this.setState({totalRetentionData: data})
      },*/
      /*onFetchingStateChange: isFetching => this.setState(({isFetchingState}) => {
        return {
          isFetchingState: isFetching ? isFetchingState | 1 : isFetchingState & ~1
        }
      }),*/
      startStep: {'name': 'total', 'filter': startFilter},
      returnStep: {'name': 'total_return', 'filter': endFilter}
    }
    return (
      <LuceneFetcher {...propsPatch(props0)} />
    )
  }

  renderRetentionContent() {
    let {
      dataSourceDimensions: dbDims, datasourceCurrent, retentionSelected, retentionUpdater,
      dataSourceCompareUserGroups, isFetchingDataSourceCompareUserGroups, location,
      hideSettingControl
    } = this.props

    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let dimTranslationDict = dictBy(dbDims.filter(dim => dim.title), dim => dim.name, dim => dim.title)

    let dataSourceSelected = datasourceCurrent
    let {
      compareType = 'dimension',
      retentionMetricalField,
      compareByDimension,
      compareByDimensionDistinctValue, // 可以是数组
      selectedUserGroupIds = [],
      relativeTime = '-7 days',
      since,
      until,
      granularityType = 'P1D',
      displayType = 'percent',
      retentionDimension,
      retentionType,
      skipZeroRetention
    } = retentionSelected.params || {}
    retentionMetricalField = retentionMetricalField || this.getRetentionMetricalField()
    // 应用全局的分群
    let globalUserGroupId = _.get(location, 'query.usergroup_id') //|| ls.gets('current_common_usergroup_id')
    if (isBuiltinUsergroupId(globalUserGroupId) && globalUserGroupId !== BuiltinUserGroup.newVisitUsers){
      retentionMetricalField = _.get(datasourceCurrent, 'params.loginId') || retentionMetricalField
    } else if (globalUserGroupId && !isBuiltinUsergroupId(globalUserGroupId)) {
      retentionMetricalField =  this.getRetentionMetricalField() || retentionMetricalField
    }
    compareByDimensionDistinctValue = _.isArray(compareByDimensionDistinctValue)
      ? compareByDimensionDistinctValue
      : [compareByDimensionDistinctValue].filter(_.identity)

    let { comparingStepsData, isFetchingState } = this.state
    if (!_.get(comparingStepsData, '[0].totalRetentionData')) {
      return (
        <div className="pd2t bg-fb relative" style={{height: 'calc(100% - 254px)', minHeight: '340px'}}>
          {0 < isFetchingState
            ? (
              <Spin spinning>
                <div style={{height: 'calc(100% - 254px)', minHeight: '340px'}}>{'\u00a0'}</div>
              </Spin>
            )
            : (
              <div className="center-of-relative aligncenter ">
                <img
                  className="itblock"
                  src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/images/ui-nothing.png`}
                  alt="Error hint"
                />
                <div className="mg2t font13" style={{color: '#595959'}}>请执行查询</div>
              </div>
            )}
        </div>
      )
    }

    if (!retentionDimension) {
      return <Alert msg="没有定义用户行为" />
    }

    let idTypeTitle = dimTranslationDict[retentionMetricalField] || retentionMetricalField

    let {startStep = [], endStep = []} = retentionSelected && retentionSelected.params || {}
    let startStepText = `【${startStep.filter(_.identity).join(' => ') || '不限'}】`
    let endStepText = retentionType === 'sameEvent'
      ? startStepText
      : `【${endStep.filter(_.identity).join(' => ' ) || '不限'}】`

    let [finalSince, finalUntil] = relativeTime === 'custom' ? [since, until] : convertDateType(relativeTime)

    const createCompareDimensionSelect = () => {
      return (
        <Select
          {...enableSelectSearch}
          className="itblock"
          onChange={val => {
            retentionUpdater('params', params => {
              return {
                ...params,
                compareByDimension: val,
                compareByDimensionDistinctValue: null
              }
            })
          }}
          allowClear
          value={compareByDimension}
          style={{width: 100, marginRight: 10, marginLeft: 10}}
          placeholder="选择维度"
          notFoundContent="查无内容"
          dropdownMatchSelectWidth={false}
          getPopupContainer={() => document.querySelector('.scroll-content')}
        >
          {(dbDims || []).filter(d => isStringDimension(d) && !isGroupDimension(d)).map(dimension => {
            return (
              <Option value={dimension.name} key={dimension.name}>{dimension.title || dimension.name}</Option>
            )
          })}
        </Select>
      )
    }

    const createCompareFieldSelect = () => {
      let dsId = dataSourceSelected && dataSourceSelected.id || ''
      return (
        <DruidDataFetcher
          dbDimensions={dbDims}
          dataSourceId={dsId}
          dimensions={[compareByDimension]}
          metrics={[]}
          customMetrics={[{name: 'count', formula: '$main.count()'}]}
          doFetch={!!dsId}
          filters={[{col: '__time', op: 'in', eq: isRelative(relativeTime) ? relativeTime : [since, until]}]}
          dimensionExtraSettingDict={{[compareByDimension]: {sortCol: 'count', sortDirect: 'desc', limit: distinctDropDownFirstNLimit}}}
          groupByAlgorithm="topN"
        >
          {({isFetching, data, fetch}) => {
            let topN = (data || []).map(d => d[compareByDimension]).filter(_.identity)
            return (
              <MultiSelect
                getPopupContainer={() => document.querySelector('.scroll-content')}
                options={topN}
                className="width200"
                isLoading={isFetching}
                value={compareByDimensionDistinctValue}
                onChange={vals => {
                  if (vals.length > 5) {
                    message.warn('最多选择 5 个筛选项', 3)
                  }
                  retentionUpdater('params.compareByDimensionDistinctValue', () => _.takeRight(vals, 5))
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

    const createCompareUsergroupSelect = () => {
      let validUsergroupIdsSet = new Set(dataSourceCompareUserGroups.map(ug => ug.id))
      let {firstVisitTimeDimName, firstLoginTimeDimName, loginId} = _.get(datasourceCurrent, 'params') || {}
      return (
        <Loading
          isLoading={isFetchingDataSourceCompareUserGroups}
          indicatePosition="right"
          className="iblock"
        >
          <MultiSelect
            getPopupContainer={() => document.querySelector('.scroll-content')}
            options={dataSourceCompareUserGroups}
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
            placeholder="选择分群"
            isLoading={isFetchingDataSourceCompareUserGroups}
            value={(selectedUserGroupIds || []).filter(ugId => validUsergroupIdsSet.has(ugId))}
            onChange={vals => {
              if (vals.length > 5) {
                message.warn('最多选择 5 个筛选项', 3)
              }
              retentionUpdater('params.selectedUserGroupIds', () => {
                let arr = _.isArray(vals) ? vals : [vals].filter(_.identity)
                return _.takeRight(arr, 5)
              })
            }}
          />
        </Loading>
      )
    }

    const compareRadio = (
      <div className="fleft">
        <RadioGroup
          onChange={ev => {
            let val = ev.target.value
            retentionUpdater('params.compareType', () => val)
          }}
          value={compareType}
        >
          <RadioButton value="dimension" >维度对比</RadioButton>
          <RadioButton value="usergroup" >分群对比</RadioButton>
        </RadioGroup>
      </div>
    )

    const tabTips = (
      <div>
        <p>留存图代表了在选择的时间范围内,</p>
        <p>符合起始行为和回访行为的用户群组, 他们每一天的留存比例.</p>
        <p>留存表的横轴是相对时间, 也就是以起始行为的发生日为基准, 看n天后的留存情况.</p>
        <p>留存表每一列的加权平均, 就是留存图的数值</p>
      </div>
    )
    const chartTips = (
      <div>
        <p>留存图代表了在选择的时间范围内,</p>
        <p>符合起始行为和回访行为的用户群组, 他们的平均留存比例.</p>
        <p>留存图的横轴是相对时间, 也就是以起始行为的发生日为基准, 看n天后的留存情况</p>
      </div>
    )


    let currUserGroups = selectedUserGroupIds.map(ugId => _.find(dataSourceCompareUserGroups, ug => ug.id === ugId))
      .filter(_.identity)

    let chartsData = _.flatMap(comparingStepsData, (csd, idx) => {
      let { totalRetentionData, compareByDimensionRetentionData, compareByUserGroupRetentionData } = csd
      let titles = compareType === 'dimension' ? compareByDimensionDistinctValue : currUserGroups.map(ug => ug.title)
      let dataArr = compareType === 'dimension' ? compareByDimensionRetentionData : compareByUserGroupRetentionData

      let prefix = _.size(comparingStepsData.filter(d => _(d).values().some())) <= 1 ? '' : `第 ${idx + 1} 组`
      let nameAndDataArr = [
        {name: `${prefix}概况`, stepIndex: idx, groupName: '概况', data: totalRetentionData},
        ...(titles || []).map((title, i) => ({
          name: `${prefix}${title}`,
          stepIndex: idx,
          groupName: title,
          data: _.get(dataArr, [i])
        }))
      ].filter(r => r.data)

      let chartDataArr = transformData(
        nameAndDataArr,
        granularityType,
        finalSince,
        finalUntil
      )
      return chartDataArr
    })

    let suitableGrs = findSuitableRetentionGranularity([finalSince, finalUntil])
    return (
      <div className="pd3x pd3b bg-fb pd2t" style={{minWidth: '800px'}}>
        {hideSettingControl ? null : (
          <div className="fix">
            {compareType === 'dimension' ? createCompareDimensionSelect() : null}
            {compareType === 'dimension' && compareByDimension ? createCompareFieldSelect() : null}
            {compareType === 'usergroup' ? createCompareUsergroupSelect() : null}
            {compareRadio}
    
            <div className="fright">
              <RadioGroup
                style={{ marginRight: 10}}
                onChange={ev => {
                  let val = ev.target.value
                  retentionUpdater('params.granularityType', () => val)
                }}
                value={granularityType}
              >
                <RadioButton
                  value="P1D"
                  disabled={!_.includes(suitableGrs, 'P1D')}
                >日</RadioButton>
                <RadioButton
                  value="P1W"
                  disabled={!_.includes(suitableGrs, 'P1W')}
                >周</RadioButton>
                <RadioButton
                  value="P1M"
                  disabled={!_.includes(suitableGrs, 'P1M')}
                >月</RadioButton>
              </RadioGroup>
      
              <RadioGroup
                onChange={ev => {
                  let v = ev.target.value
                  retentionUpdater('params.displayType', () => v)
                }}
                value={displayType}
              >
                <RadioButton value="number">数值</RadioButton>
                <RadioButton value="percent">百分比</RadioButton>
              </RadioGroup>
            </div>
          </div>
        )}
        
        {hideSettingControl ? null : (
          <div className="sub-line pd2t">
            <span className="label-z">注释：</span>
            <span className="label">时间范围:</span>
            <span>{finalSince} 至 {finalUntil}</span>
            <span className="label">用户类型:</span>
            <span>{idTypeTitle}</span>
            <span className="label">起始行为:</span>
            <span>{startStepText}</span>
            <span className="label">回访行为:</span>
            <span>{endStepText}</span>
          </div>
        )}
  
        {0 < isFetchingState
          ? (
            <Spin spinning>
              <div style={{height: 'calc(100% - 254px)', minHeight: '340px'}}>{'\u00a0'}</div>
            </Spin>
          )
          : (
            <React.Fragment>
              <div className="chart-box line-chart">
                <Card
                  title={(
                    <span>
                      留存趋势概况
                      <Popover placement="right" content={chartTips} trigger="hover">
                        <QuestionCircleOutlined className="mg1l" />
                      </Popover>
                    </span>
                  )}
                  bordered={false}
                  extra={(
                    <span>
                      <Checkbox
                        checked={skipZeroRetention}
                        onChange={ev => {
                          let {checked} = ev.target
                          retentionUpdater('params.skipZeroRetention', () => checked)
                        }}
                      >剔除 0 用户回访</Checkbox>
                      
                      <Popover
                        placement="right"
                        content="适用场景：在选择时间范围内，剔除*天后回访为0人后，再统计平均留存率。譬如满足统计非节假日访问客户的留存情况。"
                        trigger="hover"
                      >
                        <QuestionCircleOutlined className="mg1l" />
                      </Popover>
                    </span>
                  )}
                >
                  <RetentionLineChart
                    retention={retentionSelected}
                    multiStepData={chartsData}
                    granularityType={granularityType}
                  />
    
                </Card>
              </div>
  
              <div className="chart-box ">
                <Card
                  title={(
                    <span>
                      留存趋势细节
                      <Popover placement="right" content={tabTips} trigger="hover">
                        <QuestionCircleOutlined className="mg1l" />
                      </Popover>
                    </span>
                  )}
                  bordered={false}
                >
                  <RetentionTable
                    location={location}
                    retention={retentionSelected}
                    datasourceCurrent={datasourceCurrent}
                    dataSourceCompareUserGroups={dataSourceCompareUserGroups}
                    data={chartsData}
                    displayType={displayType}
                    granularityType={granularityType}
                    getRetentionMetricalField={this.getRetentionMetricalField}
                  />
                </Card>
              </div>
            </React.Fragment>
          )}
      </div>
    );
  }

  renderMultiStepFetcher(retentionSelected) {
    // TODO 建议重写加载数据逻辑，改用 saga-model 或 async-task-runner
    // 生成 FetcherAgent，来加载不同留存步骤的对比数据
    let { allowFetch } = this.props

    // {startStep, endStep, startStep_1, endStep_2} => [{startStep, endStep}, ...]
    let stepPairs = getStepPairs(retentionSelected)
    return _.flatMap(stepPairs, (sp, idx) => {
      let retention0 = immutateUpdates(retentionSelected,
        'params', p => _(p).omitBy((v, k) => _.startsWith(k, 'startStep') || _.endsWith(k, 'endStep')).assign(sp).value(),
        'params.retentionMetricalField', field => field || this.getRetentionMetricalField())

      let {
        compareType = 'dimension',
        compareByDimension,
        selectedUserGroupIds
      } = retention0.params || {}
      return [
        // 加载总计数据
        this.genLuceneFetcher(retention0, props => ({
          ...props,
          doFetch: !!(props.doFetch && allowFetch),
          onData: data => {
            this.setState(prevState => {
              return {
                comparingStepsData: immutateUpdate(prevState.comparingStepsData, [idx, 'totalRetentionData'], () => data)
              }
            })
          },
          onFetchingStateChange: isFetching => this.setState(({isFetchingState}) => {
            return {
              isFetchingState: isFetching ? isFetchingState | 1 : isFetchingState & ~1
            }
          }),
          onFetcherUnmount: () => {
            // 如果 fetcher 被卸载，则删除自己生产的数据
            this.setState(prevState => {
              return {
                comparingStepsData: immutateUpdate(prevState.comparingStepsData, [idx, 'totalRetentionData'], () => null)
              }
            })
          },
          key: `total-${idx}`
        })),
        // 加载维度对比数据
        compareType === 'dimension' && compareByDimension
          ? this.renderDimensionComparingRetentionFetcher(retention0, idx, `dim-compare-${idx}`)
          : null,
        // 加载分群对比数据
        compareType === 'usergroup' && !_.isEmpty(selectedUserGroupIds)
          ? this.renderUserGroupComparingRetentionFetcher(retention0, idx, `ug-compare-${idx}`)
          : null
      ]
    }).filter(_.identity)
  }

  renderDimensionComparingRetentionFetcher(retentionSelected, stepIndex, key = undefined) {
    let { allowFetch } = this.props
    let { compareByDimension, compareByDimensionDistinctValue } = retentionSelected.params || {}

    let compareByDimensionDistinctValues = _.isArray(compareByDimensionDistinctValue)
      ? compareByDimensionDistinctValue : [compareByDimensionDistinctValue].filter(_.identity)

    let genSingleFunnelDataFetcher = distinctVal => {
      let retDelta = _.isUndefined(distinctVal)
        ? retentionSelected
        : immutateUpdate(retentionSelected, 'params.extraFilters', extFlts => {
          return insert(extFlts, 0, { col: compareByDimension, op: 'in', eq: [distinctVal] })
        })
      return this.genLuceneFetcher(retDelta)
    }

    if (_.isEmpty(compareByDimensionDistinctValues)) {
      return null
    }

    return (
      <FetcherAgent
        key={key}
        fetcherComponent={LuceneFetcher}
        initState={{
          /* _retention 只为触发重新加载全部数据 */
          _retention: retentionSelected,
          isAgentFetching: !_.isEmpty(compareByDimensionDistinctValue) && allowFetch,
          dimensionDistinctValues: compareByDimensionDistinctValues
        }}
        getFetcherProps={state => {
          let distinctVal = _.first(state.dimensionDistinctValues)
          let {props} = genSingleFunnelDataFetcher(distinctVal)
          return {...props, onFetcherUnmount: null, doFetch: distinctVal ? props.doFetch : false}
        }}
        setStateWhenFetchDone={(data, agentCurrState) => {
          let nextQueue = _.drop(agentCurrState.dimensionDistinctValues, 1)
          let nextAccData = [...(agentCurrState.accData || []), data]
          if (_.isEmpty(nextQueue)) {
            // done query
            this.setState(({isFetchingState, comparingStepsData}) => {
              return {
                isFetchingState: isFetchingState & ~2,
                // compareByDimensionRetentionData: nextAccData,
                comparingStepsData: immutateUpdate(comparingStepsData, [stepIndex, 'compareByDimensionRetentionData'], () => nextAccData)
              }
            })
            return {
              isAgentFetching: false,
              dimensionDistinctValues: nextQueue,
              accData: []
            }
          } else {
            this.setState(({comparingStepsData}) => ({
              // compareByDimensionRetentionData: nextAccData
              comparingStepsData: immutateUpdate(comparingStepsData, [stepIndex, 'compareByDimensionRetentionData'], () => nextAccData)
            }))
            return {
              dimensionDistinctValues: nextQueue,
              accData: nextAccData
            }
          }
        }}
        onFetchingStateChange={isFetching => {
          this.setState(({isFetchingState}) => {
            return {
              isFetchingState: isFetching ? isFetchingState | 2 : isFetchingState & ~2
            }
          })
        }}
        onFetcherUnmount={() => {
          this.setState(({comparingStepsData}) => ({
            comparingStepsData: immutateUpdate(comparingStepsData, [stepIndex, 'compareByDimensionRetentionData'], () => null)
          }))
        }}
      />
    )
  }

  renderUserGroupComparingRetentionFetcher(retentionSelected, stepIndex) {
    let {
      dataSourceCompareUserGroups,
      datasourceCurrent
    } = this.props

    dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

    let { allowFetch } = this.props
    let { compareType = 'dimension', selectedUserGroupIds } = retentionSelected.params || {}

    let currentComparingUserGroupIds = compareType === 'usergroup' && _.isArray(selectedUserGroupIds) && selectedUserGroupIds
    let currComparingUserGroups = currentComparingUserGroupIds
      && currentComparingUserGroupIds.map(ugId => _.find(dataSourceCompareUserGroups, ug => ug.id === ugId)).filter(_.identity)

    if (_.isEmpty(currComparingUserGroups)) {
      return null
    }

    let genSingleFunnelDataFetcher = ug => {
      let retDelta = ug ? immutateUpdate(retentionSelected, 'params.extraFilters', extFlts => {
        return insert(extFlts, 0, {
          col: ug.params.groupby,
          op: 'lookupin',
          eq: ug.id
        })
      }) : retentionSelected
      return this.genLuceneFetcher(retDelta)
    }

    return (
      <FetcherAgent
        fetcherComponent={LuceneFetcher}
        initState={{
          /* _retention 只为触发重新加载全部数据 */
          _retention: retentionSelected,
          isAgentFetching: !_.isEmpty(currComparingUserGroups) && allowFetch,
          ugsToFetch: currComparingUserGroups
        }}
        getFetcherProps={state => {
          let ug = _.first(state.ugsToFetch)
          let {props} = genSingleFunnelDataFetcher(ug)
          return {...props, onFetcherUnmount: null, doFetch: ug ? props.doFetch : false}
        }}
        setStateWhenFetchDone={(data, agentCurrState) => {
          let nextQueue = _.drop(agentCurrState.ugsToFetch, 1)
          let nextAccData = [...(agentCurrState.accData || []), data]

          if (_.isEmpty(nextQueue)) {
            // done query
            this.setState(({isFetchingState, comparingStepsData}) => {
              return {
                isFetchingState: isFetchingState & ~4,
                // compareByUserGroupRetentionData: nextAccData,
                comparingStepsData: immutateUpdate(comparingStepsData, [stepIndex, 'compareByUserGroupRetentionData'], () => nextAccData)
              }
            })
            return {
              isAgentFetching: false,
              ugsToFetch: nextQueue,
              accData: []
            }
          } else {
            this.setState(({comparingStepsData}) => ({
              // compareByUserGroupRetentionData: nextAccData
              comparingStepsData: immutateUpdate(comparingStepsData, [stepIndex, 'compareByUserGroupRetentionData'], () => nextAccData)
            }))
            return {
              ugsToFetch: nextQueue,
              accData: nextAccData
            }
          }
        }}
        onFetchingStateChange={isFetching => this.setState(({isFetchingState}) => {
          return {
            isFetchingState: isFetching ? isFetchingState | 4 : isFetchingState & ~4
          }
        })}
        onFetcherUnmount={() => {
          this.setState(({comparingStepsData}) => ({
            comparingStepsData: immutateUpdate(comparingStepsData, [stepIndex, 'compareByUserGroupRetentionData'], () => null)
          }))
        }}
      />
    )
  }

  render() {
    let { retentionSelected = {}, isFetchingDataSourceDimensions } = this.props

    return (
      <React.Fragment>
        {this.renderMultiStepFetcher(retentionSelected)}

        {!isFetchingDataSourceDimensions ? this.renderRetentionContent() : null}
      </React.Fragment>
    )
  }
}
