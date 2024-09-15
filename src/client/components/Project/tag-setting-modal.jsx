import React, { Component } from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Radio, Button, Tag, Select } from 'antd';
import { AccessDataType, UpdateTagSegmentType } from '../../../common/constants'

const formItemLayout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 }
}

const confirm = Modal.confirm

const FormItem = Form.Item
const RadioGroup = Radio.Group

const SelectOption = Select.Option
@Form.create()
export default class TagSettingModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false,
      selectTagProject: ''
    }
  }

  renderForm = () => {
    const { project, form: { getFieldDecorator }, projectList } = this.props
    const tagDatasourceName = _.get(project, 'tag_datasource_name', '')
    const { selectTagProject } = this.state
    let showOperation = false
    const tagGroups = this.getUserGroup(project.id, project.datasource_id)
    if(tagDatasourceName) {
      if (selectTagProject && selectTagProject !== tagDatasourceName) {
        showOperation = true
      }
    }
    return (<Form>
      <FormItem {...formItemLayout} label="关联标签项目" >
        {getFieldDecorator('tag_datasource_name', {
          initialValue: tagDatasourceName
        })(
          <Select onChange={(val) => this.setState({selectTagProject: val})}>
            <SelectOption value="">无绑定</SelectOption>
            {
              projectList.filter(p => p.access_type === AccessDataType.Tag && p.tag_datasource_name).map(p => {
                return <SelectOption key={p.tag_datasource_name} value={p.tag_datasource_name}>{p.name}</SelectOption>
              })
            }
          </Select>
        )}
      </FormItem>
      {
        showOperation && tagGroups.filter(_.identity).length ? <FormItem {...formItemLayout} label="修改操作">
          {getFieldDecorator('updateTagSegmentType', {
            initialValue: UpdateTagSegmentType.Keep
          })(
            <RadioGroup>
              <Radio value={UpdateTagSegmentType.Keep}>全部保留</Radio>
              <Radio value={UpdateTagSegmentType.Delete}>全部删除</Radio>
            </RadioGroup>
          )}
        </FormItem>
          : null
      }
      {
        <FormItem {...formItemLayout} label="关联用户分群">
          {
            tagGroups
          }
        </FormItem>
      }
    </Form>)
  }

  getUserGroup = (projId, dsId) => {
    const { userGroups } = this.props
    return userGroups.map(p => {
      if (p.druid_datasource_id === dsId
        || _.get(p, 'params.relatedBehaviorProjectId', '') === projId
        || _.get(p, 'params.relatedUserTagProjectId', '') === projId) {
        return <Tag>{p.title}</Tag>
      }
      return null
    })
  }

  closeModal = () => {
    const { hideTagSet, form } = this.props
    this.setState({selectTagProject:''})
    form.resetFields()
    hideTagSet()
  }

  showChangeConfirm = () => {
    const { saveProject, project, form, projectList } = this.props
    let val = {}
    
    let closeModal = this.closeModal
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        val = values
      }
    })

    const { tag_datasource_name } = val
    if(project.tag_datasource_name === tag_datasource_name) {
      closeModal()
      return 
    }

    if(!project.tag_datasource_name) {
      saveProject({ id: project.id, tag_datasource_name })
      closeModal()
      return 
    }
    let tagProject = projectList.find(p => p.access_type === AccessDataType.Tag && p.tag_datasource_name === tag_datasource_name) || {}
    let isUpdateTag = val.tag_datasource_name !== ''

    let title = '解除绑定,删除关联用户分群' 
    if(isUpdateTag) {
      title = val.updateTagSegmentType === UpdateTagSegmentType.Delete
        ? '更改绑定标签项目,删除关联用户分群'
        : '更改绑定标签项目,修改关联用户分群'
    }
    confirm({
      title: title,
      okText: '确定',
      cancelText: '取消',
      onOk() {
        saveProject({
          id: project.id,
          tag_datasource_name,
          tag_project_id: tagProject.id,
          tag_datasource_id: tagProject.datasource_id,
          updateTagSegmentType: val.updateTagSegmentType
        })
        closeModal()
      }
    })
  }

  renderFooter = (loading) => {
    return (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={this.closeModal}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={this.showChangeConfirm}
          disabled={loading}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    );
  }

  render() {
    const { loading } = this.state
    const { displayTagSet, hideTagSet, project } = this.props
    return (
      <Modal
        visible={displayTagSet}
        onCancel={hideTagSet}
        title={`[${project.name}] 关联标签项目设置`}
        footer={this.renderFooter(loading)}
        width={500}
      >
        {this.renderForm()}
      </Modal>
    )
  }
}
