import React from 'react'
import { DeleteOutlined, DesktopOutlined, PlusOutlined } from '@ant-design/icons';
import { Spin, Input, Tabs, Tooltip, Select, Button, Popconfirm } from 'antd';
import { connect } from 'react-redux'
import ScreenItem from './screenitem'
import AddScreenModal from './add-modal'
import { checkPermission } from '../../common/permission-control'
import Bread from '../Common/bread'
import _ from 'lodash'
import LiveScreenManager from './categoryManager/index'
import { withSizeProvider } from '../Common/size-provider'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import moment from 'moment'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import LiveScreenModle, { namespace } from './model'
import EditLiveScreenModal from './edit'

const canCreate = checkPermission('/app/livescreen/create')
const canCreateTemple = checkPermission('/app/livescreen/save/livescreenTemplate')
const TabPane = Tabs.TabPane

const { Search } = Input
const { Option } = Select

const LiveScreenType = {
  all: -1,
  draft: 0,
  check: 1
}

// const LiveScreenTypeTranslate = {
//   all: '全部',
//   draft: '我创建的',
//   check: '待我审核'
// }

const LiveScreenSort = {
  default: '默认',
  name: '按名字',
  createdAt: '按创建时间降序',
  upDatedAt: '按更新时间降序'
}

/**
 * 实时大屏列表
 * 
 * @class MyLiveScreen
 * @extends {React.Component}
 */
@connect(
  //TODO 分类
  state => ({ ...state[namespace], ...state['livescreenCategoryModel'] })
)
@withRuntimeSagaModel(LiveScreenModle)
class MyLiveScreen extends React.Component {

