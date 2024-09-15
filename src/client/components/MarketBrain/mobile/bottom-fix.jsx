import React from 'react'
import {browserHistory} from 'react-router'
import './style/bottom-fix.styl'
import _ from 'lodash'

export default class MarketBrainMobileBottomFix extends React.Component { 
  constructor(props) {
    super(props)
  }

  // renderWechatBotton() {
  //   return (
  //     <div id='market-brain-bottom-fix'>
  //       <div  
  //         className="button act-claim button"
  //         onClick={() => {
  //         }}
  //       >分享</div>
  //     </div>
  //   )
  // }

  render() {
    const { execution_id, actExec = true, isActiveClaim = false, isWechat = false } = this.props

    //需求变更 废弃
    // if (isWechat) return this.renderWechatBotton()
    return (
      <div id="market-brain-bottom-fix">
        {
          isActiveClaim ? null
            : <div  
              className="button act-claim button"
              onClick={() => browserHistory.push('/market-brain/active-claim')}
              >活动认领</div>
        }
        {
          actExec ?
            <div  
              className="button mission-exec" 
              onClick={() => {
                if (isActiveClaim) {
                  return browserHistory.push('/market-brain/task-exec')
                }
                browserHistory.push(`/market-brain/task-exec/${execution_id}`)
              }}
            >{isActiveClaim ? '全部任务执行记录' : '任务执行'}</div> : null
        }
      </div>
    )
  }
}




