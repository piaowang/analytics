import { Component } from 'react'

import {
  BarsOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';

import { Modal, Input, Select, message, Button, Tree, Row, Col, Tooltip, Radio } from 'antd';
import _ from 'lodash'
import Fetch from '../../common/fetch-final'
import { validateFieldsAndScroll } from '../../common/decorators'
const RadioGroup = Radio.Group

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}

const FormItem = Form.Item
const { Option } = Select
function findCategoryChildren(categoryInfo, id) {
  const category = categoryInfo.find(p => p.id === id)
  let child = categoryInfo.filter(p => p.parent_id === id)
  child = _.sortBy(child, p => p.order).map((p, i) => ({ ...p, order: i }))
  if (child.length) {
    return {
      ...category,
      children: child.map(p => findCategoryChildren(categoryInfo, p.id))
    }
  }
  return {
    ...category,
    children: []
  }
}

export function buildCategory(categoryInfo, projectId) {
  const categories = categoryInfo
    .filter(p => p.type === 0 || (p.project_id === projectId && p.type === 1))
    .map(p => findCategoryChildren(categoryInfo, p.id))
  return !window.sugo.enableDataChecking ? [
    { title: '全局分类', id: '0', dashboards: [], children: categories.filter(p => p.type === 0 && _.get(p,'parent_id.length', 0) <= 1).map((p, i) => ({ ...p, parent_id: '0', order: i })) },
    { title: '项目分类', id: '1', dashboards: [], children: categories.filter(p => p.type === 1 && _.get(p,'parent_id.length', 0) <= 1).map((p, i) => ({ ...p, parent_id: '1', order: i })) }
  ] : [
    { title: '全局分类', id: '0', dashboards: [], children: categories.filter(p => p.type === 0 && _.get(p,'parent_id.length', 0) <= 1).map((p, i) => ({ ...p, parent_id: '0', order: i })) }
  ]
}

@Form.create()
@validateFieldsAndScroll
export default class DashboardCategoryModal extends Component {
  constructor(props) {
    super()
    this.state = {
      visible: false,
      loading: false,
      selectCategory: '',
      categoryInfo: [],
      parentCategory: {},
      draggable: false,
      dashboardsCategory: [],
      dashboards: []
    }
  }

  customOrder = []

  reset = () => {
    this.props.form.resetFields()
  }

  componentWillMount() {
    const { dashboardsCategory, projectCurrent = {} } = this.props
    if (!_.isEmpty(projectCurrent)) {
      this.getDashboards(projectCurrent.datasource_id)
      if (dashboardsCategory.length) {
        this.setState({ categoryInfo: buildCategory(dashboardsCategory, projectCurrent.id), dashboardsCategory: dashboardsCategory })
      }
    }
  }

  componentWillReceiveProps(nextprops) {
    const { dashboardsCategory, projectCurrent = {} } = this.props
    const { dashboardsCategory: nextDashboardsCategory, projectCurrent: nextProjectCurrent = {} } = nextprops
    if (!_.isEmpty(nextProjectCurrent) && projectCurrent.datasource_id !== nextProjectCurrent.datasource_id) {
      this.getDashboards(nextProjectCurrent.datasource_id)
    }
    if ((nextDashboardsCategory !== dashboardsCategory && !_.isEmpty(nextProjectCurrent)) || projectCurrent.id !== nextProjectCurrent.id) {
      this.setState({ categoryInfo: buildCategory(nextDashboardsCategory, nextProjectCurrent.id), dashboardsCategory: nextDashboardsCategory })
    }
  }

  getDashboards = async (datasourceId) => {
    const res = await Fetch.get('/app/dashboards/getAllDashborads', { datasource_id: datasourceId })
    this.setState({ dashboards: res.result })
  }

  onSubmit = async () => {
    const { projectCurrent = {} } = this.props
    const { dashboardsCategory, selectCategory } = this.state
    let values = await this.validateFieldsAndScroll()
    if (!values) return
    if (values.parent_id === '0' || values.parent_id === '1') {
      values.type = _.toNumber(values.parent_id)
      values.parent_id = ''
    } else {
      values.type = dashboardsCategory.find(p => p.id === values.parent_id).type
    }
    const data = { ...values, id: selectCategory, project_id: projectCurrent.id }
    this.setState({ loading: true })
    let res = await Fetch.post('/app/dashboards-category/save', data)
    this.setState({ loading: false })
    if (!res || !res.success) return
    message.success(selectCategory ? '修改成功' : '创建成功')
    const category = _.find(dashboardsCategory, p => p.id !== res.result)
    const newDashboardsCategory = dashboardsCategory.filter(p => p.id !== res.result).concat([{ ...category, ...data, id: res.result }])
    const newCategoryInfo = buildCategory(newDashboardsCategory, projectCurrent.id)
    this.setState({ categoryInfo: newCategoryInfo, selectCategory: res.result, dashboardsCategory: newDashboardsCategory })
  }

