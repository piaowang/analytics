import React, { PureComponent } from 'react'
import Bread from '../../Common/bread'
import { PlusOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Table, Modal, message } from 'antd';
import { validateFieldsAndScroll } from '../../../common/decorators'
import { connect } from 'react-redux'
import _ from 'lodash'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}

const FormItem = Form.Item

@connect(state => ({ ...state['marketingPushLandPage'] }))
@Form.create()
@validateFieldsAndScroll
export default class PushLandPage extends PureComponent {

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.msg) {
      message.error(nextProps.msg)
      this.changeProps({msg: ''})
    }
  }

  componentWillUnmount() {
    this.changeProps({item: {}})
  }

  renderHeader() {
    return (
      <div className="mg2">
        <span className="mg1r">名称:</span>
        <Input placeholder="Push落地页中文名称" className="width200" onChange={(e) => {
          this.changeProps({name: e.target.value})
          this.easyDispatch('list', {page: 1, pageSize: 10})
        }}
        />
      </div>
    )
  }

  renderTable() {
    const { pushLandList, count, page, pageSize, loading } = this.props
    const columns = [{
      title: '落地页编码',
      dataIndex: 'code',
      key: 'code'
    },{
      title: '落地页中文名称',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '操作',
      dataIndex: 'act',
      key: 'act',
      render: (text, record) => (
        <span>
          <a onClick={() => this.changeProps({createRecordModalVisible: true, item: record})}>编辑</a>
        </span>
      )
    }]
    return (
      <div>
        <Table
          rowKey={(record) => record.id}
          columns={columns}
          loading={loading}
          dataSource={pushLandList}
          pagination={{ 
            current: page,
            pageSize,
            total: count,
            showTotal: (total) => '共' + total + '条',
            onChange: (page) => {
              this.changeProps({page})
              this.props.dispatch({type: 'marketingActGroups/getList', payload: { page, pageSize }})
            }
          }}
        />
      </div>
    )
  }

  renderCreateRecordModal() {
    const { createRecordModalVisible, item } = this.props
    let { getFieldDecorator } = this.props.form
    let editState = _.isEmpty(item) ? '新建' : '编辑'
    return (
      <Modal
        destroyOnClose
        visible={createRecordModalVisible}
        title={`${editState}push落地页配置`}
        onCancel={() => this.changeProps({ createRecordModalVisible: false, item: {}})}
        onOk={() => this.submit()}
      >
        <Form>
          <FormItem  {...formItemLayout} label="落地页编码" hasFeedback>
            {getFieldDecorator('code', {
              rules: [{
                required: true,
                message: '请输入落地页编码',
                whitespace: true
              }],
              initialValue: item.code
            })(
              <Input type="text" />
            )}
          </FormItem>
          <FormItem  {...formItemLayout} label="落地页中文名称" hasFeedback>
            {getFieldDecorator('name', {
              rules: [{
                required: true,
                message: '请输入落地页中文名称',
                whitespace: true
              }],
              initialValue: item.name
            })(
              <Input type="text" />
            )}
          </FormItem>
        </Form>
      </Modal>
    )
  }

  changeProps(payload) {
    this.props.dispatch({ type: 'marketingPushLandPage/change', payload})
  }

  easyDispatch(func, payload) {
    this.props.dispatch({type: `marketingPushLandPage/${func}`, payload})
  }

  submit = async () => {
    const { item = {} } = this.props
    let value = await this.validateFieldsAndScroll()
    if (!value) return
    this.props.dispatch({type: 'marketingPushLandPage/create', payload: { ...item, ...value }})
  }

  render() {
    return (
      <div>
        <Bread path={[{name: 'Push落地页编辑'}]} >
          <Button icon={<PlusOutlined />} type="primary" onClick={() => this.changeProps({ createRecordModalVisible: true})}>新建落地页</Button>
        </Bread>
        <div className="mg3">
          {this.renderHeader()}
          {this.renderTable()}
        </div>
        {this.renderCreateRecordModal()}
      </div>
    );
  }
}
