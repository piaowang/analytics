import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import FixWidthHelper from '../../components/Common/fix-width-helper-no-hidden'
import { CloseOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons'
import { Tooltip, Menu, Checkbox, message } from 'antd'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import DruidColumnType, { isTimeDimension, isNumberDimension, isTextDimension, DruidColumnTypeInverted } from '../../../common/druid-column-type'
import Loading from '../../components/Common/loading'
import Search from '../Common/search'
import withAutoFocus from '../Common/auto-focus'
import HighLightString from '../Common/highlight-string'
import * as PubSub from 'pubsub-js'
import { withDebouncedOnChange } from '../Common/with-debounce-on-change'
import { granularityToFormat, dateFormatterGenerator } from '../../common/date-format-util'
import { immutateUpdate } from '../../../common/sugo-utils'
import classNames from 'classnames'
import SortButton from '../Common/sort-btn'
import HoverHelp from '../Common/hover-help'
import helpLinkMap from 'common/help-link-map'
import { EMPTY_VALUE_OR_NULL } from '../../../common/constants'
import { Anchor } from '../Common/anchor-custom'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/analytic#nail']
const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 1300)
const InputWithAutoFocus = withAutoFocus(InputWithDebouncedOnChange)

export default class DingPanel extends React.Component {
  static propTypes = {
    dbDimensions: PropTypes.array.isRequired,
    dataSourceId: PropTypes.string.isRequired,
    filters: PropTypes.array,
    timezone: PropTypes.string
  }

  static defaultProps = {}

  state = {
    isSearching: false,
    searchingText: '',
    rowCountSortDirect: 'desc'
  }

  componentDidMount() {
    PubSub.subscribe('analytic.onDropToDing', (msg, name) => {
      this.setDingDimension(name)
    })
  }

  componentDidUpdate(prevProps, prevState) {
    if (!_.isEqual(this.props.dataSourceId, prevProps.dataSourceId)) {
      this.setState({ isSearching: false, searchingText: '', rowCountSortDirect: 'desc' })
    }
  }

  componentWillUnmount() {
    PubSub.unsubscribe('analytic.onDropToDing')
  }

  onDrop(ev) {
    ev.preventDefault()
    ev.stopPropagation()
    let payload = ev.dataTransfer.getData('text')
    let [type, name] = payload.split(':')
    if (type === '维度') {
      let { dbDimensions } = this.props
      let dbDim = _.find(dbDimensions, dbDim0 => name === dbDim0.name)
      if (isTextDimension(dbDim)) {
        message.warning('Text 类型维度不能用于钉板')
        return
      }
      this.setDingDimension(name)
    } else {
      message.error('只接受维度项')
    }
  }

  setDingDimension(name) {
    this.setState({
      isSearching: false,
      searchingText: '',
      rowCountSortDirect: 'desc'
    })
    let { updateHashStateByPath } = this.props
    updateHashStateByPath('pinningDims[0]', () => name)
  }

  getCurrGroupFormatter() {
    let { dbDimensions, dimensionExtraSettingDict, dingingDbDimensionName } = this.props

    let dbDim = _.find(dbDimensions, dbDim => dbDim.name === dingingDbDimensionName)

    return dbDim && isTimeDimension(dbDim)
      ? dateFormatterGenerator(granularityToFormat(_.get(dimensionExtraSettingDict, `${dingingDbDimensionName}.granularity`) || 'P1D'))
      : _.identity
  }

  cleanSelections = () => {
    let { updateHashState, dingingDbDimensionName } = this.props

    updateHashState(prevState => {
      return {
        filters: prevState.filters
          .map(flt => {
            if (flt.col === dingingDbDimensionName && flt.op !== 'lookupin') {
              return { ...flt, eq: [] }
            } else {
              return flt
            }
          })
          .filter(flt => (_.isArray(flt.eq) ? flt.eq.length : flt.eq)) // 排除空的过滤器
      }
    })
  }

