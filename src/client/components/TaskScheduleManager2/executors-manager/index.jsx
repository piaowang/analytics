import React, { Component } from 'react'
import Bread from '../../Common/bread'
import { connect } from 'react-redux'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Table, Row, Col, Button, Radio, Modal, Input, Popconfirm } from 'antd';
import executorsModel, { namespace } from './model'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import ExectorInfo from './exector-info.jsx'
import _ from 'lodash'
import { validateFields } from '../../../common/decorators'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

@withRuntimeSagaModel(executorsModel)
@connect(props => {
  return {
    ...props[namespace]
  }
})
@Form.create()
@validateFields
export default class TaskScheduleList extends Component {

  componentDidUpdate(prevProps) {
    const { selectExecutorInfo } = this.props
    if (selectExecutorInfo.id !== prevProps.selectExecutorInfo.id) {
      this.props.form.resetFields()
    }
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  deleteExecutor = payload => {
    this.props.dispatch({
      type: `${namespace}/deleteExecutor`,
      payload
    })
  }

  getServerStatistics = payload => {
    this.props.dispatch({
      type: `${namespace}/getServerStatistics`,
      payload
    })
  }

  saveExecutor = async () => {
    const val = await this.validateFields()
    const { selectExecutorInfo } = this.props
    if (!val) {
      return
    }
    this.props.dispatch({
      type: `${namespace}/saveExecutor`,
      payload: {
        id: selectExecutorInfo.id,
        ...val
      }
    })
  }

  renderTable = () => {
    let { executors = [], searchKey } = this.props
    const columns = [{
      title: '编号',
      dataIndex: 'id',
      width: 100
    }, {
      title: '主机',
      dataIndex: 'host',
      width: 100
    }, {
      title: '端口',
      dataIndex: 'port',
      width: 100
    }, {
      title: '状态',
      dataIndex: 'active',
      width: 50,
      render: (v, o) => {
        return v ? <div><span className="mg1r icon-active" />启用</div> : <div><span className="mg1r icon-normal" />禁用</div>
      }
    }, {
      title: '操作',
      dataIndex: 'operation',
      width: 80,
      render: (v, o) => {
        return (<div>
          <a className="mg2r" disabled={!o.active} onClick={() => this.changeState({ selectExecutorInfo: o, showExecutorInfo: true })}>查看</a>
          <a className="mg2r" onClick={() => this.changeState({ selectExecutorInfo: o, showEidtExecutors: true })}>编辑</a>
          <Popconfirm
            title={`确定删除执行器 "${o.host}" 么？`}
            placement="topLeft"
            onConfirm={() => this.deleteExecutor({ id: o.id })}
          >
            <a >删除</a>
          </Popconfirm>
        </div>)
      }
    }]
    const data = searchKey ? executors.filter(p => p.host.indexOf(searchKey) > -1) : executors
    return (<div className="task-table-panel corner pd2">
      <Row className="mg2b">
        <Col span={12}>
          <div className="mg2l alignright iblock">
            节点名:
          </div>
          <Input
            className="mg2l mg3r width200 iblock"
            placeholder={'请输入主机名称'}
            onChange={v => this.changeState({ searchKey: v.target.value })}
          />
        </Col>
        <Col className="alignright" span={12}>
          <Button onClick={() => this.changeState({ selectExecutorInfo: {}, showEidtExecutors: true })}>添加</Button>
        </Col>
      </Row>
      <Table
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={data}
        bordered
        pagination={{
          showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
          total: data.length,
          showSizeChanger: true,
          defaultPageSize: 10
        }}
      />
    </div>)
  }

  renderEditTaskModal = () => {
    let { selectExecutorInfo = {}, showEidtExecutors } = this.props
    const { getFieldDecorator } = this.props.form
    return (
      <Modal
        maskClosable={false}
        title={selectExecutorInfo.id ? '编辑节点' : '新增节点'}
        wrapClassName="vertical-center-modal"
        visible={showEidtExecutors}
        bodyStyle={{ padding: '10px 20px' }}
        onCancel={() => this.changeState({ showEidtExecutors: false })}
        onOk={this.saveExecutor}
        width={'600px'}
      >
        <Form>
          <FormItem label="主机" className="mg1b" hasFeedback {...formItemLayout}>
            {getFieldDecorator(`host`, {
              rules: [{
                required: true, message: '主机地址必填!',
              }, {
                pattern: /^[a-zA-Z0-9\_\.\-]+|\.+[a-zA-Z0-9\_\.\-]+$/,
                message: '输入无效,包含非法字符'
              }],
              initialValue: selectExecutorInfo.host
            })(
              <Input />
            )}
          </FormItem>
          <FormItem label="端口" className="mg1b" hasFeedback {...formItemLayout}>
            {getFieldDecorator(`port`, {
              rules: [{
                required: true, message: '端口必填!',
              }, {
                pattern: /^\d+$/,
                message: '输入无效,包含非法字符'
              }],
              initialValue: selectExecutorInfo.port
            })(
              <Input />
            )}
          </FormItem>
          <FormItem label="状态" className="mg1b" {...formItemLayout}>
            {getFieldDecorator(`active`, {
              initialValue: _.get(selectExecutorInfo, 'active', true)
            })(
              <Radio.Group >
                <Radio value={true}>启用</Radio>
                <Radio value={false}>停用</Radio>
              </Radio.Group>
            )}
          </FormItem>
        </Form>
      </Modal>
    );
  }

  render() {
    const { executors, serverStatistics, showExecutorInfo, selectExecutorInfo } = this.props
    return (
      <div className="width-100 task-schedule height-100" >
        <Bread path={[{ name: '执行器管理' }]} />
        {this.renderTable()}
        {this.renderEditTaskModal()}
        <ExectorInfo
          executors={executors}
          serverStatistics={serverStatistics}
          showExecutorInfo={showExecutorInfo}
          host={selectExecutorInfo.host}
          port={selectExecutorInfo.port}
          getServerStatistics={this.getServerStatistics}
          hideModal={() => this.changeState({ showExecutorInfo: false })}
        />
      </div >
    )
  }
}
