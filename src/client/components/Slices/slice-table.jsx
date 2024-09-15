import React from 'react'
import { ShareAltOutlined,CloseCircleOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Tooltip, Table, Popconfirm, Tag } from 'antd';
import _ from 'lodash'
import {Link} from 'react-router'
import moment from 'moment'
import {vizTypeNameMap} from '../../constants/viz-component-map'
import {checkPermission} from '../../common/permission-control'
import {hasSubscribeLink, hasOverviewLink} from '../Home/menu-data'
import {getOpenSliceUrl} from '../Slice/slice-helper'
import { AUTHORIZATION_PERMISSIONS_TYPE } from '~/src/common/constants'

const canDeleteSlice = checkPermission('/app/slices/delete/slices')

export default class SliceTable extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      selectedRowKeys: props.selectedRowKeys
    }
  }

  componentWillMount() {
    this.canAddOverview = checkPermission('/app/overview/create')
    this.canDelOverview = checkPermission('/app/overview/delete')
    this.canShare = checkPermission('/app/slices/share')
  }

  shouldComponentUpdate(nextProps) {
    let arr = [
      'datasources',
      'slices',
      'selectedRowKeys',
      'tagGroup'
    ]
    return !_.isEqual(_.pick(this.props, arr), _.pick(nextProps, arr))
  }

  render() {
    const {
      slices,
      datasources,
      openShare,
      updateOverview,
      updateSliceSubscribe,
      delSlice,
      changeSelect,
      selectedRowKeys,
      tagGroup,
      onPerviewSlice
    } = this.props

    // const {, } = this.state

    const columns = [{
      title: '单图',
      dataIndex: 'slice_name',
      key: 'slice_name',
      sorter: (a, b) => a.slice_name > b.slice_name ? 1 : -1,
      render(text, slice) {
        return (
          <Tooltip placement="topLeft" title={`点击查看 ${text} 详情`}>
            <div className="mw400 elli">
              {
                slice.authorization_permissions_type === AUTHORIZATION_PERMISSIONS_TYPE.owner
                || slice.authorization_permissions_type === AUTHORIZATION_PERMISSIONS_TYPE.write
                  ? (<Link to={getOpenSliceUrl(slice)} >
                    <b>{text}</b>
                  </Link>)
                  : (<a onClick={() => onPerviewSlice(slice)} >
                    <b>{text}</b>
                  </a>)
              }
            </div>
          </Tooltip>
        )
      }
    }, {
      title: '项目',
      dataIndex: 'druid_datasource_id',
      key: 'druid_datasource_id',
      sorter: (a, b) => a.druid_datasource_id > b.druid_datasource_id ? 1 : -1,
      render: id => {
        let ds = _.find(datasources, {id}) || {}
        return ds.title
      }
    }, {
      title: '类型',
      key: 'params.vizType',
      dataIndex: 'params',
      sorter: (a, b) => a.params.vizType > b.params.vizType ? 1 : -1,
      render (params) {
        return vizTypeNameMap[params.vizType || params.viz_type || 'table'] || '表格'
      }
    }, {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      sorter: (a, b) => a.updated_at > b.updated_at ? 1 : -1,
      render (text) {
        return moment(text).format('YYYY-MM-DD')
      }
    }, {
      title: '所属组',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags = []) => {
        return (tags && tags.length ? tags.map(tag => {
          const group = tagGroup.find( ({id}) => id === tag)
          return (group ? <Tag key={group.id} color="#479cdf" className="mg1r mg1b">{group.name}</Tag> : '')
        }) : '')
      }
    }, {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      width: 280
    }, {
      title: '创建人',
      dataIndex: 'author',
      key: 'author',
      width: 100
    }, {
      title: '是否加入看板',
      dataIndex: 'DashboardSlices',
      key: 'DashboardSlices',
      width: 100,
      render: (dashboardSlices) => {
        return dashboardSlices && dashboardSlices.length && '是' || '否'
      }
    },  {
      title: <div className="aligncenter">操作</div>,
      key: 'op',
      render: (text, slice) => {
        let subscribeIcon = slice.subscribed ? 'star' : 'star-o'
        let overviewIcon = slice.inOverview ? 'pushpin' : 'pushpin-o'
        let editable = slice.created_by ? window.sugo.user.id === slice.created_by : false
        let showOverview = editable &&
          (
            (slice.inOverview && this.canDelOverview) ||
            (!slice.inOverview && this.canAddOverview)
          )

        return (
          <div>{
            editable && this.canShare
              ? <Tooltip title="分享单图给其他用户">
                <ShareAltOutlined className="pointer mg1r" onClick={openShare(slice)} />
              </Tooltip>
              : null
          }
          {
            showOverview && hasOverviewLink
              ? <Tooltip title={slice.inOverview ? '点击从概览移除' : '点击加入概览'}>
                <LegacyIcon
                  className="pointer mg1r"
                  onClick={updateOverview(slice)}
                  type={overviewIcon}
                />
              </Tooltip>
              : null
          }
          {
            editable && hasSubscribeLink
              ? <Tooltip title={slice.subscribed ? '点击取消订阅' : '点击订阅'}>
                <LegacyIcon
                  onClick={updateSliceSubscribe(slice)}
                  className="pointer mg1r"
                  type={subscribeIcon}
                />
              </Tooltip>
              : null
          }
          {
            (editable && canDeleteSlice) ? 
              <Popconfirm
                title={(
                  <div>
                    {`确定删除 ${slice.slice_name} 么？`}
                    {
                      slice.shareRoles && slice.shareRoles.length
                        ? <div className="color-red">{'删除之后被分享该单图的用户将无法继续查看它'}</div>
                        : <div className="color-red">{'注意：单图将在概览、我的订阅、数据看板、画像引用中一同删除!'}</div>
                    }
                  </div>
                )}
                placement="topLeft"
                onConfirm={delSlice(slice)}
              >
                <Tooltip title="删除">
                  <CloseCircleOutlined
                    className="pointer color-red"
                  />
                </Tooltip>
              </Popconfirm>
              : null
          }
          </div>
        );
      }
    }]

    const pagination = {
      total: slices.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    const rowSelection = {
      selectedRowKeys,
      onChange: changeSelect
    }

    return (
      <div className="pd2b bg-white">
        <Table
          rowKey="id"
          rowSelection={rowSelection}
          columns={columns}
          pagination={pagination}
          dataSource={slices}
          bordered
          size="small"
        />
      </div>
    )
  }
}
