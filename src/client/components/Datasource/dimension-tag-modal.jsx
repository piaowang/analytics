import { CloseCircleOutlined } from '@ant-design/icons'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Button, Modal, Select, Spin, message, Radio, Tooltip } from 'antd'
import _ from 'lodash'
import { validateFieldsAndScroll } from '../../common/decorators'
import { addDimension, editDimension, getDimensions } from '../../databus/datasource'
import AuthSelect from './auth-select'
import DruidColumnType from '../../../common/druid-column-type'
import helpMap from 'common/help-link-map'
import Icon from '../Common/sugo-icon'
import { docUrl } from '../Home/common'
import { DataSourceType } from '../../../common/constants'
import { DimensionModal } from './dimension-modal'
import Fetch from '../../common/fetch-final'
import realNameBuilder from '../../../common/uindex-dimension-name-builder'
import { dimensionParamTypes } from '../../../common/dimension-params-type'
import { Anchor } from '../Common/anchor-custom'

const Option = Select.Option
const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const FormItem = Form.Item

const dimensionTypes = Object.keys(DruidColumnType)
  .filter(type => type !== 'DateString')
  .map(key => {
    return {
      title: key,
      value: DruidColumnType[key]
    }
  })

/**
 * @description 标签体系管理-添加标签
 * @export
 * @class DimensionTagModal
 * @extends {React.Component}
 */

@Form.create()
@validateFieldsAndScroll
export default class DimensionTagModal extends DimensionModal {
  componentWillMount() {
    this.initData()
  }

  datasource_type = 'tag'
  validateName = _.throttle(async (rule, name, callback = () => null) => {
    let { datasource } = this.props
    let { dimension } = this.state
    let formType = this.props.form.getFieldValue('type') || ''
    let realName = realNameBuilder(name, formType)
    if (_.isEmpty(name)) {
      return callback()
    }
    let res = await getDimensions(datasource.id, {
      limit: 1,
      name: encodeURIComponent(realName),
      datasource_type: this.datasource_type
    })
    if (!res) {
      return callback('出错了')
    }
    if ((res.data.length > 0 && !dimension.id) || (res.data.length > 0 && dimension.id !== res.data[0].id)) {
      callback('已经被占用，换一个吧')
    } else callback()
  }, 100)

  //编辑维度时候需要获取维度对应的所有标签信息
  initData = async () => {
    let { id, name } = this.state.dimension
    if (!id) {
      return
    }
    this.setState({
      loadingInfo: true
    })
    let project_id = this.props.project.id
    let dimensionTagInfo = await Fetch.get('/app/tag-dict/get-tag-info', {
      name,
      project_id
    })
    if (!dimensionTagInfo) {
      return this.setState({
        loadingInfo: false
      })
    }
    let infos = _.get(dimensionTagInfo, 'result') || []
    let tag_value = infos.reduce((prev, v) => {
      return prev + v.title + '=' + v.tag_value + '\n'
    }, '')
    let sub_type = _.get(infos, '[0].sub_type')
    this.setState(old => {
      old.dimension.tag_value = tag_value
      old.dimension.sub_type = sub_type
      old.loadingInfo = false
      return old
    })
  }

  submit = async () => {
    let values = await this.validateFieldsAndScroll()
    if (!values) return
    let { dimension, selectedTags } = this.state
    Object.assign(values, _.pick(dimension, ['user_ids', 'role_ids']))
    let { datasource, hideModal, setProp } = this.props
    let did = dimension.id
    let func = !did ? addDimension : editDimension
    let id = did ? did : datasource.id
    if (values.type) values.type = parseInt(values.type, 10)
    this.setState({
      loading: true
    })
    Object.assign(values, {
      // 新增时前端数据库直接存真实列名，避免同步维度后名称发生变化
      name: did ? dimension.name : realNameBuilder(values.name, values.type),
      tags: selectedTags,
      sub_type: parseInt(values.sub_type, 10),
      sourceName: datasource.name,
      datasource_type: this.datasource_type,
      isUindex: datasource.type === DataSourceType.Uindex
    })
    // 普通类型的不保存params字段
    if (dimension.params.type !== dimensionParamTypes.normal.type) {
      Object.assign(values, {
        params: dimension.params
      })
    }
    let res = await func(id, values)
    this.setState({
      loading: false
    })
    if (!res) return
    if (did) {
      message.success('更新成功', 2)
      setProp({
        type: 'update_dimensions',
        data: {
          id: did,
          ...values
        }
      })
      setProp({
        type: 'update_originDimensions',
        data: {
          id: did,
          ...values
        }
      })
    } else {
      message.success('添加成功', 2)
      setProp({
        type: 'add_dimensions',
        data: res.result
      })
      setProp({
        type: 'add_originDimensions',
        data: res.result
      })
    }
    this.props.form.resetFields()
    hideModal()
  }

