import React from 'react'
import _ from 'lodash'
import { RollbackOutlined } from '@ant-design/icons'
import {Spin, Tabs, Tooltip, Button} from 'antd'
import MainResultRenders from './result-renders'

const TabPane = Tabs.TabPane
const typesHasResult = [
  'k_means',
  'parallel_decision_tree',
  'random_forest',
  'support_vector_machine',
  'linear_regression',
  'create_association_rules',
  'fp_growth',
  'performance_classification',
  'logistic_regression',
  'apply_model',
  'performance_regression',
  'ffm',
  'performance_binominal_classification'
]
const filter = op => {
  return typesHasResult.includes(op.operatorType)
}

export default class ResultPanel extends React.Component {

  state = {
    visible: false,
    loading: false,
    results: [],
    name: ''
  }

  _results = []

  show = () => {
    this.setState({
      visible: true
    })
  }

  hide = () => {
    this.setState({
      visible: false
    })
  }

  clearData = () => {
    this.setState({
      results: []
    })
  }

  getData = async (name, runed) => {
    
    let {
      process: {
        id,
        rootOperator: {
          execUnits:[{operators}]
        }
      },
      getOperatorResult
    } = this.props
    let ops = operators.filter(name ? o => o.name === name : filter)

    if(runed) this._results = [] //重新运行了，则清空上次运行的结果

    let results = []
    
    this.setState({loading: true})
    for (let op of ops) {
      let {name} = op
      let res = this._results.find(res => res.operator.name === name)
      if(res) { //获取过了
        results.push(res)
      } else {
        let res = await getOperatorResult(id, name)
        if (!res) continue
        res.result.ioObjects = _.get(res, 'result.ioObjects').filter((v)=>v)
        
        if (res?.result?.ioObjects.length) {
          let r = {
            operator: op,
            data: res.result
          }
          results.push(r)
          this._results.push(r)
        }
      }
    }

    this.setState({
      results,
      name,
      loading: false
    })

  }

  renderResult = () => {
    let {results, name} = this.state
    let activeKey = name || results[0].operator.name
    return (
      <Tabs
        activeKey={activeKey}
        onTabClick={name => this.setState({name})}
      >
        {
          results.map((dt) => {
            let {
              operator: {
                fullName,
                description,
                operatorType,
                name
              }
            } = dt

            let tab = (
              <Tooltip
                title={description}
              >
                <span>{fullName}</span>
              </Tooltip>
            )
            return (
              <TabPane
                tab={tab}
                key={name}
              >
                <MainResultRenders modelData={dt} type={operatorType}/>
              </TabPane>
            )
          })
        }
      </Tabs>
    )
  }

  render () {
    let {results, visible, loading} = this.state
    let cls = `pio-results${visible ? '': ' animate-hide'}`
    let res = !results.length
      ? <div className='pd3 aligncenter'>没有数据</div>
      : this.renderResult()
    let {
      process: {
        name
      }
    } = this.props
    return (
      <div className={cls}>
        <Spin spinning={loading}>
          <div className='pd2'>
            <h1 className='pd2b'>
              项目<b>{name}</b>运行结果
              <Button
                type='ghost'
                icon={<RollbackOutlined />}
                size='small'
                className='mg1l'
                onClick={this.hide}
              >
              返回
              </Button>
            </h1>
            {res}
          </div>
        </Spin>
      </div>
    )
  }

}
