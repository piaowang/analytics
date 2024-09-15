/**
 * Created by fengxj on 3/20/19.
 */
import React from 'react'
import { CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Radio, Select, Popconfirm } from 'antd';
import DQFilterItemMeasure from './dq-filter-item-dimension'
import {enableSelectSearch} from '../../../../client/common/antd-freq-use-props'
import _ from 'lodash'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const Option = Select.Option
const FormItem = Form.Item
const measureTypeMap = {
  number: {
    title: '数值',
    value: 1
  },
  date: {
    title: '日期',
    value: 4
  }
}
const relationTextMap = {
  or: '或者',
  and: '并且'
}
//字符统计类型
const statisticsTypeList = {
  string: ['count', 'countDistinct'],
  number: ['count', 'countDistinct', 'max', 'min', 'sum'],
  date: ['count', 'countDistinct', 'max', 'min'],
  datestring: ['count', 'countDistinct']
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

/** 前端数据存的维度类型 */
const DruidColumnType = {
  Long: 0,
  Float: 1,
  String: 2,
  DateString: 3,
  Date: 4,
  Int: 5,
  Text: 6,
  Double: 7,
  BigDecimal: 8,
  // 多值列
  LongArray: 100,
  FloatArray: 101,
  StringArray: 102,
  DateArray: 104,
  IntArray: 105,
  DoubleArray: 107
}

const DruidColumnTypeInverted = {
  0: 'number',
  1: 'number',
  2: 'string',
  3: 'datestring',
  4: 'date',
  5: 'number',
  6: 'string',
  7: 'number',
  8: 'number',

  100: 'numberArray',
  101: 'numberArray',
  102: 'stringArray',
  104: 'dateArray',
  105: 'numberArray',
  107: 'numberArray'
}
//指标统计结果类型
const statisticsTypeTextMap = {
  count: '数量',
  countDistinct: '去重数量',
  max: '最大',
  min: '最小',
  sum: '求和',
  average: '平均值',
  last: '最新'
}

//构建name-value的map，方便查询
function buildNameTree(slices) {
  return slices.reduce( (before, slice) => {
    before[slice.name] = slice
    return before
  }, {} )
}

class DataQualityMeasureItem extends React.Component {

  constructor(props) {
    super(props)

  }

  //过滤条件维度值change
  onPickFilterProp = (index, parentIndex, value, valueIndex) => {
    let {updateMeasures} = this.props
    let measure = _.cloneDeep(this.props.measure)
    let filter = measure.params.simple.filters[parentIndex].filters[index]
    if(valueIndex === 0 || valueIndex === 1) {
      filter.value[valueIndex] = value
    } else {
      filter.value = value
    }

    updateMeasures(measure.name, measure)

  }

  addFilter = () => {
    let {relation} = this.props
    this.updateMeasure('add_parent_filter', relation)
  }
  updateMeasure = (type, data) => {
    let {dimensionTree, updateMeasures, measure} = this.props
    let copyMeasure = _.cloneDeep(measure)
    let params = copyMeasure.params
    let simpleParams = params.simple
    let tempValue
    let updateFilter

    switch (type) {
      case 'add_parent_filter':
        simpleParams.filters.push({
          relation: 'and',
          filters: [{
            dimensionName: 'all',
            type: null,
            value: null
          }]
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
          if(dimensionTree[data.value].type === 2) {
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
        let {value, parentIndex, index} = data
        updateFilter = simpleParams.filters[parentIndex].filters[index]
        tempValue = updateFilter.value
        updateFilter.type = value

        if(value === 'between') {
          if(!_.isArray(tempValue)) {
            tempValue = [tempValue, 0]
          }
        } else if (
          !['in', 'notin'].includes(value) &&
          _.isArray(tempValue)
        ) {
          tempValue = tempValue[0]
        } else if (
          ['in', 'notin'].includes(value) &&
          !_.isArray(tempValue)
        ) {
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
        if (
          (dimObj.type === DruidColumnType.Date) &&
          (data === 'min' ||
          data === 'max')
        ) {
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

    updateMeasures(copyMeasure.name, copyMeasure)
    //this.setState({
    // measure : copyMeasure,
    //})
  }

  renderAddBtn = () => {
    return (
      <div className="add-button-wrap">
        <a className="pointer"
          onClick={this.addFilter}
          title="增加一个指标条件"
        >
          <PlusCircleOutlined className="mg1r" />
          增加一个指标条件
        </a>
      </div>
    );
  }

  renderMeasureDef = () => {
    let {formItemLayout,statisticsDimensions, dimensionTree, dimensions, measure } = this.props
    let simpleFormula = measure.params.simple
    //获取统计类型
    let selectDimName = simpleFormula.statistics.dimensionName || dimensions[0].name
    let selectDim = dimensionTree[selectDimName]
    let statisticsTypeKeys = statisticsTypeList[DruidColumnTypeInverted[selectDim.type]]
    return (
      <FormItem {...formItemLayout} label="指标定义">
        {
          <div className="mg1b mg1r">
            <div className="iblock">
              <div className="iblock">统计维度</div>
              <Select
                {...enableSelectSearch}
                className="width140 mg1r mg1l iblock-force"
                value={selectDimName}
                onChange={(value) => {
                  this.updateMeasure('update_statistics_dimension', value)
                }}
                showSearch
              >
                {
                  statisticsDimensions.map((dimension) => {
                    return (
                      <Option key={dimension.name} value={dimension.name}>
                        {dimension.title || dimension.name}
                      </Option>
                    )
                  })
                }
              </Select>
            </div>
            的
            <div className="iblock mg1l">
              <Select
                dropdownMatchSelectWidth={false}
                className="iblock width100 mg1r"
                value={simpleFormula.statistics.type}
                defaultValue={'count'}
                onChange={(value) => {
                  this.updateMeasure('update_statistics_type', value)
                }}
              >
                {
                  statisticsTypeKeys.map((type, i) => {
                    return (
                      <Option key={i + ''} value={type}>
                        {statisticsTypeTextMap[type]}
                      </Option>
                    )
                  })
                }
              </Select>
            </div>
          </div>
        }
      </FormItem>
    )
  }

  updateRelation = e => {
    this.updateMeasure('update_parent_relation',{
      relation: e.target.value
    })
  }

  renderRelation = () => {
    let {measure} = this.props
    let simpleFormula = measure.params.simple
    return (
      <RadioGroup
        value={simpleFormula.relation}
        onChange={this.updateRelation}
      >
        <RadioButton value="and">并且</RadioButton>
        <RadioButton value="or">或者</RadioButton>
      </RadioGroup>
    )
  }

  renderRelationTag = (parentIndex, simpleFormula) => {
    return parentIndex
      ? <div className="relation-status">
        {relationTextMap[simpleFormula.relation]}
      </div>
      : null
  }
  modifier = (data, cb) => {
    let {updateMeasures} = this.props
    updateMeasures(data.measure.name, data.measure)
  }
  renderFilter = (item, parentIndex) => {
    let {dimensions, dimensionTree, measure} = this.props
    let simpleFormula = measure.params.simple
    return (
      <div key={parentIndex + '@mi'}>
        {this.renderRelationTag(parentIndex, simpleFormula)}
        <div className="filter-content mg1t">
          <RadioGroup
            value={item.relation}
            onChange={e => this.updateMeasure('update_filter_relation',{
              relation: e.target.value,
              parentIndex
            })}
          >
            <Radio value="and">并且</Radio>
            <Radio value="or">或者</Radio>
          </RadioGroup>
          {
            item.filters.map((filter, index) => {
              let props = {
                relation: item.relation,
                dimensions,
                measure,
                modifier: this.modifier,
                filterTypeTextMap,
                strFilterTypeTextMap,
                updateMeasure: this.updateMeasure,
                onPickFilterProp: this.onPickFilterProp,
                relationTextMap,
                filter,
                index,
                dimensionTree,
                parentIndex
              }
              return <DQFilterItemMeasure key={index} {...props} />
            })
          }
          <div className="add-button-wrap pd1y">
            <a className="pointer"
              onClick={() => this.updateMeasure('add_filter', {
                index: parentIndex,
                relation: item.relation
              })}
              title="增加一个指标条件"
            >
              <PlusCircleOutlined className="mg1r" />
              增加一个指标条件
            </a>
            <Popconfirm
              title={'确定删除整个指标条件块么？'}
              placement="topLeft"
              onConfirm={() => this.updateMeasure('delete_parent_filter', {
                parentIndex
              })}
            >
              <a className="mg2l pinter">
                <CloseCircleOutlined className="mg1r" />
                删除整个指标条件块
              </a>
            </Popconfirm>
          </div>
        </div>
      </div>
    );
  }

  renderFilters = () => {
    let { formItemLayout, measure} = this.props
    let simpleFormula = measure.params.simple
    return (
      <FormItem {...formItemLayout} label="指标条件">
        <div className="filters">
          {this.renderRelation()}
          {simpleFormula.filters.map(this.renderFilter)}
          {this.renderAddBtn()}
        </div>
      </FormItem>
    )
  }

  render () {
    let {measure, dimensions} = this.props
    if(dimensions.length === 0){
      return null
    }
    return (
      <div>
        {measure.hideMeasumeDef ? '' : this.renderMeasureDef()}
        {this.renderFilters()}
      </div>
    )
  }

}


export default DataQualityMeasureItem