  setGroups = nextEq => {
    let { dingingDbDimensionName, dbDimensions, updateHashState, dimensionExtraSettingDict, mainTimeDimName } = this.props

    let dbDim = _.find(dbDimensions, dbDim => dbDim.name === dingingDbDimensionName)

    let newFilterAppender
    let stateMapper = prevState => {
      let temp0 = immutateUpdate(prevState, 'filters', filters => filters.filter(flt => flt.col !== dingingDbDimensionName || flt.op === 'lookupin'))

      let temp1 = immutateUpdate(temp0, 'filters', newFilterAppender)

      return immutateUpdate(temp1, 'filters', filters => filters.filter(flt => (_.isArray(flt.eq) ? flt.eq.length : flt.eq)))
    }

    let druidColumnTypeInverted = DruidColumnTypeInverted[dbDim.type]

    if (dingingDbDimensionName !== mainTimeDimName && druidColumnTypeInverted === 'string') {
      newFilterAppender = filters => [
        ...filters,
        {
          col: dingingDbDimensionName,
          op: 'in',
          eq: nextEq,
          containsNull: nextEq[0] === EMPTY_VALUE_OR_NULL,
          type: druidColumnTypeInverted
        }
      ]
    } else if (isNumberDimension(dbDim) || isTimeDimension(dbDim)) {
      let granularity = _.get(dimensionExtraSettingDict, `${dingingDbDimensionName}.granularity`) || (isNumberDimension(dbDim) ? 10 : 'P1D')
      newFilterAppender = filters => [
        ...filters,
        {
          col: dingingDbDimensionName,
          op: 'in-ranges',
          eq: nextEq,
          containsNull: _.includes(nextEq, EMPTY_VALUE_OR_NULL),
          granularity,
          type: druidColumnTypeInverted
        }
      ]
    } else {
      throw new Error(`Can not identity this column's type: ${dbDim.title || dbDim.name}`)
    }
    updateHashState(stateMapper)
  }

