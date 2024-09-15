import React, { Component } from 'react'
import { TASK_TREE_TYPE, TASK_OPERTION_FORM_TYPE, TASK_FORM_LAST_SETP, TASK_FORM_SET_HW_STEP, TASK_FORM_ADD_STEP } from './constants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Table, Button, Modal, Input, Select, Row, Col, Divider, Tooltip, message } from 'antd';
import './css.styl'
import BaseInfo from './form/base-info'
import CollectInfo from './form/collect-info'
import _ from 'lodash'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import { connect } from 'react-redux'
import dataCollectModel, { namespace } from './store/data-collect-model'
import { validateFieldsAndScrollByForm } from '../../common/decorators'

@withRuntimeSagaModel(dataCollectModel)
@connect(props => props[namespace])
export default class TaskEditModal extends Component {


  changeDataColllectState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  ok = async () => {
    const { saveTaskInfo, addStep, validForm } = this.props
    if (addStep === TASK_OPERTION_FORM_TYPE.addBaseInfo) {
      this._baseFormContent.validateFields((error, values) => {
        if (error) {
          return
        }
        saveTaskInfo({ ...values })
      })
      return
    }
    let dataCollects = []
    let basinfo = {}
    for (let i in validForm) {
      const val = await validateFieldsAndScrollByForm(validForm[i])
      if (!val) {
        this.changeDataColllectState({activeKey: 'dataSetPane_' + i})
        return
      }
      if (i === 'base') {
        basinfo = val
      } else {
        dataCollects.push(val)
      }
    }
    saveTaskInfo({ increaseCollectColumn: '', ...basinfo, dataCollectionInof: dataCollects })
  }

  cancle = () => {
    let { cancelFn, changeState, taskInfo } = this.props
    cancelFn()
  }

  removeDataSet = (id) => {
    let { fileContent, changeState } = this.props
    changeState({ fileContent: fileContent.filter(p => p.id.toString() !== id) })
  }

  addDataSet = (id) => {
    let { fileContent, changeState } = this.props
    changeState({ fileContent: [...fileContent, { id: id }] })
  }

  renderEditTaskModal = () => {
    let { taskInfo = {}, showEidtTaskInfo, addStep, saving, ...res } = this.props
    const isLastStep = TASK_FORM_LAST_SETP.includes(addStep)
    const isEditConfig = TASK_FORM_SET_HW_STEP.includes(addStep)
    let content = null
    if (addStep === TASK_OPERTION_FORM_TYPE.addBaseInfo) {
      content = <BaseInfo taskInfo={taskInfo} addStep={addStep} ref={ref => this._baseFormContent = ref} />
    } else {
      content = (<CollectInfo
        taskInfo={taskInfo}
        addStep={addStep}
        ref={ref => this._collectFormContent = ref}
        addDataSet={this.addDataSet}
        removeDataSet={this.removeDataSet}
        {...res}
        showEidtTaskInfo={showEidtTaskInfo}
      />)
    }
    return (<Modal
      maskClosable={false}
      title={taskInfo.id ? '编辑任务' : '新增任务'}
      wrapClassName="vertical-center-modal"
      visible={showEidtTaskInfo}
      bodyStyle={{ padding: '10px 20px' }}
      onCancel={this.cancle}
      footer={[
        <Button key="back" onClick={this.cancle}>
          取消
        </Button>,
        <Button loading={saving} key="submit" type="primary" onClick={this.ok}>
          {isLastStep ? '保存' : '下一步'}
        </Button>
      ]}
      width={isEditConfig ? '1200px' : '40%'}
    >
      {content}
    </Modal>)
  }

  render() {
    return this.renderEditTaskModal()
  }
}
