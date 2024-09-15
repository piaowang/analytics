import React from 'react'
import { Table, Checkbox, Radio } from 'antd'
import Fetch from '../../../common/fetch-final'

export default class ReportAuth extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      list: []
    }
  }
  componentDidMount() {
    this.getData()
  }
  getData() {
    Fetch.post('/app/mannings/list', { page: -1 }).then((res) => {
      if (res.result?.length) {
        this.setState({
          list: res.result
        })
      }
    })
  }
  renderProjectCheck = (id) => {
    return (
      <div>
        <Checkbox
          onChange={() => this.onToggleProj(id)}
          checked={this.checkProjValue(id)}
        />
      </div>
    )
  };
  columns = [
    {
      title: '视图',
      dataIndex: 'id',
      key: 'id',
      width: 50,
      render: this.renderProjectCheck
    },
    {
      title: '视图标题',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: '视图路径',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: '默认显示',
      key: 'default',
      width: 50,
      render: (val) => {
        return (
          <Radio
            checked={val.id === this.props.defaultReportId ? true : false}
            onClick={() => {
              this.props.setPstate({ defaultReportId: val.id })
            }}
          />
        )
      }
    }
  ];
  //选择状态
  onToggleProj = (id) => {
    const k = this.props.checkList.findIndex((v) => v === id)
    if (k === -1) {
      this.props.checkList.push(id)
      this.props.setPstate({ checkList: [...this.props.checkList] })
    } else {
      this.props.checkList.splice(k, 1)
      this.props.setPstate({ checkList: [...this.props.checkList] })
    }
  };
  checkProjValue = (val) => {
    return this.props.checkList.indexOf(val) >= 0
  };
  render() {
    return (
      <div>
        <Table
          columns={this.columns}
          pagination={false}
          dataSource={this.state.list}
          rowKey={(r, idx) => idx}
          bordered
          size="small"
        />
      </div>
    )
  }
}
