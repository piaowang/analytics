import React from 'react'
import Bread from '../Common/bread'
import _ from 'lodash'
import '@ant-design/compatible/assets/index.css'
import { message, Popover, Select, Tooltip } from 'antd'
import Panels from './panels'
import Bookmark from './bookmark'
import ExportChartDataModal from './export-chart-data-modal'
import * as PubSub from 'pubsub-js'
import { getPrevPathname, withHashStateDec } from '../Common/hash-connector'
// import AutoReload from './auto-reload'
import classNames from 'classnames'
import { compressUrlQuery, decompressUrlQuery, delayPromised, isDiffByPath, tryJsonParse } from '../../../common/sugo-utils'
import HoverHelp from '../Common/hover-help'
import { browserHistory, Link } from 'react-router'
import { checkPermission } from '../../common/permission-control'
import Icon, { Button2 as Button } from '../Common/sugo-icon'
import UserGuide from '../Common/user-guide'
import genGuideData, { GUIDE_VERSION } from './analytic-user-guide-data'
import CommonSaveModal from './save-modal'
import helpLinkMap from 'common/help-link-map'
import UserGroupSelector from '../Common/usergroup-selector'
import { withDbDims } from '../Fetcher/data-source-dimensions-fetcher'
import { AccessDataType, AUTHORIZATION_PERMISSIONS_TYPE } from '../../../common/constants'
import { withSlicesDec } from '../Fetcher/slices-fetcher'
import AsyncTaskRunner from '../Common/async-task-runner'
import Fetch from '../../common/fetch-final'
import DruidColumnType from '../../../common/druid-column-type'
import { filtersJoin } from '../../../common/temp-metric'
import { isSuperUser } from '../../common/user-utils'
import { tagGroupParamsToSliceFilters } from '../TagManager/url-functions'
import PublishSliceDataApiSettingsModal from '../DataAPI/publish-slice-data-api-modal'

import { withDataSourceTags } from '../Fetcher/data-source-tags-fetcher'
import { withSizeProvider } from '../../components/Common/size-provider'
import flatMenusType from '../../../common/flatMenus.js'
import { Anchor } from '../Common/anchor-custom'
import { sliceParamsProperties } from "../../../common/druid-query-utils";

const { docUrl, enableNewMenu } = window.sugo
const helpLink = docUrl + helpLinkMap['startWith#/console/analytic']

const hasSlicesEntryInMenu = enableNewMenu
  ? !_.includes(flatMenusType(window.sugo.menus), '/console/slices')
  : _.some(window.sugo.menus, menu => {
    return _.some(menu.children, subMenu => !subMenu.hide && subMenu.path === '/console/slices')
  })
let hasUserGroupEntryInMenu = enableNewMenu
  ? _.includes(flatMenusType(window.sugo.menus), '/console/usergroup')
  : _.some(window.sugo.menus, menu => {
    return _.some(menu.children, subMenu => subMenu.path === '/console/usergroup')
  })
let hasDataAPIEntryInMenu = enableNewMenu
  ? _.includes(flatMenusType(window.sugo.menus), '/console/data-api')
  : _.some(window.sugo.menus, menu => {
    return _.some(menu.children, subMenu => subMenu.path === '/console/data-api')
  })

const { analyticDefaultTime = '-1 day', analytics_manual_load_chart_data = false, analyticBookmarkEnable = false, show_newest_data_at_first = true } = window.sugo

const canVisitSliceList = checkPermission('/console/slices')
const canCreateSlice = checkPermission('/app/slices/create/slices')
const canEditSlice = checkPermission('/app/slices/update/slices')
const canInspectSourceData = checkPermission('/console/analytic/inspect-source-data')
const canCreateDataAPI = checkPermission('post:/app/data-apis')
const canModDataAPI = checkPermission('put:/app/data-apis/:id')

