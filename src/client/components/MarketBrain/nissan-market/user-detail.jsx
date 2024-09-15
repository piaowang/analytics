import React from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { NavBar, Flex, Button, Tabs, } from 'antd-mobile'
import Fetch from 'client/common/fetch-final'
import executionsStore from './store/executions'
import { namespace } from './store/executions'
import './style/user-detail.styl'

const CryptoJS = require('crypto-js')

@connect(state => ({ ...state[namespace], [namespace]: state[namespace] || null  }))
export default class UserDetailComponent extends React.Component {
  constructor(props) {
    super(props)
    if (!props[namespace]) { 
      window.store.register(executionsStore)
    }
  }

  componentDidMount () {
    const urlParams = _.get(this.props, 'location.query', {})

    // 触发 action 获取详情页信息
    this.props.dispatch({
      type: `${namespace}/getDetailData`,
      payload: {
        unionid: urlParams.unionid
      }
    })

    // 企业微信 JS-SDK
    this.getSign()
  }

  /**
   * 获取时间戳
   */
  getTimeStamp = () => {
    let tmp = new Date().valueOf()
    return tmp
  }

  // getToken = async () => {
  //   const res = await Fetch.get(`https://qyapi.weixin.qq.com/cgi-bin/gettoken`, { 
  //     corpid: 'wwa25c34e72785b96d',
  //     corpsecret: 'LUg8hThVNPL-d0XdJLEANRDmpkpQB0QAvMDknXGdbvM'
  //   })
  //   console.log('access_token: ', res.access_token)
  //   return res.access_token || false
  // }

  // getApiTicket = async (access_token) => {
  //   const res = await Fetch.get(`https://qyapi.weixin.qq.com/cgi-bin/get_jsapi_ticket`, { access_token })
  //   console.log('ticket: ', res.ticket)
  //   return res.ticket || false
  // }

  /**
   * 获取20位随机字符串
   */
  getNonceStr = () => {
    const charStr = 'QWERTYUIOPASDFGHJKLMNBVCXZqwertyuioplkjhgfdsazxcvbnm1234567890'
    const len = charStr.length
    let nonceStr = ''
    for (let i=0; i<20; i++) {
      nonceStr += charStr.charAt(Math.floor(Math.random()*len))
    }
    return nonceStr
  }

  /**
   * 获取 JS-SDK 签名并注入权限验证配置
   */
  getSign = async () => {
    const res = await Fetch.get('/app/market-brain-execution/get-jssdk-ticket')
    const corpIdRes = await Fetch.get('/app/market-brain-execution/get-corpid')

    //todo 错误处理
    if (!res.success) return false
    const jsapi_ticket = res.result
    const corpid = corpIdRes.result

    const timestamp = this.getTimeStamp()
    const noncestr = this.getNonceStr()
    
    const href = location.href
    const sign = CryptoJS.SHA1(`jsapi_ticket=${jsapi_ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${href}`).toString()

    wx.config({
      beta: true,// 必须这么写，否则wx.invoke调用形式的jsapi会有问题
      debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
      appId: corpid, // 必填，企业微信的corpID
      timestamp: timestamp, // 必填，生成签名的时间戳
      nonceStr: noncestr, // 必填，生成签名的随机串
      signature: sign,// 必填，签名，见 附录-JS-SDK使用权限签名算法
      jsApiList: [] // 必填，需要使用的JS接口列表，凡是要调用的接口都需要传进来
    })
    wx.ready(function(res){
      // config信息验证后会执行ready方法，所有接口调用都必须在config接口获得结果之后，config是一个客户端的异步操作，所以如果需要在页面加载时就调用相关接口，则须把相关接口放在ready函数中调用来确保正确执行。对于用户触发时才调用的接口，则可以直接调用，不需要放在ready函数中。
      console.log(res, 'res===')
    });
  }

  /**
   * 打开会话窗口
   */
  openSession = (extraUserId) => {
    // TODO 替换外部联系人userid
    wx.openEnterpriseChat({
      // 注意：userIds和externalUserIds至少选填一个，且userIds+externalUserIds总数不能超过2000。
      userIds: '',    //参与会话的企业成员列表，格式为userid1;userid2;...，用分号隔开。
      externalUserIds: extraUserId, // 参与会话的外部联系人列表，格式为userId1;userId2;…，用分号隔开。
      groupName: '',  // 必填，会话名称。单聊时该参数传入空字符串""即可。
      success: function(res) {
        // 回调
        console.log('打开会话成功=========')
      },
      fail: function(res) {
        alert(JSON.stringify(res))
          // if(res.errMsg.indexOf('function not exist') > -1){
          //     alert('版本过低请升级')
          // }
      }
    });
  }

