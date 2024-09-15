import React from 'react'
import _ from 'lodash'
import moment from 'moment'
import { Flex } from 'antd-mobile'
import { connect } from 'react-redux'
import { namespace, parseUrl } from './store/executions'
import executionsStore from './store/executions'
import './style/user-list.styl'

@connect(state => ({ ...state[namespace], [namespace]: state[namespace] || null }))
export default class UserlistComponent extends React.Component {
  constructor(props) {
    super(props)
    if (!props[namespace]) { 
      window.store.register(executionsStore)
    }
  }

  componentDidMount () {
    const urlParams = _.get(this.props, 'location.query', {})
    this.props.dispatch({
      type: `${namespace}/getUserList`,
      payload: {
        execute_id: urlParams.execute_id
      }
    })
    this.props.dispatch({
      type: `${namespace}/getCustomerList`,
      payload: {
        userid: urlParams.userid
      }
    })
  }

  componentDidUpdate(prevProps) {
    const prevCList = prevProps.customerList
    const newCList = this.props.customerList
    if (prevCList && newCList && prevCList.length !== newCList.length) {
      this.combineDataByOpenId()
    }
  }

  /**
   * 根据外部联系人表的openid判断明细表中的人员是否添加了好友
   */
  combineDataByOpenId = () => {
    const { customerList, userList } = this.props
    const clMap = new Map()
    customerList.map(it => {
      // 用外部联系人表的 unionid 匹配明细表的 openid
      clMap.set(it.unionid, {userId: it.userid})
    })

    const newList = userList.map(it => {
      const val = clMap.get(it.openid)
      if (val) {
        return {
          ...it,
          extraUserId: val.userId, // 详情页打开会话、判断是否添加好友
        }
      }
      return it
    })
    this.props.dispatch({
      type: `${namespace}/change`,
      payload: { userList: newList }
    })
  }

  render () {
    const { userList=[] } = this.props
    const urlParams = _.get(this.props, 'location.query', {})
    return(
      <div id="user-list">
        {
          !userList.length 
          ? <div className="alignCenter" style={{marginTop: '.5rem', color: '#bdbcbc'}}>列表信息为空~</div>
          : 
          <div className="flex-container">
            <Flex direction="column">
            {
              userList.map(item => <Flex.Item><UserComponent {...item} userid={urlParams.userid} /></Flex.Item>) 
            }
            </Flex>
          </div>
        }
      </div>
    )
  }
}

const UserComponent = (props) => {
  const unionid = props.openid ? `?unionid=${props.openid}` : ''
  const extraUserId = props.extraUserId ? `&extraUserId=${props.extraUserId}` : ''
  const userid = props.userid ? `&userid=${props.userid}` : ''
  return (
    <a href={`/nissan-market/user-detail${unionid}${extraUserId}${userid}`} className="user">
      <div>
        <img className="img" src={`/api/uploaded-files/get-file/f/${props.who_claim}`} alt=""/>
      </div>
      <div>
        <p className="name">{props.user_name || ''}</p>
        <p className="info">{`企业微信：${props.extraUserId ? '已添加' : '未添加'}`}</p>
        <p className="info">{`到店时间：${props.send_time ? moment(props.send_time).format('YYYY-MM-DD hh:mm') : '无'}`}</p>
      </div>
    </a>
  )
}