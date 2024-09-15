import React, { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Modal, Form, Input, TreeSelect } from 'antd'
import _ from 'lodash'

import { DISPLAY_TASK_MODEL, DISPLAY_TASK_MODEL_TRANSLATE } from '../constants'

const FormItem = Form.Item

function EditTaskBaseinfomodal(props) {
  const { displayModel, editTaskId, isShowTaskEditModal, saving, editTaskTitle, treeData, editTaskCategoryId, onOk, onCancel } = props

  const [form] = Form.useForm()

  const handleOk = async () => {
    const values = await form.validateFields()
    if (!values) {
      return
    }
    onOk(displayModel, {
      ...values,
      taskCategory: _.replace(values.taskCategory, 'type-', '')
    })
  }

  useEffect(() => {
    form.setFieldsValue({
      taskModalTitle: editTaskTitle,
      taskCategory: !editTaskCategoryId || ['type-0', 'type-1'].includes(editTaskCategoryId) ? '' : editTaskCategoryId
    })
    return () => {
      form.resetFields()
    }
  }, [isShowTaskEditModal])

  const filterCategory = items => {
    return _.map(items, p => {
      const data = _.cloneDeep(p)
      if (data?.children?.length > 0) {
        data.children = filterCategory(data.children).filter(_.identity)
      }
      return _.startsWith(data?.key, 'type-') ? data : null
    }).filter(_.identity)
  }

  const data = useMemo(() => {
    return filterCategory(treeData)
  }, [treeData])

  const title = _.get(DISPLAY_TASK_MODEL_TRANSLATE, displayModel, '')

  return (
    <Modal
      maskClosable={false}
      title={`${editTaskId ? '修改' : '新增'}${title}`}
      wrapClassName='vertical-center-modal'
      visible={isShowTaskEditModal}
      onOk={handleOk}
      confirmLoading={saving}
      onCancel={onCancel}
    >
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 20 }}>
        <FormItem
          rules={[
            {
              required: true,
              message: `${title}名称必填!`
            },
            {
              pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/g,
              message: '只能是数字、字母、中文和下划线组成!'
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
          name='taskModalTitle'
          label={`${title}名称`}
        >
          <Input placeholder='请输入工作流名称' />
        </FormItem>
        {
          <FormItem name='taskCategory' label='所属分类'>
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
  displayModel: PropTypes.string, // 显示model
  editTaskId: PropTypes.string, // 编辑的id
  isShowTaskEditModal: PropTypes.bool, // 是否显示编辑窗体
  saving: PropTypes.bool, // 保存中
  editTaskTitle: PropTypes.string, // 工作流名称
  treeData: PropTypes.object, // 目录结构
  editTaskCategoryId: PropTypes.string, // 工作流所属分类
  onOk: PropTypes.func, // 保存方法
  onCancel: PropTypes.func // 取消方法
}

export default EditTaskBaseinfomodal
