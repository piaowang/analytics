import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Modal, message, Input } from 'antd';
import _ from 'lodash'
import {immutateUpdates} from '../../../common/sugo-utils'
// src/common/sugo-utils.js
// src/client/components/OfflineCalc/business-line-management-edit-modal.jsx
const FormItem = Form.Item
const createForm = Form.create



class LineManagementEditModal extends React.Component {

  state = {
    loading: false
  }

  onSave = async () => {
    this.setState({
      loading: true
    })
    let {hideModal, submitCallback,type,data} = this.props
    this.props.form.validateFields((err, values) => {
      if (!err) {
        console.log('Received values of form: ', values)
        hideModal()
        var newData = null
        if(type === '0'){
          var timestamp = (new Date()).valueOf()
          newData = {
            name:values.value_data,
            describe:values.describe,
            created_at:timestamp,
            updated_at:timestamp
          }
        }else{
          newData = immutateUpdates(data,
            'describe',describe => values.describe || null,
            'name',name => values.value_data || null)
        }
        
        submitCallback(type,newData)
      }
      this.setState({
        loading: false
      })
    })
  }


  render () {
    let {modalVisible, hideModal, type,changeUserProp,data} = this.props
    let {loading} = this.state
    let value_data = type === '0'?null:data.name
    let describe = null
    if (data&&data.describe){
      describe = data.describe
    }
    
    const formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 18 }
    }

    const { getFieldDecorator } = this.props.form

    let footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={this.onSave}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )

    return (
      <Modal
        title={type === '0' ? '新建字典' : '编辑字典'}
        visible={modalVisible}
        width={600}
        footer={footer}
        onCancel={hideModal}
        className="datasource"
      > 
        <Form layout="horizontal">
          <FormItem {...formItemLayout} label="字典" hasFeedback>
            {
              getFieldDecorator(
                'value_data', {
                  initialValue: value_data,
                  rules: [
                    { 
                      required: true, 
                      message: '请输入字典' 
                    },
                    {
                      pattern:/^[^ ]+$/,
                      message: '不允许有空格'
                    }
                  ]
                })(
                <Input />
              )
            }
          </FormItem>

          <FormItem {...formItemLayout} label="字典描述" hasFeedback>
            {
              getFieldDecorator(
                'describe', {
                  initialValue: describe,
                  rules: [
                    {
                      required:false,
                      message: '请输入描述' 
                    },
                    {
                      pattern:/^[^ ]+$/,
                      message: '不允许有空格'
                    }
                  ]
                })(
                <Input />
              )
            }
          </FormItem>
        </Form>
        
      </Modal>
    );
  }
}

export default createForm()(LineManagementEditModal)

