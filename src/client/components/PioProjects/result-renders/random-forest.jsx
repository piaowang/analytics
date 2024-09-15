import React from 'react'
import {Radio} from 'antd'
import _ from 'lodash'
import TreeModel from './tree-model-render'
import Desc from './description-render'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const path = 'data.model.baseModels'

export default class RandomForest extends React.Component {

  state = {
    tab: 'tree',
    modelIndex: '0'
  }

  renderDesc = () => {
    let models = _.get(this.props, path, [])
    let {modelIndex} = this.state
    let data = models[modelIndex]
    if (!models.length || !data) {
      return <div>无数据</div>
    }
    let {description} = data
    return <Desc description={description} />
  }

  onChangeType = e => {
    this.setState({
      tab: e.target.value
    })
  }

  onChangeIndex = e => {
    this.setState({
      modelIndex: e.target.value
    })
  }

  renderTabType = () => {
    let {tab} = this.state
    return (
      <div className="tabs pd1y">
        <span className="inline pd1r">展示方式：</span>
        <RadioGroup onChange={this.onChangeType} value={tab} className="inline">
          <RadioButton value="description">文字描述</RadioButton>
          <RadioButton value="tree">决策树</RadioButton>
        </RadioGroup>
      </div>
    )
  }

  renderTree = () => {
    let models = _.get(this.props, path, [])
    let {modelIndex} = this.state
    let data = models[modelIndex]
    if (!models.length || !data) {
      return <div>无数据</div>
    }
    return <TreeModel data={data} />
  }

  renderTabTree = () => {
    let models = _.get(this.props, path, [])
    if (!models.length) return null
    let {modelIndex} = this.state
    return (
      <div className="tabs pd1y">
        <span className="inline">模型: </span>
        <RadioGroup onChange={this.onChangeIndex} value={modelIndex} className="inline">
          {
            models.map((model, i) => {
              return <RadioButton key={'model' + i} value={i + ''}>{i + 1}</RadioButton>
            })
          }
        </RadioGroup>
      </div>
    )
  }

  render () {
    let {tab} = this.state
    return (
      <div>
        {this.renderTabType()}
        {this.renderTabTree()}
        {
          tab === 'tree'
            ? <div className="tree-wrapper">{this.renderTree()}</div>
            : this.renderDesc()
        }
      </div>
    )
  }

}
