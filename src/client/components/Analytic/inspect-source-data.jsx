import React from 'react'
import { QuestionCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Checkbox, message, Popover, Select, Table, Tooltip } from 'antd'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import { dateFormatterGenerator } from '../../common/date-format-util'
import { decompressUrlQuery, immutateUpdate, isDiffByPath, tryJsonParse } from '../../../common/sugo-utils'
import * as d3 from 'd3'
import _ from 'lodash'
import { isNumberDimension, isTextDimension, isTimeDimension } from '../../../common/druid-column-type'
import { includeCookie, noCache, recvJSON } from '../../common/fetch-utils'
import { getDownloadLimit } from '../../common/constans'
import { withHashStateDec } from '../Common/hash-connector'
import { withDbDims } from '../Fetcher/data-source-dimensions-fetcher'
import SizeProvider from '../Common/size-provider'
import BatchDownloadModal from './batch-download-modal'
import { CommonSearchWithDebouncedOnChange } from '../Common/search'
import Alert from '../Common/alert'
import { URL_REGEX } from '../../constants/string-constant'
import copyTextToClipboard from '../../common/copy'
import MultiSelect from '../Common/multi-select'
import * as ls from '../../common/localstorage'
import { checkPermission } from '../../common/permission-control'
import classNames from 'classnames'
import { ContextNameEnum, withContextConsumer } from '../../common/context-helper'
import { browserHistory } from 'react-router'
import { getJwtSign } from '../../common/jwt-helper'

import './inspect-source-data.styl'
import { Anchor } from '../Common/anchor-custom'

const COLUMN_WIDTH = 180

const canBatchDownload = checkPermission('/app/download/batch')

let noCacheParams = _.defaultsDeep({}, recvJSON, noCache, includeCookie)

let commaFormatter = d3.format(',')

function numberFormat(val) {
  if (!_.isNumber(val)) {
    return val
  }
  return Number.isInteger(val) ? commaFormatter(val) : val
}

const timeFormatter = dateFormatterGenerator('YYYY/MM/DD HH:mm:ss.SSS')

export function getFormatterByDbDim(dbDim) {
  return isTimeDimension(dbDim) ? timeFormatter : isNumberDimension(dbDim) ? numberFormat : _.identity
}

window.share = async () => {
  let token = await getJwtSign({
    apiScopes: ['/console/analytic/inspect-source-data'], // 查询 druid 的接口没有权限限制
    pathScopes: ['/console/analytic/inspect-source-data'], // 最好写上真实的网页地址
    expiresIn: '7d'
  })
  let { hash, origin, pathname } = window.location
  const url = `${origin}${pathname}?hash=${(hash || '').replace(/^#/, '')}&jwtSign=${token}&hideTopNavigator=1`
  console.log(url)
  return url
}

