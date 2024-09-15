import React from 'react'
import {TreeSelect} from 'antd'
import {includeCookie} from '../../common/fetch-utils'
import Fetch from '../Common/fetch'
import DataSourceDimensionsFetcher from '../Fetcher/data-source-dimensions-fetcher'
import {DimDatasourceType} from '../../../common/constants'
import _ from 'lodash'
import {typesBuilder} from '../TagManager/tag-type-list'
import {isDiffByPath} from '../../../common/sugo-utils'
import AsyncTaskRunner from '../Common/async-task-runner'
import PropTypes from 'prop-types'

/**
 * 标签选择，多选
 *
 **/
export default class TagPicker extends React.Component {
  static propTypes = {
    dataSource: PropTypes.object.isRequired,
    tagTypeOnly: PropTypes.bool,
    value: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
    onChange: PropTypes.func,
    disabledOptions: PropTypes.array
  }

  static defaultProps = {
    tagTypeOnly: false
  }

  state = {
    tagTypeTree: [],
    tagTypeMappings: [],
    tags: [],
    treeData: []
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(this.props, nextProps, 'dataSource')) {
      this.setState({tagTypeTree: [], tagTypeMappings: [], tags: []})
    }
  }

  applyDisabledSettings = (treeData, disabledSet) => {
    // 只显示未被选择的标签
    return treeData.map(v => {
      if ('children' in v) {
        return {...v, children: this.applyDisabledSettings(v.children, disabledSet)}
      }
      return {
        ...v,
        disableCheckbox: disabledSet.has(v.value)
      }
    })
  }

  render() {
    let {dataSource, disabledOptions, value, onChange, tagTypeOnly, ...rest} = this.props
    let {tagTypeTree, tagTypeMappings, tags, treeData} = this.state
    let datasourceId = _.get(dataSource, 'id') || ''

    let typesBuilderProps = {
      dimensions: tags,
      tagTypes: tagTypeMappings,
      tagTrees: tagTypeTree,
      datasourceCurrent: dataSource
    }
    return [
      <TreeSelect
        key="treeSelect"
        treeData={this.applyDisabledSettings(treeData, new Set(disabledOptions))}
        treeCheckable
        searchPlaceholder="请选择关联标签"
        value={_.isEmpty(treeData) ? [] : value}
        onChange={onChange}
        {...rest}
      />,
      <Fetch
        key="tag-type-tree-fetcher"
        url={`/app/tag-type-tree/list/${datasourceId}`}
        body={{ parentId: 'all' }}
        lazy={!datasourceId}
        params={includeCookie}
        onData={data => {
          this.setState({tagTypeTree: _.get(data, 'result.trees') || []})
        }}
      />,
      <Fetch
        key="tag-type-fetcher"
        url={'/app/tag-type/get'}
        body={{ where: { datasource_id: datasourceId }}}
        lazy={!(datasourceId && !tagTypeOnly)}
        params={includeCookie}
        onData={data => {
          this.setState({tagTypeMappings: _.get(data, 'result') || []})
        }}
      />,
      <DataSourceDimensionsFetcher
        key="tags-fetcher"
        doFetch={datasourceId && !tagTypeOnly}
        dataSourceId={datasourceId}
        datasourceType={DimDatasourceType.tag}
        onLoaded={data => {
          const dimExcludingSet = new Set(['__time', 'distinct_id'])
          this.setState({tags: data.filter(d => !dimExcludingSet.has(d.name)) || []})
        }}
      />,
      <AsyncTaskRunner
        key="typesBuilder"
        doRun={_.every(tagTypeOnly ? [dataSource, tagTypeTree] : _.values(typesBuilderProps), v => !_.isEmpty(v))}
        args={[typesBuilderProps]}
        task={typesBuilder}
        onResult={res => {
          /* let v = {
            title: 'Node1',
            value: '0-0',
            key: '0-0',
            children: [{...}]
          }*/
          function makeTree(arr) {
            return arr.map((v) => {
              if ('children' in v) {
                return {
                  key: v.treeId,
                  title: v.type,
                  value: v.treeId,
                  children: _.isArray(v.children) ? makeTree(v.children) : []
                }
              }
              return { key: v.name, title: v.title || v.name, value: v.name }
            })
          }

          this.setState({treeData: makeTree(res.types)})
        }}
      />
    ]
  }
}
