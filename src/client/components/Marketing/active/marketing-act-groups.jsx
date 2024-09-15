import React, { PureComponent } from 'react'
import {Link} from 'react-router'
import Bread from '../../Common/bread'
import { PlusOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  Input,
  Row,
  Col,
  Table,
  Modal,
  message,
  Divider,
  DatePicker,
  Popconfirm,
} from 'antd';
import { validateFieldsAndScroll } from 'client/common/decorators'
import { connect } from 'react-redux'
import Loading from 'client/components/Common/loading'
import Fetch from '~/src/client/common/fetch-final'
import _ from 'lodash'
import moment from 'moment'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}

const FormItem = Form.Item

@connect(state => ({ ...state['marketingActGroups'] }))
@Form.create()
@validateFieldsAndScroll
export default class MarkingActGroups extends PureComponent {

  submit = async () => {
    const { page, pageSize, selectedGroup } = this.props
    let value = await this.validateFieldsAndScroll()
    if (!value) return
    let res
    if(selectedGroup) {
      //编辑
      Object.assign(value, {id: selectedGroup.id})
      res = await Fetch.post('/app/marketing-act-groups/update', value)
    } else {
      //新增
      res = await Fetch.post('/app/marketing-act-groups/create',value)
    }
    if (!_.get(res,'success')) return message.error(res.message)
    this.changeProps({createActGroupsModalVisible: false, selectedGroup: ''})
    this.props.dispatch({type: 'marketingActGroups/getList', payload: { page, pageSize }})
    return message.success('创建成功')
  }

  delete = async (id) => {
    const res = await Fetch.get(`/app/marketing-act-groups/delete/${id}`)
    if (!_.get(res,'success')) return message.error(res.message)
    message.success('删除成功')
    this.props.dispatch({type: 'marketingActGroups/getList', payload: { page: 1, pageSize: 10 }})
  }

  changeProps = (payload) => {
    this.props.dispatch({
      type: 'marketingActGroups/change',
      payload
    })
  }

  renderInput(title, span, onChange) {
    return (
      <Col span={span}>
        <span className="width60 mg1r finline">{title}:</span>
        <Input className="width250" placeholder={title} onChange={onChange} />
      </Col>
    )
  }

  renderFilterBox() {
    const { filter, loading } = this.props
    return (
      <div className="mg2">
        <div className="width-80">
          <Row>
            {this.renderInput('分组名称', 10, _.throttle((e) => this.props.dispatch({type: 'marketingActGroups/change', payload: { filter: { ...filter, name: e.target.value } }}), 200))}
            <span className="width80 finline" style={{padding: '6px 0 0 15px'}}>创建时间:</span>
            <DatePicker.RangePicker
              className="width250"
              defaultValue={[moment().add(-7, 'days'), moment()]}
              format="YYYY-MM-DD"
              onChange={timeRange => {
                this.props.dispatch({
                  type: 'marketingActGroups/change',
                  payload: {
                    filter: {
                      ...filter,
                      created_range: timeRange.map(m => m.format('YYYY-MM-DD'))
                    }
                  }
                })
              }}
            />
            <Button loading={loading} className="mg3l" type="primary" onClick={() => this.props.dispatch({type: 'marketingActGroups/getList', payload: { page: 1, pageSize: 10 }})}>搜索</Button>
          </Row>
        </div>
      </div>
    )
  }

  renderTable() {
    const { activeGroupsList, count, page, pageSize, loading } = this.props
    const columns = [{
      title: '分组名称',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '说明',
      dataIndex: 'remark',
      key: 'remark'
    },{
      title: '活动数',
      dataIndex: 'actives_count',
      key: 'actives_count'
    },{
      title: '已发送活动数',
      dataIndex: 'sentActNum',
      key: 'sentActNum'
    },{
      title: '待发送活动数',
      dataIndex: 'waitForSendActNum',
      key: 'waitForSendActNum'
    },{
      title: '创建人',
      dataIndex: 'created_by',
      key: 'created_by'
    },{
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (record) => moment(record).format('YYYY-MM-DD HH:mm:ss')
    },{
      title: '操作',
      dataIndex: 'act',
      key: 'act',
      render: (text,record) => (
        <span>
          <Link to={`/console/marketing-acts/new?group_id=${record.id}`}>添加活动</Link>
          <Divider type="vertical" />
          <Link to={`/console/marketing-acts?${record.id}`}>
          查看活动
          </Link>
          <Divider type="vertical" />
          <a onClick={() => this.changeProps({
            selectedGroup: record,
            createActGroupsModalVisible: true
          })}
          >编辑</a>
          <Divider type="vertical" />
          <Popconfirm title="确定要删除吗" onConfirm={() => this.delete(record.id)}>
            <a>删除</a>
          </Popconfirm>
        </span>
      )
    }]
    return (
      <Loading loading={loading}>
        <Table 
          rowKey={record => record.id}
          columns={columns}
          dataSource={activeGroupsList}
          loading={loading}
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
      </Loading>
    )
  }

  rendercreateActGroupsModal() {
    const { createActGroupsModalVisible, selectedGroup = {} } = this.props
    let { getFieldDecorator } = this.props.form
    const footer = (
      <div>
        <Button type="primary" onClick={() => this.changeProps({createActGroupsModalVisible: false, selectedGroup: ''})}>取消</Button>
        <Button type="success" onClick={() => this.submit()}>保存</Button>
      </div>
    )
    return (
      <Modal 
        destroyOnClose
        visible={createActGroupsModalVisible}
        title={selectedGroup ? '编辑活动分组' : '新建活动分组'}
        footer={footer}
        onCancel={() => this.changeProps({createActGroupsModalVisible: false})}
      >
        <Form>
          <FormItem  {...formItemLayout} className="iflex" label="活动分组名称" hasFeedback>
            {getFieldDecorator('name', {
              rules: [{
                required: true,
                message: '请输入活动分组名称',
                whitespace: true
              }, {
                min: 1,
                max: 50,
                type: 'string',
                message: '1~50个字符'
              }],
              initialValue: selectedGroup.name
            })(
              <Input type="text" />
            )}
          </FormItem>
          <FormItem  {...formItemLayout} className="iflex" label="说明" hasFeedback>
            {getFieldDecorator('remark', {
              initialValue: selectedGroup.remark
            })(
              <Input.TextArea rows={6} />
            )}
          </FormItem>
        </Form>
      </Modal>
    )
  }

  render() {
    return (
      <div>
        <Bread path={[{name: '活动营销中心'},{ name: '活动分组' }]}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => this.changeProps({createActGroupsModalVisible: true})}>新建活动分组</Button>
        </Bread>
        <div className="mg3">
          {this.renderFilterBox()}
          {this.renderTable()}
        </div>
        {this.rendercreateActGroupsModal()}
      </div>
    );
  }
}