@withHashStateDec(_.identity, props => {
  let { projectCurrent, mainTimeDimName } = props
  return {
    selectedDataSourceId: _.get(projectCurrent, 'datasource_id') || '', // 数据源未加载完，在 componentWillReceiveProps 处更新
    child_project_id: _.get(projectCurrent, 'parent_id') ? projectCurrent.id : null,
    timezone: 'Asia/Shanghai',
    autoReloadInterval: 0,
    tempMetricDict: {},
    localMetricDict: {},
    vizType: 'number',
    filters: mainTimeDimName ? [{ col: mainTimeDimName, op: 'in', eq: analyticDefaultTime, _willChange: show_newest_data_at_first }] : [],
    dimensions: [],
    metrics: [],
    dimensionExtraSettingDict: {},
    pinningDims: [],
    linkage: false
  }
})
@withSlicesDec(props => {
  let { location, datasourceList } = props
  let { sliceId } = location.query
  return {
    sliceId: sliceId || '',
    doFetch: !!(sliceId && datasourceList.length),
    onLoaded: async ([slice]) => {
      let { updateHashState, datasourceCurrent, changeProject, projectList } = props
      let { filters } = slice.params
      if (filters.length > 0) {
        //fix #2789 [自助分析]修复任意退回上一页面的问题
        slice.params.filters = filters.filter(f => !_.isEmpty(f.eq))
      }
      const nextHashState = {
        ...slice.params,
        selectedDataSourceId: slice.druid_datasource_id
      }

      // 打开其他项目的单图时，先修改当前项目
      if (slice.druid_datasource_id !== datasourceCurrent.id) {
        let targetProject = _.find(projectList, p => p.datasource_id === slice.druid_datasource_id)
        if (targetProject) {
          await changeProject(targetProject.id) // 执行后 url 是 /console/analytic
          await delayPromised(300)
          browserHistory.replace(`/console/analytic?sliceId=${slice.id}#${compressUrlQuery(JSON.stringify(nextHashState))}`) // 下次单图加载完成时不会再执行这步
        } else {
          return
        }
      } else {
        updateHashState(nextHashState, true)
      }

      // 如果是直接打开单图的话，则预先加载一次
      setTimeout(() => PubSub.publish('analytic.auto-load', 'whenNotQueryBefore'), 250)
    }
  }
})
@withDbDims(({ datasourceCurrent }) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    disabledCache: true,
    datasourceType: 'all',
    resultFilter: dim => dim.parentId === dsId
  }
})
class AnalyticMain extends React.Component {
  state = {
    visiblePopoverKey: null,
    isFetchingSliceData: false,
    userTagGroupDims: []
  }

