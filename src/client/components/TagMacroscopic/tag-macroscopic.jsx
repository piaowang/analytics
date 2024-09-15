import React from 'react'
import Bread from '../Common/bread'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import _ from 'lodash'
import TagTypeList, {typesBuilder} from '../TagManager/tag-type-list'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {synchronizer} from '../Fetcher/synchronizer'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {AccessDataType, DimDatasourceType, QUERY_ENGINE, UserGroupBuildInTagEnum} from '../../../common/constants'
import AsyncTaskRunner from '../Common/async-task-runner'
import {withSizeProvider} from '../Common/size-provider'
import {deepFlat} from '../TagManager/store/user-list/actions'
import {Button, Select} from 'antd'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {withUserGroupsDec} from '../Fetcher/data-source-compare-user-group-fetcher'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import * as d3 from 'd3'
import {isDiffByPath} from '../../../common/sugo-utils'
import MacroscopicGallery from './macroscopic-gallery'
import TagFilter from '../TagManager/tag-filter'
import {tagFiltersAdaptToOldFormat} from '../../../common/param-transform'
import {browserHistory} from 'react-router'
import {getCurFieldsAndTreeIds} from '../../common/get-curfields-and-treeids'
import HoverHelp from '../Common/hover-help'

const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

const TAG_PANEL_WIDTH = 252

const percentFormat = d3.format('.2%')

// const getTagProject = (projectList, projectCurrent) =>  {
//   const tagDatasourceName = _.get(projectCurrent, 'tag_datasource_name', '')
//   if(!tagDatasourceName || projectCurrent.accessDataType === AccessDataType.Tag) {
//     return projectCurrent
//   }  
//   const tagProject = projectList.find(p => p.tag_datasource_name === tagDatasourceName && p.accessDataType === AccessDataType.Tag)
//   if(!_.isEmpty(tagProject)) {
//     return tagProject
//   }
//   return projectCurrent
// }

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withDbDims(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  return {
    dataSourceId: dsId,
    datasourceType: DimDatasourceType.tag,
    doFetch: !!dsId,
    exportNameDict: true
  }
})
@synchronizer(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  let {dimNameDict = {}} = props
  return {
    url: '/app/tag-type/get',
    query: { where: { datasource_id: dsId } },
    doFetch: !!(dsId && !_.isEmpty(dimNameDict)), // 加载完维度再加载 tagTypes
    modelName: 'tagTypeMappings',
    resultExtractor: data => {
      let res = _.get(data, 'result') || []
      return res.filter(t => !(t.dimension_id in dimNameDict))
    }
  }
})
@synchronizer(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  return {
    url: `/app/tag-type-tree/list/${dsId}`,
    query: { parentId: 'all' },
    doFetch: !!dsId,
    modelName: 'tagTypes',
    resultExtractor: data => {
      return _.get(data, 'result.trees') || []
    }
  }
})
export default class TagMacroscopic extends React.Component {
  state = {
    activeTreeIds: [],
    cur_fields: [],
    types: [],
    // currUserGroupId: 'all', // 现在改为从参数读入：usergroup_id
    chartsPanelOffsetHeight: '- 64px',
    enableCompareToAll: false,
    allUserCount: 0
  }

  getCurrUserGroupId = (props = this.props) => {
    return _.get(props, 'location.query.usergroup_id') || 'all'
  }

  setCurrUserGroupId = (nextUgId) => {
    browserHistory.push(`/console/tag-macroscopic?usergroup_id=${nextUgId}`)
  }

  componentDidUpdate(prevProps, prevState) {
    // 自动根据分群筛选和条件面板的高度，调整下边图表面板的高度
    if (isDiffByPath(prevProps, this.props, 'location.query.usergroup_id')) {
      let {chartsPanelOffsetHeight} = this.state
      let currUgId = this.getCurrUserGroupId()
      let nextChartsPanelOffsetHeight = currUgId !== 'all'
        ? _(this._groupSelector).chain().get('clientHeight').thru(v => `- ${v}px`).value() || '- 64px - 102px'
        : '- 64px'
      if (nextChartsPanelOffsetHeight !== chartsPanelOffsetHeight) {
        this.setState({
          chartsPanelOffsetHeight: nextChartsPanelOffsetHeight
        })
      }
    }
  }

