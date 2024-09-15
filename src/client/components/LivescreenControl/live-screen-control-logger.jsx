import React from 'react'
import { Card, Switch, Menu, Dropdown, Radio, Table, Button } from 'antd'
import { namespace } from './store/model'
import { connect } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

@connect(state => ({ ...state[namespace], ...state['sagaCommon'] }))
export default class LiveScreenControlLogger extends React.Component {
  constructor() {
    super()
    this.state = {
      page: 1,
      pageSize: 10
    }
  }

  componentDidMount() {
    this.getLogger()
  }

  getLogger(current) {
    const { page, pageSize } = this.state
    this.props.dispatch({
      type: 'LiveScreenControlStore/asyncFetchLogger',
      payload: {
        page: current || page,
        pageSize
      }
    })
    if (current) this.setState({page: current})
  }

  render() {
    const { page, pageSize } = this.state
    let { logger, loggerCount, loading } = this.props
    const columns = [{
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss')
    },{
      title: '操作设置',
      dataIndex: 'operate',
      key: 'operate'
    },{
      title: '操作内容',
      dataIndex: 'content',
      key: 'content'
    },{
      title: '操作人',
      dataIndex: 'operaUser',
      key: 'operaUser'
    }]
    if (loading) return <div />
    return (
      <div className="mg-auto mw-80">
        <Table 
          pagination={{
            showTotal: total => `共 ${total} 条`,
            total: loggerCount,
            pageSize,
            current: page,
            onChange: (current) => {
              this.getLogger(current)
            }
          }}
          rowKey={record => record.id}
          columns={columns}
          dataSource={logger}
        />
      </div>
    )
  }

}
