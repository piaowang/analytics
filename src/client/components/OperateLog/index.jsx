import React, { Component } from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Table, message, Card, Tooltip, Button } from 'antd'
import Icon from '../Common/sugo-icon'
import Bread from '../Common/bread'
import TimePicker from '../Common/time-picker'
import Fetch from '../../common/fetch-final'
import { convertDateType, isRelative } from '../../../common/param-transform'
import { exportFile } from '../../../common/sugo-utils'
import HistoryFilter from './operalog-filter'
import setStatePromise from '../../common/set-state-promise'
import moment from 'moment'
import * as d3 from 'd3'
import _ from 'lodash'

@setStatePromise
class index extends Component {

  state = {
    loading: false,
    pageSize: 10,
    page: 1,
    count: 0,
    data: [],
    expand: [],
    detailContent: [],
    search: {}
  }

  componentWillMount() {
    this.getData()
  }

  getData = async () => {
    const { page, pageSize, search } = this.state
    const timeRange = _.isEmpty(search) ? '-7 day' : search.timeRange
    this.setState({
      loading: true
    })
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    let res = await Fetch.get('/app/logs', {
      pageIndex: page - 1,
      pageSize,
      since,
      until,
      ...search
    })
    
    let data
    if (res.result) {
      data = _.get(res,'result.data',[])
      data.forEach((i, idx) => {
        i.no = idx + 1
        let reg = /(^[2])|(^[3])/
        i.status = reg.test(i.status) ? '操作成功' : '操作失败'
        i.keyword = i.keyword ? i.keyword : '无' 
        return i
      })
    }
    this.setState({
      data,
      count: _.get(res,'result.total'),
      loading: false,
      since,
      until
    })
  }

  onPagination = async (page,pageSize) => {
    await this.setStatePromise({
      page,
      pageSize,
      expand: []
    })
    await this.getData()
  }

  onShowSizeChange = async (page, pageSize) => {
    await this.setStatePromise({
      page: 1,
      pageSize,
      expand: []
    })
    this.getData()
  }

  handleDownLoad = async (type) => {
    let {count, since, until, search} = this.state
    let dataAll = []
    if (type === 'all') {
      let res = await Fetch.get('/app/logs', {
        pageIndex: 0,
        pageSize: count,
        since,
        until,
        ...search
      })
      dataAll = _.get(res,'result.data',[]).map((i, idx) => {
        i.no = idx + 1
        let reg = /(^[2])|(^[3])/
        i.status = reg.test(i.status) ? '操作成功' : '操作失败'
        i.keyword = i.keyword ? i.keyword : '无' 
        return i
      })
    }

    const data = type === 'all' ? dataAll : this.state.data
    // let csvKeys = [
    //   '序号', '操作时间', '账号', 'IP', '操作类型', '操作结果', '详细情况'
    // ]
    let csvKeys = [
      '序号', '操作时间', '账号', 'IP', '操作类型', '操作对象', '操作结果'
    ]
    // let detail = {}
    // for (let i = data.length - 1; i >= 0; i--) {
    //   let res = await Fetch.get(`/app/logs/${data[i].id}/explain`)
    //   if (res) {
    //     detail[data[i].id] = res.result.explain
    //   } else {
    //     return message.error('下载出错')
    //   }
    // }

    let csvRows = this.createCsvRows(data)

    let content = d3.csvFormatRows([csvKeys, ...csvRows])

    exportFile(`操作日志_时间${moment().format('YYYYMMDDHHmmss')}.csv`, content)
  }

  createCsvRows = (data) => {
    let rows = data
    rows = rows.map(i => {
      return [
        i.no,
        moment(i.created_at).format('YYYY年MM月DD日HH:mm:ss'),
        i.username,
        i.ip,
        i.apiTitle,
        i.keyword,
        i.status
      ]
    })
    return rows
  }

  handleExpand = async (record) => {
    const { expand: oldExpand, detailContent: oldDetailContent  } = this.state
    let detailContent = _.clone(oldDetailContent)
    let expand = _.clone(oldExpand)
    if (expand.includes(record.no)) {
      expand = expand.filter(i => i !== record.no)
    } else {
      let res = await Fetch.get(`/app/logs/${record.id}/explain`)
      if (res) {
        let result = _.get(res, 'result')
        detailContent.push({
          id: record.id,
          ...result
        })
      } else {
        detailContent = []
      }
      expand.push(record.no)
    }
    this.setState({
      expand,
      detailContent
    })
  }

