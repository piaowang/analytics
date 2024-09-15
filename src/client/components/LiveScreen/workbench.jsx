import React from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from './actions/workbench'
import {message, Spin} from 'antd'
import {Button2 as Button} from '../Common/sugo-icon'
import EditorPanel from './editor-panel'
import CenterPanel from './center-panel'
import * as ls from '../../common/localstorage'
import * as PubSub from 'pubsub-js'
import _ from 'lodash'
import {checkPermission} from '../../common/permission-control'
import CommonSaveModal from '../Common/save-modal'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import FetchFinal, {handleErr} from '../../common/fetch-final'
import moment from 'moment'
import TopToolBar from './top-tool-bar'
import ComponentList from './panel-list'
import {getProjectList} from './actions/workbench'

const canEdit = checkPermission('/app/livescreen/update')

const screenMap = {
  screenId: 'id',
  title: 'title',
  screenWidth: 'screen_width',
  screenHeight: 'screen_height',
  backgroundImageId: 'background_image_id',
  coverImageId: 'cover_image_id'
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

@withDbDims(({datasourceCurrent}) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return ({
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    disabledCache: true,
    resultFilter: dim => dim.parentId === dsId
  })
})
@connect(
  state => state.livescreen_workbench,
  dispatch => bindActionCreators(actions, dispatch)
)
export default class FullScreenWorkBench extends React.Component {

  state = {
    visiblePopoverKey: null,
    CommonSaveModalVisible: false
  }

  componentDidMount() {
    const { screenId } = this.props
    const { id } = this.props.params
    const byName = _.get(this.props.location, 'query.byName')
    PubSub.subscribe('analytic.onVisiblePopoverKeyChange', (msg, key) => {
      if (key !== this.state.visiblePopoverKey) {
        this.setState({ visiblePopoverKey: key })
      }
    })
    window.addEventListener('resize', this.onWindowResize)
    if (byName) {
      this.props.init('', byName)
    } else {
      this.props.init(id)
    }
    
    // 取得项目信息，MySQL 项目不使用排队查询逻辑
    getProjectList()()
  }

  componentWillUnmount() {
    // const { destroy } = this.props
    window.removeEventListener('resize', this.onWindowResize)
    // destroy()
  }

  onWindowResize = () => {
    const { clientHeight, clientWidth } = document.documentElement
    this.props.doSyncClientSize(clientHeight, clientWidth)
  }

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

  handlePreview = () => {
    const livescreen = this.convertDataToDB(screenMap, this.props)
    const components = this.props.screenComponents.reduce((result, component) => {
      result.push(this.convertDataToDB(componentMap, component))
      return result
    }, [])
    livescreen.components = components
    ls.set('livescreen_preview', livescreen)
  }

  handleSaveLiveScreen = () => {
    const {
      forAddComps,
      forUpdateComps,
      forDeleteComps,
      doSaveLiveScreen,
      ...rest
    } = this.props

    const livescreen = this.convertDataToDB(screenMap, rest)

    const adds = forAddComps.reduce((result, component) => {
      result.push(this.convertDataToDB(componentMap, component))
      return result
    }, [])
    const updates = forUpdateComps.reduce((result, component) => {
      result.push(this.convertDataToDB(componentMap, component))
      return result
    }, [])
    const deletes = forDeleteComps.reduce((result, component) => {
      result.push(this.convertDataToDB(componentMap, component))
      return result
    }, [])

    doSaveLiveScreen(livescreen, adds, updates, deletes, () => {
      message.success('保存成功')
    })
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
        'openWith' : 'livescreen',
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
      {handleErr: async resp => {
        handleErr(resp)
        errStatus = resp.status
      }}
    )

