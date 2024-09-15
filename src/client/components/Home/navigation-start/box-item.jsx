import React, {Component} from 'react'
import Icon from '../../Common/sugo-icon'
import {browserHistory} from 'react-router'
import _ from 'lodash'

class NavigationBoxItem extends Component {

  constructor(props) {
    super(props)
    this.state = {  }
  }

  jump(path) {
    const { openWay, title } = this.props
    if (openWay === 'innerTab' && !_.startsWith(path, 'http')) {
  
      browserHistory.push({
        pathname: path,
        query: {
          headTitle: ` / ${title}`
        }
      })
      return
    }
    window.open(path)
    // return window.location.href = path
  }

  renderLiveScreenStartPageNavItem() {
    const { img, title, path, icon } = this.props
    let that = this
    function renderEmpry() {
      return (
        <div
          style={{
            paddingTop: '44px',
            textAlign: 'center',
            backgroundColor: '#22366B',
            color: '#FFFFFF',
            border: '1px dashed #8D9BB9'
          }}
          onClick={() => that.jump(path)}
          className="fpointer height-100"
        >
          <div style={{fontSize: '28px', marginBottom: '32px'}}>
            <Icon style={{fontSize: '28px'}} type={icon}/>
          </div>
          {title}
        </div>
      )
    }

    return (
      <div>
        <div 
          className="item-box mg2t"
          style={{position: 'relative',width: '290px', height: '164px' 
          }}
        >
          {
            img
              ? (
                <React.Fragment>
                  <img className="width-100 height-100 fpointer" src={img} onClick={() => this.jump(path)} />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      width: '290px',
                      height: '40px',
                      lineHeight: '40px',
                      fontSize: '14px',
                      fontWeight: '500',
                      textIndent: '20px',
                      color: '#FFFFFF'
                    }}
                    className="fpointer item-word"
                    onClick={() => this.jump(path)}
                  >
                    {title}
                  </div>
                </React.Fragment>
              )
              : renderEmpry()
          }
        </div>
      </div>
    )
  }

  renderApplicationStartPageNavItem() {
    const { title, path, iconPng, iconHoverPng, bgPng, subTitle, subTitleStyle, appsFontColor } = this.props
    return (
      <div>
        <div
          className="item-box hover-display-trigger"
          style={{ 
            overflow: 'hidden', position: 'relative', width: '290px', height: '164px', 
            background: `transparent url(${bgPng}) no-repeat`,
            backgroundSize:'290px 164px'
          }}
        >
          <div style={{
            color: '#FFFFFF',
            borderRadius: '10px',
            paddingLeft: '30px',
            paddingTop: '32px',
            display: 'relative'
          }} onClick={() => path ? this.jump(path) : null} className={subTitle === '暂未开放' ? 'disabled height-100' : 'fpointer height-100'}
          >
            <div style={{ fontSize: '18px', color: appsFontColor || '#E2EBF4'}}>
              <div 
                style={{
                  marginBottom: '12px'
                }}
              >
                <img
                  src={iconPng}
                  className={`relative ${iconHoverPng && 'hover-hide'}`}
                  style={{left: '-4px', width: 48, height: 48}}
                />
                {iconHoverPng && (
                  <img
                    src={iconHoverPng}
                    className="relative hover-display-iblock"
                    style={{left: '-4px', width: 48, height: 48}}
                  />
                )}
              </div>
              <div 
                className="item-box-name"
              >
                {title}
              </div>
              <div 
                style={{
                  ...subTitleStyle
                }}
              >
                {subTitle}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  render() { 
    let content
    switch (this.props.type) {
      case 'liveScreenStartPageNavItem':
        content = this.renderLiveScreenStartPageNavItem()
        break
      case 'application':
        content = this.renderApplicationStartPageNavItem()
        break
      default:
        content = this.renderLiveScreenStartPageNavItem()
        break
    }
    return (  
      <React.Fragment>
        {content}
      </React.Fragment>
    )
  }
}
 
export default NavigationBoxItem
