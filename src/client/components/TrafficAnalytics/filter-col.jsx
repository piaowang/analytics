/**
 * 
 */
import {Component} from 'react'
import _ from 'lodash'
import { DownOutlined } from '@ant-design/icons';
import { Button, Popover, Menu, Checkbox, Input, message } from 'antd';
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import Loading from '../../components/Common/loading'
import DruidColumnType, {DruidColumnTypeInverted, isTimeDimension, isNumberDimension} from '../../../common/druid-column-type'
import {immutateUpdate} from '../../../common/sugo-utils'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'

const Search = Input.Search
const {distinctDropDownFirstNLimit = 10} = window.sugo

class FilterCol extends Component {
  state = {
    popoverVisible: false,
    tempValue: {}
  }

  componentWillReceiveProps(nextProps) {
    let {value = []} = nextProps
    let tempValue = value.reduce((prev, filter) => {
      prev[filter.col] = filter.eq.concat()
      if(filter.containsNull) prev[filter.col].push(EMPTY_VALUE_OR_NULL)
      return prev
    }, {})
    this.setState({tempValue})
  }
  

  renderPopoverContent() {
    const {dbDimensions, dataSource, condition, topNFilters = [], optionDict = {}} = this.props
    const {tempValue} = this.state
    let finalFilter = topNFilters 
    return condition.dimensions.map((dimension, i) => {
      const options = optionDict[dimension]
      return (
        <Single
          key={dimension}
          dbDimensions={dbDimensions.filter(d => d.name === dimension)}
          dataSourceId={dataSource.id}
          finalFilter={finalFilter}
          doFetch={!options || !options.length}
          value={tempValue[dimension]}
          options={options}
          onChange={eq => {
            this.setState({
              tempValue: Object.assign({}, tempValue, {[dimension]: eq})
            })
          }}
          name={condition.dimensionDes[i]}
        />
      )
    })
  }

  onPopoverVisibleChange(popoverVisible) {
    this.setState({popoverVisible})
  }

  onChange = () => {
    const {tempValue} = this.state
    const {dbDimensions} = this.props
    let dbDimNameDict = _.keyBy(dbDimensions, 'name')
    let filters = Object.keys(tempValue).map(key => {
      if(!tempValue[key]) return null
      let dbDim = dbDimNameDict[key]
      let type = DruidColumnTypeInverted[dbDim.type]
      let filter = {
        col: key,
        op: 'in',
        eq: tempValue[key].concat()
      }
      if(!filter.eq.length) {
        message.warning('不选为不限制')
        return null
      }
      if(filter.eq.includes(EMPTY_VALUE_OR_NULL)) {
        filter.containsNull = true
        filter.eq = filter.eq.filter(v => v !== EMPTY_VALUE_OR_NULL)
      }
      if(type === 'number') {
        filter.type = 'number'
        filter.op = 'in-ranges'
      }
      return filter
    }).filter(f => f)
    this.props.onChange(filters)
    this.onPopoverVisibleChange(false)
  }

  render() {
    let {condition, value, className, getPopupContainer} = this.props
    
    if(value && value.length) {
      value = value.reduce((p, f) => p.concat(f.eq), [])
      value.join(',')
      value = _.truncate(value, {'length': 15})
    } else {
      value = '全部'
    }

    let content = (
      <div>
        {this.renderPopoverContent()}

        <div className="aligncenter pd2b">
          <Button
            type="ghost"
            className="mg3r"
            onClick={() => this.onPopoverVisibleChange(false)}
          >取消</Button>
          <Button
            type="primary"
            onClick={this.onChange}
          >确认</Button>
        </div>
      </div>
    )

    return (
      <Popover
        getPopupContainer={getPopupContainer}
        overlayClassName="custom-filter-popover"
        placement="bottom"
        trigger="click"
        arrowPointAtCenter
        content={content}
        visible={this.state.popoverVisible}
        onVisibleChange={visible => this.setState({popoverVisible: visible})}
      >
        <Button className={className || 'itblock mg2r mg1b bg-dark-white filter-col'}>
          <span>{condition.title + '：'}</span>
          <span>{value}</span>
          <DownOutlined className="color-purple-blue" />
        </Button>
      </Popover>
    );
  }
}

class Single extends Component {
  state = {
  }
  
  isAll(options = [], values = []) {
    const {value} = this.props
    return !value || !options.some(o => !values.includes(o))
  }

  selectAll = e => {
    let all = e.target.checked
    this.props.onChange(all ? null : [])
  }

  change = e => {
    const {onChange, value = []} = this.props
    const val = e.target.value
    const isAll = this.isAll(this._options, value)
    const _value = (isAll ? this._options : value).concat()

    onChange(e.target.checked ? _value.concat(val) : _value.filter(prev => prev !== val))
  }

  render() {
    const {dbDimensions, dataSourceId, finalFilter, doFetch, dimExtraSetting, value = [], name, options = []} = this.props
    const dbDimension = dbDimensions[0]
    return(
      <DruidDataFetcher
        debounce={500}
        dbDimensions={dbDimensions}
        dataSourceId={dataSourceId}
        dimensions={[dbDimension.name]}
        metrics={[]}
        customMetrics={[{name: 'count', formula: '$main.count()'}]}
        filters={finalFilter}
        doFetch={doFetch}
        timezone={'Asia/Shanghai'}
        dimensionExtraSettingDict={{
          [dbDimension.name]: {...dimExtraSetting, sortCol: 'count', sortDirect: 'desc', limit: distinctDropDownFirstNLimit }
        }}
        groupByAlgorithm="topN"
      >
        {
          ({isFetching, data, fetch}) => {
            let topN = (data || []).map(d => d[dbDimension.name])
            if(options && options.length) {
              topN = options
            }
            this._options = topN
            const isAll = this.isAll(topN, value)
            const _value = (isAll ? topN : value).concat()
            return (
              <div style={{minHeight: 200, width: 200}} className="iblock borderr mg2b">
                <div className="filter-setting-popover">
                  <div className="pd1y aligncenter bg-dark-white">{name}</div>
                  <Search
                    placeholder="搜索"
                    onChange={e => {
                      let keyword = e.target.value
                      if (keyword) {
                        fetch(prevBody => {
                          return immutateUpdate(prevBody, 'filters', () => {
                            return [{col: dbDimension.name, op: 'contains', eq: [keyword], ignoreCase: true}]
                          })
                        })
                      } else {
                        fetch()
                      }
                    }}
                  />
                  <Loading isLoading={isFetching}>
                    {isFetching || topN.length
                      ? null
                      : <div className="aligncenter pd3t width-100" style={{position: 'absolute'}}>查无数据</div>}
                    <Menu
                      prefixCls="ant-select-dropdown-menu"
                      className="anlytic-filter-menu"
                      style={{
                        overflow: 'auto',
                        maxHeight: 300
                      }}
                    >
                      <Menu.Item>
                        <Checkbox
                          checked={isAll}
                          onChange={this.selectAll}
                        >
                      全选
                        </Checkbox>
                      </Menu.Item>
                      {topN.map(val => {
                        if (!val) {
                          val = EMPTY_VALUE_OR_NULL
                        }
                        return (
                          <Menu.Item key={val}>
                            <Checkbox
                              checked={_value.includes(val)}
                              value={val}
                              onChange={this.change}
                            >
                              {val}
                            </Checkbox>
                          </Menu.Item>
                        )
                      })}
                    </Menu>
                  </Loading>
                </div>
              </div>
            )
          }
        }
      </DruidDataFetcher>
    )
  }
}

export default FilterCol
