import React from 'react'
import PropTypes from 'prop-types'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import _ from 'lodash'
import {DruidColumnTypeInverted, isTimeDimension} from '../../../common/druid-column-type'
import {immutateUpdate} from '../../../common/sugo-utils'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Select, Row, Col, Input, message } from 'antd';
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {withApps} from '../Fetcher/app-fetcher'
import {AccessDataOriginalType} from '../../../common/constants'

const {Option} = Select

const defaultDimFilter = dbDim => dbDim.name !== '__time' && !_.get(dbDim.params, 'type')

@withApps(props => {
  return {
    projectId: props.projectId,
    doFetch: !!props.projectId
  }
})
@withDbDims(props => {
  let {dataSourceId, dimensionOptionFilter = defaultDimFilter} = props
  return {
    dataSourceId: dataSourceId,
    doFetch: !!dataSourceId,
    datasourceType: 'all',
    resultFilter: dimensionOptionFilter
  }
})
class CommonDruidFieldPanel extends React.Component {

  onAppendFilter = () => {
    let {dataSourceDimensions, filters, onFiltersChange, uniqFilter} = this.props
    if (uniqFilter) {
      // 筛选维度选过了就不能再选了
      let excludeFilterColSet = new Set(filters.map(f => f.col))
      dataSourceDimensions = dataSourceDimensions.filter(dbDim => !excludeFilterColSet.has(dbDim.name))
    }
    let dbDim = dataSourceDimensions[0]
    if (!dbDim) {
      message.warn('没有属性项可选')
      return
    }
    let nextFilters = [...filters, {
      id: dbDim.id,
      col: dbDim.name,
      type: DruidColumnTypeInverted[dbDim.type],
      name: ''
    }]
    onFiltersChange(nextFilters)
  }

  renderFilterTile = ({filter, idx, dbDimDict, className}) => {
    let {
      dataSourceDimensions, filters, getPopupContainer, onFiltersChange, uniqFilter
    } = this.props
    let {col: dimName, name} = filter

    if (uniqFilter) {
      // 筛选维度选过了就不能再选了
      let excludeFilterColSet = new Set(filters.filter((f, i) => i < idx).map(f => f.col))
      dataSourceDimensions = dataSourceDimensions.filter(dbDim => !excludeFilterColSet.has(dbDim.name))
    }
    return (
      <div
        key={idx}
        className={className}
      >
        <Select
          size="middle"
          className="width120 itblock mg1r"
          {...enableSelectSearch}
          dropdownMatchSelectWidth={false}
          value={dimName || undefined}
          placeholder="请选择维度"
          getPopupContainer={getPopupContainer}
          onChange={val => {
            let nextDbDim = dbDimDict[val]
            onFiltersChange(immutateUpdate(filters, [idx], prevFilter => {
              return {
                ...prevFilter,
                id: nextDbDim.id,
                name: nextDbDim.name,
                col: val,
                type: DruidColumnTypeInverted[nextDbDim.type]
              }
            }))
          }}
        >
          {dataSourceDimensions.map(dbDim0 => {
            return (
              <Option key={dbDim0.name} value={dbDim0.name}>{dbDim0.title || dbDim0.name}</Option>
            )
          })}
        </Select>

        <Input 
          className="width100 mg1r itblock" 
          placeholder="请输入标签别名"
          value={name}
          onChange={e => {
            const newFiletes = filters[idx]
            newFiletes.name = e.target.value
            onFiltersChange([
              ...filters
            ])
          }}
        />

        <div className="itblock width30 aligncenter">
          <MinusCircleOutlined
            title="移除这个过滤条件"
            className="color-grey font16 pointer line-height32 hover-color-red"
            data-filter-idx={idx}
            onClick={this.onRemoveFilterClick} />
        </div>
      </div>
    );
  }

  onRemoveFilterClick = ev => {
    let filterIdx = +ev.target.getAttribute('data-filter-idx')

    let {filters, onFiltersChange} = this.props
    onFiltersChange(filters.filter((f, i) => i !== filterIdx))
  }

  render() {
    let {
      filters,
      dataSourceDimensions,
      noDefaultDimension,
      className, style, timePickerProps, onFiltersChange
    } = this.props

    let dbDimDict = _.keyBy(dataSourceDimensions, 'name')
    if (!timePickerProps && !filters.length && dataSourceDimensions.length && noDefaultDimension) {
      if (!dataSourceDimensions[0]) {
        message.error('没有属性项可选')
        return
      }
      let dbDim = dataSourceDimensions[0]
      filters = [{
        col: undefined,
        type: DruidColumnTypeInverted[dbDim.type],
        name: ''
      }]
      onFiltersChange(filters)
    }
    return (
      <div className={className} style={style}>
        <div className="mg1b">
          {(filters || []).map((flt, idx) => {
            return this.renderFilterTile({
              key: idx,
              filter: flt,
              idx,
              dbDimDict,
              className: idx !== filters.length - 1 ? 'mg1b' : undefined
            })
          })}
        </div>

        <div className="pd1t">
          <span
            className="pointer color-black font12"
            onClick={this.onAppendFilter}
            title="增加一个过滤维度"
          >
            <PlusCircleOutlined className="mg1r color-green font14" />
            增加一个过滤维度
          </span>
        </div>
      </div>
    );
  }
}

CommonDruidFieldPanel.propTypes ={
  className: PropTypes.any,
  style: PropTypes.object,
  timePickerProps: PropTypes.object,
  filters: PropTypes.array.isRequired,
  dataSourceDimensions: PropTypes.array,
  noDefaultDimension: PropTypes.bool,
  onFiltersChange: PropTypes.func
}

export default CommonDruidFieldPanel
