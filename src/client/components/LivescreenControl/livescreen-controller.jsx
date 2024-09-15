import React from 'react'
import { CloseCircleFilled, DisconnectOutlined, LinkOutlined, StepBackwardOutlined, StepForwardOutlined, TagFilled } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Card, Menu, Modal, Tooltip, Button, Select, InputNumber, message } from 'antd'
import _ from 'lodash'
import { immutateUpdate, isDiffByPath, move } from '../../../common/sugo-utils'
import UploadedImageViewer from '../Common/uploaded-image-viewer'
import Rect from '../Common/react-rectangle'
import DefaultLivesrceen from './img/default-livescreen.jpg'
import NoLinkLivesrceen from './img/no-link-livescreen.jpg'
import { Anchor } from '../Common/anchor-custom'

class LiveScreenController extends React.Component {
  constructor() {
    super()
    this.state = {
      screenNum: 5,
      selectedThemeId: undefined
    }
    this.menu = () => (
      <Menu style={{ height: '100px', overflowY: 'scroll' }}>
        {_.range(61).map((minute, idx) => (
          <Menu.Item
            key={minute + idx}
            onClick={() => {
              this.props.handleChange({ operate: '自动切换时间间隔', content: `自动切换时间间隔调整为${minute + 1}分钟`, minute })
            }}
          >
            {minute} 分钟
          </Menu.Item>
        ))}
      </Menu>
    )
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(prevProps, this.props, 'screenOption.current_theme_id')) {
      this.setState({ selectedThemeId: undefined })
    }
  }

  renderCardBar = () => {
    const { themeList, screenOption, jwtSign, liveScreens, playTimeInSeconds } = this.props
    let screens = _.get(screenOption, 'screenInfos.screens', [])
    if (_.isEmpty(screens)) {
      return <div className='text-center font18 elli'>目前没有打开大屏</div>
    }

    let currTheme = _.find(themeList, { id: _.get(screenOption, 'current_theme_id') })
    let timer = _.get(currTheme, 'timer')
    const themePagePlayIntervalInSeconds = timer === 0 || timer === null ? 0 : timer
    const themePageCount = _.size(_.get(currTheme, 'contains'))
    const themePageIdx = themePagePlayIntervalInSeconds === 0 ? 0 : Math.floor(playTimeInSeconds / themePagePlayIntervalInSeconds) % themePageCount
    return screens.map((si, idx) => {
      const { uid, online } = si
      const currLiveScreenId = _.get(currTheme, `contains.${[themePageIdx]}.${idx}`)
      const currLiveScreen = _.find(liveScreens, ls => ls.id === currLiveScreenId)
      // const lsTitle = currLiveScreen ? currLiveScreen.title : online && _.isEmpty(currLiveScreen) ? '空白大屏': '未投影'
      const lsTitle = !online ? '未投影' : currLiveScreen ? currLiveScreen.title : '空白大屏'
      return (
        <div key={lsTitle + idx} className='livescreen-control-top-card-list-box relative' title={lsTitle}>
          <div className='livescreen-control-top-card-list-title'>
            <div className='itblock elli mw-70'>
              <TagFilled style={{ color: '#6969D7' }} />
              <span>
                {idx + 1}号屏
                <span style={{ color: !online ? 'red' : currLiveScreen ? '#6969D7' : 'black' }}>{lsTitle}</span>
              </span>
            </div>
            <div className='absolute top0' style={{ right: '6px' }}>
              {online ? null : (
                <React.Fragment>
                  <Tooltip title='重新打开链接'>
                    <span
                      className='pointer border corner'
                      style={{ color: '#6969D7', padding: '4px 6px', marginRight: '3px' }}
                      onClick={() => {
                        let url = `${location.origin}/live-screen-broadcast-terminal?jwtSign=${jwtSign}&uid=${uid}`
                        window.open(url)
                      }}
                    >
                      打开
                    </span>
                  </Tooltip>
                  <CloseCircleFilled
                    className='pointer'
                    style={{ color: '#6969D7' }}
                    onClick={() => {
                      Modal.confirm({
                        title: '确认移除屏幕？',
                        content: '下一个的屏幕将播放此大屏的内容，下下个屏幕将播放下个屏幕的内容，以此类推',
                        okText: '确认',
                        okType: 'danger',
                        cancelText: '取消',
                        onOk: async () => {
                          await this.props.onScreenOptionChange(immutateUpdate(screenOption, 'screenInfos.screens', arr => arr.filter((s, i) => i !== idx)))
                          this.props.handleBroadCast()
                        }
                      })
                    }}
                  />
                </React.Fragment>
              )}
            </div>
          </div>
          <div className='livescreen-control-top-card-list-content relative hover-display-trigger'>
            {online && currLiveScreen && (currLiveScreen.cover_image_id || currLiveScreen.background_image_id) ? (
              <Rect aspectRatio={16 / 9} style={{ overflow: 'hidden' }}>
                <UploadedImageViewer uploadedImageId={currLiveScreen.cover_image_id || currLiveScreen.background_image_id} className='width-100 center-of-relative' />
              </Rect>
            ) : (
              <div
                style={{
                  paddingTop: '56.25%',
                  backgroundImage: online ? `url(${DefaultLivesrceen})` : `url(${NoLinkLivesrceen})`,
                  backgroundSize: 'cover',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            )}

            {idx === 0 ? null : (
              <div
                className='vertical-center-of-relative hover-display pointer font20'
                title={`设为 ${idx} 号屏`}
                style={{
                  background: '#fff',
                  borderRadius: '10px',
                  padding: '5px 10px',
                  left: '-5px'
                }}
                onClick={async () => {
                  const nextState = immutateUpdate(screenOption, 'screenInfos.screens', arr => move(arr, idx, idx - 1))
                  await this.props.onScreenOptionChange(nextState)
                  this.props.handleBroadCast()
                }}
              >
                <StepBackwardOutlined />
              </div>
            )}

            {idx === screens.length - 1 ? null : (
              <div
                className='vertical-center-of-relative hover-display pointer font20'
                title={`设为 ${idx + 2} 号屏`}
                style={{
                  background: '#fff',
                  borderRadius: '10px',
                  padding: '5px 10px',
                  right: '-5px'
                }}
                onClick={async () => {
                  const nextState = immutateUpdate(screenOption, 'screenInfos.screens', arr => move(arr, idx, idx + 1))
                  await this.props.onScreenOptionChange(nextState)
                  this.props.handleBroadCast()
                }}
              >
                <StepForwardOutlined />
              </div>
            )}
          </div>
          <div className='livescreen-control-top-card-list-footer'>
            <div className='fright' style={{ color: '#6969D7' }}>
              {online ? (
                <React.Fragment>
                  <LinkOutlined />
                  <span className='mg1l'>已链接</span>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <DisconnectOutlined style={{ color: 'rgba(149, 149, 149, 1)' }} />
                  <span style={{ color: 'rgba(149, 149, 149, 1)' }} className='mg1l'>
                    断开链接
                  </span>
                </React.Fragment>
              )}
            </div>
          </div>
        </div>
      )
    })
  }

  renderPlayList = () => {
    const { themeList = [], playList = [], timer, screenOption, onThemeChanged, onTimerChanged, onSubmit } = this.props
    const options = themeList.map(item => ({ ...item, value: item.id }))
    const dataSource = playList.map((item, index) => ({ ...item, key: index }))
    const layout = {
      labelCol: { span: 9 },
      wrapperCol: { span: 15 }
    }
    const tailLayout = {
      wrapperCol: { offset: 9, span: 15 }
    }
    return (
      <div style={{ width: '500px', margin: '0 auto' }}>
        <Form name='basic'>
          <Form.Item {...layout} label='选择主题'>
            <Select
              showSearch
              allowClear
              placeholder='请选择轮播主题'
              optionFilterProp='children'
              onChange={value => {
                onThemeChanged(value)
              }}
              mode='multiple'
              value={playList.map(p => p.id) || screenOption.currentThemes}
              getPopupContainer={triggerNode => triggerNode.parentNode}
            >
              {options.map(({ title, value }, index) => (
                <Select.Option key={title + index} value={value}>
                  {title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {dataSource.length > 1 ? (
            <Form.Item {...layout} label='设置主题切换时间（秒）' required>
              <InputNumber min={10} step={10} precision={0} defaultValue={timer || 60} tyle={{ width: '100%' }} onChange={onTimerChanged} placeholder={'请输入10的倍数'} />
            </Form.Item>
          ) : null}
          <Form.Item {...tailLayout}>
            <Button type='primary' onClick={onSubmit}>
              确定投屏
            </Button>
            {/* {
              false ? <Popconfirm
                title="取消投屏?"
                onConfirm={()=>{handleBroadCast('all')}}
                okText="确定"
                cancelText="取消"
              >
                <Button type="danger" style={{marginLeft: 64}} >取消投屏</Button>
              </Popconfirm>
                : null
            } */}
          </Form.Item>
        </Form>
      </div>
    )
  }

  render() {
    let { jwtSign, screenControlNum, screenOption } = this.props
    let url = `${location.origin}/live-screen-broadcast-terminal?jwtSign=${jwtSign}`
    return (
      <div style={{ height: 'calc(100vh - 95px)', paddingTop: '8px', backgroundColor: '#E4EAEF', overflowY: 'auto' }}>
        <Card
          headStyle={{ padding: 0 }}
          title={
            <div className='mg2x' style={{ height: '44px', lineHeight: '44px' }}>
              已经打开的大屏
              <Anchor
                className='fright font12'
                target='_blank'
                onClick={() => {
                  if (screenControlNum <= _.get(screenOption, 'screenInfos.screens', []).length) {
                    return message.warning('已经是最大的屏幕数，无法继续添加')
                  }
                  window.open(url)
                }}
              >
                添加屏幕
              </Anchor>
              <a className='fright font12 mg2r'>{this.props.renderTabBarExtraContent()}</a>
            </div>
          }
          bordered
          className='mg2x'
        >
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>{this.renderCardBar()}</div>
        </Card>
        <Card
          headStyle={{ padding: 0 }}
          title={
            <div className='mg2x' style={{ height: '44px', lineHeight: '44px' }}>
              实时投影控制
            </div>
          }
          bordered
          className='mg2x mg2y relative fix'
        >
          {this.renderPlayList()}
        </Card>
      </div>
    )
  }
}

export default LiveScreenController
