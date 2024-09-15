import React from 'react'
import * as dashboradActions from '../../actions/dashboards'
import { AppstoreOutlined, BarsOutlined, DownloadOutlined, ShareAltOutlined,CloseCircleOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { message, Button, Popconfirm, Tooltip, Radio, Modal } from 'antd';
import {autoWidth} from '../../common/auto-width'
import SliceShare from './slice-share'
import SliceCard from './slice-thumb'
import {checkPermission} from '../../common/permission-control'
import SliceTable from './slice-table'
import * as ls from '../../common/localstorage'
import smartSearch from '../../../common/smart-search'
import {hasSubscribeLink, hasOverviewLink} from '../Home/menu-data'
import _ from 'lodash'
import PubSub from 'pubsub-js'
import {withCommonFilter} from '../Common/common-filter'
import echarts from 'echarts'
import moment from 'moment'
import SliceChartFacade from '../Slice/slice-chart-facade'
import {Auth} from '../../common/permission-control'
import TagManage from '../Common/tag-manage'
import * as actions from '../../actions'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'

const RadioButton = Radio.Button
const RadioGroup = Radio.Group

const sliceModeName = 'slice_list_mode'

const canAddOverview = checkPermission('/app/overview/create')
const canDelOverview = checkPermission('/app/overview/delete')
const canShare = checkPermission('/app/slices/share')
const canDeleteSlice = checkPermission('/app/slices/delete/slices')

@connect(state => {
  return {
    roles: _.get(state, 'common.roles'),
    institutions: _.get(state, 'common.institutionsList'),
    institutionsTree: _.get(state, 'common.institutionsTree')
  }
}, dispatch => bindActionCreators(actions, dispatch))
@withCommonFilter
@autoWidth
export default class SliceListView extends React.Component {

  state = {
    shouldShowCount: 0,
    sliceWidth: 300,
    maxItem: 3,
    openShare: false,
    sliceToshare: {},
    shareTo: [],
    onShare: false,
    downLoadModalVisible: false,
    dowLoadSlice: null,
    //修改为thumb
    mode: 'thumb', //ls.gets(sliceModeName) || window.sugo.sliceListMode || 'thumb',
    selectedRowKeys: [],
    selectedRow: [],
    selectedTags: [],
    showPreviewModal: false
  }

  componentDidMount() {
    this.props.getRoles()
    this.props.getInstitutions()
    this.initOnResize({})
  }

  componentWillUnmount() {
    this.removeResizeEvt()
  }

  updateOverview = (slice) => {
    return e => {
      e.stopPropagation()
      dashboradActions.updateOverview.bind(this, slice)()
    }
  }

  onChangeMode = e => {
    let mode = e.target.value
    ls.set(sliceModeName, mode)
    this.setState({
      mode
    })
  }

  handleDownLoad = async slice => {
    let vizType = _.get(slice, 'params.vizType', undefined)
    let outerBox, echartInstance
    let echartHelper = echarts
    let echartsOption = {}
    switch (vizType) {
      case 'IframeBox':
        return
      case 'table':
      case 'table_flat':
      case 'number':
        PubSub.publish('dashBoardForm.slice-chart-facade-export', {sliceId: slice.id})
        return
      case 'liquidFill':
        echartHelper = require('echarts/lib/echarts')
        require('echarts-liquidfill')
        outerBox = document.querySelector(`._${slice.id}`)
        echartInstance = echartHelper.getInstanceByDom(outerBox)
        echartsOption = echartInstance.getOption()
        this.prepareDownLoadSlice(echartsOption, echartHelper, vizType)
        break
      case 'wordCloud':
        echartHelper = require('echarts/lib/echarts')
        require('echarts-wordcloud')
        outerBox = document.querySelector(`._${slice.id}`)
        echartInstance = echartHelper.getInstanceByDom(outerBox)
        echartsOption = echartInstance.getOption()
        this.prepareDownLoadSlice(echartsOption, echartHelper, vizType)
        break
      default:
        outerBox = document.querySelector(`._${slice.id}`)
        echartInstance = echarts.getInstanceByDom(outerBox)
        echartsOption = echartInstance.getOption()
        if (vizType === 'chord') echartsOption.series[0].label.normal.show = true
        this.prepareDownLoadSlice(echartsOption, echartHelper, vizType)
        break
    }
  }

  prepareDownLoadSlice(echartsOption, echartHelper, vizType) {
    let chartDom = document.createElement('div')
    chartDom.style.height= '1000px'
    chartDom.style.width='1000px'
    chartDom.style.display= 'none'
    document.body.appendChild(chartDom)
    const mychart = echartHelper.init(chartDom)
    //动画不能为false finished就是在监听动画
    echartsOption.animation = false
    mychart.setOption(echartsOption)

    let hasFinishedEvent = false
    
    const renderedVizType = ['liquidFill']
    //不监听完成事件的 统一等待2秒后自动下载 hasFinishedEvent 用于防止有些图没finished事件
    const withoutListener = ['wordCloud']
    const event = renderedVizType.includes(vizType) ? 'rendered' : 'finished'
    const handler = () => {
      mychart.off(event, handler)

      if (!withoutListener.includes(vizType)) {
        hasFinishedEvent = true
        this.downLoadSlice(mychart, chartDom)
      }
    }
    mychart.on(event, handler)
    setTimeout(() => {if (!hasFinishedEvent) this.downLoadSlice(mychart, chartDom)}, 2000)
  }

  downLoadSlice(mychart, chartDom) {
    let base64, link
    base64 = mychart.getConnectedDataURL({
      type: 'png',
      backgroundColor:'#ffffff'
    })
    link = document.createElement('a')
    if (link.download !== undefined) { // feature detection
      // Browsers that support HTML5 download attribute
      link.href = base64
      link.setAttribute('download', `看板_单图_时间${moment().format('YYYYMMDDHHmmss')}`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    //destory whether download
    document.body.removeChild(chartDom)
  }

  updateSliceSubscribe = (slice) => {
    return e => {
      e.stopPropagation()
      let {subscribed, id} = slice
      this.props.subscribeSlice(id, subscribed, {
        where: {
          slice_id: slice.id
        }
      }, () => {
        message.success(
          subscribed ? '已经取消订阅' : '订阅成功', 8
        )
      })
    }
  }

  delSlice = (slice) => {
    return () => this.props.delSlice(slice)
  }

  afterShare = slice => {
    this.props.setProp('update_slices', slice)
  }

  openShare = sliceToshare => {
    return e => {
      e.stopPropagation()
      this.sliceShare.setState({
        sliceToshare,
        openShare: true,
        shareToRoles: sliceToshare.shareRoles
      })
    }
  }

  filterTags = (selectedTags) => {
    this.setState({selectedTags: [...selectedTags]})
  }

  updataTags = (...arg) => {
    const {updateSlicesTag} = this.props
    let {selectedRow} = this.state
    const [tagId, type] = arg
    let targets = selectedRow.map(row => {
      const tagSet = new Set(row.tags)
      type === 'add' ? tagSet.add(tagId) : tagSet.delete(tagId)
      return {
        ...row,
        tags: [...tagSet]
      }
    })

    targets.forEach(item => {
      const target = {id: item.id, tags: item.tags}
      updateSlicesTag({
        playLoad: {
          target,
          data: item
        }
      })
    })
    this.setState({
      selectedRow: [],
      selectedRowKeys: []
    })
  }

  renderFilterPart = () => {
    let {loading, keywordInput: KeywordInput, datasourceCurrent, setProp, tags} = this.props
    let {mode, selectedRow, selectedTags} = this.state

    let tagProps = {
      projectId: datasourceCurrent.id || '',
      type: 'slices',
      afterDeleteTag: () => {},
      mode: selectedRow.length ? 'change' : 'filter',
      filterTagIds: selectedTags,
      items: selectedRow,
      updateFilteredTags: this.filterTags,
      updateItemTag: this.updataTags,
      setProp,
      tags,
      permissionUrl: ''
    }
    return (
      <div className="fix slice-filters pd2b pd2t">
        <div className="fleft">
          <KeywordInput
            className="itblock mg1r width200"
            placeholder="搜索单图"
            disabled={loading}
          />
          <RadioGroup className="iblock" onChange={this.onChangeMode} value={mode} >
            <RadioButton value="table">
              <Tooltip title="切换为列表显示">
                <BarsOutlined />
              </Tooltip>
            </RadioButton>
            <RadioButton value="thumb">
              <Tooltip title="切换为卡片显示">
                <AppstoreOutlined />
              </Tooltip>
            </RadioButton>
          </RadioGroup>
        </div>
        <div className="fright">
          <Auth auth="post:/app/slices/update/slices-tag">
            <TagManage {...tagProps} className="iblock mg1l"/>
          </Auth>
        </div>
      </div>
    );
  }

  renderThumb = ({
    slices,
    shouldShowCount,
    sliceWidth,
    maxItem,
    datasources
  }) => {
    return slices.map((slice, index) => {
      let subscribeIcon = slice.subscribed ? 'star' : 'star-o'
      let overviewIcon = slice.inOverview ? 'pushpin' : 'pushpin-o'
      let shouldRenderChart = shouldShowCount > index
      let style = {
        width: sliceWidth
      }
      if ((index + 1) % maxItem === 0) style.marginRight = 0
      let editable = slice.SugoUser ? window.sugo.user.id === slice.SugoUser.id : false

      let showOverview = editable &&
        (
          (slice.inOverview && canDelOverview) ||
          (!slice.inOverview && canAddOverview)
        )
      let vizType = _.get(slice, 'params.vizType', undefined)
      let downLoadType = vizType === 'table' || vizType === 'table_flat' || vizType === 'number'
        ? 'csvOnly'
        : 'csvOrImage'
      let buttons = (
        <div className="fright">
          {
            vizType && vizType !== 'IframeBox' && vizType !== 'sdk_heat_map' ? (
              downLoadType === 'csvOrImage' ?
                <Tooltip title="下载">
                  <DownloadOutlined
                    className="pointer mg1r"
                    onClick={() => this.setState({ downLoadModalVisible: `${slice.id}` })} />
                </Tooltip>
                :
                <Tooltip title="下载">
                  <DownloadOutlined className="pointer mg1r" onClick={() => this.handleDownLoad(slice)} />
                </Tooltip>
            )
              :
              null
          }

          {
            editable && canShare
              ? <Tooltip title="分享单图给其他用户">
                <ShareAltOutlined className="pointer mg1r" onClick={this.openShare(slice)} />
              </Tooltip>
              : null
          }

          {
            showOverview && hasOverviewLink
              ? <Tooltip title={slice.inOverview ? '点击从概览移除' : '点击加入概览'}>
                <LegacyIcon
                  className="pointer mg1r"
                  onClick={this.updateOverview(slice)}
                  type={overviewIcon}
                />
              </Tooltip>
              : null
          }

          {
            editable && hasSubscribeLink
              ? <Tooltip title={slice.subscribed ? '点击取消订阅' : '点击订阅'}>
                <LegacyIcon
                  onClick={this.updateSliceSubscribe(slice)}
                  className="pointer mg1r"
                  type={subscribeIcon}
                />
              </Tooltip>
              : null
          }

          {
            (editable && canDeleteSlice) ?
              <Popconfirm
                title={(
                  <div>
                    {`确定删除 ${slice.slice_name} 么？`}
                    {
                      slice.shareRoles && slice.shareRoles.length
                        ? <div className="color-red">{'删除之后被分享该单图的用户将无法继续查看它'}</div>
                        : <div className="color-red">{'注意，单图在概览、我的订阅、数据看板、画像引用中一同删除!'}</div>
                    }
                  </div>
                )}
                placement="topLeft"
                onConfirm={this.delSlice(slice)}
              >
                <Tooltip title="删除">
                  <CloseCircleOutlined
                    onClick={e => e.stopPropagation()}
                    className="pointer color-red"
                  />
                </Tooltip>
              </Popconfirm>
              : null
          }
        </div>
      )

      let props = {
        slice,
        shouldRenderChart,
        style,
        buttons,
        className: '',
        headerClassName: 'width-70',
        shouldRenderFooter: false,
        index,
        delay: index * 500,
        datasources,
        sCache: 'P1M',
        onClick: _.noop
      }
      return (
        <SliceCard
          onPerviewSlice={this.onPerviewSlice}
          {...props}
          key={slice.id}
        />
      )
    });
  }

  renderDownLoadModalContent = (slice) => {
    return (
      <div>
        <Button
          onClick={() => this.handleDownLoad(slice)}
        >
          下载单图
        </Button>
        <Button 
          className="mg1l"
          onClick={() => PubSub.publish('dashBoardForm.slice-chart-facade-export', {sliceId: slice.id})}
        >
          下载表格
        </Button>
      </div>
    )
  }

  renderDownLoadModal = (slices) => {
    const { downLoadModalVisible } = this.state
    let slice = downLoadModalVisible && _.find(slices, s => s.id === downLoadModalVisible)
    return (
      <Modal 
        width={250}
        title="请选择下载类型"
        destroyOnClose
        visible={!!slice}
        onCancel={() => this.setState({
          downLoadModalVisible: false,
          dowLoadSlice: null
        })}
        footer={null}
      >
        {this.renderDownLoadModalContent(slice)}
      </Modal>
    )
  }

  changeSelect = (selectedRowKeys, selectedRow) => {
    this.setState({selectedRowKeys, selectedRow})
  }

  onPerviewSlice = (slice) => {
    this.setState({showPreviewModal: true ,sliceToshare: slice})
  }

  renderPreviewSliceModal = () => {
    const { showPreviewModal, sliceToshare } = this.state 
    return (<Modal
      width="80%"
      visible={showPreviewModal}
      footer={<Button onClick={() => this.setState({ showPreviewModal: false })}>关闭</Button>}
      onCancel={() => this.setState({ showPreviewModal: false })}
      title={`预览单图[${sliceToshare.slice_name}]`}
    >
      <SliceChartFacade
        wrapperStyle={{
          maxHeight: '380px',
          backgroundColor: '#fff',
          borderRadius: '3px',
          padding: '10px',
          borderTop: '10px solid white',
          borderBottom: '10px solid white',
          overflowY: 'scroll'
        }}
        wrapperClassName="hide-scrollbar-y"
        className=""
        style={{
          minHeight: '340px'
        }}
        slice={sliceToshare}
        publicAccess
      />
    </Modal>)
  }

  render() {
    let {
      slices,
      loading: propLoading,
      datasourceList: datasources,
      mergedFilterCreator,
      loadingProject,
      datasourceCurrent,
      projectCurrent,
      tags,
      roles,
      institutions,
      institutionsTree
    } = this.props

    let {selectedRowKeys, selectedTags} = this.state

    let loading = loadingProject || propLoading
    if (loading) {
      return <div className="empty-overview pd3 aligncenter">载入中...</div>
    }

    let {shouldShowCount, sliceWidth, maxItem, mode} = this.state

    let mergedFilter = mergedFilterCreator(
      searching => slice => slice ? smartSearch(searching, slice.slice_name) : true,
      dataSourceId => slice => slice ? slice.druid_datasource_id === dataSourceId : true,
      datasourceCurrent.id
    )
    let limitChildProjectId = projectCurrent.parent_id ? projectCurrent.id : null
    let slices0 = slices
      .filter(mergedFilter)
      .filter(sl => sl.child_project_id === limitChildProjectId)
      .filter(slice => slice.params.openWith !== 'UserActionAnalytics')
      .filter( ({tags}) => !selectedTags.length || tags.find(key => selectedTags.includes(key)) )

    let tableProps = {
      datasources,
      changeSelect: this.changeSelect,
      selectedRowKeys,
      slices: slices0,
      openShare: this.openShare,
      updateOverview: this.updateOverview,
      updateSliceSubscribe: this.updateSliceSubscribe,
      delSlice: this.delSlice,
      tagGroup: tags
    }

    return (
      <div className="slice-list-wrapper">
        {this.renderFilterPart()}
        {this.renderPreviewSliceModal() }
        <div className="slice-list fix" id="slice-list">
          <SliceShare
            ref={ref => this.sliceShare = ref}
            afterShare={this.afterShare}
            roles={roles}
            institutions={institutions}
            institutionsTree={institutionsTree}
          />
          {this.renderDownLoadModal(slices0)}
          {
            mode === 'thumb'
              ? this.renderThumb({
                slices: slices0,
                shouldShowCount,
                sliceWidth,
                maxItem,
                datasources
              })
              : <SliceTable {...tableProps} onPerviewSlice={this.onPerviewSlice}/>
          }
        </div>
      </div>
    )
  }
}