  onDel = async () => {
    const { projectCurrent = {} } = this.props
    const { dashboardsCategory, selectCategory } = this.state
    const category = dashboardsCategory.find(p => p.parent_id === selectCategory)
    if (!_.isEmpty(category)) {
      message.error('请先删除子分类')
      return
    }
    let res = await Fetch.post('/app/dashboards-category/delete', { id: selectCategory })
    if (!res || !res.success) return
    message.success('删除成功')
    const newDashboardsCategory = dashboardsCategory.filter(p => p.id !== selectCategory)
    const newCategoryInfo = buildCategory(newDashboardsCategory, projectCurrent.id)
    this.setState({ categoryInfo: newCategoryInfo, selenoCategory: _.get(dashboardsCategory, [0, 'id']), dashboardsCategory: newDashboardsCategory })
  }

  renderTreeNodes(items) {
    return _.sortBy(items, p => p.order).map(item => {
      const props = {
        key: item.id,
        title: item.title,
        icon: <BarsOutlined />,
        selectable: item.id !== '0' && item.id !== '1',
        isLeaf: !_.get(item, 'children.length', 0)
      }
      if (item.children) {
        return (<Tree.TreeNode
          {...props}
          title={<Tooltip title={props.title} placement="top">{props.title}</Tooltip>}
          dataRef={item}
                >
          {this.renderTreeNodes(item.children)}
        </Tree.TreeNode>)
      }
      return (
        <Tree.TreeNode
          {...props}
          title={<Tooltip title={props.title} placement="top">{props.title}</Tooltip>}
          dataRef={item}
        />)
    });
  }

