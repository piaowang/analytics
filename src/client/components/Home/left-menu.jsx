import React from 'react'
import { Menu } from 'antd'
import Icon from '../Common/sugo-icon'
import { isEqualWithReactObj } from 'common/sugo-utils'
import { connect } from 'react-redux'
import { browserHistory } from 'react-router'
import _ from 'lodash'
import './css/menu.styl'

const { SubMenu } = Menu

@connect(({ sagaCommon }) => sagaCommon)
class LeftMenu extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      collapsed: false,
      openKeys: []
    }
    //处理门户第一次进来的层级数
    if(localStorage.portalId){
      if(props.selectItem.length < 4){
        this.isShowLevel = true
      }
    }
  }

  componentDidMount() {
    this.setActiveFun(this.props)
    this.portalId = localStorage.portalId
  }


  componentDidUpdate(prevProps) {
    if (!isEqualWithReactObj(this.props, prevProps)) {
      this.setActiveFun(this.props)
    }
  }

  setActiveFun(props){
    const openKeys = props.selectItem && props.selectItem.map((val) => {
      return val.tit
    })
    !this.state.collapsed && this.setOpenKeys(openKeys)
  }
  //当前展开的层级
  setOpenKeys(arr) {
    this.setState({
      openKeys: arr
    })
  }
  toggleCollapsed = () => {
    this.setState(
      {
        collapsed: !this.state.collapsed,
        openKeys: !this.state.collapsed
          ? []
          : this.props.selectItem.map((val) => {
            return val.tit
          })
      },
      () => {
        this.props.toggleCol()
      }
    )
  };
  //跳转路由
  changeSelect = (path) => {
    if (!path) return false
    browserHistory.push(path)
  };
  openChange = (key) => {
    this.setOpenKeys(key)
  };
  render() {
    const { menus, selectItem = [] } = this.props
    if (!selectItem.length) return false
    let menusData = null
    const curKey = [...selectItem].pop().tit
    //如果门户进来是第四级，直接显示最后一级
    if(this.portalId && selectItem.length === 4 && !this.isShowLevel){
      menusData = menus[selectItem[0].index].children[selectItem[1].index].children[selectItem[2].index]
    }else{
      menusData = menus[selectItem[0].index].children[selectItem[1].index]
    }
    return (
      <div
        className={`left-menu-box ${
          this.state.collapsed ? ' left-menu-min' : ''
        } ${this.portalId?'portal-left-menu':''}`}
      >
        <div className="left-top-tit">
          <Icon
            className="ico-btn"
            onClick={this.toggleCollapsed}
            type={this.state.collapsed ? 'menu-unfold' : 'menu-fold'}
          />
        </div>
        <Menu
          defaultOpenKeys={this.state.openKeys}
          selectedKeys={[curKey]}
          mode="inline"
          theme="inline"
          inlineIndent={15}
          subMenuOpenDelay={0.2}
          openKeys={this.state.openKeys}
          inlineCollapsed={this.state.collapsed}
          onOpenChange={this.openChange}
        >
          <SubMenu
            key={menusData.title}
            title={
              <span>
                <Icon type={menusData.icon || 'profile'} />
                <span>{menusData.title}</span>
              </span>
            }
          >
            {menusData.children &&
              menusData.children.map((item2) => {
                return item2.children ?(
                  item2.hide?'':(
                    <SubMenu
                      key={item2.title}
                      title={
                        <span>
                          <Icon type={item2.icon || 'profile'} />
                          <span>{item2.title}</span>
                        </span>
                      }
                    >
                      {item2.children &&
                      item2.children.map((item3) => {
                        return (
                          <Menu.Item
                            key={item3.title}
                            onClick={() => this.changeSelect(item3.path)}
                          >
                            <div className="link">
                              <Icon type={item3.icon || 'profile'} />
                              <span>{item3.title}</span>
                            </div>
                          </Menu.Item>
                        )
                      })}
                    </SubMenu>)
                ) : (
                  item2.hide?'':(
                    <Menu.Item
                      key={item2.title}
                      onClick={() => this.changeSelect(item2.path)}
                    >
                      <div className="link">
                        <Icon type={item2.icon || 'profile'} />
                        <span>{item2.title}</span>
                      </div>
                    </Menu.Item>)
                )
              })}
          </SubMenu>
        </Menu>
      </div>
    )
  }
}

export default LeftMenu
