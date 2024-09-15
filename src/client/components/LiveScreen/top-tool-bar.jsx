import React, { Component } from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import {
  BarsOutlined,
  CheckCircleOutlined,
  DesktopOutlined,
  DownOutlined,
  FileMarkdownOutlined,
  GlobalOutlined,
  LeftOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  SaveOutlined,
  ShareAltOutlined,
  SolutionOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons'
import {
  Button,
  Col,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Popover,
  Row,
  Slider,
  Tooltip} from 'antd'
import { genSharingLink } from '../../common/jwt-helper'
import AsyncHref from '../Common/async-href'
import CommonSaveModal from '../Common/save-modal'
import moment from 'moment'
import PropTypes from 'prop-types'
import { checkPermission } from '../../common/permission-control'
import './design.styl'
import SlicePicker from './slice-picker'
import Fetch from '../../common/fetch-final'
import SugoIcon from '../Common/sugo-icon'
import { LIVE_SCREEN_COVER_MODE, EXAMINE_STATUS, SharingTypeEnum } from '../../../common/constants'
import PublishSettingsModal from '../Publish/publish-settings-modal'
import AuthorizeSettingsModal from '../Examine/authorize-settings-modal'
import _ from 'lodash'
import { generate } from 'shortid'
import toCanvas from 'html2canvas'
import ExamineCheckModal from '../Examine/examine-check-modal'
import { browserHistory } from 'react-router'
import { chartData as newChartData } from './constants'
import { vizTypeNameMap, vizTypeIconMap } from '../../constants/viz-component-map'
import {immutateUpdates} from '../../../common/sugo-utils'
import FetchFinal, {handleErr}  from '../../common/fetch-final'
import PubSub from 'pubsub-js'
import {EditModal2} from '../LiveScreen/shareManager/edit-modal.jsx'
import withFetchTableData from '../../common/withFetchTableData'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import ShareManagerModel from '../LiveScreen/shareManager/model'
import RoleSettingPanel from './authorization-manager/role-setting.jsx'
import LivescreenRoleManager, { namespace } from './authorization-manager/model.js'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import { bindActionCreators } from 'redux'
import flatMenusType from '../../../common/flatMenus.js'
import { UploadedFileType } from 'common/constants'

const {enableNewMenu, menus} = window.sugo
const namespaceTopToolBar = 'top-tool-bar'
const hasPublishManagerEntryInMenu = enableNewMenu 
  ? _.includes(flatMenusType(menus), '/console/publish-manager')
  : _.some(window.sugo.menus, menu => {
    return _.some(menu.children, subMenu => subMenu.path === '/console/publish-manager')
  })
const canPublish = checkPermission('post:/app/sharing')
const canCreateTemple = checkPermission('/app/livescreen/save/livescreenTemplate')

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}

const NewVizTypeNameMap = {
  ...vizTypeNameMap,
  ..._(newChartData).values()
    .flatMap(_.identity)
    .keyBy('type')
    .mapValues(v => v.name)
    .value()
}

const TypeIconDict = {
  ...vizTypeIconMap,
  ..._(newChartData).values()
    .flatMap(arr => arr.filter(d => d.iconType))
    .keyBy('type')
    .mapValues(v => v.iconType)
    .value()
}

const { Item: FormItem } = Form
const canEdit = checkPermission('/app/livescreen/update')
const screenMap = {
  screenId: 'id',
  title: 'title',
  screenWidth: 'screen_width',
  screenHeight: 'screen_height',
  backgroundImageId: 'background_image_id',
  coverImageId: 'cover_image_id',
  coverMode: 'cover_mode'
}
const componentMap = {
  id: 'id',
  type: 'viz_type',
  style_config: 'style_config',
  width: 'width',
  height: 'height',
  left: 'left',
  top: 'top',
  zIndex: 'z_index',
  params: 'data_source_config',
  offset: 'offset'
}

