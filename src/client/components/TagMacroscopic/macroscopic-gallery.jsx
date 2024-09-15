import React from 'react'
import {Card, Col, Row, Tabs, Checkbox} from 'antd'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import AsyncTaskRunner from '../Common/async-task-runner'
import _ from 'lodash'
import Resources from '../../models/segment/resources'
import ReactEcharts from '../Charts/ReactEchartsEnhance'
import EchartsBaseOpts from '../../common/echart-base-options'
import * as d3 from 'd3'
import {TagType} from '../../../common/constants'
import {groupBy, immutateUpdate, immutateUpdates, isDiffBySomePath} from '../../../common/sugo-utils'
import {checkPermission} from '../../common/permission-control'
import {Link} from 'react-router'
import {untypedTreeId} from '../TagManager/tag-type-list'
import {EMPTY_TAG_TITLE} from '../../constants/string-constant'

const TabPane = Tabs.TabPane

const percent = _.flow(v => _.floor(v, 4), d3.format('.2%'))
const percentf0 = _.flow(v => _.floor(v, 2), d3.format('.0%'))

const canAccessTagManager = checkPermission('get:/console/tag-system-manager')

@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class MacroscopicGallery extends React.Component {
  state = {
    tagFrequencyNameDict: {},
    subTagsDict: {},
    isFetchingGalleryData: false,

    tagFrequencyNameDict_all: {},
    subTagsDict_all: {},
    isFetchingGalleryData_all: false,

    activeTagTypeIdForTab: null,

    showUncoveredTagSettings: {}
  }

  componentWillReceiveProps(nextProps) {
    // 已经查过的就不再查询，不过需要在条件变更时清除缓存
    if (isDiffBySomePath(this.props, nextProps, 'projectCurrent', 'filters')) {
      this.setState({
        tagFrequencyNameDict: {},
        subTagsDict: {},
        isFetchingGalleryData: false,

        tagFrequencyNameDict_all: {},
        subTagsDict_all: {},
        isFetchingGalleryData_all: false,

        activeTagTypeIdForTab: null
      })
    }
  }

  renderGalleryDataFetcher(suffix = '', argsModer = _.identity) {
    let {filters, dbTags, activeTagIds, tagProject} = this.props
    let {[`tagFrequencyNameDict${suffix}`]: tagFrequencyNameDict} = this.state

    // 如果存在子项目，优先取子项目parent_id
    const projectId = tagProject.parent_id || tagProject.id
    const datasourceId = tagProject.datasource_id
    // 子项目ID，用来查询子项目设置的数据过滤条件
    const childProjectId = !_.isEmpty(tagProject.parent_id) ? tagProject.id : null

    let tagNames = (activeTagIds || []).map(tagId => _.find(dbTags, dbTag => dbTag.id === tagId))
      .filter(tag => tag && !(tag.name in tagFrequencyNameDict)) // 已经查过的就不再查询，不过需要在条件变更时清除缓存
      .map(tag => tag.name)
    const args = argsModer([projectId, '', datasourceId, tagNames, filters, childProjectId, {sCache: 180, cCache: 'PT60S'}])
    // TODO 考虑查询时条件变更的情况？
    return (
      <AsyncTaskRunner
        key={`queryTagGalleryByDruidQuery${suffix}`}
        doRun={_.every([projectId, tagNames], v => !_.isEmpty(v))}
        args={args}
        task={Resources.queryTagGalleryByDruidQuery}
        onRunningStateChange={isFetchingGalleryData => this.setState({isFetchingGalleryData})}
        onResult={res => {
          let { result, success, message } = res
          if (!success) { 
            return
          }

          const { tags: tags_arr, tag_groups } = result

          this.setState(prevState => {
            return immutateUpdates(prevState,
              `tagFrequencyNameDict${suffix}`, o => ({...o, ...tag_groups}),
              `subTagsDict${suffix}`, o => ({...o, ..._.groupBy(tags_arr, tag => tag.name)})
            )
          })
        }}
      />
    )
  }

  getTagFrequency(tag, suffix = '') {
    let {[`tagFrequencyNameDict${suffix}`]: tagFrequencyNameDict} = this.state
    return _.get(tagFrequencyNameDict, tag.name)
  }

  frequencyToRatio(tag, suffix = '', topN = 10) {
    let {ugUserCount, allUserCount} = this.props
    let {[`tagFrequencyNameDict${suffix}`]: tagFrequencyNameDict, [`subTagsDict${suffix}`]: subTagsDict} = this.state
    let freq = _.get(tagFrequencyNameDict, tag.name)
    if (_.isEmpty(freq)) {
      return null
    }
    let subTagType = _.get(subTagsDict, [tag.name, 0, 'type'])

    // 字符串类型以计数排序，数值以范围排序
    let orderByStrategy = subTagType === TagType.String
      ? [k => freq[k], 'desc']
      : [(() => {
        let subTagRangeDict = _(subTagsDict[tag.name]).keyBy('tag_name').mapValues(st => st.tag_value.split('`')[0]).value()
        return k => +subTagRangeDict[k]
      })(), 'asc']
    let freqKeys = _(freq).keys().orderBy(...orderByStrategy).take(topN).value()

    // 标签可能存在集合交叉，这里需要除以总数，而不是标签的人数的求和
    let freqSum = suffix === '_all' ? allUserCount : ugUserCount
    return _(freq).mapValues(v => freqSum === 0 ? 0 : v/freqSum).pick(freqKeys).value()
  }

  renderRatioChart(tag) {
    let {isFetchingGalleryData, tagFrequencyNameDict, showUncoveredTagSettings} = this.state
    let top10FreqPercent = this.frequencyToRatio(tag) || {}
    let showUncovered = _.get(showUncoveredTagSettings, tag.name)

    if (isFetchingGalleryData && _.isEmpty(top10FreqPercent)) {
      return <div className="aligncenter font20 pd3 color-gray">加载中...</div>
    }
    if (!showUncovered) {
      top10FreqPercent = _.omitBy(top10FreqPercent, (val, key) => _.endsWith(key, EMPTY_TAG_TITLE))
    }
    if (_.isEmpty(top10FreqPercent)) {
      const configDom = (
        <Link
          to={`/console/tag-system-manager?dimId=${tag.id}&action=update-tag`}
          className="pointer"
        >配置</Link>
      )
      return (
        <div className="aligncenter font20 pd3 color-gray">
          需先{canAccessTagManager ? configDom : '配置'}子标签
        </div>
      )
    }
    const top10FreqKeys = _.keys(top10FreqPercent)
    return (
      <Row gutter={16}>
        <Col span={12}>
          <ReactEcharts
            notMerge
            option={{
              ...EchartsBaseOpts,
              tooltip: {
                trigger: 'item',
                confine: true,
                formatter: (params) => {
                  let val = _.get(tagFrequencyNameDict, [tag.name, params.data.name])
                  return `${tag.title || tag.name} <br/>${params.data.name}: ${val} 人 (${percent(params.data.value)})`
                }
              },
              series: [
                {
                  name: tag.title || tag.name,
                  type: 'pie',
                  radius: ['50%', '70%'],
                  roseType: 'radius',
                  avoidLabelOverlap: false,
                  label: {
                    normal: {
                      show: false,
                      position: 'center'
                    },
                    emphasis: {
                      show: true,
                      textStyle: {
                        fontSize: '20',
                        fontWeight: 'normal'
                      }
                    }
                  },
                  labelLine: {
                    normal: {
                      show: false
                    }
                  },
                  data: top10FreqKeys.map(k => ({name: k, value: top10FreqPercent[k]}))
                }
              ]
            }}
          />
        </Col>
        <Col span={12}>
          <ReactEcharts
            notMerge
            option={{
              ...EchartsBaseOpts,
              grid: {
                left: 'center',
                right: '60px'
              },
              tooltip: {
                trigger: 'item',
                confine: true,
                formatter: (params) => {
                  let val = _.get(tagFrequencyNameDict, [tag.name, params.data.name])
                  return `${tag.title || tag.name} <br/>${params.data.name}: ${val} 人 (${percent(params.data.value)})`
                }
              },
              /*            legend: {
                orient: 'vertical',
                x: 'left',
                data: freqKeys
              },*/
              xAxis: {
                type: 'value',
                axisTick: {
                  show: false
                },
                axisLine: {
                  show: false
                },
                axisLabel: {
                  show: false
                },
                splitLine: {
                  show: false
                }
              },
              yAxis: [
                {
                  type: 'category',
                  inverse: true,
                  data: top10FreqKeys,
                  axisTick: {
                    show: false
                  },
                  axisLine: {
                    show: false
                  },
                  axisLabel: {
                    textStyle: {
                      color: '#333'
                    }
                  }
                }
              ],
              series: [
                {
                  barMaxWidth: 10,
                  barMinHeight: 1,
                  barGap: '1%',
                  barCategoryGap: '10%',
                  label: {
                    normal: {
                      show: true,
                      position: 'right',
                      color: '#333',
                      formatter: function (obj) {
                        return percent(obj.value)
                      }
                    }
                  },
                  name: tag.name,
                  type: 'bar',
                  data: top10FreqKeys.map((k, i) => ({
                    name: k,
                    value: top10FreqPercent[k],
                    itemStyle: {
                      normal: {
                        color: EchartsBaseOpts.color[i % EchartsBaseOpts.color.length]
                      }
                    }
                  }))
                }
              ]
            }}
          />
        </Col>
      </Row>
    )
  }

  renderBarChart(tag) {
    let {compareToAll, ugUserCount, allUserCount} = this.props
    let {isFetchingGalleryData, tagFrequencyNameDict, tagFrequencyNameDict_all, showUncoveredTagSettings} = this.state
    let top10FreqPercent = this.frequencyToRatio(tag) || {}
    let top10FreqPercent_all = compareToAll && this.frequencyToRatio(tag, '_all') || {}

    let showUncovered = _.get(showUncoveredTagSettings, tag.name)
    if (isFetchingGalleryData && (_.isEmpty(top10FreqPercent) || _.isEmpty(top10FreqPercent_all))) {
      return <div className="aligncenter font20 pd3 color-gray">加载中...</div>
    }

    let freq = this.getTagFrequency(tag)
    let uncoveredUserCount = _(freq).pickBy((val, key) => _.endsWith(key, EMPTY_TAG_TITLE)).values().sum()

    if (!showUncovered) {
      top10FreqPercent = _.omitBy(top10FreqPercent, (val, key) => _.endsWith(key, EMPTY_TAG_TITLE))
      top10FreqPercent_all = _.omitBy(top10FreqPercent_all, (val, key) => _.endsWith(key, EMPTY_TAG_TITLE))
    }
    if (_.isEmpty(top10FreqPercent)) {
      const configDom = (
        <Link
          to={`/console/tag-system-manager?dimId=${tag.id}&action=update-tag`}
          className="pointer"
        >配置</Link>
      )
      return (
        <div className="aligncenter font20 pd3 color-gray">
          需先{canAccessTagManager ? configDom : '配置'}子标签
        </div>
      )
    }
    const top10FreqKeys = _.keys(top10FreqPercent)

    const legends = [`筛选用户（${ugUserCount - uncoveredUserCount} 人）`, compareToAll ? `整体（${allUserCount} 人）` : null].filter(_.identity)
    const barStyle = {
      barMaxWidth: '20px',
      barMinHeight: 0,
      barGap: '50%',
      barCategoryGap: '50%'
    }

    return (
      <ReactEcharts
        notMerge
        option={{
          ...EchartsBaseOpts,
          tooltip: {
            trigger: 'item',
            confine: true,
            formatter(r) {
              let val = _.get(r.seriesIndex === 0 ? tagFrequencyNameDict : tagFrequencyNameDict_all, [tag.name, r.name])
              return `${r.seriesName}<br/>${r.name}: ${val} 人 (${percent(r.value)})`
            }
          },
          legend: {
            orient: 'vertical',
            x: 'left',
            data: legends
          },
          xAxis: {
            type: 'category',
            data: top10FreqKeys
          },
          yAxis: [
            {
              type: 'value',
              axisLabel: {
                formatter: percentf0
              }
            }
          ],
          series: [
            {
              ...barStyle,
              name: legends[0],
              type: 'bar',
              label: {
                normal: {
                  show: true,
                  position: 'top',
                  formatter(r) {
                    let val = _.get(r.seriesIndex === 0 ? tagFrequencyNameDict : tagFrequencyNameDict_all, [tag.name, r.name])
                    return val === 0 ? '0 人' : `${val} 人`
                  }
                }
              },
              data: top10FreqKeys.map(k => ({
                value: top10FreqPercent[k],
                itemStyle: {
                  normal: {
                    color: EchartsBaseOpts.color[0]
                  }
                }
              }))
            },
            compareToAll ? {
              ...barStyle,
              name: legends[1],
              type: 'bar',
              label: {
                normal: {
                  show: true,
                  position: 'top',
                  textShadowColor: '#fff',
                  textShadowOffsetX: 1,
                  textShadowOffsetY: 1,
                  formatter(r) {
                    let val = _.get(r.seriesIndex === 0 ? tagFrequencyNameDict : tagFrequencyNameDict_all, [tag.name, r.name])
                    return val === 0 ? '0 人' : `${val} 人 (${percentf0(r.value)})`
                  }
                }
              },
              data: top10FreqKeys.map(k => ({
                value: top10FreqPercent_all[k],
                itemStyle: {
                  normal: {
                    color: EchartsBaseOpts.color[1]
                  }
                }
              }))
            } : null
          ].filter(_.identity)
        }}
      />
    )
  }

  renderCardTitle(tag) {
    // 显示当前标签覆盖用户数及覆盖率，选择用户群后，则显示当前用户群的标签覆盖数及覆盖率
    let {ugUserCount} = this.props
    let freq = this.getTagFrequency(tag)
    if (!freq) {
      return tag.title || tag.name
    }
    let uncoveredUserCount = _(freq).pickBy((val, key) => _.endsWith(key, EMPTY_TAG_TITLE)).values().sum()
    const coverRate = ugUserCount === 0 ? 0 : (ugUserCount - uncoveredUserCount) / ugUserCount
    return (
      <div>
        {tag.title || tag.name}
        <span className="color-gray mg1l">（覆盖用户数：{ugUserCount - uncoveredUserCount}，覆盖率：{percent(coverRate)}）</span>
      </div>
    )
  }

  renderCardExtra(tag) {
    let {showUncoveredTagSettings} = this.state
    return (
      <Checkbox
        checked={_.get(showUncoveredTagSettings, tag.name)}
        onChange={ev => {
          let {checked} = ev.target
          this.setState({
            showUncoveredTagSettings: {...showUncoveredTagSettings, [tag.name]: checked}
          })
        }}
      >显示未覆盖的用户</Checkbox>
    )
  }

  render() {
    let {activeTagIds, dbTags, tagTypeMappings, tagTypes, compareToAll} = this.props
    let {activeTagTypeIdForTab} = this.state

    if (_.isEmpty(activeTagIds)) {
      return <div className="font20 aligncenter pd3 color-gray">未选择标签</div>
    }
    let tagIdDict = _.keyBy(dbTags, 'id')

    let typeTagsDict = groupBy(tagTypeMappings, m => m.tag_tree_id, ms => ms.map(m => m.dimension_id))
    let typedTagIdSet = new Set((tagTypeMappings || []).map(m => m.dimension_id))
    typeTagsDict[untypedTreeId] = (dbTags || []).filter(t => !typedTagIdSet.has(t.id)).map(t => t.id)

    const tabPanes = tagTypes.filter(_.identity).map(type => {
      let typeTagIds = typeTagsDict[type.id]
      let intersection = _.intersection(activeTagIds, typeTagIds)
      if (_.isEmpty(intersection)) {
        return null
      }
      return (
        <TabPane tab={type.name} key={type.id}>
          <Row gutter={16} key="charts">
            {(intersection || []).map(tagId => {
              let tag = tagIdDict[tagId]
              if (!tag) {
                return null
              }
              let chartType = _.get(tag, 'params.chartType')
              const cardContent = chartType === 'pie' && !compareToAll
                ? this.renderRatioChart(tag)
                : this.renderBarChart(tag)

              if (!cardContent) {
                return null
              }
              return (
                <Col lg={12} key={tagId} className="mg2b">
                  <Card title={this.renderCardTitle(tag)} extra={this.renderCardExtra(tag)}>
                    {cardContent}
                  </Card>
                </Col>
              )
            })}
          </Row>
        </TabPane>
      )
    })

    return [
      this.renderGalleryDataFetcher(),
      compareToAll ? this.renderGalleryDataFetcher('_all', args => immutateUpdate(args, [4], () => [])) : null,
      <Tabs
        key="tabs"
        activeKey={activeTagTypeIdForTab || _(tagTypes).chain().find((type, idx) => tabPanes[idx]).get('id').value()}
        onChange={activeTagTypeId => {
          this.setState({activeTagTypeIdForTab: activeTagTypeId})
        }}
      >
        {tabPanes}
      </Tabs>
    ]
  }
}