  onDrop = (info) => {
    const dropKey = info.node.props.eventKey
    const dragKey = info.dragNode.props.eventKey
    if (dragKey.length <= 1) {
      message.error('一级节点不允许修改')
      return
    }
    const dropPos = info.node.props.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]) 
    const loop = (data, key, callback) => {
      data.forEach((item, index, arr) => {
        if (item.id === key) {
          return callback(item, index, arr)
        }
        if (item.children) {
          return loop(item.children, key, callback)
        }
      })
    }
    const { categoryInfo: data } = this.state
    let dragObj
    loop(data, dragKey, (item, index, arr) => {
      if (dropPos.length <= 2) {
        return
      }
      arr.splice(index, 1)
      dragObj = item
    })
    if (info.dropToGap) {
      let ar = []
      let i = 0
      loop(data, dropKey, (item, index, arr) => {
        if (!dragObj) {
          return
        }
        ar = arr
        i = index
        dragObj.parent_id = _.get(item, 'parent_id') // diff: reset parent
        dragObj.type = item.type
      })
      if (!dragObj || !dragObj.parent_id) {
        message.error('一级节点不允许修改')
        return
      }
      if (dropPosition === -1) {
        dragObj.order = i
        ar.splice(i, 0, dragObj)
      } else {
        dragObj.order = i + 1
        ar.splice(i + 1, 0, dragObj)
      }
      this.customOrder = _.concat(this.customOrder.filter(p => p.id !== dragObj.id), dragObj)

    } else {
      loop(data, dropKey, (item, index, arr) => {
        item.children = item.children || []
        // where to insert 示例添加到尾部，可以是随意位置
        dragObj.parent_id = item.id // diff: set parent
        dragObj.type = item.type
        dragObj.order = index
        item.children.push(dragObj)
      })
      this.customOrder = _.concat(this.customOrder.filter(p => p.id !== dragObj.id), dragObj)
    }
    this.setState({ categoryInfo: data })
  }

  settingOrder = async (draggable, commit) => {
    const { projectCurrent = {} } = this.props
    const { dashboardsCategory } = this.state
    if (draggable && this.customOrder.length && commit) {
      const ids = this.customOrder.map(p => p.id)
      let res = await Fetch.post('/app/dashboards-category/saveOrder', { orders: this.customOrder })
      if (res.success) {
        this.setState({ dashboardsCategory: [...dashboardsCategory.filter(p => !ids.includes(p.id)), ...this.customOrder] })
        message.success('保存成功')
        this.customOrder = []
      } else {
        message.error('保存失败')
      }
    }
    if (!commit) {
      this.setState({ categoryInfo: buildCategory(this.state.dashboardsCategory, projectCurrent.id) })
      this.customOrder = []
    }
    this.setState({ draggable: !draggable })
  }

  renderContent = () => {
    let { getFieldDecorator, getFieldValue, resetFields } = this.props.form
    let { projectCurrent = {} } = this.props
    let { dashboards = [], selectCategory, categoryInfo = [], expandedKeys = [], parentCategory, draggable, dashboardsCategory } = this.state
    let category = dashboardsCategory.find(p => p.id === selectCategory) || {}
    const parentId = getFieldValue('parent_id')
    if (_.isEmpty(category) && parentId) {
      category.type = (parentId.length === 1)
        ? _.toNumber(parentId)
        : (dashboardsCategory.find(p => p.id === parentId) || {}).type
    } else if (category.parent_id === '') {
      category.parent_id = category.type.toString()
    }
    const hasCategory = _.flatten(dashboardsCategory
      .filter(p => p.id !== selectCategory && (p.type === 0 || (p.project_id === projectCurrent.id && p.type === 1)))
      .map(p => p.dashboards))
    const dashboardMap = _.keyBy(dashboards, p => p.id)
    const noHasCategory = dashboards.map(p => p.id).filter((id)=>{
      return hasCategory.indexOf(id) === -1
    })
    return (
      <Row>
        <Col span={8} className="borderr">
          <div className="borderb pd1b pd1x">
            <a
              type="ghost"
              icon="close-circle-o"
              className="mg1r iblock"
              onClick={() => this.setState({ selectCategory: '', parentCategory: category.id ? _.find(dashboardsCategory, p => p.id === category.id) : {} })}
            ><PlusCircleOutlined className="mg1r font16" />添加分类</a>
            {
              draggable ? [
                <a type="ghost" className="mg1x font16 iblock fright" onClick={() => this.settingOrder(draggable, true)} >
                  <CheckCircleOutlined />
                </a>,
                <a type="ghost" className="mg1r font16 iblock fright" onClick={() => this.settingOrder(draggable, false)} >
                  <CloseCircleOutlined />
                </a>
              ]
                : <a type="ghost" className="mg1r font16 iblock fright" onClick={() => this.settingOrder(draggable)} >
                  <SettingOutlined />
                </a>
            }
          </div>
          <div className="always-display-scrollbar category-panel">

            <Tree
              showIcon
              expandedKeys={expandedKeys}
              selectedKeys={[selectCategory]}
              defaultExpandedKeys={['']}
              defaultSelectedKeys={['']}
              onSelect={selectedKeys => {
                this.setState({ selectCategory: selectedKeys[0], parentCategory: {} })
                resetFields()
              }}
              onExpand={expandedKeys => { this.setState({ expandedKeys }) }}
              draggable={draggable}
              onDrop={draggable ? this.onDrop : _.noop}
            >
              {this.renderTreeNodes(categoryInfo)}
            </Tree>
          </div>
        </Col>
        <Col span={16}>
          <Form>
            <FormItem {...formItemLayout} label="分类名称" hasFeedback>
              {getFieldDecorator('title', {
                rules: [{
                  required: true,
                  message: '请输入分类名称',
                  whitespace: true
                }, {
                  min: 1,
                  max: 50,
                  type: 'string',
                  message: '1~50个字符'
                }],
                initialValue: category.title
              })(
                <Input type="text" />
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="父分类">
              {getFieldDecorator('parent_id', {
                rules: [{
                  required: true,
                  message: '请选择分类'
                }],
                initialValue: category.parent_id || _.get(parentCategory, 'id', '0')
              })(
                <RadioGroup>
                  <Radio value="0">全局分类</Radio>
                  {//农商行需要隐藏
                    !window.sugo.enableDataChecking 
                    ? <Radio value="1">项目分类</Radio> 
                    : null
                  }
                  {
                    !category.id && !_.isEmpty(parentCategory)
                      ? <Radio value={parentCategory.id}>{_.get(parentCategory, 'title', '')}</Radio>
                      : null
                  }
                  {
                    category.parent_id && category.parent_id !== '0' && category.parent_id !== '1'
                      ? <Radio value={category.parent_id}>{_.get(_.find(dashboardsCategory, p => p.id === category.parent_id), 'title', '')}</Radio>
                      : null
                  }
                </RadioGroup>
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="选择看板">
              {getFieldDecorator('dashboards', {
                initialValue: category.dashboards
              })(
                <Select
                  mode="multiple"
                >
                  {
                    noHasCategory.map((p, i) => {
                      const { id, dashboard_title, params: { allowAddSlicesCrossProjects = true } } = _.get(dashboardMap, p, {})
                      if (allowAddSlicesCrossProjects === !category.type) {
                        return <Option key={'dash' + i} value={id}>{dashboard_title}</Option>
                      }
                      return null
                    })
                  }
                </Select>
              )}
            </FormItem>
            {
              this.renderFooter()
            }
          </Form>
        </Col>
      </Row>
    );
  }

  renderFooter = () => {
    let { selectCategory, loading } = this.state
    const { hide } = this.props
    let text = selectCategory ? '修改' : '保存'
    return (
      <div className="alignright">
        <Button
          type="success"
          icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={this.onSubmit}
          disabled={loading}
        >{loading ? '提交中...' : text}</Button>
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={() => {
            hide()
            this.setState({ selectedKeys: '', draggable: false })
          }}
        >取消</Button>
        {selectCategory ? <Button
          type="error"
          icon={<DeleteOutlined />}
          className="mg1r iblock"
          onClick={this.onDel}
          disabled={loading}
        >删除</Button> : null
        }
      </div>
    );
  }

  render() {
    let { setCategoryVisable: visible, hide } = this.props
    let title = '分类管理'
    return (
      <Modal
        visible={visible}
        onCancel={() => {
          hide()
          this.props.form.resetFields()
          this.setState({ selectedKeys: '', draggable: false })
        }}
        title={title}
        footer={null}
        width={700}
        className="dash-category-modal"
      >
        {this.renderContent()}
      </Modal>
    )
  }
}
