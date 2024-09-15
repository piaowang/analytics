/**
 * 标签过滤UI
 */

import React from 'react'
import PropTypes from 'prop-types'
import { CloseCircleOutlined, CloseOutlined, QuestionCircleOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Radio, Tooltip, Select, Divider } from 'antd';
import Link from '../Common/link-nojam'
import _ from 'lodash'
import * as d3 from 'd3'
import classNames from 'classnames'
import {
  EMPTY_VALUE_OR_NULL,
  UsergroupFilterStrategyEnum,
  UserGroupFilterTypeEnum,
  UserGroupSetOperationEnum,
  DimDatasourceType,
  DIMENSION_TYPES,
  UserGroupSetOperationTranslation
} from '../../../common/constants'
import {tagFiltersAdaptToOldFormat} from '../../../common/param-transform'
import {recurMapFilters} from '../../../common/druid-query-utils'
import toUgFilters from '../../../common/slice-filter-to-ug-filter'
import AsyncHref from '../Common/async-href'
import {getTimeRange} from '../TrafficAnalytics/data-box'
import {withUserGroupsDec} from '../Fetcher/data-source-compare-user-group-fetcher'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {withDbMetrics} from '../Fetcher/data-source-measures-fetcher'
import {interpose} from '../../../common/sugo-utils'

import {OTHERS_TAG_TITLE} from '../../constants/string-constant'
import './tag-manager.styl'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button
let percentFormat = d3.format('.2%')
const Option = Select.Option

/**
 * filters数组格式：
[
  {
    title: '分类标题'
    children: [
      {
        col: 'age',
        op: 'in',
        eq: [0, 10],
        name: 'col'
        title: '年龄'
      }
    ]
  }
]
 */

const FilterTypeEnum = {
  measure: '用户行为',
  measure3: '指标',
  dimension: '行为条件'
}

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withDbDims(({usergroup, projectList}) => {
  let relatedBehaviorProjectId = _.get(usergroup, 'params.relatedBehaviorProjectId')
  let proj = _.find(projectList, {id: relatedBehaviorProjectId})
  const dsId = proj && proj.datasource_id || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    resultFilter: dim => dim.parentId === dsId
  }
})
@withDbMetrics(({usergroup, projectList})=>{
  let relatedBehaviorProjectId = _.get(usergroup, 'params.relatedBehaviorProjectId')
  let proj = _.find(projectList, {id: relatedBehaviorProjectId})
  const dsId = proj && proj.datasource_id || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true
  }
})
export default class TagFilter extends React.Component {

  static propTypes = {
    filters: PropTypes.array,
    removeFilter: PropTypes.func,
    customFooter: PropTypes.element,
    title: PropTypes.string,
    extra: PropTypes.element
  }

