import React from 'react'
import {withCommonFilter} from '../../Common/common-filter'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import cataLogTreeModel, {namespace as catelogTreeNS} from './catalog-tree-model'
import {connect} from 'react-redux'
import {dataSourceListSagaModelGenerator, tableListSagaModelGenerator} from '../../OfflineCalc/saga-model-generators'
import {OfflineCalcDataSourceTypeEnum} from '../../../../common/constants'
import _ from 'lodash'
import { DatabaseOutlined, FolderOutlined, TableOutlined } from '@ant-design/icons';
import {groupToArrayDeep} from '../../../../common/sugo-utils'
import DraggableTree from '../../OfflineCalc/draggable-tree'
import smartSearch from '../../../../common/smart-search'
import {getTypeKeysByKey} from '../constants'
import Fetch from '../../../common/fetch-final'
import {
  hiveDataSourcesSagaModelGenerator,
  hiveTablesSagaModelGenerator
} from '../visual-modeling/visual-modeling-saga-models'


@withRuntimeSagaModel([
  cataLogTreeModel,
  hiveDataSourcesSagaModelGenerator('hive-data-sources-for-data-dict'),
  hiveTablesSagaModelGenerator('hive-tables-for-data-dict')
])
@connect((state, ownProps) => {
  const dsList = state['hive-data-sources-for-data-dict'] || {}
  const tableList = state['hive-tables-for-data-dict'] || {}
  
  const offlineCalcDataSources = dsList.hiveDataSources || []
  const offlineCalcTables = tableList.hiveTables || []
  
  return {
    ...(state[catelogTreeNS] || {}),
    offlineCalcDataSources: offlineCalcDataSources,
    dsIdDict: _.keyBy(dsList.offlineCalcDataSources, ds => ds.id),
    offlineCalcTables: offlineCalcTables,
    tableIdDict: _.keyBy(offlineCalcTables, d => d.id),
    tagIdDict: _.keyBy([], 'id')
  }
})
@withCommonFilter
export default class HiveOnlyCatalogTree extends React.Component {
  
  renderTree = () => {
    let { dsIdDict, tagIdDict, offlineCalcTables, searching } = this.props
    const clonedByTags = _.flatMap(searching ? offlineCalcTables.filter(t => smartSearch(searching, t.title || t.name)) : offlineCalcTables, idx => {
      return _.size(idx.tags) < 2 ? idx : idx.tags.map(tId => ({...idx, tags: [tId]}))
    })
    let databaseIcon = <DatabaseOutlined />
    let folderIcon = <FolderOutlined />
    let tableIcon = <TableOutlined />
    let treeInfo = groupToArrayDeep(clonedByTags,
      [t => t.tags[0] || '', t => t.data_source_id || ''],
      [
        (arr, tagId) => tagId
          ? {
            key: `type-tag-${tagId}`,
            title: _.get(tagIdDict[tagId], 'name', tagId),
            children: arr,
            selectable: true,
            icon: folderIcon
          }
          : arr,
        (arr, dsId) => ({
          key: `type-db-${dsId}`,
          title: _.get(dsIdDict[dsId], 'name', dsId),
          children: arr,
          selectable: true,
          icon: databaseIcon
        }),
        table => ({
          key: table.id,
          title: table.title || table.name,
          selectable: true,
          icon: tableIcon
        })
      ])
    return (
      <div
        className="overscroll-y always-display-scrollbar"
        style={{height: 'calc(100% - 76px)'}}
      >
        <DraggableTree
          treeInfo={treeInfo}
          showIcon
          onSelect={this.onTreeNodeSelect}
        />
      </div>
    )
  }
  
  onTreeNodeSelect = async selectedKeys => {
    const { dispatch, tableIdDict, offlineCalcTables } = this.props
    const selectKey = selectedKeys[0]
    if (selectKey && _.startsWith(selectKey, 'type-db-')) {
      const dbId = selectKey.substr(8)
      let listData = offlineCalcTables.filter(t => t.data_source_id === dbId).map(table => {
        return {
          'id': table.id,
          'createTime': 0,
          'valid': true,
          'version': 1,
          'actionType': 2,
          'dbId': null,
          'tableName': table.name,
          'business': table.title || table.name,
          'showName': table.title || table.name
        }
      })
      this.changeState({ selectedKeys, listData })
    } else if (selectKey && _.startsWith(selectKey, 'type-tag-')) {
      const tagName = selectKey.substr(9)
      let listData = offlineCalcTables.filter(t => t.tags[0] === tagName).map(table => {
        return {
          'id': table.id,
          'createTime': 0,
          'valid': true,
          'version': 1,
          'actionType': 2,
          'dbId': null,
          'tableName': table.name,
          'business': table.title || table.name,
          'showName': table.title || table.name
        }
      })
      this.changeState({ selectedKeys, listData })
    } else if (selectKey) {
      let table = tableIdDict[selectKey]
      let dbName = table.data_source_id.substr(5)
      let colInfos = await Fetch.get(`/app/hive/${dbName}/${table.name}/schema`)
      dispatch({
        type: `${catelogTreeNS}/changeState`,
        payload: {
          selectedKeys,
          tableInfo: {
            'id': table.id,
            'createTime': 0,
            'valid': true,
            'version': 1,
            'actionType': 2,
            'dbId': null,
            'tableName': table.name,
            'business': table.title || table.name,
            'showName': table.title || table.name
          },
          dataFields: _.get(colInfos, 'result.schema') || [],
          dataIndexs: []
        }
      })
    }
  }
  
  changeState = payload => {
    this.props.dispatch({
      type: `${catelogTreeNS}/changeState`,
      payload
    })
  }
  
  render() {
    let { keywordInput, editingOrder } = this.props
    let Search = keywordInput
    return (
      <div className="task-schedule-tree corner" >
        <div className="line-height44 pd2x alignright" key="title">
          <span className="fleft">任务分类</span>
          {/*this.renderTopButton()*/}
        </div>
        <Search className="tree-search-box pd1x" placeholder="搜索..." key="search" disabled={editingOrder} />
        {this.renderTree()}
        {/*this.renderEditTypeModal()*/}
      </div>
    )
  }
  
}
