import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Select, Tooltip, InputNumber } from 'antd'
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import DistinctSelect from './distinct-input'
import _ from 'lodash'

const Option = Select.Option

/**
 * 复合维度数值/字符串分组条件规则，规则视图
 * 
 * @export
 * @class DimensionGroupRuleItem
 * @extends {React.Component}
 */
export default class DimensionGroupRuleItem extends React.Component {

  updateGroupRuleDimensionName = (name) => {
    // index是规则的序号, parentIndex是分组序号
    const { index, parentIndex, params, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    const currentFilter = groupFilters[parentIndex]
    const rule = currentFilter.rule[index]
    rule.dimensionName = name
    updateDimensionParams(params)
  }

  updateGroupRuleFilterType = (type) => {
    const { index, parentIndex, params, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    const currentFilter = groupFilters[parentIndex]
    const rule = currentFilter.rule[index]
    let {value} = rule
    rule.type = type
    if (type === 'in' && value && _.isString(value)) {
      rule.value = [value]
    } else if (type === 'is' && _.isArray(value) && value[0]) {
      rule.value = value[0]
    }
    updateDimensionParams(params)
  }

  onDelete = () => {
    const { index, parentIndex, params, updateDimensionParams } = this.props
    const { groupFilters = [] } = params
    const currentFilter = groupFilters[parentIndex]
    currentFilter.rule.splice(index, 1)
    updateDimensionParams(params)
  }

  render() {
    // 这里的filter就是groupFilters里的一条记录里的一条rule (e.g. { groupFilters: [ { groupName: xxx, rule: [{ xxx }] } ]})
    const { index, filter, dimension, filterTypeTextMap, strFilterTypeTextMap, params: { groupFilters },
      //dataSourceName,
      onPickFilterProp, dimensionTree, parentIndex, relationTextMap, relation
    } = this.props
    // 只剩一个不能删除
    const canDelete = groupFilters[parentIndex].rule.length > 1
    //将 since until 置空，使用默认时间查询
    let [since, until] = ['', '']
    let baseProps = {
      disabled: false,
      filter,
      index,
      onPickFilterProp
    }
    //维度类型如果为数值，显示数字输入框，如果为字符类型，则显示选择框
    let valueType = (dimensionTree[dimension.name] && dimensionTree[dimension.name].type === 2) ? 'str' : 'num'
    let typeTextMap = valueType === 'str' ? strFilterTypeTextMap : filterTypeTextMap

    return (
      <div>
        <div className="filter-wrap" key={index}>
          {
            index
              ? <div className="relation-status">
                {relationTextMap[relation]}
              </div>
              : null
          }
          <div className="filter">
            {/*<Select
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
              className="iblock width140 mg1r"
              value={filter.dimensionName}
              onChange={(value) => {
                {
                  this.updateGroupRuleDimensionName(value)
                }
              }}
            >
              <Option key="none" value="none">请选择</Option>
              {
                //每个维度集合都有时间维度，用户调整时间不在公式里控制，需要过滤
                dimensions.map((dimension, i) => {
                  return (
                    <Option key={i + ''} value={dimension.name + ''}>
                      {dimension.title || dimension.name}
                    </Option>
                  )
                })
              }
            </Select>*/}
            <div className="inline">
              <Select
                dropdownMatchSelectWidth={false}
                className="width100 mg1r iblock"
                onChange={(value) => {
                  this.updateGroupRuleFilterType(value)
                }}
                inline
                placeholder="请选择"
                showSearch
                value={filter.type || undefined}
              >
                {
                  (Object.keys(typeTextMap)).map((filterType) => {
                    return (
                      <Option key={filterType} value={filterType}>
                        {typeTextMap[filterType]}
                      </Option>
                    )
                  })
                }
              </Select>
              {
                ['isEmpty', 'notEmpty'].includes(filter.type) || (
                  valueType === 'str'
                    ? <DistinctCascadeFetcher
                      since={since}
                      until={until}
                      dbDim={dimension}
                      dataSourceId={dimension.parentId}
                    >
                      {({isFetching, data, onSearch, isWaitingForInput}) => {
                        let notFoundContent = isFetching
                          ? '加载中'
                          : (dimension.name
                            ? (isWaitingForInput ? '等待输入' : '查无数据')
                            : '未选择维度')
                        return (
                          <DistinctSelect
                            {...baseProps}
                            data={data}
                            notFoundContent={notFoundContent}
                            onSearch={onSearch}
                            isFetching={isFetching}
                            parentIndex={parentIndex}
                          />
                        )
                      }}
                    </DistinctCascadeFetcher>
                    : filter.type === 'between'
                      ? <div className="inline mg2l">
                    最小:
                        <InputNumber
                          value={filter.value[0]}
                          disabled={false}
                          className="iblock width80 mg1l"
                          onChange={(v) => {
                            onPickFilterProp(index, parentIndex, v, 0)
                          }}
                        />
                    最大:
                        <InputNumber
                          value={filter.value[1]}
                          disabled={false}
                          className="iblock width80 mg1l"
                          onChange={(v) => {
                            onPickFilterProp(index, parentIndex, v, 1)
                          }}
                        />
                      </div>
                      : <InputNumber
                        value={filter.value}
                        disabled={false}
                        className="iblock width140"
                        onChange={(v) => {
                          onPickFilterProp(index, parentIndex, v)
                        }}
                      />
                )
              }
            </div>
            {
              canDelete
                ?
                <Tooltip title="删除">
                  <CloseCircleOutlined className="font16 color-grey pointer iblock" onClick={this.onDelete} />
                </Tooltip>
                :
                null
            }
          </div>
        </div>
      </div>
    )
  }
}
