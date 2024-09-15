import React from 'react'
import PropTypes from 'prop-types'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Tabs, Table, Button } from 'antd';
import ExamineUserPick from '../examine/examine-user-pick'
import DataSource from '../../task-manager-v3/modal/data-source'

const { TabPane } = Tabs

let Member = (props) => {
  const {
    visible = false,
    setVisible = () => { },
    form: { getFieldDecorator }
  } = props

  // const [visible, setVisible] = React.useState(false)

  const columns = () => {
    return [{
      title: '用户名',
      width: '15%',
      dataIndex: 'userName'
    }, {
      title: '手机号码',
      dataIndex: 'phoneCode'
    }, {
      title: '邮箱',
      dataIndex: 'email'
    }, {
      title: '操作',
      width: '20%'
    }]
  }
  return (
    <React.Fragment>
      <div className="pd2b"><Button onClick={() => setVisible(true)} >添加用户</Button></div>
      <Table
        rowKey="key"
        size="middle"
        bordered
        dataSource={[]}
        columns={columns()}
        pagination={false}
      />
      <Modal
        visible={visible}
        onCancel={() => setVisible(false)}
      >
        <Form>
          <Form.Item>
            {getFieldDecorator('project_user', {
              rules: [{
                required: true,
                message: '至少添加一个项目成员'
              }]
            })(<ExamineUserPick />)
            }
          </Form.Item>
        </Form>
      </Modal>
    </React.Fragment>
  )
}
Member.propTypes = {
  form: PropTypes.any
}
Member = Form.create()(Member)

const ConfigureModal = (props) => {
  const {
    data = {},
    visible,
    cancel,
    checkList = [],
    projectList = []
  } = props

  

  return (
    <Modal
      width={'90%'}
      title={null}
      footer={null}
      visible={visible}
      onCancel={cancel}
    >
      <Tabs defaultActiveKey="member" onChange={(key) => { }}>
        <TabPane tab="项目成员" key="member">
          <Member />
        </TabPane>
        <TabPane tab="数据源" key="dataSoure">
          <DataSource projectId={2}/>
        </TabPane>
      </Tabs>
    </Modal>
  )
}

ConfigureModal.propTypes = {
  data: PropTypes.any,
  visible: PropTypes.bool,
  cancel: PropTypes.func

}

export default ConfigureModal
