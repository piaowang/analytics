import React from 'react'
import {Slider} from 'antd'

const maxSlide = 10000

export default class PathAnalysisScrollBar extends React.Component {

  state = {
    value: 0,
    shouldUpdate: true
  }

  componentDidMount() {
    this.setAttr()
  }

  componentWillReceiveProps() {
    this.shouldUpdate = true
  }

  componentDidUpdate() {
    this.setAttr()
  }

  shouldUpdate = true

  setAttr = () => {
    if (!this.shouldUpdate) return
    let value = this.getValue()
    this.setState({value})
    this.shouldUpdate = false
  }

  getScrollMax = () => {
    let w = window.innerWidth
    let inner = document.getElementById('path-tree-wrapper')
    let sideDom = document.querySelector('.contain-docs-nav')
    let ws = sideDom?.clientWidth
    let width = w - ws - 32 * 2
    let innerWidth = inner?.clientWidth
    let scrollMax = innerWidth - width
    return scrollMax
  }

  onSlide = value => {
    let scrollMax = this.getScrollMax()
    let dom = document.getElementById('path-tree-box')
    this.shouldUpdate = true
    this.setState({value})
    dom.scrollLeft = value * scrollMax / maxSlide
  }

  getValue = () => {
    let scrollMax = this.getScrollMax()
    if (scrollMax <= 0) return -1
    let scroll = document.getElementById('path-tree-box').scrollLeft
    return scroll * maxSlide / scrollMax
  }

  render () {

    let {value} = this.state
    let cls = `pa-scroll-bar-box ${value >= 0 ? '' : 'hide'}`
    let props = {
      min: 0,
      max: maxSlide,
      onChange: this.onSlide,
      value,
      tipFormatter: () => '横向滚动'
    }

    return (
      <div className={cls}>
        <Slider
          {...props}
        />
      </div>
    )
  }
}
