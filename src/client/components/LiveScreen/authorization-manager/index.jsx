import React, { Component } from 'react'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Table, Input, Select, Button, Tabs, Tooltip, Popconfirm } from 'antd'
import { LIVE_SCREEN_STATUS, LIVE_SCREEN_STATUS_TRANSLATE, AUTHORIZATION_PERMISSIONS_TYPE, AUTHORIZATION_PERMISSIONS_TYPE_TRANSLATE } from '../../../../common/constants'
import _ from 'lodash'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import LivescreenRoleManager, { namespace } from './model'
import { connect } from 'react-redux'
import * as actions from '../../../actions'
import { bindActionCreators } from 'redux'
import RoleSettingPanel from './role-setting'
import Bread from 'client/components/Common/bread'
import moment from 'moment'
import { Anchor } from '../../Common/anchor-custom'

@connect(
  state => {
    return {
      ...state[namespace],
      roles: _.get(state, 'common.roles'),
      institutions: _.get(state, 'common.institutionsList'),
      institutionsTree: _.get(state, 'common.institutionsTree')
    }
  },
  dispatch => bindActionCreators(actions, dispatch)
)
@withRuntimeSagaModel(LivescreenRoleManager)
export default class Index extends Component {
  componentDidMount() {
    this.props.getRoles()
    this.props.getInstitutions()
  }

  renderAuthorizeTable = () => {
    let { authorizeList = [] } = this.props
    const columns = [
      {
        key: 'livescreen_name',
        dataIndex: 'livescreen_name',
        title: '大屏名称',
        render: (v, o) => (
          <Anchor href={`/livescreen/${o.livescreen_id}`} target='_blank'>
            {v}
          </Anchor>
        )
      },
      {
        key: 'status',
        dataIndex: 'status',
        title: '状态',
        render: (val, obj) => {
          const stauts = _.findKey(LIVE_SCREEN_STATUS, p => p === val)
          return _.get(LIVE_SCREEN_STATUS_TRANSLATE, stauts)
        }
      },
      {
        key: 'editor',
        dataIndex: 'editor',
        width: '30%',
        title: '编辑授权角色',
        render: (val = [], record) => {
          return (
            _.get(record, 'roles', [])
              .filter(r => r.type === AUTHORIZATION_PERMISSIONS_TYPE.write)
              .map(r => {
                return r.name
              })
              .join(',') || '--'
          )
        }
      },
      {
        key: 'editor',
        dataIndex: 'editor',
        width: '30%',
        title: '预览授权角色',
        render: (val = [], record) => {
          return (
            _.get(record, 'roles', [])
              .filter(r => {
                return r.type === AUTHORIZATION_PERMISSIONS_TYPE.write || r.type === AUTHORIZATION_PERMISSIONS_TYPE.read
              })
              .map(r => {
                return r.name
              })
              .join(',') || '--'
          )
        }
      },
      {
        key: 'operation',
        dataIndex: 'operation',
        title: '操作',
        render: (val, obj) => {
          return (
            <div>
              <Tooltip title='权限编辑'>
                <a className='mg2r' onClick={() => this.changeState({ editInfo: obj, editVisible: true })}>
                  权限编辑
                </a>
              </Tooltip>
              {_.get(obj, 'roles.length', 0) ? (
                <Popconfirm
                  title='确认撤销授权?'
                  onConfirm={() =>
                    this.props.dispatch({
                      type: `${namespace}/cancelAuthorization`,
                      payload: { livescreenId: obj.livescreen_id }
                    })
                  }
                >
                  <a>撤销</a>
                  {/*<Tooltip title="撤销">加
                    <Icon
                      className="mg2r color-main"
                      type="rollback"
                    />
                </Tooltip>*/}
                </Popconfirm>
              ) : null}
            </div>
          )
        }
      }
    ]
    return (
      <Table
        rowKey='livescreen_id'
        columns={columns}
        bordered
        pagination={{
          showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
          showSizeChanger: true,
          defaultPageSize: 10
        }}
        dataSource={authorizeList}
      />
    )
  }

