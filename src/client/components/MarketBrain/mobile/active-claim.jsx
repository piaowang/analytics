import React from 'react'
import {browserHistory} from 'react-router'
import { Button } from 'antd-mobile'
// import moment from 'moment'
// import { connect } from 'react-redux'
import executionsStore from './store/executions'
import {connect} from 'react-redux'
import './style/active-claim.styl'
import _ from 'lodash'
import moment from 'moment'
import * as marketBrainExecutionService from 'client/services/market-brain/executions'
import BottomFix from './bottom-fix'

let mapStateToProps = (state, ownProps) => {
  return {
    ...state.marketBrainH5Executions
  }
}

@connect(mapStateToProps)
export default class MarketBrainMobileActiveClaim extends React.Component { 
  constructor(props) {
    super(props)
    const { executionList } = props
    this.nsArr = []
    if (!executionList) { 
      window.store.register(executionsStore)
      this.nsArr = [executionsStore]
    }
  }

  componentDidMount() {
    this.props.dispatch({
      type: 'marketBrainH5Executions/list'
    })
  }

  componentWillUnmount() {
    if (this.nsArr.length) {
      this.nsArr.forEach(ns => {
        window.store.dump(ns)
      })
    }
  }

  async handleClaim(item) {
    let staff_id = _.get(window, 'sugo.jwtData.others.staff_id', window.sugo.user.id)
    let { who_claim = '' } = item
    if (!_.get(who_claim, 'split')) { 
      who_claim = ''
    }
    who_claim = who_claim.split(',')
    if (who_claim.includes(staff_id)) return browserHistory.push(`/market-brain/claim-customer/${item.id}?title=${_.get(item,'name')}`)
    const { success } = await marketBrainExecutionService.claimExecution(item.id, staff_id)
    if (success) browserHistory.push(`/market-brain/claim-customer/${item.id}?title=${_.get(item,'name')}`)
  }

  async handleClaimGenAct(item) {
    let staff_id = _.get(window, 'sugo.jwtData.others.staff_id', window.sugo.user.id)
    const { success } = await marketBrainExecutionService.claimExecution(item.id, staff_id,  true)
    if (success) browserHistory.push(`/market-brain/task-exec/${item.id}`)
  }

  renderTaskListItem(item) {
    //普发活动 没有用户群的 此处简单认为没有拿到人即普发
    let staff_id = _.get(window, 'sugo.jwtData.others.staff_id', window.sugo.user.id)
    const { jwt_company_id = '', jwt_store_id = '' } = _.get(window, 'sugo.jwtData.others', {})
    staff_id = jwt_company_id + jwt_store_id + staff_id
    const isGeneralAct = !item.usergroup_id || item.usergroup_id === 'empty'
    const emptyUser = item.predict_total === 0 || item.predict_total === item.actual_total
    let { who_claim = '' } = item
    if (!_.get(who_claim, 'split')) { 
      who_claim = ''
    }
    who_claim = who_claim.split(',')
    return (
      <div className="task-item" onClick={(e) => {
        if (e.target.tagName === 'SPAN') return
        if (item.id) browserHistory.push(`/market-brain/active-detail/${item.id}`)
        return
      }}
      >
        <div className="task-item-left">
          <div className="item-header">
            <span className="item-header-icon"/> {_.get(item,'name')} {!isGeneralAct || item.usergroup_id === 'empty' ? '' : '(全民活动)'}
          </div>
          <div className="remain">
            {
              isGeneralAct ? null
                : `剩${item.predict_total - item.userCount}人可领`
            }
          </div>
          <div className="total">
            {
              isGeneralAct ? null
                : `活动总认领会员${item.predict_total}，剩${item.predict_total - item.userCount}人。`
            }
          </div>
          {
            item.id ?
              <div className="execute-at">
              执行时间: {moment(item.execute_time).format('YYYY/MM/DD HH:mm:ss')}
              </div>
              : null
          }
        </div>
        <div className="task-item-right">
          {
            isGeneralAct ? who_claim.includes(staff_id) || item.usergroup_id === 'empty' ? null : <Button 
              className="task-item-button"
              onClick={() => this.handleClaimGenAct(item)}
            >{'认领'}</Button>  :
              !item.id ? null 
                : !emptyUser ? <Button 
                  className="task-item-button"
                  onClick={() => this.handleClaim(item)}
                               >{who_claim.includes(staff_id) ? '再次认领' : '认领'}</Button> 
                  : null
          }
        </div>
      </div>
    )
  }

  render() {
    const { executionList = [] } = this.props
    let tempList = executionList
    if (!tempList.length) tempList.push({name: '暂时没有活动', predict_total: 0, actual_total: 0, usergroup_id: 'empty'})
    return (
      <div id="market-brain-active-claim">
        <div className="outer">
          <div className="header" />
          <div className="body">
            <div className="ul">
              {
                tempList.map( i => (
                  this.renderTaskListItem(i)
                ))
              }
            </div>
          </div>
        </div>
        <BottomFix 
          isActiveClaim
        />
      </div>
    )
  }
}




