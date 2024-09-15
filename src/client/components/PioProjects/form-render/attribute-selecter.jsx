import { Component } from 'react'
import { renderLabel, formItemLayout } from './contants'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Modal, Input, Row, Col, Checkbox } from 'antd'
import _ from 'lodash'
import getConditionValue from './get-condition-value'
import setFieldValue from './set-field-value'

const FormItem = Form.Item

@getConditionValue
@setFieldValue
class AttributerSelecter extends Component {
  constructor(props, context) {
    super(props, context)

    this.state = {
      modalVisible: false,
      value: [],
      search: ''
    }

    this.init(props)
  }

  openModal = () => {
    this.setState({
      modalVisible: true
    })
  }

  closeModal = () => {
    this.setState({
      modalVisible: false
    })
  }

  handleCancel = () => {
    this.init(this.props)
    this.closeModal()
  }

  handleOk = () => {
    const { param, form } = this.props
    const { setFieldsValue } = form
    const key = this.props.getFieldId(param.key)
    setFieldsValue({[key]: this.state.value.join(';')})
    this.closeModal()
  }

  search = e => this.setState({search: e.target.value})

  select = e => {
    let { checked, dataValue } = e.target
    const { value } = this.state

    if(this.props.param.paramType === 'param_type_attribute') {
      this.setState({
        'value':[dataValue]
      })
      return
    }

    if(checked && !value.includes(dataValue)) {
      this.setState({
        'value': value.concat(dataValue)
      })
    } else if(!checked && value.includes(dataValue)) {
      this.setState({
        'value': value.filter(v => v !== dataValue)
      })
    }
  }

  delete = e => {
    let dataValue = e.target.dataset.value
    this.select({
      target: {
        dataValue, 
        checked: false
      }
    })
  }

  selectAll = e => {
    let { checked } =e.target
    let attributeMetaData = _.get(this.props, 'param.metaDataProvider.metaData.attributeMetaData', {})
    let arr = _.values(attributeMetaData)
    this.setState({
      value: checked ? arr.map(a => a.name) : []
    })
  }

  render() {
    const { modalVisible, value, search } =this.state
    let { param, index, getFieldDecorator } = this.props
    let {
      key,
      fullName,
      isHidden,
      description,
      metaDataProvider,
      paramType
    } = param
    let attributeMetaData = _.get(metaDataProvider, 'metaData.attributeMetaData', {})
    let arr = _.values(attributeMetaData)
    if(search){
      arr = arr.filter(a => a.name.includes(search))
    }
    let label = renderLabel(description, fullName)

    let hasFeedback = false //'ParameterTypeCompare' !== paramType && 'param_type_boolean' !== paramType
    return (
      <FormItem
        className={isHidden ? 'hide' : ''}
        {...formItemLayout}
        label={label}
        hasFeedback={hasFeedback}
        colon={false}
        key={key + '@ft' + index}
      >
        {getFieldDecorator(key)(<div/>)}
        <Button onClick={this.openModal} className="width-100">
          <span>已选择</span>
          <span>{value.length}</span>
          <span>个字段</span>
        </Button>
        <Modal 
          title="选择字段" 
          visible={modalVisible}
          onOk={this.handleOk} 
          onCancel={this.handleCancel}
          maskClosable={false}
          closable={false}
          width={1000}
        >
          <div>
            <Input
              placeholder="搜索字段"
              suffix={<SearchOutlined />}
              onChange={this.search}
            />
            <Row className="pd1">
              <Col span={12}>
                <p className="pd1y">
                  <Checkbox 
                    className="pd1r" 
                    checked={arr.length === value.length}
                    onChange={this.selectAll}
                    disabled={paramType === 'param_type_attribute'}
                  >
                  全选
                  </Checkbox>
                </p>
                <div className="border radius overscroll-y height500">
                  {arr.map(a => (
                    <div className="borderb pd1" key={a.name}>
                      <Checkbox 
                        className="pd1r" 
                        checked={value.includes(a.name)}
                        dataValue={a.name}
                        onChange={this.select}
                      >
                        {a.name}
                      </Checkbox>
                    </div>
                  ))}
                </div>
              </Col>
              <Col span={12}>
                <p className="pd1y">已选</p>
                <div className="border radius overscroll-y height500">
                  {value.map(name => (
                    <div className="borderb pd1" key={name}>
                      <DeleteOutlined className="mg1r pointer" onClick={this.delete} data-value={name} />
                      {name}
                    </div>
                  ))}
                </div>
              </Col>
            </Row>
          </div>
        </Modal>
      </FormItem>
    )
  }
}

export default AttributerSelecter
