/**
 * 开始训练页，根据 hash 的 step 状态来切换子组件，避免刷新后回到第一步
 */

import React from 'react'
import Bread from '../../Common/bread'
import {Steps} from 'antd'
import HoverHelp from '../../Common/hover-help'
import {withHashState} from '../../Common/hash-connector'
import CSVDataImporter from './csv-data-importer'
import TrainingFieldsSetter from './training-fields-setter'
import DoTraining from './do-training'
import {withLossPredictModels} from '../../Fetcher/loss-predict-models-fetcher'
import _ from 'lodash'

const {Step} = Steps


class BeginTraining extends React.Component {
  state = {}

  renderStepBar() {
    let {step} = this.props
    return (
      <div className="height80 relative">
        <Steps className="width-40 center-of-relative" current={step}>
          <Step title="导入文件"/>
          <Step
            title={(
              <HoverHelp
                addonBefore="设置训练字段"
                className="mg1l pd1l"
                content="设置训练字段是设置本次要训练的字段和其他影响它的字段，比如设置目标字段为年龄，那其他的字段就围绕年龄这个字段来变化"
                placement="bottom"
              />
            )}
          />
          <Step title="运行训练数据"/>
        </Steps>
      </div>
    )
  }

  renderStepComponent() {
    let {
      step, updateHashStateByPath, lossPredictModels, reloadLossPredictModels, doTraining,
      updateLossPredictModel, params
    } = this.props

    let {modelId} = params

    let lossPredictModel = lossPredictModels && lossPredictModels[0]

    if (step === 0) {
      return (
        <CSVDataImporter
          style={{height: `calc(100% - ${49 + 50 + 80}px)`}}
          {...{updateHashStateByPath, lossPredictModel,
            updateLossPredictModel, reloadLossPredictModels}}
        />
      )
    } else if (step === 1) {
      return (
        <TrainingFieldsSetter
          style={{height: `calc(100% - ${49 + 50 + 80}px)`}}
          {...{lossPredictModel, updateHashStateByPath, updateLossPredictModel, reloadLossPredictModels}}
        />
      )
    } else if (step === 2) {
      return (
        <DoTraining
          style={{height: `calc(100% - ${49 + 50 + 80}px)`}}
          {...{updateHashStateByPath, doTraining, modelId}}
        />
      )
    }
  }

  render() {
    let { lossPredictModels } = this.props

    let lossPredictModel = lossPredictModels && lossPredictModels[0] || {}
    return (
      <div className="bg-white height-100 loss-predict-theme">
        <Bread
          path={[
            {name: '智能运营', link: '/console/loss-predict'},
            {name: lossPredictModel.name, link: `/console/loss-predict/${lossPredictModel.id}`},
            {name: '开始训练'}
          ]}
        />
        <div className="pd3x bg-grey-f5 font16 height50 line-height50">
          建立训练模型
          <HoverHelp
            placement="bottom"
            className="mg1l pd1l"
            content="训练模型是根据现有的用户数据进行训练，得出一个最优的训练规律"
          />
        </div>
        {this.renderStepBar()}
        {this.renderStepComponent()}
      </div>
    )
  }
}

export default (() => {
  let WithLossPredictModels = withLossPredictModels(BeginTraining, props => ({modelId: props.params.modelId}))
  return withHashState(WithLossPredictModels, undefined, {
    step: 0
  })
})()
