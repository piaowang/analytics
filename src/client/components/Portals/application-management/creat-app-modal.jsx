import React, {useEffect, useState} from 'react'
import { UploadOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Input, message, Modal, Radio, Select, Upload } from 'antd'
import {TAG_APP_ORDER_SAGA_MODEL_NS, TAGS_SAGA_MODEL_NS} from './store'
import {creatApplication, updateApplication} from './store/queryhelper'
import _ from 'lodash'
import {connect} from 'react-redux'
import {validateFieldsByForm} from '../../../common/decorators'

const { Option } = Select

async function submit (props) {
  const { form, dispatch, applications, handleCancel, imgSrc, checkedTag } = props
  let values = await validateFieldsByForm(form)
  if (!values) return message.error('请填写必填项')
  values.img = imgSrc

  values.checkedTag = checkedTag
  let res = await creatApplication(values)
  if (!res) return message.error('创建失败')
  window.sugo.user.appsPermissions.push(res.id)
  message.success('创建成功')
  dispatch({
    type: 'application-management/initApplications'
  })
  dispatch({
    type: `${TAGS_SAGA_MODEL_NS}/fetch`
  })
  dispatch({
    type: `${TAG_APP_ORDER_SAGA_MODEL_NS}/fetch`
  })
  form.resetFields()
  handleCancel()
}

//未更新成功
async function submitForEdit (props) {
  const { form, dispatch, applications, app, handleCancel, imgSrc } = props
  let values = await validateFieldsByForm(form)
  if (!values) return message.error('请填写必填项')
  values.img = imgSrc

  let res = await updateApplication({...app, ...values})

  if (!res.success) return message.error('保存失败')
  dispatch({
    type: 'application-management/initApplications'
  })
  handleCancel()
  return message.success('保存成功')
  // dispatch({
  //   type: 'getApplications/sync',
  //   payload: applications.application.map(item=>{
  //     return item.id === app.id ? {...app, ...values} : item
  //   }),
  //   callback: (syncRes) => {
  //     let {resCreate, resUpdate} = syncRes || {}
  //     if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
  //       message.warn('没有修改数据，无须保存')
  //       return
  //     }
  //     if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
  //       // 保存报错
  //       message.error('保存失败')
  //       return
  //     }
  //     handleCancel()
  //     return message.success('保存成功')
  //   }
  // })
}


//标签管理
function CreateApp(props) {
  const { visible, handleCancel, app, applications} = props
  const {dispatch} = window.store
  
  let [imgSrc, setImgSrc] = useState('')

  const formItemLayout = {
    labelCol: { span: 4 },
    wrapperCol: { span: 18 }
  }

  const { getFieldDecorator } = props.form

  useEffect(() => {
    setImgSrc(app?.img)
  }, [JSON.stringify(app)])


  const isEdit = props?.modalState === 'editApp'
  return (
    <React.Fragment >
      <Modal
        width="654px"
        height="530px"
        maskClosable={false}
        visible={visible}
        title={isEdit ? '编辑应用' : '创建应用'}
        okText="提交"
        cancelText="取消"
        destroyOnClose
        onCancel={() => {
          handleCancel()
          setImgSrc('')
        }
        }
        onOk={() => {
          if(isEdit){
            submitForEdit({dispatch, applications, app, handleCancel,imgSrc, ...props})
          }else{
            submit({dispatch, applications, handleCancel,imgSrc, ...props})
          }
          setImgSrc('')
        }}
      >
        <Form {...formItemLayout}>
          <Form.Item label="应用名称">
            {getFieldDecorator('name', {
              rules: [
                { required: true, message: '请输入名称'},
                {
                  min: 2,
                  max: 20,
                  type: 'string',
                  required: true,
                  pattern: new RegExp(/^[\S]/,'g'),
                  message: '请输入应用名称，长度为2至20个字符,且开头不能为空'
                }
              ],
              initialValue: isEdit ? app.name : undefined
            })(<Input/>)}
          </Form.Item>
          <Form.Item label="应用URL">
            {getFieldDecorator('url', {
              rules: [
                { required: true, message: '请输入url' }
              ],
              initialValue: isEdit ? app.url : undefined
            })(<Input/>)}
          </Form.Item>
          <Form.Item label="打开方式">
            {getFieldDecorator('openWay', {
              initialValue: app?.openWay || 'innerTab'
            })(<Radio.Group>
              <Radio key={'openWay-innerTab'} value={'innerTab'}>页内标签页</Radio>
              <Radio key={'openWay-browserTab'} value={'browserTab'}>浏览器标签页</Radio>
            </Radio.Group>)}
          </Form.Item>
          {
            // isEdit
            //   ? <Form.Item label="应用状态">
            //     {getFieldDecorator('enable',
            //       {
            //         initialValue: isEdit ? (app.enable === 'enable' ? '启用': '不启用') : undefined
            //       }
            //     )( <Select
            //       style={{ width: '32%' }}
            //       onChange={() => {}}
            //     >
            //       <Option value="enable">启用</Option>
            //       <Option value="noEnable">不启用</Option>
            //     </Select>
            //     )}
            //   </Form.Item>
            //   : null
          }
          <Form.Item label="缩略图" extra={'请上传小于43kb的图片\n类型为svg/jepg/png/jpg.'}>
            {getFieldDecorator('img')(
              <Upload
                accept="image/svg+xml,image/png,image/jpeg,image/jpg"
                fileList={[]}
                beforeUpload={file => {
                  let imgType = ['image/svg+xml', 'image/jpeg', 'image/png', 'image/jpg']
                  if (!_.includes(imgType, file.type)) {
                    setImgSrc('')
                    return message.error('请上传图片')
                  }
                  if (file.size > 44225) return message.error('图片太大')
                  const reader = new FileReader()
                  reader.onload = e => {
                    setImgSrc(e.target.result)
                  }
                  reader.readAsDataURL(file)
                  return false
                }}
              >
                <Button><UploadOutlined /> 选择图片文件</Button>
                {/* {
                  isEdit && imgSrc ? <img id="unlodaImg" alt="图片"
                    style={{width: '50px', height: '30px'}} src={imgSrc || app.img}
                  />
                    : null
                } */}
                {
                  imgSrc ? <img id="unlodaImg" alt="图片"
                    style={{width: '50px'}} src={imgSrc || app.img}
                           />
                    : null
                }
              </Upload>
            )
            }
          </Form.Item>
          <Form.Item label="应用描述">
            {getFieldDecorator('description', {
              initialValue: isEdit ? app.description : ''
            })(<Input.TextArea rows={5} />)
            }
          </Form.Item>
        </Form>
      </Modal>
    </React.Fragment>
  )
}


export default _.flow([
  connect(state => {
    return {
      applications: state && state.getApplications
    }
  }),
  Form.create()
])(CreateApp)
