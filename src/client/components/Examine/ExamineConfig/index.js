import React from 'react'
import Bread from '../../Common/bread'
import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Select, Row, Col, Button, Table, Popconfirm, Input } from 'antd'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import ExamineConfigModel, {namespace } from './model'
import withFetchTableData from '../../../common/withFetchTableData'
import ConfigModal from './config-modal'
import {examineConfigStatus } from '../constans'
import _ from 'lodash'

const {Option } = Select

@withRuntimeSagaModel(ExamineConfigModel)
@Form.create()

class ExamineConfig extends React.Component {
  state = {
    examineId: '',
    search: ''
  }

  cacheSearch = ''
  componentDidMount() {
    const { dispatch } = this.props
    dispatch({
      type: `${namespace}/getInstitutions`
    })
  }

  changeState = (payload) => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  columns = () => {
    return ([{
      title: '审批流名称',
      dataIndex: 'name'
    }, {
      title: '所属机构',
      dataIndex: 'institution_name'
    },
    //  {
    //   title: '状态',
    //   dataIndex: 'status',
    //   render: t => (<span>{examineConfigStatus[t]}</span>)
    // },
    {
      title: '操作',
      dataIndex: '',
      render: (t, r) => {
        return (
          <span>
            <a className="mg2r" onClick={() => this.onEdit(r)} >编辑</a>
            <Popconfirm
              title="确定删除该项审核流程吗？"
              onConfirm={() => this.onDelete(r)}
            >
              <a>删除</a>
            </Popconfirm>
          </span>
        )
      }
    }])
  }

  onShowModal = () => {
    this.setState({examineId: ''}, () => {
      this.changeState({ isShowConfigModal: true, configModalInfo: {} })
    })
  }

  onEdit = (r) => {
    this.setState({examineId: r.id || ''}, () => {
      this.changeState({ isShowConfigModal: true, configModalInfo: r })
    })
  }

  onDelete = (r) => {
    this.props.dispatch({
      type: `${namespace}/deleteExamineConfig`,
      payload: { id: r.id },
      callback: () => this.props.onRefresh()
    }) 
  }

  onSearch = () => {
    const {form: {validateFields }, onRefresh } = this.props
    validateFields((err, value) => {
      if(err) return
      const params = value
      if(JSON.stringify(value) === this.cacheSearch) return
      onRefresh(params)
      this.cacheSearch = JSON.stringify(params)
    })
  }

  renderHeader = () => {
    const { form: { getFieldDecorator, resetFields}, institutionList = [], onRefresh } = this.props
    return (
      <Form layout="inline">
        <Row>
          <Col span={18}>
            <Form.Item 
              label="机构"
              labelCol= {{ span: 4 }}
              wrapperCol= {{ span: 20 }}
            >
              {getFieldDecorator('institution_id')(
                <Select placeholder="请选择机构" style={{ width: 200 }} allowClear >
                  {institutionList.map(o => {
                    return (
                      <Option value={o.id} key={o.id}>{o.name}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
            <Form.Item 
              label="状态"
              labelCol= {{ span: 4 }}
              wrapperCol= {{ span: 20 }}
            >
              {getFieldDecorator('status')(
                <Select placeholder="请选择审批流状态" style={{ width: 200 }} allowClear>
                  {(_.map(examineConfigStatus, (v, k) => ({ id: k, name: v }))).map(o => {
                    return (<Option value={o.id} key={o.id}>{o.name}</Option>)
                  })}
                </Select>
              )}
            </Form.Item>
            <Form.Item  >
              {getFieldDecorator('search')(
                <Input placeholder="请输入审核流名称" style={{ width: 240 }} />
              )}
            </Form.Item>
            <Form.Item  >
              <Button 
                type="primary"
                icon={<SearchOutlined />} 
                onClick={this.onSearch}
              >
          搜索
              </Button>
            </Form.Item>
            <Form.Item  >
              <Button 
                icon={<DeleteOutlined />} 
                onClick={() => {
                  resetFields()
                  onRefresh()
                }}
              >
            清空
              </Button>
            </Form.Item>
          </Col>
          <Col
            span={6}
            style={{
              textAlign: 'right'
            }}
          >
            <Form.Item  >
              <Button type="primary"
                style={{marginRight: '-16px'}}
                onClick={this.onShowModal}
                key="add"
              >
                <PlusOutlined />配置审核流
              </Button>
            </Form.Item>
          </Col>
        </Row>
        
      </Form>
    )
  }

  render() {
    const { data, isShowConfigModal, pagination, onRefresh, configModalInfo } = this.props
    const { examineId } = this.state
    return (
      <div className="">
        <Bread path={[{ name: '审核流配置' }]} />
        <div className="examine-config-warp pd2"
          style={{
            height: 'calc(100vh - 94px)', 
            overflowX: 'hidden'
          }}
        >
          <div className="pd2b">
            {this.renderHeader()}
          </div>
          <Table
            rowKey="id"
            dataSource={data}
            columns={this.columns()}
            bordered
            pagination={pagination}
          />
        </div>
        {isShowConfigModal && <ConfigModal configModalInfo={configModalInfo} examineId={examineId} onRefresh={onRefresh} />}
      </div>
    )
  }

}

export default withFetchTableData(Form.create()(ExamineConfig), {namespace })