const ChartData = {
  bar: {
    icon: 'bar-chart',
    text: '柱图',
    children: ['dist_bar', 'balance_bar', 'multi_dim_bar', 'horizontal_bar',
      'multi_dim_stacked_bar', 'bar_and_line', 'pictorial_bar']
  },
  line: {
    icon: 'line-chart',
    text: '线图',
    children: ['line', 'multi_dim_line', 'multi_dim_ratio_line']
  },
  pie: {
    icon: 'pie-chart',
    text: '饼图',
    children: ['pie']
  },
  // dot: {
  //   icon: 'dot-chart',
  //   text: '散点图',
  //   children: ['liquidFill'] //'heat_map','bubble',
  // },
  map: {
    icon: 'environment',
    text: '地图',
    children: ['scatter_map', 'map', 'migration_map', 'arcgis']
  },
  associated: {
    icon: 'share-alt',
    text: '关系',
    children: ['chord', 'tree', 'force']//轮播表格
  },
  text: {
    icon: 'bars',
    text: '文本',
    children: [
      'number', 'input_number', 'number_lift', 'wordCloud', 
      'line_text', 'rich_text_list', 'rich_text_list_for_smart'
    ] // 环比控件
  },
  table: {
    icon: 'table',
    text: '表格',
    children: ['table', 'table_flat', 'table_transfer']//轮播表格
  },
  material: {
    icon: 'paper-clip',
    text: '素材',
    children: ['image', 'IframeBox', 'video']//轮播表格
  },
  progress: {
    icon: 'area-chart',
    text: '进度图',
    children: ['gauge', 'gauge_1', 'beauty_gauge', 'progress_bar', 'liquidFill', 'step_progress', 'bullet']
  },
  other: {
    icon: 'ellipsis',
    text: '其他',
    children: [
      'tree_map', 'radar', 'blank', 'theme_picker',
      'data_filter_control', 'drop_down_popover', 'inspect_slice_btn', 'bubble', 'back_btn'
    ]
  }
}
const showShare = (namespace) => props => {
  return ShareManagerModel({...props, namespace})
}

@withRuntimeSagaModel([showShare(namespaceTopToolBar), LivescreenRoleManager])
@connect(state => {
  return {
    ...state[namespace],
    roles: _.get(state, 'common.roles'),
    institutions: _.get(state, 'common.institutionsList'),
    institutionsTree: _.get(state, 'common.institutionsTree')
  }
}, dispatch => bindActionCreators(actions, dispatch))
@Form.create()
class TopToolBar extends Component {
  static propTypes = {
    title: PropTypes.string,
    screenId: PropTypes.string,
    doSaveLiveScreen: PropTypes.func,
    doChangeScale: PropTypes.func,
    scale: PropTypes.number,
    submitExamine: PropTypes.func
  }

  state = {
    visiblePopoverKey: false,
    addSliceModalVisible: false,
    showTemplateNameSet: false,
    templateName: '',
    // examine: {},
    authorizeTo: [],
    checkModalVisible: false
  }

  componentDidMount() {
    this.props.getRoles()
    this.props.getInstitutions()
  }
  // componentWillReceiveProps (nextProps) {
  //   const { examine={}, authorizeTo } = this.props
  //   const { examine: nextExamine={}, authorizeTo: nexAuthorizeTo } = nextProps
  //   const {statExamine} = this.state
  //   if ((examine.id !== nextExamine.id) || (!statExamine && nextExamine.id)) {
  //     this.setState({examine: {...nextExamine}})
  //   }
  //   if (authorizeTo !== nexAuthorizeTo && _.difference(nexAuthorizeTo, authorizeTo).length) {
  //     this.setState({authorizeTo: nexAuthorizeTo})
  //   }
  // }

