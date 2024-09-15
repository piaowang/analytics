import React from 'react'
import { CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Radio, Select, Popconfirm } from 'antd'
import FilterItemMeasure from './filter-item-dimension'
import {DruidColumnTypeInverted} from '../../../common/druid-column-type'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const Option = Select.Option
const FormItem = Form.Item

class MeasureCompositeModal extends React.Component {
  addFilter = () => {
    let {updateMeasure, relation} = this.props
    updateMeasure('add_parent_filter', relation)
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
    )
  }

  renderMeasureDef = () => {
    let {simpleFormula, statisticsTypeTextMap, statisticsDimensions,
      updateMeasure, dimensionTree, statisticsTypeList, dimensions, formItemLayout } = this.props

    //获取统计类型
    let selectDimName = simpleFormula.statistics.dimensionName || dimensions[0].name
    const selectDim = dimensionTree[selectDimName]
    // 取出对应维度可以使用的聚合函数如['count', 'countDistinct'], 如果未匹配上就默认count,countDistinct可使用
    // 根据维度类型适配对应的可用统计函数
    const statisticsTypeKeys = statisticsTypeList[DruidColumnTypeInverted[selectDim.type]] || ['count', 'countDistinct']
    return (
      <FormItem {...formItemLayout} label="指标定义">
        {
          <div className="mg1b mg1r">
            <div className="iblock">
              <div className="iblock">统计维度</div>
              <Select
                {...enableSelectSearch}
                className="width200 mg1r mg1l iblock-force"
                value={selectDimName}
                onChange={(value) => {
                  updateMeasure('update_statistics_dimension', value)
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
                  updateMeasure('update_statistics_type', value)
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
    let {updateMeasure } = this.props
    updateMeasure('update_parent_relation',{
      relation: e.target.value
    })
  }

  renderRelation = () => {
    let {simpleFormula} = this.props
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

  renderRelationTag = (parentIndex, simpleFormula, baseProps) => {
    return parentIndex ? (
      <div className="relation-status">
        {baseProps.relationTextMap[simpleFormula.relation]}
      </div>
    ) : null
  }

  renderFilter = (item, parentIndex) => {
    let {simpleFormula, baseProps,
      updateMeasure, dimensionTree, relation} = this.props
    return (
      <div key={parentIndex + '@mi'}>
        {this.renderRelationTag(parentIndex, simpleFormula, baseProps)}
        <div className="filter-content mg1t">
          <RadioGroup
            value={item.relation}
            onChange={e => updateMeasure('update_filter_relation',{
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
                ...baseProps,
                filter,
                index,
                dimensionTree,
                parentIndex
              }
              return <FilterItemMeasure key={index} {...props} />
            })
          }
          <div className="add-button-wrap pd1y">
            <a className="pointer"
              onClick={() => updateMeasure('add_filter', {
                index: parentIndex,
                relation
              })}
              title="增加一个指标条件"
            >
              <PlusCircleOutlined className="mg1r" />
              增加一个指标条件
            </a>
            <Popconfirm
              title={'确定删除整个指标条件块么？'}
              placement="topLeft"
              onConfirm={() => updateMeasure('delete_parent_filter', {
                parentIndex
              })}
            >
              <a className="mg2l pointer">
                <CloseCircleOutlined className="mg1r" />
                删除整个指标条件块
              </a>
            </Popconfirm>
          </div>
        </div>
      </div>
    )
  }

  renderFilters = () => {
    let {simpleFormula, formItemLayout } = this.props
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
    return (
      <div>
        {this.renderMeasureDef()}
        {this.renderFilters()}
      </div>
    )
  }
}

export default MeasureCompositeModal