  renderTypeBuilder() {
    let {datasourceCurrent, dataSourceDimensions: tags, tagTypes, tagTypeMappings} = this.props
    let typesBuilderProps = {
      dimensions: tags,
      tagTypes: tagTypeMappings,
      tagTrees: tagTypes,
      datasourceCurrent
    }
    return (
      <AsyncTaskRunner
        key="typesBuilder"
        doRun={_.every(_.values(typesBuilderProps), v => !_.isEmpty(v))}
        args={[typesBuilderProps]}
        task={typesBuilder}
        onResult={res => {
          //获取保存在本地的列表树信息
          const { projectCurrent: { id: projectCurrentId } } = this.props
          const { localCurFields, localActiveTreeIds } = getCurFieldsAndTreeIds(projectCurrentId,'tag_macroscopic_cur_fields','tag_macroscopic_activeTreeIds')
          let fields = deepFlat(res.types)
          const selectedTags = _.take(fields, 4).filter(_.identity) // 默认选择 4 个
          this.setState({
            types: res.types,
            cur_fields: localCurFields || selectedTags.map(s => s.id),
            activeTreeIds: localActiveTreeIds || _(res.types).flatMap(t => t.treeIds).uniq().value() // 默认展开全部
          })
        }}
      />
    )
  }

  renderUserCount({ug}) {
    let {projectCurrent} = this.props
    let dsId = _.get(projectCurrent, 'datasource_id') || ''

    let ugId = ug && ug.id || 'all'
    return (
      <DruidDataFetcher
        dataSourceId={dsId}
        childProjectId={_.get(projectCurrent, 'parent_id') ? _.get(projectCurrent, 'id') : null}
        doFetch={!!dsId}
        customMetrics={[{name: 'totalUserCount', formula: '$main.count()'}]}
        queryEngine={QUERY_ENGINE.UINDEX}
        onData={data => {
          this.setState({allUserCount: _.get(data, '[0].totalUserCount') || 0})
        }}
      >
        {({total})=>{
          let {totalUserCount = 0} = total || {}
          let ugPreComputedValue = (ugId === 'all' ? totalUserCount : _.get(ug, 'params.total')) || 0
          return (
            <div className="iblock">
              {
                totalUserCount < 1
                  ? null
                  : (
                    <span className="color-purple">
                      共 {ugPreComputedValue} 人，占总人数 {percentFormat(Math.min(1, ugPreComputedValue / totalUserCount))}
                    </span>
                  )
              }
            </div>
          )
        }}
      </DruidDataFetcher>
    )
  }