  // componentDidUpdate(prevProps) {
  //   const { examine = {}, authorizeTo = [] } = this.props
  //   const { examine: prevExamine = {}, authorizeTo: prevAuthorizeTo = [] } = prevProps
  //   const { examine: stateExamine = {}, authorizeTo: stateAuthorizeTo = [] } = this.state
  //   // if (examine.id !== prevExamine.id && examine.id !== stateExamine.id && examine.id !== stateExamine.id) {
  //   if (!_.isEqual(stateExamine, examine) || !_.isEqual(examine, prevExamine)) {
  //     this.setState({ examine: { ...examine } })
  //   }

  //   if ((_.difference(authorizeTo, prevAuthorizeTo).length || _.difference(prevAuthorizeTo, authorizeTo).length)
  //     && (_.difference(authorizeTo, stateAuthorizeTo).length || _.difference(stateAuthorizeTo, authorizeTo).length)) {
  //     this.setState({ authorizeTo })
  //   }
  // }

  convertDataToDB = (map, obj) => {
    return _.reduce(
      _.pick(obj, Object.keys(map)),
      (result, value, key) => {
        result[map[key]] = value
        return result
      },
      {}
    )
  }

  updateOrCreateSlice = async (newName, action = 'update', dataSourceId) => {
    let { params: { id: imageId } } = this.props
    let tempSlice = {
      id: action === 'update' ? 'test' : undefined,
      'slice_name': newName,
      druid_datasource_id: dataSourceId,
      'updated_at': moment().toISOString(),
      'params': {
        'vizType': 'IframeBox',
        'openWith': 'livescreen',
        'chartExtraSettings': {
          'imageUrl': imageId
        }
      },
      'datasource_name': null
    }
    let res = await this.saveSlice(tempSlice)
    if (res && 400 <= res.status) {
      // message.success('保存单图失败')
      return null
    }
    return res
  }

  saveSlice = async (newSlice) => {
    let errStatus = null
    let res = await FetchFinal.post(
      newSlice.id ? '/app/slices/update/slices' : '/app/slices/create/slices',
      newSlice,
      {
        handleErr: async resp => {
          handleErr(resp)
          errStatus = resp.status
        }
      }
    )

    return errStatus ? { ...(res || {}), status: errStatus } : res
  }

  handleSaveToTemplate = () => {
    const {
      forAddComps,
      forUpdateComps,
      forDeleteComps,
      doSaveLiveScreenTemplate,
      componentDataConfig,
      isTemplate,
      screenComponents,
      ...rest
    } = this.props

    let livescreen = this.convertDataToDB(screenMap, rest)
    if (!isTemplate) {
      livescreen = _.omit(livescreen, ['id'])
    }

    livescreen.title = this.state.templateName || ''

    const adds = (isTemplate ? forAddComps : screenComponents).reduce((result, component) => {
      let componentInfo = {
        ...component,
        params: _.get(componentDataConfig, component.id, component.params),
        id: !isTemplate ? generate() : component.id
      }
      result.push(this.convertDataToDB(componentMap, componentInfo))
      return result
    }, [])
    const updates = forUpdateComps.reduce((result, component) => {
      let componentInfo = {
        ...component,
        params: _.get(componentDataConfig, component.id, component.params)
      }
      result.push(this.convertDataToDB(componentMap, componentInfo))
      return result
    }, [])
    const deletes = forDeleteComps.reduce((result, component) => {
      result.push(this.convertDataToDB(componentMap, component))
      return result
    }, [])

    doSaveLiveScreenTemplate(livescreen, adds, updates, deletes, () => {
      message.success('模板保存成功')
      this.setState({ showTemplateNameSet: false })
    })
  }

