import React from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Tabs, Input, Menu, Select, Row, Col } from 'antd'

const { Item: FItem } = Form
const { TextArea } = Input
const { TabPane } = Tabs
const { Option } = Select

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

const Control = (props) => {
  const {
    visible,
    currentTask,
    create,
    cancel,
    form: { getFieldDecorator, validateFields, resetFields }
  } = props

  const failureEmails = currentTask.failureEmails
  const successEmails = currentTask.successEmails
  let type = 'all'
  if (failureEmails && !successEmails) {
    type = 'failed'
  } else if (!failureEmails && successEmails) {
    type = 'success'
  }

  const [activeMenu, changeMenu] = React.useState('params')
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    !visible && resetFields()
  }, [visible])

  const onOk = () => {
    validateFields((err, value) => {
      if (err) { return }
      const data = {
        projectId: currentTask.projectId, //251, //
        flowId: currentTask.data.title, // "flink_cs", //
        'flowOverride[useExecutorList]': '[]',
        'flowOverride[flowPriority]': '5'
      }
      if (value.type === 'all') {
        data.failureEmails = value.emails
        data.successEmails = value.emails
        data.failureEmailsOverride = true
        data.successEmailsOverride = true
      } else if (value.type === 'success') {
        data.successEmails = value.emails
        data.successEmailsOverride = true
      } else if (value.type === 'failed') {
        data.failureEmails = value.emails
        data.failureEmailsOverride = true
      }
      setLoading(true)
      create(data, () => {
        setLoading(false)
      })
    })
  }

  return (
    <Modal
      title="任务调度"
      width={700}
      confirmLoading={loading}
      visible={visible}
      onOk={onOk}
      onCancel={cancel}
    >
      <div style={{ display: 'table-cell', borderRight: '1px solid #e8e8e8' }}>
        <Menu
          style={{ width: 150, borderRight: 'none' }}
          defaultSelectedKeys={[`${activeMenu}`]}
          onClick={(e) => {
            const { key } = e
            changeMenu(key)
          }}
        >
          <Menu.Item key="alarm">
            通知告警
          </Menu.Item>
        </Menu>
      </div>
      <div style={{ display: 'table-cell', width: '100%', paddingLeft: '10px', paddingRight: '10px' }}>
        <Form {...formItemLayout}>
          <Tabs type="card">
            <TabPane tab="邮件告警配置" key="tab1">
              <FItem label="邮件通知" style={{ marginBottom: '3px' }}>
                {getFieldDecorator('emails', {
                  initialValue: failureEmails || successEmails || '',
                  rules: []
                })(<TextArea rows={5} />)}
              </FItem>
              <Row style={{ marginBottom: '24px' }}>
                <Col span={4} /><Col>执行成功、失败通知这些邮件地址。逗号隔开</Col>
              </Row>
              <FItem label="告警类型" className="mg1b">
                {getFieldDecorator('type', {
                  initialValue: type || 'all',
                  rules: []
                })(<Select style={{ width: '80px' }}>
                  <Option value="all">全部</Option>
                  <Option value="success">成功</Option>
                  <Option value="failed">失败</Option>
                </Select>)}
              </FItem>
            </TabPane>
          </Tabs >
        </Form>
      </div>
    </Modal>
  )
}

export default Form.create()(Control)
