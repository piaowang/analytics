import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import {Tooltip, Divider} from 'antd'
import _ from 'lodash'
import {interpose} from '../../../common/sugo-utils'
import {withDbMetrics} from '../Fetcher/data-source-measures-fetcher'
import {withApps} from 'client/components/Fetcher/app-fetcher'
import {getTimeRange} from 'client/components/TrafficAnalytics/data-box'
import {
  DimDatasourceType,
  UsergroupFilterStrategyEnum,
  UserGroupFilterTypeEnum,
  UserGroupSetOperationEnum,
  UserGroupSetOperationTranslation
} from '../../../common/constants'
import {tagFiltersAdaptToOldFormat} from '../../../common/param-transform'
import toUgFilters from '../../../common/slice-filter-to-ug-filter'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {recurMapFilters} from '../../../common/druid-query-utils'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import Fetch from 'client/common/fetch-final'

const FilterTypeEnum = {
  measure: '用户行为',
  measure3: '指标',
  dimension: '条件'
}

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withApps(props => {
  let pId = props.projectId || ''
  return {
    projectId: pId,
    doFetch: !!(pId && _.some(_.get(props, 'userGroup.params.dimension.filters'), flt => flt.dimension === 'token'))
  }
})
@withDbMetrics(({userGroup})=>{
  let dsId = _.get(userGroup, 'druid_datasource_id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true
  }
})
export default class UsergroupFiltersPreview extends React.Component {
  static propTypes = {
    userGroup: PropTypes.object.isRequired,
    userGroups: PropTypes.array.isRequired,
    dimNameDict: PropTypes.object,
    metricNameDict: PropTypes.object,
    className: PropTypes.string,
    style: PropTypes.object
  }

  state = {
    segmentVersion: []
  }

  async fetchHistorySegment(ids) {
    const { result } = await Fetch.post('/app/life-cycle/get-preUgById', { ids })
    if (!_.isEmpty(result)) {
      this.setState({
        segmentVersion: result
      })
    }
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

  getPathAnalyticPathInfo(ug) {
    if (ug.params.pathInfo) {
      return ug.params.pathInfo
    }
    let m = ug.title.match(/(路径分析-.+)-用户群/)
    return m ? m[1] : '路径分析'
  }

  renderBehaviorFilters(config, op, idx) {
    let {userGroup} = this.props
    return (
      <div className="pd2x">
        {
          _.keys(FilterTypeEnum).filter(k => {
            return !_.isEmpty(_.get(config, `${k}.filters`)) || FilterTypeEnum[k] === FilterTypeEnum.dimension
          }).map((k,kdx) => {
            let filterObj = _.get(config, k)
            if (FilterTypeEnum[k] === FilterTypeEnum.dimension) {
              // 合并时间筛选
              let {relativeTime, since, until} = _.get(userGroup, `params.composeInstruction[${idx}].config`) || {}
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
          })
        }
        <Divider style={{margin: 0}}>{op ? UserGroupSetOperationTranslation[op] : null}</Divider>
      </div>
    )
  }

  renderUserTagFilters = withDbDims(_.identity)(({dimNameDict, config, op}) => {
    let {userGroup} = this.props
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

  renderUserGroupFilters(config, op) {
    let {userGroup, userGroups} = this.props
    const { segmentVersion } = this.state

    let usergroupFilterStrategy = _.get(config, 'usergroupFilterStrategy')
    if (usergroupFilterStrategy === UsergroupFilterStrategyEnum.byUpload) {
      return (
        <div className="pd2x">
          <div className="itblock line-height36 width100 alignright elli bold">用户群筛选</div>
          <div className="itblock line-height28 color-grey" style={{width: 'calc(100% - 100px)', padding: '4px 16px'}}>
            {_.get(userGroup, 'params.backToRefererTitle') === '查看关联路径分析'
              ? `通过 ${this.getPathAnalyticPathInfo(userGroup)} 创建的分群`
              : '通过上传创建的分群，没有筛选条件'}
          </div>
          <Divider style={{margin: 0}}>{op ? UserGroupSetOperationTranslation[op] : null}</Divider>
        </div>
      )
    }
    let usergroupFilterTargets = _.get(config, 'usergroupFilterTargets') || []
    let selectedUgs = usergroupFilterTargets.map(ugId => _.find(userGroups, ug => ug.id === ugId) ).filter(_.identity)
    selectedUgs = selectedUgs.concat(usergroupFilterTargets.map(ugId => _.find(segmentVersion, ug => ug.id === ugId) ).filter(_.identity))
    if (selectedUgs.length !== usergroupFilterTargets.length) {
      this.fetchHistorySegment(usergroupFilterTargets)
    }
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
  }

  renderUserGroupFilterStrategies() {
    let {userGroup, projectList} = this.props
    let composeInstruction = _.get(userGroup, 'params.composeInstruction') || []

    //0.19.20升级脚本将所有params都带上了该结构
    // if (_.isEmpty(composeInstruction)) {
    //   // 兼容旧数据
    //   composeInstruction = [
    //     {
    //       type: !_(userGroup).chain().get('params.composeInstruction[0].config.tagFilters').isEmpty().value()
    //         ? UserGroupFilterTypeEnum.userTagFilter
    //         : _.get(userGroup, 'params.createMethod') === 'by-upload'
    //           ? UserGroupFilterTypeEnum.userGroupFilter
    //           : UserGroupFilterTypeEnum.behaviorFilter,
    //       op: UserGroupSetOperationEnum.union
    //     }
    //   ]
    // }

    return composeInstruction.map(({type, config }, idx) => {
      let op = _.get(composeInstruction,`[${idx + 1}].op`)
      if (type === UserGroupFilterTypeEnum.behaviorFilter) {
        return this.renderBehaviorFilters(config, op, idx)
      }
      if (type === UserGroupFilterTypeEnum.userTagFilter) {
        let relatedUserTagProjectId = _.get(userGroup, 'params.relatedUserTagProjectId')
        let proj = _.find(projectList, {id: relatedUserTagProjectId})
        const dsId = proj && proj.datasource_id
        return this.renderUserTagFilters({
          dataSourceId: dsId,
          doFetch: !!dsId,
          exportNameDict: true,
          datasourceType: DimDatasourceType.tag,
          resultFilter: dim => dim.parentId === dsId,
          config,
          op
        })
      }
      if (type === UserGroupFilterTypeEnum.userGroupFilter) {
        return this.renderUserGroupFilters(config, op)
      }
      throw new Error('Unconsider usergroup filter type: ' + type)
    })
  }

  render() {
    let {className, style, userGroup, extra} = this.props

    let filtersPreviewOverwrite = _.get(userGroup, 'params.filtersPreviewOverwrite')
    return (
      <div
        className={classNames('bg-white corner', className)}
        style={style}
      >
        <div className="pd2x line-height50 font14 borderb">
          <div className="minw100 alignright bold inline">用户筛选条件</div>
          <div className="fright">
            {extra}
          </div>
        </div>

        {filtersPreviewOverwrite
          ? (
            <div className="pd2x borderb">
              <div className="itblock line-height36 width100 alignright elli bold" />
              <div className="itblock line-height28 color-grey" style={{width: 'calc(100% - 100px)', padding: '4px 16px'}}>
                {filtersPreviewOverwrite}
              </div>
            </div>
          )
          : this.renderUserGroupFilterStrategies()}
      </div>
    )
  }
}
