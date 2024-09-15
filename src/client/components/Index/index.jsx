/**
 * 系统首页
 */
import React from 'react'
import _ from 'lodash'
import { message, Tabs, Pagination } from 'antd'

import { checkPermission } from '../../common/permission-control'
import { moduleIndex } from './const'

import '../../css/modules/box.styl'
import './index.styl'

const { TabPane } = Tabs
const moduleIndexMap = _.keyBy(moduleIndex, 'key')

export default class SystemIndex extends React.Component {
  state = {
    current: 1 // 快速入门分页
  }

  /**
   * 根据权限获取类型
   * @param {string} type 入口key
   */
  getClassName = type => {
    const path = _.get(moduleIndexMap, [type, 'url'], '')
    return checkPermission(path) ? 'pointer' : 'disabled'
  }

  /**
   * 根据权限获取新手入门链接
   * @param {number} type 1-快速入门 2-用户指南
   */
  getPermissionLink = type => {
    let linkArr = []
    _.map(moduleIndex, item => {
      if (checkPermission(item.url)) {
        linkArr = _.concat(linkArr, type === 1 ? item.introduceLink : item.guideLink)
      }
    })
    return linkArr
  }

  /**
   * 处理入口点击事件
   * @param {string} type 入口key
   */
  handleMaskClick = type => {
    const path = _.get(moduleIndexMap, [type, 'url'], '')
    if (!checkPermission(path)) {
      return message.warning('很抱歉，您暂无使用该产品的权限')
    }
    window.location.href = path
  }

  /**
   * 渲染快速入门tabpane
   */
  renderIntroduce = () => {
    const { current } = this.state
    const links = this.getPermissionLink(1)
    const showLinks = links.slice((current - 1) * 6, (current - 1) * 6 + 6)
    return (
      <TabPane tab='快速入门' key='1'>
        {_.map(showLinks, item => (
          <a className='link' target='_blank' rel='noreferrer' href={item.url}>
            {item.title}
          </a>
        ))}
        <Pagination size='small' total={links.length} current={current} onChange={current => this.setState({ current })} showLessItems pageSize={6} />
      </TabPane>
    )
  }

  render() {
    return (
      <div className='system-index'>
        <div className='animation'>
          <img className='base' src='/_bc/sugo-analytics-static/assets/images/system-index/base.png' alt='首页基座图' />
          <img className='collect' src='/_bc/sugo-analytics-static/assets/images/system-index/collect.gif' alt='数据集成' />
          <img className='develop' src='/_bc/sugo-analytics-static/assets/images/system-index/develop.gif' alt='数据开发' />
          <img className='asset' src='/_bc/sugo-analytics-static/assets/images/system-index/asset.gif' alt='数据资产' />
          <img className='service' src='/_bc/sugo-analytics-static/assets/images/system-index/service.gif' alt='数据服务' />
          <img className='market' src='/_bc/sugo-analytics-static/assets/images/system-index/market.gif' alt='智能营销' />
          <img className='operate' src='/_bc/sugo-analytics-static/assets/images/system-index/operate.gif' alt='智能运营' />
          <img className='manager' src='/_bc/sugo-analytics-static/assets/images/system-index/manager.gif' alt='管理中心' />
          <img className='box1' src='/_bc/sugo-analytics-static/assets/images/system-index/box.png' alt='盒子1-集成to开发' />
          <img className='box2' src='/_bc/sugo-analytics-static/assets/images/system-index/box.png' alt='盒子2-开发to资产' />
          <img className='box3' src='/_bc/sugo-analytics-static/assets/images/system-index/box.png' alt='盒子3-资产to服务' />
          <div className={`mask collect-mask ${this.getClassName('collect')}`} onClick={() => this.handleMaskClick('collect')} />
          <div className={`mask develop-mask ${this.getClassName('develop')}`} onClick={() => this.handleMaskClick('develop')} />
          <div className={`mask asset-mask ${this.getClassName('asset')}`} onClick={() => this.handleMaskClick('asset')} />
          <div className={`mask service-mask ${this.getClassName('service')}`} onClick={() => this.handleMaskClick('service')} />
          <div className={`mask market-mask ${this.getClassName('market')}`} onClick={() => this.handleMaskClick('market')} />
          <div className={`mask operate-mask ${this.getClassName('operate')}`} onClick={() => this.handleMaskClick('operate')} />
          <div className={`mask manager-mask ${this.getClassName('manager')}`} onClick={() => this.handleMaskClick('manager')} />
        </div>
        <div className='right-box'>
          <div className='video shadow'>
            <div className='title'>视频教程</div>
            <div className='player'>
              <video width='420' height='240' controls>
                <source src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/videos/analytic-guide-01.mp4`} type='video/mp4' />
                您的浏览器不支持 HTML5 video 标签。
              </video>
            </div>
          </div>
          <div className='introduce shadow'>
            <div className='title'>新手入门</div>
            <div className='content'>
              <Tabs defaultActiveKey='1' className='introduce-tabs'>
                {this.renderIntroduce()}
                <TabPane tab='用户指南' key='2'>
                  {_.map(this.getPermissionLink(2), item => (
                    <a className='link' target='_blank' rel='noreferrer' href={item.url}>
                      {item.title}
                    </a>
                  ))}
                </TabPane>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
