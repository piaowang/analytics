import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, message, Modal, Table } from 'antd';
import _ from 'lodash'
import {sagaSyncModel} from '../Fetcher/saga-sync'
import Fetch from '../../common/fetch-final'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import moment from 'moment'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import {DataApiClientStatusEnum} from '../../../common/constants'
import {Auth, checkPermission} from '../../common/permission-control'
import {immutateUpdate} from '../../../common/sugo-utils'
import {getUsers} from '../../actions'


export const DataApiClientsManagerNameSpace = 'data-api-clients-manager'

const canModClients = checkPermission('put:/app/data-api-clients/:id')
const canDelClients = checkPermission('delete:/app/data-api-clients/:id')

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}

let mapStateToProps = (state, ownProps) => {
  const modelState = state[DataApiClientsManagerNameSpace] || {}
  return {
    ...modelState,
    datasourceCurrent: _.get(state, 'sagaCommon.datasourceCurrent', {}),
    users: _.get(state, 'common.users', [])
  }
}
const sagaModelGenerator = props => {
  return sagaSyncModel(
    {
      namespace: DataApiClientsManagerNameSpace,
      modelName: 'clients',
      getEffect: async () => {
        let res = await Fetch.get('/app/data-api-clients')
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/data-api-clients', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/data-api-clients/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/data-api-clients/${model.id}`)
      }
    }
  )
}

const durationFormat = metricValueFormatterFactory('duration')


