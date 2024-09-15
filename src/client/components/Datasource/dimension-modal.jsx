import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Button, Modal, Select, Spin, message, Checkbox, Radio } from 'antd'
import _ from 'lodash'
import { validateFields } from '../../common/decorators'
import { getDimensions, addDimension, editDimension, validDimensionFormula } from '../../databus/datasource'
import AuthSelect from './auth-select'
import DruidColumnType, { isNumberDimension, MultipleValuesTypeOffset } from '../../../common/druid-column-type'
import DimensionCalcPanel from './dimension-calc-panel'
import DimensionGroupPanel from './dimension-group-panel'
import DimensionCastPanel from './dimension-cast-panel'
import DimensionBusinessPanel from './dimension-business-panel'
import helpMap from 'common/help-link-map'
import Icon from '../Common/sugo-icon'
import { docUrl } from '../Home/common'
import { DataSourceType } from '../../../common/constants'
import { Auth } from '../../common/permission-control'
import { dimensionParamTypes } from '../../../common/dimension-params-type'
import { Anchor } from '../Common/anchor-custom'

const Option = Select.Option
const createForm = Form.create
const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const FormItem = Form.Item
const { menus } = window.sugo
const showBusinessSetting = _.some(menus, p => _.some(p.children, i => i.path === '/console/business-db-setting'))
// const SubMenu = Menu.SubMenu
// 多值列
//  LongArray: 100,
//  FloatArray: 101,
//  StringArray: 102,
//  DateArray: 104,
//  IntArray: 105,
//  DoubleArray: 107,
// 只允许添加字符串类型的多值列，排除其他类型
const excludeMultiValueTypes = [100, 101, 104, 105, 107]

const dimensionTypes = Object.keys(DruidColumnType)
  .filter(type => type !== 'DateString' && !excludeMultiValueTypes.includes(DruidColumnType[type]))
  .map(key => {
    return {
      title: key,
      value: DruidColumnType[key]
    }
  })

