import React from 'react'
import Bread from '../Common/bread'
import { PlusOutlined } from '@ant-design/icons';
import {Button, Modal, Select, Table, message} from 'antd'
import _ from 'lodash'
import {Auth, checkPermission} from '../../common/permission-control'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {Link} from 'react-router'
import {
  dataSourceListSagaModelGenerator,
  modelsSagaModelGenerator
} from './saga-model-generators'
import { OfflineCalcTargetType, OfflineCalcVersionStatus } from '../../../common/constants'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import SwitchGroupPanel from './switch-group-panel2'
import {TagTypeEnum} from '../../../common/constants'
import Fetch from '../../common/fetch-final'
import {isDiffByPath} from '../../../common/sugo-utils'
import {Button2} from '../Common/sugo-icon'

const namespace = 'offline-calc-models-list'

const canDel = checkPermission('delete:/app/offline-calc/models/:id')

let mapStateToProps = (state, ownProps) => {
  const modelsListState = state[namespace] || {}
  const dsListState = state['offline-calc-data-sources-list-for-indices-models-list'] || {}
  const tagsListState = state[`switch-group-panel_${TagTypeEnum.offline_calc_model}`] || {}
  return {
    ...modelsListState,
    offlineCalcDataSources: dsListState.offlineCalcDataSources,
    tags: tagsListState.tags,
    users: _.get(state, 'common.users', [])
  }
}



@connect(mapStateToProps)
@withRuntimeSagaModel([
  modelsSagaModelGenerator(namespace, 'list', ['id', 'belongs_id', 'name', 'title', 'tags', 'created_by']),
  dataSourceListSagaModelGenerator('offline-calc-data-sources-list-for-indices-models-list')
])
export default class OfflineCalcModelsList extends React.Component {
  
  state = {
    filterByDsId: 'all',
    selectedTagId: '',
    filteredModels: [],
    expandRowKeys: []
  }
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    let selectDom = document.getElementsByClassName('ant-table-row-expanded')
    var newArr = [...selectDom]
    newArr = newArr.map( i => i.title = '点击查看衍生私有版本')
    
