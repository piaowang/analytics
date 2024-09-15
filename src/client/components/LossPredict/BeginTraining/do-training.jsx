import React from 'react'
import { CheckCircleOutlined, LoadingOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import {Link} from 'react-router'

const SubStepEnum = {
  ReadyToTrain: 0,
  Training: 1,
  DoneOfTraining: 2
}

export default class DoTraining extends React.Component {
  state = {
    subStep: SubStepEnum.ReadyToTrain
  }

  renderReadyToTrainStep() {
    let {doTraining, modelId} = this.props
    return (
      <div className="bordert dashed relative" style={{height: 'calc(100% - 80px)'}}>
        <div className="center-of-relative aligncenter">
          <PlayCircleOutlined
            className="color-light-green pointer font100"
            onClick={() => {
              this.setState({subStep: SubStepEnum.Training}, async () => {
                let res = await doTraining(modelId)
                if (res) {
                  this.setState({subStep: SubStepEnum.DoneOfTraining})
                } else {
                  message.error('训练失败，请调整好参数后再试')
                  this.setState({subStep: SubStepEnum.ReadyToTrain})
                }
              })
            }} />
          <br/>
          <br/>
          点击按钮，开始运行训练数据
        </div>
      </div>
    );
  }

  renderTrainingStep() {
    return (
      <div className="bordert dashed relative height-100">
        <div className="center-of-relative aligncenter">
          <LoadingOutlined className="color-light-green font100" />
          <br/>
          <br/>
          正在训练数据，请耐心等待
        </div>
      </div>
    );
  }

  renderDoneOfTrainingStep() {
    let {modelId} = this.props
    return (
      <div className="bordert dashed height-100">
        <div className="relative" style={{height: 'calc(100% - 100px)'}}>
          <div className="center-of-relative aligncenter">
            <CheckCircleOutlined className="color-light-green font100" />
            <br/>
            <br/>
            训练成功，请点击查看预测模型
          </div>
        </div>

        <div className="height100 relative bordert dashed">
          <Link to="/console/loss-predict">
            <Button
              className="vertical-center-of-relative mg3l width150"
            >返回列表</Button>
          </Link>

          <Link to={`/console/loss-predict/${modelId}`}>
            <Button
              className="center-of-relative width150"
              type="primary"
            >查看预测模型</Button>
          </Link>
        </div>
      </div>
    );
  }

  renderSubStepContent() {
    let {subStep} = this.state
    switch (subStep) {
      case SubStepEnum.ReadyToTrain:
        return this.renderReadyToTrainStep()
      case SubStepEnum.Training:
        return this.renderTrainingStep()
      case SubStepEnum.DoneOfTraining:
        return this.renderDoneOfTrainingStep()
    }
  }

  render() {
    let {style, updateHashStateByPath} = this.props
    let {subStep} = this.state
    return (
      <div style={style}>
        {subStep === SubStepEnum.ReadyToTrain
          ? (
            <div className="height80 line-height80 bordert dashed pd3l relative">
              温馨提示：点击按钮，即可开始运行训练数据
              <Button
                className="vertical-center-of-relative right0 mg3r width150"
                type="primary"
                onClick={() => updateHashStateByPath('step', step => step - 1)}
              >返回上一步</Button>
            </div>
          )
          : null}

        {this.renderSubStepContent()}
      </div>
    )
  }
}
