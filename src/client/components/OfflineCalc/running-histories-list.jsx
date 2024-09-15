import React from 'react'
import Bread from '../Common/bread'
import {message, Modal, Table} from 'antd'
import _ from 'lodash'
import {checkPermission} from '../../common/permission-control'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {runningHistoriesSagaModelGenerator} from './saga-model-generators'
import {OfflineCalcModelRunningHistoriesStatusEnum} from '../../../common/constants'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import moment from 'moment'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import SwitchModelPanel from './switch-model-panel'

const namespace = 'offline-calc-running-histories-list'

const canDel = checkPermission('delete:/app/offline-calc/running-histories/:id')

let mapStateToProps = (state, ownProps) => {
  const dimListState = state[namespace] || {}
  const modelsListState = state['switch-model-panel'] || {}
  return {
    ...dimListState,
    offlineCalcModels: modelsListState.offlineCalcModels
  }
}

let durationCompleteFormatter = metricValueFormatterFactory('duration')

@connect(mapStateToProps)
@withRuntimeSagaModel([
  runningHistoriesSagaModelGenerator(namespace)
])
export default class OfflineCalcRunningHistoriesList extends React.Component {
  
  state = {
    selectedModelId: ''
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
      title: '确认删除此执行历史？',
      content: '此操作无法撤销，请谨慎操作',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let {dispatch, offlineCalcRunningHistories} = this.props
        dispatch({
          type: `${namespace}/sync`,
          payload: (offlineCalcRunningHistories || []).filter(ds => ds.id !== preDel),
          forceReload: true,
          callback: cp
        })
      }
    })
    
  }

  renderColumns() {
    let { offlineCalcModels } = this.props
    let modelIdDict = _.keyBy(offlineCalcModels, 'id')
    return [
      {
        title: '执行编号',
        dataIndex: 'executionId',
        key: 'executionId'
      },
      {
        title: '任务名称',
        dataIndex: 'task_name',
        key: 'task_name'
      },
      {
        title: '所属指标模型',
        dataIndex: 'model_id',
        key: 'model_id',
        render: val => {
          const ds = _.get(modelIdDict, val)
          return ds && ds.name || '跨数据源'
        }
      },
      {
        title: '执行器',
        dataIndex: 'runner',
        key: 'runner'
      },
      {
        title: '开始时间',
        dataIndex: 'starts_at',
        key: 'starts_at',
        render: (val) => {
          return moment(val).format('YYYY-MM-DD HH:mm:ss')
        }
      },
      {
        title: '结束时间',
        dataIndex: 'ends_at',
        key: 'ends_at',
        render: (val) => {
          return val && moment(val).format('YYYY-MM-DD HH:mm:ss')
        }
      },
      {
        title: '耗时',
        key: 'duration',
        render: (val, record) => {
          if (!record.ends_at) {
            return ''
          }
          const sDiff = moment(record.ends_at).diff(record.starts_at, 's')
          return durationCompleteFormatter(sDiff)
        }
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (val) => {
          return OfflineCalcModelRunningHistoriesStatusEnum[val]
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        render: (val, record) => {
          return (
            <React.Fragment>
              {!canDel ?  null : (
                <span
                  className="fpointer mg2l color-red"
                  data-id={val}
                  onClick={this.onDeleteClick}
                >删除</span>
              )}
            </React.Fragment>
          )
        }
      }
    ]
  }
  
  render() {
    const {offlineCalcRunningHistories} = this.props
    const { selectedModelId } = this.state
    let filteredHistories = (offlineCalcRunningHistories || []).filter(d => {
      let pickThis = true
      if (selectedModelId) {
        pickThis = pickThis && d.model_id === selectedModelId
      }
      return pickThis
    })
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '指标模型执行历史' }
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
              <SwitchModelPanel
                panelTitle="按指标模型查看"
                selectedModelId={selectedModelId}
                onModelSelected={m => {
                  const modelId = m && m.id || ''
                  this.setState({
                    selectedModelId: modelId
                  })
                  this.props.dispatch({
                    type: `${namespace}/fetch`,
                    payload: {
                      model_id: modelId
                    }
                  })
                }}
              />
            </div>
          </div>
  
          <div
            className="itblock height-100 overscroll-y"
            style={{padding: '10px 10px 10px 5px'}}
            defaultWeight={5}
          >
            <div className="pd3x pd2y bg-white corner height-100">
              <div className="pd2b">
                <div className="height32 itblock">{'\u00a0'}</div>
              </div>
              
              <Table
                bordered
                defaultWeight={5}
                dataSource={filteredHistories}
                columns={this.renderColumns()}
              />
            </div>
          </div>
        </HorizontalSplitHelper>
      </React.Fragment>
    )
  }
}
