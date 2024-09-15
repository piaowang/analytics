import React from 'react'
import LiveScreenController from './livescreen-controller'
import LiveScreenControlLogger from './live-screen-control-logger'
import LiveScreenControlThemeManager from './livescreen-controltheme-manager'
import { CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'

import { Tabs, Modal, Button, Input, Select, message, Popover, Popconfirm, InputNumber } from 'antd'
import {validateFields} from '../../common/decorators'
import { namespace } from './store/model'
import { connect } from 'react-redux'
import Fetch from '../../common/fetch-final'
import getSocket from '../../common/websocket'
import _ from 'lodash'
import './livescreen-control.styl'
import {ClientTypeEnum} from '../../../common/constants'
import {renderPageTitle} from '../Common/bread'
import {checkPermission} from '../../common/permission-control'
import QrCode from '../Common/qr-code'

const FormItem = Form.Item
const createForm = Form.create
const Option = Select.Option
const TabPane = Tabs.TabPane

let socket = null
const serviceName = 'sugo_livescreen_broadcast'

const { user: { username } } = window.sugo

// const canQueryLog = checkPermission('get:/app/screenLiveControl/list-logger')
const canQueryTheme = checkPermission('get:/app/live-screen-projection/theme/list')

// const canUpdateScreenCtrl = checkPermission('post:/app/screenLiveControl/update-screencontrol')

@connect(state => ({ ...state[namespace], ...state['sagaCommon'] }))
@validateFields
class LiveScreenControllerIndex extends React.Component {

  static defaultProps = {
    themeList: [],
    screenArr: [],
    activeCard: 0
  }
  
  state = {
    activeKey: '1',
    modalLoading: false,
    createThemeVisible: false,
    setScreenNum: 0
  }

  componentDidMount() {
    // this.props.dispatch({
    //   type: `${namespace}/asyncFetchScreenControllerState`
    // })
    this.getThemeList()
    this.getPlayList()
    this.getScreenControlNum()
    this.props.dispatch({
      type: `${namespace}/asyncGetLiveScreen`
    })
    // this.props.dispatch({
    //   type: `${namespace}/asyncFetchLogger`,
    //   payload: {
    //     page: 1,
    //     pageSize: 10
    //   }
    // })
    this.initSocket()
  }

  componentWillUnmount() {
    if (socket) {
      socket.off(serviceName, 'init', this.onSocketInit)
      socket.off(serviceName, 'stateChange', this.onBroadcastStateChange)
      socket.sendTo(serviceName, 'deinit', {
        client: ClientTypeEnum.backendClient
      })
    }
  }
  
  /**
   * 投屏管理相关事件逻辑
   * 初始化/屏幕状态变更时，取得全部的屏幕以及他们的状态
   * 设置屏幕顺序，状态保存在？
   * 设置投影主题
   * @returns {Promise<void>}
   */
  async initSocket() {
    if (!socket) {
      socket = await getSocket({query: {client: ClientTypeEnum.backendClient, room: serviceName}})
      socket.register(serviceName)
    }
    socket.on(serviceName, 'init', this.onSocketInit)
    socket.on(serviceName, 'stateChange', this.onBroadcastStateChange)
    socket.sendTo(serviceName, 'init', {
      'client': 'backendClient'
    })
    
    window.testSocket = () => {
      socket.sendTo(serviceName, 'getState', {})
    }
  }
  
  onSocketInit = (i) => {
    let {msg, currScreenCtrl, jwtSign, playTimeInSeconds} = i
    // console.log(`currScreenCtrl: `, currScreenCtrl)
    // console.log(`jwtSign: `, jwtSign)
    this.props.dispatch({
      type: `${namespace}/getScreenControllerState`,
      payload: {screenOption: currScreenCtrl, playTimeInSeconds}
    })
    this.props.dispatch({
      type: `${namespace}/setJwtSign`,
      payload: jwtSign
    })
  }
  
  onBroadcastStateChange = nextState => {
    let {msg, currScreenCtrl, playTimeInSeconds} = nextState
    this.props.dispatch({
      type: `${namespace}/getScreenControllerState`,
      payload: {screenOption: currScreenCtrl, playTimeInSeconds}
    })
  }
  
  
  
  getThemeList = () => {
    if (!canQueryTheme) {
      return
    }
    this.props.dispatch({
      type: `${namespace}/asyncGetThemeList`,
      payload: {
        page: 1,
        pageSize: 99999//must load all to show on the selector
      }
    })
  };

  getPlayList=()=>{
    this.props.dispatch({
      type: `${namespace}/getPlayList`
    })
  }

  getScreenControlNum = () => {
    this.props.dispatch({
      type: `${namespace}/getScreenGlobalConfig`
    })
  }

  handleBroadCast = (type='one') => {
    // if (!canUpdateScreenCtrl) {
    //   message.warn('您没有“修改大屏投影设置”权限')
    //   return
    // }
    
    const { themeList, screenOption } = this.props
    if (type === 'all'){
      const { username } = window.sugo.user
      socket.sendTo(serviceName, 'broadcast', { currScreenCtrl: screenOption, username, type})
      this.getThemeList()
      this.getPlayList()
      return
    }

    // let current_theme_id = _.get(screenOption, 'current_theme_id')
    // if (!current_theme_id) {
    //   message.warn('请先选择主题')
    //   return
    // }
    const { username } = window.sugo.user
    socket.sendTo(serviceName, 'broadcast', { currScreenCtrl: screenOption, username })
    this.getThemeList()
    this.getPlayList()
  }

  createThemeModal = (visible) => {
    return this.setState({
      createThemeVisible: visible
    })
  }

  updateTheme = (payload) => {
    this.props.dispatch({
      type: `${namespace}/asyncUpdateTheme`,
      payload
    })
  }

  deleteTheme = (id, screenId, current_theme_id) => {
    if (id === current_theme_id) return message.error('不能删除当前主题')
    this.props.dispatch({
      type:`${namespace}/asyncDeleteTheme`,
      payload: {
        themeId: id,
        screenId: screenId
      }
    })
  }

  changeThemeTimeRange = (payload) => {
    this.props.dispatch({
      type: `${namespace}/asyncChangeThemeTimeRange`,
      payload
    })
  };

  onThemeChanged = (value) => {
    let {playList, dispatch, themeList} = this.props
    dispatch({
      type: `${namespace}/updatePlayList`,
      payload: {playList: value.map(id => _.find(themeList, {id})) }
    })
  };
  onIndexChanged = (dragIndex, hoverIndex) => {
    let {playList, dispatch} = this.props
    const result = Array.from(playList)
    const [removed] = result.splice(dragIndex, 1)
    result.splice(hoverIndex, 0, removed)
    //const t = playList[dragIndex]
    // playList[dragIndex] = {...playList[hoverIndex]}
    // playList[hoverIndex] = {...t}
    // playList = [].concat(playList)
    dispatch({
      type: `${namespace}/updatePlayList`,
      payload: {playList: result}
    })
  };
  onTimerChanged=(value)=>{
    let {dispatch} = this.props
    dispatch({
      type: `${namespace}/updatePlayConfig`,
      payload: {timer:value}
    })
  };
  onSubmit=()=>{
    // this.getPlayList()
    let {playList,timer,screenInfos,playId, dispatch} = this.props
  
    dispatch({
      type: `${namespace}/setPlayList`,
      payload: {timer: (playList || []).length === 1 ? 0 : (timer === 0 ? 60 : timer),
        playList,playId, cbErr: () => message.error('请输入10秒的倍数')
      }
    })
  };

  handleSubmit = async () => {
    this.setState({
      modalLoading: true
    })
    const values = await this.validateFields()
    if (!_.trim(values.title)) {
      message.warn('主题名称不能为空')
      this.setState({
        modalLoading: false
      })
      return
    }
    const res = await Fetch.post('/app/screenLiveControl/create-theme', values)
    if (res.success) {
      message.success('添加成功')
      this.getThemeList()
      this.createThemeModal(false)
    } else {
      message.error(res.message)
    }
    this.setState({
      modalLoading: false
    })
  }

  renderCreateThemeModal = () => {
    const { createThemeVisible, modalLoading } = this.state
    const { getFieldDecorator } = this.props.form

    const formItemLayout = {
      labelCol: { span: 6 },
      wrapperCol: { span: 16 }
    }

    const footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={() => this.createThemeModal(false)}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={modalLoading ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={() => this.handleSubmit()}
        >{modalLoading ? '...提交中' : '提交'}</Button>
      </div>
    )

    return (
      <Modal
        title="提示"
        visible={createThemeVisible}
        destroyOnClose
        onCancel={() => this.createThemeModal(false)}
        footer={footer}
      >
        <h3 className="aligncenter">是否创建新的主题？</h3>
        <Form layout="horizontal">
          <FormItem {...formItemLayout} label="主题名称" hasFeedback>
            {
              getFieldDecorator('title', {
                initialValue: '',
                rules: [
                  {
                    required: true,
                    message: '需要填写主题名称'
                  },
                  {
                    whitespace: true,
                    message: '需要填写主题名称'
                  },
                  {
                    max: 30,
                    message: '不能超过30个字符'
                  }
                ]
              })(
                <Input placeholder="请输入主题名称" />
              )
            }
          </FormItem>
        </Form>
      </Modal>
    )
  }

  renderLogger = (activeKey) => {
    if (activeKey === '3') return <LiveScreenControlLogger/>
  }
  
  renderTabBarExtraContent = () => {
    let {visiblePopoverKey, sharingUrl, location} = this.props
    if (_.get(location, 'query.hideTopNavigator')) {
      return null
    }
    const visible = visiblePopoverKey === 'inspect-qr-image'
    let popoverContent = sharingUrl ? (
      <QrCode style={{width: '300px', height: '300px'}} url={sharingUrl} />
    ) : (
      <div style={{width: '300px', height: '300px'}} className="relative">
        <LoadingOutlined className="center-of-relative font20" />
      </div>
    )
    return (
      <Popover
        content={popoverContent}
        title="请扫码查看"
        trigger="click"
        placement="bottomRight"
        visible={visible}
        onVisibleChange={visible => {
          this.props.dispatch({
            type: `${namespace}/updateState`,
            payload: prevState => ({...prevState, visiblePopoverKey: visible ? 'inspect-qr-image' : ''})
          })
          if (visible && !sharingUrl) {
            this.props.dispatch({
              type: `${namespace}/asyncGenSharingUrl`
            })
          }
        }}
      >
        <span>在平板上查看</span>
      </Popover>
    )
  }

  renderScreenSetting = () => {
    let {screenControlNum, screenOption} = this.props
    let {setScreenNum} = this.state
    let val = setScreenNum === 0 ? +screenControlNum : setScreenNum

    return (
      <Popconfirm
        placement="bottomRight"
        title={<div>
          轮播屏幕数量: <InputNumber 
            min={1} 
            max={10} 
            value={val} 
            onChange={(val) => {
              this.setState({setScreenNum: +val})
            }}
          />
        </div>}
        onConfirm={() => {
          if(val === +screenControlNum) {
            this.setState({setScreenNum: +screenControlNum})
            return message.warning('没有改变，无需设置')
          }
          if (val < (_.get(screenOption, 'screenInfos.screens', [])).length) {
            this.setState({setScreenNum: +screenControlNum})
            return message.warning('目前打开的屏幕数大于设置的数量，无法设置，请先删除屏幕')
          }
          this.props.dispatch({
            type: `${namespace}/updateScreenGlobalConfig`,
            payload: val
          })
        }}
        onCancel={() => {
          this.setState({setScreenNum: +screenControlNum})
        }}
        okText="确定"
        icon=""
        overlayClassName="screen-setting"
        cancelText="取消"
      >
        <Button style={{marginRight: '18px'}}>屏幕设置</Button>
      </Popconfirm>
    )
  }

  render() {
    const { activeKey } = this.state
    const { themeList = [], screenOption = {}, screenArr, jwtSign, 
      playTimeInSeconds, playList, timer, screenControlNum, screenInfos } = this.props
    // const isMobile = window.location.search
    return (
      <div
        id="livescreen-control-tabs"
        className="width-100 height-100"
      >
        {renderPageTitle('大屏投影')}
        <Tabs
          defaultActiveKey="1"
          activeKey={activeKey}
          onChange={(activeKey) => {
            this.setState({activeKey})
            if (activeKey === '1') {
              this.getThemeList()
            }
          }
          }
          className="height-100"
          // tabBarExtraContent={this.renderTabBarExtraContent()}
          tabBarExtraContent={this.renderScreenSetting()}
        >
          <TabPane tab="大屏投影管理" key="1" >
            <LiveScreenController
              screenOption={screenOption}
              themeList={themeList}
              dispatch={this.props.dispatch}
              onScreenOptionChange={nextScreenOpt => {
                return this.props.dispatch({
                  type: `${namespace}/getScreenControllerState`,
                  payload: {screenOption: nextScreenOpt}
                })
              }}
              handleBroadCast={this.handleBroadCast}
              type="livescreenStyleChange"
              jwtSign={jwtSign}
              liveScreens={screenArr}
              playTimeInSeconds={playTimeInSeconds}
              playList={playList}
              timer={timer}
              onThemeChanged={this.onThemeChanged}
              onIndexChanged={this.onIndexChanged}
              onTimerChanged={this.onTimerChanged}
              onSubmit={this.onSubmit}
              renderTabBarExtraContent = {this.renderTabBarExtraContent}
              screenControlNum={screenControlNum}
              screenInfos={screenInfos}
            />
          </TabPane>
          {!canQueryTheme ? null : (
            <TabPane
              tab="投影主题管理"
              key="4"
              className="height-100"
            >
              {
                activeKey != 4 ? <div /> :
                  <LiveScreenControlThemeManager
                    createTheme={this.createThemeModal}
                    themeList={themeList}
                    screenOption={screenOption}
                    dispatch={this.props.dispatch}
                    getThemeList={this.getThemeList}
                    screenArr={screenArr}
                    updateTheme={this.updateTheme}
                    changeThemeTimeRange={this.changeThemeTimeRange}
                    deleteTheme={this.deleteTheme}
                    screenControlNum={screenControlNum}
                  />

              }
            </TabPane>
          )}
         
          {/*{!canQueryLog ? null : (*/}
          {/*  <TabPane tab="操作日志" key="5" >{this.renderLogger(activeKey)}</TabPane>*/}
          {/*)}*/}
        </Tabs>
        {this.renderCreateThemeModal()}
      </div>
    )
  }
}

export default createForm()(LiveScreenControllerIndex)
