/**
 * Created by xj on 17/10/31.
 */
import React from 'react'
import PropTypes from 'prop-types'
import { SaveOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Tooltip, Switch, Select, Popover, Button, Collapse, Checkbox } from 'antd';
import SettingReportedData from './reported_data'
import { APP_TYPE, iOS_RENDERER, SKD_TRACKING_VERSION } from './constants'
import _ from 'lodash'
import {
  getEventSimilarData,
  getSimilarNodePath,
  getSimilarNodeClassPath,
  getDefaultSimilarPath
} from './operation/similar'
import ClassAttributes from './class-attributes'
import { SDK_DEFAULT_DIMENSIONS } from '../../../common/sdk-access-dimensions'

const Panel = Collapse.Panel

const Option = Select.Option
const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 18 }
}
class EventEdit extends React.Component {

  static propTypes = {
    editEventInfo: PropTypes.object.isRequired,   //修改eventinfo
    eventLoading: PropTypes.bool.isRequired,      //按钮状态
    deleteEvent: PropTypes.func.isRequired,       //删除事件
    saveEvent: PropTypes.func.isRequired,         //保存事件
    canDelete: PropTypes.bool.isRequired,         //在事件列表中才能删除
    dimensions: PropTypes.array.isRequired        //维度
  }

  constructor(props) {
    super(props)
    this.state = {
      advanceChecked: false
    }
  }

