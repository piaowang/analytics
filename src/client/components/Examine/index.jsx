import React, { Component } from 'react'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Table, Input, Select, Button, Tabs, Tooltip } from 'antd'
import _ from 'lodash'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import LivescreenRoleManager, { namespace } from './model'
import { connect } from 'react-redux'
import ExamineInfoModal from './examine-info-modal'
import moment from 'moment'
import { EXAMINE_STATUS, EXAMINE_STATUS_TRANSLATE, EXAMINE_TYPE_TRANSLATE, EXAMINE_TYPE } from '../../../common/constants'
import ExamineModal from './examine-modal'
import { NumberTranslate } from './constans'
import './index.styl'
import { Anchor } from '../Common/anchor-custom'

@connect(state => {
  return {
    ...state[namespace]
  }
})
@withRuntimeSagaModel(LivescreenRoleManager)
export default class Index extends Component {
  renderSendTable = () => {
    const { list = [] } = this.props
    const columns = [
      {
        key: 'model_name',
        dataIndex: 'model_name',
        title: '大屏名称',
        render: (v, o) => (
          <Anchor href={`/livescreen/${o.model_id}`} target='_blank'>
            {v}
          </Anchor>
        )
      },
      {
        key: 'model_type',
        dataIndex: 'model_type',
        title: '类型',
        render: v =>
          _.get(
            EXAMINE_TYPE_TRANSLATE,
            _.findKey(EXAMINE_TYPE, p => p === v)
          )
      },
      {
        key: 'created_at',
        dataIndex: 'created_at',
        title: '提交时间',
        render: v => moment(v).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        key: 'status',
        dataIndex: 'status',
        title: '流程状态',
        render: (val, obj) => {
          if (obj.status === EXAMINE_STATUS.notsubmit) {
            return '已撤销'
          }
          return EXAMINE_STATUS_TRANSLATE[_.findKey(EXAMINE_STATUS, v => v === val)]
        }
      },
      {
        key: 'operation',
        dataIndex: 'operation',
        title: '操作',
        render: (val, obj) => {
          return (
            <div>
              <Tooltip title='查看详情'>
                <a className='mg2r' onClick={() => this.changeState({ editInfo: obj, editVisible: true })}>
                  查看详情
                </a>
              </Tooltip>
              {obj.status === 1 && obj.examine_step === 1 ? (
                <Tooltip title='取消审核'>
                  <a
                    className='mg2r'
                    onClick={() =>
                      this.props.dispatch({
                        type: `${namespace}/cancel`,
                        payload: { id: obj.id }
                      })
                    }
                  >
                    取消
                  </a>
                </Tooltip>
              ) : null}
              {obj.status === 0 ? (
                <Tooltip title='删除'>
                  <a
                    className='mg2r'
                    onClick={() =>
                      this.props.dispatch({
                        type: `${namespace}/delete`,
                        payload: { id: obj.id }
                      })
                    }
                  >
                    删除
                  </a>
                </Tooltip>
              ) : null}
            </div>
          )
        }
      }
    ]
    return (
      <Table
        rowKey='id'
        columns={columns}
        bordered
        pagination={{
          showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
          showSizeChanger: true,
          defaultPageSize: 10
        }}
        dataSource={list}
      />
    )
  }

  renderInfoModal = () => {
    const { editInfo, editVisible } = this.props
    return <ExamineInfoModal editVisible={editVisible} editInfo={editInfo} hide={() => this.changeState({ editVisible: false })} />
  }

