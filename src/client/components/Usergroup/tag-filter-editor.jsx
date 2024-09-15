import React from 'react'
import {immutateUpdate} from 'common/sugo-utils'
import _ from 'lodash'
import {simplifyTagFilter, subTagInfoToFilter} from 'client/actions'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { CloseCircleOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Radio, Select, Tooltip } from 'antd';
import {untypedTitle} from 'client/components/TagManager/tag-type-list'
import {enableSelectSearch} from 'client/common/antd-freq-use-props'
import {DruidColumnTypeIcon} from 'common/druid-column-type'
import TagOptionFetcher from 'client/components/Fetcher/tag-options-fetcher'
import {EMPTY_TAG_TITLE} from 'client/constants/string-constant'
import classNames from 'classnames'
import {ContextNameEnum, withContextConsumer} from 'client/common/context-helper'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {DimDatasourceType} from '../../../common/constants'
import Fetch from '../Common/fetch'
import {includeCookie} from '../../common/fetch-utils'
import {tagFiltersAdaptToOldFormat} from '../../../common/param-transform'

const Option = Select.Option
const RadioButton = Radio.Button
const RadioGroup = Radio.Group

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withDbDims(({tagProject}) => {
  let dsId = _.get(tagProject, 'datasource_id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    datasourceType: DimDatasourceType.tag
  }
})
export default class TagFilterEditor extends React.Component {
  state = {
    tagTypeTree: [],
    tagTypeMappings: [],
    typeNameDimIdDict: {}
  }

  optionFilter = (input, option) => {
    return option.props.title.includes(input)
  }

  renderFetchers = () => {
    let {tagTypeTree} = this.state
    let dsId = _.get(this.props.tagProject, 'datasource_id') || ''
    return (
      <React.Fragment>
        <Fetch
          key="tag-type-tree-fetcher"
          url={`/app/tag-type-tree/list/${dsId}`}
          body={{ parentId: 'all' }}
          lazy={!dsId}
          params={includeCookie}
          onData={data => {
            this.setState({tagTypeTree: _.get(data, 'result.trees') || []})
          }}
        />
        <Fetch
          key="tag-type-fetcher"
          url={'/app/tag-type/get'}
          body={{ where: { datasource_id: dsId }}}
          lazy={!(dsId && !_.isEmpty(tagTypeTree))}
          params={includeCookie}
          onData={data => {
            let tagTypeIdDict = _.keyBy(tagTypeTree, 'id')
            let tagTypeMappings = _.get(data, 'result') || []

            let typeNameDimIdDict = _(tagTypeMappings)
              .keyBy('dimension_id')
              .mapValues(mapping => _.get(tagTypeIdDict[mapping.tag_tree_id], 'name'))
              .value()

            this.setState({
              tagTypeMappings: tagTypeMappings,
              typeNameDimIdDict
            })
          }}
        />
      </React.Fragment>
    )
  }