    if (
      !_.isEqual(this.props.offlineCalcModels, prevProps.offlineCalcModels)
      || isDiffByPath(this.state, prevState, 'selectedTagId')
    ) {
      let offlineCalcModels = this.props.offlineCalcModels
      const { selectedTagId, filterByDsId } = this.state
      let expandRowKeys = []
      let filteredModels = (offlineCalcModels || []).filter(d => {
        let pickThis = true
        if (filterByDsId === 'null' || !filterByDsId) {
          pickThis = pickThis && !d.data_source_id
        } else if (filterByDsId !== 'all') {
          pickThis = pickThis && d.data_source_id === filterByDsId
        }
        if (selectedTagId) {
          pickThis = pickThis && _.some(d.tags, tId => tId === selectedTagId)
        } else {
          pickThis = !_.some(d.tags, tId => tId === 'auto_generate')
        }
        return pickThis
      })
      
      let shouldFilter = []
      filteredModels = filteredModels.filter( i => {
        if (i.id === i.belongs_id) {
          i.children = []
          filteredModels.map(j => {
            if (j.belongs_id === i.id && j.belongs_id !== j.id) {
              i.children.push(j)
              shouldFilter.push(j.id)
            }
          })
          expandRowKeys.push(i.id)
          if (_.isEmpty(i.children)) delete i.children
          return true
        }
        
        if (!selectedTagId) return !i.belongs_id
        return true
      })
      filteredModels = filteredModels.filter(i => !shouldFilter.includes(i.id) )
      this.setState({
        filteredModels,
        expandRowKeys
      })
    }
  }
  
  onDeleteClick = ev => {
    let preDel = ev.target.getAttribute('data-id')
    if (!preDel) {
      return
    }

    const cp = (syncRes) => {
      let { resDelete } = syncRes || {}
      let res = _.get(resDelete, '[0].result', '')
      if (res === 1) message.success('删除成功')
    }

    Modal.confirm({
      title: '确认删除此指标？',
      content: '此操作无法撤销，请谨慎操作',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let {dispatch, offlineCalcModels} = this.props
        dispatch({
          type: `${namespace}/sync`,
          payload: (offlineCalcModels || []).filter(ds => ds.id !== preDel),
          forceReload: true,
          callback: cp
        })
      }
    })
    
  }
  
  renderColumns() {
    let { users, offlineCalcDataSources, tags } = this.props
    let userDict = _.keyBy(users, 'id')
    let tagIdDict = _.keyBy(tags, 'id')
    let dsIdDict = _.keyBy(offlineCalcDataSources, 'id')
    return [
      {
        title: '指标模型名称',
        dataIndex: 'name',
        key: 'name',
        render: (val, record) => {
          let isReviewing = _.get(record.SugoVersionHistory, 'isReviewing')
          return (
            isReviewing ? <span>{record.title || val}</span>
              : (
                <Auth auth="get:/console/offline-calc/models/:id" alt={record.title || val}>
                  <Link to={`/console/offline-calc/models/${record.id}`}>{record.title || val}</Link>
                </Auth>
              )
          )
        }
      },
      {
        title: '所属分类',
        dataIndex: 'tags',
        key: 'tags',
        render: (tags) => {
          return (tags || []).map(tId => _.get(tagIdDict, [tId, 'name'])).filter(_.identity).join(', ')
        }
      },
      {
        title: '版本',
        dataIndex: 'SugoVersionHistory.version',
        key: 'version',
        render: (v, record) => _.get(record, 'SugoVersionHistory.version', '--')
      },
      {
        title: '负责人',
        dataIndex: 'created_by',
        key: 'created_by',
        render: (val) => {
          const {first_name, username} = userDict[val] || {}
          return first_name ? `${first_name}(${username})` : username
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        render: (val, record) => {
          let isPrivate = record.id !== record.belongs_id
          let isReviewing = _.get(record.SugoVersionHistory, 'isReviewing') || _.get(record.SugoVersionHistory, 'status') === OfflineCalcVersionStatus.watingForDel
          let isWatingForDel = _.get(record.SugoVersionHistory, 'status') === OfflineCalcVersionStatus.watingForDel
          let showDel = canDel && !isWatingForDel && !isReviewing
          
          return (
            <React.Fragment>
              {
                isPrivate && !isReviewing ?
                  <Auth auth="get:/console/offline-calc/release-version/:id">
                    <Link className="mg2r" to={`/console/offline-calc/models/${record.id}?targetType=${OfflineCalcTargetType.IndicesModel}`}>提交审核</Link>
                  </Auth>
                  : null
              }
              {
                isReviewing ? <span className="color-blue mg2r">审核中</span> : null
              }
              {
                isReviewing
                  ? null
                  : (
                    <Auth auth="get:/console/offline-calc/models/:id">
                      <Link className="mg2r" to={`/console/offline-calc/models/${record.id}`}>编辑</Link>
                    </Auth>
                  )
              }
              <Auth auth="get:/console/offline-calc/models/logs/:id">
                <Link className="mg2r" to={`/console/offline-calc/models/logs/${record.id}`}>查看日志</Link>
              </Auth>
              {!showDel ?  null : (
                <span
                  className="fpointer mg2r color-red"
                  data-id={val}
                  onClick={(ev) => {
                    // if (isWatingForDel) return message.error('正在审核删除,勿重复提交')

                    if (isPrivate && !isReviewing) {
                      return this.onDeleteClick(ev)
                    }
                    // if (isReviewing) {
                    //   return message.error('正在审核,请先取消审核')
                    // }
                    
                    
                    //TODO 提交成功后刷新页面
                    Modal.confirm({
                      title: '删除审核',
                      content: '删除公有版本需要提交审核',
                      okText: '删除审核',
                      cancelText: '取消',
                      onOk: async () => {
                        let { success, message: msg} = await Fetch.post(`/app/offline-calc/review-del/${record.id}`, {type: OfflineCalcTargetType.IndicesModel})
                        if (!success) {
                          message.error(msg)
                          return
                        }
                        message.success('提交成功')
                        this.props.dispatch({
                          type: `${namespace}/fetch`
                        })
                        return
                      }
                    })
                  }}
                >删除</span>
              )}
            </React.Fragment>
          )
        }
      }
    ]
  }
  
  render() {
    const { filteredModels, selectedTagId, expandRowKeys } = this.state

    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '指标模型管理' }
          ]}
        />
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic"
        >
          <div
            defaultWeight={1}
            className="itblock height-100"
            style={{
              padding: '10px 5px 10px 10px'
            }}
          >
            <div className="bg-white corner height-100 pd2 overscroll-y">
              <SwitchGroupPanel
                groupTitle="指标模型"
                selectedTagId={selectedTagId}
                onTagSelected={tag => {
                  this.setState({
                    selectedTagId: tag && tag.id || '',
                    filteredModels: []
                  })
                }}
                onTagDelete={tag => {
                }}
                tagType={TagTypeEnum.offline_calc_model}
              />
            </div>
          </div>
          
          <div
            className="itblock height-100"
            style={{padding: '10px 10px 10px 5px'}}
            defaultWeight={5}
          >
            <div className="pd3x pd2y bg-white corner height-100 overscroll-y">
              <div className="pd2b">
                <div className="height32 itblock">
                  <Auth auth="get:/console/offline-calc/models-running-histories">
                    <Link to="/console/offline-calc/models-running-histories">
                      <Button2 type="primary" icon="sugo-nodeWait" >查看指标模型执行历史（外部反馈）</Button2>
                    </Link>
                  </Auth>
                </div>
                <Auth auth="post:/app/offline-calc/models">
                  <Link to="/console/offline-calc/models/new" className="fright">
                    <Button type="primary" icon={<PlusOutlined />} >添加指标模型</Button>
                  </Link>
                </Auth>
              </div>
  
              <Table
                rowKey="id"
                bordered
                defaultWeight={5}
                dataSource={filteredModels}
                expandedRowKeys={expandRowKeys}
                columns={this.renderColumns()}
                onExpand={(expanded, record) => {
                  if (expanded) {
                    let temp = _.cloneDeep(expandRowKeys)
                    temp.push(record.id)
                    return this.setState({
                      expandRowKeys: temp
                    })
                  }
                  this.setState({
                    expandRowKeys: expandRowKeys.filter( id => id !== record.id )
                  })
                }}
              />
            </div>
          </div>
        </HorizontalSplitHelper>
      </React.Fragment>
    );
  }
}
