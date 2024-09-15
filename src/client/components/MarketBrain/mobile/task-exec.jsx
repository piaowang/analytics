import React from 'react'
import {browserHistory} from 'react-router'
import { Drawer, Picker } from 'antd-mobile'
import executionsStore from './store/executions'
import {connect} from 'react-redux'
import './style/task-exec.styl'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import { taskExecSagaModelGenerator } from '../store/saga-model-generators'
import * as marketBrainExecutionService from 'client/services/market-brain/executions'
import BottomFix from './bottom-fix'
import _ from 'lodash'
import moment from 'moment'

let mapStateToProps = (state, ownProps) => {
  return {
    ...state.taskExec
  }
}

@connect(mapStateToProps)
@withRuntimeSagaModel(taskExecSagaModelGenerator('taskExec'))
export default class MarketBrainMobileActiveDetail extends React.Component { 
  constructor(props) {
    super(props)
    this.state = {
      showDrawer: false,
      nameOrPhone: '',
      hasDone: '',
      activeName: '',
      timeOrder: ''
    }
  }

  initFilter() {
    this.setState({
      showDrawer: false,
      nameOrPhone: '',
      hasDone: '',
      activeName: '',
      timeOrder: ''
    })
  }

  async share(i) {
    const { marketBrainNeedShare } = window.sugo

    if (!marketBrainNeedShare) {
      if (i.send_result === 1) return
      let con = confirm('是否完成该任务?')
      if (!con) return
      await marketBrainExecutionService.confirmContactUser(i.id)
      await this.props.dispatch({
        type: 'taskExec/fetch'
      })
      return
    }

    try {
      let that = this
      let marketBrainMobileTaskExecShareFunc
      //该操作存在一定安全隐患
      eval(marketBrainNeedShare)
      marketBrainMobileTaskExecShareFunc()

    } catch (e) {
      console.log(e,'分享失败===')
    }
  }

  renderList() {
    const { marketBrainH5TaskExec = [] } = this.props
    const { nameOrPhone, hasDone, timeOrder } = this.state
    let tempList = marketBrainH5TaskExec.filter( i => {
      const { mobile, user_name, send_state } = i
      i.isGen = !i['MarketBrainTaskExecution.usergroup_id']
      let pickThis = true
      if (nameOrPhone) {
        if ((mobile && !(mobile + '').includes(nameOrPhone)) && (user_name && !user_name.includes(nameOrPhone))) pickThis = false
      }
      if (hasDone || hasDone === 0) {
        if (send_state !== hasDone) pickThis = false
      }
      if (nameOrPhone === '全民活动') {
        if (!i.isGen) pickThis = false
      } 
      return pickThis
    })
    if (timeOrder && timeOrder === 'asc') {
      tempList = tempList.sort((a, b) => moment(_.get(a, 'MarketBrainTaskExecution.execute_time')) - moment(_.get(b, 'MarketBrainTaskExecution.execute_time')))
    }
    if (timeOrder && timeOrder === 'desc') {
      tempList = tempList.sort((a, b) => moment(_.get(b, 'MarketBrainTaskExecution.execute_time')) - moment(_.get(a, 'MarketBrainTaskExecution.execute_time')))
    }
    return (
      tempList.map(i => (
        <div className="task-exec-item">
          <div className="task-exec-item-header">
            <span className="username">{i.isGen ? '全民活动' : i.user_name || ''}</span>
            <span className="mobile">{i.isGen ? '' : `手机号: ${i.mobile || ''}`}</span>
          </div>
          <div className="task-exec-item-body">
            <div className="body-left">
              <div className="active-name">
                活动：{_.get(i,'MarketBrainTaskExecution.name')}
              </div>
              <div className="active-exec">
                执行时间：{moment(_.get(i, 'MarketBrainTaskExecution.execute_time')).format('YYYY/MM/DD HH:mm:ss')}
              </div>
            </div>
            <div className="body-right">
              {
                i.send_result === 1
                  ?
                  <div
                    onClick={async () => {
                      await this.share(i)
                    }}
                    className="finished"
                  >
                  已完成
                  </div>
                  :
                  <div 
                    className="unexec"
                    onClick={async () => {
                      await this.share(i)
                    }}
                  >
                  未执行
                  </div>
              }
            </div>
          </div>
        </div>
      ))
    )
  }

  renderDrawer() {
    const { activeName, timeOrder, hasDone } = this.state
    return (
      <div className="task-exec-drawer-filterbox">
        <div className="filter-name">
          <div className="filter-name-title">
            会员姓名或手机号码
          </div>
          <div className="filter-name-input">
            <input 
              placeholder="请输入会员姓名或手机号码"
              onChange={_.throttle((e) => this.setState({nameOrPhone: e.target.value}), 300)}
            />
          </div>
        </div>
        {/* <div className="filter-active">
          <div className="filter-active-title">
            活动名称
          </div>
          <Picker
            data={['a','b','c']}
            onChange={(val) => {
            }}
          >
            <div className="filter-active-select">
              请选择活动名称
            </div>
          </Picker>
        </div> */}
        <div className="filter-time">
          <div className="filter-time-title">时间顺序</div>
          <Picker
            data={[{value: 'desc', label: '降序'}, {value: 'asc', label: '升序'}]}
            onChange={(val) => this.setState({timeOrder: val[0]})}
          >
            <div className="filter-time-input">
              { timeOrder ? (timeOrder === 'asc' ? '升序' : '降序') : '请选择时间顺序'}
            </div>
          </Picker>
          {/* <DatePicker 
            mode='date'
            value={filterDate}
            onChange={(date) => this.setState({ filterDate: date })}
          >
            <div className="filter-time-box">
              <span>{filterDate.getFullYear()}年</span>
              <span>-</span>
              <span>{filterDate.getMonth() + 1}月</span>
              <span>-</span>
              <span>{filterDate.getDate()}日</span>
            </div>
          </DatePicker> */}
        </div>
        <div className="filter-state">
          <div className="filter-state-title">
            执行状态
          </div>
          <div className="filter-state-checkbox">
            <span onClick={() => this.setState({ hasDone: hasDone === 1 ? '': 1 })} className={hasDone === 1 ? 'cur' : null}>已完成</span>
            <span className={hasDone === 0 ? 'cur' : null} onClick={() => this.setState({ hasDone: hasDone === 0 ? '' : 0 })}>未执行</span>
          </div>
        </div>
        <div className="drawer-footer">
          <div onClick={() => { this.initFilter() }} className="cancel">取消</div>
          <div onClick={() => this.setState({showDrawer: false})} className="finish">完成</div>
        </div>
      </div>
    )
  }
  
  render() {
    const { showDrawer } = this.state
    return (
      <div id="market-brain-task-exec">
        <Drawer 
          open={showDrawer}
          position="right"
          enableDragHandle
          style={{ minHeight: document.documentElement.clientHeight }}
          sidebar={this.renderDrawer()}
          onOpenChange={() => this.setState({showDrawer: !showDrawer})}
          sidebarStyle={{
            background: '#ffffff',
            width: '2.65rem',
            height: '100%'
          }}
        >
          <div className="header">
            任务执行
            <div 
              className="filter-icon"
              onClick={(e) => {
                this.setState({showDrawer: !showDrawer})
              }} 
            />
          </div>
          <div className="body">
            {this.renderList()}
          </div>
          <BottomFix actExec={false} execution_id={_.get(this.props, 'params.id', '')} />
        </Drawer>
      </div>
    )
  }
}