  handleSearch = async (f) => {
    let search = _.pick(f, ['username', 'ip', 'operaResult', 'operaType', 'keyword', 'timeRange'])
    await this.setStatePromise({
      page:1,
      search,
      expand: []
    })
    this.getData()
  }

  expandedRowRender = (record) => {
    let { detailContent } = this.state
    detailContent = detailContent.filter(i => i.id === record.id)
    let explainArr = (_.get(detailContent,'[0].explain') || '无内容 ').split(/\n/)
    let title = explainArr.shift()
    // width:`${220*explainArrChunk.length}px`
    return (
      <div>
        <b style={{lineHeight:'40px'}} className="mg2l font14">{title}</b>
        {explainArr.length ? explainArr.map( (i,idx) => (
          <div 
            className="font12 mg2l pd1y"
            key={idx}
          >{
              i.split(new RegExp(/：/)).map( (j,jdx) => (

                <span
                  key={`${idx}-${jdx}`}
                  className=""
                  style={jdx === 0 ? { fontWeight: 'bold'} : null}
                >{jdx === 0 ? j + '：' : j}</span>
              ))
            }</div>
        )) : 
          <div className="font12 mg2l pd1y">
          无内容
          </div>}
      </div>
    )
  }

  renderBread = () => {
    return (
      <div className="borderb">
        <Bread path={[{name: '操作日志管理'}]} />
      </div>
    )
  }

  renderHeader = () => {
    return (
      <div className="width-100 height80" style={{overflow:'hidden'}}>
        <div className="fleft mg2y">
          {this.renderSearchBar()}
        </div>
        <div className="fright mg2y">
          <Button
            className="mg2l"
            onClick={this.handleDownLoad}
          >
            <Icon
              className="color-grey iblock hover-color-main font16"
              type="sugo-download"
            />
            导出当前页</Button>
        </div>
        <div className="fright mg2y">
          <Button
            className="mg2l"
            onClick={()=>{
              this.handleDownLoad('all')
            }}
          >
            <Icon
              className="color-grey iblock hover-color-main font16"
              type="sugo-download"
            />
            导出全部</Button>
        </div>
      </div>
    )
  }

  renderSearchBar = () => {
    return <HistoryFilter doFetchList={this.handleSearch} />
  }

  renderTable = () => {
    const { loading, pageSize, page, data, expand, count } = this.state

    const columns = [{
      title: '序号',
      dataIndex: 'no'
    }, {
      title: '操作时间',
      dataIndex: 'created_at',
      render: text => (
        <div>{text ? moment(text).format('YYYY-MM-DD HH:mm:ss') : null}</div>
      )
    }, {
      title: '账号',
      dataIndex: 'username'
    }, {
      title: 'IP',
      dataIndex: 'ip'
    }, {
      title: '操作类型',
      dataIndex: 'apiTitle'
    }, {
      title: '操作对象',
      dataIndex: 'keyword'
    }, {
      title: '操作结果',
      dataIndex: 'status'
    }, {
      title: '详细情况',
      dataIndex: 'detail',
      render: (text, record) => (
        <span>
          <a
            className="pointer"
            style={{ color: 'blue' }}
            onClick={() => this.handleExpand(record)}
          >
            查看</a>
        </span>
      )
    }]

    return (
      <div className="pd3b" style={{height:'80vh'}}>
        <Table
          columns={columns}
          rowKey="no"
          dataSource={data}
          expandedRowRender={(record) => this.expandedRowRender(record)}
          expandedRowKeys={expand}
          expandIconColumnIndex={-1}
          expandable={{
            expandIcon: () => null
          }}
          pagination={{
            showTotal: total => `共 ${total} 条`,
            current: page,
            total: count,
            defaultPageSize: pageSize,
            onChange: this.onPagination,
            showSizeChanger: true,
            onShowSizeChange: this.onShowSizeChange,
            showQuickJumper: true
          }}
          loading={loading}
        />
      </div>
    )
  }

  render() {
    return (
      <div className="height-100">
        {this.renderBread()}
        <div className="pd3x scroll-content always-display-scrollbar">
          {this.renderHeader()}
          {this.renderTable()}
        </div>
      </div>
    )
  }
}

export default index