  renderSettingPanel = () => {
    const { roles, institutions, editInfo, institutionsTree, editVisible } = this.props
    return (
      <RoleSettingPanel
        roleList={roles}
        institutionsList={institutions}
        institutionsTree={institutionsTree}
        value={editInfo.roles}
        editVisible={editVisible}
        hide={() => this.changeState({ editVisible: false })}
        save={({ writeSelectRoles, readSelectRoles }) => {
          this.props.dispatch({
            type: `${namespace}/updateAuthorization`,
            payload: { writeRoles: writeSelectRoles, readRoles: readSelectRoles, livescreenId: editInfo.livescreen_id }
          })
        }}
      />
    )
  }

  renderEmpowerMeTable = () => {
    const { empowerMeList = [] } = this.props
    const columns = [
      {
        key: 'livescreen_name',
        dataIndex: 'livescreen_name',
        title: '大屏名称',
        render: (v, o) =>
          LIVE_SCREEN_STATUS.authorize !== o.status ? (
            <span>{v}</span>
          ) : (
            <Anchor href={`/livescreen/${o.livescreen_id}`} target='_blank'>
              {v}
            </Anchor>
          )
      },
      {
        key: 'type',
        dataIndex: 'type',
        title: '授权操作',
        render: val => {
          const stauts = _.findKey(AUTHORIZATION_PERMISSIONS_TYPE, p => p === val)
          return _.get(AUTHORIZATION_PERMISSIONS_TYPE_TRANSLATE, stauts)
        }
      },
      {
        key: 'updated_by_name',
        dataIndex: 'updated_by_name',
        title: '授权人'
      },
      {
        key: 'status',
        dataIndex: 'status',
        title: '状态',
        render: val => {
          const stauts = _.findKey(LIVE_SCREEN_STATUS, p => p === val)
          return _.get(LIVE_SCREEN_STATUS_TRANSLATE, stauts)
        }
      },
      {
        key: 'created_at',
        dataIndex: 'created_at',
        title: '授权时间',
        render: val => moment(val).format('YYYY-MM-DD HH:mm:ss')
      }
    ]
    return <Table columns={columns} dataSource={empowerMeList} />
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  renderFilter = () => {
    const { searchName, searchStatus } = this.props
    return (
      <div className='mg2b'>
        <Form layout='inline'>
          <Form.Item label='状态' labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
            <Select placeholder='请选择授权状态' value={searchStatus} className='width200' onChange={e => this.changeState({ searchStatus: e })}>
              <Select.Option value={1}>授权</Select.Option>
              <Select.Option value={-1}>未授权</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Input placeholder='请输入大屏名称' value={searchName} className='width200' onChange={e => this.changeState({ searchName: e.target.value })} />
          </Form.Item>
          <Form.Item>
            <Button type='primary' icon={<SearchOutlined />} onClick={() => this.props.dispatch({ type: `${namespace}/queryList` })}>
              搜索
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              icon={<DeleteOutlined />}
              style={{ marginLeft: '5px' }}
              onClick={() => {
                this.changeState({ searchStatus: undefined, searchName: '' })
                this.props.dispatch({ type: `${namespace}/queryList` })
              }}
            >
              清空
            </Button>
          </Form.Item>
        </Form>
      </div>
    )
  }

  render() {
    const { editVisible } = this.props
    return (
      <div>
        <Bread path={[{ name: '授权管理' }]} />
        <div
          className='examine-config-warp pd2'
          style={{
            height: 'calc(100vh - 94px)',
            overflowX: 'hidden',
            minHeight: '600px'
          }}
        >
          <Tabs>
            <Tabs.TabPane key='authorize' tab='我授权的'>
              {this.renderFilter()}
              {this.renderAuthorizeTable()}
            </Tabs.TabPane>
            <Tabs.TabPane key='empowerMe' tab='授权给我的'>
              {this.renderFilter()}
              {this.renderEmpowerMeTable()}
            </Tabs.TabPane>
          </Tabs>
        </div>
        {editVisible ? this.renderSettingPanel() : null}
      </div>
    )
  }
}
