import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Checkbox, Input, message, Modal, Radio, Select, Spin } from 'antd'
import _ from 'lodash'
import { addMeasure, editMeasure, validFormula } from '../../databus/datasource'
import { validateFields } from '../../common/decorators'
import AuthSelect from './auth-select'
import MeasureSimplePanel from './measure-simple-panel'
import MeasureCompositePanel from './measure-composite-panel'
import short_id from 'shortid'
import DruidColumnType, { DruidColumnTypeInverted } from '../../../common/druid-column-type'
import MeasureDirectModal from './measure-direct-panel'
import helpMap from 'common/help-link-map'
import Icon from '../Common/sugo-icon'
import { docUrl } from '../Home/common'
import { Auth } from '../../common/permission-control'
import copyTextToClipboard from '../../common/copy'
import { statisticsTypeList, statisticsTypeTextMap } from '../../common/constans'
import { Anchor } from '../Common/anchor-custom'

const createForm = Form.create
const FormItem = Form.Item
const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const Option = Select.Option

const relationTextMap = {
  or: '或者',
  and: '并且'
}

//数字指标过滤类型
const filterTypeTextMap = {
  is: '等于',
  isnt: '不等于',
  lessThan: '小于',
  lessThanOrEqual: '小于或等于',
  greaterThan: '大于',
  greaterThanOrEqual: '大于或等于',
  isEmpty: '值为空',
  notEmpty: '非空',
  between: '范围'
}

//string值的指标过滤类型
const strFilterTypeTextMap = {
  is: '等于',
  isnt: '不等于',
  in: '包含',
  notin: '不包含',
  isEmpty: '值为空',
  notEmpty: '值非空'
}

const noValueFilterTypelist = ['isEmpty', 'notEmpty']

//需要加维度的统计类型
const statisticsNeedDimList = ['max', 'min', 'sum', 'average', 'last', 'countDistinct']

//算术操作
const arithmeticTextMap = {
  add: '加上(+)',
  subtract: '减去(-)',
  multiply: '乘以(*)',
  divide: '除以(/)'
}

//公式编辑模式
const formulaEditModeTextMap = {
  simple: '单指标高级编辑',
  composite: '复合指标高级编辑',
  direct: '直接编辑'
}

//指标结果格式化
const formulaPatternMap = {
  none: {
    text: '默认',
    value: 'none'
  },
  percentage: {
    text: '百分号',
    value: '.0%'
  },
  percentage1: {
    text: '百分号保留1位小数',
    value: '.1%'
  },
  percentage2: {
    text: '百分号保留2位小数',
    value: '.2%'
  },
  precision: {
    text: '保留整数',
    value: 'd'
  },
  precision1: {
    text: '保留1位小数',
    value: '.1f'
  },
  precision2: {
    text: '保留2位小数',
    value: '.2f'
  },
  precision4: {
    text: '保留4位小数',
    value: '.4f'
  }
}

//指标类型
export const measureTypeMap = {
  number: {
    title: '数值',
    value: 1
  },
  date: {
    title: '日期',
    value: 4
  },
  duration: {
    title: '停留时长',
    value: 5
  }
}

//用于提醒用户公式是由哪种模式生成
let savedFormulaMode

//查询字符串需加上引号 dataType 2:string类型， 0,1: 数字类型
function stringConvertor(data, dataType, action) {
  let result = ''
  let isStrFlag = dataType === 2

  if (_.isArray(data)) {
    let temp = ''
    data.map((d, i) => {
      isStrFlag && (d = `"${d}"`)
      i === 0 ? (temp += d) : (temp += ',' + d)
    })
    result = temp
  } else {
    if (isStrFlag) {
      result = `"${data}"`
    } else {
      result = data
    }
  }
  if (['in', 'notin'].includes(action)) {
    result = `[${result}]`
  }
  return result
}

