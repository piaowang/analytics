import React from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Select, Menu, DatePicker, Tooltip, message } from 'antd'
import DimensionGroupRuleItem from './dimension-group-rule-item'
import { isTimeDimension, isNumberDimension, isIntDimension, DruidColumnTypeIcon } from '../../../common/druid-column-type'
import _ from 'lodash'
import moment from 'moment'
import Icon from '../Common/sugo-icon'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import smartSearch from '../../../common/smart-search'

const MenuItemGroup = Menu.ItemGroup
const RangePicker = DatePicker.RangePicker
const FormItem = Form.Item
const Option = Select.Option
// const RadioGroup = Radio.Group

const timeZone = 'Asia/Shanghai'

//数字指标过滤类型
const filterTypeTextMap = {
  /*is: '等于',
  isnt: '不等于',
  lessThan: '小于',
  lessThanOrEqual: '小于或等于',
  greaterThan: '大于',
  greaterThanOrEqual: '大于或等于',
  isEmpty: '值为空',
  notEmpty: '非空',*/
  between: '范围'
}

//string值的指标过滤类型
const strFilterTypeTextMap = {
  is: '等于',
  // isnt: '不等于',
  in: '包含'
  // notin: '不包含',
  // isEmpty: '值为空',
  // notEmpty: '值非空'
}

// 日期类型维度分组过滤方式
const dateDimensionGroupFilterTypes = [
  { key: 'normal', name: '常规' }
  /*{ key: 'in-the-year', name: '年内分组' },
  { key: 'in-the-month', name: '月内分组' },
  { key: 'in-the-week', name: '周内分组' },
  { key: 'in-the-day', name: '天内分组' },
  { key: 'in-the-hour', name: '小时分组' }*/
]

// 日期类型分组数据
const dateDimensionGroupRanges = {
  'in-the-year': Array.from(new Array(12),(val,index)=>index+1),
  'in-the-month': Array.from(new Array(31),(val,index)=>index+1),
  'in-the-week': Array.from(new Array(7),(val,index)=>index+1),
  'in-the-day': Array.from(Array(24).keys()),
  'in-the-hour': Array.from(Array(60).keys())
}

const relationTextMap = {
  or: '或者',
  and: '并且'
}

//构建name-value的map，方便查询
function buildNameTree(slices) {
  return slices.reduce( (before, slice) => {
    before[slice.name] = slice
    return before
  }, {} )
}

/**
 * 分组维度类型的视图
 * 
 * @export
 * @class DimensionGroupPanel
 * @extends {React.PureComponent}
 */
export default class DimensionGroupPanel extends React.PureComponent {

  static defaultProps = {
    dimension: {
      params: {
        dimension: {}
      }
    }
  }

  state = {
    currentFilterGroupIndex: 0 // 分组维度，数值/字符串类型的当前分组
  }

  componentWillMount() {
    const { dimension: { params }, dimensions } = this.props
    const { groupFilters = [], othersGroupName, dimension } = params
    // 初始化分组的视图数据
    if (groupFilters.length === 0) {
      groupFilters.push({
        groupName: '分组1',
        rule: {}
      })
      params.groupFilters = groupFilters
      this.setState({
        currentFilterGroup: groupFilters[0]
      })
    }
    if (!othersGroupName) {
      params.othersGroupName = '未分组'
    }
    if (!dimension) {
      params.dimension = {}
    }
    // updateDimensionParams(params)
    this.dimensionTree = buildNameTree(dimensions)
  }

  componentDidCatch(error, info) {
    // Display fallback UI
  }

