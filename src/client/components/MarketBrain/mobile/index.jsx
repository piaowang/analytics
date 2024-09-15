import React from 'react'
import { Provider, browserHistory } from 'react-router'

// import { Button, Select, Row, Col, Table, Divider, Input, Form, Popconfirm, Modal, Tooltip, Icon, DatePicker } from 'antd'
// import moment from 'moment'
// import { connect } from 'react-redux'
import _ from 'lodash'

export default class MarketBrainMobileEntry extends React.Component { 

  componentWillMount() {
    this.checkLogin()
  }

  checkLogin() {
    //TODO
    // if (!window.sugo.user) {
    //   return browserHistory.push('/')
    // } else if (
    //   this.props.location.pathname === '/console'
    // ) {
    //   browserHistory.replace(firstMenuPath)
    // }
    // browserHistory.replace('/market-brain/active-claim')
  }

  render() {
    return (
      <div id="market-brain">
        {
          this.props.children
        }
      </div>
    )
  }
}




