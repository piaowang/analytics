import React from 'react'
import Bread from '../Common/bread'
import { PlusOutlined } from '@ant-design/icons';
import {Button, message, Modal, Select, Table} from 'antd'
import _ from 'lodash'
import {Auth, checkPermission} from '../../common/permission-control'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {Link} from 'react-router'
import {dataSourceListSagaModelGenerator,
  tableListSagaModelGenerator
} from './saga-model-generators'
import { OfflineCalcChartType, OfflineCalcTargetType } from '../../../common/constants'
import {enableSelectSearch} from '../../common/antd-freq-use-props'

const {Option} = Select

const namespace = 'offline-calc-tables-list'

const canDel = checkPermission('delete:/app/offline-calc/tables/:id')

let mapStateToProps = (state, ownProps) => {
  const dimListState = state[namespace] || {}
  const dsListState = state['offline-calc-data-sources-list-for-table-list'] || {}
  // const tagsListState = state[`switch-group-panel_${TagTypeEnum.offline_calc_table}`] || {}
  return {
    ...dimListState,
    offlineCalcDataSources: dsListState.offlineCalcDataSources,
    // tags: tagsListState.tags,
    users: _.get(state, 'common.users', [])
  }
}



@connect(mapStateToProps)
@withRuntimeSagaModel([
  tableListSagaModelGenerator(namespace),
  dataSourceListSagaModelGenerator('offline-calc-data-sources-list-for-table-list')
])
export default class OfflineCalcTableList extends React.Component {
  constructor (props) {
    super(props)

    this.onDeleteClick = this.onDeleteClick.bind(this)
  }
  
  state = {
    filterByDsId: 'all'
    // selectedTagId: ''
  }
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }
  
  onDeleteClick (ev) {
    let preDel = ev.target.getAttribute('data-table-id')
    if (!preDel) {
      return
    }
    Modal.confirm({
      title: '确认删除此维表？',
      content: '此操作无法撤销，请谨慎操作',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let {dispatch, offlineCalcTables} = this.props
        dispatch({
          type: `${namespace}/sync`,
          payload: (offlineCalcTables || []).filter(ds => ds.id !== preDel),
          forceReload: true,
          callback: (syncRes) => {
            let {resDelete} = syncRes || {}
            let res = _.get(resDelete, '[0].result', '')
            if (res === 1) {
              message.success('删除成功')
            }
          }
        })
      }
    })
  }
  
  renderColumns() {
    let { users, offlineCalcDataSources/*, tags*/ } = this.props
    let userDict = _.keyBy(users, 'id')
    // let tagIdDict = _.keyBy(tags, 'id')
    let dsIdDict = _.keyBy(offlineCalcDataSources, 'id')
    const hideRelationTrace  = _.includes(this.props.location.pathname,'external')
    return [
      {
        title: '维表名称',
        key: 'title',
        render: (val, record) => {
          const title = record.title || record.name
          return (
            <Auth auth="get:/console/offline-calc/tables/:id" alt={title}>
              <Link to={`/console/offline-calc/tables/${record.id}`}>{title}</Link>
            </Auth>
          )
        }
      },
      {
        title: '所属数据源',
        dataIndex: 'data_source_id',
        key: 'data_source_name',
        render: val => {
          const ds = _.get(dsIdDict, val)
          return ds && ds.name || '用户上传'
        }
      },
      {
        title: '数据来源表',
        dataIndex: 'name',
        key: 'name'
      },
      /*    {
        title: '所属分类',
        dataIndex: 'tags',
        key: 'tags',
        render: (tags) => {
          return (tags || []).map(tId => _.get(tagIdDict, [tId, 'name'])).filter(_.identity).join(', ')
        }
      },*/
      /*    {
        title: '版本',
        dataIndex: 'SugoVersionHistory.version',
        key: 'version'
      },*/
      {
        title: '负责人',
        dataIndex: 'created_by',
        key: 'created_by',
        render: (val) => {
          const {first_name, username} = userDict[val] || {}
          return first_name ? `${first_name}(${username})` : username
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        render: (val, record) => {
          return (
            <React.Fragment>
              <Auth auth="get:/console/offline-calc/tables/:id">
                <Link to={`/console/offline-calc/tables/${record.id}`}>编辑</Link>
              </Auth>
              {
                !hideRelationTrace
                  ? <Auth auth="get:/console/offline-calc/relation-trace/:id">
                    <Link className="mg2l" to={`/console/offline-calc/relation-trace/${record.id}?targetType=${OfflineCalcTargetType.Table}&chartType=${OfflineCalcChartType.influence}`}>查看影响</Link>
                  </Auth>
                  : null
              }
              {!canDel ? null : (
                <span
                  className="fpointer mg2l color-red"
                  data-table-id={val}
                  onClick={this.onDeleteClick}
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
    const {offlineCalcTables} = this.props
    const { selectedTagId, filterByDsId } = this.state
    let filteredTables = (offlineCalcTables || []).filter(d => {
      let pickThis = true
      if (filterByDsId === 'null' || !filterByDsId) {
        pickThis = pickThis && !d.data_source_id
      } else if (filterByDsId !== 'all') {
        pickThis = pickThis && d.data_source_id === filterByDsId
      }
      // if (selectedTagId) {
      //   pickThis = pickThis && _.some(d.tags, tId => tId === selectedTagId)
      // }
      return pickThis
    })
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '维表管理' }
          ]}
        />
        <div
          className="overscroll-y"
          style={{padding: '10px 10px 10px 5px', height: 'calc(100% - 44px)'}}
        >
          <div className="pd3x pd2y">
            <div className="pd2b">
              {this.renderDataSourcePicker()}
              <Auth auth="post:/app/offline-calc/tables">
                <Link to="/console/offline-calc/tables/new" className="fright">
                  <Button type="primary" icon={<PlusOutlined />} >添加维表</Button>
                </Link>
              </Auth>
            </div>
            
            <Table
              bordered
              rowKey="id"
              dataSource={filteredTables}
              columns={this.renderColumns()}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}
