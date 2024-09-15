import React, { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Modal, Form, Input, TreeSelect } from 'antd'
import _ from 'lodash'

import { DISPLAY_TASK_MODEL_TRANSLATE } from '../constants'

const FormItem = Form.Item

function EditTaskBaseinfomodal(props) {
  const { displayModel, id, visible, saving, title, treeData, parentId, onOk, onCancel } = props

  const [form] = Form.useForm()

  const handleOk = async () => {
    const values = await form.validateFields()
    if (!values) {
      return
    }
    onOk(displayModel, {
      ...values,
      parent_id: _.replace(values.parent_id, 'type-', ''),
      id,
      type: displayModel
    })
  }

  useEffect(() => {
    form.setFieldsValue({
      title,
      parent_id: !parentId || ['type-0', 'type-1'].includes(parentId) ? '' : parentId
    })
    return () => {
      form.resetFields()
    }
  }, [visible])

  const filterCategory = items => {
    return _.map(items, p => {
      const data = _.cloneDeep(p)
      if (data?.children?.length > 0) {
        data.children = filterCategory(data.children).filter(_.identity)
      }
      return _.startsWith(data?.key, 'type-') && data.id !== id ? data : null
    }).filter(_.identity)
  }

  const data = useMemo(() => {
    return filterCategory(treeData)
  }, [treeData, id])

  const typeTitle = _.get(DISPLAY_TASK_MODEL_TRANSLATE, displayModel, '')

  return (
    <Modal
      maskClosable={false}
      title={`${id ? '修改' : '新增'}${typeTitle}分类`}
      wrapClassName='vertical-center-modal'
      visible={visible}
      onOk={handleOk}
      confirmLoading={saving}
      onCancel={onCancel}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 20 }}>
        <FormItem
          rules={[
            {
              required: true,
              message: '分类名称必填!'
            },
            {
              pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/g,
              message: '只能是数字、字母和中文组成!'
            },
            {
              pattern: /^[^\s]*$/,
              message: '禁止输入空格'
            },
            {
              max: 60,
              message: '不应超过60个字符'
            }
          ]}
          name='title'
          label='分类名称'
        >
          <Input placeholder='请输入分类名称' />
        </FormItem>
        {
          <FormItem name='parent_id' label='所属分类'>
            <TreeSelect
              style={{ maxWidth: '370px' }}
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              treeData={data}
              placeholder='选择所属项目'
              treeDefaultExpandAll
              showSearch
              treeNodeFilterProp='title'
              allowClear
              dropdownMatchSelectWidth={false}
            />
          </FormItem>
        }
      </Form>
    </Modal>
  )
}

EditTaskBaseinfomodal.propTypes = {
  displayModel: PropTypes.string.isRequired, // 显示model
  id: PropTypes.string, // 编辑的id
  visible: PropTypes.bool.isRequired, // 是否显示编辑窗体
  saving: PropTypes.bool.isRequired, // 保存中
  title: PropTypes.string.isRequired, // 工作流名称
  treeData: PropTypes.object.isRequired, // 目录结构
  parentId: PropTypes.string.isRequired, // 工作流所属分类
  onOk: PropTypes.func.isRequired, // 保存方法
  onCancel: PropTypes.func.isRequired // 取消方法
}

export default EditTaskBaseinfomodal
