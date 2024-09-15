import React from 'react'
import Bread from '../Common/bread'
import { Modal, Table, Tag } from 'antd'
import _ from 'lodash'
import { sagaSyncModel } from '../Fetcher/saga-sync'
import Fetch from '../../common/fetch-final'
import { connect } from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import moment from 'moment'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import { SharingTypeEnum } from '../../../common/constants'
import { checkPermission } from '../../common/permission-control'
import { getUsers } from '../../actions'
import QrCode from '../Common/qr-code'

import { bindActionCreators } from 'redux'
import * as actions from '../../actions'

import { Auth } from '../../common/permission-control'
import TagManage from '../Common/tag-manage'
import FilterList from './filter-list'
import { Anchor } from '../Common/anchor-custom'

const namespace = 'publishSettingList'

const canDelShares = checkPermission('delete:/app/sharing/:id')

let mapStateToProps = (state, ownProps) => {
  const runtimeSagaModelNamespace = namespace
  const modelState = state[runtimeSagaModelNamespace] || {}
  return {
    ...modelState,
    datasourceCurrent: _.get(state, 'sagaCommon.datasourceCurrent', {}),
    users: _.get(state, 'common.users', []),
    runtimeSagaModelNamespace,
    tags: state.common.tags
  }
}

let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

const sagaModelGenerator = props => {
  return sagaSyncModel({
    namespace: namespace,
    modelName: 'shares',
    getEffect: async () => {
      let res = await Fetch.get('/app/sharing')
      return _.get(res, 'result', [])
    },
    postEffect: async model => {
      return await Fetch.post('/app/sharing', model)
    },
    putEffect: async model => {
      return await Fetch.put(`/app/sharing/${model.id}`, model)
    },
    deleteEffect: async model => {
      return await Fetch.delete(`/app/sharing/${model.id}`)
    }
  })
}

const durationFormat = metricValueFormatterFactory('duration-complete')
const maxAgeTranslateDict = {
  unlimited: '无限制',
  P1D: '一天',
  P7D: '七天'
}

@connect(mapStateToProps, mapDispatchToProps)
@withRuntimeSagaModel(sagaModelGenerator)
export default class PublishList extends React.Component {
  state = {
    selectKey: [],
    selectRow: [],
    selectedTags: [],
    searchOpts: [] //过滤列表时使用，第一个值时关键字，第二个时搜索的内容
  }

  componentDidMount() {
    this.props.dispatch(getUsers())
  }

  renderColumns() {
    let { datasourceList, users, tags: tagGroup } = this.props
    let userDict = _.keyBy(users, 'id')
    return [
      // {
      //   title: '分享类别',
      //   dataIndex: 'content_type',
      //   key: 'content_type',
      //   render: (val) => {
      //     return val === SharingTypeEnum.Dashboard ? '看板' : val === SharingTypeEnum.LiveScreen ? '实时大屏' : '未知'
      //   }
      // },
      {
        title: '分享内容名称',
        dataIndex: 'params.shareContentName',
        key: 'params.shareContentName',
        render: (v, record) => _.get(record, 'params.shareContentName', '--')
      },
      {
        title: '所属数据源',
        dataIndex: 'content_datasource_id',
        key: 'content_datasource_id',
        render: val => {
          let ds = val && _.find(datasourceList, ds => ds.id === val)
          return _.get(ds, 'title') || '(无)'
        }
      },
      {
        title: '分享有效期',
        dataIndex: 'max_age',
        key: 'max_age',
        render: val => {
          return maxAgeTranslateDict[val] || '未知'
        }
      },
      {
        title: '剩余有效期',
        dataIndex: 'remain_age',
        key: 'remain_age',
        render: (val, record) => {
          let max_age = (record && record.max_age) || 'unlimited'
          let remainAgeInSec = max_age === 'unlimited' ? 'unlimited' : moment.duration(max_age).asSeconds() - moment().diff(record.created_at || Date.now(), 's')

          if (max_age === 'unlimited') {
            return ''
          }
          return remainAgeInSec <= 0 ? '已失效' : durationFormat(remainAgeInSec)
        }
      },
      {
        title: '分享者',
        dataIndex: 'created_by',
        key: 'created_by',
        render: val => {
          const { first_name, username } = userDict[val] || {}
          return first_name ? `${first_name}(${username})` : username
        }
      },
      {
        title: '分享时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render: val => {
          return moment(val).format('YYYY-MM-DD HH:mm:ss ddd')
        }
      },
      {
        title: '所属组',
        dataIndex: 'tags',
        key: 'tags',
        render: tags => {
          return tags && tags.length
            ? tags.map(tag => {
                const group = tagGroup.find(({ id }) => id === tag)
                return group ? (
                  <Tag key={group.id} color='#479cdf' className='mg1r mg1b'>
                    {group.name}
                  </Tag>
                ) : (
                  ''
                )
              })
            : ''
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        render: (val, record) => {
          return (
            <React.Fragment>
              <Anchor className='color-main' href={`${location.origin}/share/${val}`} target='_blank'>
                查看分享内容
              </Anchor>
              {record.content_type !== SharingTypeEnum.Dashboard ? null : (
                <Anchor className='color-main mg2l' className='pointer' target='_blank' onClick={this.showQrCode} data-share-id={val}>
                  扫码分享
                </Anchor>
              )}
              {!canDelShares ? null : (
                <span className='fpointer mg2l color-red' data-share-id={val} onClick={this.onDeleteSharingClick}>
                  取消分享
                </span>
              )}
            </React.Fragment>
          )
        }
      }
    ]
  }

