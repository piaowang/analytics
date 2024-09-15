import React from 'react'
import Bread from '../Common/bread'
import { PlusOutlined } from '@ant-design/icons';
import {Button, Modal, Table} from 'antd'
import _ from 'lodash'
import {OfflineCalcDataSourceTypeEnum} from '../../../common/constants'
import {Auth, checkPermission} from '../../common/permission-control'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {Link} from 'react-router'
import {dataSourceListSagaModelGenerator} from './saga-model-generators'
import { OfflineCalcChartType, OfflineCalcTargetType } from '../../../common/constants'

const namespace = 'offline-calc-data-sources-list'

const canDel = checkPermission('delete:/app/offline-calc/data-sources/:id')

let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  return {
    ...modelState,
    users: _.get(state, 'common.users', [])
  }
}

@connect(mapStateToProps)
@withRuntimeSagaModel([
  dataSourceListSagaModelGenerator(namespace, 'list', {attributes: ['id', 'name', 'type', 'connection_params', 'created_by']})
])
export default class OfflineCalcDataSourcesList extends React.Component {
  constructor (props) {
    super(props)
    this.onDeleteOfflineDsClick = this.onDeleteOfflineDsClick.bind(this)
  }
  componentDidMount() {
    this.props.dispatch(getUsers())
  }
  
  onDeleteOfflineDsClick (ev) {
    let preDel = ev.target.getAttribute('data-ds-id')
    if (!preDel) {
      return
    }
    Modal.confirm({
      title: '确认删除此数据源？',
      content: '此操作无法撤销，请谨慎操作',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let {dispatch, offlineCalcDataSources} = this.props
        dispatch({
          type: `${namespace}/sync`,
          payload: (offlineCalcDataSources || []).filter(ds => ds.id !== preDel),
          forceReload: true // 避免删除失败后，数据库没有重新显示
        })
      },
      onCancel() {
      }
    })
  }
  
  renderColumns() {
    let { users } = this.props
    let userDict = _.keyBy(users, 'id')
    const hideRelationTrace  = _.includes(this.props.location.pathname,'external')
    return [
      {
        title: '数据源名称',
        dataIndex: 'name',
        key: 'name',
        render: (val, record) => {
          return (
            <Auth auth="get:/console/offline-calc/data-sources/:id" alt={val}>
              <Link to={`/console/offline-calc/data-sources/${record.id}`}>{val}</Link>
            </Auth>
          )
        }
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        render: (type) => {
          let typeName = _.findKey(OfflineCalcDataSourceTypeEnum, v => v === type)
          return typeName || '(未知)'
        }
      },
      {
        title: '服务器地址',
        dataIndex: 'connection_params.hostAndPort',
        key: 'hostAndPort',
        render: (v, record) => _.get(record, 'connection_params.hostAndPort', '--')
      },
      {
        title: '数据库名称',
        dataIndex: 'connection_params.database',
        key: 'database',
        render: (v, record) => _.get(record, 'connection_params.database', '--')
      },
      {
        title: '数据库架构',
        dataIndex: 'connection_params.schema',
        key: 'schema',
        render: (v, record) => _.get(record, 'connection_params.schema', '--')
      },
      {
        title: '数据库用户名',
        dataIndex: 'connection_params.user',
        key: 'user',
        render: (v, record) => _.get(record, 'connection_params.user', '--')
      },
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
              <Auth auth="get:/console/offline-calc/data-sources/:id">
                <Link to={`/console/offline-calc/data-sources/${record.id}`}>编辑</Link>
              </Auth>
              {
                !hideRelationTrace
                  ? <Auth auth="get:/console/offline-calc/relation-trace/:id">
                    <Link className="mg2l" to={`/console/offline-calc/relation-trace/${record.id}?targetType=${OfflineCalcTargetType.Datasource}&chartType=${OfflineCalcChartType.influence}`}>查看影响</Link>
                  </Auth>
                  : null
              }
              {!canDel ? null : (
                <span
                  className="fpointer mg2l color-red"
                  data-ds-id={val}
                  onClick={this.onDeleteOfflineDsClick}
                >删除</span>
              )}
            </React.Fragment>
          )
        }
      }
    ]
  }
  
  render() {
    let {offlineCalcDataSources} = this.props
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '数据源管理' }
          ]}
        />
        <div
          className="overscroll-y"
          style={{padding: '10px 10px 10px 5px', height: 'calc(100% - 44px)'}}
        >
          <div className="pd3x pd2y">
            <div className="alignright pd2b">
              <Auth auth="post:/app/offline-calc/data-sources">
                <Link to="/console/offline-calc/data-sources/new" >
                  <Button type="primary" icon={<PlusOutlined />} >添加数据源</Button>
                </Link>
              </Auth>
            </div>
            <Table
              rowKey="id"
              bordered
              dataSource={offlineCalcDataSources}
              columns={this.renderColumns()}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}
