import React from 'react'
import _ from 'lodash'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { CloseCircleOutlined } from '@ant-design/icons';
import { Input, Button, notification, Popconfirm, Radio } from 'antd';
import { validateFieldsAndScroll } from 'client/common/decorators'
import { KEY_NONE_TYPE } from 'common/constants'
import { Auth } from 'client/common/permission-control'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

/**
 * @description 标签分类树表单组件
 * @export TagTypeTreeForm
 * @class TagTypeTreeForm
 * @extends {React.Component}
 */
@Form.create()
@validateFieldsAndScroll
export default class TagTypeTreeForm extends React.Component {

  constructor(props) {
    const {tagTypeTree} = props
    super(props)
    this.state = {
      loading: false,
      tagTypeTree
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.tagTypeTree && !_.isEqual(nextProps.tagTypeTree, this.props.tagTypeTree)) {
      this.setState({
        tagTypeTree: nextProps.tagTypeTree
      }, () => {
        this.props.form.resetFields()
      })
    }
  }

  submit = async () => {
    let values = await this.validateFieldsAndScroll()
    if (!values) return
    let { tagTypeTree } = this.state
    const { save } = this.props
    Object.assign(values, _.pick(tagTypeTree, ['id', 'parent_id', 'datasource_id']))
    this.setState({ loading: true })
    await save(values)
    // 同步左边分类树节点信息
    if (!this.props.isCreateType) { // update分类信息时
      Object.assign(tagTypeTree, values, {
        type: values.name,
        remark: values.remark
      })
    } else {
      this.props.form.resetFields()
    }
    this.setState({ loading: false, tagTypeTree })
    this.props.setState({
      tagTypeTree: { ...tagTypeTree }
    })
  }

  render() {
    const { getFieldDecorator } = this.props.form
    const { selectedKeys, isCreateType, treeNode, parentTreeNode } = this.props
    const { loading, tagTypeTree } = this.state
    const dataRef = (treeNode && treeNode.props && treeNode.props.dataRef) || tagTypeTree || {}
    let { id, name = '',  remark = '', isTagDimension, nodeType } = dataRef
    if (isCreateType && (isTagDimension || nodeType === 'tagGroup')) {
      id = dataRef.treeId
      name = dataRef.typeTitle
    }
    let parentId = '-1'
    if (parentTreeNode) {
      parentId = parentTreeNode.treeId
    }
    const isDefault = !isCreateType && tagTypeTree.id === KEY_NONE_TYPE && _.includes(selectedKeys, KEY_NONE_TYPE)
    return (
      <div className="tag-dimension-content mg2t">
        <Form layout="horizontal" onSubmit={this.submit}>
          <Form.Item {...formItemLayout} label="父分类">
            {getFieldDecorator('parent_id', {
              initialValue: parentId
            }) (
              <Radio.Group>
                <Radio key="rdo-untyped" value="-1">无</Radio>
                {parentId === '-1' ? null : <Radio key={'rdo-' + parentId} value={parentId}>{parentTreeNode.type}</Radio>}
                {!isCreateType ? null : (id === KEY_NONE_TYPE ? null : <Radio key={'rdo-' + id} value={id}>{name}</Radio>)}
              </Radio.Group>
            )}
          </Form.Item>
          <Form.Item {...formItemLayout} label="分类名称" hasFeedback>
            {isDefault ? '未分类' : getFieldDecorator('name', {
              rules: [{
                min: 2,
                max: 20,
                type: 'string',
                required: true,
                message: '请输入标签分类，且长度为2至20个字符'
              }],
              initialValue: isCreateType ? '' : name
            }) (
              <Input type="text" autoComplete="off" holder="标签分类名称，不超过20个字符"/>
            )}
          </Form.Item>
          <Form.Item {...formItemLayout} label="分类描述" hasFeedback>
            {isDefault ? '' : getFieldDecorator('remark', {
              initialValue: isCreateType ? '' : remark
            }) (
              <Input.TextArea rows={5} />
            )}
          </Form.Item>
        </Form>
        {isDefault ? '' :
          <div className="aligncenter">
            <Auth auth={['app/tag-type-tree/create', 'app/tag-type-tree/update']}>
              <Button
                type="success"
                icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
                className="mg1r iblock"
                onClick={this.submit}
              >{loading ? '保存中...' : '保存'}</Button>
              <Button
                type="ghost"
                className="mg2l iblock"
                icon={<CloseCircleOutlined />}
                onClick={() => this.props.form.resetFields()}
              >重置</Button>
            </Auth>
            <Auth auth="app/tag-type-tree/remove">
              {!tagTypeTree.id || tagTypeTree.type === 1 ? null :
                <Popconfirm placement="top" title="确定要删除该节点吗" onConfirm={() => this.props.remove(tagTypeTree.id, tagTypeTree.parent_id)} okText="是" cancelText="否">
                  <Button
                    className="mg2l iblock"
                    icon={<CloseCircleOutlined />}
                  >删除</Button>
                </Popconfirm>
              }
            </Auth>
          </div>
        }
      </div>
    );
  }
}
