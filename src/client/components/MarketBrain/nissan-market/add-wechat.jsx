import React from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import { namespace } from './store/executions'
import executionsStore from './store/executions'
import './style/add-wechat.styl'
@connect(state => ({ ...state[namespace], [namespace]: state[namespace] || null  }))
export default class AddWechatComponent extends React.Component {
  constructor(props) {
    super(props)
    if (!props[namespace]) { 
      window.store.register(executionsStore)
    }
  }

  componentDidMount() {
    const urlParams = _.get(this.props, 'location.query', {})
    this.props.dispatch({
      type: `${namespace}/getStaffInfo`,
      payload: {
        userid: urlParams.userid
      }
    })
  }
   render () {
     const { staffInfo={} } = this.props
     return (
       <div id="add-wechat">
         {/* 头像：查不到 */}
          {/* <div className="img"></div> */}
          <div className="info">
            {/* 名称：name */}
            <p className="name">{staffInfo.name || '姓名'}</p>
            {/* 职位：staff_position */}
            <p className="desc">{staffInfo.staff_position || '职位'}</p>
          </div>
          {/* TODO 二维码：staff表的 contact_me 字段 */}
          <div className="qrcode">
            <img src={staffInfo.contact_me} alt=""/>
            <p>长按识别二维码</p>
          </div>
       </div>
     )
   }
 }
 