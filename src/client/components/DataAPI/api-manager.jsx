import React from 'react'
import {bindActionCreators} from 'redux'
import { InfoCircleOutlined } from '@ant-design/icons';
import { Modal, Popover, Table, Select, Input, DatePicker } from 'antd';
import _ from 'lodash'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {sagaSyncModel} from '../Fetcher/saga-sync'
import Fetch from '../../common/fetch-final'
import {connect} from 'react-redux'
import {getUsers, getDatasources} from '../../actions'
import moment from 'moment'
import {checkPermission} from '../../common/permission-control'
import {DataApiStatusEnum, DataApiTypeEnum} from '../../../common/constants'
import {compressUrlQuery} from '../../../common/sugo-utils'
import AsyncHref from '../Common/async-href'
import {DataApiClientsManagerNameSpace} from './clients-manager'
import LinkNoJam from '../Common/link-nojam'
import {getInsightUrlByUserGroup} from '../../common/usergroup-helper'
import TagManage, {tagRender} from '../Common/tag-manage'
import ViewDataApiSettingsModal from '../DataAPI/view-data-api-modal'
import * as actions from '../../actions'
import SizeProvider from "../Common/size-provider";

const namespace = 'data-apis-manager'
const canModApis = checkPermission('put:/app/data-apis/:id')
const canDelApis = checkPermission('delete:/app/data-apis/:id')

const Option = Select.Option

const sagaModelGenerator = props => {
  return sagaSyncModel(
    {
      namespace: namespace,
      modelName: 'apis',
      getEffect: async () => {
        let res = await Fetch.get('/app/data-apis')
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/data-apis', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/data-apis/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/data-apis/${model.id}`)
      }
    }
  )
}

let translateDict = {
  queryKey: '参数名',
  col: '对应维度',
  op: '筛选方式'
}

const DataApiTypeEnumTranslateDict = {
  [DataApiTypeEnum.Slice]: '单图',
  [DataApiTypeEnum.UserGroup]: '用户群'
}

let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  const datasources = _.get(state, 'common.datasources', [])
  return {
    ...modelState,
    datasourceCurrent: _.get(state, 'sagaCommon.datasourceCurrent', {}),
    clients: _.get(state, `${DataApiClientsManagerNameSpace}.clients`, []),
    users: _.get(state, 'common.users', []),
    tags: _.get(state, 'common.tags', []),
    datasourcesDict: _.keyBy(datasources,'id'),
    datasources 
  }
}

let mapDispatchToProps = dispatch => ({
  pieActions: bindActionCreators(actions, dispatch),
  dispatch
})

@connect(mapStateToProps, mapDispatchToProps)
@withRuntimeSagaModel(sagaModelGenerator)
export default class DataApisManager extends React.Component {

  state = {
    selectedTags: [],
    selectedRowKeys: [],
    filters: {
      selectedDataSource: '',
      selectedName: '',
      since: '',
      until: ''
    }
  }

  componentDidMount() {
    this.props.dispatch(getUsers())
    this.props.dispatch(getDatasources())
  }
  
