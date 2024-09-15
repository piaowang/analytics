import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Modal, Select, Switch, Table, Tag } from 'antd'
import { browserHistory } from 'react-router'
import Bread from '../Common/bread'
import { Link } from 'react-router'
import { useRuntimeSagaModels } from '../Common/runtime-saga-helper'
import { PORTALS_SAGA_MODEL_NS, portalsSagaModelGenerator } from './portals-saga-model'
import _ from 'lodash'
import { PlusOutlined } from '@ant-design/icons'
import { connect } from 'react-redux'
import moment from 'moment'
import { getUsers } from '../../actions'
import TagManage from '../Common/tag-manage'
import { TagTypeEnum } from '../../../common/constants'
import { hashCode } from '../../../common/sugo-utils'
import { withDebouncedOnChange } from '../Common/with-debounce-on-change'
import Search from '../Common/search'

const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 1000)

function PortalsMgr(props) {
  const { portals = [], portalsTotal, tags, users } = props
  const { dispatch } = window.store
  const [state, setState] = useState({
    selectedRowKeys: [],
    selectedTags: [],
    page: 1,
    pageSize: 30,
    searchingByName: null,
    searchingByStatus: null
  })
  const { selectedRowKeys, selectedTags, page, pageSize, searchingByName, searchingByStatus } = state

  const userIdDict = useMemo(() => _.keyBy(users, 'id'), [_.size(users)])
  const tagsIdDict = useMemo(() => _.keyBy(tags, 'id'), [_.size(tags)])

  useRuntimeSagaModels(
    props,
    [
      portalsSagaModelGenerator(
        PORTALS_SAGA_MODEL_NS,
        _.pickBy(
          {
            pageSize,
            page,
            tags__text$or: _.isEmpty(selectedTags) ? undefined : JSON.stringify(_.map(selectedTags, tagId => ({ $like: `%${tagId}%` }))),
            name$like: (searchingByName && `%${searchingByName}%`) || null,
            status: searchingByStatus < 0 ? null : searchingByStatus
          },
          v => !_.isNil(v)
        )
      )
    ],
    [hashCode(JSON.stringify(selectedTags)), pageSize, page, searchingByName, searchingByStatus]
  )

  useEffect(() => {
    dispatch(getUsers())
  }, [])

  const onDeleteOfflineDsClick = ev => {
    ev.preventDefault()
    let preDel = ev.target.getAttribute('data-id')
    if (!preDel) {
      return
    }
    Modal.confirm({
      title: '确认删除该门户？',
      content: '此操作无法撤销，请谨慎操作',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let next = _.filter(portals, ds => ds.id !== preDel)
        dispatch({
          type: `${PORTALS_SAGA_MODEL_NS}/sync`,
          payload: next
        })
      },
      onCancel() {}
    })
  }

  const columns = [
    {
      title: '门户名称',
      key: 'name',
      dataIndex: 'name'
    },
    {
      title: '门户地址',
      key: 'basePath',
      dataIndex: 'basePath',
      render(basePath) {
        const url = `${window.location.origin}/${basePath}`
        return (
          <a
            onClick={e => {
              e.preventDefault()
              localStorage.isRead = true
              browserHistory.push(`/${basePath}`)
            }}
          >
            {url}
          </a>
        )
      }
    },
    {
      title: '创建人',
      key: 'createdBy',
      dataIndex: 'createdBy',
      render: userId => {
        let user = userIdDict?.[userId]
        const { first_name, username } = user || {}
        return first_name ? `${first_name}(${username})` : username
      }
    },
    {
      title: '创建时间',
      key: 'created_at',
      dataIndex: 'created_at',
      render: createdAt => {
        return moment(createdAt).format('YYYY-MM-DD HH:mm:ss')
      }
    },
    {
      title: '修改人',
      key: 'updatedBy',
      dataIndex: 'updatedBy',
      render: userId => {
        let user = userIdDict?.[userId]
        const { first_name, username } = user || {}
        return first_name ? `${first_name}(${username})` : username
      }
    },
    {
      title: '修改时间',
      key: 'updated_at',
      dataIndex: 'updated_at',
      render: updatedAt => {
        return updatedAt && moment(updatedAt).format('YYYY-MM-DD HH:mm:ss')
      }
    },
    {
      title: '分组',
      key: 'tags',
      dataIndex: 'tags',
      render: tagIds => {
        return tagIds?.map(id => {
          let tag = tagsIdDict?.[id]
          return (
            tag && (
              <Tag color='#479cdf' key={id} className='mg1r mg1b'>
                {tag.name || ''}
              </Tag>
            )
          )
        })
      }
    },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      render(status, record) {
        return (
          <Switch
            checkedChildren='已启用'
            unCheckedChildren='未启用'
            checked={status !== 0}
            onChange={checked => {
              dispatch({
                type: `${PORTALS_SAGA_MODEL_NS}/sync`,
                payload: _.map(portals, p => (p.id === record.id ? { ...p, status: checked ? 1 : 0 } : p))
              })
            }}
          />
        )
      }
    },
    {
      title: '操作',
      key: 'op',
      dataIndex: 'id',
      render: (id, record) => {
        if (record.status !== 0) {
          return null
        }
        return (
          <React.Fragment>
            <Link to={`/console/portals-mgr/${record.id}`} className='mg2r'>
              编辑
            </Link>
            <a href='#' className='fpointer color-red' data-id={id} onClick={onDeleteOfflineDsClick}>
              删除
            </a>
          </React.Fragment>
        )
      }
    }
  ]

  const selectedRowKeysSet = new Set(selectedRowKeys)
  const tagProps = {
    projectId: 'all',
    type: TagTypeEnum.portals,
    mode: selectedRowKeys.length ? 'change' : 'filter',
    filterTagIds: selectedTags,
    updateFilteredTags: selectedTags => setState({ ...state, selectedTags }),
    items: portals.filter(p => selectedRowKeysSet.has(p.id)),
    updateItemTag: (tagId, action) => {
      dispatch({
        type: `${PORTALS_SAGA_MODEL_NS}/sync`,
        payload: _.map(portals, p => {
          return selectedRowKeysSet.has(p.id)
            ? {
                ...p,
                tags: action === 'add' ? [...(p.tags || []), tagId] : _.without(p.tags, tagId)
              }
            : p
        })
      })
    },
    permissionUrl: 'put:/app/portals/:id'
  }

  const pagination = {
    total: portalsTotal,
    page,
    pageSize,
    onChange: (page, pageSize) => setState({ ...state, pageSize, page }),
    showTotal: total => `总计 ${total} 条`
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: selectedRowKeys => setState({ ...state, selectedRowKeys })
  }

  return (
    <div className='height-100 bg-white'>
      <Bread path={[{ name: '数据应用中心', url: '#' /* TODO */ }, { name: '智能数据门户' }, { name: '门户管理' }]} />
      <div className='scroll-content always-display-scrollbar'>
        <div className='pd2b pd3x height80 line-height80'>
          <div className='itblock'>
            <Select className='width150' value={_.isNil(searchingByStatus) ? -1 : searchingByStatus} onChange={val => setState({ ...state, searchingByStatus: +val })}>
              <Select.Option value={-1}>不限状态</Select.Option>
              <Select.Option value={1}>已启用</Select.Option>
              <Select.Option value={0}>已停用</Select.Option>
            </Select>
          </div>
          <div className='itblock mg2l'>
            <InputWithDebouncedOnChange
              value={searchingByName}
              onChange={value => {
                setState({ ...state, searchingByName: value })
              }}
              placeholder='按名称搜索门户...'
            />
          </div>
          <div className='fright'>
            <Link to={{ pathname: '/console/portals-mgr/new' }}>
              <Button icon={<PlusOutlined />} type='primary'>
                新建门户
              </Button>
            </Link>

            <TagManage {...tagProps} className='mg3l itblock' />
          </div>
        </div>

        <div className='pd1t pd3x'>
          <Table loading={false} bordered size='small' rowKey='id' rowSelection={rowSelection} pagination={pagination} columns={columns} dataSource={portals} />
        </div>
      </div>
    </div>
  )
}

export default _.flow([
  connect(props => {
    const { portals, count } = props[PORTALS_SAGA_MODEL_NS] || {}
    return {
      portals,
      portalsTotal: count,
      tags: props?.common?.tags || [],
      users: props?.common?.users || []
    }
  })
])(PortalsMgr)