  screenshots = () => {
    const { coverMode, coverImageId, cover_mode } = this.props
    if (coverMode === LIVE_SCREEN_COVER_MODE.automatic) {
      const screenshot = document.querySelector('#preview')
      toCanvas(screenshot).then(canvas => {
        const formdata = new FormData()
        canvas.toBlob(async blob => {
          const name = `${Date.now()}.png`
          formdata.append('file', blob, name)
          const response = await fetch('/app/uploaded-files/upload', {
            method: 'POST',
            body: formdata,
            headers: new Headers({
              'Access-Control-Allow-Origin': '*',
              token: window.sugo.file_server_token
            })
          }).then(response => response.json())
          if (response.result && response.result.id) {
            let res = await Fetch.post('/app/uploaded-files/create',
              { name, type: UploadedFileType.imgSnapshoot, path: `/f/${response.result.filename}` }  
            )
            const coverId = res.result.id || message.error('更新封面图失败')
            this.handleSaveLiveScreen(coverId)
            // 删除原来的图片
            cover_mode === LIVE_SCREEN_COVER_MODE.automatic && Fetch.delete(`/app/uploaded-files/delete/${coverImageId}`)
          } else {
            this.handleSaveLiveScreen()
            message.error('更新封面图失败')
          }
        })
      })
    } else {
      this.handleSaveLiveScreen()
    }
  }

  handleSaveLiveScreen = (coverImageId) => {
    const {
      forAddComps,
      forUpdateComps,
      forDeleteComps,
      doSaveLiveScreen,
      screenComponents,
      ...rest
    } = this.props
    const livescreen = this.convertDataToDB(screenMap, rest)

    const adds = forAddComps.reduce((result, component) => {
      result.push(this.convertDataToDB(componentMap, component))
      return result
    }, [])
    // const updates = forUpdateComps.reduce((result, component) => {
    //   result.push(this.convertDataToDB(componentMap, component))
    //   return result
    // }, [])
    //添加公共数据联动筛选
    let addUpdatesScreening = []
    forUpdateComps.map(forUpdateComp => {
      let boolean = forUpdateComp.params && forUpdateComp.params.vizType === 'data_filter_control' 
        && forUpdateComp.params.selectParamsOverWriterPreSetList
      if (boolean) {
        //过滤数据联动组件
        let cloneComponents = _.cloneDeep(screenComponents)
        addUpdatesScreening = (_.isEmpty(addUpdatesScreening) ? cloneComponents : addUpdatesScreening).map(item => {
          //需要更新组件操作
          let index = _.findIndex(forUpdateComps, {id: item.id})
          if (index >= 0) {
            return forUpdateComps[index].params.vizType === 'data_filter_control'
              ? immutateUpdates(forUpdateComps[index], 'params.paramsOverWriterPreSetList', ()=>[])
              :immutateUpdates(forUpdateComps[index], 'params.paramsOverWriterPreSetList', (pre)=>{
                let paramsOverWriterPreSetList = [...(pre || []),
                  ...(forUpdateComp.params.selectParamsOverWriterPreSetList || [])]
                return _.uniq(paramsOverWriterPreSetList)
              })
          }
          //其他组件操作
          return immutateUpdates(item, 'params.paramsOverWriterPreSetList',(pre)=>{
            let paramsOverWriterPreSetList = [...(pre || []), ...(forUpdateComp.params.selectParamsOverWriterPreSetList || [])]
            return _.uniq(paramsOverWriterPreSetList)
          })
        })
      }
      return forUpdateComp
    })
    const updates = (_.isEmpty(addUpdatesScreening) ? forUpdateComps : addUpdatesScreening).reduce((result, component) => {
      result.push(this.convertDataToDB(componentMap, component))
      return result
    }, [])
    const deletes = forDeleteComps.reduce((result, component) => {
      result.push(this.convertDataToDB(componentMap, component))
      return result
    }, [])

    if (coverImageId) { // 截图过来的 CoverImageId
      livescreen.cover_image_id = coverImageId
      livescreen.cover_mode = LIVE_SCREEN_COVER_MODE.automatic
    }

    doSaveLiveScreen(livescreen, adds, updates, deletes, () => {
      message.success('保存成功')
    })
  }

  handleAddComponent = _.debounce(
    (type, name) => this.props?.doAddComponent(type, name),
    1000, 
    { leading: true, trailing: false }
  )
    
