import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Select, TreeSelect } from 'antd'
import _ from 'lodash'

const {TextArea } = Input
const {Option } = Select



const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}

export const illegalCharacter =  {
  pattern: new RegExp('[^a-zA-Z0-9\_\u4e00-\u9fa5]', 'i'),
  message: '输入无效,包含非法字符',
  validator: (rule, value, callback) => {
    if (rule.pattern.test(value)) {
      callback(rule.message)
    }
    callback()
  }
}

function renderStrategy(props) {
  return {
    'input': () => (<Input style={{ width: 200 }} {...props} />),
    'textarea': () => (<TextArea autoSize={{ minRows: 3, maxRows: 5 }} {...props} />),
    'select': () => (
      <Select {...props} 
        getPopupContainer={triggerNode => triggerNode.parentNode}
      >
        {props.options.map(o => (
          <Option key={o[props.key || 'id']} value={o[props.optionId ||'id']}>{o[props.optionName ||'name'] }</Option>
        ))}
      </Select>
    ),
    'text': () => (
      <span {...props}>{props.text || ''}</span>
    ),
    'tree-select': () => (
      <TreeSelect
        style={{ width: '100%' }}
        dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
        treeData={props.treeData}
        treeDefaultExpandAll
        {...props}
      />
    )
  }
}

function renderFormItem(options, getFieldDecorator ) {
  return  options.map(item => {
    return (
      <Form.Item key={item.id} {...(item.formItemLayout || formItemLayout)} label={item.label || ''}>
        {item.renderBefore && item.renderBefore()}
        {getFieldDecorator(item.id || '', item.checker || {})(
          renderStrategy(item.options || {})[_.get(item, 'type', '')]()
        )}
        {item.renderAfter && item.renderAfter()}
      </Form.Item>
    )
  })
}

export default renderFormItem