  renderGroupsSelector ({ug, userIdDimName, dbUgs}) {
    let {dimNameDict} = this.props
    let {types} = this.state

    let ugRemark = _.get(ug, 'description')

    let ugTagFilters = []
    if (_.get(ug,'params.composeInstruction',[]).length === 1) {
      ugTagFilters = _.get(ug, 'params.composeInstruction[0].config.tagFilters') || []
    }

    ugTagFilters = _.get(ug,'params.composeInstruction',[]).map( i => {
      if (i.config.tagFilters) {
        return i.config.tagFilters
      }
      return null
    }).filter(_.identity)


    let {relation = '', tagFilters = []} = tagFiltersAdaptToOldFormat(ugTagFilters)

    let tagTypeNameFiltersDict = _.groupBy(tagFilters, flt => {
      let t = _.find(types, ({ children }) => _.some(children, dbDim => dbDim.name === flt.col))
      return t && t.type || '未分类'
    })
    return (
      <div ref={ref => this._groupSelector = ref} key="groupSelector">
        <div style={{ padding: '10px 10px 0 5px' }} >
          <div
            className="borderb pd3x pd2b bg-white corner"
            style={{ padding: '10px' }}
          >
            <strong className="pd2r">用户群：</strong>
            <Select
              value={ug && ug.id || 'all'}
              className="width250 mg2r"
              onChange={segment_id => {
                this.setCurrUserGroupId(segment_id)
              }}
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
            >
              <Select.Option value="all" key="all">全部访问用户</Select.Option>
              {
                (dbUgs || []).map(seg => {
                  let title = seg.title
                  return (
                    <Select.Option value={seg.id} key={seg.id}>{title}</Select.Option>
                  )
                })
              }
            </Select>

            {!ugRemark ? null : (
              <span className="color-grey mg2r">备注：{ugRemark}</span>
            )}
            {this.renderUserCount({ug, userIdDimName})}
          </div>
        </div>

        {!ug ? null : (
          <TagFilter
            usergroup={ug}
            title="用户筛选条件"
            relation={relation}
            filters={_.keys(tagTypeNameFiltersDict).map(typeName => {
              return {
                title: typeName,
                children: tagTypeNameFiltersDict[typeName].map(flt => ({
                  ...flt,
                  title: _.get(dimNameDict[flt.col], 'title'),
                  name: flt.col
                }))
              }
            })}
            customFooter={<div className="hide" />}
          />
        )}
      </div>
    )
  }

  renderRightPart = withUserGroupsDec(_.identity)(fetcher => {
    let {dataSourceCompareUserGroups: dbUgs} = fetcher
    let {datasourceCurrent, dataSourceDimensions: tags, tagTypes, tagTypeMappings} = this.props
    let {cur_fields, chartsPanelOffsetHeight, enableCompareToAll, allUserCount, types} = this.state
    let currUgId = this.getCurrUserGroupId()

    let ug = _.find(dbUgs, {id: currUgId})
    let userIdDimName = _.get(ug, 'params.groupby') || _.get(datasourceCurrent, 'params.commonMetric[0]')

    const tagFilters = ug && ug.id && !_.startsWith(ug.id, 'temp_')
      ? [{ col: _.get(ug, 'params.groupby'), op: 'lookupin', eq: ug.id }]
      : _.get(ug, 'params.composeInstruction[0].config.tagFilters') || []

    const tagTypesNameMap = {}
    tagTypes.map( i => {
      tagTypesNameMap[i.name] =  tagTypesNameMap[i.name] || {}
      tagTypesNameMap[i.name] = i
    })
    return [
      this.renderGroupsSelector({ug, userIdDimName, dbUgs}),

      <div
        style={{
          padding: '10px 10px 0 5px',
          height: `calc(100% ${chartsPanelOffsetHeight})`
        }}
        key="charts"
      >
        <div className="bg-white corner pd2 height-100 overscroll-y">
          {!ug ? null : (
            <Button
              onClick={() => this.setState({enableCompareToAll: !enableCompareToAll})}
              type={enableCompareToAll ? 'primary' : 'default'}
            >整体对比</Button>
          )}
          {
            // debug(
            //   tags,
            //   cur_fields,
            //   tagTypes,
            //   tagTypeMappings,
            //   tagFilters,
            //   enableCompareToAll,
            //   ug,
            //   allUserCount
            // )
          }
          <MacroscopicGallery
            dbTags={tags}
            activeTagIds={cur_fields}
            tagTypes={types.map( i => tagTypesNameMap[i.type])}
            tagTypeMappings={tagTypeMappings}
            filters={tagFilters}
            compareToAll={enableCompareToAll}
            ugUserCount={(!ug ? allUserCount : _.get(ug, 'params.total')) || 0}
            allUserCount={allUserCount}
          />
        </div>
      </div>
    ]
  })

