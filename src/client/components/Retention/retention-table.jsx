import React from 'react'
import PropTypes from 'prop-types'
import {Table, Popover} from 'antd'
import moment from 'moment'
import _ from 'lodash'
import {immutateUpdate, immutateUpdates, insert} from '../../../common/sugo-utils'
import {transformBuiltinUserGroups} from '../../../common/druid-query-utils'
import {isRelative} from '../../../common/param-transform'
import {BuiltinUserGroup} from '../../../common/constants'
import {findOrCreateTempUsergroup, saveAndBrowserInInsight, retentionToUsergroup} from '../../common/usergroup-helper'

const defaultProps = {
  data: [
    {
      name: '概况',
      total: 0,
      data: [],
      children: [{}]
    }
  ],
  displayType: 'number',
  granularityType: 'day',
  loading: false
}

const propTypes = {
  retention: PropTypes.object.isRequired,
  data: PropTypes.array.isRequired,
  displayType: PropTypes.string.isRequired,
  granularityType: PropTypes.string.isRequired,
  loading: PropTypes.bool
}


export default class RetentionTable extends React.Component {

  static defaultProps = defaultProps
  static propTypes = propTypes

  constructor(props) {
    super(props)

    this.state = {
      dayRange: 7,
      color: '190, 190, 242'//RGB，留存基底色
    }
  }

  buildName = (text, record, granularityType) => {
    if (record.children) {
      return text //概况
    } else {
      let name
      switch (granularityType) {
        case 'P1D':
          name = moment(text).format('YYYY-MM-DD')
          break
        case 'P1W':
          name = `${moment(text).format('YYYY年第W周(YYYY-MM-DD~)')}`
          break
        case 'P1M':
          name = `${moment(text).format('YYYY年M月')}`
          break
        default:
          name = text
          break
      }
      return <span>{name}</span>
    }
  }

  onInspectUsergroup = async ev => {
    let rangePairs = JSON.parse(ev.target.getAttribute('data-range-pairs'))
    let isTotal = ev.target.getAttribute('data-total')
    let stepIndex = ev.target.getAttribute('data-step-index')
    let comparingGroupName = ev.target.getAttribute('data-comparing-group-name')
    let {retention, dataSourceCompareUserGroups, datasourceCurrent, location, getRetentionMetricalField} = this.props

    // 确保 retentionMetricalField 有值
    if (!_.get(retention, 'params.retentionMetricalField')) {
      retention = immutateUpdate(retention, 'params.retentionMetricalField', () => getRetentionMetricalField())
    }

    // 使用自己当前步骤作为默认步骤
    retention = immutateUpdate(retention, 'params', p => {
      let targetStartStepKey = `startStep${+stepIndex === 0 ? '' : `_${stepIndex}`}`
      let targetEndStepKey = `endStep${+stepIndex === 0 ? '' : `_${stepIndex}`}`
      return _(p)
        .omitBy((v, k) => _.startsWith(k, 'startStep') || _.startsWith(k, 'endStep'))
        .assign({startStep: p[targetStartStepKey], endStep: p[targetEndStepKey]})
        .value()
    })
    if (retention.params.retentionType === 'sameEvent') {
      // 旧版 功能留存， endStep 为空，需要兼容
      retention = immutateUpdate(retention, 'params.endStep', () => retention.params.startStep)
    }

    let retention0 = isTotal
      ? immutateUpdate(retention, 'params.endStep', () => [])
      : retention

    // 加入维度对比与分群对比的条件
    if (_.endsWith(comparingGroupName, '概况')) {
      // 应用全局的分群
      let globalUserGroupId = _.get(location, 'query.usergroup_id')
      if (globalUserGroupId) {
        let {dataSourceCompareUserGroups} = this.props
        let ug = _.find(dataSourceCompareUserGroups, {id: globalUserGroupId})
        retention0 = immutateUpdate(retention0, 'params.extraFilters', extFlts => {
          return insert(extFlts, 0, { col: ug.params.groupby, op: 'lookupin', eq: ug.id })
        })
      }
    } else {
      // 插入对比的条件
      let {compareType, compareByDimension} = retention0.params
      if (!compareType || compareType === 'dimension') {
        retention0 = immutateUpdate(retention0, 'params.extraFilters', extFlts => {
          return insert(extFlts, 0, {col: compareByDimension, op: 'in', eq: [comparingGroupName]})
        })
      } else {
        let ug = _.find(dataSourceCompareUserGroups, {title: comparingGroupName})
        retention0 = immutateUpdate(retention0, 'params.extraFilters', extFlts => {
          return insert(extFlts, 0, { col: ug.params.groupby, op: 'lookupin', eq: ug.id })
        })
      }
    }

    // 使用分群的统计字段
    let extraFilters = _.get(retention0, 'params.extraFilters')
    if (_.some(extraFilters, flt => flt.op === 'lookupin')) {
      retention0 = immutateUpdate(retention0, 'params.retentionMetricalField', omf => {
        return _.chain(extraFilters)
          .find(flt => flt.op === 'lookupin')
          .get('col')
          .value() || omf
      })
    }
    // 转换内置分群至普通分群
    let builtInUgFlt = _.find(extraFilters, flt => _.includes(flt.eq + '', 'builtin'))
    if (builtInUgFlt) {
      retention0 = immutateUpdates(retention0,
        'params.extraFilters', exf => {
          let {relativeTime, since, until} = retention0.params
          let timeRangeFlt = {col: '__time', op: 'in', eq: isRelative(relativeTime) ? relativeTime : [since, until]}
          return transformBuiltinUserGroups(exf, timeRangeFlt, datasourceCurrent)
        })
      if (!_.includes(builtInUgFlt.eq + '', BuiltinUserGroup.allLoginUsers)) {
        // 不扩大 __time 会影响内置分群的判断
        retention0 = immutateUpdates(retention0,
          'params.relativeTime', () => 'custom',
          'params.since', () => '1000',
          'params.until', () => '3000')
      }
    }

    let titleOverwrite
    if (1 < _.size(rangePairs)) {
      let {startStep, endStep, retentionDimension} = retention0.params
      let startStepStr = startStep.map((v, i) => v && `${retentionDimension[i]} 为 ${v}`).filter(_.identity).join(', ') || '不限'
      let endStepStr = endStep.map((v, i) => v && `${retentionDimension[i]} 为 ${v}`).filter(_.identity).join(', ') || '不限'
      titleOverwrite = `通过 留存分析 -> 起始行为:【${startStepStr}】回访行为:【${endStepStr}】创建的分群`
    }
    let ug = retentionToUsergroup(retention0, rangePairs, titleOverwrite)
    let userGroupWithTotal = await findOrCreateTempUsergroup(ug)
    saveAndBrowserInInsight(userGroupWithTotal)
  }

