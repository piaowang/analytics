/**
 * 给结果组件添加切换标签，主要是方便以后用于给每个结果组件添加文字描述标签
 * （现在的文字描述是在./index.js里面加的，因为目前要求是多个ioObjects也只展示一个描述，
 * 但每个ioObject都有自己的描述的，所以应该是每个结果组件自己渲染的，之后再优化）
 * constructor里最后调用一下init，传入tabs[]，对应标签的每个结果需要使用resultBody包装一下
 */
import {Radio} from 'antd'
const RadioGroup = Radio.Group
const RadioButton = Radio.Button

export default function(target) {

  target.prototype.init = function(tabs) {
    this.onChangeType = this.onChangeType.bind(this)
    let state = {
      tabs,
      tab: tabs[0]
    }
    this.state = this.state ? Object.assign(this.state, state) : state
  }

  target.prototype.onChangeType = function(e) {
    this.setState({
      tab: e.target.value
    })
  }

  target.prototype.renderTabType = function() {
    let {tab, tabs} = this.state
    return (
      <div className="tabs pd1y">
        <RadioGroup onChange={this.onChangeType} value={tab} className="inline">
          {tabs.map(t => <RadioButton value={t} key={t}>{t}</RadioButton>)}
        </RadioGroup>
      </div>
    )
  }

  target.prototype.resultBody = function(result, tab) {
    let hide = this.state.tab === tab ? '' : 'hide'
    return <div className={hide} key={tab}>{result}</div>
  }
}
