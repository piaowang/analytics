/*
 * @Author: your name
 * @Date: 2020-05-19 09:55:25
 * @LastEditTime: 2020-06-22 14:34:18
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \sugo-analytics\src\client\components\Common\public-loading.js
 */ 

import { Spin } from 'antd'
import React from 'react'
import ReactDOM from 'react-dom'
export default class Loading{
  constructor(){
    this.node = document.createElement('div')
    this.node.id = 'ctrloading'
    document.body.appendChild(this.node)
    
  }
  show(tip='',zIndex=222){
    this.tip = tip
    this.spinning = true
    this.render(zIndex)
  }
  hide(){
    this.tip = ''
    this.spinning = false
    this.render()
  }
  tip = ''
  spinning = false
  render(zIndex){
    ReactDOM.render(
      <div className="public-loading-box" style={{display:this.spinning ? 'block':'none',zIndex}}>
        <Spin tip={this.tip} spinning={this.spinning}/>
      </div>
      , this.node)
  }
}
