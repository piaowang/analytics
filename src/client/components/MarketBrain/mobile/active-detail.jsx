import React from 'react'
import {browserHistory} from 'react-router'
import { Toast } from 'antd-mobile'
import executionsStore from './store/executions'
import {connect} from 'react-redux'
import './style/active-detail.styl'
import _ from 'lodash'
import moment from 'moment'
import BottomFix from './bottom-fix'
import copyTextToClipboard from 'client/common/copy'

let mapStateToProps = (state, ownProps) => {
  return {
    ...state.marketBrainH5Executions
  }
}

@connect(mapStateToProps)
export default class MarketBrainMobileActiveDetail extends React.Component { 
  constructor(props) {
    super(props)
    const { executionList } = props
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
    if (this.nsArr)  this.nsArr.forEach(ns => {
      window.store.dump(ns)
    })
  }

  copyHandler(text) {
    copyTextToClipboard(text, () => Toast.info('复制成功'), () => Toast.info('复制失败') )
  }

  renderContentTitle(title) {
    return (
      <div className="content-title">
        <div className="content-title-word fleft">
          {title}
        </div>
      </div>
    )
  }

  renderContentContent(content) {
    return (
      <div className="content-inner">
        {content}
      </div>
    )
  }

  render() {
    const { executionList = [] } = this.props
    const isWechat = _.get(this.props,'location.query')
    const actId = _.get(this.props, 'params.id', '')
    // if (!actId || !executionList.length) return <div>空</div>
    let staff_id = _.get(window, 'sugo.jwtData.others.staff_id', window.sugo.user.id)
    const target = executionList.find( i => i.id === actId) || {}

    const isGeneralAct = !target.usergroup_id 
    return (
      <div id="market-brain-active-detail">
        <div className="header">
          任务详情
          <div className="title">{_.get(target, 'name', '').length < 10 ? target.name : target.name.substr(0,10) + '...'}</div>
        </div>
        <div className="contain">
          <div className="body">
            <div className="inner-body">
              <div className="relate-models">
                {this.renderContentTitle('所属模型&场景   ')}
                {this.renderContentContent(target.scene_model_name)}
              </div>
              {
                target.usergroup_comment
                  ? <div className="usergroup">
                    {this.renderContentTitle('用户群')}
                    {this.renderContentContent(target.usergroup_comment)}
                  </div>
                  : null
              }
              <div className="execute-time">
                {this.renderContentTitle('执行时间')}
                {this.renderContentContent(moment(target.execute_time).format('YYYY/MM/DD HH:mm:ss'))}
              </div>
              <div className="execute-time">
                {this.renderContentTitle('触达方式')}
                {this.renderContentContent(target.touch_up_way === 1 ? '人工触达' : '自动触达')}
              </div>
              <div className="send-channel">
                {this.renderContentTitle('发送渠道')}
                {this.renderContentContent(target.send_channel === 0 ? '短信' : target.send_channel === 1 ? '手机' : '微信')}
              </div>
              <div className="act-content">
                {this.renderContentTitle('活动文案')}
                {this.renderContentContent((
                  <React.Fragment>
                    {target.content}
                    <div onClick={() => this.copyHandler(target.content)} className="content-inner-copy-button">复制文案</div>
                  </React.Fragment>
                ))}
              </div>
              {
                target.url  ?
                  <div className="act-content">
                    {this.renderContentTitle('活动链接')}
                    {this.renderContentContent((
                      <React.Fragment>
                        {target.url .includes('?') ? target.url + '&sceneid=' + staff_id : target.url + '?sceneid=' + staff_id}
                        <div onClick={() => this.copyHandler(target.url .includes('?') ? target.url + '&sceneid=' + staff_id : target.url + '?sceneid=' + staff_id)} className="content-inner-copy-button">复制链接</div>
                      </React.Fragment>
                    ))}
                  </div>: null
              }
            </div>
          </div>
          {
            isGeneralAct ? null
              : <div onClick={() => browserHistory.push(`/market-brain/claim-customer/${target.id}?title=${_.get(target,'name')}`)} className="claim">认领/再次认领</div>
          }
          <div style={{width: '100%', height: '20px'}} />
        </div>
        <BottomFix 
          execution_id={target.id}
          actExec={!isGeneralAct}
          isWechat={isWechat}
        />
      </div>
    )
  }
}