  showQrCode = ev => {
    let preShareId = ev.target.getAttribute('data-share-id')
    Modal.info({
      title: '您可以用手机扫码查看',
      content: <QrCode url={`${location.origin}/share/${preShareId}`} />,
      onOk() {}
    })
  }

  onDeleteSharingClick = e => {
    let preDelId = e.target.getAttribute('data-share-id')
    if (!preDelId) {
      return
    }
    Modal.confirm({
      title: '确认删除此分享？',
      content: '下次再启用分享时，分享链接会发生变化',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let { shares, dispatch } = this.props
        dispatch({
          type: `${namespace}/sync`,
          payload: (shares || []).filter(s => s.id !== preDelId)
        })
      },
      onCancel() {}
    })
  }

  filterTags = selectedTags => {
    this.setState({ selectedTags: [...selectedTags] })
  }

  selectRow = (selectKey, selectRow) => {
    this.setState({
      selectKey,
      selectRow
    })
  }

  updataTags = (...arg) => {
    // const {updateSharingTag=()=>{}} = this.props
    const { dispatch = () => {}, shares } = this.props
    let { selectKey } = this.state
    const [tagId, type] = arg

    let targets = shares.map(row => {
      if (selectKey.includes(row.id)) {
        const tagSet = new Set(row.tags)
        type === 'add' ? tagSet.add(tagId) : tagSet.delete(tagId)
        return {
          ...row,
          tags: [...tagSet]
        }
      }
      return row
    })

    dispatch({
      type: `${namespace}/sync`,
      payload: targets
    })

    this.setState({
      selectRow: [],
      selectKey: []
    })
  }

  onsearch = ([key, val]) => {
    this.setState({
      searchOpts: [key, val]
    })
  }

  render() {
    let { isFetchingShares, datasourceList, shares = [], setProp, tags } = this.props
    const { selectKey, selectRow, selectedTags, searchOpts = [] } = this.state

    shares = shares.filter(({ tags = [] }) => !selectedTags.length || tags.find(key => selectedTags.includes(key)))
    shares = shares.filter(rowData => {
      const [key, val] = searchOpts
      let data = ''
      if (key === 'content_type') {
        // 分享类别
        data = rowData.content_type === SharingTypeEnum.Dashboard ? '看板' : rowData.content_type === SharingTypeEnum.LiveScreen ? '实时大屏' : '未知'
      } else if (key === 'content_datasource_id') {
        // 所属数据源
        const ds = rowData.content_datasource_id && _.find(datasourceList, ds => ds.id === rowData.content_datasource_id)
        data = _.get(ds, 'title') || '(无)'
      } else if (key === 'params.shareContentName') {
        // 所属数据源
        data = (rowData.params && rowData.params.shareContentName) || ''
      }
      return data ? data.toLocaleLowerCase().indexOf(val.toLocaleLowerCase()) !== -1 : true
    })

    let tagProps = {
      projectId: 'publish',
      type: 'publish',
      afterDeleteTag: () => {},
      mode: selectKey.length ? 'change' : 'filter',
      filterTagIds: selectedTags,
      items: selectRow,
      updateFilteredTags: this.filterTags,
      updateItemTag: this.updataTags,
      setProp,
      tags,
      permissionUrl: ''
    }

    let filterProps = {
      onsearch: this.onsearch,
      searchOpts
    }

    const rowSelection = {
      selectedRowKeys: selectKey,
      onChange: this.selectRow
    }

    return (
      <div className='height-100 overscroll-y'>
        <Bread path={[{ name: '发布管理' }]} />
        <div className='pd3x pd2y'>
          <div className='fix pd2b'>
            <div className='fleft'>
              <FilterList {...filterProps} />
            </div>
            <div className='fright'>
              <Auth auth='post:/app/slices/update/slices-tag'>
                <TagManage {...tagProps} className='iblock mg1l' />
              </Auth>
            </div>
          </div>
          <Table rowKey='id' rowSelection={rowSelection} dataSource={shares} columns={this.renderColumns()} />
        </div>
      </div>
    )
  }
}