  changeState = (params) => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  renderChinaSouthernLiveScreenBtn() {
    return (
      <div className="screen">
        <div className="image-wrap">
          <img
            src="/_bc/sugo-analytics-extend-nh/assets/images/nhLiveScreen_thumb.jpg"
            alt="日志监控大屏"
          />
        </div>
        <div className="screen-bottom-wrap">
          <div className="screen_bottom">
            <p>日志监控大屏</p>
          </div>
          <div className="screen-actions-box">
            <div className="screenActions">
              <ul className="clearfix">
                <li>
                  <DesktopOutlined />
                  <a
                    href={`/_bc/sugo-analytics-extend-nh/assets/live-screen/monitor.html?project_id=&t=${Date.now()}`}
                    // eslint-disable-next-line react/jsx-no-target-blank
                    target={'_blank'}
                    style={{ color: 'inherit' }}
                  >
                    <span>预览</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  filterList = (list = []) => {
    const { selectType, filterKey } = this.props
    return list.filter(p => p.status !== 0 && (filterKey ? _.includes(p.title, filterKey) : true))
  }

  sortList = (data) => {
    const { sortType } = this.props
    if (sortType === 'name') {
      return data.sort((a, b) => a.title < b.title ? -1 : 1)
    }
    if (sortType === 'createdAt') {
      return data.sort((a, b) => {
        const ta = moment(a.created_at) + 0
        const tb = moment(b.created_at) + 0
        return ta.title < tb.title ? -1 : 1
      })
    }
    if (sortType === 'upDatedAt') {
      return data.sort((a, b) => {
        const ta = moment(a.updated_at) + 0
        const tb = moment(b.updated_at) + 0
        return ta.title < tb.title ? -1 : 1
      })
    }
    return data
  }

  addLivescreen = (params) => {
    this.props.dispatch({
      type: `${namespace}/addLiveScreen`,
      payload: params
    })
  }

  updateLivescreen = (params) => {
    this.props.dispatch({
      type: `${namespace}/updateLiveScreen`,
      payload: params
    })
  }

  deleteLivescreen = (params) => {
    this.props.dispatch({
      type: `${namespace}/removeLiveScreen`,
      payload: params
    })
  }

  deleteLivescreenPublish = (params) => {
    this.props.dispatch({
      type: `${namespace}/removeLiveScreenPublish`,
      payload: params
    })
  }
  

  recycleLiveScreen = (params) => {
    this.props.dispatch({
      type: `${namespace}/recycleLiveScreen`,
      payload: params
    })
  }

  cleanRecycle = () => {
    this.props.dispatch({
      type: `${namespace}/cleanRecycle`,
      payload: {}
    })
  }

  reductionLiveScreen = (params) => {
    this.props.dispatch({
      type: `${namespace}/reductionLiveScreen`,
      payload: params
    })
  }

  copyLiveScreen = (params) => {
    this.props.dispatch({
      type: `${namespace}/copyLiveScreen`,
      payload: params
    })
  }

  onDelAll = (data) => {
    const ids = data.filter(o => !o.is_template).map(p => p.id).join(',')
    this.props.dispatch({
      type: `${namespace}/removeLiveScreen`,
      payload: { id: ids }
    })
  }

  renderFilterPanel = (isTemplate, data, isPublish = false, isRecycle = false) => {
    const { selectType, sortType } = this.props
    let buttons = null
    if (isRecycle) {
      buttons = (<div style={{ display: 'inline-block', float: 'right', marginRight: '55px' }}>
        <Popconfirm
          title="删除后无法恢复是否确认删除？"
          onConfirm={() => this.cleanRecycle()}
        >
          <Button icon={<DeleteOutlined />} className="mg1l" size="default" >清空回收站</Button>
        </Popconfirm>
      </div>)
    }
    return (
      <React.Fragment>
        {/* {
          isTemplate
            ? null
            : <div className="" style={{ display: 'inline-block' }}>
              状态1:
              <Select value={selectType} className="mg2l width150" onChange={v => this.changeState({ selectType: v })}>
                {
                  _.keys(LiveScreenType).map(p => {
                    return <Option key={p} value={LiveScreenType[p]}>{LiveScreenTypeTranslate[p]}</Option>
                  })
                }
              </Select>
            </div>
        } */}
        <div className="mg2l" style={{ display: 'inline-block' }}>
          排序:
          <Select value={sortType} className="mg2l width150" onChange={v => this.changeState({ sortType: v })}>
            {
              _.keys(LiveScreenSort).map(p => {
                return <Option key={`op_${p}`} value={p}>{LiveScreenSort[p]}</Option>
              })
            }
          </Select>
        </div>
        <div className="mg2l" style={{ display: 'inline-block' }}>
          <Search
            placeholder="按大屏名字搜索"
            style={{ width: 200 }}
            onSearch={value => this.changeState({ filterKey: value })}
          />
        </div>
        {
          buttons
        }
      </React.Fragment>
    )
  }

  renderMyLivescreenPanel = withSizeProvider(({ spWidth }) => {
    const { selectedCategoryId, selectType, list = [] } = this.props
    let data = this.filterList(list.filter(p => !p.is_template))
    data = this.sortList(data)
    const isShow = _.get(window, 'sugo.chinaSouthernLiveScreen', false)
    return (
      <HorizontalSplitHelper style={{ height: 'calc(100vh - 164px)', width: 'calc(100% - 180px)' }}>
        <div defaultWeight={5} className="height-100 borderr">
          <div className="bg-white height-100 corner">
            <LiveScreenManager
              refreshData={() => this.props.dispatch({
                type: `${namespace}/queryList`,
                payload: {}
              })}
            />
          </div>
        </div>
        <div
          defaultWeight={25}
          className="height-100 scroll-content always-display-scrollbar"
        >
          <div className="pd2l borderb pd2b mg1b">
            {this.renderFilterPanel(false, data)}
          </div>
          <div className="corner bg-white  pd2l" style={{ height: 'calc(100vh - 219px)' }}>
            {
              canCreate
                ? (
                  <div
                    className="screen"
                    onClick={() => {
                      this.changeState({ addType: 0, addModalVisible: true })
                    }}
                  >
                    <a className="screen_new_link">
                      <PlusOutlined />
                      <span>新建实时大屏</span>
                    </a>
                  </div>
                ) : null
            }
            {
              data.filter(p => {
                const categoryId = _.get(p, 'category_id', '')
                if(p.is_template) {
                  return false
                }
                if(selectedCategoryId === undefined) {
                  return true
                }
                return categoryId === selectedCategoryId
              }).map(screen => (
                <ScreenItem
                  key={`s_${selectType}_${screen.id}`}
                  recycle={false}
                  {...screen}
                  changeState={this.changeState}
                  deleteLivescreen={this.deleteLivescreen}
                  reductionLiveScreen={this.reductionLiveScreen}
                  recycleLiveScreen={this.recycleLiveScreen}
                  copyLiveScreen={this.copyLiveScreen}
                />
              ))
            }
            {isShow && selectedCategoryId === 'default' ? this.renderChinaSouthernLiveScreenBtn() : null}
          </div>
        </div>
      </HorizontalSplitHelper>
    );
  })

  renderMyLivescreenPublishPanel = withSizeProvider(({ spWidth }) => {
    const { selectedCategoryId, selectType, publishList = [] } = this.props
    let data = this.filterList(publishList.filter(p => !p.is_template))
    data = this.sortList(data)
    const isShow = _.get(window, 'sugo.chinaSouthernLiveScreen', false)
    return (
      <HorizontalSplitHelper style={{ height: 'calc(100vh - 164px)', width: 'calc(100% - 180px)' }}>
        <div defaultWeight={5} className="height-100 borderr">
          <div className="bg-white height-100 corner">
            <LiveScreenManager hideOperation />
          </div>
        </div>
        <div
          defaultWeight={25}
          className="height-100 scroll-content always-display-scrollbar"
        >
          <div className="pd2l borderb pd2b mg1b">
            {this.renderFilterPanel(false, [], true)}
          </div>

          <div className="corner bg-white  pd2l" style={{ height: 'calc(100vh - 219px)' }}>
            {
              data.filter(p => {
                const categoryId = _.get(p, 'category_id', '')
                if(p.is_template) {
                  return false
                }
                if(selectedCategoryId === undefined) {
                  return true
                }
                return categoryId === selectedCategoryId
              }).map(screen => (
                <ScreenItem
                  key={`s_${selectType}_${screen.id}`}
                  recycle={false}
                  isPublish
                  {...screen}
                  changeState={this.changeState}
                  deleteLivescreen={this.deleteLivescreen}
                  reductionLiveScreen={this.reductionLiveScreen}
                  recycleLiveScreen={this.recycleLiveScreen}
                  copyLiveScreen={this.copyLiveScreen}
                />
              ))
            }
            {isShow && selectedCategoryId === 'default' ? this.renderChinaSouthernLiveScreenBtn() : null}
          </div>
        </div>
      </HorizontalSplitHelper>)
  })

  renderRecyclePanel = withSizeProvider(({ spWidth }) => {
    const { selectedCategoryId, selectType, list = [], publishList = [], filterKey } = this.props
    let data = list.filter(p => p.status === 0 && (filterKey ? _.includes(p.title, filterKey) : true))
    data = _.concat(data, publishList.filter(p => p.status === 0 && (filterKey ? _.includes(p.title, filterKey) : true)).map(p => ({ ...p, isPublish: true })))
    data = this.sortList(data)
    return (
      <HorizontalSplitHelper style={{ height: 'calc(100vh - 164px)', width: 'calc(100% - 180px)' }}>
        <div
          defaultWeight={25}
          className="height-100 scroll-content always-display-scrollbar"
        >
          <div className="pd2l borderb pd2b mg1b">
            {this.renderFilterPanel(false, data, false, true)}
          </div>

          <div className="corner bg-white pd2l" style={{ height: 'calc(100vh - 219px)' }}>
            {
              data.map(screen => (
                <ScreenItem
                  key={`s_${selectType}_${screen.id}`}
                  recycle
                  isPublish={screen.isPublish || false}
                  {...screen}
                  hideEdit //回收站不可编辑标题
                  changeState={this.changeState}
                  deleteLivescreen={screen.isPublish ? this.deleteLivescreenPublish : this.deleteLivescreen}
                  reductionLiveScreen={this.reductionLiveScreen}
                  recycleLiveScreen={this.recycleLiveScreen}
                  copyLiveScreen={this.copyLiveScreen}
                />
              ))
            }
          </div>
        </div>
      </HorizontalSplitHelper>)
  })

  renderTemplatePanel = () => {
    const { selectType, list = [] } = this.props
    let data = this.filterList(list.filter(p => p.is_template))
    data = this.sortList(data)
    return (<div className="height-100 scroll-content always-display-scrollbar"    >
      <div className="pd2l borderb pd2b mg1b">
        {this.renderFilterPanel(true)}
      </div>

      <div className="corner bg-white  pd2l" style={{ height: 'calc(100vh - 219px)', width: 'calc(100% - 180px)' }}>
        {
          data.map(screen => (
            <ScreenItem
              showEdit={selectType === LiveScreenType.check}
              key={`s_${selectType}_${screen.id}`}
              recycle={false}
              {...screen}
              changeState={this.changeState}
              deleteLivescreen={this.deleteLivescreen}
              reductionLiveScreen={this.reductionLiveScreen}
              recycleLiveScreen={this.recycleLiveScreen}
              copyLiveScreen={this.copyLiveScreen}
            />
          ))
        }
      </div>
    </div>)
  }

  renderTemplatePublishPanel = () => {
    const { selectType, publishList = [] } = this.props
    let data = this.filterList(publishList.filter(p => p.is_template))
    data = this.sortList(data)
    return (<div className="height-100 scroll-content always-display-scrollbar"    >
      <div className="pd2l borderb pd2b mg1b">
        {this.renderFilterPanel(true)}
      </div>

      <div className="corner bg-white  pd2l" style={{ height: 'calc(100vh - 219px)' , width: 'calc(100% - 180px)'}}>
        {
          data.map(screen => (
            <ScreenItem
              showEdit={selectType === LiveScreenType.check}
              key={`s_${selectType}_${screen.id}`}
              recycle={false}
              isPublish
              {...screen}
              changeState={this.changeState}
              deleteLivescreen={this.deleteLivescreen}
              reductionLiveScreen={this.reductionLiveScreen}
              recycleLiveScreen={this.recycleLiveScreen}
              copyLiveScreen={this.copyLiveScreen}
            />
          ))
        }
      </div>
    </div>)
  }

  render() {
    const { loading, list = [], publishList = [], categoryList, selectedCategoryId, addModalVisible, addType, editLiveScreenVisible, editId } = this.props
    return (
      <div className="height-100">
        <Bread
          path={[{ name: '实时大屏' }]}
          extra={(
            <div className="mg2l">温馨提示:请使用谷歌 Chrome 浏览器版本 5.0 以上，暂时不支持 Safari、360、IE 等其他任何浏览器。</div>
          )}
        />
        <div className="pd2l screen-list-box clearfix" style={{ height: 'calc(100% - 44px)' }}>
          <Spin spinning={loading}>
            <div className="left-wrap">
              <div className="screen-list">
                <Tabs defaultActiveKey="livescreen" onChange={() => this.changeState({ filterKey: '' })}>
                  <TabPane tab="我的大屏" key="livescreen">
                    {this.renderMyLivescreenPanel()}
                  </TabPane>
                  <TabPane tab="已发布大屏" key="livescreenPublish">
                    {this.renderMyLivescreenPublishPanel()}
                  </TabPane>
                  {
                    canCreateTemple
                      ? <TabPane tab="公共模板" key="livescreenTemplate">
                        {this.renderTemplatePanel()}
                      </TabPane>
                      : null
                  }
                  {
                    canCreateTemple
                      ? <TabPane tab="已发布模板" key="livescreenTemplatePublish">
                        {this.renderTemplatePublishPanel()}
                      </TabPane>
                      : null
                  }
                  <TabPane tab="回收站" key="livescreenRecycle">
                    {this.renderRecyclePanel()}
                  </TabPane>
                </Tabs>
                <AddScreenModal
                  selectedCategoryId={selectedCategoryId}
                  categoryList={categoryList}
                  addType={addType}
                  data={publishList.filter(p => p.is_template && p.status !== 0)}
                  visible={addModalVisible}
                  addLivescreen={this.addLivescreen}
                  hideModal={() => this.changeState({ addModalVisible: false })}
                />
                <EditLiveScreenModal
                  visible={editLiveScreenVisible}
                  categoryList={categoryList}
                  hideModal={() => this.changeState({ editLiveScreenVisible: false })}
                  updateLivescreen={this.updateLivescreen}
                  livescreen={list.find(p => p.id === editId) || {}}
                />
              </div>
            </div>
            <div className="pd2b" style={{ clear: 'left' }}>{'\u00a0' /* 底部留白 */}</div>
          </Spin>
        </div>
      </div>
    )
  }
}

export default MyLiveScreen
