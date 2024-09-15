import React from 'react'
import { CloseCircleOutlined, EditOutlined } from '@ant-design/icons';
import { Tooltip, Table, Spin, message, Popconfirm } from 'antd';
import { Link } from 'react-router'
import {Auth} from '../../common/permission-control'
import Search from '../Common/search'

export default class PathAnalysislist extends React.Component {

  state = {
    search: ''
  }

  onChange = e => {
    this.setState({
      search: e.target.value
    })
  }

  delPathAnalysis = inst => {
    return async () => {
      let res = await this.props.delPathAnalysis(inst)
      if (!res) return
      message.success('删除成功')
    }
  }

  render () {
    let {pathAnalysis, loading} = this.props
    let { search } = this.state
    let pathAnalysis0 = search
      ? pathAnalysis.filter(ug => ug.title.toLowerCase().indexOf(search.trim().toLowerCase()) > -1)
      : pathAnalysis

    const pagination = {
      total: pathAnalysis0.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    let columns = [{
      title: '路径分析',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => a.title > b.title ? 1 : -1,
      render(text, ug) {
        return (
          <Tooltip placement="topLeft" title={`点击查看 "${text}"`}>
            <div className="mw200 elli">
              <Auth auth="/console/path-analysis/:pathAnalysisId" alt={text}>
                <Link to={`/console/path-analysis/${ug.id}`}>
                  {text}
                </Link>
              </Auth>
            </div>
          </Tooltip>
        )
      }
    }, {
      title: <div className="aligncenter">操作</div>,
      key: 'op',
      render: (text, ug) => {
        return (
          <div className="aligncenter">
            <Auth auth="/console/path-analysis/:pathAnalysisId">
              <Tooltip title="编辑">
                <Link to={`/console/path-analysis/${ug.id}`}>
                  <EditOutlined className="color-grey font16 pointer" />
                </Link>
              </Tooltip>
            </Auth>
            <Auth auth="app/path-analysis/delete">
              <Popconfirm
                title={`确定删除路径分析 "${ug.title}" 么？`}
                placement="topLeft"
                onConfirm={this.delPathAnalysis(ug)}
              >
                <Tooltip title="删除">
                  <CloseCircleOutlined className="mg2l font16 color-grey pointer" />
                </Tooltip>
              </Popconfirm>
            </Auth>    
          </div>
        );
      }
    }]

    return (
      <Spin spinning={loading}>
        <div className="pathAnalysis-lists pd2y pd3x">
          <div className="pd2b">
            <div className="fix">
              <div className="fright">
                <Search
                  onChange={this.onChange}
                  value={search}
                  placeholder="搜索"
                  className="iblock width260"
                />
              </div>
            </div>
          </div>
          <Table
            columns={columns}
            pagination={pagination}
            dataSource={pathAnalysis0}
            rowKey="id"
            bordered
            size="small"
          />
        </div>
      </Spin>
    )
  }
}