  renderExamineTable = () => {
    const { list } = this.props
    const columns = [
      {
        key: 'model_name',
        dataIndex: 'model_name',
        title: '大屏名称',
        render: (v, o) => (
          <Anchor href={`/livescreen/${o.model_id}`} target='_blank'>
            {v}
          </Anchor>
        )
      },
      {
        key: 'model_type',
        dataIndex: 'model_type',
        title: '类型',
        render: v =>
          _.get(
            EXAMINE_TYPE_TRANSLATE,
            _.findKey(EXAMINE_TYPE, p => p === v)
          )
      },
      {
        key: 'created_by_name',
        dataIndex: 'created_by_name',
        title: '申请人'
      },
      {
        key: 'created_at',
        dataIndex: 'created_at',
        title: '提交时间',
        render: v => moment(v).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        key: 'status',
        dataIndex: 'status',
        title: '我的审核状态',
        render: (val, o) => {
          let status = o.examine_info.find(p => p.handlerId === window.sugo.user.id)
          status = _.get(status, 'examieStatus', EXAMINE_STATUS.wait)
          return EXAMINE_STATUS_TRANSLATE[_.findKey(EXAMINE_STATUS, v => v === status)]
        }
      },
      {
        key: 'status',
        dataIndex: 'status',
        title: '流程状态',
        render: val => EXAMINE_STATUS_TRANSLATE[_.findKey(EXAMINE_STATUS, v => v === val)]
      },
      {
        key: 'updated_at',
        dataIndex: 'updated_at',
        title: '处理时间',
        render: v => moment(v).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        key: 'operation',
        dataIndex: 'operation',
        title: '操作',
        render: (val, obj) => {
          return (
            <div>
              <Tooltip title='查看详情'>
                <a className='mg2r' onClick={() => this.changeState({ editInfo: obj, editVisible: true })}>
                  查看详情
                </a>
              </Tooltip>
              {obj.status < 2 && obj.examine_user === window.sugo.user.id ? (
                <Tooltip title='审核'>
                  <a className='mg2r' onClick={() => this.changeState({ examineVisible: true, editInfo: obj })}>
                    审核
                  </a>
                </Tooltip>
              ) : null}
            </div>
          )
        }
      }
    ]
    return (
      <Table
        columns={columns}
        bordered
        pagination={{
          showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
          showSizeChanger: true,
          defaultPageSize: 10
        }}
        dataSource={list}
      />
    )
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  renderFilter = () => {
    const { selectTab, searchName, searchStatus } = this.props
    return (
      <div className='mg2b'>
        <Form layout='inline'>
          <Form.Item label='状态' labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
            <Select placeholder='请选择流程状态' value={searchStatus} className='width200' onChange={e => this.changeState({ searchStatus: e })}>
              <Select.Option value={1}>待审核</Select.Option>
              <Select.Option value={2}>已通过</Select.Option>
              <Select.Option value={3}>已驳回</Select.Option>
              {selectTab === 'send' ? <Select.Option value={0}>已撤销</Select.Option> : null}
            </Select>
          </Form.Item>
          <Form.Item>
            <Input placeholder='请输入大屏名称' value={searchName} className='width200' onChange={e => this.changeState({ searchName: e.target.value })} />
          </Form.Item>
          <Form.Item>
            <Button type='primary' icon={<SearchOutlined />} onClick={() => this.props.dispatch({ type: `${namespace}/queryList`, payload: { selectTab: selectTab } })}>
              搜索
            </Button>
          </Form.Item>
          <Form.Item>
            <Button
              icon={<DeleteOutlined />}
              onClick={() => {
                this.changeState({ searchStatus: undefined, searchName: undefined })
                this.props.dispatch({ type: `${namespace}/queryList`, payload: {} })
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
    const { editVisible, examineVisible, editInfo } = this.props
    return (
      <div>
        <Tabs onChange={e => this.props.dispatch({ type: `${namespace}/queryList`, payload: { selectTab: e } })}>
          <Tabs.TabPane key='send' tab='我发起的'>
            {this.renderFilter()}
            {this.renderSendTable()}
          </Tabs.TabPane>
          <Tabs.TabPane key='examine' tab='我审核的'>
            {this.renderFilter()}
            {this.renderExamineTable()}
          </Tabs.TabPane>
        </Tabs>
        <ExamineModal
          visible={examineVisible}
          save={payload =>
            this.props.dispatch({
              type: `${namespace}/examine`,
              payload: { ...payload, id: editInfo.id }
            })
          }
          hide={() => this.changeState({ examineVisible: false })}
        />
        {editVisible ? this.renderInfoModal() : null}
      </div>
    )
  }
}
