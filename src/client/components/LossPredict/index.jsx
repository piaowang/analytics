/**
 * 流失预测模型列表
 */

import React from 'react'
import {
  BulbOutlined,
  CloseCircleOutlined,
  EditOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Table, Popover, Modal, Tooltip, Popconfirm, Input } from 'antd';
import Bread from '../Common/bread'
import { Link } from 'react-router'
import moment from 'moment'
import GuideModal from './guide-modal'
import {withLossPredictModels} from '../Fetcher/loss-predict-models-fetcher'
import _ from 'lodash'
import withAutoFocus from '../Common/auto-focus'
import {checkPermission} from '../../common/permission-control'

const canInspectFileHistories = checkPermission('get:/console/loss-predict/file-histories')
const canCreate = checkPermission('post:/app/loss-predict/models')
const canEdit = checkPermission('put:/app/loss-predict/models/:modelId')
const canDelete = checkPermission('delete:/app/loss-predict/models/:modelId')
const canInspectPredictHistories = checkPermission('get:/console/loss-predict/:modelId/predictions')

const InputWithAutoFocus = withAutoFocus(Input, undefined, undefined, 300)

const FormItem = Form.Item

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 }
}

class LossPredict extends React.Component {

  state = {
    guideVisible: false,
    modelIdForNameCreatingModal: null,
    modelIdForNameEditingModal: null,
    nextModelName: undefined
  }

  updateNextModelName = e => this.setState({ nextModelName: e.target.value })

  renderActionRowContent = (id, record) => {
    let {deleteLossPredictModel, updateLossPredictModel, reloadLossPredictModels} = this.props
    const { nextModelName, modelIdForNameEditingModal } = this.state
    return (
      <div>
        {!canEdit ? null : (
          <Tooltip title="编辑">
            <Popover
              title="编辑流失预测名称"
              visible={modelIdForNameEditingModal === id}
              onVisibleChange={visible => {
                this.setState({
                  modelIdForNameEditingModal: visible ? id : null,
                  nextModelName: visible ? record.name : undefined
                })
              }}
              content={
                [
                  <InputWithAutoFocus
                    key="input"
                    value={nextModelName}
                    onChange={this.updateNextModelName}
                  />,
                  <div key="buttons" className="mg2t ant-popover-buttons">
                    <Button
                      size="small"
                      onClick={() => this.setState({modelIdForNameEditingModal: null})}
                    >取消</Button>
                    <Button
                      type="primary"
                      size="small"
                      onClick={async () => {
                        let res = await updateLossPredictModel({id, name: nextModelName})
                        if (res) {
                          await reloadLossPredictModels()
                          this.setState({modelIdForNameEditingModal: null})
                        }
                      }}
                    >确定</Button>
                  </div>
                ]
              }
              trigger="click"
            >
              <EditOutlined className="pointer" />
            </Popover>
          </Tooltip>
        )}

        {!canDelete ? null : (
          <Popconfirm
            title={(
              <div>
                确认删除 {record.name} ？
                <br/>
                <span className="color-red">相关的预测结果也会同时删除</span>
              </div>
            )}
            onConfirm={async () => {
              await deleteLossPredictModel(id)
              await reloadLossPredictModels()
            }}
          >
            <CloseCircleOutlined className="mg2x pointer" />
          </Popconfirm>
        )}

        {canEdit || canDelete ? '|' : null}

        <Link className="mg1x" to={{ pathname: `/console/loss-predict/${id}` }}>进入模型</Link>

        {canInspectPredictHistories ? '|' : null}
        {!canInspectPredictHistories ? null : (
          <Link className="mg1x" to={{ pathname: `/console/loss-predict/${id}/predictions` }}>查看历史预测记录</Link>
        )}
      </div>
    );
  }

  createTableColumns() {
    return [
      {
        title: '序号',
        key: 'index',
        dataIndex: 'index',
        className: 'table-col-pd3l'
      }, {
        title: '流失预测分析名称',
        key: 'name',
        dataIndex: 'name'
      }, {
        title: '创建时间',
        key: 'created_at',
        dataIndex: 'created_at',
        render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss')
      }, {
        title: '操作',
        key: 'operation',
        dataIndex: 'id',
        render: this.renderActionRowContent
      }
    ]
  }