  render () {
    const urlParams = _.get(this.props, 'location.query', {})
    const { offlineData=[], onlineData=[], basicInfo={}, tryCarData={}, discountData=[] } = this.props
    return(
      <div id="user-detail">
        <NavBar
          mode="light"
          onLeftClick={() => console.log('onLeftClick')}
        />

        {/* 第一块 -- 个人、车辆信息 */}
        <div className="info">

          <div className="basic">
            <div>
              {/* TODO 添加头像信息查询 */}
              <img className="img" src={`/api/uploaded-files/get-file/f/${basicInfo.fimg||''}`} alt=""/>
            </div>
            <div>
              <p className="name">{basicInfo.nickname || ''}</p>
              {/* TODO 性别还没确定，先去掉 男 / */}
              {/* <span className="male"></span> */}
              <p className="sex">{basicInfo.sugo_province||''} {basicInfo.sugo_city||''}</p>
            </div>
            {
              urlParams.extraUserId
              ? <Button className="contact" type="primary" size="small" onClick={() => this.openSession(urlParams.extraUserId)}>联系TA</Button>
              : <Button className="contact" size="small" onClick={() => {location.href=`/nissan-market/add-wechat?userid=${urlParams.userid}`}}>添加微信</Button>
            }
            
          </div>

          <div className="try">
            <div className="title"><span className="car-icon"></span>游戏选择的试驾车辆</div>
            <div className="content">
              <div>
                <p className="desc-1">{basicInfo.try_car || '暂未试驾车辆'}</p>
                <p className="desc-2">{basicInfo.__time||''}</p>
              </div>
              <img className="car-1" src={`${window.sugo.cdn}/_bc/sugo-analytics-extend-nissan/assets/images/${basicInfo.try_car||'normal'}.png`} alt="试驾车辆图片"/>
            </div>
          </div>

          <div className="interest">
            <div className="title"><span className="int-icon"></span>感兴趣车辆信息</div>
            <Flex justify="space-around">
              <Flex.Item>
                <p className="desc-1">{tryCarData.ms_car_interested_top1||''}</p>
                <p className="desc-2">第一兴趣</p>
              </Flex.Item>
              <Flex.Item>
                <p className="desc-1">{tryCarData.ms_car_interested_top2||''}</p>
                <p className="desc-2">第二兴趣</p>
              </Flex.Item>
              <Flex.Item>
                <p className="desc-1">{tryCarData.ms_car_interested_top3||''}</p>
                <p className="desc-2">第三兴趣</p>
              </Flex.Item>
            </Flex>
          </div>
        </div>

        {/* 第二块 -- tabs */}
        <div className="tabs">
          <Tabs 
            tabs={[
              { title: '线下足迹' },
              { title: '线上足迹' },
              { title: '优惠券' },
            ]}
            useOnPan={false}
          >
            <div className="my-tab-pane">
              <Flex direction="column">
                {
                  !offlineData.length ? <div className="alignCenter">暂无数据~</div>
                  :
                  offlineData.map(item => (
                    <Flex.Item>
                      <p className="desc-3">{item.__date || '时间为空'}</p>
                      <p className="desc-1">{item.car_title || '车辆标题为空'}</p>
                      <p className="desc-2">
                        <span>{item.__time || 0} 浏览</span>
                        <span className="desc">{item.duration || 0} s停留</span>
                        <span>{item.tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5 || 0} 次总浏览</span>
                      </p>
                    </Flex.Item>
                  ))
                }
              </Flex>
            </div>
            <div className="my-tab-pane">
              <Flex direction="column">
                {
                  !onlineData.length ? <div className="alignCenter">暂无数据~</div>
                  :
                  onlineData.map(item => (
                    <Flex.Item>
                      <p className="desc-3">{item.__date || '时间为空'}</p>
                      <p className="desc-1">{item.car_title || '车辆标题为空'}</p>
                      <p className="desc-2">
                        <span>{item.__time || '00:00'} 浏览</span>
                        <span className="desc">{item._tempMetric_duration_eMnGKQKKj || 0} s停留</span>
                        <span>{item.tindex_9_MpxgIJm_project_w7ZLfGGyo_IDvCaoLQ5 || 0} 次总浏览</span>
                      </p>
                    </Flex.Item>
                  ))
                }
              </Flex>
            </div>
            <div className="my-tab-pane">
              {
                !discountData.length ? <div className="alignCenter">暂无优惠券~</div>
                :
                discountData.map(item => (
                  <div className={`discount ${item.overdue ? 'discount-1' : 'discount-2'}`}>
                    <div>
                      <p className="discount-title">试驾大礼包</p>
                      <p className="desc-3">期限：至{item.time}</p>
                    </div>
                    <div className="discount-status">{item.overdue ? '已领取' : '已过期'}</div>
                  </div>
                ))
              }
            </div>
          </Tabs>
        </div>
      </div>
    )
  }
}