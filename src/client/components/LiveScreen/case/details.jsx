import React, { Component } from 'react'
import { LeftOutlined } from '@ant-design/icons';
import { Card, Button } from 'antd';
import Bread from '../../Common/bread'
import { Case_Data } from './constants'
import './css.styl'
import { browserHistory } from 'react-router'
import ImageZoom from 'react-medium-image-zoom'

export default class details extends Component {
  state = {
    displayLeftMenu: false
  }
  render() {
    const { id } = this.props.params
    const data = Case_Data.find(p => p.id === id)
    return (
      <div>
        <Bread path={[{ name: '实时大屏案例', link: '/console/live-screen-case' }, { name: data.title }]} >
          <Button onClick={() => browserHistory.push('/console/live-screen-case')} icon={<LeftOutlined />}>返回</Button>
        </Bread>
        <div className="case-dtl-list always-display-scrollbar relative">
          <div className="pd2t pd2l color-white">共{Case_Data.length}个大屏</div>
          {
            Case_Data.map(p => {
              return (<div className={`list-item ${p.id === id ? 'list-item-check' : ''}`} onClick={() => browserHistory.push('/console/live-screen-case/' + p.id)} >
                <img src={p.url} />
              </div>)
            })
          }
        </div>
        <div className="case-dtl-card case-warp">
          <Card bodyStyle={{ padding: '10px'}}>
            <div className="always-display-scrollbar card-body">
              <ImageZoom
                image={{
                  src: data.url,
                  style: { maxHeight: '100%', maxWidth: '100%' }
                }}
                zoomMargin={0}
                shouldRespectMaxDimension
                zoomImage={{ src: data.url }}
              />
            </div>
          </Card>
        </div>
      </div>
    );
  }
}
