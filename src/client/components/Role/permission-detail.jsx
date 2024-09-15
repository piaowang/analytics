import React from 'react'
import getPermissionList from './get-premission-list'
import { Collapse } from 'antd'
import './pre.styl'

const { Panel } = Collapse
export default class NewPermissions extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      listData: [],
      checkData: []
    }
  }
  shouldComponentUpdate(props) {
    const { permissions } = props
    //第一次初始化及排序
    if (permissions.length && !this.hasGoing) {
      this.hasGoing = true
      const listData = getPermissionList(permissions)
      const titList = window.sugo.menus.map(name => {
        return name.title
      })
      listData.sort((a, b) => {
        const akey = titList.indexOf(a.title)
        const bkey = titList.indexOf(b.title)
        return akey - bkey
      })
      this.setState({ listData })
    }
    return true
  }

  setDivHtml(item) {
    if (item.api) {
      return (
        <div className="api-box">
          {item.api.map((val, k) => {
            return (
              <span
                key={k}
                style={{marginRight:'20px'}}
              >
                {val.title}
              </span>
            )
          })}
        </div>
      )
    }
    return item.children.map((it, index) => {
      return (
        <div
          className={index === 0 ? 'item-it none' : 'item-it'}
          key={it.title}
        >
          <div className="item none">{it.title}</div>
          {this.setDivHtml(it)}
        </div>
      )
    })
  }
  setPanel(list) {
    return list.map((item, index) => {
      return item.children ? (
        <div
          className={`table-box-item ${
            index === list.length - 1 ? 'none-box' : ''
          }`}
          key={index}
        >
          <div className="table-tit">{item.title}</div>
          <table className="table">
            <tbody>
              {item.children.map(it => {
                return (
                  <tr key={it.title}>
                    <td className="tit">{it.title}</td>
                    <td>
                      {it.children ? (
                        this.setDivHtml(it)
                      ) : it.api ? (
                        <div className="api-box none">
                          {it.api.map((val, k) => {
                            return (
                              <span key={k} style={{ marginRight: '20px' }}>
                                {val.title}
                              </span>
                            )
                          })}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : item.api ? (
        <div className="table-box-item last-none-box" key={index}>
          <table className="table">
            <tbody>
              <tr>
                <td className="tit">{item.title}</td>
                <td>
                  <div className="api-box none">
                    {item.api.map((val, k) => {
                      return (
                        <span key={k} style={{ marginRight: '20px' }}>
                          {val.title}
                        </span>
                      )
                    })}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null
    })
  }

  render() {
    const { listData } = this.state
    if (listData.length)
      return (
        <div className="pre-table-box">
          <Collapse
            defaultActiveKey={listData.map((item, index) => {
              return index + ''
            })}
          >
            {listData.map((item, index) => {
              return (
                <Panel header={item.title} key={index}>
                  {this.setPanel(item.children)}
                </Panel>
              )
            })}
          </Collapse>
        </div>
      )
    return <div className="pd3 aligncenter color-grey">加载中...</div>
  }
}
