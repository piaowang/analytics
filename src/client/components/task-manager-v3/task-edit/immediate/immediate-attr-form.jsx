import React, { useEffect, useState } from 'react'
import { DeleteOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Select, Input,  Popconfirm } from 'antd'
import _ from 'lodash'
import './immediate-attribute-modal.styl'

const { Option } = Select
const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}


function AttrForm(props) {
  const { 
    form: { getFieldDecorator, validateFields }, 
    dataSourceAllList, 
    info, 
    filterItem, 
    formData, 
    isSubmit, 
    onSave, 
    typeData, 
    formDataLen, 
    index, 
    onChangeType, 
    onDeleteDataSource,
    onDataRender 
  } = props
  const [sourceList, setSourceList] = useState([])
  const [type, setType] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    if (isSubmit) {
      validateFields((error, value) => {
        if (!_.isEmpty(error)) return
        const oriDbContent = JSON.parse(_.get(sourceList.find((item) => item.id === source), 'dbContent', '{}'))
        formData.push({
          dbType: type,
          source,
          ...oriDbContent,
          ...value
        })
        if (formData.length === formDataLen) onSave()
      })
    }
  }, [isSubmit])

  useEffect(function () {
    setSourceList(_.filter(dataSourceAllList, item => item.dbType === type))
  }, [type])

  useEffect(() => {
    onDataRender()
    setType(_.get(info, 'dbType', ''))
    setSource(_.get(info, 'source', ''))
  }, [])

  return (
    <React.Fragment>
      <div style={{ border: '1px solid #ccc' }} className='pd1 mg2b formItemCon' key={_.get(info, 'id', '')}>
        <Popconfirm
          title='确定删除该数据源吗？'
          onConfirm={() => onDeleteDataSource(index)}
          okText='确定'
          cancelText='取消'
        >
          <span className='deleteIcon'><DeleteOutlined /></span>
        </Popconfirm>

        <Form name={_.get(info, 'id', '')}>
          <FormItem {...formItemLayout} label={'数据源类型'} hasFeedback>
            <Select style={{ width: 120 }} value={type} onChange={v => { setType(v); setSource(''); onChangeType(index, v) }}>
              {typeData.map((item, index) => {
                return (
                  <Option value={item.type} key={index}>
                    {item.type}
                  </Option>
                )
              })}
            </Select>
          </FormItem>
          <FormItem {...formItemLayout} label={'数据源'} hasFeedback>
            <Select value={source || _.get(info, 'source', '')} style={{ width: 120 }} onChange={v => { setSource(v) }}>
              {(sourceList || []).map((item, index) => {
                return (
                  <Option value={item.id} key={index}>
                    {item.dbAlais}
                  </Option>
                )
              })}
            </Select>
          </FormItem>
          <FormItem {...formItemLayout} label={'变量名'} hasFeedback>
            {getFieldDecorator('id', {
              initialValue: _.get(info, 'id', '')
            })(<Input />)}
          </FormItem>
        </Form>
      </div>
    </React.Fragment>
  )
}

export default Form.create()(AttrForm)