  componentWillMount() {
    this.resetComponent()
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.editEventInfo.event_path !== nextProps.editEventInfo.event_path) {
      this.setState({ advanceCheck: nextProps.editEventInfo.advance })
      this.resetComponent()
    }
  }

  onSimilarChange = (checked) => {
    let { changeState, editEventInfo } = this.props
    editEventInfo = { ...editEventInfo }
    editEventInfo.similar = checked
    editEventInfo.similar_path = checked ? getDefaultSimilarPath(editEventInfo.event_path, editEventInfo.event_path_type) : ''
    changeState({ editEventInfo })
  }

  onSimilarNodeChange = (checked, index) => {
    const { editEventInfo, changeState } = this.props
    const { event_path, event_path_type, similar_path } = editEventInfo
    const similarPath = getSimilarNodePath(event_path, event_path_type, index, checked, similar_path)
    const newEditEventInfo = { ...editEventInfo, similar_path: similarPath }
    changeState({ editEventInfo: newEditEventInfo })
  }

  onSimilarNodeClassChange = (checked, index, className) => {
    const { editEventInfo, changeState } = this.props
    const { similar_path } = editEventInfo
    const similarPath = getSimilarNodeClassPath(similar_path, checked, index, className)
    const newEditEventInfo = { ...editEventInfo, similar_path: similarPath }
    changeState({ editEventInfo: newEditEventInfo })
  }

  renderSimilarPanel = () => {
    const { editEventInfo: { event_path_type, similar_path, event_path }, h5ControlClass } = this.props
    let similarData = getEventSimilarData(event_path_type, similar_path)

    let eventPathArr = []
    if (event_path_type === APP_TYPE.h5) {
      eventPathArr = JSON.parse(event_path).path.split('>')
      similarData = similarData.filter(p => p.display)
    }
    const activeKey = similarData.map((p, i) => {
      if (p.checked) {
        return `classEq${i}`
      }
      return null
    }).filter(_.identity)
    return similarData.length
      ? <Collapse className="mg2b mg2x" activeKey={activeKey}>
        {
          similarData.map((p, i) => {
            const header = (<div>
              <div className="elli iblock similar-path-class-text">{p.text}</div>
              <Switch
                className="fright mg1r iblock"
                checked={p.checked}
                onChange={(checked) => {
                  this.onSimilarNodeChange(checked, p.index)
                }}
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
                onChange={e => this.onSimilarNodeClassChange(e.target.checked, p.index, h5ControlClass[path])}
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
      </Collapse>
      : <div className="aligncenter">没有可选同类元素</div>
  }

  resetComponent = () => {
    this.props.form.resetFields()
  }

  //高级模式添加上报维度控件
  render_advance_panel() {
    let { editEventInfo, changeState, dimensions } = this.props
    editEventInfo = { ...editEventInfo }
    const { getFieldDecorator } = this.props.form
    let reportedPanel = (
      <SettingReportedData
        changeState={changeState}
        editEventInfo={editEventInfo}
        dimensions={dimensions}
        overlayStyle={{ padding: '0px' }}
      />
    )
    return (
      <div>
        <FormItem
          {...formItemLayout}
          className="mg2b"
          label="上报数据"
        >
          <Popover
            title={<div className="pd1"><b>上报数据设置</b></div>}
            content={reportedPanel}
            placement="top"
            trigger="click"
            arrowPointAtCenter
            visible={editEventInfo.dim_mode}
          >
            <Button
              type="success"
              className="mg1r"
              icon={<SaveOutlined />}
              onClick={() => {
                editEventInfo.dim_mode = true
                changeState({ editEventInfo })
              }}
            >
              添加/修改
            </Button>
          </Popover>
        </FormItem>
        {
          editEventInfo.event_path_type === APP_TYPE.h5
            ? (
              <FormItem
                {...formItemLayout}
                className="mg2b"
                label="注入代码"
                hasFeedback
              >
                {
                  getFieldDecorator('code', {
                    rules: [{
                      required: false
                    }],
                    initialValue: editEventInfo.code
                  })(
                    <Input.TextArea placeholder="" autosize={{ minRows: 6, maxRows: 6 }} />
                  )
                }
              </FormItem>
            )
            : null
        }
      </div>
    );
  }

  saveEvent = () => {
    let { form, saveEvent } = this.props
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        if (values.event_path) {
          let { editEventInfo } = this.props
          values = {
            ...values,
            event_path: JSON.stringify({ path: values.event_path, type: 'custom' }),
            old_event_path: _.get(editEventInfo, 'event_path'),
            custom_event_path: true
          }
        }
        saveEvent(values)
      }
    })
  }

  render() {
    let {
      editEventInfo = {},
      form,
      eventLoading,
      deleteEvent,
      canDelete,
      canDisplayEvent,
      displayEvent,
      changeState,
      editEventPath,
      dimensions,
      classAttr
    } = this.props
    const sdkDefaultDims = _.map(SDK_DEFAULT_DIMENSIONS, d => d[0])
    dimensions = dimensions.filter(p => !_.includes(sdkDefaultDims, p.name) && p.name.indexOf('sugo_') !== 0)
    const { getFieldDecorator, resetFields } = form
    let { advanceCheck } = this.state
    let disabled = !editEventInfo.component
    if (!editEventInfo.component) resetFields()
    editEventPath = editEventPath ||
      (editEventInfo.event_path_type === APP_TYPE.h5 ? _.get(JSON.parse(editEventInfo.event_path || '{}'), 'type', '') : false)

    let similar = ''
    let similarPanel = ''
    let crossPage = ''
    let event_type_select = ''
    let classAttributesPanel = null
    let customValuePanel = sugo.enableTrackEventProps
      ? (<FormItem
        {...formItemLayout}
        className="mg2b"
        label="扩展属性"
        hasFeedback
      >
        {
          getFieldDecorator('extend_value', {
            initialValue: editEventInfo.extend_value
          })(
            <Input.TextArea placeholder="" autosize={{ minRows: 6, maxRows: 6 }} />
          )
        }
      </FormItem>)
      : null

    let eventClassAttr = _.get(classAttr, editEventInfo.className, '').split(',').filter(p => p)
    if (editEventInfo.event_path_type === APP_TYPE.android) {
      const extraTag = _.get(editEventInfo, 'ExtraTag', '').split(',').filter(p => p).map(p => `ExtraTag.${p}`)
      eventClassAttr = _.concat(eventClassAttr, extraTag)
    }
    if ((window.sugo.iOS_renderer !== iOS_RENDERER.Infinitus
      || window[SKD_TRACKING_VERSION] > 0) && !editEventPath) {
      similar = (
        <FormItem
          className="mg2b"
          {...formItemLayout}
          label="同类有效"
        >
          {
            getFieldDecorator('similar', {
              valuePropName: 'checked',
              initialValue: editEventInfo.similar
            })(<Switch onChange={this.onSimilarChange} />)
          }
        </FormItem>
      )
      similarPanel = editEventInfo.similar ? this.renderSimilarPanel() : null
      classAttributesPanel = sugo.enableTrackEventControlProps
        ? (<FormItem
          className="mg2b"
          {...formItemLayout}
          label="控件属性"
        >
          <ClassAttributes editEventInfo={editEventInfo} classAttr={eventClassAttr} dimensions={dimensions} changeState={changeState} />
        </FormItem>)
        : null
    }
    if (editEventInfo.event_path_type === APP_TYPE.h5 && !disabled) {
      crossPage = !editEventPath ? (
        <FormItem
          className="mg2b"
          {...formItemLayout}
          label="全局有效"
        >
          {
            getFieldDecorator('cross_page', {
              valuePropName: 'checked',
              initialValue: editEventInfo.cross_page
            })(<Switch />)
          }
        </FormItem>
      ) : null
      event_type_select = (
        <FormItem
          className="mg2b"
          {...formItemLayout}
          label="事件类型"
          hasFeedback
        >
          {getFieldDecorator('event_type', {
            initialValue: editEventInfo.event_type
          })(
            <Select onChange={this.handleEventTypeChange}>
              <Option value="click">点击</Option>
              <Option value="focus">获取焦点</Option>
              <Option value="submit">提交</Option>
              <Option value="change">修改</Option>
              <Option value="touchstart">触碰开始</Option>
              <Option value="touchend">触碰结束</Option>
            </Select>
          )}
        </FormItem>
      )
    }

    let advance_panel = this.render_advance_panel()
    let all_tags = editEventInfo.all_tags || []
    let tag_options = all_tags.map((tag, idx) => {
      return (
        <Option key={'option-' + idx} value={tag.id}>{tag.name}</Option>
      )
    })
    return (
      <div>
        <div className="alignright">
          {
            canDelete ?
              <Button
                onClick={() =>
                  deleteEvent([editEventInfo.page, editEventInfo.event_path].join('::'))
                }
                type="danger"
                size="small"
              >
                删除
              </Button>
              : ''
          }
          <Button
            className="mg1b mg1l"
            onClick={this.saveEvent}
            loading={eventLoading}
            type="success"
            size="small"
          >
            保存
          </Button>
          <Button
            className="mg1b mg1l"
            onClick={() => displayEvent()}
            size="small"
          >
            {canDisplayEvent ? '显示' : '隐藏'}
          </Button>
        </div>
        <div style={{ width: '100%', overflow: 'auto' }} className="bordert">
          <Form layout="horizontal" onSubmit={this.handleSubmit}>
            <FormItem
              className="mg2b mg1t"
              {...formItemLayout}
              label="页面元素:"
              hasFeedback
            >
              {editEventPath ?
                getFieldDecorator('event_path', {
                  rules: [{
                    required: true, message: '请输入事件名!'
                  }],
                  initialValue: editEventInfo.component
                })(<Input.TextArea
                  placeholder="仅支持HTML5页面"
                  autosize={{ minRows: 2, maxRows: 4 }}
                  disabled={disabled}
                />)
                : <p
                  className="ant-form-text mg2r"
                  style={{ wordWrap: 'break-word', wordBreak: 'normal', width: '100%' }}
                >
                  {
                    !editEventInfo.similar || editEventInfo.event_path_type === APP_TYPE.h5
                      ? editEventInfo.component
                      : editEventInfo.similar_path
                  }
                  {
                    editEventInfo.event_path_type === APP_TYPE.h5
                      ? <Button className="fright" size="small" onClick={() => changeState({ editEventPath: true })} >编辑</Button>
                      : null
                  }
                </p>
              }
            </FormItem>
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label="事件名称"
              hasFeedback
            >
              {
                getFieldDecorator('event_name', {
                  rules: [{
                    required: true, message: '请输入事件名!'
                  }],
                  initialValue: editEventInfo.event_name
                })(<Input disabled={disabled} />)
              }
            </FormItem>
            {event_type_select}
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label="标签"
              hasFeedback
            >
              {
                getFieldDecorator('tags', {
                  initialValue: editEventInfo.tags
                })(
                  <Select
                    mode="tags"
                    className="width-100"
                    disabled={disabled}
                  >
                    {tag_options}
                  </Select>
                )
              }
            </FormItem>
            {similar}
            {similarPanel}
            {crossPage}
            {classAttributesPanel}
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label="高级选项"
            >
              {
                getFieldDecorator('advance', {
                  valuePropName: 'checked',
                  initialValue: editEventInfo.advance
                })(<Switch
                  disabled={disabled}
                  onChange={(checked) => {
                    if (!checked) {
                      editEventInfo.dim_mode = false
                    }
                    this.setState({ advanceCheck: checked })
                  }}
                />)
              }
            </FormItem>
            {advanceCheck || editEventInfo.advance ? advance_panel : null}
            {customValuePanel}
          </Form>
        </div>
      </div >
    )
  }
}

export default Form.create()(EventEdit)