  getColumns(granularityType, data, granularityText, granularity, lastDay, displayType) {
    const skipZeroRetention = _.get(this.props.retention, 'params.skipZeroRetention')
    return [
      {
        title: '日期',
        dataIndex: 'name',
        key: 'name',
        width: granularityType === 'P1W' ? 250 : 150,
        fixed: true,
        render: (text, record) => {
          return this.buildName(text, record, granularityType)
        }
      }, {
        title: '用户访问总人次',
        dataIndex: 'total',
        key: 'total',
        className: 'grid',
        width: 120,
        fixed: true,
        render: (text, record) => {
          let finalVal = Math.floor(Number(text)) //筛掉小数
          let parent = record.parentKey && _.find(data, {key: record.parentKey})
          let pairs = record.children
            ? record.children.map(obj => ({
              firstVisitRange: [moment(obj.name).format(), moment(obj.name).add(1, moment.duration(granularityType)).format()],
              returnVisitRange: [moment(obj.name).format(), moment(obj.name).add(1, moment.duration(granularityType)).format()]
            }))
            : [{
              firstVisitRange: [moment(record.name).format(), moment(record.name).add(1, moment.duration(granularityType)).format()],
              returnVisitRange: [moment(record.name).format(), moment(record.name).add(1, moment.duration(granularityType)).format()]
            }]
          return (
            <div style={{padding: 10}}>
              <a
                className="color-main pointer"
                data-range-pairs={JSON.stringify(pairs)}
                data-total="1"
                data-step-index={record.stepIndex === undefined ? parent.stepIndex : record.stepIndex}
                data-comparing-group-name={record.groupName || parent.groupName}
                onClick={this.onInspectUsergroup}
              >{finalVal}</a>
            </div>
          )
        }
      },
      ..._.get(data, '[0].children', []).map((val, i) => {
        // 数据列
        let title = i ? `${i} ${granularityText}后` : `当${granularityText}`
        return {
          title,
          dataIndex: 'data',
          key: `${i + granularityText}后`,
          className: 'grid',
          render: (text, record) => {
            let {children, name, parentKey} = record
            let parent = parentKey && _.find(data, {key: parentKey})
            let len = children ? children.length : 0
            let start = children ? children[0].name : record.name
            let end = children ? children[len - 1 - i].name : record.name
            let date = moment(record.name).add(i, granularity).format()

            if (moment(date).isAfter(lastDay) && !record.children) {
              return ''
            }

            //计算百分比和背景色
            //计算百分比： 概况行，数值与对应日期的总数比较，其他行，数值与该行总数比较

            let amount = 0
            let divider = children
              ? children.reduce((acc, curr, j) => {
                if (skipZeroRetention && _.get(curr.data, [i, 'value'], 0) === 0) {
                  return acc
                }
                return j < children.length - i ? acc + curr.total : acc
              }, 0)
              : record.total
            let scale = 0
            if (children) {
              //概况行
              amount = text[i].value || 0
              scale = amount / (divider || Number.POSITIVE_INFINITY)
            } else if (text[i]) {
              amount = text[i].value || 0
              scale = amount / (divider || Number.POSITIVE_INFINITY)
            } else {
              amount = 0
              scale = 0
            }

            let _scale = (scale > .1 || scale === 0) ? scale : .1
            //过滤一下比例，保证颜色不会过浅
            _scale = _scale * 0.9
            let num = Math.floor(amount)
            record.total = Math.floor(record.total)
            let display = displayType === 'number' ? num : (Math.floor(scale * 10000) / 100).toFixed(1) + '%'
            let startText = granularityType === 'P1D'
              ? start
              : granularityType === 'P1W'
                ? `${moment(start).format('YY年W周')}(${start}~)`
                : `${moment(start).format('YY年M月')}(${start}~)`
            let endText = granularityType === 'P1D'
              ? end
              : granularityType === 'P1W'
                ? `${moment(end).format('YY年W周')}(${end}~)`
                : `${moment(end).format('YY年M月')}(${end}~)`
            let dt = !/^[\d]{2}\-[\d]{2}\-[\d]{2}$/.test(name) && startText !== endText ? `${startText} 到 ${endText}` : startText
            let tip = `${dt} 的 ${divider} 位访问用户中，${num} 人在 ${title}回访。`
            return (
              <Popover content={tip}>
                <div
                  style={{
                    backgroundColor: `RGBA(${this.state.color},${_scale} )`,
                    padding: '10px 0'
                  }}
                >
                  <a
                    className="color-main pointer"
                    data-step-index={record.stepIndex === undefined ? parent.stepIndex : record.stepIndex}
                    data-comparing-group-name={record.groupName || parent.groupName}
                    onClick={this.onInspectUsergroup}
                    data-range-pairs={JSON.stringify(children ? children.map(obj => {
                      let start = obj.name
                      let returnDate = moment(obj.name).add(i, granularity).format()
                      return {
                        firstVisitRange: [moment(start).format(), moment(start).add(1, moment.duration(granularityType)).format()],
                        returnVisitRange: [returnDate, moment(returnDate).add(1, moment.duration(granularityType)).format()]
                      }
                    }) : [{
                      firstVisitRange: [moment(start).format(), moment(start).add(1, moment.duration(granularityType)).format()],
                      returnVisitRange: [date, moment(date).add(1, moment.duration(granularityType)).format()]
                    }])}
                  >
                    {display}
                  </a>
                </div>
              </Popover>
            )
          }
        }
      })
    ]
  }

  render() {
    let {granularityType, displayType, data} = this.props
    let granularity = granularityType === 'P1D' ? 'days' : granularityType === 'P1W' ? 'weeks' : 'months'
    let granularityText = granularityType === 'P1D' ? '天' : granularityType === 'P1W' ? '周' : '月'

    let lastRow = _.last(_.get(data, '[0].children', []))
    let lastDay = lastRow && lastRow.name && moment(lastRow.name).endOf('day') || moment()
    const columns = this.getColumns(granularityType, data, granularityText, granularity, lastDay, displayType)

    return (
      <Table
        bordered
        defaultExpandedRowKeys={[_.get(data, '[0].name')].filter(_.identity)}
        className="pd3x pd2t pd1b"
        columns={columns}
        pagination={false}
        dataSource={data}
        // scroll={{ x: true }}
      />
    )
  }

}


