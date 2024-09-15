import React, { useState } from 'react'
import { PlusOutlined, RetweetOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Table, Button, Modal, Input, message } from 'antd';
import LabelWithInput from '../../Common/labelWithInput'
import { connect } from 'react-redux'
import { namespace } from './model'
import _ from 'lodash'

const FormItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 6 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 18 }
  }
}

function CreatePackage(props) {
  const {dispatch, form: { getFieldDecorator, validateFields, resetFields }, taskList, users } = props
  const [projectSearch, setProjectSearch] = useState('')
  const [taskSearch, setTaskSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [isCloneModal, setIsCloneModal] = useState(false)
  const [rows, setRows] = useState([])

  function genColumns() {
    return [
      {
        title: '项目名称',
        dataIndex: 'task_project_name',
        key: 'task_project_name'
      }, {
        title: '工作流名称',
        dataIndex: 'showName',
        key: 'showName'
      }, {
        title: '创建人',
        dataIndex: 'first_name',
        key: 'first_name'
      }, {
        title: '创建时间',
        dataIndex: 'createTimesString',
        key: 'createTimesString'
      }, {
        title: '修改时间',
        dataIndex: 'lastModifiedTimeString',
        key: 'lastModifiedTimeString'
      }, {
        title: '分组',
        dataIndex: 'slice',
        key: 'slice'
      }
    ]
  }

  function onAddClonePackage() {
    validateFields((err, vals) => {
      if (err) return
      if(rows.length > 50) return message.warn('工作流个数不应超过50个！')
      vals.task_ids = rows.map(o => o.id).join(',')
      dispatch({
        type: `${namespace}/createClonePackage`,
        payload: vals,
        callback: () => {
          resetFields()
          setIsCloneModal(false)
        }
      })
    })
  }

  function onReset() {
    setProjectSearch('')
    setTaskSearch('')
    setAuthorSearch('')
  }

  const keyByUsers = _.keyBy(users, 'id')
  taskList.forEach(o => o.first_name = _.get(keyByUsers, `${o.created_by}.first_name`, ''))
  let filterList = taskList.filter(o => {
    return (o.task_project_name || '').includes(projectSearch)
     && (o.showName || '').includes(taskSearch) 
     &&  (o.first_name || '').includes(authorSearch)
  })
  return (
    <React.Fragment>
      <div className="mg2b" style={{display: 'flex', justifyContent: 'space-between'}}>
        <div>
          <LabelWithInput
            label="项目名称: "
            onChange={(e) => setProjectSearch(e.target.value)}
            value={projectSearch}
          />
          <LabelWithInput
            label="工作流名称: "
            labelClassName="mg2l"
            onChange={(e) => setTaskSearch(e.target.value)}
            value={taskSearch}
          />
          <LabelWithInput
            label="创建人: "
            labelClassName="mg2l"
            onChange={(e) => setAuthorSearch(e.target.value)}
            value={authorSearch}
          />
          <Button type="primary" icon={<RetweetOutlined />} className="mg3l" onClick={() => onReset()} >重置</Button>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCloneModal(true)} disabled={!rows.length} >克隆</Button>
      </div>
      <div>
        <Table
          rowKey="id"
          bordered
          dataSource={filterList}
          columns={genColumns()}
          rowSelection={
            { onChange: (keys, rows) => setRows(rows) }
            // selectedRowKeys: seletRow.map(({ id }) => id)
          }
          pagination={{
            total: filterList.length,
            showSizeChanger: true,
            defaultPageSize: 10,
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
          }}
        />
      </div>

      {isCloneModal && <Modal
        width={600}
        title={'克隆包'}
        visible={isCloneModal}
        onCancel={() => setIsCloneModal(false)}
        onOk={() => onAddClonePackage()}
      >
        <Form>
          <Form.Item {...FormItemLayout} label="克隆包名称">
            {getFieldDecorator('name', {
              rules: [{
                required: true,
                message: '请输入相关描述'
              }, {
                pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/g,
                message: '只能是数字、字母和中文组成!'
              }, {
                max: 30,
                message: '不应超过30个字符'
              }]
            })(<Input placehold="请输入克隆包名称" style={{ width: 300 }} />)
            }
          </Form.Item>
          <Form.Item {...FormItemLayout} label="描述">
            {getFieldDecorator('desc', {
              rules: [{
                max: 150,
                message: '不应超过150个字符'
              }]
            })(<Input.TextArea placehold="请输入相关描述‘" autoSize={{ minRows: 3, maxRows: 5 }} style={{ width: 350 }} />)
            }
          </Form.Item>
        </Form>
      </Modal>}
    </React.Fragment>
  );
}

export default connect(props => ({...props[namespace], ...props['common']}))(Form.create()(CreatePackage))