@withHashStateDec(
  state => {
    return {
      dataSourceId: state.selectedDataSourceId,
      filters: state.filters
    }
  },
  props => {
    let hash = _.get(props, 'location.query.hash')
    if (!hash) {
      return null
    }
    const nextHistory = immutateUpdate(props.location, 'query', q => _.omit(q, 'hash'))
    browserHistory.replace(nextHistory)
    const state = tryJsonParse(decompressUrlQuery(hash))
    return _.pick(state, ['selectedDataSourceId', 'filters'])
  }
)
@withDbDims(props => {
  let dsId = props.dataSourceId || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    datasourceType: 'all',
    resultFilter: dim => dim.parentId === dsId && !_.get(dim.params, 'type')
  }
}, true)
@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class InspectSourceDataModal extends React.Component {
  state = {
    isDownloading: false,
    downloadLimit: 100,
    search: '',
    current: 1,
    orderByTimeColumnDesc: true,
    extraFilters: null,
    useUserCustomOrder: false,
    showBatchDownloadModal: false,
    selectedDims: null,
    sortSetting: null
  }

  selectedDimSet = null

  componentDidMount() {
    this.initSelectedDims()
  }

  initSelectedDims(props = this.props) {
    let dsId = _.get(props, 'datasourceCurrent.id')
    if (dsId) {
      let savedSelectedDims = ls.get(`inspect-source-data-with-dims-${dsId}`)
      if (!_.isEmpty(savedSelectedDims)) {
        this.selectedDimSet = new Set(savedSelectedDims)
        this.setState({ selectedDims: savedSelectedDims })
      }
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (_.isEmpty(prevProps.datasourceCurrent)) {
      if (!_.isEmpty(this.props.datasourceCurrent)) {
        this.initSelectedDims(this.props)
      }
    } else {
      if (isDiffByPath(prevProps, this.props, 'datasourceCurrent')) {
        // 不允许切换项目
        let { changeProject, projectList } = this.props
        let targetProject = _.find(projectList, p => p.datasource_id === prevProps.dataSourceId)
        if (targetProject) {
          changeProject(targetProject.id)
        }
      }
    }

    if (isDiffByPath(prevProps, this.props, 'dataSourceDimensions')) {
      // 初始化排序为按客户端时间排序
      if (_.some(this.props.dataSourceDimensions, dbDim => dbDim.name === 'event_time')) {
        this.setState({
          sortSetting: {
            columnKey: 'event_time',
            order: prevState.orderByTimeColumnDesc ? 'descend' : 'ascend'
          }
        })
      }
    }
  }

  onChange = val => {
    this.setState({ search: val })
  }

  toggleTimeColumnOrder = () => {
    let { dataSourceDimensions } = this.props
    const nextOrderByTimeColumnDesc = !this.state.orderByTimeColumnDesc
    if (_.some(dataSourceDimensions, dbDim => dbDim.name === 'event_time')) {
      this.setState({
        orderByTimeColumnDesc: nextOrderByTimeColumnDesc,
        sortSetting: {
          columnKey: 'event_time',
          order: nextOrderByTimeColumnDesc ? 'descend' : 'ascend'
        }
      })
    } else {
      this.setState({
        orderByTimeColumnDesc: nextOrderByTimeColumnDesc
      })
    }
  }

  onTableRowClick = (rec, idx, ev) => {
    let copyMe = ev.target.getAttribute('data-copy-me')
    if (copyMe) {
      let text = ev.target.innerText
      copyTextToClipboard(
        text,
        () => message.success('复制成功'),
        () => {
          window.prompt('请按 Ctrl+C 复制:', text)
        }
      )
    }
  }

  render() {
    let {
      dataSourceId,
      dataSourceDimensions = [],
      filters,
      //onModalVisibleChange,
      timezone,
      remoteControlForDimFetcher: RemoteControlForDimFetcher,
      mainTimeDimName,
      projectCurrent
    } = this.props
    let { isDownloading, downloadLimit, search, current, orderByTimeColumnDesc, extraFilters, useUserCustomOrder, showBatchDownloadModal, selectedDims, sortSetting } = this.state

    let finalFilters = filters
    if (extraFilters) {
      let preOverwriteColSet = new Set((extraFilters && extraFilters.map(flt => flt.col)) || [])
      finalFilters = [...filters.filter(flt => !preOverwriteColSet.has(flt.col)), ...extraFilters]
    }

    // 直接传 select * 会导致 substr 失效
    let select = _(dataSourceDimensions)
      // .filter(dbDim => dbDim.is_druid_dimension)
      .map(dbDim => dbDim.name)
      .thru(druidDimNames => (_.isEmpty(druidDimNames) ? ['*'] : druidDimNames))
      .value()

    return (
      <DruidDataFetcher
        dbDimensions={dataSourceDimensions}
        dataSourceId={dataSourceId || ''}
        // 如果是子项目，则加入子项目过滤条件
        childProjectId={projectCurrent.parent_id ? projectCurrent.id : null}
        doFetch={!!dataSourceId && !_.isEmpty(dataSourceDimensions)}
        forceUpdate
        filters={finalFilters}
        timezone={timezone}
        timeout={8 * 60 * 1000}
        select={select}
        selectLimit={downloadLimit}
        selectOrderDirection={orderByTimeColumnDesc ? 'desc' : 'asc'}
        cleanDataWhenFetching
        customDimensions={dataSourceDimensions.filter(isTextDimension).map(dbDim => {
          return { name: dbDim.name, formula: `$${dbDim.name}.substr(0, 50)` }
        })}
      >
        {({ isFetching, data, fetch: reloadDruidData, cancelFetching, error }) => {
          let noData = !data || !data.length

          let _filteredDims = this.selectedDimSet ? _(dataSourceDimensions).filter(dbDim => this.selectedDimSet.has(dbDim.name)) : _(dataSourceDimensions)

          let dimsTimeColAtFirst = _filteredDims.orderBy(dbDim => (dbDim.name === mainTimeDimName ? -1 : 1)).value()

          let titleStyle = { maxWidth: `${COLUMN_WIDTH - 33}px` }
          const tableColumns = noData
            ? []
            : dimsTimeColAtFirst.map(dbDim => {
                let title = dbDim.title || dbDim.name
                let formatter = getFormatterByDbDim(dbDim)
                return {
                  title:
                    dbDim.name === mainTimeDimName ? (
                      <div className='itblock pointer' onClick={this.toggleTimeColumnOrder}>
                        {`${title}${orderByTimeColumnDesc ? '↓' : '↑'}`}
                      </div>
                    ) : (
                      <div className='iblock elli' title={title} style={titleStyle}>
                        {title}
                      </div>
                    ),
                  dataIndex: dbDim.name,
                  key: dbDim.name,
                  width: COLUMN_WIDTH,
                  sorter: (a, b) => (a[dbDim.name] > b[dbDim.name] ? 1 : -1),
                  sortOrder: sortSetting && sortSetting.columnKey === dbDim.name && sortSetting.order,
                  render: val => {
                    if (_.isArray(val)) {
                      return (
                        <Tooltip>
                          <span className='iblock elli' style={{ maxWidth: `${COLUMN_WIDTH - 17}px` }} data-copy-me={1} title={`${val}\n单击下载`}>
                            {val.map((i, idx) => `${idx > 0 ? ',' + i : i}`)}
                          </span>
                        </Tooltip>
                      )
                    }
                    let finalVal = formatter(val)
                    let sp =
                      _.startsWith(finalVal, 'http') && URL_REGEX.test(finalVal) ? (
                        <Anchor href={finalVal} target='_blank' className='iblock elli' style={{ maxWidth: `${COLUMN_WIDTH - 17}px` }}>
                          {finalVal}
                        </Anchor>
                      ) : (
                        <span className='iblock elli' style={{ maxWidth: `${COLUMN_WIDTH - 17}px` }} data-copy-me={1} title='单击复制'>
                          {finalVal}
                        </span>
                      )
                    if (finalVal && 8 <= finalVal.length) {
                      return <Tooltip overlay={<p className='wordbreak'>{49 < finalVal.length && isTextDimension(dbDim) ? `${finalVal}...` : finalVal}</p>}>{sp}</Tooltip>
                    }
                    return sp
                  }
                }
              })
          let filteredData = noData ? [] : data
          let predicate = val => (_.isString(val) ? val.indexOf(search) !== -1 : `${val}`.indexOf(search) !== -1)
          filteredData = search ? filteredData.filter(row => _.some(_.values(row), predicate)) : filteredData

          const pagination = {
            pageSizeOptions: ['10', '20', '50', '100'],
            total: filteredData.length,
            showQuickJumper: true,
            showSizeChanger: true,
            defaultPageSize: 20,
            current,
            onChange: current => {
              this.setState({
                current
              })
            },
            showTotal: total => {
              return `加载了源数据 ${total} 条`
            }
          }

          return (
            <div className='height-100'>
              <div className='nav-bar relative'>
                {`查看最近 ${downloadLimit} 条原数据`}

                {/*                <Button
                 key="downloadBtn"
                 type="primary"
                 size="large"
                 loading={isDownloading}
                 disabled={!_.isArray(filteredData) || !filteredData.length}
                 onClick={() => this.handleDownloadAction(filteredData)}
                 >导出</Button>*/}

                <Button
                  key='downloadBtn'
                  type='primary'
                  className={classNames('absolute right2 vertical-center-of-relative', { hide: !canBatchDownload })}
                  loading={isDownloading}
                  disabled={!_.isArray(filteredData) || !filteredData.length}
                  onClick={() => this.setState({ showBatchDownloadModal: true })}
                >
                  批量下载
                </Button>
              </div>

              <div className='pd2' style={{ height: 'calc(100% - 44px)' }}>
                <div className='fix pd2b'>
                  <div className='fleft'>
                    <span className='iblock'> 加载数据量:</span>
                    <Select
                      dropdownMatchSelectWidth={false}
                      key='downloadLimit'
                      value={`${downloadLimit}`}
                      className='mg1l width100 iblock'
                      onChange={val => this.setState({ downloadLimit: val * 1 })}
                    >
                      {getDownloadLimit().map(l => {
                        return (
                          <Select.Option key={l} value={`${l}`}>
                            {l}
                          </Select.Option>
                        )
                      })}
                    </Select>

                    <Button
                      size='default'
                      type='ghost'
                      icon={<ReloadOutlined />}
                      className='mg2l itblock'
                      onClick={() => {
                        reloadDruidData(undefined, noCacheParams)
                      }}
                    >
                      刷新
                    </Button>

                    <span className='iblock mg2l mg1r'>选择列:</span>
                    <MultiSelect
                      className='iblock width200'
                      onSearch={_.noop}
                      value={selectedDims || []}
                      options={dataSourceDimensions}
                      getValueFromOption={op => op.name}
                      getTitleFromOption={op => op.title || op.name}
                      showSelectAllBtn
                      onChange={vals => {
                        let nextSelectedDims = _.isEmpty(vals) ? null : vals
                        this.selectedDimSet = nextSelectedDims && new Set(nextSelectedDims)
                        this.setState({ selectedDims: nextSelectedDims })
                        ls.set(`inspect-source-data-with-dims-${dataSourceId}`, nextSelectedDims)
                      }}
                    />

                    <Checkbox key='checkBox' className='mg2l' checked={useUserCustomOrder} onChange={ev => this.setState({ useUserCustomOrder: ev.target.checked })}>
                      使用用户自定义的维度排序
                    </Checkbox>
                    <RemoteControlForDimFetcher key='remoteControl' useUserCustomOrder={useUserCustomOrder} />
                  </div>
                  <div className='fright'>
                    <Popover content='仅关键词过滤已加载的表格数据，如果没有找到，可以尝试选择更大的加载数据量' placement='leftBottom'>
                      <QuestionCircleOutlined className='font14 mg1r' />
                    </Popover>
                    <CommonSearchWithDebouncedOnChange onChange={this.onChange} value={search} placeholder='搜索' className='iblock width260' />
                  </div>
                </div>

                <div className='relative' style={{ height: 'calc(100% - 49px)' }}>
                  <SizeProvider>
                    {({ spWidth, spHeight }) => {
                      if (_.isEmpty(filteredData) && isFetching) {
                        return (
                          <div className='center-of-relative pd3 color-grey font20'>
                            加载中...
                            <a className='color-red font14 pointer' onClick={cancelFetching}>
                              停止加载
                            </a>
                          </div>
                        )
                      }
                      if (error && _.isObject(error)) {
                        let msg = error.message || error.msg || JSON.stringify(error)
                        return <Alert msg={msg} />
                      }
                      // 列宽比 100% 大的话，启用水平滚动
                      let contentWidth = tableColumns.length * COLUMN_WIDTH
                      return (
                        <Table
                          className='always-display-scrollbar-horizontal-all wider-bar fix-table-head-issue fix-table-body-margin'
                          dataSource={filteredData}
                          size='small'
                          bordered
                          pagination={pagination}
                          loading={isFetching}
                          columns={tableColumns}
                          childrenColumnName={_.some(tableColumns, { dataIndex: 'children' }) ? '__children' : 'children'}
                          scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth, y: spHeight - 81 }}
                          onRow={(...args) => {
                            return {
                              onClick: e => this.onTableRowClick(...args, e)
                            }
                          }}
                          onChange={(pagination, filters, sorter) => {
                            this.setState({ sortSetting: sorter })
                          }}
                        />
                      )
                    }}
                  </SizeProvider>
                </div>
              </div>

              <BatchDownloadModal
                dataSourceId={dataSourceId}
                filters={filters}
                modalVisible={showBatchDownloadModal}
                onModalVisibleChange={visible => {
                  this.setState({ showBatchDownloadModal: visible })
                }}
              />
            </div>
          )
        }}
      </DruidDataFetcher>
    )
  }
}