@connect(mapStateToProps)
@withRuntimeSagaModel(sagaModelGenerator)
export default class DataAPIClientsManager extends React.Component {
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }
  
  renderColumns() {
    let {users} = this.props
    let userDict = _.keyBy(users, 'id')
    return [
      {
        title: '客户端名称',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: '应用ID',
        dataIndex: 'app_id',
        key: 'app_id'
      },
      {
        title: '应用Key',
        dataIndex: 'app_key',
        key: 'app_key'
      },
      {
        title: '访问标识码',
        dataIndex: 'access_token',
        key: 'access_token'
      },
      {
        title: '访问标识码有效时间',
        dataIndex: 'access_token_expire_at',
        key: 'access_token_expire_at',
        render: (val) => {
          if (!val) {
            return null
          }
          let remainAgeInSec = moment(val).diff(moment(), 's')
          return remainAgeInSec <= 0 ? '已失效' : durationFormat(remainAgeInSec)
        }
      },
      {
        title: '访问标识码刷新码',
        dataIndex: 'refresh_token',
        key: 'refresh_token'
      },
      {
        title: '创建者',
        dataIndex: 'created_by',
        key: 'created_by',
        render: (val) => {
          const {first_name, username} = userDict[val] || {}
          return first_name ? `${first_name}(${username})` : username
        }
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render: val => {
          return moment(val).format('YYYY-MM-DD HH:mm:ss ddd')
        }
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: val => {
          return DataApiClientStatusEnum.Enabled === val ? '启用' : '禁用'
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        render: (id, record) => {
          return (
            <React.Fragment>
              {!canModClients ? null : (
                <a
                  className="mg2r pointer"
                  data-client-id={id}
                  onClick={this.onRefreshTokenClick}
                >{record.access_token ? '刷新访问标识码' : '生成访问标识码'}</a>
              )}
              {!canModClients ? null : (
                <a
                  className="mg2r pointer"
                  data-client-id={id}
                  onClick={this.onToggleStatusClick}
                >{record.status === DataApiClientStatusEnum.Enabled ? '禁用' : '启用'}</a>
              )}
              {!canDelClients ? null : (
                <span
                  className="fpointer color-red"
                  data-client-id={id}
                  onClick={this.onDeleteClientClick}
                >删除</span>
              )}
            </React.Fragment>
          )
        }
      }
    ]
  }
  
  onRefreshTokenClick = async e => {
    let preToggleStatusId = e.target.getAttribute('data-client-id')
    if (!preToggleStatusId) {
      return
    }
    let {clients, dispatch} = this.props
    let client = _.find(clients, {id: preToggleStatusId})
    if (!client.access_token) {
      let res = await Fetch.post('/system/auth', null, {
        body: JSON.stringify(_.pick(client, ['app_id', 'app_key']))
      })
      if (res) {
        message.success('生成成功')
        dispatch({
          type: `${DataApiClientsManagerNameSpace}/fetch`
        })
      }
      return
    }
    if (moment().isBefore(client.access_token_expire_at)) {
      message.warn('访问码未过期，无需刷新')
      return
    }
    let res = await Fetch.post('/system/refresh', null, {
      body: JSON.stringify(_.pick(client, 'refresh_token'))
    })
    if (res) {
      message.success('刷新成功')
      dispatch({
        type: `${DataApiClientsManagerNameSpace}/fetch`
      })
    }
  }
  
  onToggleStatusClick = e => {
    let preToggleStatusId = e.target.getAttribute('data-client-id')
    if (!preToggleStatusId) {
      return
    }
    let {clients, dispatch} = this.props
    let client = _.find(clients, {id: preToggleStatusId})
    let nextStatus = client.status === DataApiClientStatusEnum.Enabled
      ? DataApiClientStatusEnum.Disabled
      : DataApiClientStatusEnum.Enabled
    if (nextStatus === DataApiClientStatusEnum.Disabled) {
      Modal.confirm({
        title: '确认禁用此客户端？',
        content: '此客户端将无法再调用接口',
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
          dispatch({
            type: `${DataApiClientsManagerNameSpace}/sync`,
            payload: (clients || [])
              .map(s => s.id === preToggleStatusId ? ({...s, status: nextStatus}) : s)
          })
        }
      })
    } else {
      dispatch({
        type: `${DataApiClientsManagerNameSpace}/sync`,
        payload: (clients || [])
          .map(s => s.id === preToggleStatusId ? ({...s, status: nextStatus}) : s)
      })
    }
  }
  
  onDeleteClientClick = e => {
    let preDelId = e.target.getAttribute('data-client-id')
    if (!preDelId) {
      return
    }
    Modal.confirm({
      title: '确认删除此客户端？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let {clients, dispatch} = this.props
        dispatch({
          type: `${DataApiClientsManagerNameSpace}/sync`,
          payload: (clients || []).filter(s => s.id !== preDelId)
        })
      }
    })
  }
  
  toggleModalVisible = () => {
    this.props.dispatch({
      type: `${DataApiClientsManagerNameSpace}/updateState`,
      payload: prevState => {
        return immutateUpdate(prevState, 'clients', clients => {
          let pendingClient = _.find(clients, c => !c.id)
          return pendingClient ? clients.filter(c => c.id) : [...clients, {name: ''}]
        })
      }
    })
  }
  
  renderModal() {
    let {clients, dispatch} = this.props
    
    let pendingClientIdx = _.findIndex(clients, c => !c.id)
    return (
      <Modal
        visible={0 <= pendingClientIdx}
        onOk={() => {
          const value = _.get(clients, `[${pendingClientIdx}].name`)
          if (!/^[\u4e00-\u9fa5_a-zA-Z0-9]+$/.test(value)) {
            message.error('客户端不能包含特殊字符,且不为空')
          } else {
            dispatch({
              type: `${DataApiClientsManagerNameSpace}/sync`
            })
          }
          
        }}
        onCancel={this.toggleModalVisible}
        title="创建客户端"
        closable
        width={450}
      >
        <Form>
          <Form.Item
            label="客户端名称"
            {...formItemLayout}
            required
          >
            <Input
              value={_.get(clients, `[${pendingClientIdx}].name`)}
              placeholder="请输入客户端名称"
              onChange={e => {
                let {value} = e.target
                dispatch({
                  type: `${DataApiClientsManagerNameSpace}/updateState`,
                  payload: prevState => immutateUpdate(prevState, `clients[${pendingClientIdx}].name`, () => value)
                })
              }}
            />
          </Form.Item>
      
        </Form>
      </Modal>
    );
  }
  
  render() {
    let {clients, dispatch} = this.props
    return (
      <div className="pd3x pd2y">
        <div className="alignright mg2b">
          <Auth auth="post:/app/data-api-clients">
            <Button
              type="primary"
              onClick={this.toggleModalVisible}
            >创建数据 API 客户端</Button>
            {this.renderModal()}
          </Auth>
        </div>
        <Table
          dataSource={_.filter(clients, c => c.id)}
          columns={this.renderColumns()}
        />
      </div>
    )
  }
}
