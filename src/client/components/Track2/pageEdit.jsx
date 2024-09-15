import React from 'react'
import PropTypes from 'prop-types'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Tooltip, Radio, Tabs, Card, Button, Select, Switch } from 'antd';
import { Regulation } from 'css-selector-parser'
import _ from 'lodash'
const FormItem = Form.Item
const TabPane = Tabs.TabPane
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}
const RadioGroup = Radio.Group

class PageEditForm extends React.Component {
  static propTypes = {
    editPageInfo: PropTypes.object.isRequired,  //修改pageinfo
    categories: PropTypes.array,                //页面分类集合
    deletePageInfo: PropTypes.func.isRequired,  //删除事件
    pageLoading: PropTypes.bool.isRequired,     //按钮状态
    savePageInfo: PropTypes.func.isRequired,    //保存事件
    canDelete: PropTypes.bool.isRequired,       //在页面列表中才能删除
    panelHeight: PropTypes.string.isRequired,   //控件高度
    appMultiViews: PropTypes.array.isRequired,
    webViewHashCode: PropTypes.string.isRequired
  }

  constructor(props) {
    super(props)
    this.state = {
      pageNameType: 'self'
    }
  }

  componentWillReceiveProps(nextProps) {
    let { editPageInfo } = this.props
    const { setFieldsValue } = this.props.form
    if (editPageInfo.page !== nextProps.editPageInfo.page) {
      this.setState({ pageNameType: 'self' })
      setFieldsValue({ page_name: nextProps.editPageInfo.page_name, is_submit_point: nextProps.editPageInfo.is_submit_point })
    }
  }

  savePageInfo = (category) => {
    let { form, savePageInfo } = this.props
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        values.category = category
        savePageInfo(values)
      }
    })
  }

  render() {
    const { getFieldDecorator, setFieldsValue } = this.props.form
    let { editPageInfo, categories = [], deletePageInfo, pageLoading, canDelete, panelHeight, webViewHashCode, editPathString, changeState, chagePagePath, appMultiViews } = this.props
    let regulation = Regulation.exec(editPageInfo.page, categories.map(p => p.regulation))
    let category = _.get(categories.find(p => p.regulation === regulation), 'name', '')
    let { pageNameType } = this.state
    let buttons = (
      <div className="mg1t">
        {
          canDelete ?
            <Button
              onClick={deletePageInfo}
              loading={pageLoading}
              type="danger"
              size="small"
            >
              删除
            </Button>
            : null
        }
        <Button
          className="mg1l"
          onClick={() => this.savePageInfo(category)}
          loading={pageLoading}
          type="success"
          size="small"
        >
          保存
        </Button>
      </div>
    )

    let pagePathCol = ''
    if (appMultiViews.length <= 0) {
      pagePathCol = (<p
        className="ant-form-text"
        style={{ wordWrap: 'break-word', wordBreak: 'normal', width: '100%' }}
      >
        {editPageInfo.page}
      </p>)
    } else {
      pagePathCol = (<Select onChange={chagePagePath} value={webViewHashCode}>
        {
          appMultiViews.map(p => {
            return (<Select.Option key={`page_${p.hashCode}`} value={p.hashCode.toString()} >
              <Tooltip title={p.currentUrl}>{p.currentUrl}</Tooltip>
            </Select.Option>)
          })
        }
      </Select>)
    }
    let editPathControl = null
    if (editPageInfo.isH5) {
      editPathControl = (<FormItem
        {...formItemLayout}
        label="编辑路径:"
        hasFeedback
        className="mg2b"
      >
        <Input onChange={e => editPathString(e.target.value)} value={editPageInfo.page} />
      </FormItem>)
    }
    return (
      <Card
        title="页面设置"
        bodyStyle={{ padding: 5 }}
        className="page-edit"
        extra={buttons}
      >
        <div style={{ width: '100%', height: panelHeight }}>
          <Form layout="horizontal">
            {/* <Tabs defaultActiveKey="1">
              <TabPane
                key="1"
                tab="页面信息"
              > */}
            <FormItem
              {...formItemLayout}
              label="页面路径:"
              hasFeedback
              className="mg2b"
            >
              {pagePathCol}
            </FormItem>
            {editPathControl}
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label={
                <Tooltip title="页面名称">页面名称</Tooltip>
              }
            >
              <div>
                <RadioGroup
                  value={editPageInfo.isH5 ? pageNameType : 'self'}
                  onChange={(e) => {
                    if (e.target.value === 'auto') {
                      setFieldsValue({ page_name: editPageInfo.defaultPageName })
                      this.setState({ pageNameType: 'auto' })
                    } else {
                      setFieldsValue({ page_name: editPageInfo.page_name })
                      this.setState({ pageNameType: 'self' })
                    }
                  }}
                >
                  <Radio value="auto" disabled={!editPageInfo.isH5}>自动设置</Radio>
                  <Radio value="self">手动设置</Radio>
                </RadioGroup>
              </div>
              {
                getFieldDecorator('page_name', {
                  rules: [{
                    required: true, message: '请输入页面名称!'
                  }],
                  initialValue: editPageInfo.page_name || ''
                })(
                  <Input readOnly={pageNameType === 'auto'} />
                )
              }
            </FormItem>
            {/* <FormItem
                  className="mg2b"
                  {...formItemLayout}
                  label={
                    <Tooltip title="页面分类">页面分类</Tooltip>
                  }
                >
                  {
                    category ? category : '未匹配到分类'
                  }
                </FormItem> */}
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label={
                <Tooltip title="上报当前页面点击位置">上报点击位置</Tooltip>
              }
            >
              {
                getFieldDecorator('is_submit_point', {
                  valuePropName: 'checked',
                  initialValue: editPageInfo.is_submit_point
                })(
                  <Switch checkedChildren="允许" unCheckedChildren="禁止" />
                )
              }
            </FormItem>
            {
              editPageInfo.isH5
                ? <FormItem
                  className="mg2b"
                  {...formItemLayout}
                  label={<Tooltip title="注入h5代码">注入h5代码</Tooltip>}
                  hasFeedback
                >
                  {
                    getFieldDecorator('code', {
                      initialValue: editPageInfo.code || ''
                    })(
                      <Input.TextArea
                        placeholder="仅支持HTML5页面"
                        autosize={{ minRows: 5, maxRows: 5 }}
                      />
                    )
                  }
                </FormItem>
                : null
            }
            {/* </TabPane> */}
            {/* <TabPane
                key="2"
                tab="页面注入"
                disabled={!editPageInfo.isH5}
              >
                <p className="mg2b">
                  设置页面载入时需要额外上报的内容。
                </p>
                <FormItem
                  className="mg2b"
                  {...formItemLayout}
                  label={<Tooltip title="注入h5代码">注入h5代码</Tooltip>}
                  hasFeedback
                >
                  {
                    getFieldDecorator('code', {
                      initialValue: editPageInfo.code || ''
                    })(
                      <Input.TextArea
                        placeholder="仅支持HTML5页面"
                        autosize={{ minRows: 5, maxRows: 5 }}
                      />
                    )
                  }
                </FormItem>
              </TabPane> */}
            {/* </Tabs> */}
          </Form>
        </div>
      </Card>
    )
  }
}

export default Form.create()(PageEditForm)
