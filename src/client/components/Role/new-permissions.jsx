import React from 'react'
import getPermissionList from './get-premission-list'
import { Checkbox, Collapse } from 'antd'
import _ from 'lodash'
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
    const { permissions, role } = props
    //第一次初始化及排序
    if (permissions.length && !this.hasGoing && role) {
      this.hasGoing = true
      const listData = getPermissionList(permissions)
      const checkData = this.lineData(listData)
      const titList = window.sugo.menus.map(name => {
        return name.title
      })
      listData.sort((a, b) => {
        const akey = titList.indexOf(a.title)
        const bkey = titList.indexOf(b.title)
        return akey - bkey
      })
      this.setState({ listData, checkData }, this.initCheckBox)
    }
    return true
  }
  //改变选中状态
  changeCheck(item) {
    const index = this.checkData.findIndex(val => {
      if (val.title === item.title && item.key === val.key) return true
    })
    this.checkData[index].check = !this.checkData[index].check
    this.checkData[index].indete = false
    this.checkAllFun(`${this.checkData[index].title}_${index}`, this.checkData[index].check)
    if (this.checkData[index].from) this.LoopCheck(this.checkData[index].from)
    this.setState({ checkData: this.checkData }, this.commitRole)
  }
  //根据from 标记下级所有的状态
  checkAllFun(from, status = false) {
    this.checkData.filter((item, index) => {
      if (item.from === from) {
        this.checkData[index].check = status
        this.checkData[index].indete = false
        this.checkAllFun(`${this.checkData[index].title}_${index}`, status)
        return true
      }
    })
    return true
  }
  //判断是否选中
  findCheckFun(item, type) {
    const res = _.find(this.state.checkData, val => {
      if (val.title === item.title && val.key === item.key) return true
    })
    return (res && res[type]) || false
  }
  //生成一维数组，控制选中状态
  lineData(data, pre = false, arr = []) {
    data.forEach(item => {
      if (pre) {
        arr.push({ title: item.title, id: item.id || '', from: pre, key: item.key })
      } else {
        arr.push({ title: item.title, key: item.key })
      }
      if (item.children) {
        this.lineData(item.children, `${item.title}_${arr.length - 1}`, arr)
      } else {
        if (item.api) {
          this.lineData(item.api, `${item.title}_${arr.length - 1}`, arr)
        }
      }
    })
    return arr
  }
  //初始化选中状态
  initCheckBox = () => {
    const checkList = this.props.role.funcPermissions
    checkList.forEach(val => {
      this.setApiFun(val)
    })
    this.setState({ checkData: this.checkData })
  }
  //改变最后一级状态
  changeApiFun = val => {
    this.setApiFun(val)
    this.setState({ checkData: this.checkData }, this.commitRole)
  }
  //提交选中状态
  commitRole() {
    const newArr = []
    this.state.checkData.filter(item => {
      if (item.check && item.id) {
        newArr.push(item.id)
        return true
      }
    })
    this.props.role.funcPermissions = newArr
    this.props.modifier({ role: { ...this.props.role } })
  }
  setApiFun = val => {
    this.checkData = [...this.state.checkData]
    const key = this.checkData.findIndex(it => {
      return it.id === val
    })
    if (key >= 0) {
      this.checkData[key].check = this.checkData[key].check ? false : true
      this.LoopCheck(this.checkData[key].from)
    }
  }
  //递归处理选中状态
  LoopCheck(from) {
    let checkArr = 0
    const arr = this.checkData.filter(item => {
      if (item.check && item.from === from) checkArr++
      return item.from === from
    })
    const fromArr = from.split('_')[1]
    if (checkArr) {
      this.checkData[fromArr].indete = true
      this.checkData[fromArr].check = false
      if (arr.length === checkArr) {
        this.checkData[fromArr].check = true
        this.checkData[fromArr].indete = false
      }
    } else {
      this.checkData[fromArr].indete = false
      this.checkData[fromArr].check = false
    }
    if (this.checkData[fromArr].from) {
      this.LoopCheck(this.checkData[fromArr].from)
    }
    return true
  }
  setDivHtml(item) {
    if (item.api) {
      return (
        <div className='api-box'>
          {item.api.map((val, k) => {
            return (
              <Checkbox key={k} onChange={() => this.changeApiFun(val.id)} checked={this.findCheckFun(val, 'check')} indeterminate={this.findCheckFun(val, 'indete')}>
                {val.title}
              </Checkbox>
            )
          })}
        </div>
      )
    }
    return item.children.map((it, index) => {
      return (
        <div className={index === 0 ? 'item-it none' : 'item-it'} key={it.title}>
          <div className='item none'>{this.classCheckbox(it)}</div>
          {this.setDivHtml(it)}
        </div>
      )
    })
  }
  setPanel(list, b = 0) {
    return list.map((item, index) => {
      return item.children ? (
        <div className={`table-box-item ${index === list.length - 1 ? 'none-box' : ''}`} key={index}>
          <div className='table-tit'>{this.classCheckbox(item)}</div>
          <table className='table'>
            <tbody>
              {item.children.map(it => {
                return (
                  <tr key={it.title}>
                    <td className='tit'>{this.classCheckbox(it)}</td>
                    <td>
                      {it.children ? (
                        this.setDivHtml(it)
                      ) : it.api ? (
                        <div className='api-box none'>
                          {it.api.map((val, k) => {
                            return (
                              <Checkbox key={k} onChange={() => this.changeApiFun(val.id)} checked={this.findCheckFun(val, 'check')}>
                                {val.title}
                              </Checkbox>
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
        <div className='table-box-item last-none-box' key={index}>
          <table className='table'>
            <tbody>
              <tr>
                <td className='tit'>{this.classCheckbox(item)}</td>
                <td>
                  <div className='api-box none'>
                    {item.api.map((val, k) => {
                      return (
                        <Checkbox key={k} onChange={() => this.changeApiFun(val.id)} checked={this.findCheckFun(val, 'check')}>
                          {val.title}
                        </Checkbox>
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
  classCheckbox = item => {
    return (
      <span onClick={e => e.stopPropagation()}>
        <Checkbox onChange={() => this.changeCheck(item)} checked={this.findCheckFun(item, 'check')} indeterminate={this.findCheckFun(item, 'indete')}>
          {item.title}
        </Checkbox>
      </span>
    )
  }

  render() {
    const { listData } = this.state
    if (listData.length)
      return (
        <div className='pre-table-box'>
          <Collapse
            defaultActiveKey={listData.map((item, index) => {
              return index + ''
            })}
          >
            {listData.map((item, index) => {
              return (
                <Panel header={this.classCheckbox(item)} key={index}>
                  {this.setPanel(item.children)}
                </Panel>
              )
            })}
          </Collapse>
        </div>
      )
    return <div className='pd3 aligncenter color-grey'>加载中...</div>
  }
}
