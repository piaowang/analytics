import {Component} from 'react'
import { Card, Alert } from 'antd'

export default class HeatEntry extends Component { 
  render() {
    let token = this.props.params.token || 0
    return (
      <div>
        <Card>
          <div style={{height: 800, width: 500, margin: 'auto', textAlign: 'center'}}>
            <img src={`/app/sdk/qrCode?token=${token}&redirectPage=heat`}/>
            <Alert message={'请扫描二维码进入App进行可视化埋点热图'} type="success"/>
          </div>
        </Card>
      </div>
    )
  }
}

