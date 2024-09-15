import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import React from 'react'
import { Select, InputNumber, Radio } from 'antd'
import _ from 'lodash'
// import { immutateUpdate } from "../../../../common/sugo-utils"
// import { generate } from "shortid"
// import { Icon, Input, message } from "antd"

const FormItem = Form.Item
const Option = Select.Option
const formItemLayout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 18 }
}

export default function ExecuteParams(props) {

  const { flowPriority = 5, backoff = window.sugo.taskReRun.backoff, retries = window.sugo.taskReRun.retries, executeType = '', idealExecutorIds = '', executors = [], changeState, disabled = false } = props
  return (
    <React.Fragment>
      <div className="bg-white height-100">
        <Form>
          <FormItem label="任务优先级" className="mg1b" hasFeedback {...formItemLayout}>
            <InputNumber disabled={disabled} value={flowPriority} min={1} onChange={val => changeState({ flowPriority: val })} max={10} step={1} />
          </FormItem>
          <FormItem label="执行器" className="mg1b" {...formItemLayout}>
            <Radio.Group
              disabled={disabled}
              onChange={e => {
                changeState({ executeType: e.target.value, idealExecutorIds: '' })
              }}
              defaultValue={executeType}
            >
              <Radio value={1}>默认</Radio>
              <Radio value={2}>指定执行器</Radio>
            </Radio.Group>
            {
              executeType === 2
                ? <Select disabled={disabled} className="width200" defaultValue={idealExecutorIds} onChange={v => changeState({ idealExecutorIds: v })}>
                  {executors.map((p, i) => <Option key={`exec_${i}`} value={p.id}>{p.host}</Option>)}
                </Select>
                : null
            }
          </FormItem>
          <FormItem label="失败任务重跑次数" className="mg1b" hasFeedback {...formItemLayout}>
            <InputNumber value={retries} min={0} step={1} onChange={val => changeState({ retries: val })} />
          </FormItem>
          <FormItem label="时间相隔设置" className="mg1b" hasFeedback {...formItemLayout}>
            <InputNumber value={backoff} min={0} max={3600} step={60} onChange={val => changeState({ backoff: val })} />
            <span style={{ marginLeft: 5 }}>秒</span>
          </FormItem>
        </Form>
      </div>
    </React.Fragment>
  )
}
