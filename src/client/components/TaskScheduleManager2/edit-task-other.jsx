import React, { Component } from 'react'
import {TASK_FORM_LAST_SETP, TASK_FORM_SET_HW_STEP, TASK_OPERTION_FORM_TYPE} from './constants'
import {Button, Modal} from 'antd'
import './css.styl'
import PubSub from 'pubsub-js'
import BaseInfo from './form/base-info'
import FlowInfo from './form/flow-info'
import _ from 'lodash'
import ModelInfo, {defaultEditMode} from './visual-modeling/model-info'
import classNames from 'classnames'
import {ContextNameEnum, getContextByName} from 'client/common/context-helper'

export default class TaskEditModal extends Component {
  static contextType = getContextByName(ContextNameEnum.ProjectInfo)
  
  componentDidUpdate(prevProps) {
    const { taskInfo = {} } = this.props
    if (taskInfo.id !== prevProps.taskInfo.id) {
      this.props.changeState({ collectType: _.get(taskInfo, 'metadata.increaseCollectColumn', '') ? 'incremental' : 'full' })
    }
  }

  ok = async () => {
    const { saveTaskInfo, addStep = TASK_OPERTION_FORM_TYPE.addBaseInfo } = this.props
    if (!this._formContent) {
      saveTaskInfo({})
      return
    }
    this._formContent.validateFields((error, values) => {
      if (error) {
        return
      }
      if (
        addStep === TASK_OPERTION_FORM_TYPE.addFlow ||
        addStep === TASK_OPERTION_FORM_TYPE.editTaskInfo ||
        addStep === TASK_OPERTION_FORM_TYPE.editModelInfo
      ) {
        PubSub.publishSync('analytic.onSaveTaskFlow', (data) => {
          saveTaskInfo({ ...values, data })
        })
        return
      }
      saveTaskInfo({ ...values })
    })
  }

  renderEditTaskModal = () => {
    let { taskInfo = {}, showEidtTaskInfo, cancelFn, addStep, changeState } = this.props
    const isLastStep = TASK_FORM_LAST_SETP.includes(addStep)
    const isEditConfig = TASK_FORM_SET_HW_STEP.includes(addStep)
    const width = isEditConfig ? '1100px' : '40%'
    let content = null
    if (addStep === TASK_OPERTION_FORM_TYPE.addBaseInfo) {
      content = <BaseInfo taskInfo={taskInfo} showAllFeilds={false} addStep={addStep} ref={ref => this._formContent = ref} />
    } else if (addStep === TASK_OPERTION_FORM_TYPE.editModelInfo) {
      let {projectList} = this.context
  
      // 可视化建模模式
      const innerForm = _.get(this._formContentForVisualModel, 'props.form')
      const editMode = innerForm && innerForm.getFieldValue('visualModel.params.editMode') || defaultEditMode
      return (
        <Modal
          maskClosable={false}
          closable={false}
          title={(
            <div className="alignright">
              <span className="fleft line-height32">{taskInfo.id ? '编辑任务' : '新增任务'}</span>
              <span
                className="mg2l fleft line-height32"
                ref={ref => {
                  if (this._extraFooterBtnContainer) {
                    return
                  }
                  this._extraFooterBtnContainer = ref
                  this.forceUpdate()
                }}
              />
              <Button key="back" onClick={() => cancelFn()}>取消</Button>
              <Button
                key="submit"
                type="primary"
                className="mg2l"
                onClick={async ev => {
                  if (editMode === 'visualModelingMode') {
                    return this._formContentForVisualModel.onSubmit(ev)
                  }
                  await this._formContentForVisualModel.submitEditModeOnly()
                  return this.ok()
                }}
              >提交任务</Button>
            </div>
          )}
          wrapClassName={classNames('vertical-center-modal visual-modeling-modal', {'no-body-padding-modal': editMode === 'visualModelingMode'})}
          visible={showEidtTaskInfo}
          onCancel={() => cancelFn()}
          footer={null}
          width={editMode === 'visualModelingMode' ? '90%' : width}
        >
          <ModelInfo
            key={taskInfo ? taskInfo.id : 'new'}
            projectList={projectList}
            taskInfo={taskInfo}
            addStep={addStep}
            ref={ref => this._formContent = ref}
            innerRef={ref => this._formContentForVisualModel = ref}
            extraFooterBtnContainer={this._extraFooterBtnContainer}
            onEditModeChange={nextMode => {
              this.forceUpdate()
            }}
          />
        </Modal>
      )
    } else {
      content = <FlowInfo taskInfo={taskInfo} addStep={addStep} ref={ref => this._formContent = ref} />
    }
    return (<Modal
      maskClosable={false}
      title={taskInfo.id ? '编辑任务' : '新增任务'}
      wrapClassName="vertical-center-modal"
      visible={showEidtTaskInfo}
      onCancel={() => cancelFn()}
      footer={
        <div className="alignright">
          <Button key="back" onClick={() => cancelFn()}>
            取消
          </Button>
          <Button key="submit" type="primary" onClick={this.ok}>
            {isLastStep ? '保存' : '下一步'}
          </Button>
        </div>
      }
      width={width}
            >
      {content}
    </Modal>)
  }

  render() {
    return this.renderEditTaskModal()
  }
}
