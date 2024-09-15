import React from 'react'
import _ from 'lodash'
import PropTypes from 'prop-types'
import RoleSelect from './role-select'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Input, Radio, Modal } from 'antd';
import {BusinessDimensionTypeEnum, BusinessDimensionCreateModeEnum, BusinessDimensionStatusEnum} from '../../../common/constants'

const {Item: FItem} = Form
const {Option} = Select

const MyModel = ({
  row={},
  visible,
  modleType,
  roles=[],
  cancel,
  onOk,
  editor,
  form: {getFieldDecorator, validateFields, resetFields}
}) => {
  const [loading, setLoading] = React.useState(false)

  React.useEffect(()=> {
    if (!visible) {
      setLoading(false)
      resetFields()
    }
  }, [visible])

  const [data, setData] = React.useState({})
  const [changeRoleSelect, setChangeRoleSelect] = React.useState(false)
  React.useEffect(()=> {
    if (modleType === 'editor' && visible) {
      setData(row)
      setChangeRoleSelect(true)
    } else if (modleType === 'create' && visible) {
      setData({})
    }
  }, [visible])

  const submit = () => {
    validateFields((err, value)=> {
      if(err) {return}
      setLoading(true)
      if (value.id) {
        editor(value)
      } else {
        onOk(value)
      }
    })
  }

  const callOf = () => {
    resetFields()
    cancel()
  }

  const adminUser = _.find(roles, (o) => o.type = 'built-in')
  const defaltRoleIds = adminUser ? [adminUser.id] : []
  return (
    <Modal
      width={600}
      title={'业务维度'}
      visible={visible}
      onCancel={callOf}
      onOk={submit}
      confirmLoading={loading}
    >
      <Form>
        {data.id
          ? (<FItem label="id" style={{ display: 'none' }}>
            {getFieldDecorator('id', {
              initialValue: data.id
            })(<Input />)}
          </FItem>)
          : null}
        <FItem label="名称" labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
          {getFieldDecorator('name', {
            initialValue: data.name || undefined,
            rules: [
              {
                pattern: /[^\s+|\s+$]$/g,
                message: '名称不能为空!'
              },
              {
                required: true,
                max: 15,
                message: '名称不能为空且不超过15个字符!',
                validator: (rule, value, callback) => {
                  if (!value || value.length > 15) {
                    callback('名称不能为空且不超过15个字符!')
                  }
                  callback()
                }
              }
            ]
          })(<Input />)}
        </FItem>
        <FItem label="别名" labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
          {getFieldDecorator('alias', {
            initialValue: data.alias
          })(<Input />)}
        </FItem>
        <FItem label="创建方式" labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
          {getFieldDecorator('create_mode', {
            initialValue: data.create_mode || 1
          })(<Radio.Group>
            {BusinessDimensionCreateModeEnum.map((name, index) => {
              return index !== 0 
                ? <Radio.Button key={index} value={index}>{name}</Radio.Button>
                : null
            })}
          </Radio.Group>)}
        </FItem>
        <FItem label="类型" labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
          {getFieldDecorator('type', {
            initialValue: data.type,
            rules: [
              {
                required: true,
                message: '类型不能为空'
              }
            ]
          })(<Select>
            {BusinessDimensionTypeEnum.map((name, index) => (<Option key={index} value={index}>{name}</Option>))}
          </Select>)}
        </FItem>
        <FItem label="状态" labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
          {getFieldDecorator('status', {
            initialValue: data.status === undefined ? 1 : data.status
          })(<Select>
            {BusinessDimensionStatusEnum.map((name, index) => (<Option key={index} value={index}>{name}</Option>))}
          </Select>)}
        </FItem>
        <FItem label="关联用户组" labelCol={{ span: 4 }} wrapperCol={{ span: 18 }}>
          {getFieldDecorator('roleIds', {
            initialValue: data.roleIds === undefined ? defaltRoleIds : data.roleIds
          })(<RoleSelect roles={roles} changeRoleSelect={changeRoleSelect} />)}
        </FItem>
      </Form>
    </Modal>
  );
}

MyModel.propTypes = {
  row: PropTypes.object,
  modleType: PropTypes.string,
  visible: PropTypes.bool,
  roles: PropTypes.array,
  loading: PropTypes.bool,
  cancel: PropTypes.func,
  onOk: PropTypes.func,
  editor: PropTypes.func,
  form: PropTypes.object
}

export default Form.create()(MyModel)
