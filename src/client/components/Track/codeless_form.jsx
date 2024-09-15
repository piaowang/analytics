/**
 * Created by fengxj on 11/3/16.
 */
import React from 'react'
import { SaveOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Tooltip, Switch, Tag, Select, Tabs, Popover, Button } from 'antd';
import SettingReportedData from './reported_data'
const TabPane = Tabs.TabPane
const Option = Select.Option
const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 18 }
}

class CodelessForm extends React.Component {
  constructor(props) {
    super(props)
  }

  componentWillMount() {
    this.resetComponent()
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.eventData.event_path !== nextProps.eventData.event_path) {
      this.resetComponent()
    }
  }

  onTextChange = (e, field) => {
    let { onFormChange, eventData } = this.props
    eventData[field] = e.target.value
    onFormChange(eventData)
  }

  onAdvanceChange = (checked) => {
    let { onFormChange, eventData } = this.props
    eventData.advance = checked
    if (eventData.advance === false) {
      eventData.dim_mode = false
    }
    onFormChange(eventData)
  }
  onDimModeChange = (checked) => {
    let { onFormChange, eventData } = this.props
    eventData.dim_mode = checked
    onFormChange(eventData)
  }

  onSimilarChange = (checked) => {
    let { onFormChange, eventData } = this.props
    eventData.similar = checked
    onFormChange(eventData)
  }

  onCrossPageChange = (checked) => {
    let { onFormChange, eventData } = this.props
    eventData.cross_page = checked
    onFormChange(eventData)
  }

  handleEventTypeChange = (value) => {
    let { onFormChange, eventData } = this.props
    eventData.type = value
    onFormChange(eventData)
  }
  handleTagsChange = (value) => {
    let { onFormChange, eventData } = this.props
    eventData.tags = value
    onFormChange(eventData)
  }
  resetComponent = () => {
    this.props.form.resetFields()
    this.setState({ checked: false })
  }

  deleteDimBinding = (dim) => {
    console.log(dim)
    let { onFormChange, eventData } = this.props
    delete eventData.dim_binding[dim]
    onFormChange(eventData)
  }


  render_advance_panel() {
    let { eventData, onFormChange, dimensions } = this.props
    const { getFieldDecorator } = this.props.form
    let reportedPanel = (
      <SettingReportedData
        onFormChange={onFormChange}
        eventData={eventData}
        dimensions={dimensions}
      />
    )
    return (
      <div>
        <FormItem
          {...formItemLayout}
          className="mg2b"
          label={
            <Tooltip title="上报数据">上报数据</Tooltip>
          }
          hasFeedback
        >
          <Popover
            content={reportedPanel}
            placement="topRight"
            trigger="click"
            visible={eventData.dim_mode}
          >
            <Button
              type="success"
              className="mg1r"
              icon={<SaveOutlined />}
              onClick={() => {
                eventData.dim_mode = true
                onFormChange(eventData)
              }}
            >添加/修改</Button>
          </Popover>
        </FormItem>
        {
          eventData.event_path_type === 'h5' ? (<FormItem
            {...formItemLayout}
            className="mg2b"
            label={
              <Tooltip title="注入代码">注入代码</Tooltip>
            }
            hasFeedback
                                                >
            {getFieldDecorator('code', {
              rules: [{
                required: false
              }],
              initialValue: eventData.code
            })(
              <Input.TextArea placeholder=""
                autosize={{ minRows: 6, maxRows: 6 }}
              />
            )}
          </FormItem>)
            : null
        }
      </div>
    );

  }

  render() {
    const { getFieldDecorator } = this.props.form
    let { eventData, pageData } = this.props
    let disabled = !eventData.component
    let code_display = 'none'

    if (eventData.advance === true) {
      code_display = 'block'
    }

    let similar = ''
    let crossPage = ''
    let event_type_select = ''
    if (eventData.event_path_type === 'h5') {
      similar = (<FormItem
        className="mg2b"
        {...formItemLayout}
        label={
          <Tooltip title="同类有效">同类有效</Tooltip>
        }
                 >
        {
          getFieldDecorator('similar', {
          })(<Switch checked={eventData.similar} onChange={this.onSimilarChange} />)
        }
      </FormItem>)
      crossPage = (<FormItem
        className="mg2b"
        {...formItemLayout}
        label={
          <Tooltip title="全局有效">全局有效</Tooltip>
        }
                   >
        {
          getFieldDecorator('cross_page', {
          })(<Switch checked={eventData.cross_page} onChange={this.onCrossPageChange} />)
        }
      </FormItem>)
      event_type_select = (<FormItem
        className="mg2b"
        {...formItemLayout}
        label={<Tooltip title="事件类型">事件类型</Tooltip>}
        hasFeedback
                           >
        <Select value={eventData.type} onChange={this.handleEventTypeChange}>
          <Option value="click">点击</Option>
          <Option value="focus">获取焦点</Option>
          <Option value="submit">提交</Option>
          <Option value="change">修改</Option>
        </Select>
      </FormItem>)
    }

    let advance_panel = this.render_advance_panel()
    let all_tags = eventData.all_tags || []
    let tag_options = all_tags.map((tag, idx) => {
      return (
        <Option key={'option-' + idx} value={tag.id}>{tag.name}</Option>
      )
    })
    return (
      <Form layout="horizontal" onSubmit={this.handleSubmit}>
        <Tabs defaultActiveKey="2">
          <TabPane key="1" tab="页面载入" disabled={!pageData.isH5}>
            <p className="mg2b">设置页面载入时需要额外上报的内容。</p>
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label={<Tooltip title="注入h5代码">注入h5代码</Tooltip>}
              hasFeedback
            >
              {getFieldDecorator('h5_code', {
                initialValue: pageData.code
              })(<Input.TextArea
                placeholder="仅支持HTML5页面"
                autosize={{ minRows: 6, maxRows: 6 }}
                 />)}
            </FormItem>
          </TabPane>
          <TabPane key="2" tab="页面事件">
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label="页面元素:"
              hasFeedback
            >
              <p className="ant-form-text"
                style={{ wordWrap: 'break-word', wordBreak: 'normal', width: '100%' }}
              >{eventData.component}</p>
            </FormItem>
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label={
                <Tooltip title="事件名">事件名称</Tooltip>
              }
              hasFeedback
            >
              {getFieldDecorator('name', {
                rules: [{
                  required: true, message: '请输入事件名!'
                }],
                initialValue: eventData.name
              })(<Input disabled={disabled} />)}
            </FormItem>
            {event_type_select}
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label={<Tooltip title="标签">标签</Tooltip>}
              hasFeedback
            >
              <Select
                mode="tags"
                value={eventData.tags}
                className="width-100"
                onChange={this.handleTagsChange}
                disabled={disabled}
              >
                {tag_options}
              </Select>
            </FormItem>
            {similar}
            {crossPage}
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label={
                <Tooltip title="高级选项">高级选项</Tooltip>
              }
              hasFeedback
            >
              <Switch checked={eventData.advance} onChange={this.onAdvanceChange} disabled={disabled} />
            </FormItem>
            <div style={{ display: code_display }}>
              {advance_panel}
            </div>
          </TabPane>
        </Tabs>
      </Form>
    )
  }
}

export default Form.create()(CodelessForm)