    return errStatus ? {...(res || {}), status: errStatus} : res
  }

  renderSaveBtn = () => {
    let { visiblePopoverKey, CommonSaveModalVisible } = this.state
    return (
      <CommonSaveModal
        modelType="单图"
        visible={visiblePopoverKey === 'analytic-save-slice-modal'}
        onVisibleChange={visible => {
          PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analytic-save-slice-modal')
        }}
        canSaveAsOnly
        canSelectDataSourceId
        allowCreate
        allowUpdate
        onSaveAs={async (newName,dataSourceId) => {
          let res = await this.updateOrCreateSlice(newName, 'saveAs', dataSourceId)
          if (res) {
            message.success('保存成功')
            // browserHistory.push(`/console/analytic?sliceId=${res.result.id}`)
          }
        }}
        // onUpdate={async (newName) => {
        //   let res = await this.updateOrCreateSlice(newName, 'update')
        //   if (res) {
        //     message.success('保存成功!', 8)
        //     reloadSlices()
        //   }
        // }}
      >
        <Button
          type="primary"
          icon="sugo-save"
          style={{marginLeft: '12px'}}
          size="default"
          className="mg2r popover-anchor"
          onClick={() => PubSub.publish('analytic.onVisiblePopoverKeyChange','analytic-save-slice-modal')}
        >保存为单图</Button>
      </CommonSaveModal>
    )
  }


  render() {
    const { 
      screenId, loading, scale, doChangeScale,
      title, forAddComps, forUpdateComps,
      forDeleteComps, doSaveLiveScreen, cover_mode,
      activedId, doActiveComponent, screenComponents,
      doModifyComponent,doHoverComponent, doAddComponent,
      hoverId, runtimeState, ...res
    } = this.props
    
    return (
      <div className="height-100 screen-workbench">
        <div>
          <TopToolBar
            title={title}
            screenId={screenId}
            scale={scale}
            doChangeScale={doChangeScale}
            forAddComps={forAddComps}
            forUpdateComps={forUpdateComps}
            forDeleteComps={forDeleteComps}
            doSaveLiveScreen={doSaveLiveScreen}
            doAddComponent={doAddComponent}
            doModifyComponent={doModifyComponent}
            activedId={activedId}
            screenComponents={screenComponents}
            cover_mode={cover_mode}
            {...res}
          />
          {/* <div className="fix">
            <div className="fleft">
              <div className="iblock">
                <Link to="/console/livescreen">
                  <Icon type="left-circle-o" className="back-icon" />
                </Link>
                编辑大屏
              </div>
            </div>
            <div className="fright" 
              style={{
                height:'44px',
                display:'flex',
                flexWrap:'nowrap',
                alignItems:'center',
              }}
            >
              <div className="icon-wrapper iblock width250 mg3r">
                <Icon className="iblock pointer" type="minus-circle-o" onClick={() => doChangeScale(scale - 10)} />
                <Slider value={scale} onChange={(v) => doChangeScale(v)} />
                <Icon className="iblock pointer" type="plus-circle-o" onClick={() => doChangeScale(scale + 10)} />
              </div>
              {this.renderSaveBtn()}
              <Button
                type="primary"
                icon="desktop"
                href={`/livescreen/${screenId}`}
                target="_blank"
                onClick={this.handlePreview}
              >预览效果</Button>
  
              {(!screenId || !canPublish || !hasPublishManagerEntryInMenu) ? null : (
                <PublishSettingsModal
                  key={screenId || '0'}
                  shareType={SharingTypeEnum.LiveScreen}
                  shareContentId={screenId}
                  extraInfo={{
                    shareContentName: title
                  }}
                >
                  <Tooltip title="发布" >
                    <Button
                      type="primary"
                      className="mg2l"
                      icon="share-alt"
                    >发布大屏</Button>
                  </Tooltip>
                </PublishSettingsModal>
              )}
              
              {canEdit
                ? (
                  <Button className="mg2l" type="success" icon="save" onClick={this.handleSaveLiveScreen}>
                    保存实时大屏
                  </Button>
                ) : null}
            </div>
          </div> */}
        </div>
        <div className="relative">
          <Spin spinning={loading}>
            <ComponentList
             activedId={activedId}
             hoverId={hoverId}
             doActiveComponent={doActiveComponent}
             screenComponents={screenComponents} 
             doModifyComponent={doModifyComponent}
             doHoverComponent={doHoverComponent}
             />
            {/* <ChartPanel /> */}
            <EditorPanel cover_mode={cover_mode} />
            <CenterPanel runtimeState={runtimeState} />
          </Spin>
        </div>
      </div>
    )
  }
}

