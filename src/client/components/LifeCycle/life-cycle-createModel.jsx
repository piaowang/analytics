import React, { Component } from 'react'
import { validateFieldsAndScroll } from '../../common/decorators'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Select, Button, Modal, message } from 'antd';
import { connect } from 'react-redux'
import { namespace } from './store/life-cycle'

const FormItem = Form.Item

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}

const defaultSceneName = ['新用户激活', '成长用户活跃提醒', '成熟用户关怀', '沉睡用户唤醒', '流失用户挽回']

@connect(state => ({ ...state[namespace] }))
@Form.create()
@validateFieldsAndScroll
export default class CreateModel extends Component {

  // changeProps(payload) {
  //   const { tagSpread } = this.props
  //   this.props.dispatch({
  //     type: `${namespace}/setState`,
  //     payload: {
  //       tagSpread: {
  //         ...tagSpread,
  //         ...payload
  //       }
  //     }
  //   })
  // }

  dispatch(func, payload) {
    this.props.dispatch({
      type: `${namespace}/${func}`,
      payload
    })
  }

  isRepeat(arr){

    var hash = {}
    
    for(var i in arr) {
    
      if(hash[arr[i]]) return true
    
      hash[arr[i]] = true
    
    }
    
    return false
    
  }

  async submit() {
    const { handleVisible } = this.props
    const { marketingModule: { lcModel } } = this.props 

    let values = await this.validateFieldsAndScroll()
    if (!values) return

    if (this.isRepeat(values.scenes)) return message.error('不同生命周期不能绑定同一场景')
    //更新
    if (!_.isEmpty(lcModel)) {
      return this.dispatch('updateMarketingModel', { values, handleVisible })
    }

    this.dispatch('createMarketingModel', { values, handleVisible })


  }

  renderForm() {
    const { lifeCycle, marketingModule: { lcModel = {}, scenes } } = this.props 
    const { getFieldDecorator } = this.props.form

    let existedOption = (lifeCycle.stages || []).map(i => i.scene_id)
    let optionSet = scenes.filter(i => !existedOption.includes(i.id))

    let edit = _.has(lcModel, 'MarketingModel.name')
    return (
      <Form layout="horizontal">
        <FormItem {...formItemLayout} label="营销模型名称" hasFeedback>
          {
            getFieldDecorator(
              'model_name', {
                initialValue: _.get(lcModel, 'MarketingModel.name') || (!edit ? '生命周期-电商平台客户端' : ''),
                rules: [
                  {
                    required: true,
                    message: '请输入营销模型名称'
                  }
                ]
              })(
              <Input disabled={edit}/>)
          }
        </FormItem>
        <div>
          <div>
            营销场景：
            {
              (lifeCycle.stages || []).map((i, idx) => (
                <FormItem {...formItemLayout} key={i.id} label={`${i.stage}场景`} hasFeedback>
                  {
                    getFieldDecorator(
                      `scenes.${i.id}`, {
                        initialValue: _.get(i, 'scene_id') || (!edit ? defaultSceneName[idx] : ''),
                        rules: [
                          {
                            required: true,
                            message: '请输入营销场景名称'
                          }
                        ]
                      })(
                      !edit  
                        ?  <Input />
                        : <Select>
                          {
                            optionSet.concat(_.find(scenes, o => o.id === i.scene_id)).filter(_.identity).map( j => (
                              <Select.Option value={j.id} key={j.id}>{j.name}</Select.Option>
                            ))
                          }
                        </Select>
                    )
                  }
                </FormItem>
              ))
            }
          </div>
        </div>
      </Form>
    )
  }

  render() {
    const { createVisible, handleVisible, marketingModule: { submitLoading, lcModel } } = this.props
    let edit = _.has(lcModel, 'MarketingModel.name')
    return (
      <Modal
        title={!edit ? '创建营销模型及场景' : '修改营销模型及场景'}
        visible={createVisible}
        onCancel={() => handleVisible(false)}
        footer={[
          <Button
            key="close"
            type="close"
            onClick={() => handleVisible(false)}
          >关闭</Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => this.submit()}
            loading={submitLoading}
          >确定</Button>
        ]}
      >
        {this.renderForm()}
      </Modal>
    )
  }
}