@validateFields
export class DimensionModal extends React.Component {
  constructor(props) {
    let { dimension } = props
    super(props)
    this.state = {
      loading: false,
      loadingInfo: false,
      dimension: dimension,
      selectedTags: dimension.tags
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.dimension, this.props.dimension)) {
      this.setState(
        {
          dimension: nextProps.dimension
        },
        () => this.props.form.resetFields()
      )
    }
  }

  datasource_type = 'default'

  // componentDidUpdate(prevProps, prevState) {
  //   // 如果是计算维度，如果之前选了string 或者 date，就切换成Int
  //   let prevDimType = _.get(prevState, 'dimension.params.type') || ''
  //   let currDimType = _.get(this.state, 'dimension.params.type') || ''
  //   if (
  //     prevDimType !== currDimType &&
  //     currDimType === dimensionParamTypes.calc.type) {
  //     this.props.form.
  //   }
  // }

  validateName = _.throttle(async (rule, name, callback = () => null) => {
    let { datasource } = this.props
    let { dimension } = this.state
    if (_.isEmpty(name)) {
      return callback()
    }
    let res = await getDimensions(datasource.id, {
      limit: 1,
      name: encodeURIComponent(name),
      datasource_type: this.datasource_type
    })
    if (!res) {
      return callback('出错了')
    }
    if ((res.data.length > 0 && !dimension.id) || (res.data.length > 0 && dimension.id !== res.data[0].id)) {
      callback('已经被占用，换一个吧')
    } else callback()
  }, 100)

  validateFormula = _.throttle(async (rule, formula, callback = () => null) => {
    if (!this.props.dimension.type === 0 || !formula) {
      return callback()
    }
    let {
      datasource: { id: parentId }
    } = this.props
    let result = await validDimensionFormula({ formula, parentId })
    if (result && !result.error) {
      callback()
    } else {
      callback(result ? result.error : '出错了')
    }
  }, 1000)

  onTagClick = e => {
    let { selectedTags } = this.state
    let type = e.target.checked
    let value = e.target.value
    if (type) {
      //add selected tag
      selectedTags = _.concat(selectedTags, value)
    } else {
      //remove selected tag
      _.remove(selectedTags, function (d) {
        return d === value
      })
    }

    this.setState({
      selectedTags
    })
  }

  //维度编辑模式更改
  onChangeEditMode = e => {
    const type = e.target.value
    let { dimension } = this.state
    dimension.params.type = type
    const { setFieldsValue, getFieldValue } = this.props.form
    let oldType = getFieldValue('type')
    if (type === dimensionParamTypes.group.type || type === dimensionParamTypes.business.type) {
      setFieldsValue({
        type: DruidColumnType.String + ''
      })
    }
    if (
      (type === dimensionParamTypes.calc.type || type === dimensionParamTypes.cast.type) &&
      !isNumberDimension({
        type: oldType
      })
    ) {
      const { setFieldsValue } = this.props.form
      setFieldsValue({
        type: DruidColumnType.Float + ''
      })
    }
    this.setState({
      dimension
    })
  }

  submit = async () => {
    let values = await this.validateFields()
    if (!values) return
    if (this.props.isInstitution && values.is_institutions) return message.error('只能有一个维度为机构维度')
    let { dimension, selectedTags } = this.state
    const { is_institutions = false } = values
    if (dimension.params.type === dimensionParamTypes.group.type) {
      let ok = this.dimensionGroupPanel.checkAllGroupFilter(dimension.params.groupFilters, dimension.params.dimension)
      if (ok) return message.warn(ok)
    }
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
      tags: selectedTags,
      sourceName: datasource.name,
      isUindex: datasource.type === DataSourceType.Uindex
    })
    // 普通类型的不保存params字段
    if (dimension.params.type && dimension.params.type !== dimensionParamTypes.normal.type) {
      Object.assign(values, {
        params: dimension.params
      })
    } else {
      Object.assign(values, {
        params: {
          isInstitution: is_institutions
        }
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

  onClick = role => {
    let { dimension } = this.state
    let { role_ids } = dimension
    let { id } = role
    let update = _.cloneDeep(dimension)
    if (role_ids.includes(id)) {
      update.role_ids = role_ids.filter(rid => rid !== id)
    } else {
      update.role_ids = role_ids.concat(id)
    }
    this.setState({
      dimension: update
    })
  }

  render() {
    let { loading, selectedTags } = this.state
    const dimension = _.cloneDeep(this.state.dimension)
    let { dimensions, modalVisible, hideModal, datasource, roles, tags, project } = this.props
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
    let { title, name, id, type, params = {} } = dimension
    const { getFieldDecorator } = this.props.form
    let dimensionType = params.type || dimensionParamTypes.normal.type
    const isInstitutions = _.get(params, 'isInstitution', false)
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
    //过滤不需要的维度
    const baseDimensions = _.filter(dimensions, dim => {
      // 过滤掉复合维度
      // return _.isEmpty(dim.params) || dim.params.type === 'normal'
      // 过滤未上报的维度
      return dim.is_druid_dimension
    })
    // console.log(baseDimensions.length)

    let canEdit = !id || (id && !dimension.is_druid_dimension)

    const paramViewProps = {
      ...this.props,
      dimension,
      dimensions: baseDimensions,
      updateDimensionParams: value => {
        dimension.params = value
        return new Promise(resolve => {
          this.setState(
            {
              dimension
            },
            () => resolve()
          )
        })
      },
      formItemLayout,
      getFieldDecorator,
      disabled: !canEdit,
      project
    }

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

    // 分组模式和普通模式需要的宽度不一样
    /*const modelWidth = (dimension.params
                        && dimension.params.type === 'group'
                        && dimension.params.dimension
                        && !isTimeDimension(dimension.params.dimension)
                      )
                        ? 680
                        : 600*/
    let ModalTitle = (
      <div>
        {id ? '编辑维度' : '创建维度'}
        <Anchor href={docUrl + helpMap['/console/dimension#create']} className='mg1l' title='前往查看维度帮助文档' target='_blank'>
          <Icon type='sugo-help' />
        </Anchor>
      </div>
    )
    return (
      <Modal title={ModalTitle} visible={modalVisible} width={720} footer={footer} onCancel={hideModal} maskClosable={false} className='dimension-model'>
        <Spin spinning={loading}>
          <Form layout='horizontal' onSubmit={this.submit}>
            <FormItem {...formItemLayout} label='名称' hasFeedback>
              {getFieldDecorator('name', {
                rules: nameRules,
                initialValue: name
              })(<Input type='text' autoComplete='off' disabled={!canEdit} />)}
            </FormItem>
            <FormItem {...formItemLayout} label='别名' hasFeedback>
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

            <FormItem {...formItemLayout} label='创建方式'>
              <RadioGroup onChange={this.onChangeEditMode} value={dimensionType} disabled={!canEdit}>
                <RadioButton value={dimensionParamTypes.normal.type}>{dimensionParamTypes.normal.name}</RadioButton>
                <RadioButton value={dimensionParamTypes.calc.type}>
                  <Icon type='calculator' /> {dimensionParamTypes.calc.name}
                </RadioButton>
                <RadioButton value={dimensionParamTypes.group.type}>
                  <Icon type='team' /> {dimensionParamTypes.group.name}
                </RadioButton>
                <RadioButton value={dimensionParamTypes.cast.type}>
                  <Icon type='calculator' /> {dimensionParamTypes.cast.name}
                </RadioButton>
                {showBusinessSetting ? (
                  <RadioButton value={dimensionParamTypes.business.type}>
                    <Icon type='database' /> {dimensionParamTypes.business.name}
                  </RadioButton>
                ) : null}
              </RadioGroup>
            </FormItem>
            <FormItem {...formItemLayout} label={dimensionParamTypes.cast.type === dimensionType ? '目标类型' : '类型'}>
              {getFieldDecorator('type', {
                initialValue: type + ''
              })(
                <Select dropdownMatchSelectWidth={false} disabled={editFlag}>
                  {dimensionTypes
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
            {
              //防止使用form验证之后自动高亮内部Input
              dimensionType === dimensionParamTypes.calc.type && <DimensionCalcPanel {...paramViewProps} validateFormula={this.validateFormula} />
            }
            {dimensionType === dimensionParamTypes.group.type && <DimensionGroupPanel {...paramViewProps} ref={ref => (this.dimensionGroupPanel = ref)} />}
            {dimensionType === dimensionParamTypes.cast.type && <DimensionCastPanel {...paramViewProps} />}
            {dimensionType === dimensionParamTypes.business.type && showBusinessSetting ? <DimensionBusinessPanel {...paramViewProps} /> : null}
            <FormItem {...formItemLayout} label='分组' hasFeedback>
              {tags.map((d, i) => {
                return (
                  <Checkbox key={i + ''} checked={selectedTags.includes(d.id)} onChange={this.onTagClick} value={d.id}>
                    {d.name}
                  </Checkbox>
                )
              })}
              {_.isEmpty(tags) && '还没有分组'}
            </FormItem>
            {(dimension.params.type === dimensionParamTypes.normal.type || !dimension.params.type) && _.get(window.sugo, 'enableExternalDataSourcesInstitutions', false) ? (
              <FormItem {...formItemLayout} label='机构字段'>
                {getFieldDecorator('is_institutions', {
                  initialValue: isInstitutions || false
                })(
                  <RadioGroup>
                    <Radio key='rdo-base-2' value>
                      是
                    </Radio>
                    <Radio key='rdo-base-1' value={false}>
                      否
                    </Radio>
                  </RadioGroup>
                )}
              </FormItem>
            ) : (
              false
            )}

            <Auth auth='/app/dimension/authorize'>
              <FormItem {...formItemLayout} label='授权访问'>
                <AuthSelect roles={roles} dataSourceRoles={datasource.role_ids} record={dimension} onClick={this.onClick} />
              </FormItem>
            </Auth>
          </Form>
        </Spin>
      </Modal>
    )
  }
}

export default createForm()(DimensionModal)
