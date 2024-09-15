import React from 'react'
import PropTypes from 'prop-types'
import { CloseOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Row, Col, Popover, Tabs, Input, Select, message } from 'antd';
import {Button2 as Button} from '../Common/sugo-icon'
import { ContextNameEnum, withContextConsumer } from '../../common/context-helper'
import { connect } from 'react-redux'

const {TabPane} = Tabs
const {Item} = Form
const {Option} = Select

const formItemLayout = {
  labelCol: {
    span: 4
  },
  wrapperCol: {
    span: 20
  }
}

let mapStateToProps = state => state.common
// let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@Form.create()
@connect(mapStateToProps)
@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class CommonSaveModal extends React.Component {
  static propTypes = {
    modelType: PropTypes.string,
    canSaveAsOnly: PropTypes.bool,
    canSelectDataSourceId: PropTypes.bool,
    currModelName: PropTypes.string,
    visible: PropTypes.bool,
    onVisibleChange: PropTypes.func,
    onUpdate: PropTypes.func,
    onSaveAs: PropTypes.func,
    className: PropTypes.string,
    style: PropTypes.object,
    // 下面两个属性一般是根据权限来设置
    allowCreate: PropTypes.bool,
    allowUpdate: PropTypes.bool
  }

  static defaultProps = {
    modelType: '报告',
    allowCreate: true,
    allowUpdate: true
  }

  state = {
    tempName: undefined,
    isSaving: false
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.currModelName !== nextProps.currModelName) {
      this.setState({tempName: undefined})
    }
  }
  
  renderDataSourceIdOption = () => {
    const { datasourceList } = this.props
    return datasourceList.map( (i,idx) => (
      <Select.Option value={i.id} key={idx}>{i.title}</Select.Option>
    ))
  }

  submitClick = (e) => {
    const {
      onSaveAs, 
      onVisibleChange,
      form: {validateFields, getFieldsValue}
    } = this.props
    validateFields((errors) => {
      if (errors) return 
      const value = getFieldsValue()

      this.setState({isSaving: true})
      onSaveAs(value)
      this.setState({isSaving: false})
      onVisibleChange(false)
    })
    e.preventDefault()
  }

  updataClick = e => {
    const {
      onUpdate, 
      onVisibleChange,
      form: {validateFields, getFieldsValue}
    } = this.props
    validateFields((errors) => {
      if (errors) return 
      const value = getFieldsValue()

      this.setState({isSaving: true})
      onUpdate(value)
      this.setState({isSaving: false})
      onVisibleChange(false)
    })

    e.preventDefault()
  }


  render() {
    let {
      tags, modelType, canSaveAsOnly, canSelectDataSourceId, currModelName, currModelTag=[], currModelNotes='', visible, onVisibleChange, onUpdate, onSaveAs, allowCreate, allowUpdate, ...rest
    } = this.props

    const {getFieldDecorator} = this.props.form
    let {tempName, isSaving} = this.state
    let editingName = tempName === undefined ? currModelName : tempName

    let showUpdatePanel = allowUpdate && !canSaveAsOnly
    let showCreatePanel = allowCreate

    if (!showCreatePanel && !showUpdatePanel) {
      return null
    }
    tags = tags.filter(({type}) => type === 'slices')

    let savePop = visible ? (
      <Tabs defaultActiveKey={canSaveAsOnly || !allowUpdate ? 'saveAs' : 'update'} className="width300">
        {!showUpdatePanel ? null : (
          <TabPane
            tab={`更新当前${modelType}`}
            key="update"
            disabled={canSaveAsOnly}
          >
            <Row>
              <Col className="pd1" span={24}>{modelType}名称</Col>
              <Col className="pd1" span={24}>
                <Form onSubmit={this.updataClick}>
                  <Item {...formItemLayout} label="名称">
                    {getFieldDecorator('slice_name', {
                      initialValue: editingName,
                      rules: [
                        {
                          required: true,
                          message: '名称不能为空'
                        }
                      ]
                    })(<Input />)}
                  </Item>
                  <Item {...formItemLayout} label="备注">
                    {getFieldDecorator('notes', {
                      initialValue: currModelNotes
                    })(<Input />)}
                  </Item>
                  {
                    true
                      ? (<Item {...formItemLayout} label="组别">
                        {getFieldDecorator('tags', {
                          initialValue: currModelTag
                        })(
                          <Select
                            mode="multiple"
                            placeholder="单图组选择"
                            getPopupContainer={triggerNode => triggerNode.parentNode}
                          >
                            {tags.map(item => (<Option key={item.id} value={item.id}>{item.name}</Option>))}
                          </Select>
                        )}
                      </Item>) : null
                  }
                  <Item>
                    <Button type="primary" htmlType="submit" style={{width: '100%'}}>
                    更新
                    </Button>
                  </Item>
                </Form>  
              </Col>
              {/* <Col className="pd1 alignright" span={24}>
                <Button
                  icon="save"
                  type="primary"
                  className="width-100"
                  loading={isSaving}
                  onClick={async () => {
                    if (!editingName) {
                      message.error('请先填写名称')
                      return
                    }
                    this.setState({isSaving: true})
                    await onUpdate(editingName)
                    this.setState({isSaving: false})
                    onVisibleChange(false)
                  }}
                >更新</Button>
              </Col> */}
            </Row>
          </TabPane>
        )}

        {!showCreatePanel ? null : (
          <TabPane tab={`另存为新${modelType}`} key="saveAs">
            <Row>
              <Col className="pd1" span={24}>
                <Form onSubmit={this.submitClick}>
                  <Item {...formItemLayout} label="名称">
                    {getFieldDecorator('slice_name', {
                      rules: [
                        {
                          required: true,
                          message: '名称不能为空'
                        }
                      ]
                    })(<Input />)}
                  </Item>
                  <Item {...formItemLayout} label="备注">
                    {getFieldDecorator('notes')(<Input />)}
                  </Item>
                  {
                    true
                      ? (<Item {...formItemLayout} label="组别">
                        {getFieldDecorator('tags')(
                          <Select
                            mode="multiple"
                            placeholder="单图组选择"
                            getPopupContainer={triggerNode => triggerNode.parentNode}
                          >
                            {tags.map(item => (<Option key={item.id} value={item.id}>{item.name}</Option>))}
                          </Select>
                        )}
                      </Item>) : null
                  }
                  <Item>
                    <Button type="primary" htmlType="submit" style={{width: '100%'}}>
                      保存
                    </Button>
                  </Item>
                </Form>
              </Col>
            </Row>
          </TabPane>
        )}
      </Tabs>
    ) : <div className="width300 height160" />
    if (canSelectDataSourceId) {
      return (
        <Popover
          trigger="click"
          title={ <CloseOutlined className="fright mg1y color-red" onClick={() => onVisibleChange(false)} />}
          content={savePop}
          visible={visible}
          {...rest}
        />
      );
    } else {
      return (
        <Popover
          trigger="click"
          content={savePop}
          visible={visible}
          onVisibleChange={onVisibleChange}
          {...rest}
        />
      )
    }
  }
}
