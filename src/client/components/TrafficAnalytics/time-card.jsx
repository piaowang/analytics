import React from 'react'
import {Card} from 'antd'
import Timer from '../Common/timer'

export const serviceName = 'trafficAnalytics'

export default class TimeCard extends React.Component {
  state = {
    livePanelReloadCounter: 60
  }

  async componentWillReceiveProps(nextProps) {
    const {socket} = nextProps
    if(socket && !this.socket) {
      this.socket = socket
      let time = await socket.request(serviceName, {
        method: 'getTime'
      })
      this.setState({livePanelReloadCounter: time})
    }
  }
  
  render() {
    let {livePanelReloadCounter} = this.state
    return (
      <Card title="实时概况" className="aligncenter blue-shadow">
        <p><span className="color-red">{livePanelReloadCounter}</span> 秒之后更新数据</p>
        <Timer
          interval={1000}
          onTick={() => {
            if (livePanelReloadCounter === 0) {
              livePanelReloadCounter = 60
            }
            this.setState({livePanelReloadCounter: livePanelReloadCounter - 1})
          }}
        />
      </Card>
    )
  }
}