  renderColumns() {
    let {users, clients, tags, datasourcesDict} = this.props
    let userDict = _.keyBy(users, 'id')
    let clientDict = _.keyBy(clients, 'id')
    return [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 100,
        fixed:'left'
      },
      {
        title: '类型',
        dataIndex: 'type',
        width: 60,
        key: 'type',
        fixed:'left',
        render: val => {
          return DataApiTypeEnumTranslateDict[val] || val
        }
      },
      {
        title: '调用路径',
        dataIndex: 'call_path',
        key: 'call_path',
        width: 180,
        fixed:'left',
        render: val => {
          return `/data-api/${val || ''}`
        }
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        width: 120
      },
      {
        title: '所属数据源',
        dataIndex: 'params',
        key: 'dataSourceId',
        width: 180,
        render: (val) => {
          if (val.druid_datasource_id) return _.get(datasourcesDict[val.druid_datasource_id], 'title', '')
          return _.get(datasourcesDict[val.slice.druid_datasource_id],'title', '')
        }
      },
      {
        title: '额外筛选参数',
        dataIndex: 'params.extraFilters',
        key: 'params.extraFilters',
        width: 80,
        render: flts => {
          return !_.isEmpty(flts)
            ? <Popover
              content={(
                <React.Fragment>
                  {flts.map((f, i) => {
                    const str = _.orderBy(_.keys(f).map(k => `${translateDict[k]}：${f[k]}`)).join('，')
                    return <div key={i}>{str}</div>
                  })}
                </React.Fragment>
              )}
            ><InfoCircleOutlined className="font16" /></Popover>
            : '(无)';
        }
      },
      {
        title: '允许访问的客户端',
        dataIndex: 'accessible_clients',
        key: 'accessible_clients',
        width: 150,
        render: clientIds => {
          if (_.isEqual(clientIds, ['*'])) {
            return '不限'
          }
          const str = clientIds.map(cId => _.get(clientDict[cId], 'name')).filter(_.identity).join('，')
          return (
            <div className="elli mw300" title={str}>{str}</div>
          )
        }
      },
      {
        title: '创建者',
        dataIndex: 'created_by',
        key: 'created_by',
        width: 120,
        render: (val) => {
          const {first_name, username} = userDict[val] || {}
          return first_name ? `${first_name}(${username})` : username
        }
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        width: 180,
        key: 'created_at',
        render: val => {
          return moment(val).format('YYYY-MM-DD HH:mm:ss ddd')
        }
      },
      {
        title: '分组',
        dataIndex: 'tags',
        key: 'tags',
        width: 120,
        render: tagRender(tags)
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 60,
        key: 'status',
        render: val => {
          return DataApiStatusEnum.Enabled === val ? '启用' : '禁用'
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 300,
        key: 'op',
        render: (id, record) => {
          return (
            <React.Fragment>
              {record.type === DataApiTypeEnum.Slice ? (
                <AsyncHref
                  initFunc={() => this.genInspectSliceUrl(id) || 'javascript:alert("查看关联单图失败，请联系管理员")'}
                  className="mg2r"
                  data-api-id={id}
                  component={LinkNoJam}
                >查看关联单图</AsyncHref>
              ) : (
                <AsyncHref
                  initFunc={() => {
                    const url = getInsightUrlByUserGroup({
                      id: _.get(record, 'params.userGroupId'),
                      params: {
                        openWith: _.get(record, 'params.userGroupOpenWith')
                      }
                    })
                    return url || 'javascript:alert("查看关联用户群失败，请联系管理员")'
                  }}
                  className="mg2r"
                  data-api-id={id}
                  component={LinkNoJam}
                >查看关联用户群</AsyncHref>
              )}
              {!canModApis ? null : (
                <a
                  className="mg2r pointer"
                  data-api-id={id}
                  onClick={this.onToggleStatusClick}
                >{record.status === DataApiStatusEnum.Enabled ? '禁用' : '启用'}</a>
              )}
              <ViewDataApiSettingsModal
                key={id || '0'}
                apis={record}
                dataApiId={id}
                clients={clients}
              >
                <a className="mg2r">查看API信息</a>
              </ViewDataApiSettingsModal>
              {!canDelApis ? null : (
                <span
                  className="fpointer color-red"
                  data-api-id={id}
                  onClick={this.onDeleteAPIClick}
                >删除</span>
              )}
            </React.Fragment>
          )
        }
      }
    ];
  }
  
  genInspectSliceUrl = apiId => {
    if (!apiId) {
      return
    }
    let {apis} = this.props
    let api = _.find(apis, {id: apiId})
    if (!api) {
      return
    }
    let slice = _.get(api.params, 'slice')
    if (!slice) {
      return
    }
    const nextHashState = {
      ...slice.params,
      child_project_id: slice.child_project_id,
      selectedDataSourceId: slice.druid_datasource_id
    }
    return `/console/analytic?dataApiId=${apiId}#${compressUrlQuery(JSON.stringify(nextHashState))}`
  }
  
  onToggleStatusClick = e => {
    let preToggleStatusId = e.target.getAttribute('data-api-id')
    if (!preToggleStatusId) {
      return
    }
    let {apis, dispatch} = this.props
    let api = _.find(apis, {id: preToggleStatusId})
    let nextStatus = api.status === DataApiStatusEnum.Enabled
      ? DataApiStatusEnum.Disabled
      : DataApiStatusEnum.Enabled
    if (nextStatus === DataApiStatusEnum.Disabled) {
      Modal.confirm({
        title: '确认禁用此 API？',
        content: '此 API 将无法再被调用',
        okText: '确认',
        cancelText: '取消',
        onOk: () => {
          dispatch({
            type: `${namespace}/sync`,
            payload: (apis || [])
              .map(s => s.id === preToggleStatusId ? ({...s, status: nextStatus}) : s)
          })
        }
      })
    } else {
      dispatch({
        type: `${namespace}/sync`,
        payload: (apis || [])
          .map(s => s.id === preToggleStatusId ? ({...s, status: nextStatus}) : s)
      })
    }
  }
  
