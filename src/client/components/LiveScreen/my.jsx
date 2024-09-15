import React from 'react'
import { DeleteOutlined, DesktopOutlined, PlusOutlined, RollbackOutlined } from '@ant-design/icons'
import { Spin, Input, Tabs, message, Table, Tooltip, Modal, Select, Button, Popconfirm } from 'antd'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from './actions'
import ScreenItem from './screenitem'
import AddScreenModal from './add-modal'
import { checkPermission } from '../../common/permission-control'
import Bread from '../Common/bread'
import _ from 'lodash'
import LiveScreenManager from './categoryManager/index'
import { withSizeProvider } from '../Common/size-provider'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import Fetch from '../../common/fetch-final'
import moment from 'moment'
import { SharingTypeEnum, EXAMINE_STATUS } from '../../../common/constants'
import QrCode from '../Common/qr-code'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import ChangeGroung from './changeGround'
import { Anchor } from '../Common/anchor-custom'

const canCreate = checkPermission('/app/livescreen/create')
const canDelShares = checkPermission('delete:/app/sharing/:id')
const TabPane = Tabs.TabPane
const durationFormat = metricValueFormatterFactory('duration-complete')

const { Search } = Input
const { Option } = Select

const LiveScreenType = {
  all: -1,
  draft: 0,
  check: 1
}

const LiveScreenTypeTranslate = {
  all: '全部',
  draft: '我创建的',
  check: '待我审核'
}

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
@connect(state => ({ ...state.livescreen, ...state['livescreenCategoryModel'] }), dispatch => bindActionCreators(actions, dispatch))
class MyLiveScreen extends React.Component {
  state = {
    addModalVisible: false,
    addType: 0,
    categoryList: [],
    selectedCategoryId: '',
    shares: [],
    selectType: LiveScreenType.all,
    filterKey: '',
    sortType: 'default',
    recycle: false,
    changeGroungVisible: false
  }

  componentDidMount() {
    const { doGetLiveScreens } = this.props
    doGetLiveScreens()
    this.getShares()
  }

  getShares = async () => {
    const res = await Fetch.get('/app/sharing-by-user')
    if (res && res.result) {
      this.setState({ shares: res.result })
    } else {
      message.error('获取分享信息失败')
    }
  }

  doCreate = whichModal => {
    this.setState({
      [whichModal]: true
    })
  }

  hideModal = whichModal => {
    this.setState({
      [whichModal]: false
    })
  }

