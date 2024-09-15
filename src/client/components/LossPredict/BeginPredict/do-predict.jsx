import React from 'react'
import { CheckCircleOutlined, LoadingOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import Timer from '../../Common/timer'
import FetchFinal from '../../../common/fetch-final'
import {Link} from 'react-router'

const SubStepEnum = {
  ReadyToPredict: 0,
  Predicting: 1,
  DoneOfPredicting: 2
}

export default class DoTraining extends React.Component {
  state = {
    subStep: SubStepEnum.ReadyToPredict
  }

  doPredict = (record) => {
    let {lossPredictModel} = this.props
    return FetchFinal.post(`/app/loss-predict/models/${lossPredictModel.id}/predictions?saveAfterTest=true`, record)
  }

  renderReadyToPredictStep() {
    let {lossPredictModel, selectedTestFileId, columnsTypeDict, testingFields, csvColumns} = this.props
    return (
      <div className="bordert dashed relative" style={{height: 'calc(100% - 80px)'}}>
        <div className="center-of-relative aligncenter">
          <PlayCircleOutlined
            className="color-light-green pointer font100"
            onClick={async () => {
              this.setState({subStep: SubStepEnum.Predicting})
              let res = await this.doPredict({
                by_model_id: lossPredictModel.id,
                test_file_id: selectedTestFileId,
                test_settings: {
                  columnsTypeDict,
                  csvColumns,
                  testingFields
                }
              })
              if (res) {
                this.setState({subStep: SubStepEnum.DoneOfPredicting, predictionId: res.result.id})
              } else {
                message.error('预测失败，请调整好参数后再试')
                this.setState({subStep: SubStepEnum.ReadyToPredict})
              }
            }} />
          <br/>
          <br/>
          点击按钮，开始运行测试数据
        </div>
      </div>
    );
  }

  renderPredictingStep() {
    return (
      <div className="bordert dashed relative height-100">
        <div className="center-of-relative aligncenter">
          <LoadingOutlined className="color-light-green font100" />
          <br/>
          <br/>
          正在运行测试数据，请耐心等待
        </div>
      </div>
    );
  }

  renderDoneOfPredictingStep() {
    let {updateHashStateByPath, lossPredictModel} = this.props
    let {subStep, predictionId} = this.state
    return (
      <div className="bordert dashed height-100">
        <div className="relative" style={{height: 'calc(100% - 100px)'}}>
          <div className="center-of-relative aligncenter">
            <CheckCircleOutlined className="color-light-green font100" />
            <br/>
            <br/>
            运行成功，请点击查看预测结果
          </div>
        </div>

        <div className="height100 relative bordert dashed">
          <Link to={`/console/loss-predict/${lossPredictModel.id}/predictions`}>
            <Button
              className="vertical-center-of-relative mg3l width150"
            >返回列表</Button>
          </Link>

          <Link to={`/console/loss-predict/${lossPredictModel.id}/predictions/${predictionId}`}>
            <Button
              className="center-of-relative width150"
              type="primary"
            >查看预测结果</Button>
          </Link>
        </div>
      </div>
    );
  }

  renderSubStepContent() {
    let {subStep} = this.state
    switch (subStep) {
      case SubStepEnum.ReadyToPredict:
        return this.renderReadyToPredictStep()
      case SubStepEnum.Predicting:
        return this.renderPredictingStep()
      case SubStepEnum.DoneOfPredicting:
        return this.renderDoneOfPredictingStep()
    }
  }

  render() {
    let {style, updateHashStateByPath} = this.props
    let {subStep} = this.state
    return (
      <div style={style}>
        {subStep === SubStepEnum.ReadyToPredict
          ? (
            <div className="height80 line-height80 bordert dashed pd3l relative">
              温馨提示：点击按钮，即可开始运行测试数据
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
