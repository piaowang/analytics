/**
 * Created by xujun on 2020/7/4.
 * 修改事件属性页面
 */
import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import '@ant-design/compatible/assets/index.css'
import _ from 'lodash'
import { Input, Popover, Button, Select, Switch, Form, Collapse, Checkbox } from 'antd'
import { APP_TYPE, EventType } from '../constants'
import SettingReportedData from './reported_data'
import { SaveOutlined } from '@ant-design/icons'
import ClassAttributes from './class-attributes'
import { immutateUpdates } from '~/src/common/sugo-utils'
import { getDefaultSimilarPath, getEventSimilarData, getSimilarNodePath, getSimilarNodeClassPath } from '../operation/similar'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}
const { Option } = Select
const Panel = Collapse.Panel

const EventEditPanel = function (props) {
  const {
    eventClassAttr,
    dimensions,
    editEventInfo,
    canDelete,
    deleteEvent,
    saveEvent,
    loading,
    changeEventVisible,
    canDisplayEvent,
    isReportData,
    onChange,
    currentEventId,
    h5ControlClass
  } = props
  const [state, setState] = useState({
    advanceCheck: false, // 高级上报模式
    dimBindingBack: []
  })
  // 定义form
  const [form] = Form.useForm()
  // 赋值默认修改的页面信息
  useEffect(() => {
    form.resetFields()
    setState({
      advanceCheck: editEventInfo.advance,
      dimBindingBack: _.get(editEventInfo, 'dim_binding', [])
    })
    form.setFieldsValue({
      event_name: editEventInfo.sugo_autotrack_content,
      event_type: _.first(EventType).value,
      extend_value: '',
      cross_page: false,
      advance: false,
      similar: false,
      ...editEventInfo
    })
  }, [currentEventId])
  // 保存事件
  const saveEventHandler = () => {
    form.validateFields()
      .then(values => {
        const params = {
          ...editEventInfo,
          ...values,
          // h5需要单独处理同类路径
          similar_path: values.similar ? editEventInfo.similar_path : '',
          dim_binding: values.advance ? editEventInfo.dim_binding : [],
          event_path: '',
          page: ''
        }
        saveEvent(params)
      })
  }
  /**
   * 设置event 高级上报圈选数据
   * @param {*} dimBinding 圈选的维度和控件映射关系集合
   */
  const setEventDimBinding = (dimBinding) => {
    const newEventInfo = {
      ...editEventInfo,
      dim_binding: dimBinding
    }
    onChange({ currentEventInfo: newEventInfo })
  }

  const closeSetEventBinding = () => {
    onChange({ isReportData: false })
  }

  const cancelSetEventBinding = () => {
    const newEventInfo = {
      ...editEventInfo,
      dim_binding: state.dimBindingBack
    }
    onChange({ currentEventInfo: newEventInfo, isReportData: false })
  }

  const onSimilarChange = (checked) => {
    let similarPath = ''
    if (editEventInfo.event_path_type === APP_TYPE.h5) {
      similarPath = checked ? getDefaultSimilarPath(editEventInfo.sugo_autotrack_path, editEventInfo.event_path_type) : ''
      similarPath = JSON.stringify({ path: similarPath })
    } else {
      similarPath = editEventInfo.sugo_autotrack_path
    }
    const newEventInfo = immutateUpdates(
      editEventInfo,
      'similar',
      () => checked,
      'similar_path',
      () => similarPath
    )
    onChange({ currentEventInfo: newEventInfo })
  }

  const onSimilarNodeChange = (checked, index) => {
    const { sugo_autotrack_path, similar_path, event_path_type } = editEventInfo
    const similarPath = getSimilarNodePath(sugo_autotrack_path, index, checked, similar_path, event_path_type)
    const newEditEventInfo = { ...editEventInfo, similar_path: similarPath }
    onChange({ currentEventInfo: newEditEventInfo })
  }

  const onSimilarNodeClassChange = (checked, index, className) => {
    const { similar_path } = editEventInfo
    const similarPath = getSimilarNodeClassPath(similar_path, checked, index, className)
    const newEditEventInfo = { ...editEventInfo, similar_path: similarPath }
    onChange({ currentEventInfo: newEditEventInfo })
  }
  /**
   * 设置event 控件属性上报
   * @param {*} dimBinding 圈选的维度和控件映射关系集合
   */
  const setEventClassAttr = (dimBinding) => {
    onChange({
      currentEventInfo: {
        ...editEventInfo,
        class_attr: dimBinding
      }
    })
  }

  const renderSimilarPanel = () => {
    const { event_path_type, similar_path, sugo_autotrack_path } = editEventInfo
    let { similarData, eventPathArr } = getEventSimilarData(similar_path, sugo_autotrack_path, event_path_type)
    similarData = similarData.filter(p => p.display)
    const activeKey = similarData.map((p, i) => {
      if (p.checked) {
        return `classEq${i}`
      }
      return null
    }).filter(_.identity)
    if (!similarData.length) {
      return <div className="aligncenter">没有可选同类元素</div>
    }
    return (<Collapse className="mg2b mg2x" activeKey={activeKey}>
      {
        similarData.map((p, i) => {
          const header = (<div>
            <div className="elli iblock similar-path-class-text">{p.text}</div>
            <Switch
              className="fright mg1r iblock"
              checked={p.checked}
              onChange={(checked) => onSimilarNodeChange(checked, p.index)}
            />
          </div>)
          if (event_path_type !== APP_TYPE.h5) {
            return <Panel header={header} className="hide-collapse-content" showArrow={false} key={`classEq${i}`} />
          }
          let path = _.slice(eventPathArr, 0, p.index + 1).join('>')
          path = _.trim(path)
          let content = null
          if (h5ControlClass[path]) {
            content = (<Checkbox
              disabled={!p.checked}
              onChange={e => onSimilarNodeClassChange(e.target.checked, p.index, h5ControlClass[path])}
              checked={p.classChecked}
            >
              {h5ControlClass[path]}
            </Checkbox>)
          }
          if (content) {
            return <Panel header={header} key={`classEq${i}`}>{content}</Panel>
          }
          return <Panel header={header} className="hide-collapse-content" showArrow={false} key={`classEq${i}`} />
        })
      }
    </Collapse>)
  }
  // 操作按钮
  const buttons = (
    <div className="event-edit-button">
      {canDelete && <Button disabled={!currentEventId} onClick={() => deleteEvent()} type="danger" >删除</Button>}
      <Button
        disabled={!currentEventId}
        className="mg1b mg1l"
        onClick={saveEventHandler}
        loading={loading}
        type="success"
      >
        保存
      </Button>
      <Button disabled={!currentEventId} className="mg1b mg1l" onClick={changeEventVisible}>
        {canDisplayEvent ? '显示' : '隐藏'}
      </Button>
    </div>
  )
  const content = (
    <SettingReportedData
      setEventDimBinding={setEventDimBinding}
      closeSetEventBinding={closeSetEventBinding}
      editEventDimBinding={_.get(editEventInfo, 'dim_binding', [])}
      dimensions={dimensions}
      isH5Event={editEventInfo.event_path_type === APP_TYPE.h5}
      cancelSetEventBinding={cancelSetEventBinding}
    />
  )

  // 返回页面属性设置表单
  return (<div>
    <div>
      <div className="alignright">{buttons}</div>
      <Form form={form} layout="horizontal" {...formItemLayout}>
        <FormItem label="事件路径">
          <div
            className="ant-form-text width-100 event-path-display"
            style={{ wordWrap: 'break-word' }}
          >
            {editEventInfo.sugo_autotrack_path}
          </div>
        </FormItem>
        <FormItem label="事件名称" name="event_name" rules={[{ required: true, message: '请输入事件名!' }]}>
          <Input disabled={!currentEventId} />
        </FormItem>
        <FormItem name="event_type" label="事件类型" hasFeedback>
          <Select disabled={!currentEventId}>
            {EventType.map(p => <Option key={`item_${p.value}`} value={p.value}>{p.text}</Option>)}
          </Select>
        </FormItem>

        <FormItem
          className="mg2b"
          name="similar"
          label="同类有效"
          valuePropName="checked"
        >
          <Switch onChange={onSimilarChange} disabled={!currentEventId} />
        </FormItem>
        {editEventInfo.similar && renderSimilarPanel()}
        {
          editEventInfo.event_path_type === APP_TYPE.h5 && <FormItem name="cross_page" label="全局有效" valuePropName="checked" >
            <Switch disabled={!currentEventId} />
          </FormItem>
        }
        <FormItem label="高级选项" name="advance" valuePropName="checked">
          <Switch
            disabled={!currentEventId}
            onChange={(checked) => setState({ ...state, advanceCheck: checked })}
          />
        </FormItem>
        {state.advanceCheck && (
          <FormItem label="上报数据">
            <Popover
              title={<div className="pd1"><b>上报数据设置</b></div>}
              content={content}
              placement="top"
              trigger="click"
              arrowPointAtCenter
              visible={isReportData}
            >
              <Button
                type="success"
                className="mg1r"
                icon={<SaveOutlined />}
                onClick={() => onChange({ isReportData: true })}
              >
                添加/修改
              </Button>
            </Popover>
          </FormItem>
        )}
        {
          state.advanceCheck
          && editEventInfo.event_path_type === APP_TYPE.h5
          && (
            <FormItem name="code" label="注入代码">
              <Input.TextArea disabled={!currentEventId} autoSize={{ minRows: 4, maxRows: 8 }} />
            </FormItem>
          )
        }
        {
          window?.sugo?.enableTrackEventControlProps && (
            <FormItem className="mg2b" {...formItemLayout} label="控件属性">
              <ClassAttributes
                editEventClassAttr={_.get(editEventInfo, 'class_attr', [])}
                setEventClassAttr={setEventClassAttr}
                classAttr={eventClassAttr}
                dimensions={dimensions}
              />
            </FormItem>
          )
        }
        {
          window?.sugo?.enableTrackEventProps && (
            <FormItem label="扩展属性" hasFeedback name="extend_value">
              <Input.TextArea disabled={!currentEventId} autoSize={{ minRows: 4, maxRows: 8 }} />
            </FormItem>
          )
        }
      </Form>
    </div>
  </div>)
}

EventEditPanel.propTypes = {
  isReportData: PropTypes.bool.isRequired, // 是否开启高级圈选模式
  appType: PropTypes.string.isRequired, // app类型
  onChange: PropTypes.func.isRequired, // 修改父级状态
  eventClassAttr: PropTypes.array,              //控件属性的map对象
  dimensions: PropTypes.array.isRequired,       //维度信息集合
  editEventInfo: PropTypes.object.isRequired,   //修改eventinfo
  canDelete: PropTypes.bool.isRequired,         //在事件列表中才能删除
  deleteEvent: PropTypes.func.isRequired,       //删除事件方法
  saveEvent: PropTypes.func.isRequired,         //保存事件方法
  loading: PropTypes.bool.isRequired,      //加载状态
  changeEventVisible: PropTypes.func.isRequired,      //隐藏事件方法,
  canDisplayEvent: PropTypes.bool.isRequired   //控件是否已隐藏,
}

export default EventEditPanel
