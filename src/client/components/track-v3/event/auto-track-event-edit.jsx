/**
 * Created by xujun on 2020/7/4.
 * 修改事件属性页面
 */
import React, { useEffect } from 'react'
import PropTypes from 'prop-types'
import '@ant-design/compatible/assets/index.css'
import _ from 'lodash'
import { Input, Button, Form, Select, Tooltip } from 'antd'
import AutoTrackEventChart from './auto-event-chart'

const { TextArea } = Input
const { Option } = Select
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}

const EventEditPanel = function (props) {
  const {
    editEventInfo,
    canDelete,
    deleteEvent,
    saveEvent,
    loading,
    appMultiViews,
    dsId,
    token,
    chagePagePath,
    currentPageView,
    canDisplayEvent,
    changeEventVisible
  } = props

  const disabled = _.isEmpty(editEventInfo)

  // 定义form
  const [form] = Form.useForm()
  // 赋值默认修改的页面信息
  useEffect(() => {
    form.resetFields()
    form.setFieldsValue({...editEventInfo, page: currentPageView.path})
  }, [editEventInfo])

  // 保存事件
  const saveEventHandler = () => {
    form.validateFields()
      .then(params => {
        saveEvent({
          ...params,
          sugo_autotrack_page_path: currentPageView.path,
          sugo_autotrack_path: editEventInfo.sugo_autotrack_path
        })
      })
  }

  // 操作按钮
  const buttons = (
    <div className="event-edit-button">
      {canDelete && <Button disabled={disabled} onClick={() => deleteEvent()} type="danger" >删除</Button>}
      <Button
        disabled={disabled}
        className="mg1b mg1l"
        onClick={saveEventHandler}
        loading={loading}
        type="success"
      >
        保存
      </Button>
      <Button disabled={disabled} className="mg1b mg1l" onClick={changeEventVisible}>
        {canDisplayEvent ? '显示' : '隐藏'}
      </Button>
    </div>
  )

  // 返回页面属性设置表单
  return (<div>
    <div>
      <div className="alignright">{buttons}</div>

      <Form
        form={form}
        labelAlign="left"
        {...formItemLayout}
      >
        <Form.Item
          name="page"
          label="页面路径"
        >
          {
            appMultiViews.length <= 1
              ? <Input disabled />
              : <Select onChange={(val) => chagePagePath(appMultiViews.find(p => p.hashCode === val) || [])}>
                {
                  appMultiViews.map((p, i) => {
                    return (
                      <Option value={p.hashCode} key={`url_${i}`}>
                        <Tooltip title={p.path}>{p.path}</Tooltip>
                      </Option>
                    )
                  })
                }
              </Select>
          }
        </Form.Item>
        <Form.Item label="事件路径">
          <div
            className="ant-form-text width-100 event-path-display"
            style={{ wordWrap: 'break-word' }}
          >
            {editEventInfo.sugo_autotrack_path}
          </div>
        </Form.Item>
        <Form.Item
          name="event_name"
          label="事件名称"
          rules={[{ required: true, message: '事件名称必填' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="sugo_autotrack_content" label="文本" >
          <Input disabled />
        </Form.Item>
        <Form.Item name="sugo_autotrack_position" label="位置" >
          <Input disabled />
        </Form.Item>
        <Form.Item name="event_memo" label="描述">
          <TextArea rows={5} />
        </Form.Item>
      </Form>
      <AutoTrackEventChart
        autotrackPath={editEventInfo.sugo_autotrack_path}
        autotrackPagePath={editEventInfo.sugo_autotrack_page_path}
        token={token}
        datasourceId={dsId}
      />
    </div>
  </div>)
}

EventEditPanel.propTypes = {
  editEventInfo: PropTypes.object.isRequired,   //修改eventinfo
  canDelete: PropTypes.bool.isRequired,         //在事件列表中才能删除
  deleteEvent: PropTypes.func.isRequired,       //删除事件方法
  saveEvent: PropTypes.func.isRequired,         //保存事件方法
  loading: PropTypes.bool.isRequired,     //加载状态
  dsId: PropTypes.string.isRequired,       //数据源id
  token: PropTypes.string.isRequired,      //appid
  appMultiViews: PropTypes.array.isRequired, //埋点事件集合
  changeEventVisible: PropTypes.func.isRequired,      //隐藏事件方法,
  canDisplayEvent: PropTypes.bool.isRequired   //控件是否已隐藏,
}

export default EventEditPanel
