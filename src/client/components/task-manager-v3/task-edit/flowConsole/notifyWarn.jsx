import React from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Select } from 'antd'

// import { immutateUpdate } from "../../../../common/sugo-utils"
// import { generate } from "shortid"
// import { Icon, Input, message } from "antd"

const { TextArea } = Input
const FormItem = Form.Item
const Option = Select.Option
const formItemLayout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 18 }
}

export default function NotifyWarn(props) {

  const { successEmails, emailAlertType, changeState, disabled } = props
  
  return (
    <React.Fragment>
      <div className="bg-white height-100">
        <Form>
          <FormItem label="邮件通知"   {...formItemLayout}>
            <TextArea disabled={disabled} rows={5} value={successEmails} onChange={e => changeState({ successEmails: e.target.value })} />
            <div>执行成功、失败通知这些邮件地址。逗号隔开</div>
          </FormItem>
          <FormItem label="告警类型" className="mg1b" {...formItemLayout}>
            <Select disabled={disabled} value={emailAlertType} onChange={val => changeState({ emailAlertType: val })}>
              <Option value="on_all">全部</Option>
              <Option value="on_success">成功</Option>
              <Option value="on_failed">失败</Option>
            </Select>
          </FormItem>
        </Form>
      </div>
    </React.Fragment>
  )
}
