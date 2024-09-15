/* eslint-disable react/prop-types */
import React from 'react'
import PropTypes from 'prop-types'
import { Button2 } from '../../Common/sugo-icon'
import {
  CheckOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  DesktopOutlined,
  EditOutlined,
  FilterOutlined,
  MobileOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons';

import { Icon as LegacyIcon } from '@ant-design/compatible';

import {
  Radio,
  Input,
  Popover,
  Button,
  message,
  Switch,
  Select,
  Row,
  Col,
  Card,
  Popconfirm,
  Tabs,
} from 'antd';
import './css.styl'
import { connect } from 'react-redux'
import { namespace, sendMessage2Iframe } from './store/model'
import TimePicker from '../../Common/time-picker'
import { convertDateType, isRelative } from '../../../../common/param-transform'
import UserGroupSelector from '../../Common/usergroup-selector'
import CommonDruidFilterPanel from '../../Common/common-druid-filter-panel'
import { isCharDimension } from '../../../../common/druid-column-type'
import _ from 'lodash'
import moment from 'moment'
import { HEATMAP_VIEW_TYPE, RESOLUTION } from './store/constants'
import { AccessDataType } from '../../Project/constants'
import classnames from 'classnames'
import { renderPageTitle } from '../../Common/bread'
import CommonSaveModal from '../../Common/save-modal'
import { Relation_Field, HEATMAP_TYPE } from '../../../common/sdk-calc-point-position'
import { AccessDataOriginalType } from '../../../../common/constants'
import ImportHeatMapModal from '../import-heat-map'

const TabPane = Tabs.TabPane

/**
 * @description web热力图分析
 * @export
 * @class WebHeatmap
 * @extends {React.Component}
 */
@connect(state => ({ ...state[namespace], ...state['sagaCommon'] }))
export default class WebHeatmap extends React.Component {

  static propTypes = {
    dispatch: PropTypes.func,
    viewType: PropTypes.string,
    dataEvents: PropTypes.array,
    projectCurrent: PropTypes.object,
    timeRange: PropTypes.string,
    userGroupId: PropTypes.string,
    projectList: PropTypes.array,
    dimensionFilters: PropTypes.array,
    visiblePopoverKey: PropTypes.bool
  }

  componentDidMount() {
    this.heatMapWindow = this._iframe.contentWindow
    this.changeState({
      heatMapWindow: this.heatMapWindow
    })
    // 监听子窗口发送的消息
    window.addEventListener('message', this.handlePostMessage, false)
    if (this.props.params.id) {
      this.props.dispatch({ type: `${namespace}/getSliceInfo`, payload: { id: this.props.params.id, heatMapWindow: this.heatMapWindow } })
    }
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.handlePostMessage, false)
  }

  componentDidUpdate(prevProps) {
    const { projectCurrent, currentUrl } = this.props
    if (prevProps.projectCurrent.id !== projectCurrent.id) {
      this.props.dispatch({ type: `${namespace}/getHeatMapList`, payload: {} })
    }
    if (this.props.params.id && currentUrl !== prevProps.currentUrl && !prevProps.currentUrl) {
      setTimeout(() => { this.jumpPage(currentUrl) }, 500)
    }
  }

  handlePostMessage = event => {
    const { viewType, heatmapType } = this.props
    const { data: { type, payload = {} } } = event
    if(!type) {
      return 
    }
    if(type !== 'changeWindowLocation') {
      this.changeState({
        projectError: false,
        projectErrorInfo: {}
      })
    }
    if (type && payload) {
      if (type === 'projectError') { // 项目ID错误
        this.changeState({
          projectError: true,
          projectErrorInfo: payload
        })
        return
      }

      // 转发子窗口请求命令
      this.props.dispatch({
        type: `${namespace}/${type}`,
        payload: {
          viewType,
          heatmapType,
          type,
          ...payload
        }
      })
    }
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/change`,
      payload
    })
  }

  importHeatMap = (heatmaps) => {
    const { projectCurrent = {} } = this.props
    this.props.dispatch({
      type: `${namespace}/importHeatMap`,
      payload: { heatmaps, appType: AccessDataOriginalType.Web, projectId: projectCurrent.id }
    })
  }

  jumpPage = url => {
    const { viewType, projectCurrent, heatmapType } = this.props
    if (!url) {
      message.warning('请输入站点地址')
      return
    }
    if (url && !_.startsWith(url, 'http')) {
      url = `http://${url}`
    }
    // 保存原有的hash
    const index = url.indexOf('#')
    const hash = index > -1 ? url.substring(index + 1) : ''
    const path = index > -1 ? url.substring(0, index) : url

    // 传递给可视化埋点编辑器的参数
    const editorParams = {
      state: {
        // token,
        // app_host: location.host,
        // token_type: 'Bearer',          // 天知道这字段有啥用，不明白的话不要轻易动
        // access_token: generate(),      // 访问token
        project_id: projectCurrent.datasource_name,
        hash,
        expires_in: 60 * 60 * 24,      // 访问过期时间：24小时
        user_id: window.sugo.user.id,
        choose_page: 'about:blank',
        viewType,
        heatmapType // 可视化热图
      }
    }
    const encode = window.btoa(JSON.stringify(editorParams))
    url = `${path}#${encode}`
    this.changeState({
      currentUrl: url,
      projectError: false,
      projectErrorInfo: {}
    })
    this.iframeJumpUrl(url)
  }

  iframeJumpUrl = url => {
    this._iframe.src = 'about:blank'
    setTimeout(() => {
      this._iframe.src = url
    }, 10)
  }

  onChangeViewType = e => {
    let { heatmapType } = this.props
    const viewType = e.target.value
    if (viewType === HEATMAP_VIEW_TYPE.HEATMAP) {
      heatmapType = HEATMAP_TYPE.HYBRID 
    } else {
      heatmapType = HEATMAP_TYPE.EVENT 
    }
    this.changeState({ viewType, heatmapType })
    // 给子窗口发送消息
    sendMessage2Iframe(this.heatMapWindow, {
      type: viewType,
      payload: heatmapType
    })
  }

  onChangeRelationFiled = checked => {
    const { dimensionFilters, pageName, shortUrl } = this.props
    const relationType = checked ? Relation_Field.evnetName : Relation_Field.eventId
    let newDimensionFilters = [
      ...dimensionFilters.filter(p => p.col !== 'path_name' && p.col !== 'page_name'),
      { col: relationType === Relation_Field.eventId ? 'path_name' : 'page_name', op: 'in', eq: [relationType === Relation_Field.eventId ? shortUrl : pageName] }
    ]
    this.changeState({ relationType, dimensionFilters: newDimensionFilters })
  }

  onChangeGridGroup = flag => {
    const { heatmapType } = this.props
    const viewType = flag ? HEATMAP_VIEW_TYPE.HEATMAP_GRID_GROUP : HEATMAP_VIEW_TYPE.HEATMAP
    this.changeState({ viewType })
    // 给子窗口发送消息
    sendMessage2Iframe(this.heatMapWindow, {
      type: viewType,
      payload: heatmapType
    })
  }

  onChangeHeatmapType = heatmapType => {
    let { viewType } = this.props
    if (heatmapType !== HEATMAP_TYPE.GRID && viewType === HEATMAP_VIEW_TYPE.HEATMAP_GRID_GROUP) { // 重置为普通热图模式
      viewType = HEATMAP_VIEW_TYPE.HEATMAP
    }
    this.changeState({ heatmapType })
    // 给子窗口发送消息
    sendMessage2Iframe(this.heatMapWindow, {
      type: viewType,
      payload: heatmapType
    })
  }

  onChangeResolution = resolution => {
    // web: width: 100%; height: 100%;
    // pad: width: 768px; height: 1024px;
    // mobile: width: 375px; height: 627px;

    const resolutionStyle = resolution === RESOLUTION.WEB ? { width: '100%', height: '100%' } : { width: '375px', height: '627px' }
    this.changeState({
      resolution,
      resolutionStyle
    })
    const { viewType, heatmapType } = this.props
    // 给子窗口发送消息
    sendMessage2Iframe(this.heatMapWindow, {
      type: 'resolutionChange',
      payload: {
        viewType,
        heatmapType,
        resolution,
        resolutionStyle
      }
    })
  }

  selectHeatmap = (item, viewType) => {
    const url = _.get(item, 'params.url', '')
    this.props.dispatch({
      type: `${namespace}/selectHeatMapItem`,
      payload: { selectKey: item.id, viewType }
    })
    if (url !== this.props.currentUrl) {
      setTimeout(() => this.jumpPage(url), 500)
    }
  }

  renderHeatmapListItem = (item) => {
    const { selectKey } = this.props
    return (
      <Card
        bodyStyle={{
          padding: 10,
          backgroundColor: selectKey === item.id ? '#6969d7' : '#fff',
          color: selectKey === item.id ? '#fff' : 'rgba(0, 0, 0, 0.65)'
        }}
        style={{ width: '100%', marginTop: 5 }}
        className="elli"
      >
        {item.name}
        <span style={{ position: 'absolute', right: 5 }}>
          {/* <Icon className="mg2r" type="eye-o" onClick={() => this.selectHeatmap(item, HEATMAP_VIEW_TYPE.HEATMAP)} /> */}
          <EditOutlined
            className="mg2r"
            onClick={() => this.selectHeatmap(item, HEATMAP_VIEW_TYPE.EDITOR)} />
          <Popconfirm
            title={`确定热图 "${item.name}" 么？`}
            placement="topLeft"
            onConfirm={() => {
              this.props.dispatch({ type: `${namespace}/deleteHeatMap`, payload: { id: item.id } })
            }}
          >
            <CloseOutlined className="color-red font14 item-del" />
          </Popconfirm>
        </span>
      </Card>
    );
  }

  saveHeatMap = () => {
    this.props.dispatch({ type: `${namespace}/saveHeatMapData`, payload: {} })
  }

  updateOrCreateSlice = async (newName, action = 'saveAs') => {
    let { projectCurrent } = this.props
    let tempSlice = {
      id: action === 'update' ? slice.id : undefined,
      druid_datasource_id: projectCurrent.datasource_id,
      slice_name: newName
    }
    this.props.dispatch({
      type: `${namespace}/saveSlice`,
      payload: {
        slice: tempSlice
      }
    })
  }

  renderSaveSliceButtton = () => {
    const { showSaveSliceModal, sliceName } = this.props
    return (
      <CommonSaveModal
        className="iblock fright"
        modelType="单图"
        visible={showSaveSliceModal}
        onVisibleChange={visible => this.changeState({ showSaveSliceModal: visible })}
        defaultValue={sliceName}
        canSaveAsOnly={true}
        allowCreate={true}
        allowUpdate={false}
        onSaveAs={async newName => {
          let res = await this.updateOrCreateSlice(newName, 'saveAs')
          if (res) {
            message.success('保存成功')
          }
        }}
      >
        <Button2 className="iblock" type="success" icon="sugo-save" ></Button2>
      </CommonSaveModal>
    );
  }

  renderSaveHeatMapButtton = () => {
    const { visibleSaveModal, heatMapName } = this.props
    return (
      <Popover
        placement="bottom"
        trigger="click"
        visible={visibleSaveModal}
        content={
          <Tabs className="wdith300">
            <TabPane tab="保存热图" key="saveAs">
              <Row>
                <Col className="pd1" span={24}>热图名称</Col>
                <Col className="pd1" span={24}>
                  <Input
                    value={heatMapName}
                    className="width-100"
                    placeholder="未输入名称"
                    onChange={v => this.changeState({ heatMapName: v.target.value })}
                  />
                </Col>
                <Col className="pd1 alignright" span={24}>
                  <Button icon={<SaveOutlined />} type="primary" className="width-100" onClick={this.saveHeatMap}>保存</Button>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        }>
        <Button type="success" className="iblock pd2x" onClick={() => this.changeState({ visibleSaveModal: !visibleSaveModal })}>保存热图</Button>
      </Popover>
    );
  }

  renderHeatMapList = () => {
    const { heatMapList = [], shortUrl } = this.props
    return (<Popover content={<div className="width300">
      <div className="aligncenter">当前页面</div>
      <div>
        {
          heatMapList.filter(p => p.page_path === shortUrl).map(this.renderHeatmapListItem)
        }
      </div>
      <div className="aligncenter mg2t">其他页面</div>
      <div>
        {
          heatMapList.filter(p => p.page_path !== shortUrl).map(this.renderHeatmapListItem)
        }
      </div>
    </div>}
            >
      <Button className="iblock">热图列表</Button>
    </Popover>)
  }


  renderToolbar() {
    const { viewType, heatmapType, projectCurrent, userGroupId, currentUrl, timeRange = '-7 days', relationType = Relation_Field.eventId, projectList = [], projectError = false, projectErrorInfo = {}, resolution = RESOLUTION.WEB, heatMapList = [], shortUrl, visibleSaveModal, heatMapName, showSaveSliceModal } = this.props
    const { datasource_id: datasourceId } = projectCurrent
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    const isSlice = !!this.props.params.id
    return (
      <React.Fragment>
        <div>
          <div className="top-toolbar1">
            <div className="iblock">
              <Popover
                visible={projectError}
                placement="bottomLeft"
                title={[
                  <span className="font16 mg2r color-red" key="title">项目ID不匹配</span>,
                  <CloseCircleOutlined
                    key="close"
                    className="fright fpointer font18 color-red"
                    onClick={() => {
                      this.changeState({ projectError: false })
                    }} />
                ]}
                content={(
                  <React.Fragment>
                    <p className="color-red">当前选中的项目与站点配置的项目ID不匹配</p>
                    <p>当前选中项目ID：{projectErrorInfo.currentProjectId}</p>
                    <p>站点配置项目ID：{projectErrorInfo.configProjectId}</p>
                  </React.Fragment>
                )}
              >
                <Input
                  defaultValue={currentUrl}
                  value={currentUrl}
                  onChange={e => {
                    this.changeState({
                      currentUrl: e.target.value,
                      staticUrl: e.target.value
                    })
                  }}
                  disabled={isSlice}
                  className="mg2l width400"
                  placeholder="请输入站点地址"
                />
                <Button icon={<SearchOutlined />} className="mg2l" onClick={() => this.jumpPage(currentUrl)}>刷新</Button>
              </Popover>
            </div>
            <div className="iblock mg2l view-btn">
              <Radio.Group value={viewType === HEATMAP_VIEW_TYPE.HEATMAP_GRID_GROUP ? HEATMAP_VIEW_TYPE.HEATMAP : viewType} onChange={this.onChangeViewType}>
                <Radio.Button value={HEATMAP_VIEW_TYPE.NORMAL} disabled={isSlice}>普通浏览</Radio.Button>
                <Radio.Button value={HEATMAP_VIEW_TYPE.HEATMAP}>热图分析</Radio.Button>
                <Radio.Button value={HEATMAP_VIEW_TYPE.EDITOR} disabled={isSlice}>圈选热图</Radio.Button>
              </Radio.Group>
            </div>
            {
              (viewType === HEATMAP_VIEW_TYPE.HEATMAP || viewType === HEATMAP_VIEW_TYPE.HEATMAP_GRID_GROUP) && heatmapType === HEATMAP_TYPE.GRID ? (
                <div className="iblock mg2l">
                  <Switch
                    onChange={this.onChangeGridGroup}
                    checked={viewType === HEATMAP_VIEW_TYPE.HEATMAP_GRID_GROUP}
                    checkedChildren="基于分组"
                    unCheckedChildren="基于分组"
                  />
                </div>
              ) : null
            }
            <div className="iblock fright">
              <Button onc type="primary" className="mg2r" placement="bottomRight" onClick={() => this.changeState({ showImportHeatmap: true })}>
                导入热图
              </Button>
              <Select
                className="width85"
                defaultValue={resolution}
                value={resolution}
                onChange={this.onChangeResolution}
              >
                <Select.Option value={RESOLUTION.WEB}>
                  <DesktopOutlined /> Web
            </Select.Option>
                <Select.Option value={RESOLUTION.MOBILE}>
                  <MobileOutlined /> 手机
            </Select.Option>
              </Select>
            </div>
          </div>
          <div className="top-toolbar2">
            {
              viewType === HEATMAP_VIEW_TYPE.NORMAL
                ? <div style={{height: '32px'}}/> 
                : [
                  <div className="iblock view-btn tabs-group-button">
                    {
                      viewType === HEATMAP_VIEW_TYPE.HEATMAP || viewType === HEATMAP_VIEW_TYPE.HEATMAP_GRID_GROUP
                        ? <Button
                          className={`tabs-button mg1r ${heatmapType === HEATMAP_TYPE.HYBRID ? 'button-checked' : ''}`}
                          onClick={() => this.onChangeHeatmapType(HEATMAP_TYPE.HYBRID)}
                          >
                          混合模式
                        </Button>
                        : null
                    }
                    <Button
                      className={`tabs-button mg1r ${heatmapType === HEATMAP_TYPE.EVENT ? 'button-checked' : ''}`}
                      onClick={() => this.onChangeHeatmapType(HEATMAP_TYPE.EVENT)}
                    >
                      事件热图
                    </Button>
                    <Button
                      className={`tabs-button ${heatmapType === HEATMAP_TYPE.GRID ? 'button-checked' : ''}`}
                      onClick={() => this.onChangeHeatmapType(HEATMAP_TYPE.GRID)}
                    >
                      网格热图
                    </Button>
                  </div>,
                  <div className="iblock mg2l">
                    <span className="mg1r">时间：</span>
                    <TimePicker
                      className="width200 color-black"
                      dateType={relativeTime}
                      dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
                      // getPopupContainer={getPopupContainer}
                      onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
                        this.changeState({ timeRange: relativeTime === 'custom' ? [since, until] : relativeTime })
                      }}
                    />
                  </div>,
                  <div className="iblock mg2l">
                    <span className="mg1r">用户群：</span>
                    <div className="iblock">
                      <UserGroupSelector
                        datasourceCurrent={{ datasourceId }}
                        projectList={projectList}
                        className="width200"
                        value={userGroupId}
                        onChange={nextUserGroup => {
                          this.changeState({ userGroupId: nextUserGroup && nextUserGroup.id })
                        }}
                        userGroupFilter={item => item.druid_datasource_id === datasourceId}
                      />
                    </div>
                  </div>,
                  <div className="iblock mg2l">
                    {this.renderLayerExtraFilter()}
                  </div>,

                  <div className="iblock mg2l">
                    <Switch
                      className="mg2l color-white"
                      checkedChildren={<CheckOutlined />}
                      unCheckedChildren={<CloseOutlined />}
                      checked={relationType === Relation_Field.evnetName}
                      disabled={viewType !== HEATMAP_VIEW_TYPE.EDITOR}
                      onChange={this.onChangeRelationFiled}
                    />
                    <span className="mg1l">事件名称关联</span>
                  </div>,
                  <div className="iblock mg2l fright">
                    {!isSlice ? this.renderSaveSliceButtton() : null}
                  </div>,
                  <div className="iblock mg2l fright">
                    {!isSlice ? this.renderSaveHeatMapButtton() : null}
                  </div>,
                  <div className="iblock mg2l fright">
                    {!isSlice ? this.renderHeatMapList() : null}
                  </div>,
                  <div className="iblock mg2l fright">
                    {!isSlice ? <Button className="iblock" onClick={() => this.props.dispatch({ type: `${namespace}/clearHeatMap`, payload: {} })}>清除配置</Button> : null}
                  </div>
                ]
            }
          </div>
        </div>
      </React.Fragment>
    );
  }

  renderLayerExtraFilter = () => {
    const { projectCurrent, dimensionFilters, visiblePopoverKey } = this.props
    return (
      <Popover
        title={
          [
            <span key="title" className="font16 mg2r">筛选</span>,
            <CloseCircleOutlined
              key="close"
              className="fright fpointer font18 color-red"
              onClick={() => this.changeState({ visiblePopoverKey: false })} />
          ]
        }
        getPopupContainer={null}
        placement="bottom"
        arrowPointAtCenter
        trigger="click"
        visible={visiblePopoverKey}
        onVisibleChange={_.noop}
        content={(
          <CommonDruidFilterPanel
            key="filters"
            className="mw460 heatmapCondFilter"
            dimensionOptionFilter={isCharDimension}
            getPopupContainer={() => document.querySelector('.heatmapCondFilter')}
            projectId={projectCurrent && projectCurrent.id}
            timePickerProps={{}}
            dataSourceId={projectCurrent.datasource_id}
            headerDomMapper={_.noop}
            filters={dimensionFilters || []}
            onFiltersChange={nextFilters => {
              this.changeState({ dimensionFilters: nextFilters })
            }}
          />
        )}
      >
        <Button
          onClick={() => this.changeState({ visiblePopoverKey: true })}
        >
          <FilterOutlined className="iblock fpointer font22" />
          <span>过滤</span>
        </Button>
      </Popover>
    );
  }

  render() {
    const { resolutionStyle, projectCurrent = {}, showImportHeatmap } = this.props
    const { cdn } = window.sugo
    const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
    const flag = projectCurrent.access_type !== AccessDataType.SDK
    return (
      <React.Fragment>
        {
          renderPageTitle('PC热力图分析')
        }
        <div className={classnames('relative', { 'hide': !flag })} style={{ height: 'calc(100vh - 200px)' }}>
          <div className="center-of-relative aligncenter">
            <p>
              <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
            </p>
            <div className="pd2t">
              这个项目不是SDK项目，不能使用热力图分析，请切换到由SDK创建的项目。
            </div>
          </div>
        </div>
        <div className={classnames('web-heatmap-wrapper right-content-bg height-100', { 'hide': flag })} >
          <div className="bg-grey-f7">
            {this.renderToolbar()}
          </div>
          <div className="main-content-wrapper">
            <div className="hm-frame-container" style={{ ...resolutionStyle }}>
              <iframe
                src="about:blank"
                id="sugo-heatmap-window"
                name="sghw"
                ref={r => this._iframe = r}
              />
            </div>
          </div>
        </div>
        <ImportHeatMapModal
          visible={showImportHeatmap}
          importHeatMap={this.importHeatMap}
          projectCurrent={projectCurrent}
          hideModal={() => this.changeState({ showImportHeatmap: false })}
        />
      </React.Fragment>
    )
  }
}
