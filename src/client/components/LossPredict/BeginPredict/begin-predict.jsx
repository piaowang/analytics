/**
 * 开始预测页，根据 hash 的 step 状态来切换子组件，避免刷新后回到第一步，
 * hash 也会保存预测的设置，预测记录在预测成功后才会创建，所以中间变量要保存在 hash 中，避免刷新后丢失
 */

import React from 'react'
import Bread from '../../Common/bread'
import {Steps} from 'antd'
import HoverHelp from '../../Common/hover-help'
import {withHashState} from '../../Common/hash-connector'
import CSVDataImporter from './csv-data-importer'
import TrainingFieldsSetter from './testing-fields-setter'
import DoPredict from './do-predict'
import {withLossPredictModels} from '../../Fetcher/loss-predict-models-fetcher'
import _ from 'lodash'

const {Step} = Steps


class BeginPredict extends React.Component {
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
                addonBefore="设置测试字段"
                className="mg1l pd1l"
                content="设置测试字段是设置本次要测试的字段和其他影响它的字段，比如设置目标字段为年龄，那其他的字段就围绕年龄这个字段来变化"
                placement="bottom"
              />
            )}
          />
          <Step title="运行测试数据"/>
        </Steps>
      </div>
    )
  }

  renderStepComponent() {
    let {step, updateHashStateByPath, lossPredictModels, selectedTestFileId, testingFields } = this.props

    let lossPredictModel = lossPredictModels[0] || {}
    let {csvColumns, columnsTypeDict, trainingFields} = _.get(lossPredictModel, 'training_settings') || {}
    if (step === 0) {
      return (
        <CSVDataImporter
          style={{height: `calc(100% - ${49 + 50 + 80}px)`}}
          {...{updateHashStateByPath, selectedTestFileId, columnsTypeDict, csvColumns, trainingFields}}
        />
      )
    } else if (step === 1) {
      return (
        <TrainingFieldsSetter
          style={{height: `calc(100% - ${49 + 50 + 80}px)`}}
          {...{updateHashStateByPath, columnsTypeDict, testingFields, trainingFields}}
        />
      )
    } else if (step === 2) {
      return (
        <DoPredict
          style={{height: `calc(100% - ${49 + 50 + 80}px)`}}
          {...{updateHashStateByPath, lossPredictModel, selectedTestFileId, columnsTypeDict, testingFields, csvColumns}}
        />
      )
    }
  }

  render() {
    let {step, updateHashStateByPath, lossPredictModels} = this.props

    let lossPredictModel = lossPredictModels[0] || {}
    return (
      <div className="bg-white height-100 loss-predict-theme">
        <Bread
          path={[
            {name: '智能运营', link: '/console/loss-predict'},
            {name: lossPredictModel.name, link: `/console/loss-predict/${lossPredictModel.id}`},
            {name: '开始预测'}
          ]}
        />
        <div className="pd3x bg-grey-f5 font16 height50 line-height50">
          建立测试模型
          <HoverHelp
            placement="bottom"
            className="mg1l pd1l"
            content="测试模型是根据之前训练出来的模型进行测试，得出一个能够预测数据的规律"
          />
        </div>
        {this.renderStepBar()}
        {this.renderStepComponent()}
      </div>
    )
  }
}

export default (() => {
  let WithModel = withLossPredictModels(BeginPredict, props => ({modelId: props.params.modelId}))
  return withHashState(WithModel, undefined, {
    step: 0,
    selectedTestFileId: null,
    testingFields: []
  })
})()