  render() {
    let { dingingDbDimensionName, dataSourceId, dbDimensions, filters, dimensionExtraSettingDict, className, style, mainTimeDimName } = this.props
    let { isSearching, searchingText, rowCountSortDirect } = this.state

    let dbDim = dingingDbDimensionName && _.find(dbDimensions, dbDim => dbDim.name === dingingDbDimensionName)

    // 如果已有时间或数值 in 类型等的过滤器，则清除
    const isStringDim = dbDim && dingingDbDimensionName !== mainTimeDimName && (dbDim.type === DruidColumnType.String || dbDim.type === DruidColumnType.StringArray)

    let finalFilter
    if (dbDim && isStringDim && isSearching && searchingText) {
      // 输入查询条件后
      finalFilter = filters
        .filter(flt => flt.col !== dingingDbDimensionName)
        .concat([
          {
            col: dingingDbDimensionName,
            op: 'startsWith',
            eq: searchingText
          }
        ])
    } else if (dbDim) {
      // 钉板的选择不能影响钉板的查询结果
      finalFilter = filters.filter(flt => flt.col !== dingingDbDimensionName)
    } else {
      // 选择维度之前，其实不会去查询
      finalFilter = filters
    }

    // normalize filters, 减少钉板的不必要的刷新
    finalFilter = _.orderBy(
      finalFilter.filter(flt => !_.isEmpty(flt.eq)),
      ['col', 'op']
    )

    let groupValFormatter = this.getCurrGroupFormatter()

    let dingingDimExtraSetting = _.get(dimensionExtraSettingDict, dingingDbDimensionName) || {}

    return (
      <div style={style} className={className} onDrop={ev => this.onDrop(ev)} onDragOver={ev => ev.preventDefault()}>
        <div className='height-100 bg-white corner'>
          <div style={{ height: 43, padding: '0 10px', lineHeight: '38px', borderBottom: '1px solid #d2d8dc' }} className='elli'>
            <HoverHelp
              addonBefore='钉板 '
              link={helpLink}
              type='no'
              content={
                <p>
                  钉板是用户对同一维度下进行不同角度的对比。
                  <br />
                  <Anchor href={helpLink} target='_blank' className='pointer'>
                    <ExportOutlined /> 查看帮助文档
                  </Anchor>
                </p>
              }
            />
          </div>

          <DruidDataFetcher
            dbDimensions={dbDimensions}
            dataSourceId={dataSourceId}
            customMetrics={[{ name: 'rowCount', formula: '$main.count()' }]}
            dimensionExtraSettingDict={
              dingingDbDimensionName ? { [dingingDbDimensionName]: { ...dingingDimExtraSetting, sortCol: 'rowCount', sortDirect: rowCountSortDirect, limit: 100 } } : {}
            }
            dimensions={[dingingDbDimensionName].filter(_.identity)}
            filters={finalFilter}
            doFetch={!!dbDim}
            groupByAlgorithm='groupBy'
            withGlobalMetrics={false}
          >
            {({ isFetching, data }) => {
              if (!dingingDbDimensionName) {
                return (
                  <div className='aligncenter color-grey font13 noselect' style={{ height: 'calc(100% - 40px)', paddingTop: '30px' }}>
                    点击或拖拽维度到钉板
                  </div>
                )
              }

              let targetFlt = _.find(filters, flt => {
                if (isStringDim) {
                  return flt.col === dingingDbDimensionName && flt.op !== 'lookupin'
                }
                return flt.col === dingingDbDimensionName && flt.op !== 'lookupin' && _.endsWith(flt.op, 'in-ranges')
              })
              let alreadyHasFilter = !!targetFlt

              let currEq = alreadyHasFilter ? targetFlt.eq : []

              let showCleanSelectionBtn = !!(currEq || []).length
              let selectedSet = new Set(currEq)

              return (
                <Loading style={{ height: 'calc(100% - 43px)' }} isLoading={isFetching}>
                  <FixWidthHelper className={classNames({ 'shadowb-eee mg1b': !isSearching })} toFix='last' toFixWidth='70px' style={{ lineHeight: '30px', padding: '5px 10px' }}>
                    <div>{(dbDim && dbDim.title) || dingingDbDimensionName}</div>
                    <div className='alignright'>
                      <SearchOutlined
                        className={classNames('grey-at-first pointer mg1r', { disabled: !isStringDim })}
                        onClick={isStringDim ? () => this.setState({ isSearching: !isSearching }) : undefined}
                      />
                      <SortButton
                        title={`切换到总记录数${rowCountSortDirect === 'asc' ? '降序' : '升序'}`}
                        type='icon'
                        className={classNames('mg1r grey-at-first', { hide: !dingingDbDimensionName })}
                        value={rowCountSortDirect}
                        onChange={nextSortDirect => this.setState({ rowCountSortDirect: nextSortDirect })}
                        placement='topRight'
                      />
                      <CloseOutlined
                        className='grey-at-first pointer'
                        onClick={() => {
                          let { updateHashStateByPath } = this.props
                          updateHashStateByPath('pinningDims', pinningDims => pinningDims.filter(dim => dim !== dingingDbDimensionName))
                          this.setState({
                            searchingText: ''
                          })
                        }}
                      />
                    </div>
                  </FixWidthHelper>
                  {!isSearching ? null : (
                    <div className='mg1'>
                      <InputWithAutoFocus
                        className='shadowb-eee'
                        placeholder='搜索'
                        value={searchingText}
                        onChange={val => {
                          this.setState({ searchingText: val })
                        }}
                      />
                    </div>
                  )}
                  {showCleanSelectionBtn ? (
                    <a className='pointer' onClick={this.cleanSelections} className='itblock pd1b pd2l'>
                      清除选择的内容
                    </a>
                  ) : null}
                  {isFetching || (data && data.length) ? null : (
                    <div className='relative overscroll-y' style={{ height: 'calc(100% - 40px)' }}>
                      <div className='center-of-relative'>{searchingText ? `没有以 ${_.truncate(searchingText, { length: 10 })} 开头的数据` : '查无数据'}</div>
                    </div>
                  )}
                  <Menu
                    prefixCls='ant-select-dropdown-menu'
                    style={{
                      overflow: 'auto',
                      maxHeight: 'none',
                      height: `calc(100% - 45px ${isSearching ? '- 33px' : ''} ${showCleanSelectionBtn ? '- 24px' : ''})`
                    }}
                  >
                    {(data || []).map((op, i) => {
                      if (!(dingingDbDimensionName in op)) {
                        return null
                      }
                      let groupName = op[dingingDbDimensionName] || EMPTY_VALUE_OR_NULL
                      let formattedGroupName = groupName !== EMPTY_VALUE_OR_NULL ? groupValFormatter(groupName) : EMPTY_VALUE_OR_NULL
                      return (
                        <Menu.Item key={groupName || i}>
                          <Checkbox
                            checked={selectedSet.has(groupName)}
                            className='width-100'
                            onChange={ev => {
                              let nextEq
                              if (ev.target.checked) {
                                nextEq = groupName !== EMPTY_VALUE_OR_NULL ? [...currEq, groupName] : [EMPTY_VALUE_OR_NULL, ...currEq]
                              } else {
                                nextEq = currEq.filter(val => val !== groupName)
                              }
                              this.setGroups(nextEq)
                            }}
                          >
                            <Tooltip title={formattedGroupName}>
                              <HighLightString className='itblock elli' text={formattedGroupName} highlight={isSearching ? searchingText : null} />
                            </Tooltip>
                          </Checkbox>
                        </Menu.Item>
                      )
                    })}
                  </Menu>
                </Loading>
              )
            }}
          </DruidDataFetcher>
        </div>
      </div>
    )
  }
}
