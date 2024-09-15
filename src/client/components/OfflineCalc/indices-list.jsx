import React from 'react'
import Bread from '../Common/bread'
import { ExportOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import {Button, message, Modal, Select, Table, Tooltip} from 'antd'
import _ from 'lodash'
import {Auth, checkPermission} from '../../common/permission-control'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {Link} from 'react-router'
import {
  dataSourceListSagaModelGenerator,
  indicesSagaModelGenerator
} from './saga-model-generators'
import {
  OfflineCalcChartType,
  OfflineCalcIndicesTypeEnum,
  OfflineCalcTargetType,
  OfflineCalcVersionStatus,
  TagTypeEnum
} from '../../../common/constants'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import SwitchGroupPanel from './switch-group-panel2'
import FetchFinal from 'client/common/fetch-final'
import {dictBy, isDiffByPath} from '../../../common/sugo-utils'
import XLSX from 'xlsx'
import SizeProvider from '../Common/size-provider'
import {enableSelectSearch} from '../../common/antd-freq-use-props'

const {Option} = Select

const namespace = 'offline-calc-indices-list'

const canDel = checkPermission('delete:/app/offline-calc/indices/:id')


let mapStateToProps = (state, ownProps) => {
  const indicesListState = state[namespace] || {}
  const dsListState = state['offline-calc-data-sources-list-for-indices-list'] || {}
  const tagsListState = state[`switch-group-panel_${TagTypeEnum.offline_calc_index}`] || {}

  const isFetching = dsListState.isFetchingOfflineCalcDataSources 
  || indicesListState.isFetchingOfflineCalcIndices
  || tagsListState.isFetchingTags
  return {
    ...indicesListState,
    isFetching,
    offlineCalcDataSources: dsListState.offlineCalcDataSources,
    indicesIdDict: dictBy(indicesListState.offlineCalcIndices, o => o.id),
    tags: tagsListState.tags,
    users: _.get(state, 'common.users', [])
  }
}



@connect(mapStateToProps)
@withRuntimeSagaModel([
  indicesSagaModelGenerator(namespace, 'list', {attributes: ['id', 'belongs_id', 'name', 'title', 'data_source_id', 'formula_info', 'params', 'tags', 'created_by']}),
  dataSourceListSagaModelGenerator('offline-calc-data-sources-list-for-indices-list')
])
export default class OfflineCalcIndicesList extends React.Component {
  
  constructor (props) {
    super(props)
    this.onDeleteClickHandle = this.onDeleteClickHandle.bind(this)
  }
  state = {
    filterByDsId: 'all',
    selectedTagId: '',
    filteredDims: [],
    expandRowKeys: []
  }
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    let selectDom = document.getElementsByClassName('ant-table-row-expanded')
    var newArr = [...selectDom]
    newArr = newArr.map( i => i.title = '点击查看衍生私有版本')
  
    if (
      !_.isEqual(this.props.offlineCalcIndices, prevProps.offlineCalcIndices)
      || isDiffByPath(this.state, prevState, 'selectedTagId')
    ) {
      const { filterByDsId, selectedTagId } = this.state
      const { offlineCalcIndices, offlineCalcIndicesBak } = this.props
      let filteredDims = (offlineCalcIndicesBak || []).filter(d => {
        let pickThis = true
        if (filterByDsId === 'null' || !filterByDsId) {
          pickThis = pickThis && !d.data_source_id
        } else if (filterByDsId !== 'all') {
          pickThis = pickThis && d.data_source_id === filterByDsId
        }
        if (selectedTagId) {
          pickThis = pickThis && _.some(d.tags, tId => tId === selectedTagId)
        }
        return pickThis
      })
      
      let shouldFilter = []
      let expandRowKeys = []
      filteredDims = filteredDims.filter( i => {
        if (i.id === i.belongs_id) {
          i.children = []
          filteredDims.map(j => {
            if (j.belongs_id === i.id && j.belongs_id !== j.id) {
              i.children.push(j)
              shouldFilter.push(j.id)
            }
          })
          expandRowKeys.push(i.id)
          if (_.isEmpty(i.children)) delete i.children
          return true
        }
        
        if (!selectedTagId) return !i.belongs_id
        return true
      })
      filteredDims = filteredDims.filter( i => !shouldFilter.includes(i.id) )
      this.setState({
        filteredDims,
        expandRowKeys: expandRowKeys
      })
    }
  }
  
  onDeleteClickHandle (record) {
    return (ev) => {
      let isPrivate = record.id !== record.belongs_id
      let isReviewing = record.SugoVersionHistory.isReviewing
      
      if (isPrivate && !isReviewing) {
        return this.onDeleteClick(ev)
      }

      Modal.confirm({
        title: '删除审核',
        content: '删除公有版本需要提交审核',
        okText: '提交审核',
        cancelText: '取消',
        onOk: async () => {
          let { success, message: msg} = await FetchFinal.post(`/app/offline-calc/review-del/${record.id}`, {type: OfflineCalcTargetType.Indices})
          //不能简写 否则对话框不会立即关闭
          if (!success) {
            message.error(msg)
            return
          }
          message.success('提交成功')
          this.props.dispatch({
            type: `${namespace}/fetch`
          })
          return
        }
      })
    }
  }

  exportAllIndices = () => {
    const {offlineCalcIndices, offlineCalcDataSources, tags} = this.props
    const { selectedTagId, filterByDsId } = this.state

    let dsIdDict = _.keyBy(offlineCalcDataSources, 'id')

    let filteredDims = (offlineCalcIndices || []).filter(d => {
      let pickThis = true
      if (filterByDsId === 'null' || !filterByDsId) {
        pickThis = pickThis && !d.data_source_id
      } else if (filterByDsId !== 'all') {
        pickThis = pickThis && d.data_source_id === filterByDsId
      }
      if (selectedTagId) {
        pickThis = pickThis && _.some(d.tags, tId => tId === selectedTagId)
      }
      return pickThis
    })

    //csv导出方法
    // const csv = Papa.unparse(    filteredDims.map( i => {
    //   const ds = _.get(dsIdDict, i.data_source_id)

    //   let tagsValue = ''
    //   i.tags.map( j => {
    //     tagsValue = tagsValue + _.get(_.find(tags, o => o.id === j), 'name') + ','
    //     return j
    //   })

    //   let formula_info = i.formula_info.uiText
    //   formula_info = formula_info.replace(/\÷/g, '/')
    //   formula_info = formula_info.replace(/\×/g, '*')
    //   return {
    //     no: i.id,
    //     ..._.pick(i, [
    //       'name',
    //       'title',
    //       'description'
    //     ]),
    //     data_source_name: ds ? ds.name : i.data_source_id,
    //     formula_info,
    //     tags: tagsValue.length ? tagsValue.substr(0, tagsValue.length - 1): ''
    //   }
    // }))

    // exportFile('indices-list.csv', csv)

    let validData = filteredDims.map( i => {
      const ds = _.get(dsIdDict, i.data_source_id)

      let tagsValue = ''
      i.tags.map( j => {
        tagsValue = tagsValue + _.get(_.find(tags, o => o.id === j), 'name') + ','
        return j
      })

      let formula_info = i.formula_info.uiText
      formula_info = formula_info.replace(/÷/g, '/')
      formula_info = formula_info.replace(/×/g, '*')
      return {
        no: i.id,
        ..._.pick(i, [
          'name',
          'title',
          'description'
        ]),
        data_source_name: ds ? ds.name : i.data_source_id,
        formula_info,
        tags: tagsValue.length ? tagsValue.substr(0, tagsValue.length - 1): ''
      }
    })

    // await delayPromised(2000)
    let wb = XLSX.utils.book_new()
    let ws = XLSX.utils.json_to_sheet(validData)
    XLSX.utils.book_append_sheet(wb, ws, 'indices')
    XLSX.writeFile(wb, 'indices-list.xlsx')
  }

  onDeleteClick = ev => {
    let preDel = ev.target.getAttribute('data-dim-id')
    if (!preDel) {
      return
    }

    const cp = (syncRes) => {
      let { resDelete } = syncRes || {}
      let res = _.get(resDelete, '[0].result', '')
      if (res === 1) message.success('删除成功')
    }

    Modal.confirm({
      title: '确认删除此指标？',
      content: '此操作无法撤销，请谨慎操作',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let {dispatch, offlineCalcIndices} = this.props
        dispatch({
          type: `${namespace}/sync`,
          payload: (offlineCalcIndices || []).filter(ds => ds.id !== preDel),
          forceReload: true,
          callback: cp
        })
      }
    })
    
  }
  
  renderColumns() {
    let { users, offlineCalcDataSources, tags } = this.props
    let userDict = _.keyBy(users, 'id')
    let tagIdDict = _.keyBy(tags, 'id')
    let dsIdDict = _.keyBy(offlineCalcDataSources, 'id')
    return [
      {
        title: '指标编号',
        dataIndex: 'id',
        key: 'id',
        width: 150,
        fixed: 'left',
        render:(val,record) => {
          if (!_.isEmpty(record.children)) {
            return <Tooltip title={'点击按钮查看衍生私有版本'}>{val}</Tooltip>
          }
          return val
        }
      },
      {
        title: '指标名称',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        fixed: 'left',
        render: (val, record) => {
          let isReviewing = record.SugoVersionHistory.isReviewing
          return (
            isReviewing ? <span>{record.title || val}</span>
              : (
                <Auth auth="get:/console/offline-calc/indices/:id">
                  <Link to={`/console/offline-calc/indices/${record.id}`}>{record.title || val}</Link>
                </Auth>
              )
          )
        }
      },
      {
        title: '所属数据源',
        dataIndex: 'data_source_id',
        key: 'data_source_name',
        width: 100,
        render: val => {
          const ds = _.get(dsIdDict, val)
          return ds && ds.name || '跨数据源'
        }
      },
      {
        title: '计算公式',
        dataIndex: 'formula_info.uiText',
        key: 'formula_info',
        width: 272,
        render: (formulaText) => {
          return (
            <div
              className="mw240 elli"
              title={formulaText}
            >{formulaText}</div>
          )
        }
      },
      {
        title: '指标类型',
        dataIndex: 'params.composeType',
        key: 'composeType',
        width: 100,
        render: (composeType) => {
          return OfflineCalcIndicesTypeEnum[composeType]
        }
      },
      {
        title: '所属分类',
        dataIndex: 'tags',
        key: 'tags',
        width: 100,
        render: (tags) => {
          return (tags || []).map(tId => _.get(tagIdDict, [tId, 'name'])).filter(_.identity).join(', ')
        }
      },
      {
        title: '版本',
        dataIndex: 'SugoVersionHistory.version',
        key: 'version',
        width: 100,
        render: (v, record) => _.get(record, 'SugoVersionHistory.version', '--')
      },
      {
        title: '负责人',
        dataIndex: 'created_by',
        key: 'created_by',
        width: 150,
        render: (val) => {
          const {first_name, username} = userDict[val] || {}
          let name = first_name ? `${first_name}(${username})` : username
          return (
            <div
              className="mw120 elli"
              title={name}
            >{name}</div>
          )
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        width: 320,
        render: (val, record) => {
          let canPutReview = record.id !== record.belongs_id
          let isPrivate = record.id !== record.belongs_id
          let isReviewing = record.SugoVersionHistory.isReviewing || record.SugoVersionHistory.status === OfflineCalcVersionStatus.watingForDel
          let isWatingForDel = record.SugoVersionHistory.status === OfflineCalcVersionStatus.watingForDel
          let showDel = canDel && !isReviewing && !isWatingForDel

          return (
            <React.Fragment>
              {
                <Auth auth="get:/console/offline-calc/relation-trace/:id">
                  <Link
                    className="mg2r"
                    to={`/console/offline-calc/relation-trace/${record.id}?targetType=${OfflineCalcTargetType.Indices}&chartType=${OfflineCalcChartType.relation}`}
                  >查看血缘</Link>
                </Auth>
              }
              {
                <Auth auth="get:/console/offline-calc/relation-trace/:id">
                  <Link className="mg2r" to={`/console/offline-calc/relation-trace/${record.id}?targetType=${OfflineCalcTargetType.Indices}&chartType=${OfflineCalcChartType.influence}`}>查看影响</Link>
                </Auth>
              }
              {
                isPrivate && !isReviewing ?
                  <Auth auth="get:/console/offline-calc/release-version/:id">
                    <Link className="mg2r" to={`/console/offline-calc/release-version/${record.id}?targetType=${OfflineCalcTargetType.Indices}`}>提交审核</Link>
                  </Auth>
                  : null
              }
              {
                isReviewing ? <span className="color-blue mg2r">审核中</span> : null
              }
              {
                isReviewing
                  ? null
                  : (
                    <Auth auth="get:/console/offline-calc/indices/:id">
                      <Link className="mg2r" to={`/console/offline-calc/indices/${record.id}`}>编辑</Link>
                    </Auth>
                  )
              }
              {!showDel ? null : (
                <span
                  className="fpointer mg2r color-red"
                  data-dim-id={val}
                  onClick={this.onDeleteClickHandle(record)}
                >删除</span>
              )}
            </React.Fragment>
          )
        }
      }
    ]
  }
  
  renderDataSourcePicker = () => {
    let {offlineCalcDataSources} = this.props
    const { filterByDsId } = this.state
    return (
      <div className="itblock">
        <span>按数据源筛选：</span>
        <Select
          {...enableSelectSearch}
          className="width200"
          value={filterByDsId}
          onChange={val => {
            this.setState({
              filterByDsId: val
            })
          }}
        >
          <Option key="all" value="all">不限数据源</Option>
          <Option key="null" value="null">跨数据源</Option>
          {(offlineCalcDataSources || []).map(ds => {
            return (
              <Option key={ds.id} value={ds.id}>{ds.name}</Option>
            )
          })}
        </Select>
      </div>
    )
  }
  
  render() {
    const {isFetching} = this.props
    const { selectedTagId, filteredDims, expandRowKeys } = this.state

    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '指标库' }
          ]}
        />
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic"
        >
          <div
            defaultWeight={1}
            className="itblock height-100"
            style={{
              padding: '10px 5px 10px 10px'
            }}
          >
            <div className="bg-white corner height-100 pd2 overscroll-y">
              <SwitchGroupPanel
                groupTitle="指标"
                selectedTagId={selectedTagId}
                onTagSelected={tag => {
                  this.setState({
                    selectedTagId: tag && tag.id || '',
                    filteredDims: []
                  })
                }}
                onTagDelete={tag => {
                }}
                tagType={TagTypeEnum.offline_calc_index}
              />
            </div>
          </div>
        
          <div
            className="itblock height-100"
            style={{padding: '10px 10px 10px 5px'}}
            defaultWeight={5}
          >
            <div className="pd3x pd2y bg-white corner height-100 overscroll-y">
              <div className="pd2b">
                {this.renderDataSourcePicker()}
                <Auth auth="post:/app/offline-calc/indices">
                  <Link to="/console/offline-calc/indices/new" className="fright">
                    <Button type="primary" icon={<PlusOutlined />} >添加指标</Button>
                  </Link>
                </Auth>
                <Auth auth="get:/console/offline-calc/indices-manager-byhand">
                  <Button
                    type="primary"
                    className="mg2l"
                    icon={<ExportOutlined />}
                    onClick={() => this.exportAllIndices()}
                    loading={isFetching}
                  >导出指标</Button>
                  <Link to="/console/offline-calc/indices-manager-byhand">
                    <Button
                      type="primary"
                      className="mg2l"
                      icon={<UploadOutlined />}
                    >导入指标</Button>
                  </Link>
                </Auth>
              </div>

              <SizeProvider>
                {({spWidth}) => {
                  // 列宽比 100% 大的话，启用水平滚动
                  let columns = this.renderColumns()
                  let contentWidth = _.sum(columns.map(col => col.width))
                  return (
                    <Table
                      rowKey="id"
                      bordered
                      dataSource={filteredDims}
                      expandedRowKeys={expandRowKeys}
                      columns={columns}
                      scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth}}
                      indentSize={10}
                      onExpand={(expanded, record) => {
                        if (expanded) {
                          let temp = _.cloneDeep(expandRowKeys)
                          temp.push(record.id)
                          return this.setState({
                            expandRowKeys: temp
                          })
                        }
                        this.setState({
                          expandRowKeys: expandRowKeys.filter( id => id !== record.id )
                        })
                      }}
                    />
                  )
                }}
              </SizeProvider>
            </div>
          </div>
        </HorizontalSplitHelper>
      </React.Fragment>
    );
  }
}
