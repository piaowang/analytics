import React from 'react'
import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Radio, Tooltip } from 'antd';
import Bread from '../Common/bread'
import {Link} from 'react-router'
import ModelResultEffect from './model-result-effect'
import ModelResultRule from './model-result-rule'
import ModelResultOutput from './model-result-output'
import {withLossPredictModels} from '../Fetcher/loss-predict-models-fetcher'
import _ from 'lodash'
import * as d3 from 'd3'
import {dictBy} from '../../../common/sugo-utils'
import {checkPermission} from '../../common/permission-control'

const canDoPredict = checkPermission('get:/console/loss-predict/:modelId/begin-predict')
const canInspectPredictHistories = checkPermission('get:/console/loss-predict/:modelId/predictions')

let percentFormat = d3.format('.2%')

const RadioButton = Radio.Button
const RadioGroup = Radio.Group

class ModelResult extends React.Component {

  state = {
    currentType: 'effect'
  }

  changeShowType = (e) => {
    this.setState({
      currentType: e.target.value
    })
  }

  renderEmptyHint() {
    let {params, isFetchingLossPredictModels} = this.props
    return (
      <div
        className="bordert dashed relative"
        style={{height: 'calc(100% - 80px - 49px)'}}
      >
        <div
          className="relative"
          style={{height: 'calc(100% - 100px)'}}
        >
          <div className="center-of-relative aligncenter">
            <InfoCircleOutlined className="font100" />
            <br/>
            <br/>
            {isFetchingLossPredictModels ? '加载中...' : '当前没有训练模型，请先上传数据进行训练'}
          </div>
        </div>

        <div className="height100 relative bordert">
          <Link
            className="center-of-relative"
            to={`/console/loss-predict/${params.modelId}/begin-training`}
          >
            <Button type="primary">建立训练模型</Button>
          </Link>
        </div>
      </div>
    );
  }

  extractModelOverview(ioObjects) {
    try {
      let perfomanceVector = _.find(ioObjects || [], obj => obj && obj.dataType === 'performance_vector')
      if (!perfomanceVector) {
        return null
      }
      let averagable = _.find(perfomanceVector.averagable, a => a.name === '精度')
      if (!averagable) {
        return null
      }

      let [[truePos, trueNec], [falsePos, falseNeg]] = averagable.counter

      return {truePos, trueNec, falsePos, falseNeg}
    } catch (e) {
      return null
    }
  }

  extractTreeRoot(ioObjects) {
    let treeModel = _.find(ioObjects, obj => obj && obj.dataType === 'tree_model')
    return treeModel && treeModel.root
  }

  extractMapping(ioObjects) {
    let mappingObj = _.find(ioObjects, obj => obj && obj.dataType === 'mapped_example_set')
    let mappingData = _.get(mappingObj, 'exampleTable.attributes') || []
    return dictBy(mappingData, attr => attr.name, attr => attr.mapping.values)
  }

  renderModelContent() {
    let {params, lossPredictModels} = this.props

    let lossPredictModel = lossPredictModels[0] || {}

    let trainingResult = lossPredictModel.model_info

    let precisionResult = this.extractModelOverview(trainingResult.ioObjects)

    let {truePos, trueNec, falsePos, falseNeg} = precisionResult || {}

    let precision = truePos / (truePos + falsePos)
    let recall = truePos / (truePos + falseNeg)

    const {currentType} = this.state

    let root = this.extractTreeRoot(trainingResult.ioObjects)
    let mapping = this.extractMapping(trainingResult.ioObjects)
    return (
      <div style={{height: 'calc(100% - 80px - 49px)'}}>
        <div className="pd3x pd3t bordert dashed">
          <RadioGroup onChange={this.changeShowType} defaultValue="effect">
            <RadioButton value="effect">模型效果</RadioButton>
            <RadioButton value="rule">规则集</RadioButton>
            <RadioButton value="output">模型输出</RadioButton>
          </RadioGroup>
        </div>

        <div className="mg2y pd3x">
          <span>
            本训练的模型的
            <Tooltip title="预测流失且实际流失 /（预测流失且实际流失 + 预测流失且实际留存）">
              <b className="under-line dashed">精确率</b>
            </Tooltip>
            ：
            {isFinite(precision) ? percentFormat(precision) : '0.00%'}
            ，
            <Tooltip title="预测流失且实际流失 / （预测流失且实际流失 + 预测留存且实际留存）">
              <b className="under-line dashed">召回率</b>
            </Tooltip>
            ：{isFinite(recall) ? percentFormat(recall) : '0.00%'}
            （训练过程中会把训练数据随机分成五份，其中四份用于训练，一份用于模型验证）
          </span>

          {currentType === 'rule'
            ? (
              <Button
                type="success"
                className="fright"
                onClick={() => this._rulesTable.exportCSV()}
              >导出表格数据</Button>
            )
            : null}
        </div>
        <div
          className="pd2t pd3x"
          style={{height: `calc(100% - ${19 + 32 + 61}px)`}}
        >
          {currentType === 'effect'
            ? (
              <ModelResultEffect
                className={currentType === 'effect' ? '' : 'hide'}
                precisionResult={precisionResult}
              />
            )
            : null}
          {currentType === 'rule'
            ? (
              <ModelResultRule
                ref={ref => this._rulesTable = ref}
                className="height-100 overscroll-y"
                root={root}
                mappingDict={mapping}
              />
            )
            : null}
          {currentType === 'output' && root
            ? (
              <ModelResultOutput
                className="height-100"
                root={{root}}
              />
            ) : null}
        </div>
      </div>
    )
  }

  render() {
    let {params, lossPredictModels, isFetchingLossPredictModels} = this.props

    let lossPredictModel = lossPredictModels[0] || {}

    let trainingResult = lossPredictModel.model_info

    return (
      <div className="height-100 bg-white loss-predict-theme2">
        <Bread
          path={[
            {name: '流失预测', link: '/console/loss-predict'},
            {name: lossPredictModel.name}
          ]}
        />
        <div className="pd2b pd3x height80 line-height80">
          <span>模型说明：该模型包含模型输出、模型效果、规则集三块，你可以上传一份和训练数据的字段格式一样的数据表格，使用该模型进行数据预测。</span>
          <div className="fright">
            {!canDoPredict ? null : (
              <Link to={`/console/loss-predict/${params.modelId}/begin-predict`}>
                <Button
                  type="primary"
                  disabled={_.isEmpty(trainingResult)}
                >使用该模型做预测</Button>
              </Link>
            )}

            {!canInspectPredictHistories ? null : (
              <Link to={{pathname: `/console/loss-predict/${lossPredictModel.id}/predictions`}}>
                <Button
                  className="mg2l"
                  type="success"
                  disabled={_.isEmpty(trainingResult)}
                >查看历史预测记录</Button>
              </Link>
            )}
          </div>
        </div>

        {!isFetchingLossPredictModels && !_.isEmpty(trainingResult) ? this.renderModelContent() : this.renderEmptyHint()}
      </div>
    )
  }
}

export default withLossPredictModels(ModelResult, props => ({modelId: props.params.modelId}))
