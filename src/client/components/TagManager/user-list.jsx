import React from 'react'
import { connect } from 'react-redux'
import Bread from '../Common/bread'
import { Icon as LegacyIcon } from '@ant-design/compatible'
import { DownloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Col, Input, message, Popover, Radio, Row, Select, Spin, Table, Tabs, Tooltip } from 'antd'
import { Button2 } from '../Common/sugo-icon'
import { browserHistory } from 'react-router'
import _ from 'lodash'
import Store from './store/user-list'
import { VIEW_STATE, VIEW_TYPE } from './store/user-list/constants'
import { compressUrlQuery, decompressUrlQuery, immutateUpdate } from '../../../common/sugo-utils'
import TagFilter from './tag-filter'
import TagEnhanceFilter from './tag-enhance-filter'
import TagTypeList from './tag-type-list'
import checkDatasourceSettingsNeeded from './tag-require'
import * as d3 from 'd3'
import { withSizeProvider } from '../Common/size-provider'
import Link from '../Common/link-nojam'
import withAutoFocus from '../Common/auto-focus'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import UsergroupPanel from './usergroup-panel'
import TagCompare from './tag-compare'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import { TAG_PANEL_WIDTH } from './tag-manager-form'
import { checkPermission } from '../../common/permission-control'
import AsyncHref from '../Common/async-href'
import { getCurrentTagProject } from '../../common/tag-current-project'
import { tagFiltersAdaptToOldFormat } from '../../../common/param-transform'
import moment from 'moment'
import { getUserGroupReadyRemainTimeInSeconds } from '../../common/usergroup-helper'
import Timer from '../Common/timer'
import { withUserGroupLookupsDec } from '../Fetcher/usergroup-lookups-fetcher'
import FetchFinal from '../../common/fetch-final'
import Fetch from 'client/common/fetch-final'
import MacroscopicGallery from '../../components/TagMacroscopic/macroscopic-gallery'
import { Anchor } from '../Common/anchor-custom'

const canDownload = checkPermission('get:/app/download/batchtags')
const canSaveUsergroup = checkPermission('post:/app/usergroup/create-for-tag-dict')
const canDownloadUsergroup = checkPermission('get:/app/usergroup')

// 有用户分群菜单才显示保存为用户群菜单
const showUserGroupBtn = _.flatMap(window.sugo.menus || [], m => _.map(m.children, p => p.path)).includes('/console/usergroup')

const { Search } = Input
const { TabPane } = Tabs
const RadioButton = Radio.Button
let percentFormat = d3.format('.2%')

const InputWithAutoFocus = withAutoFocus(Input)

/**
 * url有两种情况：
 * 1. /console/tag-users
 *    /console/tag-users?ugId=xxx
 *    表示查看一个项目下已有的标签分群
 *    此时需要查出标签分群并显示
 *    带有 ugId 参数的，则需要初始化选择该分群
 * 2. /console/tag-users/tags/:?tags
 *    格式为
 *    compressUrlQuery(tags:Array<ParamTags>)
 *    如：
 *    /console/tag-users?tags=${compressUrlQuery('[{'tag':'年龄', values:[25,26]}]')}
 *    @see {Array<ParamTags>}
 *    此时表示带着这些标签来分析，不用查出分群
 *    测试url: /console/tag-users?tags=NobwRALghg5mBcZAueoEPywBowDcoBsCuApgM4LBgCMAfgKyCBOhmAEwAMVALCwwLoC+64aHESByA0DUSoxwESZMIHZXRoGdNMH25A
 */

