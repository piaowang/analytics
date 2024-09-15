import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import ReactDOM from 'react-dom'
import Velocity from 'velocity-animate'

//* bigNumberTimer 通常无需特别配置 大屏数字动画时间, 默认0.5秒
//* bigNumberDelay 通常无需特别配置 大屏数字动画最小间隔, 默认0.3秒
// const {bigNumberDelay = 300, bigNumberTimer = 500} = window.sugo || config
const bigNumberDelay = 300
const bigNumberTimer = 500
function isDigit(d) {
  return /^\d{1}$/.test(d)
}

/**
 * @description 文字动画组件
 * @export
 * @class AnimateText
 * @extends {React.Component}
 */
export default class AnimateText extends React.Component {

  static propTypes = {
    text: PropTypes.any.isRequired,
    animteTime: PropTypes.number,
    realText: PropTypes.string,
    delay: PropTypes.number,
    forceAnimate: PropTypes.bool
  }

  static defaultProps = {
    forceAnimate: false,
    delay: 0,
    animteTime: bigNumberTimer + 0
  }

  constructor(props) {
    super(props)
    this.state = {
      nextText: '',
      text: props.text
    }
  }

  componentDidMount() {
    if (this.props.forceAnimate) {
      this.timerLoop = setTimeout(this.loopAnimate, bigNumberDelay)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (
      (nextProps.realText &&
      nextProps.realText !== this.props.realText)
    ) {
      if (nextProps.realText !== this.props.realText) {
        this.setState({
          nextText: nextProps.text
        })
      }
      return
    }
    if (nextProps.text !== this.props.text) {
      this.setState({
        nextText: nextProps.text
      })
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.nextText && prevState.nextText !== this.state.nextText) {
      return this.animate()
    }
    else if (prevState.text) this.endAnimate()
  }

  componentWillUnmount() {
    clearTimeout(this.timer)
    clearTimeout(this.timerLoop)
  }

  // 轮询动画函数
  loopAnimate = () => {
    if (!this.animating) {
      this.setState({
        nextText: this.state.text
      })
    }
    this.timerLoop = setTimeout(
      this.loopAnimate,
      this.props.delay || bigNumberDelay
    )
  }

  // 动画处理函数
  animate = () => {
    let {animteTime, delay} = this.props
    let root = ReactDOM.findDOMNode(this)
    if (!root) return
    let [dom1] = root.childNodes
    if (this.animating) return
    this.animating = true
    let digits = this.getDigits()
    let len = digits.length
    if (len > 1) {
      let len = digits.length
      let h = root.offsetHeight
      dom1.style.height = h * len
    }
    let top = (- len * 100) + '%'
    Velocity(dom1, {
      top
    }, {
      duration: animteTime,
      delay,
      complete: () => {
        try {
          this.animating = false
          let {nextText} = this.state
          if (!nextText) return this.endAnimate()
          this.endAnimate()
          this.setState({
            nextText: '',
            text: nextText
          })
        } catch(e) {
          _.noop()
        }
      }
    })
    dom1 = null
  }

  // 动画结束
  endAnimate = () => {
    let root = ReactDOM.findDOMNode(this)
    if (!root) return
    let [dom1] = root.childNodes || []
    dom1 && dom1.removeAttribute('style')
  }

  // 获取数字
  getDigits = () => {
    let {nextText, text} = this.state
    if (!isDigit(nextText)) {
      return [nextText]
    }
    let prev = isDigit(text) ? parseInt(text, 10) : -1
    let end = parseInt(nextText, 10)
    let arr = []
    let start = (prev + 1) % 10
    for (;start !== end;start = (start + 1) % 10) {
      arr.push(start)
    }
    arr.push(end)
    return arr
  }

  // 渲染下个文本
  renderNextText = () => {
    let {
      nextText,
      text
    } = this.state
    let {
      style = {}
    } = this.props
    let innerStyle = _.pick(style, ['height', 'lineHeight'])
    if (!isDigit(nextText)) {
      return (
        <div className="animate-text-box next-text" style={innerStyle}>{nextText}</div>
      )
    }
    return (
      <div className="animate-text-box next-text" style={innerStyle}>
        {this.getDigits(nextText, text).map(((d, i) => {
          return (
            <div className="animate-digit-box" key={i + 'dt' + d}>{d}</div>
          )
        }))}
      </div>
    )
  }

  render() {
    let {
      text
    } = this.state
    let {
      style = {},
      className = ''
    } = this.props
    let innerStyle = _.pick(style, ['height', 'lineHeight'])
    return (
      <div
        className={`animate-text-wrap ${className}`}
        style={style}
      >
        <div className="animate-text-box" style={innerStyle}>
          <div className="animate-digit-box">{text}</div>
          {this.getDigits().map(((d, i) => {
            return (
              <div className="animate-digit-box" key={i + 'dt' + d}>{d}</div>
            )
          }))}
        </div>
        <div className="animate-text-placeholder">{text}</div>
      </div>
    )
  }
}