  static defaultProps = {
    filters: [],
    title: '用户筛选器'
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.props.projectCurrent, nextProps.projectCurrent)) {
      this.removeAllFilter()
    }
  }

  removeAllFilter = () => {
    this.props.updateHashState({filters: []})
    this.props.modifier({
      computeResult: null
    })
  }

  onChangeRelation = (e) => {
    this.props.updateHashState({
      relation: e.target.value
    })
  }

  renderTagRelation() {
    let {removeFilter, relation = 'and'} = this.props
    let str = relation === 'and' ? '并且' : '或者'
    return (
      <div className="iblock mg1r">
        <span className="mg1r">
          筛选关系
          <Tooltip
            title={
              <div>
                <b>并且</b> 表示必须同时满足当前所有(标签)筛选条件<br />
                <b>或者</b> 表示满足当前任意一个(标签)筛选条件
              </div>
            }
          >
            <QuestionCircleOutlined className="mg1l" />
          </Tooltip>
        </span>
        {
          removeFilter
            ? <RadioGroup
              value={relation}
              onChange={this.onChangeRelation}
            >
              <RadioButton value="and">并且</RadioButton>
              <RadioButton value="or">或者</RadioButton>
            </RadioGroup>
            : <b>{str}</b>
        }

      </div>
    );
  }

  renderTitle() {
    let {filters, removeFilter, title, extra} = this.props
    return (
      <div className="tag-filter-title tag-filter-section">
        <div className="fix">
          <div className="fleft">
            <span className="tag-filter-title-big bold inline minw100 alignright">{title}</span>
            <span className="tag-filter-title-grey color-grey mg2l">
              已选条件({_.flatten(filters.map(p => p.children)).length})
              {
                removeFilter && filters.length
                  ? <Button
                      type="ghost"
                      icon={<CloseOutlined />}
                      className="mg2l"
                      size="small"
                      onClick={this.removeAllFilter}
                    >
                      清除所有条件
                  </Button>
                  : null
              }
            </span>
          </div>
          <div className="fright">
            {this.renderTagRelation()}
            {extra}
          </div>
        </div>
      </div>
    );
  }

  renderValue = (eq, op, pretty) => {
    if (_.isArray(pretty)) {
      return pretty.join(', ')
    }
    if (op === 'and' || op === 'or') {
      let {dimensions, dimNameDict} = this.props
      let tagDimNameDict = _.keyBy(_.filter(dimensions, dbDim => dbDim.from !== 'tagGroup'), 'name')
      const vals = eq.map(flt => {
        let {col, eq, op, pretty} = flt
        const val = this.renderValue(eq, op, pretty)
        return col && (col in dimNameDict || col in tagDimNameDict)
          ? `${_.get(dimNameDict[col], 'title') || _.get(tagDimNameDict[col], 'title') || col}: ${val}`
          : val
      })
      const joined = vals.join(` ${op === 'or' ?  '或' : '且'} `)
      return  _.size(vals) === 1 ? joined : '(' + joined + ')'
    }
    if (op === 'equal') {
      return `==${eq}`
    }
    if (op === 'greaterThanOrEqual') {
      return '>' + eq
    } else if (op === 'lessThanOrEqual') {
      return '<' + eq
    } else if (op === 'in' && !_.isArray(eq[0])) {
      return _.isNumber(eq[0]) ? eq.join('~') : eq.join(',')
    } else if (op === 'nullOrEmpty') {
      return EMPTY_VALUE_OR_NULL
    }
    if (!_.isArray(eq)) {
      eq = [eq].filter(_.identity)
    }
    return eq.reduce((prev, v, i) => {
      return prev + (i ? ',' : '') + this.renderValue(v.eq, v.op)
    }, '')
  }

  renderChild = (item, i) => {
    let {removeFilter, changeFilter} = this.props
    let {title, name, eq, op = '', action = 'in', pretty, type , from} = item
    let t = title || name
    const hasOtherVal = _.includes(pretty || [], OTHERS_TAG_TITLE) 
    let isTagGroup = from === 'tagGroup'
    let options = [
      <Option value="in" className="tag-filter-op-in">包含</Option>,
      <Option value="not in" className="tag-filter-op-notin">排除</Option>
    ]
    if ((!isTagGroup && type === DIMENSION_TYPES.stringArray) || !removeFilter) {
      options.push(<Option value="also in" className={hasOtherVal ? '' : 'tag-filter-op-alsoin'} disabled={hasOtherVal}>同时包含</Option>)
      options.push(<Option value="equal" className={hasOtherVal ? '' : 'tag-filter-op-equal'} disabled={hasOtherVal}>有且仅有</Option>)
    }
    return (
      <div className="tag-filter-item inline" key={name + 'ti' + i}>
        <div className="tag-filter-item-name elli iblock mg1r" title={t}>
          {t}:
          {
            !isTagGroup
              ? <Select
                className={`mg1l width80 tag-filter-op-${action.replace(' ', '')}`}
                defaultValue={action}
                disabled={!removeFilter}
                onChange={v => {
                  let val = v
                  const actionOpMap = {
                    'in': 'or',
                    'not in': 'not or',
                    'equal': 'equal',
                    'in-range': 'or',
                    'not in-range': 'not or',
                    'also in': 'and'
                  }
                  // TODO 测试多值列
                  changeFilter(item.col, {action: val, op: actionOpMap[val]})
                }}
                >
                {options}
              </Select>
              : null
          }
        </div>
        <span className="tag-filter-item-value iblock elli mg1r">
          {this.renderValue(eq, op, pretty)}
        </span>
        {
          removeFilter
          ? <CloseCircleOutlined
            title="移除过滤条件"
            className="pointer iblock"
            onClick={() => this.props.removeFilter(item)} />
          : null
        }
      </div>
    );
  }

  renderFilter = (filter, i) => {
    let {title, children} = filter
    return (
      <div className="tag-filter-setion tag-filter-child-section" key={title + 'tf' + i}>
        <div className="tag-filter-name elli bold" title={title}>{title}</div>
        <div className="tag-filter-content iblock">
          {children.map(this.renderChild)}
        </div>
      </div>
    )
  }

  renderBehaviorFilters = (config, op) => {
    let {usergroup} = this.props
    return (
      <div>
        {
          _.keys(FilterTypeEnum).filter(k => {
            return !_.isEmpty(_.get(config, `${k}.filters`)) || FilterTypeEnum[k] === FilterTypeEnum.dimension
          }).map((k,kdx) => {
            let filterObj = _.get(config, k)
            if (!filterObj) {
              return null
            }
            if (FilterTypeEnum[k] === FilterTypeEnum.dimension) {
              // 合并时间筛选
              let {relativeTime, since, until} = config
              let [finalSince, finalUntil] = getTimeRange({dateType: relativeTime, dateRange: [since, until]})
              filterObj = {
                relation: 'and',
                filters: [{
                  action: 'in',
                  dimension: '__time',
                  value: `${finalSince} 至 ${finalUntil}`
                }, filterObj]
              }
            }
            return (
              <div className="pd2x">
                <div className="itblock line-height36 width100 alignright elli bold">{FilterTypeEnum[k]}</div>
                <div className="itblock line-height28" style={{width: 'calc(100% - 100px)', padding: '4px 16px'}}>
                  {this.renderBehaviorFilterItems(filterObj)}
                </div>
              </div>
            )
          }).filter(_.identity)
        }
        <Divider style={{margin: 0}}>{op ? UserGroupSetOperationTranslation[op] : null}</Divider>
      </div>
    )
  }

  renderBehaviorFilterItems = (flt, idx = -1, depth = 0, hasSibling = false) => {
    let {relation, value, filters, dimension, measure, action} = flt
    if (_.isUndefined(relation)) {
      let {dimNameDict, metricNameDict, userGroups, apps} = this.props
      // leaf
      let title = (dimension && _.get(dimNameDict, [dimension, 'title']) || dimension)
        || (measure && _.get(metricNameDict, [measure, 'title']) || measure)
        || filters.filter(mf => mf.value).map(mf => {
          let dimName = _.get(dimNameDict, [mf.dimension, 'title']) || mf.dimension
          return mf.action === 'between' ? `${dimName} 介于 ${mf.value[0]} 至 ${mf.value[1]}` : `${dimName} 为 ${mf.value}`
        }).join('，')
      if (!title) {
        return null
      }
      let vals = _.isArray(value) ? value : [value]
      let blockContent = action === 'lookupin'
        ? `${title} ${action} ${vals.map(ugId => {
          return ugId === 'all' ? '全部访问用户' : _.get(_.find(userGroups, ug => ug.id === ugId), 'title') || ugId
        })}`
        : dimension === 'token'
          ? `${title} ${action} ${vals.map(appId => _.get(_.find(apps, app => app.id === appId), 'name') || appId).join(', ')}`
          : `${title} ${action} ${vals.join(', ')}`
      return (
        <Tooltip
          key={`${depth}:${idx}`} title={blockContent}
          mouseEnterDelay={0.5}
        >
          <div className="mg1x itblock pd1x maxw-100 bg-dark-white color-666 elli corner" >
            {blockContent}
          </div>
        </Tooltip>
      )
    }
    let domArr = filters.map((flt, idx0) => this.renderBehaviorFilterItems(flt, idx0, depth + 1, 1 < filters.length)).filter(x => !_.isEmpty(x))
    let res = interpose((el, idx0) => <span key={`${depth + 1}:${idx0}:sep`} className="mg1x">{relation === 'and' ? '且' : '或'}</span>, domArr)
    if (0 < depth && 1 < domArr.length && hasSibling) {
      return (
        <span key={`${depth}:${idx}`}>({res})</span>
      )
    }
    return res
  }

  renderUserGroupFilters = withUserGroupsDec(_.identity)(({dataSourceCompareUserGroups: userGroups, config, op}) => {
    let {usergroup} = this.props

    let usergroupFilterStrategy = _.get(config, 'usergroupFilterStrategy')
    if (usergroupFilterStrategy === UsergroupFilterStrategyEnum.byUpload) {
      return (
        <div className="pd2x">
          <div className="itblock line-height36 width100 alignright elli bold" />
          <div className="itblock line-height28 color-grey" style={{width: 'calc(100% - 100px)', padding: '4px 16px'}}>
            通过上传创建的分群，没有筛选条件
          </div>
          <Divider style={{margin: 0}}>{op ? UserGroupSetOperationTranslation[op] : null}</Divider>
        </div>
      )
    }
    let usergroupFilterTargets = _.get(config, 'usergroupFilterTargets') || []
    let selectedUgs = usergroupFilterTargets.map(ugId => _.find(userGroups, ug => ug.id === ugId) ).filter(_.identity)
    return (
      <div className="pd2x">
        <div className="itblock line-height36 width100 alignright elli bold">用户群筛选</div>
        <div className="itblock line-height28" style={{width: 'calc(100% - 100px)', padding: '4px 16px'}}>
          <div className="mg1x itblock pd1x maxw-100 bg-dark-white color-666 elli corner" >
            {selectedUgs.map(ug => ug.title).join('，')}
          </div>
        </div>
        <Divider style={{margin: 0}}>{op ? UserGroupSetOperationTranslation[op] : null}</Divider>
      </div>
    )
  })

  // 暂时把 ug-filters-preview.jsx 的代码拷贝过来， TODO 重构逻辑
  renderUserGroupFilterStrategies = () => {
    let {usergroup, datasourceCurrent} = this.props
    let composeInstruction = _.get(usergroup, 'params.composeInstruction') || []

    if (_.isEmpty(composeInstruction)) {
      // 兼容旧数据
      composeInstruction = [
        {
          type: !_(usergroup).chain().get('params.composeInstruction[0].config.tagFilters').isEmpty().value()
            ? UserGroupFilterTypeEnum.userTagFilter
            : _.get(usergroup, 'params.createMethod') === 'by-upload'
              ? UserGroupFilterTypeEnum.userGroupFilter
              : UserGroupFilterTypeEnum.behaviorFilter,
          op: UserGroupSetOperationEnum.union
        }
      ]
    }

    return _.orderBy(composeInstruction, ci => ci.type === UserGroupFilterTypeEnum.userTagFilter ? 0 : 1).map(({type, config}, idx) => {
      let op = _.get(composeInstruction, `[${idx + 1}].op`)
      if (type === UserGroupFilterTypeEnum.behaviorFilter) {
        return this.renderBehaviorFilters(config, op)
      }
      if (type === UserGroupFilterTypeEnum.userTagFilter) {
        return this.renderUserTagFilters(config, op)
      }
      if (type === UserGroupFilterTypeEnum.userGroupFilter) {
        let dsId = _.get(datasourceCurrent, 'id') || ''
        return this.renderUserGroupFilters({
          dataSourceId: dsId,
          doFetch: !!dsId,
          cleanDataWhenFetching: true,
          config,
          op
        })
      }
      throw new Error('Unconsider usergroup filter type: ' + type)
    })
  }

  renderUserTagFilters(config = {}, op) {
    if (!_.isEmpty(config)) {
      let {usergroup, projectList} = this.props
      let relatedUserTagProjectId = _.get(usergroup, 'params.relatedUserTagProjectId')
      let proj = _.find(projectList, {id: relatedUserTagProjectId})
      const dsId = proj && proj.datasource_id
      return this.renderUserTagFIltersByConfig({
        dataSourceId: dsId,
        doFetch: !!dsId,
        exportNameDict: true,
        datasourceType: DimDatasourceType.tag,
        resultFilter: dim => dim.parentId === dsId,
        config,
        op
      })
    }
    return (
      <div className="tag-filters-wrap">
        {
          (this.props.filters || filters).map(this.renderFilter)
        }
        {
          op ?
            <Divider style={{margin: 0}}>{op ? UserGroupSetOperationTranslation[op] : null}</Divider>
            : null
        }
      </div>
    )
  }

  renderUserTagFIltersByConfig = withDbDims(_.identity)(({dimNameDict, config, op}) => {
    let ugTagFilters = _.get(config, 'tagFilters') || []
    let {relation, tagFilters} = tagFiltersAdaptToOldFormat(ugTagFilters)

    let translatedTagFilters = recurMapFilters(tagFilters, flt => {
      let tagDim = flt.col && _.get(dimNameDict, flt.col)
      if (!tagDim) {
        return flt
      }
      return {
        ...flt,
        col: tagDim.title || flt.col
      }
    })
    return (
      <div className="pd2x">
        <div className="itblock line-height36 width100 alignright elli bold">标签条件</div>
        <div className="itblock line-height28" style={{width: 'calc(100% - 100px)', padding: '4px 16px'}}>
          {this.renderBehaviorFilterItems({
            relation,
            filters: toUgFilters(translatedTagFilters)
          })}
        </div>
        <Divider style={{margin: 0}}>{op ? UserGroupSetOperationTranslation[op] : null}</Divider>
      </div>
    )
  })

  renderFilters() {
    let {usergroup} = this.props
    if (usergroup && usergroup.id && !_.startsWith(usergroup.id, 'temp_')) {
      // 如果展示的是用户群的筛选，则需要展示分群/行为的筛选
      return this.renderUserGroupFilterStrategies()
    }
    return this.renderUserTagFilters()
  }

  renderUserLink = (computeResult, count) => {
    let { buildUrl } = this.props
    if (!computeResult || !buildUrl) {
      return null
    }
    return (
      <span className="mg2l">
        共
        <Tooltip title="查看用户详情">
          {0 < count ? (
            <AsyncHref
              className="under-line pointer mg1x"
              initFunc={() => buildUrl()}
              component={Link}
            >
              {count}
            </AsyncHref>
          ) : <span className="mg1x">{count}</span>}
        </Tooltip>
        人{_.isNumber(computeResult.totalCount) ? `，占总人数 ${percentFormat(count / computeResult.totalCount)}` : null}
        <AsyncHref
          initFunc={() => buildUrl()}
          component={Link}
          className={classNames('mg2l pointer', {hide: !count})}
        >
          <TeamOutlined /> 查看用户详情
        </AsyncHref>
      </span>
    );
  }

  renderBtns() {
    let {
      compute, computing,
      computeResult,
      filters
    } = this.props
    if (!compute) {
      return null
    }

    let title = filters.length
      ? ''
      : '请先选择筛选条件'
    let count = _.get(computeResult, 'count')
    return (
      <div className="aligncenter pd2y">
        <Button
          type={_.isEqual(filters, computeResult && computeResult.byFilters || []) ? 'success' : 'primary'}
          className="iblock"
          onClick={compute}
          loading={computing}
          disabled={!filters.length}
          title={title}
        >计算人数</Button>
        {this.renderUserLink(computeResult, count)}
      </div>
    )
  }

  render() {
    let {customFooter} = this.props
    return (
      <div className="tag-filter-wrap tag-setion-wrap">
        <div className="tag-filter-inner tag-setion-inner">
          {this.renderTitle()}
          {this.renderFilters()}
          {customFooter || this.renderBtns()}
        </div>
      </div>
    )
  }

}