  render() {
    let { loading, loadingInfo } = this.state
    const dimension = _.cloneDeep(this.state.dimension || {})
    let { modalVisible, hideModal, datasource, roles } = this.props
    let footer = (
      <div className='alignright'>
        <Button type='ghost' icon={<CloseCircleOutlined />} className='mg1r iblock' onClick={hideModal}>
          取消
        </Button>
        <Button type='success' icon={<LegacyIcon type={loading ? 'loading' : 'check'} />} className='mg1r iblock' onClick={this.submit}>
          {loading ? '提交中...' : '提交'}
        </Button>
      </div>
    )
    let { title, name, id, type, params = {}, sub_type = 1, tag_desc, tag_value } = dimension
    const { getFieldDecorator } = this.props.form
    let dimensionType = params.type || dimensionParamTypes.normal.type
    // let dimType = getFieldValue('type') || type
    let editFlag = !!id
    editFlag && (editFlag = dimension.is_druid_dimension)
    // 如果是分组维度，类型与所选的基本维度一致所以不可编辑
    !editFlag && (editFlag = dimensionType === dimensionParamTypes.group.type || dimensionType === dimensionParamTypes.business.type)
    // 如果是分组维度，类型与所选的基本维度一致所以不可编辑
    // 如果是分组维度，类型强制为string
    type = dimensionType === dimensionParamTypes.group.type ? DruidColumnType.String : type

    let formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 18 }
    }

    let canEdit = !id || (id && !dimension.is_druid_dimension)

    let nameRules = canEdit
      ? [
          {
            required: true,
            message: '维度名称不能为空，请键入字母或_ 开头 与字母、数字组合，且长度为2至50个字符'
          },
          {
            pattern: /^[_A-Za-z][\w]{1,49}$/i,
            message: '可用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位'
          },
          {
            validator: this.validateName,
            validateTrigger: 'onBlur'
          }
        ]
      : []
    let ModalTitle = (
      <div>
        {id ? '编辑标签' : '添加标签'}
        <Anchor href={docUrl + helpMap['/console/dimension#create']} className='mg1l' title='前往查看维度帮助文档' target='_blank'>
          <Icon type='sugo-help' />
        </Anchor>
      </div>
    )
    const holder = `列出标签可能的标题和取值，(每行为一组取值，等号前为标题，等号后为取值，取值以\`分割)
    当类型为数值时，应该输入分档值，例如：
    青年=15\`30
    中年=30\`50
    老年=50\`
    若为字符类型，则输入可能的取值，例如：
    东南=广东省,福建省
    吉林=吉林省
    如果标题与取值一致，也可以省略标题，例如：
    广东省
    福建省
    `
    const tooltipTitle = (
      <div>
        {holder.split('\n').map(t => (
          <p>{t}</p>
        ))}
      </div>
    )
    let formType = this.props.form.getFieldValue('type') || ''
    let formName = this.props.form.getFieldValue('name') || ''
    return (
      <Modal title={ModalTitle} visible={modalVisible} width={720} footer={footer} onCancel={hideModal} className='dimension-model'>
        <Spin spinning={loading || loadingInfo}>
          <Form layout='horizontal' onSubmit={this.submit}>
            <FormItem {...formItemLayout} label='名称(英文)' hasFeedback>
              {getFieldDecorator('name', {
                rules: nameRules,
                initialValue: name
              })(<Input type='text' autoComplete='off' disabled={!canEdit} />)}
            </FormItem>
            <FormItem {...formItemLayout} label='别名(中文)' hasFeedback>
              {getFieldDecorator('title', {
                rules: [
                  {
                    min: 1,
                    max: 50,
                    type: 'string',
                    message: '1~50个字符，可以是中文'
                  }
                ],
                initialValue: title
              })(<Input type='text' autoComplete='off' />)}
            </FormItem>
            <FormItem {...formItemLayout} label={dimensionParamTypes.cast.type === dimensionType ? '目标类型' : '标签类型'}>
              {getFieldDecorator('type', {
                initialValue: type + ''
              })(
                <Select dropdownMatchSelectWidth={false} disabled={editFlag}>
                  {dimensionTypes
                    .filter(t => ![DruidColumnType.Text, DruidColumnType.BigDecimal, DruidColumnType.Date, DruidColumnType.DateString].includes(t.value))
                    .filter(t => {
                      const { value } = t
                      if (dimensionType === dimensionParamTypes.calc.type || dimensionType === dimensionParamTypes.cast.type) {
                        return value !== DruidColumnType.Date && value !== DruidColumnType.String && value !== DruidColumnType.Text && value !== DruidColumnType.StringArray
                      }
                      return true
                    })
                    .map((t, i) => {
                      let { value, title } = t
                      return (
                        <Option value={value + ''} key={i + 'dt'}>
                          {title}
                        </Option>
                      )
                    })}
                </Select>
              )}
            </FormItem>
            <FormItem {...formItemLayout} label='子标签类型'>
              {getFieldDecorator('sub_type', {
                initialValue: sub_type + ''
              })(
                <RadioGroup>
                  <RadioButton value='1'>数值</RadioButton>
                  <RadioButton value='2'>字符</RadioButton>
                </RadioGroup>
              )}
            </FormItem>
            <FormItem {...formItemLayout} label='真实列名'>
              {id ? formName : realNameBuilder(formName, formType)}
            </FormItem>
            <FormItem
              {...formItemLayout}
              label={
                <span>
                  标题和取值&nbsp;
                  <Tooltip title={tooltipTitle}>
                    <Icon type='question-circle-o' />
                  </Tooltip>
                </span>
              }
            >
              {getFieldDecorator('tag_value', {
                rules: [
                  {
                    required: true,
                    message: '取值不能为空'
                  }
                ],
                initialValue: tag_value
              })(<Input.TextArea rows={5} placeholder={holder} />)}
            </FormItem>
            <FormItem {...formItemLayout} label='业务规则描述'>
              {getFieldDecorator('tag_desc', {
                initialValue: tag_desc
              })(<Input.TextArea rows={4} />)}
            </FormItem>
            <FormItem {...formItemLayout} label='授权访问'>
              <AuthSelect roles={roles} dataSourceRoles={datasource.role_ids} record={dimension} onClick={this.onClick} />
            </FormItem>
          </Form>
        </Spin>
      </Modal>
    )
  }
}
