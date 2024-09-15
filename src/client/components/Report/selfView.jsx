import React from 'react'
import { Empty, Tag, message } from 'antd'
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons'

import Left from './view/left'
import Map from './view/map'
import './view/css/index.styl'

export default class SelfView extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      openDetail: null,
      openList: [],
      tableauHost: '',
      ticket: '',
      isFull: false
    }
  }
  componentDidMount() {
    const { reportList } = window.sugo
    const { openDetail, openList } = this.state
    let defaultReport = reportList.find((v) => {
      if (v.default) {
        return true
      }
    })
    if (!openDetail && reportList.length) {
      defaultReport = defaultReport ? defaultReport : reportList[0]
      openList.push(defaultReport)
      this.setState({
        openDetail: defaultReport,
        openList
      })
    }
  }
  closeFun(key) {
    const { openDetail, openList } = this.state
    console.log('SelfView -> closeFun -> openList', openList)
    if (openList.length === 1) {
      message.info('最后一个无法删除！')
      return
    }
    if (openList[key].id === openDetail.id) {
      openList.splice(key, 1)
      const last = openList.length - 1
      this.setState({
        openList,
        openDetail: openList[last]
      })
      return
    }
    openList.splice(key, 1)
    this.setState({
      openList
    })
  }
  onChangeTag(key) {
    const { openList } = this.state
    this.setState({
      openDetail: openList[key]
    })
  }
  //切换视图
  onChange = (key) => {
    let { openDetail, openList } = this.state
    const item = window.sugo.reportList[key]
    openDetail = item
    const has = openList.find((v) => v.id === item.id)
    if (!has) openList.push(item)
    if (openList.length > 8) openList.shift()
    this.setState({
      openDetail,
      openList
    })
  };
  render() {
    const { loginLogoName } = window.sugo
    let { openDetail, openList } = this.state
    return (
      <div className="height-100 bg-white v-body-box">
        <div className="v-header">
          <div className="v-logo">
            <img src={loginLogoName} />
          </div>
        </div>
        <div className="v-body-main">
          <div
            className="r-left-box report-display-scrollbar"
            style={{ width: this.state.isFull ? 0 : '180px' }}
          >
            <Left onChange={this.onChange} cur={openDetail} />
          </div>
          <div className="v-main">
            <div className="v-tab-box">
              {this.state.isFull ? (
                <FullscreenExitOutlined
                  onClick={() => this.setState({ isFull: false })}
                  className="ctr-box"
                />
              ) : (
                <FullscreenOutlined
                  onClick={() => this.setState({ isFull: true })}
                  className="ctr-box"
                />
              )}
              {openList.map((v, index) => {
                if (v.id === openDetail.id) {
                  return (
                    <Tag
                      key={index}
                      color="#6969d7"
                      closable
                      onClose={() => this.closeFun(index)}
                      onClick={() => this.onChangeTag(index)}
                    >
                      {v.title}
                    </Tag>
                  )
                }
                return (
                  <Tag
                    key={index}
                    closable
                    onClose={() => this.closeFun(index)}
                    onClick={() => this.onChangeTag(index)}
                  >
                    {v.title}
                  </Tag>
                )
              })}
            </div>
            {openDetail ? (
              <Map id={openDetail.id} />
            ) : (
              <Empty description="暂无视图，请到总平台添加视图" />
            )}
          </div>
        </div>
      </div>
    )
  }
}
