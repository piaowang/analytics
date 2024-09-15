import React from 'react'
import _ from 'lodash'
import Alert, { getFormatterByDbDim } from '../../Analytic/inspect-source-data'
import { Select, Table, Tooltip } from 'antd'
import SizeProvider from '../../Common/size-provider'
import { isTextDimension } from '../../../../common/druid-column-type'
import DruidDataFetcher from '../../Fetcher/druid-data-fetcher'
import { URL_REGEX } from '../../../constants/string-constant'
import { ContextNameEnum, withContextConsumer } from '../../../common/context-helper'
import { AccessDataType } from '../../../../common/constants'
import DataSourceDimensionsFetcher from '../../Fetcher/data-source-dimensions-fetcher'
import { immutateUpdate, isDiffByPath } from '../../../../common/sugo-utils'
import { convertDateType, isRelative } from '../../../../common/param-transform'
import moment from 'moment'
import BoundaryTimeFetcher from '../../Fetcher/boundary-time-fetcher'
import { Anchor } from '../../Common/anchor-custom'

const COLUMN_WIDTH = 180

const { analyticDefaultTime = '-1 day' } = window.sugo

@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class UserModelData extends React.Component {
  state = {
    orderByTimeColumnDesc: true,
    downloadLimit: 100,
    current: 1,
    selectDatasourceId: null,
    dataSourceDimensions: [],
    actionsFilters: [{ col: '__time', op: 'in', eq: '-30 days', _willChange: true }]
  }

  componentDidMount() {
    this.initBindingUserBehaviorProject()
  }

  initBindingUserBehaviorProject() {
    let { datasourceList, projectCurrent, projectList } = this.props
    if (!_.isEmpty(datasourceList) && !this.state.selectDatasourceId) {
      let firstBindingProj = _.find(projectList, p => {
        return p.tag_datasource_name === projectCurrent.tag_datasource_name && p.access_type !== AccessDataType.Tag
      })
      if (!firstBindingProj) {
        return
      }
      this.setState({
        selectDatasourceId: firstBindingProj.datasource_id
      })
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'projectList')) {
      this.initBindingUserBehaviorProject()
    }
  }

  renderTimeRangeInitializer(dataSourceId) {
    const timeDimName = '__time'
    let { actionsFilters } = this.state

    return (
      <BoundaryTimeFetcher
        dataSourceId={dataSourceId}
        doFetch={!!(dataSourceId && timeDimName && _.some(actionsFilters, flt => flt.col === timeDimName && flt._willChange))}
        filters={actionsFilters.filter(flt => flt.col !== timeDimName)}
        timeDimName={timeDimName}
        doQueryMinTime={false}
        onTimeLoaded={info => {
          let { maxTime } = info || {}
          if (!maxTime) {
            let timeFltIdx = _.findIndex(actionsFilters, flt => flt.col === timeDimName)
            this.setState({
              actionsFilters: immutateUpdate(actionsFilters, [timeFltIdx], flt => _.omit(flt, '_willChange'))
            })
            return
          }
          let timeFltIdx = _.findIndex(actionsFilters, flt => flt.col === timeDimName && flt.op === 'in')

          // 如果 maxTime 在 analyticDefaultTime 时间范围内，则无须偏移
          let timeFlt = actionsFilters[timeFltIdx]
          let relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
          let [since, until] = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)
          if (moment(maxTime).isAfter(since) && moment(maxTime).isBefore(until)) {
            this.setState({
              actionsFilters: immutateUpdate(actionsFilters, [timeFltIdx], flt => _.omit(flt, '_willChange'))
            })
            return
          }

          let newTimeFilter = {
            col: timeDimName,
            op: 'in',
            eq: [
              moment(maxTime)
                .add(..._.trim(analyticDefaultTime).split(/\s+/))
                .startOf('second')
                .toISOString(),
              moment(maxTime).add(1, 's').startOf('second').toISOString() // 上边界为开区间，需要加 1 s
            ]
          }

          this.setState({
            actionsFilters: immutateUpdate(actionsFilters, [timeFltIdx], () => newTimeFilter)
          })
        }}
      />
    )
  }

  render() {
    let { datasourceList, projectCurrent, mainTimeDimName, userId, projectList, selectDatasourceId } = this.props
    let { orderByTimeColumnDesc, downloadLimit, current, dataSourceDimensions, actionsFilters } = this.state

    let datasourceCurrent = selectDatasourceId && _.find(datasourceList, { id: selectDatasourceId })

    let uidDimName = _(datasourceList).chain().find({ id: selectDatasourceId }).get('params.commonMetric[0]', 'distinct_id').value()

    let finalFilters = [...actionsFilters, { col: uidDimName, op: 'equal', eq: [userId] }]

    // 直接传 select * 会导致 substr 失效
    let select = _(dataSourceDimensions)
      // .filter(dbDim => dbDim.is_druid_dimension)
      .map(dbDim => dbDim.name)
      .thru(druidDimNames => (_.isEmpty(druidDimNames) ? ['*'] : druidDimNames))
      .value()
    let dataSourceId = datasourceCurrent && datasourceCurrent.id
    return (
      <div>
        <DataSourceDimensionsFetcher
          dataSourceId={selectDatasourceId || ''}
          doFetch={!!selectDatasourceId}
          resultFilter={dim => dim.parentId === selectDatasourceId}
          onLoaded={dbDims => {
            this.setState({
              dataSourceDimensions: dbDims
            })
          }}
        />
        {selectDatasourceId && this.renderTimeRangeInitializer(selectDatasourceId)}
        <DruidDataFetcher
          dbDimensions={dataSourceDimensions}
          dataSourceId={dataSourceId || ''}
          doFetch={!!dataSourceId && !_.isEmpty(dataSourceDimensions)}
          forceUpdate
          filters={finalFilters}
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
              : dimsTimeColAtFirst
                  .map(dbDim => {
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
                      // sortOrder: sortSetting && sortSetting.columnKey === dbDim.name && sortSetting.order,
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
                  .filter(c => c.key !== '__time')
            let filteredData = noData ? [] : data

            const pagination = {
              pageSizeOptions: ['10', '20', '50', '100'],
              total: filteredData.length,
              showQuickJumper: true,
              showSizeChanger: true,
              defaultPageSize: 50,
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
                      className='always-display-scrollbar-horizontal-all wider-bar fix-table-head-issue'
                      dataSource={filteredData}
                      size='small'
                      bordered
                      rowKey={(r, i) => i}
                      pagination={pagination}
                      loading={isFetching}
                      columns={tableColumns}
                      childrenColumnName={_.some(tableColumns, { dataIndex: 'children' }) ? '__children' : 'children'}
                      scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth, y: 480 - 81 }}
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
            )
          }}
        </DruidDataFetcher>
      </div>
    )
  }
}