  renderTagFilters = () => {
    let {datasourceList, tagProject: projectCurrent, usergroup, dimNameDict, onUsergroupChange} = this.props
    let {typeNameDimIdDict} = this.state

    let datasourceCurrent = _.find(datasourceList, ds => ds.id === projectCurrent.datasource_id)
    if (!datasourceCurrent) {
      return null
    }

    let dimensions = _.values(dimNameDict)

    let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
    dimensions = dimensions.filter(dim => {
      return dim.is_druid_dimension &&
        dim.name !== '__time' &&
        !dim.from &&
        !commonMetric.includes(dim.name)
    })
    const typeNames = _(typeNameDimIdDict).values().concat([untypedTitle]).uniq().filter(_.identity).value()

    let ugTagFilters = _.get(usergroup, 'params.tagFilters') || []
    let {relation, tagFilters} = tagFiltersAdaptToOldFormat(ugTagFilters)
    return tagFilters.map((filter, i) => {
      let typeTitle = _.get(filter, 'typeTitle') || ''
      let dims = typeTitle ? dimensions.filter(dim => (typeNameDimIdDict[dim.id] || untypedTitle) === typeTitle) : dimensions
      let dim = dimNameDict[filter.col]

      return (
        <div className="tag-group-filter pd1b" key={i}>
          <Select
            {...enableSelectSearch}
            value={typeTitle}
            placeholder="请选择"
            className="iblock width200 mg1r"
            dropdownMatchSelectWidth={false}
            onChange={selectedTypeName => {
              const nextUg = immutateUpdate(usergroup, 'params.tagFilters', () => {
                let nextFlt = {...filter, typeTitle: selectedTypeName, col: '', eq: [], pretty: []}
                return [{
                  op: relation,
                  eq: tagFilters.map((flt, idx) => idx === i ? nextFlt : flt)
                }]
              })
              onUsergroupChange(nextUg)
            }}
          >
            <Option value="" key="all">所有分类</Option>
            {
              typeNames.map((type, i) => {
                return (
                  <Option value={type} key={i}>{type}</Option>
                )
              })
            }
          </Select>

          <Select
            {...enableSelectSearch}
            value={filter.col}
            placeholder="请选择"
            className="iblock width200 mg1r"
            dropdownMatchSelectWidth={false}
            filterOption={this.optionFilter}
            onChange={nextTagName => {
              const nextUg = immutateUpdate(usergroup, 'params.tagFilters', () => {
                return [{
                  op: relation,
                  eq: tagFilters.map((flt, idx) => idx === i ? {...flt, col: nextTagName, eq: [], pretty: []} : flt)
                }]
              })
              onUsergroupChange(nextUg)
            }}
          >
            {
              _.orderBy(dims, dim => (typeNameDimIdDict[dim.id] || untypedTitle) === untypedTitle ? 1 : 0).map(d => {
                let {id, title, name, type} = d
                let typeTitle0 = typeNameDimIdDict[id] || untypedTitle
                let dimTitle = title || name
                let typeNameAndDimTitle = `${typeTitle0}:${dimTitle}`
                return (
                  <Option
                    value={name}
                    key={id}
                    title={typeNameAndDimTitle}
                  >
                    <LegacyIcon
                      type={DruidColumnTypeIcon[type]}
                      className="color-blue-grey mg1r"
                    />
                    {
                      !typeTitle
                        ? (<span className="color-grey mg1r">({typeTitle0})</span>)
                        : null
                    }
                    {dimTitle}
                  </Option>
                );
              })
            }
          </Select>

          <TagOptionFetcher
            datasourceCurrent={datasourceCurrent}
            projectCurrent={projectCurrent}
            dimension={dim}
          >
            {({data: subTagInfos, isFetching}) => {
              return (
                <Select
                  {...enableSelectSearch}
                  value={filter.pretty}
                  className={`iblock width200 ${isFetching ? 'is-fetching' : ''}`}
                  placeholder="请选择"
                  dropdownMatchSelectWidth={false}
                  onChange={nextPretty => {
                    const nextUg = immutateUpdate(usergroup, 'params.tagFilters', () => {
                      return [{
                        op: relation,
                        eq: tagFilters.map((flt, idx) => {
                          if (idx !== i) {
                            return flt
                          }
                          let selectedSubTagInfos = nextPretty.map(subTagName => _.find(subTagInfos, st => st.title === subTagName))
                          let nextFlt = {
                            ...flt,
                            op: 'or',
                            pretty: nextPretty,
                            eq: selectedSubTagInfos.map(st => {
                              return subTagInfoToFilter({...st, dimension: dim})
                            })
                          }
                          return simplifyTagFilter(nextFlt, dim.type)
                        })
                      }]
                    })
                    onUsergroupChange(nextUg)
                  }}
                  mode="tags"
                >
                  {
                    (subTagInfos || []).filter( i => !i.value.includes('其他​')).map((subTagInfo, i) => {
                      let {title, percent} = subTagInfo
                      let txt = title === EMPTY_TAG_TITLE ? title : `${title}(${percent}%)`
                      return (
                        <Option
                          value={subTagInfo.title}
                          key={i}
                          title={txt}
                        >{txt}</Option>
                      )
                    })
                  }
                </Select>
              )
            }}
          </TagOptionFetcher>

          <CloseCircleOutlined
            className={classNames('iblock mg1l pointer', {hide: i === 0})}
            onClick={() => {
              const nextUg = immutateUpdate(usergroup, 'params.tagFilters', () => {
                return [{
                  op: relation,
                  eq: tagFilters.filter((flt, idx) => idx !== i)
                }]
              })
              onUsergroupChange(nextUg)
            }} />
        </div>
      );
    });
  }

  render() {
    let {usergroup, onUsergroupChange} = this.props
    let ugTagFilters = _.get(usergroup, 'params.tagFilters')
    let {relation} = tagFiltersAdaptToOldFormat(ugTagFilters)

    return (
      <div className="tag-group-filters">
        {this.renderFetchers()}
        <div className="pd1b">
          <RadioGroup
            value={relation}
            onChange={ev => {
              let nextRelation = ev.target.value
              let nextUg = immutateUpdate(usergroup, 'params.tagFilters', flts => {
                if (_.size(flts) === 1 && (flts[0].op === 'and' || flts[0].op === 'or')) {
                  return immutateUpdate(flts, [0, 'op'], () => nextRelation)
                }
                return simplifyTagFilter([{op: nextRelation, eq: flts}], true)
              })
              onUsergroupChange(nextUg)
            }}
          >
            <RadioButton value="and">并且</RadioButton>
            <RadioButton value="or">或者</RadioButton>
          </RadioGroup>
          <span className="mg1l">
            筛选关系
            <Tooltip
              title={
                <div>
                  <b>并且</b>表示必须同时满足当前所有筛选条件<br />
                  <b>或者</b>表示满足当前任意一个筛选条件
                </div>
              }
            >
              <QuestionCircleOutlined className="mg1l" />
            </Tooltip>
          </span>
        </div>

        {this.renderTagFilters()}

        <div className="pd1y">
          <span
            className="pointer"
            onClick={() => {
              let nextUg = immutateUpdate(usergroup, 'params.tagFilters', flts => {
                if (_.size(flts) === 1 && (flts[0].op === 'and' || flts[0].op === 'or')) {
                  return immutateUpdate(flts, [0, 'eq'], subFlts => [...(subFlts || []), {}])
                }

                return [...(flts || []), {}]
              })
              onUsergroupChange(nextUg)
            }}
          >
            <PlusCircleOutlined className="mg1r" />
            添加标签条件
          </span>
        </div>
      </div>
    );
  }
}