@connect()
export default class UserList extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
    this.isInitData = false
  }

  async componentDidMount() {
    let { location, projectCurrent, datasourceCurrent, datasourceList, projectList } = this.props
    const projectId = datasourceCurrent.id || ''
    const { isModel, type, groupId } = location.query

    if (!_.isEmpty(projectCurrent)) {
      this.init(projectList, datasourceList, projectCurrent, datasourceCurrent, location.query.tags || '', location.query.ugId || '', location.query.tagEnhanceId, type, isModel)
    }
    // if(isModel) {
    //   const result = await this.getMomelParams(projectId, type)
    //   if(!result) return
    //   this.genModelFilter(result, groupId)
    // }
  }

  componentWillReceiveProps(nextProps) {
    let currPId = this.props.projectCurrent.id
    let nextPId = nextProps.projectCurrent.id
    if (nextPId !== currPId || nextProps.location.query.ugId !== this.props.location.query.ugId) {
      if (currPId || nextProps.location.query.tags) {
        this.init(
          nextProps.projectList,
          nextProps.datasourceList,
          nextProps.projectCurrent,
          nextProps.datasourceCurrent,
          nextProps.location.query.tags || '',
          nextProps.location.query.ugId || '',
          nextProps.location.query.tagEnhanceId,
          nextProps.location.query.type,
          nextProps.location.query.isModel
        )
      } else {
        browserHistory.push('/console/usergroup')
      }
    }
  }

  componentDidUpdate() {
    const msg = this.state.Msg
    if (msg.info) {
      message.info(msg.info, msg.duration)
    }
    if (msg.error) {
      message.error(msg.error, msg.duration)
    }
    if (msg.warning) {
      message.warning(msg.warning, msg.duration)
    }
  }

  genModelFilter = (res, groupId) => {
    let modelFilter = {}
    let record = {}
    if (res.type === 0) {
      record = _.get(res, 'result.data.groups', []).find(o => o.groupId === groupId)
      modelFilter = {
        total: record.userCount || '',
        per: record.userPercent || '',
        filter: this.genRFMFilter(record),
        options: _.get(res, 'result.data.groups', [])
      }
    } else {
      const arr = _.get(res, 'result.data', [])
      record = arr.find(o => o.groupId === groupId)
      const index = arr.findIndex(o => o.groupId === groupId)
      const params = _.get(res, 'params', {})

      modelFilter = {
        total: record.userCount || '',
        per: record.userPercent || '',
        filter: res.type === 1 ? this.genLiftCycleFilter(params) : this.genValueSliceFilter(params, index),
        options: _.get(res, 'result.data', [])
      }
    }
    this.setState({ modelFilter })
  }

  genRFMFilter = record => {
    //     R: [0, 92]
    // F: [0, 122]
    // M: [0, 224]
    const obj = _.pick(record, ['R', 'F', 'M'])
    return _.map(obj, (v, k) => this.genKeyFilter(v, k))
  }

  genKeyFilter = (arr, key) => {
    if (!arr.length) return ''
    return arr.length > 1 ? `${arr[0]} <= ${key}值 <= ${arr[1]}` : `${key}值 > ${arr[0]}`
  }

  genLiftCycleFilter = params => {
    if (_.isEmpty(params)) return ''
    const interval = params.interval || ''
    return [`注册时间<=${interval}天`, '订单记录=0']
  }

  genValueSliceFilter = (params, index) => {
    if (_.isEmpty(params)) return ''
    return [`业绩占比 ${_.get(params, `tier.${index}.percent`, 0) * 100}%`]
  }

  getMomelParams = async (projectId, type) => {
    const url = `/app/marketing-model-settings/get/${projectId}`
    const { success, result } = await Fetch.get(url, { type })
    if (success) return result
    return message.error('获取分群失败')
  }

  /**
   * @param {ProjectModel} project
   * @param {DataSourceModel} dataSource
   * @param {string} tags
   * @param {string} userGroupID
   */
  async init(projectList, datasourceList, project, dataSource, tags, userGroupID, tagEnhanceId = '', type = 0, isModel = false) {
    // 判断项目类型 使用关联tag项目的数据源
    const { tagProject, tagDatasource } = getCurrentTagProject(projectList, project, datasourceList, dataSource)

    if (isModel) {
      const result = await this.getMomelParams(project.id, type)
      if (!result) return
      this.genModelFilter(result, userGroupID)
    }

    if (tagEnhanceId) {
      const member_uuid = _.get(tagDatasource, 'params.loginId') || _.get(tagDatasource, 'params.commonMetric[0]')
      this.store.initWithTagEnhance(tagEnhanceId, member_uuid, tagProject, tagDatasource, 'and').then(_.noop)
      return
    }
    let relation = this.props.location.query.relation || 'and'
    if (!userGroupID && tags) {
      let tagsArray
      try {
        tagsArray = JSON.parse(decompressUrlQuery(tags))
      } catch (e) {
        tagsArray = []
      } finally {
        this.store.initWithTags(tagsArray, tagProject, tagDatasource, relation, dataSource).then(_.noop)
      }
    } else {
      this.store.init(tagProject, tagDatasource, userGroupID, this.getTagsInUrl(), relation, isModel).then(_.noop)
    }
  }

  renderTags() {
    // 渲染用户传过来的标签，存储在
    const tags = this.state.VM.tags
    return (
      <div className='borderb pd3x pd2b'>
        {tags.map(t => (
          <dl className='clearfix' key={t.tag}>
            <dt className='fleft'>{t.tag}：</dt>
            <dd className='fleft'>
              {t.values.map(v => (
                <Button size='small' key={v} className='mg1r mg1b'>
                  {v}
                </Button>
              ))}
            </dd>
          </dl>
        ))}
      </div>
    )
  }

  getTagsInUrl() {
    let tagsInUrlStr = _.get(this.props, 'location.query.tags')
    return (tagsInUrlStr && JSON.parse(decompressUrlQuery(tagsInUrlStr))) || null
  }

  renderGroupSelector() {
    const VM = this.state.VM
    const SegmentCollection = this.state.SegmentCollection
    const ug = _.get(SegmentCollection, 'list', []).find(ug => ug.id === VM.cur_segment)
    let ugRemark = _.get(ug, 'description')

    let ugId = _.get(this.props, 'location.query.ugId')
    let tagsInUrl = this.getTagsInUrl()
    if (ug && !_.isEmpty(tagsInUrl)) {
      // 正在编辑分群
      return <UsergroupPanel filters={tagsInUrl} usergroup={ug} usergroups={SegmentCollection.list} />
    }
    return (
      <div style={{ padding: '10px 10px 0 5px' }}>
        <div className='borderb pd3x pd2b bg-white corner' style={{ padding: '10px' }}>
          <strong className='pd2r'>分群：</strong>
          <Select
            value={VM.cur_segment}
            className='width120 mg2r'
            onChange={segment_id => {
              //this.store.setSegment(segment_id)
              browserHistory.push(`/console/tag-users?ugId=${segment_id}`)
            }}
            {...enableSelectSearch}
            dropdownMatchSelectWidth={false}
          >
            {SegmentCollection.list.map(seg => (
              <Select.Option value={seg.id} key={seg.id}>
                {seg.title}
              </Select.Option>
            ))}
          </Select>
          {!ugRemark ? null : <span className='color-grey mg2r'>备注：{ugRemark}</span>}
          {!_.isEmpty(ugId) && _.isEmpty(tagsInUrl) ? this.renderUserCount() : null}
        </div>
      </div>
    )
  }

  renderModelGroupSelector = () => {
    const { modelFilter = {}, VM } = this.state
    const {
      location: {
        query: { type, ugId: groupId }
      }
    } = this.props
    const options = modelFilter.options || []
    return (
      <div style={{ padding: '10px 10px 0 5px' }}>
        <div className='borderb pd3x pd2b bg-white corner' style={{ padding: '10px' }}>
          <strong className='pd2r'>分群：</strong>
          <Select
            value={groupId}
            className='width120 mg2r'
            onChange={groupId => {
              // this.store.setSegment(groupId)
              const id = encodeURIComponent(groupId)
              browserHistory.push(`/console/tag-users?ugId=${id}&type=${type}&isModel=1`)
            }}
            {...enableSelectSearch}
            dropdownMatchSelectWidth={false}
          >
            {options.map(seg => (
              <Select.Option value={seg.groupId} key={seg.groupId}>
                {seg.title}
              </Select.Option>
            ))}
          </Select>
          <span className='tag-filter-op-alsoin '>
            共{modelFilter.total || '0'}人，占总人数{modelFilter.per || '0%'}
          </span>
        </div>
      </div>
    )
  }

  /**
   * 操作区域：
   * 1. 列表、画像切换
   * 2. 维度选择
   * 3. 搜索
   * 4. 下载
   */
  renderOperator() {
    /** @type {TagUserListStoreState} */
    const state = this.state
    const { VM } = state
    const { hasTagAI } = window.sugo
    const STATE_MAP = {
      [VIEW_STATE.LIST]: 'LIST',
      [VIEW_STATE.GALLERY]: 'GALLERY',
      [VIEW_STATE.TAGS]: 'TAGS',
      [VIEW_STATE.ENTIRE_GALLERY]: 'ENTIRE_GALLERY',
      [VIEW_STATE.TAG_COMPARE]: 'TAG_COMPARE'
    }
    let radios = [
      <RadioButton value='LIST' key='LIST'>
        列表
      </RadioButton>,
      <RadioButton value='GALLERY' key='GALLERY'>
        画像
      </RadioButton>,
      hasTagAI ? (
        <RadioButton value='TAG_COMPARE' key='TAG_COMPARE'>
          智能画像
        </RadioButton>
      ) : null
    ].filter(_.identity)
    let { downloadUrl, downloadAllFieldsUrl } = this.store.downLoadData()
    let content = downloadUrl ? (
      <div className='width200 analytic-popover-btn'>
        <Tooltip title='当前图表标签' placement='leftBottom'>
          <Anchor href={downloadUrl} target='_blank'>
            {/* <Button
              className="width-100"
              icon={<LegacyIcon type="sugo-download" />}
            >当前图表标签</Button> */}
            <Button2 className='width-100' icon='sugo-download'>
              当前图表标签
            </Button2>
          </Anchor>
        </Tooltip>
        <Tooltip title='所有标签' placement='leftBottom'>
          <Anchor href={downloadAllFieldsUrl} target='_blank'>
            {/* <Button
              className="width-100 mg1t"
              icon={<LegacyIcon type="sugo-download" />}
            >所有标签</Button> */}
            <Button2 className='width-100 mg1t' icon='sugo-download'>
              所有标签
            </Button2>
          </Anchor>
        </Tooltip>
      </div>
    ) : null
    return (
      <Row gutter={16}>
        <Col span={12}>
          <Radio.Group
            value={STATE_MAP[VM.view_state === VIEW_STATE.ENTIRE_GALLERY ? VIEW_STATE.GALLERY : VM.view_state]}
            onChange={e => this.store.setViewState(VIEW_STATE[e.target.value], this.props.datasourceCurrent)}
          >
            {radios}
          </Radio.Group>
          {VM.view_state === VIEW_STATE.ENTIRE_GALLERY || VM.view_state === VIEW_STATE.GALLERY ? (
            <Button
              type={VM.view_state === VIEW_STATE.ENTIRE_GALLERY ? 'primary' : undefined}
              className='mg2l'
              onClick={() => {
                this.store.setViewState(VM.view_state === VIEW_STATE.ENTIRE_GALLERY ? VIEW_STATE.GALLERY : VIEW_STATE.ENTIRE_GALLERY, this.props.datasourceCurrent)
              }}
            >
              整体对比
            </Button>
          ) : null}
          {VM.view_state === VIEW_STATE.LIST ? (
            <div className='iblock pd2l'>
              <Search className='width160' placeholder={`请输入 ${VM.uuidFieldName}`} onSearch={value => this.store.searchMemberGuid(value)} />
            </div>
          ) : null}
        </Col>
        <Col span={12}>
          {VM.view_state === VIEW_STATE.LIST && canDownload ? (
            <div className='alignright'>
              <Popover placement='bottomLeft' content={content}>
                <Button icon={<DownloadOutlined />}>下载</Button>
              </Popover>
            </div>
          ) : null}
        </Col>
      </Row>
    )
  }

  renderTagCompare() {
    return <TagCompare {...this.props} {...this.state} />
  }

  renderBuildingUserGroupHint({ ug, reloadUserGroupLookups }) {
    let secondNeedToWait = getUserGroupReadyRemainTimeInSeconds(ug)

    return (
      <Timer
        interval={1000}
        onTick={() => {
          this.forceUpdate(() => {
            if (secondNeedToWait <= 1) {
              reloadUserGroupLookups()
            }
          })
        }}
      >
        {() => {
          return <div className='pd3 aligncenter color-grey'>分群正在创建，请在 {secondNeedToWait} 秒后再试</div>
        }}
      </Timer>
    )
  }

  renderNoLookupHint(props) {
    let { ug, userGroupLookups, isFetchingUserGroupLookups } = props
    if (isFetchingUserGroupLookups) {
      return <div className='bg-white corner pd3 aligncenter color-grey'>正在检查用户群是否过期...</div>
    } else if (ug && !_.startsWith(ug.id, 'temp_') && !_.includes(userGroupLookups, `usergroup_${ug.id}`)) {
      return (
        <div className='bg-white corner pd3 aligncenter color-999'>
          用户群已过期，请
          <a
            className='color-purple mg1x pointer'
            onClick={async () => {
              let res = await FetchFinal.post('/app/usergroup/update', {
                query: {
                  where: { id: ug.id }
                },
                update: immutateUpdate(ug, 'params.random', () => Date.now())
              })
              if (res && res.result) {
                this.store.reloadSegment()
              }
            }}
          >
            重新计算
          </a>
        </div>
      )
    } else {
      return null
    }
  }

  renderContent = withUserGroupLookupsDec(_.identity)(ugLookups => {
    // 检查分群是否过期，如果是，提示重新计算
    const { VM } = this.state
    const SegmentCollection = this.state.SegmentCollection
    const ug = _.get(SegmentCollection, 'list', []).find(ug => ug.id === VM.cur_segment)
    let { updated_at, created_at } = ug || {}
    let mNow = moment()
    let secondsAfterCreate = mNow.diff(created_at, 'seconds')
    let secondsAfterUpdate = mNow.diff(updated_at, 'seconds')

    let noLookupHint = ug && this.renderNoLookupHint({ ...ugLookups, ug })
    let isBuildingUserGroup = ug && !_.startsWith(ug.id, 'temp_') && (secondsAfterCreate < 30 || secondsAfterUpdate < 30)

    if (isBuildingUserGroup) {
      return this.renderBuildingUserGroupHint({ ...ugLookups, ug })
    } else if (noLookupHint) {
      return noLookupHint
    }

    if (VM.view_state === VIEW_STATE.LIST) {
      return this.renderListContent()
    }

    if (VM.view_state === VIEW_STATE.GALLERY || VM.view_state === VIEW_STATE.ENTIRE_GALLERY) {
      return this.renderGalleryContent()
    }

    if (VM.view_state === VIEW_STATE.TAG_COMPARE) {
      return this.renderTagCompare()
    }

    return null
  })

  renderListContent = withSizeProvider(({ spWidth }) => {
    /** @type {TagUserListStoreState} */
    const state = this.state
    const { VM } = state

    let contentWidth = _.sum(VM.columns.map(col => col.width))
    return (
      <div className='pd2t clearfix'>
        <Spin spinning={state.Loading.content}>
          <Table
            ref={ref => (this._listContentTable = ref)}
            bordered
            className='always-display-scrollbar-horizontal-all'
            dataSource={VM.dataSource}
            scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth }}
            columns={contentWidth < spWidth ? VM.columns.map(col => _.omit(col, 'fixed')) : VM.columns}
            pagination={{
              current: VM.page_current,
              pageSize: VM.page_size,
              total: VM.page_total,
              onChange: (page, pageSize) => this.store.setPage(page, pageSize),
              showTotal: total => `共 ${total} 条`
            }}
          />
        </Spin>
      </div>
    )
  })

  renderGalleryContent() {
    /** @type {TagUserListStoreState} */
    const state = this.state
    const { galleries, entireGalleries, view_state, tags_user, user_total, cur_fields, tagTrees, tagTypes, tags, selectedTags } = state.VM
    const enableCompareToAll = view_state === VIEW_STATE.ENTIRE_GALLERY
    return (
      <MacroscopicGallery
        dbTags={selectedTags}
        activeTagIds={cur_fields}
        tagTypes={tagTrees}
        tagTypeMappings={tagTypes}
        filters={tags}
        compareToAll={enableCompareToAll}
        ugUserCount={tags_user}
        allUserCount={user_total}
      />
    )
  }

  renderPopupSavePanelForm = () => {
    const state = this.state
    const segment = state.SegmentCollection.list.find(seg => seg.id === state.VM.cur_segment)
    if (!segment) return null
    return (
      <div>
        <div className='pd1b'>
          <span className='block mg1b'>用户群名称:</span>
          <InputWithAutoFocus value={segment.title} className='block width-100' onChange={e => this.store.setSegmentTitle(e.target.value.trim())} />
        </div>
        <div className='pd1b'>
          <span className='block mg1b'>用户群备注:</span>
          <Input value={segment.description} className='block width-100' onChange={e => this.store.setSegmentDescription(e.target.value.trim())} />
        </div>
        <Button
          type='primary'
          onClick={async () => {
            await this.store.saveSegment()
            this.setState({ showSaveUserGroupPopover: false })
          }}
          icon={<SaveOutlined />}
          className='width-100 mg2t'
        >
          保存
        </Button>
      </div>
    )
  }

  renderPopupSavePanel = () => {
    return (
      <div className='width300'>
        <Tabs defaultActiveKey='save-as'>
          <TabPane tab='另存为' key='save-as'>
            {this.renderPopupSavePanelForm('save-as')}
          </TabPane>
        </Tabs>
      </div>
    )
  }

  renderModelFilter = () => {
    const { modelFilter = {} } = this.state
    const filter = modelFilter.filter || []
    return (
      <div className='tag-filter-wrap tag-setion-wrap'>
        <div className='tag-filter-inner tag-setion-inner tag-filter-model'>
          {filter.map((o, i) => {
            if (i === filter.length - 1) {
              return o
            }
            return (
              <React.Fragment key={o}>
                {o}
                <span className='blod'>并且</span>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  /**
   * 如果view_type === VIEW_TYPE.TAGS
   * 则显示创建分群按钮
   * TODO 确定[查看关联标签]的路由并写在按钮上
   */
  renderBreadExtra() {
    const state = this.state
    const segment = state.SegmentCollection.list.find(seg => seg.id === state.VM.cur_segment)
    if (!segment || !canSaveUsergroup) {
      return null
    }

    return showUserGroupBtn && this.state.VM.view_type === VIEW_TYPE.TAGS && canDownloadUsergroup ? (
      <Popover
        placement='bottom'
        content={this.renderPopupSavePanel()}
        trigger='click'
        visible={state.showSaveUserGroupPopover}
        onVisibleChange={isVisible => {
          this.setState({ showSaveUserGroupPopover: isVisible })
        }}
      >
        <Button className='mg2l' type='success'>
          保存为用户群
        </Button>
      </Popover>
    ) : null
  }

  renderUserCount() {
    const { VM } = this.state
    let ugId = _.get(this.props, 'location.query.ugId')
    let isTagEnhance = !_.isEmpty(VM.tagEnhanceInfo)
    let tagsInUrl = this.getTagsInUrl()
    let ug = _.find(this.state.SegmentCollection.list, ug => ug.id === ugId)

    //进入这个页面的分群 只允许有一个标签筛选条件
    let ugTagFilters = _.get(ug, 'params.composeInstruction[0].config.tagFilters') || []
    let relation = _.get(this.props.location, 'query.relation') || tagFiltersAdaptToOldFormat(ugTagFilters).relation

    return (
      <div className='iblock'>
        {VM.user_total === 0 ? null : (
          <span className='color-purple'>
            共 {VM.tags_user} 人，占总人数 {percentFormat(VM.tags_user / VM.user_total)}
          </span>
        )}
        {(_.isEmpty(ugId) || !_.isEmpty(tagsInUrl)) && !isTagEnhance ? (
          <AsyncHref component={Link} initFunc={() => `/console/tag-dict?ugId=${ugId || ''}#${compressUrlQuery({ filters: tagsInUrl || VM.tags, relation })}`}>
            <Button size='small' type='default' className='mg2x'>
              返回筛选
            </Button>
          </AsyncHref>
        ) : null}
      </div>
    )
  }

  renderMainContent = withSizeProvider(({ spWidth, spHeight, tagDatasource }) => {
    let { location } = this.props
    /** @type {TagUserListStoreState} */
    const state = this.state
    const { VM, SegmentCollection } = state
    const { tags, dimensions = [], tagTrees = [], dimNameDict = {}, tagTypes = [], types = [], tagEnhanceInfo = {}, activeTreeIds = [] } = VM
    const {
      user: { id: user_id }
    } = window.sugo
    const {
      projectCurrent: { id: projectCurrentId }
    } = this.props
    let isTagEnhance = !_.isEmpty(tagEnhanceInfo)
    let tagName = ''
    if (!_.isEmpty(tagEnhanceInfo)) {
      const dim = dimensions.find(p => p.name === tagEnhanceInfo.tag) || {}
      tagName = dim.title || dim.name
    }
    let tagsInUrl = this.getTagsInUrl()

    let tagFilterDict = _.groupBy(tagsInUrl || tags, flt => {
      let t = _.find(types, ({ children }) => _.some(children, dbDim => dbDim.name === flt.col))
      return (t && t.type) || '未分类'
    })

    let ugId = _.get(location, 'query.ugId')
    let isModel = _.get(location, 'query.isModel')

    const ug = _.get(SegmentCollection, 'list', []).find(ug => ug.id === ugId)

    let ugTagFilters = _.get(ug, 'params.composeInstruction[0].config.tagFilters') || []
    let relation = location.query.relation || tagFiltersAdaptToOldFormat(ugTagFilters).relation
    return (
      <div className='contain-docs-analytic' style={{ height: 'calc(100% - 44px)' }}>
        <HorizontalSplitHelper style={{ height: spHeight - 44 }} collapseWidth={125}>
          <TagTypeList
            defaultWeight={TAG_PANEL_WIDTH}
            tagTrees={tagTrees}
            className='itblock height-100 no-active-underline'
            dimensions={dimensions}
            datasourceCurrent={tagDatasource}
            tagTypes={tagTypes}
            types={types}
            onClickTitle={obj => {
              const { id, treeId } = obj
              // tag
              if (id) {
                const cur_fields = _.includes(VM.cur_fields, id) ? VM.cur_fields.filter(dimId => dimId !== id) : [...VM.cur_fields, id]

                this.store.setCurFields(cur_fields).then(_.noop)
                localStorage.setItem(
                  'user_list_cur_fields',
                  JSON.stringify({
                    [projectCurrentId]: { [user_id]: { nextCurFields: cur_fields } }
                  })
                )
              } else {
                const activeTreeIds = VM.activeTreeIds.includes(treeId) ? VM.activeTreeIds.filter(dimId => dimId !== treeId) : [...VM.activeTreeIds, treeId]
                this.store.setTreeIds(activeTreeIds)
                localStorage.setItem(
                  'user_list_activeTreeIds',
                  JSON.stringify({
                    [projectCurrentId]: { [user_id]: { nextActiveTreeIds: activeTreeIds } }
                  })
                )
              }
            }}
            activeTreeIds={activeTreeIds}
            activeChildIds={VM.cur_fields}
          />

          <div defaultWeight={spWidth - TAG_PANEL_WIDTH} className='itblock height-100 overscroll-y always-display-scrollbar' style={{ paddingBottom: '10px' }}>
            {_.isEmpty(location.query.ugId) ? null : isModel ? this.renderModelGroupSelector() : this.renderGroupSelector()}
            {isModel ? (
              this.renderModelFilter()
            ) : isTagEnhance ? (
              <TagEnhanceFilter
                title='用户筛选条件'
                tagFrom={tagEnhanceInfo ? tagEnhanceInfo.tag_from : ''}
                tagTo={tagEnhanceInfo ? tagEnhanceInfo.tag_to : ''}
                tagName={tagName}
              />
            ) : (
              <TagFilter
                dimensions={dimensions}
                usergroup={ug}
                title='用户筛选条件'
                relation={relation}
                filters={_.keys(tagFilterDict).map(typeName => {
                  return {
                    title: typeName,
                    children: tagFilterDict[typeName].map(flt => ({
                      ...flt,
                      title: _.get(dimNameDict[flt.col], 'title'),
                      name: flt.col
                    }))
                  }
                })}
                customFooter={!_.isEmpty(tagsInUrl) ? <div className='aligncenter pd2y'>{this.renderUserCount()}</div> : <div className='hide' />}
                extra={
                  _.isEmpty(ugId) || !_.isEmpty(tagsInUrl) ? null : (
                    <AsyncHref
                      initFunc={() => {
                        // 现在编辑都到用户分群那边编辑，因为原标签编辑不支持行为筛选编辑
                        // return `/console/tag-dict?ugId=${ugId || ''}#${compressUrlQuery({ filters: tagsInUrl || tags, relation })}`
                        return `/console/usergroup/${ugId}`
                      }}
                      component={Link}
                    >
                      <Button type='default' className='mg2x'>
                        编辑
                      </Button>
                    </AsyncHref>
                  )
                }
              />
            )}
            <div
              className='bg-white corner'
              style={{
                margin: '10px 10px 0 5px',
                padding: '10px'
              }}
            >
              {this.renderOperator()}
              {this.renderContent({
                dataSourceId: tagDatasource && tagDatasource.id
              })}
            </div>
          </div>
        </HorizontalSplitHelper>
      </div>
    )
  })

  render() {
    let { loadingProject, projectCurrent, datasourceCurrent, location, projectList, datasourceList } = this.props
    // 判断项目类型 使用关联tag项目的数据源
    const { tagProject, tagDatasource } = getCurrentTagProject(projectList, projectCurrent, datasourceList, datasourceCurrent)

    if (!loadingProject) {
      let datasourceSettingsNeeded = checkDatasourceSettingsNeeded({
        datasourceCurrent: tagDatasource,
        projectCurrent: tagProject,
        moduleName: '用户画像功能'
      })
      if (datasourceSettingsNeeded) {
        return datasourceSettingsNeeded
      }
    }

    /** @type {TagUserListStoreState} */
    const state = this.state
    const { VM, SegmentCollection } = state
    let tagsInUrl = this.getTagsInUrl()

    let ugId = _.get(location, 'query.ugId')
    const ug = _.get(SegmentCollection, 'list', []).find(ug => ug.id === ugId)
    return (
      <div className='height-100 bg-white'>
        <Bread
          path={
            _.isEmpty(tagsInUrl)
              ? [{ name: '用户群', link: '/console/usergroup' }, { name: `用户${VM.view_state === VIEW_STATE.GALLERY ? '画像' : '列表'}` }]
              : ug
              ? [
                  { name: '用户群', link: '/console/usergroup' },
                  { name: `编辑用户分群：${ug.title}`, link: `/console/tag-dict?ugId=${ugId || ''}#${compressUrlQuery({ filters: tagsInUrl })}` },
                  { name: `用户${VM.view_state === VIEW_STATE.GALLERY ? '画像' : '列表'}` }
                ]
              : [
                  { name: '标签体系', link: `/console/tag-dict?ugId=${ugId || ''}#${compressUrlQuery({ filters: tagsInUrl })}` },
                  { name: `用户${VM.view_state === VIEW_STATE.GALLERY ? '画像' : '列表'}` }
                ]
          }
        >
          {this.renderBreadExtra()}
        </Bread>

        {this.renderMainContent({ tagDatasource })}
      </div>
    )
  }
}
