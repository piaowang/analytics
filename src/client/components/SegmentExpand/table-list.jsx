import React from 'react'
import {Link} from 'react-router'
import {
  CloseCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Tooltip, Table, Button, Popconfirm, message } from 'antd';
import moment from 'moment'
import _ from 'lodash'
import {Auth} from '../../common/permission-control'
import {withCommonFilter} from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import statusMap, {statusConstant} from '../../../common/segment-status-map'
import {canVisitUsergroup, alertSaveAsSuccess, canEdit} from './constants'
import {exportFile} from '../../../common/sugo-utils'
import {getInsightUrlByUserGroup} from '../../common/usergroup-helper'

@alertSaveAsSuccess
class SegmentExpandList extends React.Component {

  state = {
    loadingStatus: {},
    downloading: {},
    refreshing: {},
    savingAs: {}
  }

  getUsergroupText = id => {
    let {usergroups} = this.props
    let usergroup = _.find(usergroups, {id}) || { title: '-'}
    return canVisitUsergroup && usergroup.id
      ? <Link to={getInsightUrlByUserGroup(usergroup)}>{usergroup.title}</Link>
      : usergroup.title
  }

  del = se => {
    return async () => {
      let res = await this.props.delSegmentExpand(se)
      if (res) message.success('删除成功')
    }
  }

  renderNoContent = () => {
    return (
      <div className="ug-empty pd2 aligncenter">
        <p className="mg2b">当前项目下暂无用户扩群, 请新建用户扩群。</p>
        <Auth auth="/console/segment-expand/new">
          <Link to="/console/segment-expand/new">
            <Button type="primary">
              <PlusCircleOutlined className="mg1r" />
              新建用户扩群
            </Button>
          </Link>
        </Auth>
      </div>
    );
  }

  renderFilters = (KeywordInput) => {
    return (
      <div className="pd2b line-height26">
        <KeywordInput
          placeholder="搜索扩群名称"
          className="itblock width200"
        />
      </div>
    )
  }

  loading = (prop, id, status) => {
    let obj = _.cloneDeep(this.state[prop])
    obj[id] = status
    this.setState({
      [prop]: obj
    })
  }

  downloadIds = segmentExpand => {
    return async () => {
      let {id, title} = segmentExpand
      this.loading('downloading', id, true)
      let res = await this.props.getSegmentExpandIds({id})
      this.loading('downloading', id, false)
      if (!res) return
      let content = res.result.ids.join('\n')
      exportFile(`扩群_${title}_id_${moment().format('YYYY-MM-DD')}.txt`, content)
    }
  }

  saveAsUsergroup = segmentExpand => {
    return async () => {
      let {id} = segmentExpand
      this.loading('savingAs', id, true)
      let res = await this.props.saveAsUsergroup({id})
      this.loading('savingAs', id, false)
      if (!res) return
      this.alertSaveAsSuccess(res.result)
    }
  }

  renderDownloadBtn = segmentExpand => {
    let {id, status} = segmentExpand
    let isLoadingStatus = this.state.loadingStatus[id]
    let isDownloading = this.state.downloading[id]
    let isLoading = isLoadingStatus || isDownloading
    if (status !== statusConstant.done || !canEdit) return null
    return (
      <Tooltip title="下载id列表">
        <Button
          onClick={this.downloadIds(segmentExpand)}
          disabled={isLoading}
          icon={<DownloadOutlined />}
          size="small"
          className="mg1r"
          loading={isDownloading}
        >
          下载id列表
        </Button>
      </Tooltip>
    );
  }

  onRefresh = segmentExpand => {
    return async () => {
      let {id, status: oldStatus, title, params} = segmentExpand
      let {checkSegmentExpandStatus, updateSegmentExpand} = this.props
      let func = oldStatus === statusConstant.computing
        ? checkSegmentExpandStatus
        : updateSegmentExpand
      let args = [{id}]
      if (oldStatus > statusConstant.computing) {
        let update = {
          params: {
            ...params,
            reCompute: Date.now()
          }
        }
        args = [id, update]
      }
      this.loading('refreshing', id, true)
      let res = await func(...args)
      this.loading('refreshing', id, false)
      if (!res) return
      let {message: str, status} = res.result
      let statusMsg = statusMap[status] || '完毕'
      let err = str ? `, ${str}` : ''
      message.success(`${title} 状态更新:${statusMsg}${err}`, 10)
    }
  }

