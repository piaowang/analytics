import React from 'react'
import IFrame from './IframeBox'


export default class Czbbb extends React.Component {

  componentDidMount() {
    window.addEventListener('resize', this.onWindowResize)
    this.onWindowResize()
  }

  
  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize)
  }

  onWindowResize = () => {
    const { screen_width = 1704, screen_height = 960 } = window.sugo.czbbb
    const { clientWidth, clientHeight } = document.documentElement
    // const { width, height } = window.screen
    const body = document.body
    if (body) {
      const style = {
        // transform: `scale(${clientWidth / screen_width}, ${clientHeight / screen_height})`,
        // 'transform-origin': 'left top 0px',
        // background: 'url("/static/images/livefeed-template-bg.jpg") 0% 0% / 100% 100%',
        width: `${clientWidth}px`,
        height: `${clientHeight}px`,
        overflow: 'hidden'
      }
      Object.assign(body.style, style)
    }
  }

  render() {
    const { czbbb } = window.sugo
    const { left, top, width, height, iframeUrl } = czbbb

    const { clientWidth, clientHeight } = document.documentElement

    const comStyle = {
      left,
      top,
      width: '100%',
      height: '100%'
    }

    const wraperStyle = {
      width: '100%',
      height: '100%'
    }
    return (
      <div className="screen-layout" style={wraperStyle}>
        <div className="-screen-com" style={comStyle}>
          <div className="-screen-wraper" style={wraperStyle}>
            <IFrame settings={{iframeUrl: `${location.origin}${iframeUrl}`}}/>
          </div>
        </div>
      </div>
    )
  }
}

