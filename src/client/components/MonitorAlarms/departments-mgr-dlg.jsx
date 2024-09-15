import React from 'react'
import _ from 'lodash'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Modal,
  Row,
  Col,
  Button,
  Input,
  Tooltip,
  message,
  Popconfirm,
  Select,
  Radio,
  notification,
} from 'antd';
import { validateFieldsAndScroll } from '~/src/client/common/decorators.js'
import { DEFAULT_TEMPLATES } from '~/src/common/constants.js'
import {synchronizer} from '~/src/client/components/Fetcher/synchronizer.js'
import {isDiffByPath} from '~/src/common/sugo-utils.js'
import {withCommonFilter} from '~/src/client/components/Common/common-filter.jsx'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 15 }
}

const fieldNames = ['name', 'interface_id', 'error_template', 'normal_template']

/**
 *  监控告警-联系人部门管理控件
 * @export
 * @class AlarmInterfaces
 * @extends {React.Component}
 */
@Form.create()
@withCommonFilter
@validateFieldsAndScroll
export default class AlarmNotifyTemplateEditDialog extends React.Component {
  state = {
    editingDepartmentId: null
  }

  reset() {
    this.props.form.resetFields()
  }

  onSave = async () => {
    let formData = await this.validateFieldsAndScroll()
    if (!formData) {
      return
    }
    const { departments, modifyDepartments, reloadDepartments } = this.props
    let {editingDepartmentId} = this.state
    if (editingDepartmentId) {
      let idx = _.findIndex(departments, {id: editingDepartmentId})
      await modifyDepartments([idx], prev => {
        return {
          ...prev,
          ...formData
        }
      })
    } else {
      await modifyDepartments([], prevArr => {
        return [...prevArr, formData]
      })
    }
    await reloadDepartments()
    this.setState({editingDepartmentId: null})
    message.success('保存成功')
    this.reset()
  }

  render() {
    const {
      onCancel, visible, form, departments, searching, keywordInput: KeywordInput, modifyDepartments, reloadDepartments
    } = this.props

    const { getFieldDecorator } = form
    let { editingDepartmentId} = this.state

    const limitedDepartments = searching
      ? departments.filter(dep => _.includes(dep.name, searching))
      : departments

    let editingDepartment = editingDepartmentId ? _.find(departments, {id: editingDepartmentId}) : null
    return (
      <Modal
        width="800px"
        visible={visible}
        title={`${editingDepartmentId ? '修改' : '创建'}部门`}
        onCancel={() => {
          onCancel()
          this.reset()
        }}
        footer={null}
      >
        <Form>
          <Form.Item
            {...formItemLayout}
            label="部门名称"
          >
            {getFieldDecorator('name',  {
              rules: [{ required: true, message: '请输入部门名称', max: 25, whitespace: true }],
              initialValue: _.get(editingDepartment, 'name', null)
            }) ( <Input className="width-100" placeholder="请输入部门名称" /> )}
          </Form.Item>

          <Form.Item
            {...formItemLayout}
            label={'\u00a0'}
            colon={false}
          >
            <Button
              type="primary"
              icon={<LegacyIcon type={editingDepartmentId ? 'edit' : 'plus-circle-o'} />}
              onClick={this.onSave}
            >
              {editingDepartmentId ? '更新部门' : '添加新的部门'}
            </Button>
          </Form.Item>

          <div className="mg2t pd2t font16 bordert dashed mg1b">已创建的部门</div>
          <div className="width-50">
            <KeywordInput icon="search" className="width-100" placeholder="搜索部门名称" />
          </div>

          <Row className="bordert dashed mg2t maxh300 overscroll-y" gutter={10}>
            {departments.length === 0 ? (<div className="color-999 pd3 aligncenter">暂无内容</div>) : null}

            {departments.length !== 0 && limitedDepartments.length === 0
              ? (<div className="color-999 pd3 aligncenter">没有符合条件的内容</div>)
              : null}

            {limitedDepartments.map(c => {
              return [
                <Col
                  span={14}
                  key={`L${c.id}`}
                  className="mg1t"
                >
                  <Input
                    disabled
                    value={c.name || undefined}
                    suffix={(
                      <EditOutlined
                        className="pointer mg1r"
                        onClick={() => {
                          this.setState({editingDepartmentId: c.id}, () => {
                            form.setFieldsValue(_.pick(c, fieldNames))
                          })
                        }} />
                    )}
                  />
                </Col>,
                <Col
                  span={8}
                  key={`R${c.id}`}
                  className="mg1t"
                >
                  <Tooltip placement="right" title={'删除该部门'}>
                    <Popconfirm
                      placement="left" title="确定要删除该部门吗？"
                      okText="确定"
                      cancelText="取消"
                      onConfirm={async () => {
                        let res = await modifyDepartments([], prevArr => {
                          return prevArr.filter(dep => dep.id !== c.id)
                        })
                        if (res && !_(res.resDelete).compact().isEmpty()) {
                          message.success('删除成功!')
                          reloadDepartments()
                        }
                      }}
                    >
                      <DeleteOutlined className="pointer font14 line-height28" />
                    </Popconfirm>
                  </Tooltip>
                </Col>
              ];
            })}
          </Row>
        </Form>
      </Modal>
    );
  }
}
