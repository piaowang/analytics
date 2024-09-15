import React from 'react'
import { Select } from 'antd'
import _ from 'lodash'
import Loading from '../Common/loading'
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import {convertDateType} from 'common/param-transform'

const Option = Select.Option

export default class PageDistinctSelect extends React.Component {

  shouldComponentUpdate(nextProps) {
    return !_.isEqual(this.props, nextProps)
  }

  render () {
    let {
      disabled, onBlur, dbDim,
      datasource_id, since, until, relativeTime,
      value, onChange, getPopupContainer
    } = this.props

    if (!datasource_id) return null
    
    let props = {
      dbDim,
      dataSourceId: datasource_id,
      since,
      until,
      relativeTime
    }
    let [finalSince, finalUntil] = relativeTime === 'custom'
      ? [since, until]
      : convertDateType(relativeTime)
    return (
      <DistinctCascadeFetcher
        {...props}
      >
        {({isFetching, data, onSearch, isWaitingForInput}) => {
          let data0 = data ? [...data].filter(_.identity) : []
          if (isFetching) data0 = [{
            value: '__loading',
            title: '载入中...'
          }]
          let notFoundContent = isFetching
            ? '加载中'
            : isWaitingForInput ? '等待输入' : `${finalSince} ~ ${finalUntil}无访问记录`
          return (
            <Loading className="iblock" isLoading={isFetching}>
              <Select
                getPopupContainer={getPopupContainer}
                className="inline width140 mg1r"
                value={value || undefined}
                disabled={disabled}
                showSearch
                notFoundContent={notFoundContent}
                dropdownMatchSelectWidth={false}
                placeholder="请选择页面"
                onSearch={onSearch}
                onChange={onChange}
                onBlur={onBlur}
              >
                {
                  data0.map((m, i) => {
                    let v = m.value || m
                    return (
                      <Option key={v + '@fv' + i} value={v}>
                        {m.title || v}
                      </Option>
                    )
                  })
                }
              </Select>
            </Loading>
          )
        }}
      </DistinctCascadeFetcher>
    )
  }
}