  componentDidMount() {
    let { projectList, projectCurrent, mainTimeDimName, changeProject } = this.props

    // 切换到 hash 指定的项目
    if (!_.isEmpty(projectList)) {
      const hash = _.get(this.props.location, 'hash') || ''
      let selectedDataSourceId =
        _.get(this.props, 'selectedDataSourceId') ||
        _.get(tryJsonParse(decompressUrlQuery(hash.replace(/^#/, ''))), 'selectedDataSourceId') ||
        _.get(projectCurrent, 'datasource_id')

      let targetProj = selectedDataSourceId && _.find(projectList, ds => ds.datasource_id === selectedDataSourceId)
      if (targetProj) {
        changeProject(targetProj.id)
      } else {
        this.onSelectProject(projectList[0], mainTimeDimName)
      }
    }

    PubSub.subscribe('analytic.onVisiblePopoverKeyChange', (msg, key) => {
      if (key !== this.state.visiblePopoverKey) {
        this.setState({ visiblePopoverKey: key })
      }
    })
    if (!analytics_manual_load_chart_data) {
      PubSub.subscribe('analytic.isFetchingSliceData', (msg, isFetchingSliceData) => {
        if (this.state.isFetchingSliceData !== isFetchingSliceData) {
          this.setState({ isFetchingSliceData })
        }
      })
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (isDiffByPath(prevProps, this.props, 'projectCurrent')) {
      if (_.isEmpty(prevProps.projectCurrent)) {
        // 数据源加载得比较慢
        this.onSelectProject(this.props.projectCurrent, this.props.mainTimeDimName)
      } else if (this.props.mainTimeDimName !== prevProps.mainTimeDimName) {
        // 解决从无项目选择页面切到多维分析后mainTimeDimName变化不能生成新的hash
        this.onSelectProject(this.props.projectCurrent, this.props.mainTimeDimName)
      } else {
        // 切换项目后如果数据源id与目前单图的数据源id不一致则跳出当前单图
        let { sliceId } = this.props.location.query
        if (sliceId) {
          if (this.props.location.hash && this.props.selectedDataSourceId !== this.props.datasourceCurrent.id) {
            browserHistory.push('/console/analytic')
          }
        } else {
          this.onSelectProject(this.props.projectCurrent, this.props.mainTimeDimName)
        }
      }
    }
  }

  componentWillUnmount() {
    PubSub.unsubscribe('analytic')
  }

  setMark = obj => {
    let { druid_datasource_id } = obj
    let panelState = obj.params
    // 修正切换书签后没有停止计时的 bug
    let { autoReloadInterval = 0, ...rest } = panelState
    this.props.updateHashState({
      selectedDataSourceId: druid_datasource_id,
      autoReloadInterval,
      ...rest
    })
  }

  onSelectProject = (project, mainTimeDimName) => {
    this.props.updateHashState(prevState => {
      let nextChildProjId = project.parent_id ? project.id : null
      if (
        _.get(prevState, 'selectedDataSourceId') === project.datasource_id &&
        _.get(prevState, 'child_project_id') === nextChildProjId
        //mainTimeDimName为空filters包含服务端时间筛选时重新生成hash TODO fix
        // && (_.get(prevState, 'filters.length') > 0 && project.mainTimeDimName)
      ) {
        return {}
      }
      return {
        selectedDataSourceId: project.datasource_id,
        child_project_id: nextChildProjId,
        vizType: 'number',
        // 切换项目，maxTimeLoader 加载完成前，重置时间筛选，避免时间列不同导致报错
        filters: mainTimeDimName ? [{ col: mainTimeDimName, op: 'in', eq: analyticDefaultTime, _willChange: show_newest_data_at_first }] : [],
        dimensions: [],
        metrics: [],
        dimensionExtraSettingDict: {},
        autoReloadInterval: 0,
        tempMetricDict: {},
        localMetricDict: {},
        pinningDims: [],
        linkage: false
      }
    }, true)
  }

  updateOrCreateSlice = async (data, action = 'update') => {
    let {
      location,
      saveSlice,
      slices: [slice],
      child_project_id
    } = this.props
    let analyticParams = tryJsonParse(decompressUrlQuery(location.hash.slice(1)))
    let tempSlice = {
      id: action === 'update' ? slice.id : undefined,
      druid_datasource_id: analyticParams.selectedDataSourceId,
      child_project_id,
      // slice_name: '',
      params: _.omit(analyticParams, ['slice_name', 'selectedDataSourceId']),
      ...data
    }
    let res = await saveSlice(tempSlice)
    if (res && 400 <= res.status) {
      // message.success('保存单图失败')
      return null
    }
    return res
  }

  renderSaveBtn = () => {
    let {
      dataSourceTags,
      reloadSlices,
      slices: [slice]
    } = this.props
    let { visiblePopoverKey } = this.state
    let editable = window.sugo.user.id === _.get(slice, 'SugoUser.id')
    // 权限授权的可编辑权限 fix bug 1129
    let canEditByPerm = false
    if (slice && _.get(slice, 'authorization_permissions_type', 0) === AUTHORIZATION_PERMISSIONS_TYPE.read) {
      return null
    } else {
      canEditByPerm = true
    }
    return (
      <CommonSaveModal
        modelType='单图'
        visible={visiblePopoverKey === 'analytic-save-slice-modal'}
        onVisibleChange={visible => {
          PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analytic-save-slice-modal')
        }}
        tags={dataSourceTags}
        currModelName={slice && slice.slice_name}
        currModelTag={slice && slice.tags}
        currModelNotes={slice && slice.notes}
        canSaveAsOnly={!slice}
        allowCreate={canCreateSlice}
        allowUpdate={canEditByPerm ? canEditByPerm : canEditSlice && editable}
        onSaveAs={async data => {
          let res = await this.updateOrCreateSlice(data, 'saveAs')
          if (res) {
            message.success('保存成功')
            let { projectCurrent, selectedDataSourceId } = this.props

            // 为了新建单图后图表不刷新，带上现有的属性
            const nextHashState = {
              ..._.pick(this.props, sliceParamsProperties),
              child_project_id: projectCurrent.parent_id ? projectCurrent.id : null,
              selectedDataSourceId
            }
            browserHistory.push(`/console/analytic?sliceId=${res.result.id}#${compressUrlQuery(JSON.stringify(nextHashState))}`)
          }
        }}
        onUpdate={async data => {
          let res = await this.updateOrCreateSlice(data, 'update')
          if (res) {
            message.success('保存成功!', 8)
            reloadSlices()
          }
        }}
      >
        <Button type='success' icon='sugo-save' style={{ margin: '0 0 0 12px' }} size='default'>
          保存
        </Button>
      </CommonSaveModal>
    )
  }

  renderDownloadBtn = ({ visiblePopoverKey, ...rest }) => {
    let content =
      visiblePopoverKey === 'downloadButton' ? (
        <div className='width200 analytic-popover-btn'>
          <Tooltip title='查看/下载原数据' placement='leftBottom'>
            <Anchor href={`/console/analytic/inspect-source-data${window.location.hash}`} target='_blank'>
              <Button className='width-100' icon='sugo-download'>
                源数据
              </Button>
            </Anchor>
          </Tooltip>
          <Tooltip title='查看/下载当前图表数据' placement='leftBottom'>
            <Button
              className='width-100 mg1t'
              icon='sugo-download'
              onClick={() => {
                PubSub.publishSync('analytic.get-chart-data', () => {
                  PubSub.publish('analytic.onVisiblePopoverKeyChange', 'inspectingChartDataModal')
                })
              }}
            >
              当前图表数据
            </Button>
          </Tooltip>
        </div>
      ) : (
          <div className='width200 height70' />
        )
    return (
      <React.Fragment>
        <Popover
          placement='bottomLeft'
          content={content}
          visible={visiblePopoverKey === 'downloadButton'}
          onVisibleChange={visible => {
            PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'downloadButton')
          }}
        >
          <Button icon='sugo-download' type='ghost' {...rest} className={rest.className + ' analytic-download-button'}>
            数据查看/下载
          </Button>
        </Popover>

        <ExportChartDataModal
          modalVisible={visiblePopoverKey === 'inspectingChartDataModal'}
          onModalVisibleChange={visible => {
            PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'inspectingChartDataModal')
          }}
        />
      </React.Fragment>
    )
  }

  renderTopBar() {
    let { filters, updateHashState, datasourceList, projectList, selectedDataSourceId, datasourceCurrent, projectCurrent, dimNameDict } = this.props
    let { visiblePopoverKey, isFetchingSliceData } = this.state

    let userGroupFilter = _.find(filters || [], flt => flt.op === 'lookupin')

    let hasSomeDataSources = !!datasourceList[0]
    let DownloadButton = this.renderDownloadBtn
    return (
      <div className='alignright bg-white height42 pd1r'>
        <div className='fleft pd1t pd1b pd2l pd1r iblock height42'>
          <span className='font13 bold'>目标用户：</span>
          <UserGroupSelector
            datasourceCurrent={datasourceCurrent}
            allowCrossProject={_.get(window, 'sugo.allowUserGroupCrossProject')}
            projectList={projectList}
            value={userGroupFilter && userGroupFilter.eq}
            className={classNames('alignleft width200', { hidden: !hasSomeDataSources })}
            onChange={group => {
              // 清除选择
              if (!group) {
                updateHashState(prevState => {
                  return {
                    filters: prevState.filters.filter(flt => flt.op !== 'lookupin')
                  }
                })
                return
              }
              let groupby = group.params.groupby
              if (!(groupby in dimNameDict)) {
                groupby = _.get(datasourceCurrent, 'params.loginId') || _.get(datasourceCurrent, 'params.commonMetric[0]')
              }
              let newUserGroupFilter = {
                col: groupby,
                op: 'lookupin',
                eq: group.id
              }
              updateHashState(prevState => {
                // 从无到有的选择
                if (!userGroupFilter) {
                  return {
                    filters: prevState.filters.concat(newUserGroupFilter)
                  }
                }
                // 更改选择
                return {
                  filters: prevState.filters.map(flt => {
                    return flt.op === 'lookupin' ? newUserGroupFilter : flt
                  })
                }
              })
            }}
          />
        </div>

        <div className={classNames('height42 line-height42', { hidden: !hasSomeDataSources })} style={{ marginRight: '5px' }}>
          {analytics_manual_load_chart_data ? null : (
            <Button size='default' type='ghost' icon='reload' className='iblock' disabled={isFetchingSliceData} onClick={() => PubSub.publish('analytic.auto-load')}>
              刷新
            </Button>
          )}

          {/*
           <AutoReload
           visiblePopoverKey={visiblePopoverKey}
           onTimer={() => PubSub.publish('analytic.auto-load')}
           /> */}
          {this.renderLinkageBtn()}

          {this.renderPublishAPIBtn()}

          {analyticBookmarkEnable ? (
            <Bookmark
              className='inline'
              style={{ marginLeft: '12px', lineHeight: '32px' }}
              visiblePopoverKey={visiblePopoverKey}
              selectedDataSourceId={selectedDataSourceId}
              projectCurrent={projectCurrent}
              setMark={this.setMark}
            />
          ) : null}

          {this.renderSaveBtn()}

          <DownloadButton style={{ marginLeft: '12px' }} className={classNames({ hide: !canInspectSourceData })} visiblePopoverKey={visiblePopoverKey} />
        </div>
      </div>
    )
  }

  renderSliceNameInputForBread() {
    let {
      slices: [slice]
    } = this.props
    let sliceCreator = _.get(slice, 'SugoUser')
    let editable = window.sugo.user.id === _.get(sliceCreator, 'id')
    let sharingHint = sliceCreator && !editable ? `（此单图由 ${sliceCreator.first_name || sliceCreator.username} 分享）` : null
    return {
      name: (
        <span style={{ lineHeight: '25px' }}>
          单图：{_.get(slice, 'slice_name')}
          {sharingHint}
        </span>
      )
    }
  }

  renderFetchers() {
    let { projectCurrent, tagDatasource } = this.props

    // 如果是标签项目，则加载组合标签，可拖到筛选
    const tagDsId = projectCurrent.access_type === AccessDataType.Tag && _.get(tagDatasource, 'id')
    return (
      <React.Fragment>
        <AsyncTaskRunner
          args={[tagDsId]}
          task={async tagDsId => {
            if (!tagDsId) {
              return []
            }
            let { id: currUserId, SugoRoles } = window.sugo.user
            let roleIds = SugoRoles.map(r => r.id)
            let fetchRes = await Fetch.get('/app/tag-group/get', {
              roleIds: isSuperUser() ? [] : roleIds,
              where: {
                datasource_id: tagDsId
              }
            })
            return _.get(fetchRes, 'result', [])
          }}
          onResult={result => {
            let userTagGroupDims = this.convertUserTagGroupsToDbDims(result)
            this.setState({
              userTagGroupDims
            })
          }}
        />
      </React.Fragment>
    )
  }

  convertUserTagGroupsToDbDims(userTagGroupDims) {
    return userTagGroupDims
      .filter(p => p.status === 1)
      .map(tagGroup => {
        let tgFilters = [{ op: tagGroup.params.relation, eq: tagGroupParamsToSliceFilters(tagGroup.params) }]
        return {
          ...tagGroup,
          name: `_userTagGroup_${tagGroup.id}`,
          parentId: tagGroup.datasource_id,
          type: DruidColumnType.String,
          datasource_type: 'tag',
          role_ids: [_.get(window.sugo, 'user.SugoRoles[0].id')].filter(_.identity),
          tags: [],
          params: {
            filters: tgFilters,
            formula: filtersJoin(tgFilters)
          },
          is_druid_dimension: false
        }
      })
  }

  renderLinkageBtn = () => {
    let { linkage, updateHashState } = this.props
    return (
      <Tooltip title='请输入一个时间维度'>
        <Button
          type='default'
          style={{ background: linkage ? '#6969d7' : 'white', color: linkage ? 'white' : '#6365d8', margin: '0 0 0 12px' }}
          onClick={() => {
            let { dataSourceDimensions, dimensions } = this.props
            let dimension = _.find(dataSourceDimensions, { name: dimensions[0] })
            if (dimensions.length !== 1 || _.get(dimension, 'type', '') !== 4) {
              return message.warning('请输入一个时间维度')
            }
            updateHashState(prevState => {
              return {
                linkage: !prevState.linkage
              }
            })
          }}
        >
          联动指标
        </Button>
      </Tooltip>
    )
  }

  renderPublishAPIBtn = () => {
    let { selectedDataSourceId, dataSourceDimensions, projectCurrent, dimNameDict, location } = this.props
    let { dataApiId } = location.query
    if (_.isEmpty(dataSourceDimensions) || !hasDataAPIEntryInMenu || (!canCreateDataAPI && !dataApiId) || (!canModDataAPI && dataApiId)) {
      return null
    }
    return (
      <PublishSliceDataApiSettingsModal
        key={dataApiId || '0'}
        dataApiId={dataApiId}
        dataSourceDimensions={dataSourceDimensions}
        dimNameDict={dimNameDict}
        extraInfo={{
          slice: {
            druid_datasource_id: selectedDataSourceId,
            child_project_id: projectCurrent.parent_id ? projectCurrent.id : null,
            params: _.pick(this.props, sliceParamsProperties)
          }
        }}
      >
        <Button style={{ marginLeft: '12px' }} type='default' className='analytic-publish-API-btn' icon='api'>
          发布 API
        </Button>
      </PublishSliceDataApiSettingsModal>
    )
  }

  render() {
    let {
      selectedDataSourceId,
      metrics,
      dimensions,
      vizType,
      updateHashState,
      updateHashStateByPath,
      datasourceList,
      slices: [slice],
      filters = [],
      dimensionExtraSettingDict,
      pinningDims,
      dataSourceDimensions,
      isFetchingDataSourceDimensions,
      dimNameDict,
      linkage
    } = this.props
    let { visiblePopoverKey, userTagGroupDims } = this.state
    if (!_.isEmpty(userTagGroupDims)) {
      dataSourceDimensions = [...dataSourceDimensions, ...userTagGroupDims]
      dimNameDict = _.merge(
        {},
        dimNameDict,
        _.zipObject(
          userTagGroupDims.map(fd => fd.name),
          userTagGroupDims
        )
      )
    }

    let onClick = () => this._userGuide.showGuide()
    let breadName0 = (
      <b>
        <b className='font14'>
          多维分析
          <Anchor href={helpLink} target='_blank' className='mg1l mg2r color-grey pointer' title='查看帮助文档'>
            <Icon type='question-circle' theme='filled' />
          </Anchor>
        </b>
        <HoverHelp
          placement='right'
          content='点击查看操作演示'
          icon='play-circle-o'
          addonAfter={
            <span onClick={onClick} className='pointer'>
              操作演示
            </span>
          }
          className='fpointer color-blue-grey mg1r'
          onClick={onClick}
        />
      </b>
    )

    let prevPath = getPrevPathname()
    let DownloadButton = this.renderDownloadBtn
    return (
      <div className='analytic height-100 contain-docs-analytic'>
        {this.renderFetchers()}
        <Bread style={{ padding: '0 10px 0 16px' }} path={slice ? [{ name: breadName0, link: '/console/analytic' }, this.renderSliceNameInputForBread()] : [{ name: breadName0 }]}>
          {prevPath && slice && (_.startsWith(prevPath, '/console/dashboards') || _.startsWith(prevPath, '/console/slices')) ? (
            <Button icon='sugo-back' className='mg1l' onClick={() => browserHistory.push(prevPath)}>
              返回
            </Button>
          ) : null}

          {hasUserGroupEntryInMenu ? null : this.renderLinkageBtn()}

          {hasUserGroupEntryInMenu ? null : this.renderPublishAPIBtn()}

          {hasUserGroupEntryInMenu ? null : this.renderSaveBtn()}

          {hasSlicesEntryInMenu || !canVisitSliceList ? null : (
            <Link to='/console/slices?hideLeftNavigator=1'>
              <Button style={{ marginLeft: '12px' }} type='primary' icon='sugo-measures'>
                查看单图列表
              </Button>
            </Link>
          )}

          {hasUserGroupEntryInMenu ? null : (
            <DownloadButton className={classNames('height32', { hide: !canInspectSourceData })} style={{ marginLeft: '12px' }} visiblePopoverKey={visiblePopoverKey} />
          )}
        </Bread>

        {hasUserGroupEntryInMenu ? this.renderTopBar() : null}

        <div className='relative pd1' style={{ height: `calc(100% - 44px - ${hasUserGroupEntryInMenu ? 42 : 0}px)` }}>
          {datasourceList[0] ? (
            <Panels
              visiblePopoverKey={visiblePopoverKey}
              dataSourceId={selectedDataSourceId}
              {...{
                metrics,
                dimensions,
                vizType,
                filters,
                dimensionExtraSettingDict,
                pinningDims,
                updateHashState,
                updateHashStateByPath,
                dataSourceDimensions,
                isFetchingDataSourceDimensions,
                dimNameDict,
                linkage
              }}
            />
          ) : null}
        </div>
        <UserGuide
          innerRef={ref => (this._userGuide = ref)}
          guideName='analytic'
          guideVersion={GUIDE_VERSION}
          guideDataGenerator={genGuideData}
          dataSourceId={selectedDataSourceId}
        />
      </div>
    )
  }
}

const Wrapped = (() => {
  let withTags = withDataSourceTags(AnalyticMain, props => {
    const { id: dataSourceId = '' } = props.datasourceCurrent
    return {
      dataSourceId: dataSourceId,
      doFetch: !!dataSourceId
    }
  })
  return withSizeProvider(withTags)
})()

export default Wrapped
