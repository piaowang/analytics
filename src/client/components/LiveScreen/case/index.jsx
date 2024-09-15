import React, { Component } from 'react'
import Bread from '../../Common/bread'
import { TagOutlined } from '@ant-design/icons'
import { Card, Row, Col } from 'antd'
import { Case_Data } from './constants'
import './css.styl'
import { browserHistory } from 'react-router'

import Rect from '../../Common/react-rectangle'

export default class index extends Component {
  renderContent = (data) => {
    return (
      <div className="case-panel">
        <Row>
          {
            data.map((p, idx) => {
              return (
                <Col key={idx + '-col'} span={6} className="pd2">
                  <div className={'list-item'} onClick={() => browserHistory.push('/console/live-screen-case/' + p.id)}>
                    <div className="font14 mg1b"><TagOutlined className="mg1r" />{p.title}</div>
                    <Rect className="height-100" aspectRatio={p.type === '1' ? 16 / 9 : 9 / 16}>
                      <img src={p.url} />
                    </Rect>
                  </div>
                </Col>
              )
            })
          }
        </Row>
      </div>
    )
  }

  render() {
    const dataLandscape = Case_Data.filter(p => p.type === '1')
    const dataVertical = Case_Data.filter(p => p.type === '2')
    return (
      <div className=""> 
        <Bread path={[{ name: '实时大屏案例' }]} />
        <div className="case-warp pd2 always-display-scrollbar ">
          <Card title={`横屏(${dataLandscape.length}个)`}>
            {this.renderContent(dataLandscape)}
          </Card>
          <Card className="mg2t" title={`竖屏(${dataVertical.length}个)`}>
            {this.renderContent(dataVertical)}
          </Card>
        </div>
      </div>
    )
  }
}