  renderSaveBtn = (examine) => {
    let { visiblePopoverKey, isTemplate } = this.state
    if (isTemplate || examine !== EXAMINE_STATUS.pass) {
      return null
    }
    return (
      <CommonSaveModal
        modelType="单图"
        visible={visiblePopoverKey === 'analytic-save-slice-modal'}
        onVisibleChange={visible => {
          PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analytic-save-slice-modal')
        }}
        getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
        canSaveAsOnly
        canSelectDataSourceId
        allowCreate
        allowUpdate
        onSaveAs={async (newName, dataSourceId) => {
          let res = await this.updateOrCreateSlice(newName, 'saveAs', dataSourceId)
          if (res) {
            message.success('保存成功')
          }
        }}
      >
        <Tooltip title="保存为单图">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            size="default"
            className="mg1l popover-anchor"
            onClick={() => PubSub.publish('analytic.onVisiblePopoverKeyChange', 'analytic-save-slice-modal')}
          /></Tooltip>
      </CommonSaveModal>
    )
  }
  changeState = (payload) => {
    this.props.dispatch({
      type: `${namespaceTopToolBar}/changeState`,
      payload
    })
  }

  changeAuthorizationState = (payload) => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }
 
  onEdit = (id) => {
    this.changeState({isShowEditModal: true})
    this.props.dispatch({
      type: `${namespaceTopToolBar}/getShareById`,
      payload: {id}
    })
  }

  onBeforeSaveOrPreview = (evt) => {
    const { screenComponents, originScreenComponents } = this.props
    if(screenComponents.length !== originScreenComponents.length || 
      _.some(originScreenComponents, (component, index) => !_.isEqual(component, screenComponents[index]))
    ) {
      message.info('画布已变更，请先保存')
      evt.preventDefault()
      return false
    }
    return true
  }

  renderSharingBtn = () => {
    const { screenId, isTemplate, data, examineStatus, authorizationType } = this.props
  
    if (!canEdit || EXAMINE_STATUS.pass !== examineStatus || authorizationType === 0 || isTemplate) {
      return null
    }
    let shareData = _.find(data, {content_id: screenId})
    //统一分享编辑页面
    return (!screenId || !canPublish) ? null : (
      <React.Fragment>
        <Button
          type="primary"
          className="mg1l"
          icon={<ShareAltOutlined />}
          onClick={()=>{this.onEdit(shareData ? shareData.id : '')}}
        >分享</Button>
        {
          //   <PublishSettingsModal
          //   getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
          //   key={`sharing_${screenId}` || 'sharing_0'}
          //   shareType={SharingTypeEnum.LiveScreen}
          //   shareContentId={screenId}
          //   extraInfo={{
          //     shareContentName: title
          //   }}
          // >
          //   <Button
          //     type="primary"
          //     className="mg1l"
          //     icon="share-alt"
          //   >分享</Button>
          // </PublishSettingsModal>
        }
      </React.Fragment>
    )
  }

  renderPublishBtn = (examine) => {
    const { title, screenId, isTemplate } = this.props
    if (!canEdit || isTemplate || _.includes([-1, EXAMINE_STATUS.wait, EXAMINE_STATUS.notsubmit, EXAMINE_STATUS.failed], examine)) {
      return null
    }
    return (!screenId || !canPublish || !hasPublishManagerEntryInMenu) ? null : (
      <PublishSettingsModal
        getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
        key={`publish_${screenId}` || 'publish_1'}
        shareType={SharingTypeEnum.LiveScreenPub}
        shareContentId={screenId}
        extraInfo={{
          shareContentName: title
        }}
      >
        <Button
          type="primary"
          className="mg1l"
          icon={<GlobalOutlined />}
        >发布</Button>
      </PublishSettingsModal>
    )
  }

  /**
   * @description 提交审核按钮
   * @memberOf TopToolBar
   */
  renderExamineBtn = () => {
    const { screenId, isTemplate, submitExamine, examineStatus, authorizationType } = this.props
    // 审核通过，又保存情况，（审核人不出现此按钮）
    if (!canEdit ||  EXAMINE_STATUS.wait === examineStatus ||  EXAMINE_STATUS.pass === examineStatus || authorizationType === 0) {
      return null
    }
    return (!screenId) ? null : (
      <Button 
        type="primary" 
        className="mg1l" 
        icon={<SolutionOutlined />} 
        onClick={(e) => {
          !!this.onBeforeSaveOrPreview(e) && (
            Modal.confirm({
              title: '确认提交审核?（若您所在机构未配置审核流，确认提交审核则直接审核通过）',
              okText: '确定',
              cancelText: '取消',
              onOk() {
                submitExamine(screenId, isTemplate, (v, m) => v ? message.success('发布成功') : message.error(`提审失败,${m}`))
              }
            })
          )
        }}
      >提交审核</Button>
    )
  }

  renderAuthorizeBtn = (examine) => {
    const { screenId, created_by, isTemplate } = this.props
    const { authorizeTo } = this.state
    let userId = window.sugo.user.id
    let owned = userId === created_by
    if (!canEdit || isTemplate || !owned || examine !== EXAMINE_STATUS.pass) {
      return null
    }
    return (!screenId || !hasPublishManagerEntryInMenu) ? null : (
      <AuthorizeSettingsModal
        getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
        key={screenId || '0'}
        screenId={screenId}
        authorizeTo={authorizeTo}
        setAuthorizeTo={(authorizeTo) => {
          authorizeTo && this.setState({ authorizeTo })
        }}
      >
        <Button
          type="primary"
          className="mg1l"
          icon={<UsergroupAddOutlined />}
        >授权</Button>
      </AuthorizeSettingsModal>
    )
  }

  renderTemplateNameSetModal = () => {
    const { showTemplateNameSet, templateName } = this.state
    return (
      <Modal
        visible={showTemplateNameSet}
        onCancel={() => this.setState({ showTemplateNameSet: false })}
        title={'保存模板'}
        closable
        width={450}
        onOk={this.handleSaveToTemplate}
        getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
        footer={
          <div>
            <Button onClick={() => this.setState({ showTemplateNameSet: false })}>取消</Button>
            <Button type="primary" className="mg1l" disabled={!templateName} onClick={this.handleSaveToTemplate}>保存</Button>
          </div>
        }
      >
        <FormItem
          label="模板名称"
          {...formItemLayout}
        >
          <Input defaultValue={templateName} onChange={e => this.setState({ templateName: e.target.value })} />
        </FormItem>
      </Modal>
    )
  }

  renderChartItemSelect = () => {
    return _.keys(ChartData).map((p, i) => {
      p = ChartData[p]
      const content = (
        <div key={`slice-group-${i}`}>
          <Row className="width400" key={`row_${i}`}>
            {
              p.children.map((c, j) => {
                const name = NewVizTypeNameMap[c]
                return (
                  <Col 
                    key={`slice-${i}-${j}`} 
                    span={8} 
                    onClick={() => {
                      this.handleAddComponent(c, name)
                      if (c === 'blank') {
                        this.setState({ addSliceModalVisible: true })
                      }
                    }}
                  >
                    <div 
                      className="pd2 pointer"
                      style={{
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      <SugoIcon className="mg1r" type={TypeIconDict[c]} />
                      {name || c}
                    </div>
                  </Col>
                )
              })
            }
          </Row>
        </div>
      )
      return (
        <Popover
          key={`chart_${i}`}
          getPopupContainer={() => _.get(document.getElementsByClassName('live-screen-top-tool'), '0', document.body)}
          content={content}
          placement="bottomLeft"
        >
          <div className="iblock mg2r"><LegacyIcon className="mg1r" type={p.icon} />{p.text}</div>
        </Popover>
      )
    })
  }

  renderReviewBtn = () => {
    const { screenId } = this.props
    return (
      <AsyncHref
        target="_blank"
        initFunc={() => {
          return genSharingLink({
            redirect: `/livescreen/${screenId}`,
            pathScopes: ['*'],
            expiresIn: '24h'
          })
        }}
        onClick={e => this.onBeforeSaveOrPreview(e)}
      >
        <Button className="mg1l" icon={<DesktopOutlined />} type="primary">预览</Button>
      </AsyncHref>
    )
  }

  renderSaveLivescreenBtn = () => {
    const { isTemplate, examineStatus, authorizationType } = this.props
    if (!canEdit || isTemplate || examineStatus === EXAMINE_STATUS.wait || authorizationType === 0) {
      return null
    }
    return (
      <Button 
        className="mg1l" 
        icon={<SaveOutlined />} 
        type="primary" 
        onClick={this.screenshots}
      >保存</Button>
    )
  }

  /**
   * @description 审核按钮
   * @memberOf TopToolBar
   */
  renderCheckButton = (examine, examineUser) => {
    const { isTemplate } = this.props
    const canAudit = examine === EXAMINE_STATUS.failed || examine === EXAMINE_STATUS.wait
    if (!canEdit || isTemplate || !canAudit || examineUser !== sugo.user.id) {
      return null
    }
    return <Button className="mg1l" icon={<CheckCircleOutlined />} type="primary" onClick={() => this.setState({ checkModalVisible: true })} >审核</Button>
  }

  renderCheckPanel = (examine, examineUser) => {
    const { checkModalVisible } = this.state
    const { screenId, isTemplate } = this.props
    const canAudit = examine === EXAMINE_STATUS.failed || examine === EXAMINE_STATUS.wait
    if (!canEdit || isTemplate || !canAudit || examineUser !== sugo.user.id) {
      return null
    }
    // 审核通过、不通过回调按钮
    const changeStatus = () => {
      // this.setState({
      //   checkModalVisible: false,
      //   examine: { ...curExamine, status }
      // })
      // TODO 更新当前examine.status状态 渲染对应状态按钮
      window.location.href = location.href
    }
    return (
      <ExamineCheckModal
        getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
        screenId={screenId}
        visible={checkModalVisible}
        changeStatus={changeStatus}
        hideModal={() => this.setState({ checkModalVisible: false })}
      />
    )
  }

  renderSaveLivescreenTemplateBtn = () => {
    const { isTemplate, title, examineStatus, authorizationType } = this.props
    if (
      !canEdit || 
      _.includes([EXAMINE_STATUS.failed, EXAMINE_STATUS.notsubmit, EXAMINE_STATUS.wait, examineStatus]) || 
      authorizationType === 0
    ) {
      return null
    }
    return (
      <Button 
        className="mg1l" 
        icon={<FileMarkdownOutlined />} 
        type="primary" 
        onClick={() => this.setState({ showTemplateNameSet: true, templateName: isTemplate ? title : `模板-${title}` })}
      >保存大屏模板</Button>
    )
  }

  renderAuthorizationBtn = () => {
    const { isTemplate, examineStatus, authorizationType, screenId, authorizeList } = this.props
    if (!canEdit || isTemplate || examineStatus === EXAMINE_STATUS.wait || authorizationType === 0) {
      return null
    }
    if (examineStatus === EXAMINE_STATUS.pass) {
      return (
        <Button 
          className="mg1l" 
          icon={<UsergroupAddOutlined />} 
          type="primary" 
          onClick={() => {
            this.props.dispatch({
              type: `${namespace}/changeState`,
              payload: { editInfo: _.find(authorizeList, {livescreen_id: screenId}), editVisible: true}
            })
          }}
        >
        授权
        </Button>
      )
    }
    return null
  }

  renderSettingPanel = () => {
    const { roles, institutions, editInfo, institutionsTree, editVisible, screenId } = this.props
    return (
      <RoleSettingPanel
        roleList={roles}
        institutionsList={institutions}
        institutionsTree={institutionsTree}
        value={editInfo.roles}
        editVisible={editVisible}
        hide={() => this.changeAuthorizationState({ editVisible: false })}
        save={({ writeSelectRoles, readSelectRoles }) => {
          this.props.dispatch({
            type: `${namespace}/updateAuthorization`,
            payload: { writeRoles: writeSelectRoles, readRoles: readSelectRoles, livescreenId: screenId }
          })
        }}
      />
    )
  }

  render() {
    const { title, doChangeScale, scale, activedId, isShowEditModal, onRefresh, screenId, editVisible } = this.props
    const { examine = {} } = this.state
    let { status: isExamine = -1 } = examine
    const paths = [
      this.renderSharingBtn(isExamine),
      this.renderAuthorizationBtn(),
      // this.renderPublishBtn(isExamine),
      this.renderExamineBtn(),
      // this.renderCheckButton(isExamine, examineUser),
      this.renderSaveLivescreenTemplateBtn()
    ].filter(_.identity)
    const menu = (
      <Menu className="screen-workbench-control-theme">
        {paths.map((p, idx) => (<Menu.Item key={`menu-btn-${idx}`}>{p}</Menu.Item>))}
      </Menu>
    )
    return (
      <React.Fragment>
        {
          editVisible ? this.renderSettingPanel() : null
        }
        <EditModal2 visible={isShowEditModal} onRefresh={onRefresh} namespace={namespaceTopToolBar} 
          title={title} screenId={screenId}
        />
        <div className="live-screen-top-tool screen-workbench-control-theme">
          <Tooltip title={title}>
            <div className="width150 mg2r iblock live-sceen-top-tool-height elli" >{title}</div>
          </Tooltip>
          <div className="iblock">
            {this.renderChartItemSelect()}
          </div>
          <div className="fright">
            <div className="icon-wrapper iblock width250 mg3r live-screen-size-slider">
              <MinusCircleOutlined className="iblock pointer" onClick={() => doChangeScale(scale - 1)} />
              <Slider value={scale} onChange={(v) => doChangeScale(v)} />
              <PlusCircleOutlined className="iblock pointer" onClick={() => doChangeScale(scale + 1)} />
            </div>
            {this.renderReviewBtn()}
            {this.renderSaveLivescreenBtn()}  { /* 保存 */}
            <Dropdown
              className="ant-tool-btn"
              overlay={menu}
              getPopupContainer={() => _.get(document.getElementsByClassName('live-screen-top-tool'), '0', document.body)}
            >
              <Button>
                <BarsOutlined />
                <DownOutlined />
              </Button>
            </Dropdown>
            <Button className="mg1l" onClick={() => browserHistory.push('/console/livescreen')} icon={<LeftOutlined />}>返回</Button>
          </div>
        
          {/* {screenId ? this.renderCheckPanel(isExamine, examineUser) : null} */}
        </div>
        <SlicePicker
          visible={this.state.addSliceModalVisible}
          onSliceSelected={async (sliceId) => {
            let sliceDetail = await Fetch.get(`/app/slices/get/slices/${sliceId}`)
            let { params } = sliceDetail
            const tempParams = {
              ...params,
              accessDataType: 'project',
              druid_datasource_id: sliceDetail.druid_datasource_id,
              dimensionExtraSettingDict: params.dimensionExtraSettingDict
            }
            this.props.doModifyComponent({ id: activedId, type: params.vizType, params: tempParams })
          }}
          onVisibleChange={visible => this.setState({ addSliceModalVisible: visible })}
        />
        {canCreateTemple ? this.renderTemplateNameSetModal() : null}
      </React.Fragment>
    )
  }
}

export default withFetchTableData(Form.create()(TopToolBar), {namespace: namespaceTopToolBar})
