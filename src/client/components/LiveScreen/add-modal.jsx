import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Button, Input, Select, Tabs } from 'antd'
import { validateFields } from '../../common/decorators'
import UploadedImageViewer from '../Common/uploaded-image-viewer'
import { Empty } from '../Common/empty'

const FormItem = Form.Item
const createForm = Form.create
const Option = Select.Option
const { TabPane } = Tabs
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}

/**
 * 添加实时大屏弹窗
 * @class AddScreenModal
 * @extends {React.Component}
 */
@validateFields
class AddScreenModal extends React.Component {

  state = {
    loading: false
  }

  handleSubmit = async () => {
    const { addType, addLivescreen } = this.props
    const values = await this.validateFields()
    if (!values) {
      return
    }
    addLivescreen({ ...values, is_template: !!addType })
  }

  handleClose = () => {
    const { form: { resetFields } } = this.props
    resetFields()
  }

  render() {
    let { visible, hideModal, data = [], addType, categoryList = [], selectedCategoryId = '' } = this.props
    const { loading } = this.state
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
          onClick={this.handleSubmit}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )

    return (
      <Modal
        title={addType === 0 ? '新增实时大屏' : '新增大屏模板'}
        visible={visible}
        onOk={this.handleSubmit}
        onCancel={hideModal}
        afterClose={this.handleClose}
        footer={footer}
        width={1000}
      >
        <Form layout="horizontal">
          <FormItem {...formItemLayout} label={addType === 0 ? '大屏名称' : '模板名称'} hasFeedback>
            {
              getFieldDecorator('title', {
                initialValue: '',
                rules: [{ required: true, message: '需要填写大屏名称' }]
              })(
                <Input placeholder="请输入大屏名称" />
              )
            }
          </FormItem>
          {
            addType === 0 ?
              <FormItem {...formItemLayout} label={'所属分组'} hasFeedback>
                {
                  getFieldDecorator('category_id', {
                    initialValue: selectedCategoryId === 'default' ? '' : selectedCategoryId
                  })(
                    <Select>
                      <Option value="">默认组</Option>
                      {categoryList.map(p => <Option value={p.id} key={`category_${p.id}`}>{p.title}</Option>)}
                    </Select>
                  )
                }
              </FormItem>
              : null
          }
          <FormItem {...formItemLayout} label="选择模板">
            {
              getFieldDecorator('template', {
                initialValue: 'blank'
              })(
                <Tabs onChange={v => v}>
                  <TabPane
                    key="blank"
                    tab={
                      <div>
                        <Empty description={'空'} style={{ width: 160, height: 90 }} />
                      </div>
                    }
                  />
                  {
                    data.map(p => {
                      return (<TabPane
                        key={`${p.id}`}
                        tab={
                          <div>
                            {
                              p.cover_image_id
                                ? <div>
                                  <UploadedImageViewer
                                    uploadedImageId={p.cover_image_id}
                                    style={{ width: 160, height: 90 }}
                                  />
                                  <div className="aligncenter">{p.title}</div>
                                </div>
                                : <Empty description={p.title} style={{ width: 160, height: 90 }} />
                            }
                          </div>
                        }
                      />)
                    })
                  }
                </Tabs>
              )
            }
          </FormItem>
        </Form>
      </Modal>
    )
  }
}

export default createForm()(AddScreenModal)
