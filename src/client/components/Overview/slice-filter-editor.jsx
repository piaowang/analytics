import React from 'react'
import { ClockCircleOutlined, FilterOutlined } from '@ant-design/icons'
import {Button, Select} from 'antd'
import _ from 'lodash'
import {convertDateType, defaultFormat, isRelative} from '../../../common/param-transform'
import {vizTypeLimitNameMap} from '../../constants/viz-component-map'
import DateRangePicker from '../Common/time-picker'
import FilterEditor from '../Slice/filter-editor'
import DimensionFetcher from '../Fetcher/data-source-dimensions-fetcher'

export default class SliceFilterEditor extends React.Component {
  state = {
    isEditingFilter: false
  }

  dateChange = ({dateType: relativeTime, dateRange: [since, until]}) => {
    let {sliceUpdater} = this.props
    sliceUpdater('params.filters', oriFilters => {
      let timeFltIndex = _.findIndex(oriFilters, flt => flt.col === '__time')
      let nextTimeFlt = {
        col: '__time',
        op: 'in',
        eq: relativeTime === 'custom' ? [since, until] : relativeTime
      }
      if (timeFltIndex === -1) {
        return [...(oriFilters || []), nextTimeFlt]
      }
      return oriFilters.map((flt, i) => i === timeFltIndex ? nextTimeFlt : flt)
    })
  }

  setDefaultDate = () => {
    let dateType = '-7 days'
    this.dateChange({
      dateType,
      dateRange: convertDateType(dateType, defaultFormat())
    })
  }

  render() {
    let {sliceUpdater, slice, showModal} = this.props
    let {isEditingFilter} = this.state
    if (!showModal) {
      return null
    }
    let {filters, dimensionExtraSettingDict, dimensions, vizType} = slice.params

    let isNormalFilter = flt => (flt.col !== '__time' || !_.endsWith(flt.op, 'in')) && flt.op !== 'lookupin'
    let normalFilters = _.filter(filters, isNormalFilter)

    let _timeFlt = _.find(filters, flt => flt.col === '__time')
    let timeFlt = _timeFlt || {col: '__time', op: 'in', eq: '-7 days'}
    let relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)

    let dateRangePicker = _timeFlt ? (
      <DateRangePicker
        className="iblock width260"
        dateType={relativeTime}
        dateRange={[since, until]}
        onChange={this.dateChange}
      />
    ) : <Button icon={<ClockCircleOutlined />} onClick={this.setDefaultDate}>添加时间条件</Button>

    return (
      <div className="pd2b">
        <Button
          icon={<FilterOutlined />}
          onClick={() => this.setState({isEditingFilter: true})}
          disabled={!slice.druid_datasource_id}
        >
          {`过滤${normalFilters.length === 0 ? '' : `（${normalFilters.length}）`}`}
        </Button>
        <span className="headerText pd2l pd1r">时间范围</span>
        {dateRangePicker}
        
        <span className="headerText pd2l pd1r">{vizTypeLimitNameMap[vizType]}</span>
        {!vizTypeLimitNameMap[vizType] ? null :
          <Select
            dropdownMatchSelectWidth={false}
            disabled={_.isEmpty(dimensions)}
            style={{width: '6em'}}
            value={'' + (_.get(dimensionExtraSettingDict, [dimensions && dimensions[0], 'limit']) || 10)}
            onChange={val => {
              sliceUpdater('params.dimensionExtraSettingDict', dict => {
                return _.defaultsDeep({[dimensions[0]]: {limit: val * 1}}, dict)
              })
            }}
          >
            <Select.Option value="5">5</Select.Option>
            <Select.Option value="10">10</Select.Option>
            <Select.Option value="25">25</Select.Option>
            <Select.Option value="50">50</Select.Option>
            <Select.Option value="100">100</Select.Option>
          </Select>}
        <DimensionFetcher
          dataSourceId={slice.druid_datasource_id}
          doFetch={isEditingFilter}
        >
          {({data: dataSourceDimensions, isFetching: isFetchingDataSourceDimensions}) => {
            if (isFetchingDataSourceDimensions) {
              return <span>{'正在加载...'}</span>
            }
            return (
              <FilterEditor
                dataSourceId={slice.druid_datasource_id}
                dataSourceName={slice.datasource_name}
                relativeTime={relativeTime}
                dimensionExtraSettingDict={slice.params.dimensionExtraSettingDict}
                since={since}
                until={until}
                allFilterable={dataSourceDimensions}
                filters={normalFilters}
                isShowing={isEditingFilter}
                onClose={() => this.setState({isEditingFilter: false})}
                onFiltersChange={newNormalFilters => {
                  sliceUpdater('params.filters', oriFilters => {
                    let keep = oriFilters.filter(_.negate(isNormalFilter))
                    return keep.concat(newNormalFilters)
                  })
                }}
              />
            )
          }}
        </DimensionFetcher>
      </div>
    )
  }
}