  onDeleteAPIClick = e => {
    let preDelId = e.target.getAttribute('data-api-id')
    if (!preDelId) {
      return
    }
    Modal.confirm({
      title: '确认删除此API？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let {apis, dispatch} = this.props
        dispatch({
          type: `${namespace}/sync`,
          payload: (apis || []).filter(s => s.id !== preDelId)
        })
      }
    })
  }
  

  afterDeleteTag = tagId => {
    let {apis} = this.props
    let apisClone = _.cloneDeep(apis).map(api => {
      _.remove(api.tags, tagId)
      return api
    })
    this.props.dispatch({
      type: `${namespace}/sync`,
      payload: apisClone 
    })
  }

  updateFilteredTags = selectedTags => {
    this.setState({
      selectedTags
    })
  }
  
  updateItemTag = async (tagId, action) => {
    let {apis = []} = this.props
    const { selectedRowKeys } = this.state
    let apisClone = _.cloneDeep(apis)
    for (let id of selectedRowKeys) {
      let tIndex = _.findIndex(apisClone, o => o.id === id)
      if (tIndex === -1) continue
      let tags = action === 'add'
        ? _.uniq(apisClone[tIndex].tags.concat(tagId))
        : _.without(apisClone[tIndex].tags, tagId)
      if (_.isEqual(tags, apisClone[tIndex].tags)) {
        continue
      }
      apisClone[tIndex].tags = tags
    }
    this.props.dispatch({
      type: `${namespace}/sync`,
      payload: apisClone 
    })
  }

  onChangeSelect = selectedRowKeys => {
    this.setState({
      selectedRowKeys
    })
  }

  render() {
    let {apis = [], tags, pieActions, datasources} = this.props
    const { selectedTags, selectedRowKeys, filters } = this.state
    let tagProps = {
      projectId: 'sugo_data_apis',
      type: 'sugo_data_apis',
      afterDeleteTag: this.afterDeleteTag,
      mode: selectedRowKeys.length ? 'change' : 'filter',
      filterTagIds: selectedTags,
      items: apis.filter( api => selectedRowKeys.includes(api.id)),
      updateFilteredTags: this.updateFilteredTags,
      updateItemTag: this.updateItemTag,
      setProp: pieActions.setProp,
      tags,
      permissionUrl: 'put:/app/data-apis/:id'
    }

    const pagination = {
      total: apis.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    const rowSelection = {
      selectedRowKeys,
      onChange: this.onChangeSelect
    }

    let filteredApis = _.filter(apis, api => {
      if (!api.id) return false
      let pickThis = true
      if (filters.selectedDataSource !== '') {
        let sDS = filters.selectedDataSource
        if (_.get(api, 'params.druid_datasource_id') !== sDS && _.get(api, 'params.slice.druid_datasource_id') !== sDS)
          pickThis = false
      }
      if (filters.selectedName !== '') {
        if (_.get(api, 'name', '').toLowerCase().indexOf(filters.selectedName.toLowerCase()) < 0)
          pickThis = false
      }

      if (filters.since && filters.until) {
        let created_at = +moment(_.get(api, 'created_at', ''))
        if (created_at < filters.since || filters.until < created_at)
          pickThis = false
      }
      return pickThis
    })

    if (selectedTags.length) {
      filteredApis = filteredApis.filter(api => {
        let con = api.tags.concat(selectedTags)
        let uniq = _.uniq(con)
        return con.length !== uniq.length
      })
    }

    let validDsSet = new Set(_.map(apis, api => api?.params?.druid_datasource_id || api?.params?.slice?.druid_datasource_id))
    return (
      <div className="overscroll-y" style={{height: 'calc(100% - 17px)'}}>
        <div className="fleft">
          <div 
            className='mg2b mg3l'
          >
            <Select 
              defaultValue={''}
              showSearch
              allowClear
              placeholder="请选择数据源"
              filterOption={(input, option) => {
                return option.props
                  .children
                  .toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }}
              onChange={(val) => {
                this.setState({
                  'filters': {
                    ...filters,
                    selectedDataSource: val
                  }
                })
              }}
              className='width200 mg2r'
              dropdownMatchSelectWidth={false}
            >
              {
                _.concat([{id: '', title:'所有数据源'}], datasources.filter(ds => validDsSet.has(ds.id)))
                  .map(i => {
                    return (
                      <Option title={i.title} key={i.id} value={i.id}>{i.title}</Option>
                    );
                  })
              }
            </Select>
            <Input 
              className='width200 mg2r'
              placeholder='请输入名称'
              allowClear
              onChange={(e) => this.setState({
                filters: {
                  ...filters,
                  selectedName: e.target.value
                }
              })}
            />
            <DatePicker.RangePicker 
              className='width240 mg2r'
              allowClear
              onChange={(e) => {
                if (_.isEmpty(e)){
                  this.setState({
                    filters: {
                      ...filters,
                      since: '',
                      until: ''
                    }
                  })
                  return 
                }
                let [since, until] = e
                this.setState({
                  filters: {
                    ...filters,
                    since: since ? +moment(since).startOf('d') : '',
                    until: until ? +moment(until).endOf('d') : ''
                  }
                })
              }}
            />
          </div>
        </div>
        <div className="fright">
          <TagManage 
            {...tagProps}
            className='mg2b mg3r'
          />
        </div>
        <div className="mg2t pd3x pd2y">
          <SizeProvider>
            {({spWidth}) => {
              let columns = this.renderColumns();
              let contentWidth = _.sum(_.map(columns, c => c.width || 50))

              return (
                <Table
                  rowKey={rec => rec.id}
                  rowSelection={rowSelection}
                  pagination={pagination}
                  dataSource={filteredApis}
                  columns={columns}
                  scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth }}
                />
              )
            }}
          </SizeProvider>
        </div>
      </div>
    )
  }
}
