import React from 'react'
import { CloseCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, Select, Button, Slider, Col, InputNumber, Tooltip } from 'antd';
import { validateFieldsAndScroll } from '../../common/decorators'
import _ from 'lodash'
import './index.styl'
import setStatePromise from '../../common/set-state-promise'
import arrowUp from '../../images/arrow-up.png'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 17 }
}

@Form.create()
@validateFieldsAndScroll
@setStatePromise
export default class EditTagValueEnhance extends React.Component {
  state = {
    selectTagType: '',
    selectTagValue: 0,
    selectTagFromIndex: 0,
    selectTagToIndex: 0
  }

  constructor(props) {
    super(props)
  }

  componentWillMount() {
    const { model, selectTagChildren } = this.props
    if (model && model.id) {
      const selectTagFromIndex = selectTagChildren.findIndex(p => p.title === model.tag_from)
      const selectTagToIndex = selectTagChildren.findIndex(p => p.title === model.tag_to)
      this.setState({
        selectTagValue: selectTagChildren[selectTagFromIndex].count,
        selectTagFromIndex,
        selectTagToIndex
      }, this.reset)
    }
  }

  componentWillReceiveProps(nextProps) {
    const { model } = this.props
    if (nextProps.model && !_.isEqual(model, nextProps.model) && nextProps.model.tag_from) {
      const selectTagFromIndex = nextProps.selectTagChildren.findIndex(p => p.title === nextProps.model.tag_from)
      const selectTagToIndex = nextProps.selectTagChildren.findIndex(p => p.title === nextProps.model.tag_to)
      this.setState({
        selectTagValue: nextProps.selectTagChildren[selectTagFromIndex].count,
        selectTagFromIndex,
        selectTagToIndex
      }, this.reset)
    }
  }

  reset = () => {
    this.props.form.resetFields()
  }

  renderName = () => {
    const { form, model } = this.props
    const { getFieldDecorator } = form
    return (
      <FormItem {...formItemLayout} label="升档名称" hasFeedback>
        {getFieldDecorator('name', {
          rules: [{
            required: true,
            message: '请输入升档名称'
          }, {
            min: 1,
            max: 50,
            type: 'string',
            message: '1~50个字符'
          }],
          initialValue: model.name
        })(
          <Input type="text" />
        )}
      </FormItem>
    )
  }

  renderTageType = () => {
    let { tagTypes, form, model, dimensions, getTagChildren } = this.props
    tagTypes = _.cloneDeep(tagTypes)
    const { getFieldDecorator, setFieldsValue } = form
    const { selectTagType } = this.state
    const dimensionMap = _.keyBy(dimensions, p => p.id)
    const dimension = dimensions.find(p => p.name === model.tag) || {}
    let tagType = _.flatten(_.values(tagTypes)).find(p => p.dimension_id === dimension.id)
    if (tagType) {
      tagType = tagType.type
    } else {
      tagType = '所有分类'
    }
    tagTypes['所有分类'] = dimensions.map(p => ({ dimension_id: p.id, type: '所有分类' }))
    let tagList = tagTypes[selectTagType || tagType] || []
    return (
      <FormItem {...formItemLayout} label="升档标签所属类别">
        <Col span={11}>
          <FormItem hasFeedback>
            {getFieldDecorator('tag_type', {
              rules: [{
                required: true,
                message: '请选择升档标签所属类别'
              }],
              initialValue: tagType
            })(
              <Select
                onChange={(val) => {
                  this.setState({ selectTagType: val })
                  setFieldsValue({ tag: '', tag_from: '', tag_to: '', topn: 1 })
                }}
              >
                {
                  _.keys(tagTypes).map((p, i) => {
                    return (
                      <Select.Option
                        key={'tagType' + i}
                        value={p}
                      >
                        {p}
                      </Select.Option>
                    )
                  })
                }
              </Select>)}
          </FormItem>
        </Col>
        <Col span={1} />
        <Col span={12}>
          <FormItem hasFeedback>
            {getFieldDecorator('tag', {
              rules: [{
                required: true,
                message: '请选择升档标签'
              }],
              initialValue: model.tag
            })(
              <Select
                onChange={(val) => {
                  getTagChildren(val)
                  setFieldsValue({ tag_from: '', tag_to: '', topn: 1 })
                }}
              >
                {
                  tagList.map((p, i) => {
                    return (<Select.Option key={'tag' + i} value={dimensionMap[p.dimension_id].name}>
                      {
                        dimensionMap[p.dimension_id].title || dimensionMap[p.dimension_id].name
                      }
                    </Select.Option>)
                  })
                }
              </Select>)}
          </FormItem>
        </Col>
      </FormItem>
    )
  }

