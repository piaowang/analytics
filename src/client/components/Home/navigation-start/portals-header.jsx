import React from 'react'
import _ from 'lodash'
import moment from 'moment'
import { Dropdown, Menu } from 'antd'
import Link from '../../Common/link-nojam'
import Icon from '../../Common/sugo-icon'
import { browserHistory } from 'react-router'
const MenuItem = Menu.Item
export default class PoralsHeader extends React.Component{
  
  componentDidMount(){
    this.basePath = localStorage.portalbasePath
  }

  menu = ()=>{
    return (
      <Menu
        style={{
          backgroundColor: '#1C2748'
        }}
      >
        <MenuItem
          key="/console/profile"
        >
          <Link style={{color: '#D5DCF1'}} to="/console/profile">编辑个人信息</Link>
        </MenuItem>
        <MenuItem key="logout">
          <a
            onClick={(e)=>{
              e.preventDefault()
              const isRead = localStorage.isRead
              localStorage.portalId = ''
              localStorage.portalbasePath = ''
              localStorage.isRead = ''
              if(isRead){
                window.location.href='/logout?redirect=/login'
              }else{
                window.location.href=`/logout${this.basePath ? `?redirect=/${this.basePath}` : ''}`
              }
            }} 
            style={{
              color: '#D5DCF1'
            }}
          >
            <Icon type="logout" /> 
          注销登录
          </a>
        </MenuItem>
      </Menu>)
  }
  render(){
    const { logoImg, siteName, topBackgroundImage, rightFontColor, siteNameColor, isNotHome } = this.props
    const background = isNotHome ? null : topBackgroundImage
    const rightColor = isNotHome ? null : rightFontColor
    const nameColor = isNotHome ? null : siteNameColor
    return (
      <div
        style={{
          display: 'flex', backgroundColor: '#4139DF', height: '70px', lineHeight: '70px',
          marginBottom: '30px',
          background: background || '#6969d7',
          borderBottom: '1px solid #1376cf'
        }}
        className="header width-100"
      >
        <div 
          className="width400"
          style={{paddingLeft: '37px'}}
        >
  
          {logoImg
            ? (
              <img
                className="iblock logo-img mg2r"
                style={{maxHeight:'40px',verticalAlign:'-12px'}}
                src={logoImg}
                alt=""
              />
            )
            : null}
  
          <span
            style={{
              height:'24px',
              fontSize:'24px',
              fontFamily:'Source Han Sans CN',
              fontWeight:'bold',
              color: nameColor || 'rgba(255,255,255,1)',
              background:'linear-gradient(0deg,rgba(255,255,255,1) 0%, rgba(162,176,215,1) 100%)',
              WebkitBackgroundClip:'text'
            }}
          >{siteName || '智慧商场数据门户'}</span>
        </div>
        <div style={{flexGrow: 1, maxWidth: '1800px', overflow: 'hidden'}} />
        <span  
          style={{ fontSize:'14px',
            fontFamily:'Source Han Sans CN',
            fontWeight:700,
            marginRight:'20px',
            color: rightColor || 'rgba(213,220,241,1)'}}
        >{moment().format('YYYY-MM-DD dddd')}</span>
        {localStorage.isRead && (
          <div 
            style={{ fontSize:'14px',
              cursor:'pointer',
              fontFamily:'Source Han Sans CN',
              fontWeight:700,
              marginRight:'20px',
              color: rightColor || 'rgba(213,220,241,1)'}}
            onClick={()=>{
              localStorage.portalId = ''
              localStorage.portalbasePath = ''
              localStorage.isRead = ''
              browserHistory.push('/console/portals-mgr')
            }}
          >返回管理平台</div>
        )}
        
        <div 
          style={{ fontSize:'14px',
            cursor:'pointer',
            fontFamily:'Source Han Sans CN',
            fontWeight:700,
            color: rightColor || 'rgba(213,220,241,1)'}}
          onClick={()=>{
            browserHistory.push(`/${this.basePath}`)
          }}

        >返回首页</div>
        <div 
          style={{
            fontSize:'14px',
            fontFamily:'Source Han Sans CN',
            fontWeight:400,
            color: rightColor || 'rgba(213,220,241,1)',
            marginRight: '34px'
          }}
        >
          <Dropdown
            overlay={this.menu()}
            placement="bottomLeft"
            overlayClassName="navigation-start-page"
          >
            <Link
              to="/console/profile"
              className="itblock pd2x"
              style={{
                fontSize:'14px',
                fontFamily:'Source Han Sans CN',
                fontWeight:400,
                color: rightColor || 'rgba(213,220,241,1)'
              }}
            >
              <span className="mw120 elli alignright" title={window.sugo.user.first_name || window.sugo.user.username}>
                <b>{window.sugo.user.first_name || window.sugo.user.username}</b> <Icon type="down" />
              </span>
            </Link>
          </Dropdown>
        </div>

      </div>
    )
  }
}
