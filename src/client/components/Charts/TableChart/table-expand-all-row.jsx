import _ from 'lodash'
import React, { Component } from 'react'
import {Table, message} from 'antd'
import {isEqualWithReactObj} from '../../../../common/sugo-utils'
import {RowKeyName} from '../../../../common/constants'
import { GetCellCount } from '../CustomHeaderTable/custom-header-modal'
import {compressUrlQuery} from '../../../../common/sugo-utils'
import {browserHistory} from 'react-router'
import Fetch from '../../../common/fetch-final'
import {DruidColumnTypeInverted} from '../../../../common/druid-column-type'
import moment from 'moment'

const GranularityEnum = {
  PT1M: 'minute',
  PT1H: 'hour',
  P1D: 'day',
  P1W: 'week',
  P1M: 'month',
  P1Y: 'year'
}

export default class TableExpandAllRows extends Component {
  static defaultProps = {rowKey: RowKeyName}

  constructor(props) {
    super(props)
    this.state = {
      expandedRowKeys: this.recurGetExpandableRowUid(props.dataSource)
    }
  }

  componentWillReceiveProps(nextProps) {
    let toPick = ['columns', 'dataSource']
    if (!isEqualWithReactObj(_.pick(this.props, toPick), _.pick(nextProps, toPick))) {
      this.setState({
        expandedRowKeys: this.recurGetExpandableRowUid(nextProps.dataSource)
      })
    }
  }

  recurGetExpandableRowUid(data) {
    let {rowKey} = this.props

    if (!data.length) {
      return data
    }
    let hasChild = data.filter(d => _.isObject(d) && 'children' in d)
    return hasChild.map(d => d[rowKey]).concat(this.recurGetExpandableRowUid(_.flatMap(hasChild, hc => hc.children)))
  }

  jumpConfigurationFn = async(params, myChart)=> {
    let {changeDashBoardState, dashBoardSlicesSettings={}, jumpConfiguration = {}, 
      dashboards, sliceId, dataSourceDimensions, slice, dimensions} = this.props
    let currentSettings = _.get(dashBoardSlicesSettings, `${sliceId}` || {})
    let newjumpConfiguration = dashBoardSlicesSettings &&  _.includes(Object.keys(dashBoardSlicesSettings), `${sliceId}`)
      ? currentSettings 
      : _.get(jumpConfiguration, `${sliceId}`) || []
    if (!_.isEmpty(newjumpConfiguration)) {
      let dashboardId = _.get(newjumpConfiguration[0], 'id', '')
      if ( dashboardId ) {
        if (!_.find(dashboards, {id: dashboardId})) return message.warning('跳转看板被删除')
        let sliceGranularity = {}
        changeDashBoardState({selectDashboard: dashboardId})
        dimensions.map(item => {
          sliceGranularity[item] = _.get(slice, `params.dimensionExtraSettingDict.${item}.granularity`, 'P1D')
          return item
        })
        let data = compressUrlQuery(JSON.stringify({jumpConfiguration: newjumpConfiguration,
          projectId: _.get(dataSourceDimensions, '[0].parentId', ''), params: params, sliceGranularity}))

        let pathName = window.parent.location.pathname.match(/^\/share/)
        if (!_.isEmpty(pathName)) {
          //分享看板跳转
          let {result} = await Fetch.get('/app/sharing')
          let shareId = _.find(result, {content_id: dashboardId})  
          if (!shareId) return message.warning('无法跳转到没有发布的看板') 
          let eq = []
          let nextFilters = []
          newjumpConfiguration[0].carryParams.map((name, idx) => {
            let dbDim = _.find(dataSourceDimensions, {name})
            eq = _.get(params, `${dbDim.name}`) 
            if (_.isEmpty(eq) || _.get(params, 'isTotalRow')) return
            if (DruidColumnTypeInverted[dbDim.type] === 'date') {
              let date = GranularityEnum[sliceGranularity[dbDim.name]]
              eq = [moment(eq).startOf(date).format('YYYY-MM-DD HH:mm:ss'), 
                moment(eq).endOf(date).format('YYYY-MM-DD HH:mm:ss')]
            }
            if (DruidColumnTypeInverted[dbDim.type] === 'number') {
              eq = JSON.parse(eq.replace(/[)]/g, ']'))
            }
            nextFilters.push({
              col: dbDim.name,
              op: 'in',
              eq,
              type: DruidColumnTypeInverted[dbDim.type]
            })
          })  
          let filter = encodeURIComponent(JSON.stringify(nextFilters))
          window.parent.location.href = window.parent.location.origin + `/share/${shareId.id}?rawFilters=${filter}`
        } else {
          //看板跳转
          browserHistory.push(
            `/console/dashboards/${dashboardId}?value=${data}`
          )
        }
        // browserHistory.push(
        //   `/console/dashboards/${dashboardId}?value=${data}`
        // )
      }else{
        message.warning('没有选择看板')
      }
    }
  }

  render() {
    let { expandedRowKeys } = this.state
    const { columns, settings, ...rest } = this.props
    const { customColumns } = settings || {}
    let scroll = rest.scroll
    // 自定义表头重新计算显示内容高度
    const { rowCount } = GetCellCount(customColumns || columns)
    if (rowCount > 1) {
      scroll = { x: scroll.x, y: scroll.y - (rowCount - 1) * 36 }
    }
    return (
      <Table
        {...rest}
        scroll={scroll}
        columns={customColumns || columns}
        onExpandedRowsChange={expandedRows => {
          this.setState({ expandedRowKeys: expandedRows })
        }}
        onRow={record => {
          return {
            onClick: event => {this.jumpConfigurationFn(record)}
          }
        }}
        expandedRowKeys={expandedRowKeys}
      />
    )
  }
}