  changeTagFrom = async (val) => {
    const { form, selectTagChildren } = this.props
    const { setFieldsValue } = form
    const obj = selectTagChildren.find(p => p.title === val)
    await this.setStatePromise(
      {
        selectTagValue: obj.count || 1,
        selectTagFromIndex: _.findIndex(selectTagChildren, p => p.title === val)
      }
    )
    const count = Math.round(obj.count * 0.7)
    setFieldsValue({ topn: count })
  }

  renderTagFrom = () => {
    const { form, model, selectTagChildren, quering } = this.props
    const { selectTagToIndex } = this.state
    const tags = _.slice(selectTagChildren, 0, selectTagToIndex || selectTagChildren.length)
    const { getFieldDecorator } = form
    return (
      <FormItem
        {...formItemLayout}
        label="选择低档位标签"
        hasFeedback
        validateStatus={quering ? 'validating' : ''}
      >
        {getFieldDecorator('tag_from', {
          rules: [{
            required: true,
            message: '请选择低档位标签'
          }],
          initialValue: model.tag_from
        })(
          <Select
            onChange={this.changeTagFrom}
          >
            {
              tags.map((p, i) => {
                return (
                  <Select.Option
                    key={'tagType' + i}
                    value={p.title}
                  >
                    {p.title}
                  </Select.Option>
                )
              })
            }
          </Select>)}
      </FormItem>
    )
  }

  renderTagTo = () => {
    const { form, model, selectTagChildren, quering } = this.props
    const { getFieldDecorator, setFieldsValue } = form
    const { selectTagFromIndex } = this.state
    const tags = _.slice(selectTagChildren, selectTagFromIndex)
    return (
      <FormItem
        {...formItemLayout}
        label="选择高档位标签"
        hasFeedback
        className="mg1b"
        validateStatus={quering ? 'validating' : ''}
      >
        {getFieldDecorator('tag_to', {
          rules: [{
            required: true,
            message: '请选择高档位标签'
          }],
          initialValue: model.tag_to
        })(
          <Select
            onChange={(val) => {
              setFieldsValue({ tag_from: '' })
              setFieldsValue({ topn: 1 })
              this.setState({ selectTagToIndex: _.findIndex(selectTagChildren, p => p.title === val) })
            }}
          >
            {
              tags.map((p, i) => {
                return (
                  <Select.Option
                    key={'tagType' + i}
                    value={p.title}
                  >
                    {p.title}
                  </Select.Option>
                )
              })
            }
          </Select>)}
      </FormItem>
    )
  }

  renderEnhanceNumber = () => {
    const { model, form } = this.props
    const { getFieldDecorator } = form
    const { selectTagValue } = this.state
    const label = (
      <Tooltip
        title="选择要挖掘的潜在用户数，默认为全量挖掘，按升档潜力从高到低将用户排序"
        placement="right"
      >
        <QuestionCircleOutlined className="font14 color-grey pointer hover-color-red" />
        潜在目标用户数
      </Tooltip>
    )
    return (
      <FormItem {...formItemLayout} label={label}>
        <Col span={20}>
          <FormItem>
            {getFieldDecorator('topn', {
              initialValue: model.topn
            })(
              <Slider
                min={1}
                max={selectTagValue}
              />
            )}
          </FormItem>
        </Col>
        <Col span={4}>
          <FormItem>
            {getFieldDecorator('topn', {
              initialValue: model.topn
            })(
              <InputNumber
                min={1}
                max={selectTagValue}
              />
            )}
          </FormItem>
        </Col>
      </FormItem>
    )
  }

  onSubmit = async () => {
    const { saveTagEnhance } = this.props
    let values = await this.validateFieldsAndScroll()
    if (!values) return
    saveTagEnhance(values)
  }

  hide = () => {
    const { changeState } = this.props
    changeState({ addPanelVisible: false })
  }

  renderFooter = (loading, id) => {
    let text = id ? '修改' : '提交'
    return (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={this.hide}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={this.onSubmit}
          disabled={loading}
        >{loading ? '提交中...' : text}</Button>
      </div>
    );
  }

  render() {
    let { model, addPanelVisible, loading } = this.props
    let title = (
      <div>
        {model.id ? '编辑分析' : '创建分析'}
      </div>
    )
    return (
      <Modal
        visible={addPanelVisible}
        onCancel={this.hide}
        title={title}
        footer={this.renderFooter(loading, model.id)}
        width={700}
      >
        <Form>
          {this.renderName()}
          {this.renderTageType()}
          {this.renderTagTo()}
          <div className="tag-enhance-edit-arrows">
            <img className="tag-enhance-edit-arrows-img" src={arrowUp} />
            <div className="tag-enhance-edit-arrows-text itblock">
              挖掘升档的潜在用户
            </div>
          </div>
          {this.renderTagFrom()}
          {this.renderEnhanceNumber()}
        </Form>
      </Modal>
    )
  }
}