  openGuideModal = () => {
    this.setState({
      guideVisible: true
    })
  }

  closeGuideModal = () => {
    this.setState({
      guideVisible: false
    })
  }

  onCreateNewModelConfirm = async () => {
    const {createLossPredictModel, reloadLossPredictModels} = this.props
    let {nextModelName} = this.state
    let res = await createLossPredictModel({name: nextModelName})
    if (res) {
      await reloadLossPredictModels()
      this.setState({modelIdForNameCreatingModal: null})
    }
  }

  renderNameEditingModal = () => {
    const {lossPredictModels} = this.props
    let {modelIdForNameCreatingModal, nextModelName} = this.state

    let targetModel = modelIdForNameCreatingModal && modelIdForNameCreatingModal !== 'new'
      ? _.find(lossPredictModels, m => m.id === modelIdForNameCreatingModal)
      : null
    return (
      <Modal
        visible={!!modelIdForNameCreatingModal}
        onCancel={() => this.setState({modelIdForNameCreatingModal: null})}
        title={'新建流失预测分析'}
        footer={[
          <Button
            key="back"
            size="large"
            onClick={() => this.setState({modelIdForNameCreatingModal: null})}
          >取消</Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            disabled={!nextModelName}
            onClick={this.onCreateNewModelConfirm}
          >确认</Button>
        ]}
      >
        <Form>
          <FormItem
            {...formItemLayout}
            label="流失预测分析名称"
          >
            <InputWithAutoFocus
              value={nextModelName === undefined ? (targetModel && targetModel.name || '') : nextModelName}
              onChange={this.updateNextModelName}
              onPressEnter={this.onCreateNewModelConfirm}
            />
          </FormItem>
        </Form>
      </Modal>
    )
  }

  render() {
    const { isFetchingLossPredictModels, lossPredictModels } = this.props
    const { guideVisible } = this.state
    const tableColumns = this.createTableColumns()

    let lossPredictModelsWithIndex = lossPredictModels.map((lpm, idx) => ({...lpm, index: idx + 1}))
    return (
      <div className="height-100 bg-white loss-predict-theme">
        <Bread path={[{name: '流失预测'}]}
          extra={
            <span className="mg1l pointer">
              <Popover
                placement="right"
                title="流失预测分析说明"
                content={
                  (
                    <div className="mw300">
                      <p>流失预测分析：也叫做用户流失预测分析，指的是通过以往的用户数据，
                        分析出一个描述用户流失情况的规律，从而以后的新的用户数据可以根据
                        这个描述用户流失情况的规律（也叫做用户流失预警模型），来预测新的
                        用户的流失情况，从而指导企业根据预测的流失情况来调整运营策略，提
                        高新用户的留存率。</p>
                      <div className="aligncenter mg2t">
                        <Button
                          type="primary"
                          onClick={this.openGuideModal}
                        >查看流失预测详细教程</Button>
                      </div>
                    </div>
                  )
                }
              >
                <QuestionCircleOutlined />
              </Popover>
            </span>
          }
        />

        <div className="pd2b pd3x height80 line-height80">
          <span>流失预测分析表</span>
          <div className="fright">
            {!canCreate ? null : (
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                onClick={() => this.setState({modelIdForNameCreatingModal: 'new', nextModelName: undefined})}
              >新建流失预测</Button>
            )}

            {!canInspectFileHistories ? null : (
              <Link to={{ pathname: '/console/loss-predict/file-histories' }}>
                <Button className="mg2l" type="success">历史文件记录</Button>
              </Link>
            )}

            <Button
              type="primary"
              className="mg2l"
              icon={<BulbOutlined />}
              onClick={this.openGuideModal}
            >查看向导</Button>
          </div>
        </div>

        <div className="pd3t bordert dashed">
          <Table
            loading={isFetchingLossPredictModels}
            bordered
            size="small"
            rowKey="id"
            columns={tableColumns}
            dataSource={lossPredictModelsWithIndex}
          />
        </div>

        <GuideModal
          visible={guideVisible}
          onCancel={this.closeGuideModal}
        />

        {this.renderNameEditingModal()}
      </div>
    );
  }
}


export default (()=>{
  return withLossPredictModels(LossPredict)
})()