  renderMainContent = withSizeProvider(({spWidth}) => {
    let { projectCurrent, projectList, datasourceCurrent, dataSourceDimensions: tags, tagTypes, tagTypeMappings} = this.props
    let {cur_fields, activeTreeIds, types} = this.state
    let dsId = _.get(datasourceCurrent, 'id') || ''
    if (projectCurrent.access_type !== AccessDataType.Tag) {
      const tagProject = projectList.find(p => p.tag_datasource_name === projectCurrent.tag_datasource_name && p.access_type === AccessDataType.Tag) || {}
      dsId = [dsId, tagProject.datasource_id]
    }

    return (
      <HorizontalSplitHelper style={{height: 'calc(100% - 44px)'}} >
        <TagTypeList
          defaultWeight={TAG_PANEL_WIDTH}
          tagTrees={tagTypes}
          className="itblock height-100 no-active-underline"
          dimensions={tags}
          datasourceCurrent={datasourceCurrent}
          tagTypes={tagTypeMappings}
          types={types}
          onClickTitle={obj => {
            const { id, treeId } = obj
            const { user:{id:user_id}} = window.sugo
            const { projectCurrent: { id: projectCurrentId } } = this.props
            // tag
            if (id) {
              const nextCurFields = _.includes(cur_fields, id)
                ? cur_fields.filter(dimId => dimId !== id)
                : [...cur_fields, id]

              this.setState({cur_fields: nextCurFields})
              //保存到本地 持久化数据 （最多保存10个）
              nextCurFields.length <= 10 && localStorage.setItem(`tag_macroscopic_cur_fields`,JSON.stringify({
                [projectCurrentId]:{ [user_id]: {nextCurFields}}
              }))
            } else {
              const nextActiveTreeIds = _.includes(activeTreeIds, treeId)
                ? activeTreeIds.filter(dimId => dimId !== treeId)
                : [...activeTreeIds, treeId]
              this.setState({activeTreeIds: nextActiveTreeIds})
              nextActiveTreeIds <= 10 && localStorage.setItem('tag_macroscopic_activeTreeIds',JSON.stringify({
                [projectCurrentId]:{ [user_id]: {nextActiveTreeIds}}
              }))
            }
          }}
          activeTreeIds={activeTreeIds}
          activeChildIds={cur_fields}
        />

        <div
          defaultWeight={spWidth - TAG_PANEL_WIDTH}
          className="itblock height-100 overscroll-y always-display-scrollbar"
          style={{paddingBottom: '10px'}}
        >
          {this.renderRightPart({
            dataSourceId: dsId,
            doFetch: !!dsId,
            cleanDataWhenFetching: true,
            query: {
              where: {
                $not: {
                  tags: { $contains: UserGroupBuildInTagEnum.UserGroupWithoutLookup }
                }
              }
            },
            onData: (ugs) => {
              let ugId = this.getCurrUserGroupId()
              if (ugId !== 'all' && !_.some(ugs.result, ug => ug.id === ugId)) {
                this.setCurrUserGroupId('all')
              }
            }
          })}
        </div>
      </HorizontalSplitHelper>
    )
  })

  notok = () => {
    return (
      <div
        className="relative"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="center-of-relative aligncenter">
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <div className="pd2t">
            这个项目不是由标签系统创建的，不能使用用户画像，请切换到由标签系统创建的项目。
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { projectCurrent, tagProject } = this.props
    if (AccessDataType.Tag !== projectCurrent.access_type) {
      return this.notok()
    }
    return (
      <div className="height-100 contain-docs-analytic">
        <Bread
          path={[
            {
              name: tagProject.id !== projectCurrent.id
                ? <HoverHelp placement="right" icon="link" addonBefore="宏观画像 " content={`已关联标签项目【${tagProject.name}】`} />
                : '宏观画像'
            }
          ]}
        />

        {this.renderTypeBuilder()}

        {this.renderMainContent()}
      </div>
    )
  }

}