  // 选择维度
  onDimensionChange = (dimensionId) => {
    const { dimensions, dimension: { params }, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    let selectDimension = _.find(dimensions, (dim) => dim.id === dimensionId)
    selectDimension = _.pick(selectDimension, ['id', 'name', 'title', 'type'])
    params.dimension = selectDimension

    groupFilters.length = 0
    // 数值/文本维度的groupFilters微调
    if (!isTimeDimension(selectDimension)) {
      groupFilters.push({
        groupName: `分组${groupFilters.length+1}`,
        rule: [{ type: '', value: '' }],
        relation: 'and' // 只有数值/字符串分组用的上
      })
    } else {
      groupFilters.push({
        groupName: `分组${groupFilters.length+1}`,
        rule: {}
      })
    }
    this.setState({
      currentFilterGroupIndex: 0
    })
    updateDimensionParams(params)
  }

  // 选择日期分组方式
  onGroupTypeChange = (groupType) => {
    const { dimension: { params }, updateDimensionParams } = this.props
    params.groupType = groupType
    params.groupFilters = [
      {
        groupName: '分组1',
        rule: {}
      }
    ]
    updateDimensionParams(params)
    this.setState({
      currentFilterGroup: null
    })
  }

  // 检查单个过滤条件是否未完整设置
  checkFilter = (filter, prev, dimension) => {
    let {groupName} = filter
    if (isTimeDimension(dimension)) {
      const {lower, upper} = filter.rule
      if (
        !lower ||
        !upper
      ) {
        return `${groupName}:请选择日期范围`
      } else if (
        upper < lower ||
        (prev && prev.upper > lower)
      ) {
        return `${groupName}:日期范围不正确或者有交叉`
      }
      return false
    } else if (isNumberDimension(dimension)) {
      let {type} = filter.rule[0]
      if (!type) {
        return `${groupName}:请选择类型`
      }
      let [lower, upper] = filter.rule[0].value
      let prevValue = _.get(prev, 'rule[0].value[1]') || - Infinity
      if (
        (!lower && lower !== 0) ||
        (!upper && upper !== 0)
      ) {
        return `${groupName}:请输入数值`
      } else if (
        upper < lower ||
        (prev &&  prevValue > lower)
      ) {
        return `${groupName}:数值范围不正确或者有交叉`
      }
      return false
    } else {
      const {value, type} = filter.rule[0]
      if (!type) {
        return `${groupName}:请选择类型`
      }
      if (!value || !value.length) {
        return `${groupName}:请输入或者选择`
      }
      return false
    }
  }

  // 检查所有分组的过滤条件是否完整设置
  checkAllGroupFilter = (groupFilters = [], dimension) => {
    let res = false
    _.forEach(
      groupFilters,
      (filter, index) => {
        let prev = index ? groupFilters[index - 1] : null
        res = this.checkFilter(filter, prev, dimension)
        if (res) {
          return false
        }
      }
    )
    return res
  }

  // 添加分组过滤的一个组
  addGroupFilter = () => {
    const { dimension: { params }, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    let {dimension} = params
    // 检查是否有空值的规则
    const ok = this.checkAllGroupFilter(groupFilters, dimension)
    if (ok) {
      message.warn(ok)
      return
    }
    let last = _.last(groupFilters) || {}

    let groupName = `分组${groupFilters.length + 1}`
    if (isTimeDimension(dimension)) {
      let lastV = _.get(last, 'rule.upper') || ''
      groupFilters.push({
        groupName,
        rule: {
          lower: lastV,
          upper: lastV
        }
      })
    } else if (isNumberDimension(dimension)) {
      let v1 = _.get(last, 'rule[0].value[1]') || 0
      groupFilters.push({
        groupName,
        rule: [
          {
            type: 'between',
            value: [
              v1,
              v1 + 20
            ]
          }
        ],
        relation: 'and' // 只有数值/字符串分组用的上
      })
    } else {
      groupFilters.push({
        groupName,
        rule: [
          {
            type: 'in',
            value: []
          }
        ],
        relation: 'and' // 只有数值/字符串分组用的上
      })
    }

    params.groupFilters = groupFilters
    updateDimensionParams(params)
  }

  // 修改分组名称
  onChangeGroupFilterName = (index, name) => {
    // if (!name || name.trim().length === 0) return
    // 修改未分组的名称
    if (index === -1) {
      this.onChangeOthersGroupName(name)
    } else {
      const { dimension: { params }, updateDimensionParams } = this.props
      const { groupFilters = [] } = params
      groupFilters[index].groupName = name
      params.groupFilters = groupFilters
      updateDimensionParams(params)
    }
  }

  // 删除分组项
  deleteGroupFilter = (i) => {
    const { dimension: { params }, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    const { currentFilterGroupIndex } = this.state
    if (groupFilters.length === 1) {
      return
    }
    groupFilters.splice(i, 1)
    params.groupFilters = groupFilters
    // 如果删除的分组是当前选中的分组，则去选中第一个组
    if (i === currentFilterGroupIndex) {
      this.setState({
        currentFilterGroupIndex: 0
      }, () => {
        updateDimensionParams(params)
      })
    } else if (i < currentFilterGroupIndex) {
      // 如果删除的组比当前组小，要把当前组减1
      this.setState({
        currentFilterGroupIndex: currentFilterGroupIndex - 1
      }, () => {
        updateDimensionParams(params)
      })
    }
    else {
      updateDimensionParams(params)
    }
  }

  // 切换当前选择的分组(数值/字符串类型的模式)
  onChangeCurrentGroup = (i) => {
    this.setState({
      currentFilterGroupIndex: parseInt(i, 10)
    })
  }

  // 修改未分组的组名
  onChangeOthersGroupName = (name) => {
    const { dimension: { params }, updateDimensionParams } = this.props
    params.othersGroupName = name
    updateDimensionParams(params)
  }

  // 修改分组条件的组合关系: and|or
  onChangeFilterRelation = (value) => {
    const { dimension: { params }, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    const { currentFilterGroupIndex } = this.state
    const currentFilter = groupFilters[currentFilterGroupIndex]
    if (currentFilter) {
      currentFilter.relation = value
    }
    updateDimensionParams(params)
  }

  // 增加一个过滤条件规则
  addGroupFilterRule = () => {
    const { dimension: { params }, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    const { currentFilterGroupIndex } = this.state
    const currentFilter = groupFilters[currentFilterGroupIndex]
    if (currentFilter) {
      const ok = this.checkFilter(currentFilter)
      if (!ok) {
        message.warn('条件值不能为空')
        return
      }
      currentFilter.rule.push({
        type: '',
        value: ''
      })
    }
    updateDimensionParams(params)
  }

  // 过滤条件值change
  onPickFilterProp = (index, parentIndex, value, valueIndex) => {
    // console.log(index, parentIndex, value, valueIndex)
    const { dimension: { params }, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    const currentFilter = groupFilters[parentIndex] || {}

    // 验证时间或者数值分组不能有重叠范围
    // const flag = this.validatorRangeValue(params.dimension, groupFilters, value, parentIndex)
    // if (!flag){
    //   message.warn('所选值已存在其他分组里!', 2.5)
    //   return
    // }
    let {dimension} = params
    if (!isTimeDimension(dimension)) {
      // 检查是否已经放在其他分组里了
      // const contains = _.filter(groupFilters, (v, i) => i !== parentIndex).some(filter => _.some(
      //   filter.rule,
      //   row => {
      //     console.log(row, value, row.value === value, _.intersection(row.value, value))
      //     if (Array.isArray(row.value)) {
      //       return row.value.includes(value) || !_.isEmpty(_.intersection(row.value, value))
      //     } else {
      //       return Array.isArray(value) ? value.includes(row.value) : row.value === value
      //     }
      //   }
      //   )
      // )
      // if (contains) {
      //   message.warn('所选值已存在其他分组里!')
      //   return
      // }
      if (valueIndex === 0 || valueIndex === 1) {
        if (!Array.isArray(currentFilter.rule[index].value)) {
          currentFilter.rule[index].value = []
        }
        currentFilter.rule[index].value[valueIndex] = isIntDimension(dimension)
          ? parseInt(value, 10) || 0
          : value
      } else {
        currentFilter.rule[index].value = value
      }
    } else { // 时间类型分组
      if (valueIndex === 0 || valueIndex === 1) {
        var lou = valueIndex === 0 ? 'lower' : 'uppper'
        currentFilter.rule[lou] = value
      } else {
        currentFilter.rule = value
      }
    }
    updateDimensionParams(params)
  }


  render() {
    const {
      formItemLayout,
      getFieldDecorator,
      dimension: { params },
      dimensions,
      datasource: { name: dataSourceName },
      updateDimensionParams,
      disabled
    } = this.props

    const { dimension: sourceDimension = {}, groupType = 'normal', groupFilters = [], othersGroupName } = params
    const { currentFilterGroupIndex = 0 } = this.state
    const currentFilter = groupFilters[currentFilterGroupIndex] || {rule: []}
    // 当前分组的名称，判断是否是未分组(未分组的直接是-1)
    const currentGroupName = currentFilterGroupIndex === -1
      ? othersGroupName
      : currentFilter.groupName
    // const currentRelation = currentFilterGroupIndex === -1
    //                           ? null
    //                           : currentFilter.relation
    const dimensionTree = this.dimensionTree
    return (
      <div className="group-dimension">
        <FormItem {...formItemLayout} label="维度" hasFeedback>
          {
            getFieldDecorator(
              'params.dimension.id',
              {
                rules: [
                  {
                    required: true,
                    message: '请选择维度'
                  }
                ],
                initialValue: sourceDimension.id || undefined
              })(
              <Select
                className="width-60"
                dropdownMatchSelectWidth={false}
                placeholder="请选择"
                onChange={(value) => {
                  this.onDimensionChange(value)
                }}
                {...enableSelectSearch}
                filterOption={(input, option) => {
                  return smartSearch(input, option.props['data-search-content'])
                }}
                disabled={disabled}
              >
                {
                  dimensions.length
                    ?
                  // 复合维度过滤掉, 未保存的过滤掉
                    dimensions.filter((dimension) => !_.get(dimension.params, 'type') && !!dimension.id).map((dimension, i) => {
                      let {name, title, id, type} = dimension
                      let dimTitle = title || name
                      let dimIconType = DruidColumnTypeIcon[type]
                      return (
                        <Option
                          key={i + '@' + id}
                          value={id}
                          data-search-content={dimTitle}
                          title={dimTitle}
                        >
                          <Icon type={dimIconType} className="mg1r iblock" />
                          <span className="iblock">{dimTitle}</span>
                        </Option>
                      )
                    })
                    :
                    <Option key="hint" value="" >无可用维度，请尝试同步维度</Option>
                }
              </Select>
            )
          }
        </FormItem>
        {
          // 判断是否日期类型的维度
          isTimeDimension(sourceDimension)
            ?
            (
              <FormItem {...formItemLayout} label="分组方式" style={{ display: 'none' }} hasFeedback>
                <Select
                  className="width-60"
                  dropdownMatchSelectWidth={false}
                  value={groupType || undefined}
                  placeholder="请选择"
                  onChange={(value) => {
                    this.onGroupTypeChange(value)
                  }}
                >
                  {
                    dateDimensionGroupFilterTypes.map(({ key, name }) => {
                      return <Option key={key} value={key}>{name}</Option>
                    })
                  }
                </Select>
              </FormItem>
            )
            :
            null
        }
        <div className="group">
          {
            // 选择维度后才会有分组方式视图
            sourceDimension.id
              ?
              (
                isTimeDimension(sourceDimension)
                  ?
                  <div className="date-group">
                    {
                      groupFilters.map((groupFilter, i) => {
                        return (
                          <div key={i} className="mg1b">
                            <Input
                              placeholder="组名"
                              value={groupFilter.groupName}
                              className="iblock width140 mg1r"
                              onChange={(e) => {
                                this.onChangeGroupFilterName(i, e.target.value)
                              }}
                            />
                            {
                              // 日期普通分组
                              groupType === 'normal'
                                ?
                                <div className="iblock">
                                  <RangePicker
                                    value={_.values(groupFilter.rule).map(v => moment.tz(v, timeZone))}
                                    format="YYYY-MM-DD HH:mm"
                                    className="iblock"
                                    onChange={(dates) => {
                                      // 时间类型统一取开始值00:00
                                      const value = dates.map(m => m.startOf('day').valueOf())
                                      this.onPickFilterProp(0, i, {lower: value[0], upper: value[1]})
                                    }}
                                  />
                                </div>
                                :
                              // 日期其他分组(年月日时)
                                [
                                  <Select
                                    key="start"
                                    className="iblock width100 mg1r"
                                    value={groupFilter.rule.lower || undefined}
                                    placeholder="请选择"
                                    onChange={(value) => {
                                      this.onPickFilterProp(0, i, value, 0)
                                    }}
                                  >
                                    {
                                      dateDimensionGroupRanges[groupType].map(
                                        (key) => (
                                          <Option key={key}>{key}</Option>
                                        )
                                      )
                                    }
                                  </Select>,
                                  '至',
                                  <Select
                                    key="end"
                                    className="iblock width100 mg1l"
                                    placeholder="请选择"
                                    value={groupFilter.rule.uppper}
                                    onChange={(value) => {
                                      this.onPickFilterProp(0, i, value, 1)
                                    }}
                                  >
                                    {
                                      dateDimensionGroupRanges[groupType].map(
                                        (key) => (
                                          <Option key={key}>{key}</Option>
                                        )
                                      )
                                    }
                                  </Select>
                                ]
                            }
                            <Tooltip title="删除">
                              <Icon
                                type="close-circle-o"
                                className="mg1l font16 color-grey pointer iblock"
                                style={{ visibility: groupFilters.length === 1 ? 'hidden' : 'visible' }}
                                onClick={() => this.deleteGroupFilter(i)}
                              />
                            </Tooltip>
                          </div>
                        )
                      })
                    }
                    <div className="add-button-wrap pd1y">
                      <a className="pointer" title="增加一个条件" onClick={this.addGroupFilter}>
                        <Icon className="mg1r" type="plus-circle-o" />
                    增加一个条件
                      </a>
                    </div>
                    <div className="mg1b">
                      <Input
                        defaultValue="未分组"
                        className="width-20"
                        value={othersGroupName}
                        onChange={(e) => {
                          this.onChangeOthersGroupName(e.target.value)
                        }}
                      /> (未覆盖的范围)
                    </div>
                  </div>
                  :
                // 数值/字符串类型的分组视图
                  [
                    <div key="left" className="left iblock">
                      <Menu
                        selectedKeys={[`${currentFilterGroupIndex}`]}
                        placeholder="请选择"
                        prefixCls="ant-select-dropdown-menu"
                        onClick={({ key }) => this.onChangeCurrentGroup(key)}
                      >
                        <MenuItemGroup
                          title={
                            <div className="alignright">
                              <span className="fleft">分组</span>
                              <Icon className="pointer" type="plus-circle-o" onClick={this.addGroupFilter} />
                            </div>
                          }
                        >
                          {
                            groupFilters.map((filter, i) => {
                              return (
                                <Menu.Item key={i}>
                                  {filter.groupName}
                                  {
                                    groupFilters.length > 1
                                      ?
                                      <Icon
                                        type="delete"
                                        className="pointer"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          this.deleteGroupFilter(i)
                                        }}
                                      />
                                      :
                                      null
                                  }
                                </Menu.Item>
                              )
                            })
                          }
                          <Menu.Item key="-1">{othersGroupName}</Menu.Item>
                        </MenuItemGroup>
                      </Menu>
                    </div>,
                    <div key="right" className="right iblock">
                      <div>
                    分组名称：
                        <Input
                          className="iblock width-50"
                          value={currentGroupName}
                          onChange={(e) => {
                            this.onChangeGroupFilterName(currentFilterGroupIndex, e.target.value)
                          }}
                        />
                      </div>
                      {
                        currentFilterGroupIndex > -1
                          ?
                          <div className="filters">
                            <div className="mg1t">
                              {/*<RadioGroup
                          value={currentRelation}
                          onChange={(e) => {
                            this.onChangeFilterRelation(e.target.value)
                          }}
                        >
                          <Radio value="and">并且</Radio>
                          <Radio value="or">或者</Radio>
                        </RadioGroup>*/}
                              {
                                currentFilter.rule.map((filter, index) => {
                                  let props = {
                                    index,  // 本条规则序号
                                    filter, // 本条规则
                                    params, // 规则所属的源维度
                                    dimension: dimensions.find(dim => dim.id === sourceDimension.id),
                                    updateDimensionParams, // 更新维度复合参数
                                    filterTypeTextMap,  // 数值指标过滤类型
                                    strFilterTypeTextMap, // 字符串指标过滤类型
                                    dataSourceName, // 数据源名称(项目名称)
                                    dimensionTree, // 所有维度的名字：值的map
                                    parentIndex: currentFilterGroupIndex, // 当前分组的序号
                                    relationTextMap, // and|or 的map对应中文
                                    relation: currentFilter.relation, //本组的条件是： and|or
                                    onPickFilterProp: this.onPickFilterProp // 修改过滤条件时
                                  }
                                  return <DimensionGroupRuleItem key={index} {...props} />
                                })
                              }
                              {/*<div className="add-button-wrap pd1y">
                          <a
                            className="pointer"
                            title="增加一个过滤条件"
                            onClick={this.addGroupFilterRule}
                          >
                            <Icon className="mg1r" type="plus-circle-o" />
                            增加一个过滤条件
                          </a>
                        </div>*/}
                            </div>
                          </div>
                          :
                          null
                      }
                    </div>
                  ]
              )
              :
              null
          }
        </div>
      </div>
    )
  }
}
