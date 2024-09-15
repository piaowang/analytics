import React from 'react'
import {connect} from 'react-redux'
import { Switch } from 'antd'
import { Button } from 'antd-mobile'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import { claimCustomersSagaModelGenerator } from '../store/saga-model-generators'
import * as marketBrainExecutionService from 'client/services/market-brain/executions'
import BottomFix from './bottom-fix'
import './style/claim-customer.styl'
import _ from 'lodash'

let mapStateToProps = (state, ownProps) => {
  return {
    ...state.claimCustomer
  }
}

@connect(mapStateToProps)
@withRuntimeSagaModel(claimCustomersSagaModelGenerator('claimCustomer'))
export default class MarketBrainMobileClaimCustomer extends React.Component { 
  constructor(props) {
    super(props)
    this.state = {
      ownCustomerFilter: false
    }
  }

  async claimHanlder(item) {
    let res = await marketBrainExecutionService.claimCustomer(item.id, _.get(window, 'sugo.jwtData.others.staff_id', window.sugo.user.id))
    await this.props.dispatch({
      type: 'claimCustomer/fetch'
    })
  }

  renderClaimCustomerItem() {
    const { marketBrainH5ClaimCustomer = [] } = this.props
    const { ownCustomerFilter } = this.state
    let customerList = marketBrainH5ClaimCustomer
    let staff_id = _.get(window, 'sugo.jwtData.others.staff_id', window.sugo.user.id)
    if (ownCustomerFilter) customerList = customerList.filter( i => i.account_manager_id === staff_id)
    
    return (
      <div className="customer-list">
        {
          customerList.map(i => (
            <div className="customer-list-item">
              <div className="fleft">
                <div className="surname">
                  {_.get(i,'user_name') ? i.user_name[0] : '无'}
                </div>
              </div>
              <div className="fleft">
                <div className="customer-info">
                  <span style={{ fontSize: '15px', color: '#202020'}}>{i.user_name}</span>
                  <span>{i.mobile}</span>
                  <div>客户经理: {i.account_manager_name}</div>
                </div>
              </div>
              <div className="fright">
                <Button 
                  className="customer-list-item-button"
                  onClick={() => {
                    this.claimHanlder(i)
                  }}
                >认领</Button>
              </div>
            </div>
          ))
        }
      </div>
    )
  }

  render() {
    const { marketBrainH5ClaimCustomer = [] } = this.props
    let content = this.renderClaimCustomerItem()
    if (!marketBrainH5ClaimCustomer) {
      content = (
        <div>空</div>
      )
    }

    let title = _.get(this.props, 'location.query.title', '无标题')
    return (
      <div id="claim-customer">
        <div className="header">
          <div className="top">客户认领</div>
          <div className="bottom">{title}，还可认领{marketBrainH5ClaimCustomer.length}人。</div>
        </div>
        <div className="body">
          <div className="filter-box">
            <div className="fright mg2r">
              <Switch 
                checkedChildren="全部" 
                unCheckedChildren="我的"
                defaultChecked
                onChange={(checked) => this.setState({ownCustomerFilter: !checked})}
              />
            </div>
          </div>
          { content }
        </div>
        <BottomFix 
          execution_id={_.get(marketBrainH5ClaimCustomer, '[0].execute_id', '')}
        />
      </div>
    )
  }
}