//构建name-value的map，方便查询
function buildNameTree(slices) {
  return slices.reduce((before, slice) => {
    before[slice.name] = slice
    return before
  }, {})
}

@validateFields
class MeasureModal extends React.Component {
  constructor(props) {
    let formulaEditMode
    let { measure, dimensions } = props
    super(props)
    //兼容旧数据,只有id 没有params
    measure.id && _.isEmpty(measure.params) && (formulaEditMode = 'direct')
    //兼容旧数据，旧数据没有simple属性，
    if (!_.isEmpty(measure.params) && !measure.params.simple) {
      //旧数据 formulaEditMode 为 advance/simple ,需要重置
      measure.params.formulaEditMode && (formulaEditMode = 'direct')
    }
    //初始化数据
    measure.params = this.initParams(measure.params)
    formulaEditMode && (measure.params.formulaEditMode = formulaEditMode)
    //用于记录用户公式是用什么模式生成
    savedFormulaMode = measure.params.formulaEditMode
    this.state = {
      loading: false,
      measure: measure,
      //构建dimensions map
      dimensionTree: buildNameTree(dimensions),
      //统计类型对应的维度列表
      statisticsDimensions: dimensions,
      selectedTags: measure.tags
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.measure, this.props.measure)) {
      this.setState(
        {
          measure: nextProps.measure
        },
        () => this.props.form.resetFields()
      )
    }
  }

  modifier = (data, cb) => {
    this.setState(data, cb)
  }

  validateFormula = _.throttle(async (rule, formula, callback = () => null) => {
    if (!this.props.measure.type === 0 || !formula) {
      return callback()
    }
    let result = await validFormula({ formula })
    if (result && !result.error) {
      callback()
    } else {
      callback(result ? result.error : '出错了')
    }
  }, 100)

  validateGuiSimpleFormula = () => {
    let { params } = this.state.measure
    let { simple } = params
    let { filters } = simple
    let result = true
    let errMsg = ''
    let formErrors = {}

    //过滤条件不能为空
    if (filters.length > 0) {
      //过滤条件输入值不能为空
      filters.forEach(item => {
        item.filters.forEach(data => {
          //过滤类型为 非空或空值时不需要检测value
          if (data.dimensionName !== 'all' && !noValueFilterTypelist.includes(data.type)) {
            //数值类型会有默认value =0,跳过检测
            if (typeof data.value !== 'number' && _.isEmpty(data.value)) {
              result = false
              errMsg = '指标条件输入框不能为空'
            } else if (data.type === 'between') {
              if (data.value[1] < data.value[0]) {
                result = false
                errMsg = '最大值输入不能小于最小值'
              }
            }
          }
        })
      })

      if (simple.statistics.type !== 'count') {
        if (!simple.statistics.dimensionName) {
          result = false
          errMsg ? (errMsg += '并且统计类型需要选中维度') : (errMsg += '统计类型需要选中维度')
        }
      }
    }

    result ||
      (formErrors = {
        errors: [
          {
            field: 'formulaGui',
            message: errMsg
          }
        ]
      })
    this.props.form.setFields({
      formulaGui: formErrors
    })

    return result
  }

  //验证复合指标
  validateGuiCompositeFormula = () => {
    let { params } = this.state.measure
    let result = true
    let formErrors = {}

    params.composite.items.map(data => {
      if (!data.name || !data.formula) {
        result = false
      }
    })

    result ||
      (formErrors = {
        errors: [
          {
            field: 'compositeFormulaGui',
            message: '指标输入栏不能为空'
          }
        ]
      })
    this.props.form.setFields({
      compositeFormulaGui: formErrors
    })

    return result
  }

  //初始化 params
  initParams = params => {
    //初始化 params
    if (_.isEmpty(params)) {
      params = this.getDefaultParams()
    }
    if (_.isEmpty(params.simple)) {
      params.simple = this.getDefSimpleFormulaObj()
    }
    if (_.isEmpty(params.composite) || !params.composite.items) {
      params.composite = this.getDefCompositeFormulaObj()
    }
    //兼容旧数据，为每个filter加入relation
    if (!_.isEmpty(params.simple.filters)) {
      // && !params.simple.filters[0].relation
      //旧数据没有两层filter
      if (params.simple.filters[0].filters === undefined) {
        let tempFilters = _.cloneDeep(params.simple.filters)
        params.simple.filters = [
          {
            filters: tempFilters,
            relation: params.simple.relation
          }
        ]
      }
    }
    return params
  }

  //获取默认params
  getDefaultParams = () => {
    return {
      simple: this.getDefSimpleFormulaObj(),
      //复合指标
      composite: this.getDefCompositeFormulaObj(),
      formulaEditMode: 'simple'
    }
  }

  //单指标
  getDefSimpleFormulaObj = () => {
    return {
      //过滤条件
      filters: [],
      //统计类型
      statistics: {
        type: 'count',
        dimensionName: ''
      }
    }
  }
  //复合指标
  getDefCompositeFormulaObj = () => {
    return {
      items: [{}, {}],
      operator: 'divide'
    }
  }

  convertToFormulaByFilter = filter => {
    let { dimensionTree } = this.state

    return filter.map(data => {
      let { value, dimensionName, type, relativeTime } = data
      //多选切到单选时,value会转变为数值
      if (noValueFilterTypelist.includes(type)) {
        //空值: $admin.is('').or($admin.is(null))
        //非空: $admin.isnt('').or($admin.isnt(null))
        let action = type === 'isEmpty' ? 'is' : 'isnt'
        let logicOperator = type === 'isEmpty' ? 'or' : 'and'

        if (dimensionTree[dimensionName].type === DruidColumnType.String || dimensionTree[dimensionName].type === DruidColumnType.StringArray) {
          return `$${dimensionName}.${action}("").${logicOperator}($${dimensionName}.${action}(null))`
        } else {
          return `$${dimensionName}.${action}(null)`
        }
      } else {
        if (!['notin', 'in'].includes(type)) {
          type !== 'between' && _.isArray(value) ? (value = value[0]) : (value = data.value)
        }
        //plywood 不包含表示为in().not()
        let endStr = type === 'notin' ? '.not()' : ''
        let action = type === 'notin' ? 'in' : type
        if (relativeTime && relativeTime !== 'custom') {
          let relativeTimeStr = _.isArray(relativeTime) ? relativeTime.join(',') : relativeTime
          return `$${dimensionName}.cast("NUMBER").greaterThanOrEqual("@@${relativeTimeStr}#0@@").and($${dimensionName}.cast("NUMBER").lessThanOrEqual("@@${relativeTimeStr}#1@@"))`
        } else if (data.type === 'between') {
          return `$${dimensionName}.cast("NUMBER").greaterThanOrEqual(${value[0]}).and($${dimensionName}.cast("NUMBER").lessThanOrEqual(${value[1]}))`
        } else {
          return `$${data.dimensionName}.${action}(${stringConvertor(value, dimensionTree[data.dimensionName].type, data.type)})${endStr}`
        }
      }
    })
  }

  //将单指标转成公式
  convertToFormula = () => {
    //example: $main.filter($$app_release.is('liu').and($EventLabel.is())).max($app_release)
    let { params } = this.state.measure
    let { filters, statistics } = params.simple
    let filtersStrArray = []
    let parentFiltersStr = ''

    let parentFilterFomulas = filters.map(item => {
      let filtersStr = ''
      //维度选中全部维度时，不需要拼接filter
      let tempFilters = item.filters.filter(data => {
        return data.dimensionName !== 'all'
      })

      //filter生成规则： $ + dimensionName + . + filtertype + ( + filterValue + )
      filtersStrArray = this.convertToFormulaByFilter(tempFilters)
      //包装统计类型
      for (let i = 0; i < filtersStrArray.length; i++) {
        if (i === 0) {
          filtersStr = filtersStrArray[i]
        } else {
          //filtersStr = filtersStrArray[i] + packege(tempFilters[i + 1].relation, filtersStr)
          filtersStr = `${filtersStr}.${item.relation}(${filtersStrArray[i]})`
        }
      }
      return filtersStr
    })
    parentFilterFomulas.forEach((filterStr, index) => {
      if (filterStr) {
        if (index === 0) {
          parentFiltersStr = filterStr
        } else {
          parentFiltersStr = `${parentFiltersStr}.${params.simple.relation}(${filterStr})`
        }
      }
    })

    let statisticsStr = ''
    let dimensionName = _.indexOf(statistics.dimensionName, '.') >= 0 ? `{${statistics.dimensionName}}` : statistics.dimensionName
    //统计类型生成规则: statistics.type + ( + [empty]/statistics.dimensionName + )
    statisticsStr += statistics.type + '('
    statisticsNeedDimList.includes(statistics.type) ? (statisticsStr += `$${dimensionName})`) : (statisticsStr += ')')

    return `$main.${parentFiltersStr && 'filter(' + parentFiltersStr + ').'}${statisticsStr}`
  }

  //将复合指标转成公式
  convertToCompositeFormula = () => {
    let { measure } = this.state
    let formula = ''
    let compositeFormulaObj = measure.params.composite
    compositeFormulaObj.items.map((data, index) => {
      if (index === 0) {
        formula += `(${data.formula}).${compositeFormulaObj.operator}`
      } else {
        formula += `(${data.formula})`
      }
    })
    return formula
  }

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

  submit = async () => {
    let { measure, selectedTags } = this.state
    let { formulaEditMode } = measure.params
    let values = await this.validateFields()
    //检验
    if (formulaEditMode === 'simple' && !this.validateGuiSimpleFormula()) return
    if (formulaEditMode === 'composite' && !this.validateGuiCompositeFormula()) return
    if (!values) return

    Object.assign(values, _.pick(measure, ['user_ids', 'role_ids']))
    let { datasource, hideModal, setProp } = this.props
    let did = measure.id
    let func = !did ? addMeasure : editMeasure
    let id = did ? did : datasource.id
    if (values.type) values.type = parseInt(values.type, 10)
    values.formula = measure.formula
    //生成公式
    if (formulaEditMode === 'simple') {
      values.formula = this.convertToFormula()
    } else if (formulaEditMode === 'composite') {
      values.formula = this.convertToCompositeFormula()
    }
    values.params = measure.params
    values.type = measure.type
    values.params.formulaEditMode = formulaEditMode
    values.pattern = measure.pattern
    // 生成name,格式${dataSource}_${short_id}
    values.name = measure.name || `${datasource.name}_${short_id().replace(/-+/g, '')}`

    this.setState({
      loading: true
    })
    Object.assign(values, {
      tags: selectedTags
    })
    let res = await func(id, values)
    this.setState({
      loading: false
    })
    if (!res) return
    if (did) {
      message.success('更新成功', 2)
      setProp({
        type: 'update_measures',
        data: {
          id: did,
          ...values
        }
      })
      setProp({
        type: 'update_originMeasures',
        data: {
          id: did,
          ...values
        }
      })
    } else {
      message.success('添加成功', 2)
      setProp({
        type: 'add_measures',
        data: res.result
      })
      setProp({
        type: 'add_originMeasures',
        data: res.result
      })
    }
    hideModal()
  }

  updateMeasure = (type, data) => {
    let { measure, dimensionTree, statisticsDimensions } = this.state
    let copyMeasure = _.cloneDeep(measure)
    let params = copyMeasure.params
    let simpleParams = params.simple
    let tempValue
    let updateFilter

    switch (type) {
      case 'add_parent_filter':
        simpleParams.filters.push({
          relation: 'and',
          filters: [
            {
              dimensionName: 'all',
              type: null,
              value: null
            }
          ]
        })
        break
      case 'add_filter':
        simpleParams.filters[data.index].filters.push({
          dimensionName: 'all',
          type: null,
          value: null
        })
        break
      case 'delete_filter': {
        //删除指定filter
        _.remove(simpleParams.filters[data.parentIndex].filters, function (d, index) {
          return index === data.index
        })
        //filter为空时，统计类型清空
        if (simpleParams.filters.length === 0) {
          simpleParams.statistics = {
            type: 'count',
            dimensionName: ''
          }
        }
        break
      }
      case 'delete_parent_filter': {
        //删除指定filter
        _.remove(simpleParams.filters, function (d, index) {
          return index === data.parentIndex
        })
        //filter为空时，统计类型清空
        if (simpleParams.filters.length === 0) {
          simpleParams.statistics = {
            type: 'count',
            dimensionName: ''
          }
        }
        break
      }
      case 'update_filter_dimension':
        updateFilter = simpleParams.filters[data.parentIndex].filters[data.index]
        updateFilter.dimensionName = data.value

        //不选中全部维度时，过滤类型默认选中第一个
        if (data.value !== 'all') {
          //维度为字符类型时
          if (dimensionTree[data.value].type === 2) {
            updateFilter.type = Object.keys(strFilterTypeTextMap)[0]
            updateFilter.value = null
          } else {
            //维度为数值类型时
            updateFilter.type = Object.keys(filterTypeTextMap)[0]
            updateFilter.value = 0
          }
        } else {
          updateFilter.value = null
        }
        break
      case 'update_filter_type':
        let { value, parentIndex, index } = data
        updateFilter = simpleParams.filters[parentIndex].filters[index]
        tempValue = updateFilter.value
        updateFilter.type = value

        if (value === 'between') {
          if (!_.isArray(tempValue)) {
            tempValue = [tempValue, 0]
          }
        } else if (!['in', 'notin'].includes(value) && _.isArray(tempValue)) {
          tempValue = tempValue[0]
        } else if (['in', 'notin'].includes(value) && !_.isArray(tempValue)) {
          tempValue = [tempValue].filter(_.identity)
        }
        updateFilter.value = tempValue
        break
      case 'update_filter_relation':
        simpleParams.filters[data.parentIndex].relation = data.relation
        break
      case 'update_parent_relation':
        simpleParams.relation = data.relation
        break
      case 'update_statistics_type':
        simpleParams.statistics.type = data
        var dimName = simpleParams.statistics.dimensionName
        var dimObj = dimensionTree[dimName]
        if (dimObj.type === DruidColumnType.Date && (data === 'min' || data === 'max')) {
          copyMeasure.type = measureTypeMap.date.value
        }
        break
      case 'update_statistics_dimension':
        simpleParams.statistics.dimensionName = data
        var dim = dimensionTree[data]
        var statisticsType = DruidColumnTypeInverted[dim.type]
        var typesPool = statisticsTypeList[statisticsType]
        simpleParams.statistics.type = typesPool[0]
        break
      case 'add_measure':
        params.composite.items[data.index].name = data.name
        params.composite.items[data.index].formula = data.formula
        break
      case 'delete_measure':
        params.composite.items[data] = {}
        break
      case 'update_meaures_operator':
        params.composite.operator = data
        break
      case 'update_meaures_formula':
        copyMeasure.formula = data
        break
    }

    //清除公式报错信息
    this.props.form.setFields({
      formulaGui: {},
      compositeFormulaGui: {}
    })

    this.setState({
      measure: copyMeasure,
      statisticsDimensions
    })
  }

  onClick = role => {
    let { measure } = this.state
    let { role_ids } = measure
    let { id } = role
    let update = _.cloneDeep(measure)
    if (role_ids.includes(id)) {
      update.role_ids = role_ids.filter(rid => rid !== id)
    } else {
      update.role_ids = role_ids.concat(id)
    }
    this.setState({
      measure: update
    })
  }

  //公式编辑模式更改
  onChangeFormulaEditMode = e => {
    let formulaEditMode = e.target.value
    let measure = _.cloneDeep(this.state.measure)
    measure.params.formulaEditMode = formulaEditMode
    this.setState({
      measure
    })
  }

  //过滤条件维度值change
  onPickFilterProp = (index, parentIndex, value, valueIndex) => {
    let measure = _.cloneDeep(this.state.measure)
    let filter = measure.params.simple.filters[parentIndex].filters[index]
    if (valueIndex === 0 || valueIndex === 1) {
      filter.value[valueIndex] = value
    } else {
      filter.value = value
    }
    this.setState({
      measure
    })
  }

  //格式化结果
  onPatternChange = value => {
    let measure = _.cloneDeep(this.state.measure)
    measure.pattern = value
    this.setState({
      measure
    })
  }

  onTypeChange = value => {
    let measure = _.cloneDeep(this.state.measure)
    measure.type = parseInt(value, 10)
    this.setState({
      measure
    })
  }

  render() {
    let { loading, measure, dimensionTree, statisticsDimensions, selectedTags } = this.state
    let { modalVisible, hideModal, roles, dimensions, datasource, measures, tags, form } = this.props
    let params = measure.params
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

    const { getFieldDecorator } = this.props.form
    let formItemLayout = {
      labelCol: { span: 3 },
      wrapperCol: { span: 19 }
    }
    let baseProps = {
      params,
      dimensions,
      relationTextMap,
      filterTypeTextMap,
      strFilterTypeTextMap,
      measure,
      updateMeasure: this.updateMeasure,
      onPickFilterProp: this.onPickFilterProp,
      dataSourceName: datasource.name,
      modifier: this.modifier,
      dataSourceId: datasource.id
    }
    let simpleFormula = params.simple

    let simpleProps = {
      simpleFormula,
      statisticsTypeTextMap,
      dimensions,
      dimensionTree,
      updateMeasure: this.updateMeasure,
      statisticsDimensions,
      statisticsTypeList
    }
    let ModalTitle = (
      <div>
        {measure.id ? '编辑指标' : '创建指标'}
        <Anchor href={docUrl + helpMap['/console/measure#create']} className='mg1l' title='前往查看指标帮助文档' target='_blank'>
          <Icon type='sugo-help' />
        </Anchor>
      </div>
    )
    // 支持复制指标名称，方便数据 API 功能的使用
    const doCopy = () => {
      copyTextToClipboard(
        measure.name,
        () => message.success('复制指标英文名称成功'),
        () => message.warn('复制指标英文名称失败，请手动复制')
      )
    }
    return (
      <Modal title={ModalTitle} visible={modalVisible} width={800} footer={footer} maskClosable={false} onCancel={hideModal} maskClosable={false} className='measure-model'>
        <Spin spinning={loading}>
          <Form layout='horizontal' onSubmit={this.submit} className='ug-form '>
            {!measure.id ? null : (
              <FormItem {...formItemLayout} label='英文名称'>
                <Input type='text' readOnly value={measure.name} onClick={doCopy} className='bg-grey-f5' addonAfter={<Icon type='copy' className='fpointer' onClick={doCopy} />} />
              </FormItem>
            )}

            <FormItem {...formItemLayout} label='名称' hasFeedback>
              {getFieldDecorator('title', {
                rules: [
                  {
                    required: true,
                    message: '请输入名称，可以是中文'
                  },
                  {
                    pattern: /^[^\s]*$/,
                    message: '不允许输入空格'
                  },
                  {
                    pattern: /^[^\s]/,
                    message: '不允许以空格开头'
                  },
                  {
                    min: 1,
                    max: 50,
                    type: 'string',
                    message: '1~50个字符，可以是中文'
                  }
                ],
                initialValue: measure.title
              })(<Input type='text' autoComplete='off' />)}
            </FormItem>

            <FormItem {...formItemLayout} label='创建方式'>
              <RadioGroup onChange={this.onChangeFormulaEditMode} value={params.formulaEditMode}>
                <RadioButton value='simple'>{formulaEditModeTextMap['simple']}</RadioButton>
                <RadioButton value='composite'>{formulaEditModeTextMap['composite']}</RadioButton>
                <RadioButton value='direct'>{formulaEditModeTextMap['direct']}</RadioButton>
              </RadioGroup>
            </FormItem>
            {params.formulaEditMode === 'simple' && <MeasureSimplePanel baseProps={baseProps} {...simpleProps} formItemLayout={formItemLayout} />}
            {
              //防止表单验证报错后，antd自动高亮input
              params.formulaEditMode === 'simple' && (
                <FormItem {...formItemLayout} style={{ marginBottom: 0, marginTop: '-25px' }} label={' '} colon={!!false}>
                  {getFieldDecorator('formulaGui')(<div />)}
                </FormItem>
              )
            }
            {
              //防止使用form验证之后自动高亮内部Input
              params.formulaEditMode === 'composite' && (
                <FormItem wrapperCol={{ span: 23 }} style={{ marginBottom: 0 }}>
                  {getFieldDecorator('compositeFormulaGui')(<div />)}
                </FormItem>
              )
            }
            {params.formulaEditMode === 'composite' && (
              <FormItem wrapperCol={{ span: 23 }}>
                <MeasureCompositePanel measures={measures} measure={measure} updateMeasure={this.updateMeasure} arithmeticTextMap={arithmeticTextMap} />
                <div className='formula-tips'>* 拖拽左边指标到右边输入栏或者点击左边指标自动填充</div>
              </FormItem>
            )}

            {params.formulaEditMode === 'direct' && (
              <MeasureDirectModal
                params={params}
                formItemLayout={formItemLayout}
                getFieldDecorator={getFieldDecorator}
                measure={measure}
                formulaEditModeTextMap={formulaEditModeTextMap}
                savedFormulaMode={savedFormulaMode}
                dimensions={dimensions}
                validateFormula={this.validateFormula}
                updateMeasure={this.updateMeasure}
                form={form}
              />
            )}

            <FormItem {...formItemLayout} label='显示格式'>
              <Select dropdownMatchSelectWidth={false} className='iblock width200 mg1r' value={measure.pattern} onChange={this.onPatternChange}>
                {Object.keys(formulaPatternMap).map(key => {
                  return (
                    <Option key={key} value={formulaPatternMap[key].value}>
                      {formulaPatternMap[key].text}
                    </Option>
                  )
                })}
              </Select>
            </FormItem>
            <FormItem {...formItemLayout} label='输出格式'>
              <Select dropdownMatchSelectWidth={false} className='iblock width100 mg1r' value={measure.type + ''} onChange={this.onTypeChange}>
                {Object.keys(measureTypeMap).map((key, i) => {
                  let { title, value } = measureTypeMap[key]
                  return (
                    <Option key={i + 'mtm@' + key} value={value + ''}>
                      {title}
                    </Option>
                  )
                })}
              </Select>
            </FormItem>
            <FormItem {...formItemLayout} label='标签' hasFeedback>
              {tags.map((d, i) => {
                return (
                  <Checkbox key={i + ''} checked={selectedTags.includes(d.id)} onChange={this.onTagClick} value={d.id}>
                    {d.name}
                  </Checkbox>
                )
              })}

              {_.isEmpty(tags) && '还没有标签'}
            </FormItem>

            <Auth auth='/app/measure/authorize'>
              <FormItem {...formItemLayout} label='授权访问'>
                <AuthSelect roles={roles} dataSourceRoles={datasource.role_ids} record={measure} onClick={this.onClick} />
              </FormItem>
            </Auth>
          </Form>
        </Spin>
      </Modal>
    )
  }
}

export default createForm()(MeasureModal)
