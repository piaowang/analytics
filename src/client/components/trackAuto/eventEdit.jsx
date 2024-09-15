import React, { useEffect } from 'react'
import { Form, Input, Card, Button } from 'antd'
import EventChart from './eventChart'
const { TextArea } = Input

export const TEMP_METRIC = '_tempMetric_clicks'

const EventEdit = (props) => {
  const { editEventInfo, datasourceId, saveEvent, deleteEvent, token, canDelete } = props
  const [form] = Form.useForm()
  useEffect(() => {
    form.resetFields()
    form.setFieldsValue(editEventInfo)
  }, [editEventInfo])
  return (
    <Card title="定义元素" className="height-100">
      <Form
        form={form}
        labelAlign="left"
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 18 }}
        onFinish={(values) => {
          saveEvent(values)
        }}
      >
        <Form.Item
          name="event_name"
          label="事件名称"
          rules={[{ required: true, message: '事件名称必填' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="sugo_autotrack_page_path" label="页面" >
          <Input disabled/>
        </Form.Item>
        <Form.Item name="sugo_autotrack_content" label="文本" >
          <Input disabled/>
        </Form.Item>
        <Form.Item name="sugo_autotrack_position" label="位置" >
          <Input disabled/>
        </Form.Item>
        <Form.Item name="event_memo" label="描述">
          <TextArea rows={5} />
        </Form.Item>
      </Form>
      <EventChart
        autotrackPath={editEventInfo.sugo_autotrack_path}
        autotrackPagePath={editEventInfo.sugo_autotrack_page_path}
        token={token}
        datasourceId={datasourceId}
      />
      <div className="alignright pd2t mg2t bordert pd2r">
        <Button
          className="mg2r"
          onClick={() => {
            form.validateFields().then(val => saveEvent({ ...val, sugo_autotrack_path: editEventInfo.sugo_autotrack_path }))
          }}
        >
          保存
        </Button>
        <Button
          disabled={!canDelete}
          type="dashed"
          onClick={() => {
            deleteEvent([editEventInfo.page, editEventInfo.event_path].join('::'))
          }}
        >
          删除
        </Button>
      </div>
    </Card>
  )
}

export default EventEdit