  renderRefreshBtn = (status, record) => {
    if (
      !canEdit ||
      status < statusConstant.computing ||
      status === statusConstant.done 
    ) return null
    let {refreshing} = this.state
    let {id, message: msg} = record
    let isRefreshing = !!refreshing[id]
    let onClick = isRefreshing
      ? _.noop
      : this.onRefresh(record)
    let text = status === statusConstant.computing
      ? '点击查询计算状态，确认是否计算完成'
      : '点击开始重新计算'
    let err = msg ? `${msg}:` : ''
    let title = `${err}${text}`
    return (
      <Tooltip
        title={title}
      >
        <ReloadOutlined onClick={onClick} spin={isRefreshing} className="mg1l pointer" />
      </Tooltip>
    );
  }

  renderStatus = (status, record) => {
    return (
      <div>
        {statusMap[status] || '-'}
        {this.renderRefreshBtn(status, record)}
      </div>
    )
  }

  renderEditBtn = ug => {
    if (!canEdit) return null
    let {title, id} = ug
    return (
      <Tooltip placement="topLeft" title={`编辑 ${title} `}>
        <Link className="pointer" to={`/console/segment-expand/${id}`} >
          <EditOutlined className="mg1r font14 pointer" />
        </Link>
      </Tooltip>
    );
  }

  renderTitle = (title, ug) => {
    if (!canEdit) return (
      <div className="mw400 elli">{title}</div>
    )
    return (
      <Tooltip placement="topLeft" title={`编辑 ${title}`}>
        <div className="mw400 elli">
          <Link className="pointer" to={`/console/segment-expand/${ug.id}`} >
            {title}
          </Link>
        </div>
      </Tooltip>
    )
  }

  renderContent = (
    segmentExpands0,
    KeywordInput,
    datasourceCurrent
  ) => {

    const pagination = {
      total: segmentExpands0.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    let columns = [{
      title: '扩群名称',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => a.title > b.title ? 1 : -1,
      render: this.renderTitle
    }, {
      title: '所属项目',
      dataIndex: 'datasource_id',
      sorter: (a, b) => a.datasource_id > b.datasource_id ? 1 : -1,
      key: 'datasource_id',
      render() {
        return datasourceCurrent.title || datasourceCurrent.name
      }
    }, {
      title: '参照目标群',
      key: 'usergroup_id',
      dataIndex: 'usergroup_id',
      sorter: (a, b) => a.usergroup_id - b.usergroup_id ? 1 : -1,
      render: (uid) => {
        return this.getUsergroupText(uid)
      }
    }, {
      title: '扩群用户数',
      key: 'count',
      dataIndex: 'count',
      sorter: (a, b) => a.count - b.count,
      render (text) {
        return text
      }
    }, {
      title: '上一次计算时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      sorter: (a, b) => a.updated_at > b.updated_at ? 1 : -1,
      render (text) {
        return moment(text).format('YYYY-MM-DD HH:mm:ss')
      }
    }, {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status > b.status ? 1 : -1,
      render: this.renderStatus
    }, {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      render: (text) => {
        return text
          ? <Tooltip placement="topLeft" title={text}>
            <div className="mw300 elli">{text}</div>
          </Tooltip>
          : null
      }
    }, {
      title: <div className="aligncenter">操作</div>,
      key: 'op',
      dataIndex: 'id',
      render: (text, ug) => {
        return (
          <div className="aligncenter">
            {this.renderDownloadBtn(ug)}
            {this.renderEditBtn(ug)}
            <Auth auth="app/segment-expand/delete">
              <Popconfirm
                title={`确定删除用户扩群 "${ug.title}" 么？`}
                placement="topLeft"
                onConfirm={this.del(ug)}
              >
                <Tooltip title="删除">
                  <CloseCircleOutlined className="font14 mg1l color-grey pointer" />
                </Tooltip>
              </Popconfirm>
            </Auth>
          </div>
        );
      }
    }]
    return (
      <div>
        {this.renderFilters(KeywordInput)}
        <Table
          columns={columns}
          pagination={pagination}
          dataSource={segmentExpands0}
          bordered
          rowKey={record => record.id}
          size="small"
        />
      </div>
    )

  }

  render () {
    let {
      segmentExpands,
      keywordInput: KeywordInput,
      datasourceCurrent,
      keyword,
      mergedFilterCreator
    } = this.props

    let mergedFilter = mergedFilterCreator(
      searching => ug => smartSearch(searching, ug.title),
      dsId => ug => ug.datasource_id === dsId,
      datasourceCurrent.id
    )

    let segmentExpands0 = segmentExpands.filter(mergedFilter)

    return segmentExpands0.length || keyword
      ? this.renderContent(
        segmentExpands0,
        KeywordInput,
        datasourceCurrent
      )
      : this.renderNoContent()
  }
}


export default withCommonFilter(SegmentExpandList)
