import {sagaSyncModel} from 'client/components/Fetcher/saga-sync'
import FetchFinal from 'client/common/fetch-final'
import _ from 'lodash'
import React from 'react'
import moment from 'moment'
import {Button, message, Modal, Table} from 'antd'
import withRuntimeSagaModel from '~/components/common/runtime-saga-helper'
import {connect} from 'react-redux'
import DataModelingEditor from 'client/components/TaskScheduleManager2/visual-modeling/data-modeling-editor'

export const visualModelingNS = 'visual-modeling'

export const visualModelingListSagaModelGenerator = props => {
  return sagaSyncModel(
    {
      namespace: `${visualModelingNS}-${props.typeId || ''}`,
      modelName: 'visualModels',
      getEffect: async (payload) => {
        let typeId = _.get(payload, 'typeId') || props.typeId
        if (!typeId) {
          return []
        }
        let res = await FetchFinal.get('/app/data-dev/visual-models', {type_id: typeId})
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await FetchFinal.post('/app/data-dev/visual-models', model)
      },
      putEffect: async model => {
        return await FetchFinal.put(`/app/data-dev/visual-models/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await FetchFinal.delete(`/app/data-dev/visual-models/${model.id}`)
      }
    }
  )
}

@connect((state, ownProps) => {
  let runtimeVisualModelingNS = `${visualModelingNS}-${ownProps.typeId || ''}`
  return {
    ..._.get(state, runtimeVisualModelingNS, {}),
    runtimeVisualModelingNS
  }
})
@withRuntimeSagaModel(visualModelingListSagaModelGenerator)
export default class VisualModelingList extends React.Component {
  state = {
    visiblePopoverKey: null
  }
  
  componentDidMount() {
    let {innerRef} = this.props
    if (_.isFunction(innerRef)) {
      innerRef(this)
    }
  }
  
  componentWillUnmount() {
    let {innerRef} = this.props
    if (_.isFunction(innerRef)) {
      innerRef(null)
    }
  }
  
  onEdit = ev => {
    let preMod = ev.target.getAttribute('data-id')
    if (!preMod) {
      return
    }
  
    this.setState({
      visiblePopoverKey: `editor-modal:${preMod}`
    })
  }
  
  onDeleteClick = ev => {
    let preDel = ev.target.getAttribute('data-id')
    if (!preDel) {
      return
    }

    Modal.confirm({
      title: '确认删除此指标？',
      content: '此操作无法撤销，请谨慎操作',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        let {dispatch, visualModels, runtimeVisualModelingNS} = this.props
        dispatch({
          type: `${runtimeVisualModelingNS}/sync`,
          payload: (visualModels || []).filter(ds => ds.id !== preDel),
          forceReload: true,
          callback: (syncRes) => {
            let {resDelete} = syncRes || {}
            let res = _.get(resDelete, '[0].result', '')
            if (res === 1) message.success('删除成功')
          }
        })
      }
    })
  }
  
  render() {
    const { visualModels: listData = [], cataLogTreeInfo, expandedKeys, typeId, runtimeVisualModelingNS } = this.props
    let {visiblePopoverKey} = this.state
    const columns = [
      {
        title: '名称',
        dataIndex: 'name',
        width: 200
      },
      {
        title: '描述',
        dataIndex: 'description',
        width: 200
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        render: (v) => v ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-',
        width: 200
      },
      {
        title: '操作',
        dataIndex: 'id',
        width: 200,
        render: (v, o) => {
          return (
            <React.Fragment>
              <a
                className="pointer"
                data-id={v}
                onClick={this.onEdit}
              >编辑</a>
              <a
                className="mg2l pointer"
                data-id={v}
                onClick={this.onDeleteClick}
              >删除</a>
            </React.Fragment>
          )
        }
      }
    ]
  
    let [vt, modelId] = visiblePopoverKey && visiblePopoverKey.split(':') || []
    const onCancel = () => {
      this.setState({
        visiblePopoverKey: null
      })
    }
    return (
      <React.Fragment>
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={listData}
          bordered
          pagination={{
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
            total: listData.length,
            showSizeChanger: true,
            defaultPageSize: 10
          }}
        />
        {vt === 'editor-modal'
          ? (
            <Modal
              maskClosable={false}
              closable={false}
              title={(
                <div className="alignright">
                  <span className="fleft line-height32">{modelId ? '编辑模型' : '新增模型'}</span>
                  <Button key="back" onClick={onCancel}>取消</Button>
                  <Button
                    key="submit"
                    type="primary"
                    className="mg2l"
                    onClick={ev => {
                      this._editor.onSubmit(ev)
                    }}
                  >保存模型</Button>
                </div>
              )}
              wrapClassName="vertical-center-modal visual-modeling-modal no-body-padding-modal"
              visible={vt === 'editor-modal'}
              onCancel={onCancel}
              footer={null}
              width="90%"
              cancelText="返回"
            >
              <DataModelingEditor
                innerRef={ref => this._editor = ref}
                typeId={typeId}
                runtimeVisualModelingNS={runtimeVisualModelingNS}
                modelId={modelId}
              />
            </Modal>
          )
          : null}
      </React.Fragment>
    )
  }
}
