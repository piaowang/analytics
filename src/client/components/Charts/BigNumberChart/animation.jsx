import React from 'react'
import PropTypes from 'prop-types'
import AnimateText from './animate-text'
import _ from 'lodash'
import config from 'config'
import PubSub from 'pubsub-js'

//* bigNumberDelay 通常无需特别配置 大屏数字动画最小间隔, 默认0.45秒
// 最大延迟限制
const { bigNumberDelay = 300, getApiDataTimer } = window.sugo || config
// 最大长度
const maxLength = 7

class BigNumber extends React.Component {

  // 组件属性类型定义
  static propTypes = {
    number: PropTypes.any,
    width: PropTypes.number,
    height: PropTypes.number,
    timerType: PropTypes.string,
    minLength: PropTypes.number,
    animate: PropTypes.bool,
    prevNumber: PropTypes.number,
    blockMargin: PropTypes.number
  }

  // 默认组件属性定义
  static defaultProps = {
    number: '',
    minLength: 6,
    animate: true,
    timerType: 'getSaleDataTimer',
    height: 85,
    blockMargin: 12,
    width: 865,
    fillText: ' ' // 最小位数填充文本
  }

  constructor(props) {
    super(props)
    this.state = this.compute(props)
  }

  componentWillReceiveProps(nextProps) {
    let {number: prevN, prevNumber} = this.props
    let {number} = nextProps
    if (prevN !== number && number) {
      this.loopNumber(number, prevNumber || prevN, nextProps)
    }
  }

  componentWillUnmount() {
    clearTimeout(this.timer)
  }

  // 定时器
  timer = null

  // 设置number属性
  setNumber = (number) => {
    let props = {
      ...this.props,
      number
    }
    // 总金额变化通知更新饼图分布比例
    PubSub.publish('getBigNumberRatio', { totalSales: number })
    this.setState({
      ...this.compute(props)
    })
  }

  // 数字轮询处理
  loopNumber = (nextN, currentN, props) => {
    let next = nextN
    let tN = this.state.number
    if (!currentN || next < tN || !props.animate) {
      return this.setNumber(next)
    } else if (currentN > this.state.number) {
      tN = currentN
      this.setNumber(currentN)
    }
    let realSep = bigNumberDelay
    let all = getApiDataTimer
    let maxAction = all / realSep
    let diffAll = next - tN
    let delay = bigNumberDelay + 0
    let diff = 1
    if (Math.abs(diffAll) <= maxAction) {
      delay = all / diffAll
    } else {
      diff = diffAll / maxAction
    }
    this.diff = diff
    this.delay = delay
    this.roundAll = diffAll / diff
    this.round = 0
    clearTimeout(this.timer)
    this.timer = setTimeout(
      this.loop,
      this.delay
    )
  }

  // 轮询函数
  loop = () => {
    let {number} = this.state
    let next = number + (this.diff || 0)
    this.round ++
    if (this.round > this.roundAll) {
      return clearTimeout(this.timer)
    }
    this.setNumber(next)
    this.timer = setTimeout(
      this.loop,
      this.delay
    )
  }

  // 计算函数处理
  compute = (props) => {
    let {
      number,
      blockMargin,
      width,
      minLength,
      fillText = ' '
    } = props
    let numbers = Math.floor(number).toString().split('')
    let len = numbers.length
    if (len < minLength) {
      for (let i = 0, ll = minLength - len; i < ll; i ++) {
        numbers.unshift(fillText)
      }
    }
    len = numbers.length
    let blockWidth = (width - blockMargin * (len - 1)) / len
    return {
      blockWidth,
      number,
      numbers
    }
  }

  // 组件渲染入口
  render() {
    let {
      blockWidth,
      numbers
    } = this.state
    let {
      className = '',
      height,
      blockMargin
    } = this.props
    let len = numbers.length
    let textStyle = {
      marginRight: len > maxLength ? blockMargin * 0.5 : blockMargin,
      width: blockWidth,
      fontWeight: 'bold',
      lineHeight: '98%',
      fontSize: height * 0.8
    }

    let extraCls = len > maxLength ? 'numbers-max' : ''
    let wanUnitIdx, yiUnitIdx
    if (len >= 5) { // 万单位处理
      wanUnitIdx = len - 5
    }
    if (len >= 9) { // 亿单位处理
      yiUnitIdx = len - 9
    }
    return (
      <div
        className={`numbers-wrap ${className} ${extraCls}`}
      >
        {
          numbers.map((num, index) => {
            let st = _.cloneDeep(textStyle)
            //let forceAnimate = false
            if (index === len - 1) {
              st.marginRight = 0
              //forceAnimate = true
            }
            return (
              <React.Fragment key={'num-item-' + index}>
                <div
                  className="number-wrap"
                  style={st} key={`antimate-text-${len - index}`}
                >
                  <AnimateText
                    text={num}
                  />
                </div>

                {wanUnitIdx !== void 0 && wanUnitIdx === index ? <span className="unit">万</span> : ''}
                {yiUnitIdx !== void 0 && yiUnitIdx === index ? <span className="unit">亿</span> : ''}
              </React.Fragment>
            )
          })
        }
      </div>
    )
  }
}

export default class Number extends React.Component {
  static propTypes = {
    style: PropTypes.object,
    isLoading: PropTypes.bool,
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    translationDict: PropTypes.object,
    metricsFormatDict: PropTypes.object,
    data: PropTypes.array,
    isThumbnail: PropTypes.bool
  }

  static defaultProps = {
    metricsFormatDict: {}
  }

  state = {
    nowData: 0,
    slideIndex: 1
  }

  componentDidUpdate(preProps) {
    const { data, metrics} = preProps
    if (!_.isEqual(this.props.data, data)){
      this.setState({nowData: this.props.data[0][metrics[0]]})
    }
  }

  render() {
    let {data, metrics, style, translationDict, metricsFormatDict, isThumbnail, option, spWidth, numberSpanOverWrite, className, ...rest} = this.props

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} style={style} className={className} {...rest} />
    }

    return (
      <BigNumber
        number={this.state.nowData || this.props.data[0][metrics[0]]}
        width={47}
        className="pd-big"
        minLength={9}
        animate
        fillText={0}
        timerType="getConsultDataTimer"
      />
    )
  }
 
}
