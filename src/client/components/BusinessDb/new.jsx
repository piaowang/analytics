import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Button, Input, Select, Row, Col } from 'antd';
import _ from 'lodash'
import { validateFieldsAndScroll } from '../../common/decorators'
const Option = Select.Option
const FormItem = Form.Item
const createForm = Form.create

@validateFieldsAndScroll
class SettingInfo extends React.Component {

  handleSubmit = () => {
    const { save, data } = this.props
    let hasError = false

    this.props.form.validateFields((err) => {
      //验证用户组是否选择
      if (hasError || err) {
        return err
      } else {
        save(data)
      }
    })
  }

  render() {
    let {
      data,
      visible,
      saveing,
      hideModal,
      changeProp,
      test,
      testing,
      testOk,
      fields,
      dimensions = []
    } = this.props
    let title = data.id ? '编辑业务表' : '创建业务表'
    dimensions = dimensions.filter(p => {
      let paraType = _.get(p, 'params.type')
      return paraType !== 'business'
    })
    const formItemLayout = {
      labelCol: { span: 5 },
      wrapperCol: { span: 17 }
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
          icon={<LegacyIcon type={saveing ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={this.handleSubmit}
        >{saveing ? '提交中...' : '提交'}</Button>
      </div>
    )
    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleSubmit}
        onCancel={hideModal}
        width={700}
        footer={footer}
      >
        <Form layout="horizontal">
          <FormItem {...formItemLayout} label="业务表名称" hasFeedback>
            {
              getFieldDecorator(
                'table_title', {
                  initialValue: data.table_title,
                  rules: [
                    {
                      required: true,
                      message: '请输入业务表名称'
                    }
                  ]
                })(
                <Input
                  onChange={(e) => changeProp({ table_title: e.target.value })}
                />)
            }
          </FormItem>
          <FormItem {...formItemLayout} label="数据库类型" hasFeedback>
            {
              getFieldDecorator(
                'db_type', {
                  initialValue: data.db_type,
                  rules: [
                    {
                      required: true
                    }
                  ]
                })(
                <Select
                  onChange={(e) => changeProp({ db_type: e })}
                >
                  <Option key="dt1" value="mysql">MySQL</Option>
                  <Option key="dt2" value="postgresql">PostgreSQL</Option>
                </Select>
              )
            }
          </FormItem>
          <FormItem
            {...formItemLayout}
            label="JDBC地址"
            hasFeedback
          >
            {
              getFieldDecorator(
                'db_jdbc', {
                  initialValue: data.db_jdbc,
                  rules: [
                    {
                      required: true,
                      message: '请输入JDBC地址'
                    }
                  ]
                })(
                <Input
                  placeholder="ip地址:端口/数据库"
                  onChange={(e) => {
                    changeProp({ db_jdbc: e.target.value })
                    test
                  }
                  }
                />)
            }
          </FormItem>
          <FormItem {...formItemLayout} label="数据库表名称" hasFeedback>
            {
              getFieldDecorator(
                'table_name', {
                  initialValue: data.table_name,
                  rules: [
                    {
                      required: true,
                      message: '请输入数据库表名称'
                    }
                  ]
                })(
                <Input
                  onChange={(e) => changeProp({ table_name: e.target.value, dimension: '', db_ley: '' })}
                />)
            }
          </FormItem>
          <FormItem {...formItemLayout} label="数据库账号" hasFeedback>
            {
              getFieldDecorator(
                'db_user', {
                  initialValue: data.db_user,
                  rules: [
                    {
                      required: true,
                      message: '请输入数据库账号'
                    }
                  ]
                })(
                <Input
                  placeholder="数据库账号"
                  autoComplete={'off'}
                  onChange={(e) => changeProp({ db_user: e.target.value })}
                />)
            }
          </FormItem>
          <FormItem {...formItemLayout} label="数据库密码" hasFeedback>
            {
              getFieldDecorator(
                'db_pwd', {
                  initialValue: data.db_pwd,
                  rules: [
                    {
                      required: true,
                      message: '请输入数据库密码'
                    }
                  ]
                })(
                <Input
                  type="password"
                  placeholder="数据库密码"
                  autoComplete={'off'}
                  onChange={(e) => changeProp({ db_pwd: e.target.value, encrypted: false })}
                />)
            }
          </FormItem>
          <Row>
            <Col span={22} className="alignright mg2b">
              注意：浏览器会同步记住登录账号及密码，请用户修改数据库账号/密码为数据库的账号及密码
            </Col>
          </Row>
          {
            testOk ? null
              : (<Row className="mg2b">
                <Col span={22} className="alignright">
                  <Button
                    onClick={
                      async () => {
                        let pass = await this.validateFieldsAndScroll()
                        if (pass) test()
                      }
                    }
                    loading={testing}
                  >
                    测试连接
                  </Button>
                </Col>
              </Row>)
          }
          {
            testOk ? (<div>
              <FormItem
                label="设置key字段关联"
                hasFeedback
                {...formItemLayout}
              >
                {
                  getFieldDecorator(
                    'db_key', {
                      initialValue: data.db_key,
                      rules: [
                        {
                          required: true,
                          message: '请输入key字段关联'
                        }
                      ]
                    })(
                    <Select
                      onChange={(e) => changeProp({ db_key: e })}
                      showSearch
                      filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                    >
                      {
                        _.map(fields, (p, i) => {
                          return (<Option key={'fl' + i} value={p.field_name}>{p.field_name}</Option>)
                        })
                      }
                    </Select>
                  )
                }
              </FormItem>
              <FormItem
                label="关联"
                hasFeedback
                {...formItemLayout}
              >
                {
                  getFieldDecorator(
                    'dimension', {
                      initialValue: data.dimension,
                      rules: [
                        {
                          required: true,
                          message: '请输入关联维度'
                        }
                      ]
                    })(
                    <Select
                      onChange={(e) => changeProp({ dimension: e })}
                      showSearch
                      filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                    >
                      {
                        _.map(dimensions, (p, i) => {
                          return (<Option key={'dm' + i} value={p.name}>{p.title || p.name}</Option>)
                        })
                      }
                    </Select>
                  )
                }
              </FormItem>
              <Row>
                <Col span={22} className="alignright">
                  设置数据表与当前项目数据的关联关系。
                </Col>
              </Row>
            </div>)
              : null
          }
        </Form>
      </Modal>
    )
  }
}

export default createForm()(SettingInfo)