  renderChinaSouthernLiveScreenBtn() {
    return (
      <div className='screen'>
        <div className='image-wrap'>
          <img src='/_bc/sugo-analytics-extend-nh/assets/images/nhLiveScreen_thumb.jpg' alt='日志监控大屏' />
        </div>
        <div className='screen-bottom-wrap'>
          <div className='screen_bottom'>
            <p>日志监控大屏</p>
          </div>
          <div className='screen-actions-box'>
            <div className='screenActions'>
              <ul className='clearfix'>
                <li>
                  <DesktopOutlined />
                  <Anchor href={`/_bc/sugo-analytics-extend-nh/assets/live-screen/monitor.html?project_id=&t=${Date.now()}`} target='_blank' style={{ color: 'inherit' }}>
                    <span>预览</span>
                  </Anchor>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  showQrCode = ev => {
    let preShareId = ev.target.getAttribute('data-share-id')
    Modal.info({
      title: '您可以用手机扫码查看',
      content: <QrCode url={`${location.origin}/share/${preShareId}`} />,
      onOk() {}
    })
  }

  onDeleteSharingClick = e => {
    let preDelId = e.target.getAttribute('data-share-id')
    if (!preDelId) {
      return
    }
    Modal.confirm({
      title: '确认取消此分享？',
      content: '下次再启用分享时，分享链接会发生变化',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        const res = await Fetch.delete(`/app/sharing/${preDelId}`)
        this.getShares()
      },
      onCancel() {}
    })
  }

  renderMyPublish = () => {
    let { shares } = this.state
    // let userDict = _.keyBy(users, 'id')

    const maxAgeTranslateDict = {
      unlimited: '无限制',
      P1D: '一天',
      P7D: '七天'
    }

    const restrictionsDict = {
      1: '密码验证',
      2: '机构权限验证'
    }

    const columns = [
      {
        title: '分享内容名称',
        dataIndex: 'params.shareContentName',
        key: 'params.shareContentName'
      },
      {
        title: '分享有效期',
        dataIndex: 'max_age',
        key: 'max_age',
        render: val => {
          return maxAgeTranslateDict[val] || '未知'
        }
      },
      {
        title: '类型',
        dataIndex: 'content_type',
        key: 'content_type',
        render: val => {
          return val === SharingTypeEnum.LiveScreen ? '分享' : '发布'
        }
      },
      {
        title: '剩余有效期',
        dataIndex: 'remain_age',
        key: 'remain_age',
        render: (val, record) => {
          let max_age = (record && record.max_age) || 'unlimited'
          let remainAgeInSec = max_age === 'unlimited' ? 'unlimited' : moment.duration(max_age).asSeconds() - moment().diff(record.created_at || Date.now(), 's')

          if (max_age === 'unlimited') {
            return ''
          }
          return remainAgeInSec <= 0 ? '已失效' : durationFormat(remainAgeInSec)
        }
      },
      {
        title: '验证方式',
        dataIndex: 'restrictionsContent',
        key: 'restrictionsContent',
        render: (val, record) => {
          let restrictions = _.get(record, 'params.restrictionsContent.type', '')
          return restrictionsDict[restrictions] || '无限制'
        }
      },
      // {
      //   title: '分享者',
      //   dataIndex: 'created_by',
      //   key: 'created_by',
      //   render: (val) => {
      //     const { first_name, username } = userDict[val] || {}
      //     return first_name ? `${first_name}(${username})` : username
      //   }
      // },
      {
        title: '分享时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render: val => {
          return moment(val).format('YYYY-MM-DD HH:mm:ss ddd')
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        render: (val, record) => {
          return (
            <React.Fragment>
              <Anchor className='color-main' href={`${location.origin}/share/${val}`} target='_blank'>
                查看分享内容
              </Anchor>
              {record.content_type !== SharingTypeEnum.Dashboard ? null : (
                <Anchor className='color-main mg2l pointer' target='_blank' onClick={this.showQrCode} data-share-id={val}>
                  扫码分享
                </Anchor>
              )}
              {!canDelShares ? null : (
                <span className='fpointer mg2l color-red' data-share-id={val} onClick={this.onDeleteSharingClick}>
                  取消分享
                </span>
              )}
            </React.Fragment>
          )
        }
      }
    ]
    return <Table className='mg2r' dataSource={shares} columns={columns} />
  }

  setChangeGroungVisible = () => {
    this.setState({
      changeGroungVisible: false
    })
  }

  renderMyLivescreenPanel = withSizeProvider(({ spWidth }) => {
    const { list = [], selectedCategoryId, categoryList = [] } = this.props
    const { selectType, filterKey, sortType, recycle, changeGroungVisible } = this.state
    let data = []
    if (recycle) {
      data = _.clone(list).filter(({ status }) => status === 0) // 过滤是回收站中的数据
    } else {
      switch (selectType) {
        case LiveScreenType.draft:
          data = list.filter(p => p.created_by === sugo.user.id)
          break
        case LiveScreenType.check:
          data = list.filter(p => p.examine === EXAMINE_STATUS.wait && p.created_by !== sugo.user.id)
          break
        default:
          data = list
          break
      }
      if (filterKey) {
        const rexp = new RegExp(filterKey)
        data = data.filter(({ title }) => rexp.test(title))
      }

      if (sortType === 'name') {
        data = _.clone(data).sort(({ title: a }, { title: b }) => {
          if (a < b) {
            return -1
          } else if (a > b) {
            return 1
          } else {
            return 0
          }
        })
      } else if (sortType === 'createdAt') {
        data = _.clone(data).sort(({ created_at: a }, { created_at: b }) => {
          const ta = new Date(a).getTime()
          const tb = new Date(b).getTime()
          if (ta > tb) {
            return -1
          } else if (ta < tb) {
            return 1
          } else {
            return 0
          }
        })
      } else if (sortType === 'upDatedAt') {
        data = _.clone(data).sort(({ updated_at: a }, { updated_at: b }) => {
          const ta = new Date(a).getTime()
          const tb = new Date(b).getTime()
          if (ta > tb) {
            return -1
          } else if (ta < tb) {
            return 1
          } else {
            return 0
          }
        })
      }
      data = _.clone(data).filter(({ status }) => status !== 0) // 过滤是回收站中的数据
    }

    const isShow = _.get(window, 'sugo.chinaSouthernLiveScreen', false)
    return (
      <HorizontalSplitHelper style={{ height: 'calc(100vh - 164px)', width: 'calc(100%)' }}>
        <div defaultWeight={275} className='height-100 borderr'>
          <div className='bg-white height-100 corner'>
            <LiveScreenManager />
          </div>
        </div>
        <div defaultWeight={spWidth - 255} className='height-100 scroll-content always-display-scrollbar'>
          <div className='pd2l borderb pd2b mg1b'>
            {recycle ? (
              <div className='' style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className='mg2l mg2r' style={{ display: 'inline-block' }}>
                    <Tooltip title='返回'>
                      <Button type='dashed' icon={<RollbackOutlined />} size='default' onClick={() => this.setState({ recycle: false })} />
                    </Tooltip>
                  </div>
                  <span>大屏回收站</span>
                </div>
                <div>
                  <Popconfirm title='删除后无法恢复，确定清空回收站？' onConfirm={() => this.onDelAll(data)}>
                    <Tooltip title='清空回收站'>
                      <DeleteOutlined className='font16 color-red mg4r' style={{ lineHeight: '32px' }} />
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
            ) : (
              <React.Fragment>
                <div className='' style={{ display: 'inline-block' }}>
                  <div className='mg2x' style={{ display: 'inline-block' }}>
                    修改分组：
                    <Button
                      onClick={() => {
                        this.setState({
                          changeGroungVisible: true
                        })
                      }}
                    >
                      修改分组
                    </Button>
                    <ChangeGroung
                      changeGroungVisible={changeGroungVisible}
                      categoryList={categoryList}
                      selectedCategoryId={selectedCategoryId}
                      setChangeGroungVisible={this.setChangeGroungVisible}
                      {...this.props}
                    />
                  </div>
                  状态:
                  <Select value={selectType} className='mg2l width150' onChange={v => this.setState({ selectType: v })}>
                    {_.keys(LiveScreenType).map(p => {
                      return (
                        <Option key={p} value={LiveScreenType[p]}>
                          {LiveScreenTypeTranslate[p]}
                        </Option>
                      )
                    })}
                  </Select>
                </div>
                <div className='mg2l' style={{ display: 'inline-block' }}>
                  排序:
                  <Select value={sortType} className='mg2l width150' onChange={v => this.setState({ sortType: v })}>
                    {_.keys(LiveScreenSort).map(p => {
                      return (
                        <Option key={`op_${p}`} value={p}>
                          {LiveScreenSort[p]}
                        </Option>
                      )
                    })}
                  </Select>
                </div>
                <div className='mg2l' style={{ display: 'inline-block' }}>
                  <Search placeholder='按大屏名字搜索' style={{ width: 200 }} onSearch={value => this.setState({ filterKey: value })} />
                </div>
              </React.Fragment>
            )}
            {recycle ? null : (
              <div style={{ display: 'inline-block', float: 'right', marginRight: '55px' }}>
                <Tooltip title='大屏回收站'>
                  <Button type='dashed' icon={<DeleteOutlined />} size='default' onClick={() => this.setState({ recycle: true })} />
                </Tooltip>
              </div>
            )}
          </div>

          <div className='corner bg-white' style={{ height: 'calc(100vh - 219px)' }}>
            {canCreate && (selectType === -1 || selectType === 0) && !recycle ? (
              <div
                className='screen'
                onClick={() => {
                  this.doCreate('addModalVisible')
                  this.setState({ addType: 0 })
                }}
              >
                <a className='screen_new_link pointer'>
                  <PlusOutlined />
                  <span>新建实时大屏</span>
                </a>
              </div>
            ) : null}
            {data
              .filter(p => {
                return !p.is_template && (!selectedCategoryId || _.get(p, 'category_id', '') === (selectedCategoryId === 'default' ? '' : selectedCategoryId))
              })
              .map(screen => (
                <ScreenItem showEdit={selectType === LiveScreenType.check} key={`s_${selectType}_${screen.id}`} recycle={recycle} {...screen} />
              ))}
            {isShow && selectedCategoryId === 'default' ? this.renderChinaSouthernLiveScreenBtn() : null}
          </div>
        </div>
      </HorizontalSplitHelper>
    )
  })

  onDelAll = data => {
    const { doRemoveLiveScreen } = this.props
    const ids = data
      .filter(o => !o.is_template)
      .map(p => p.id)
      .join(',')
    return new Promise((resolve, reject) => {
      doRemoveLiveScreen(ids, () => {
        resolve()
      })
    }).catch(e => {
      throw e
    })
  }

  render() {
    const { loading, list = [], categoryList, selectedCategoryId } = this.props
    const { addModalVisible, addType } = this.state
    return (
      <div className='height-100'>
        <Bread path={[{ name: '实时大屏' }]} extra={<div className='mg2l'>温馨提示:请使用谷歌 Chrome 浏览器版本 5.0 以上，暂时不支持 Safari、360、IE 等其他任何浏览器。</div>} />
        <div className='pd2l screen-list-box clearfix' style={{ height: 'calc(100% - 44px)' }}>
          <Spin spinning={loading}>
            <div className='left-wrap'>
              <div className='screen-list'>
                <Tabs defaultActiveKey='livescreen'>
                  <TabPane tab='我的大屏' key='livescreen'>
                    {this.renderMyLivescreenPanel()}
                  </TabPane>
                  <TabPane tab='公共模板' key='livescreenTemplate'>
                    {/* {canCreate
                      ? (
                        <div
                          className="screen"
                          onClick={() => {
                            this.doCreate('addModalVisible')
                            this.setState({ addType: 1 })
                          }}>
                          <a className="screen_new_link pointer">
                            <Icon type="plus" />
                            <span>新建大屏模板</span>
                          </a>
                        </div>
                      ) : null} */}
                    {list
                      .filter(p => p.is_template)
                      .map(screen => (
                        <ScreenItem key={`s2_${screen.id}`} {...screen} />
                      ))}
                  </TabPane>
                  <TabPane tab='发布管理' key='publishManager'>
                    {this.renderMyPublish()}
                  </TabPane>
                </Tabs>
                <AddScreenModal
                  selectedCategoryId={selectedCategoryId}
                  categoryList={categoryList}
                  addType={addType}
                  data={list.filter(p => p.is_template)}
                  visible={addModalVisible}
                  hideModal={() => this.hideModal('addModalVisible')}
                />
              </div>
            </div>
            <div className='pd2b' style={{ clear: 'left' }}>
              {'\u00a0' /* 底部留白 */}
            </div>
          </Spin>
        </div>
      </div>
    )
  }
}

export default MyLiveScreen
