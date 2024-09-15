/**
 * @Author sugo.io<asd>
 * @Date 17-9-26
 */

import moment from 'moment'
import _ from 'lodash'
import toUgFilters from 'common/slice-filter-to-ug-filter'

import {Store, storeCollectionCreator, storeViewModelCreator} from 'sugo-store'
import SegmentCollection, {Action as SegmentColAction} from './segment-collection'
import TagDetailsCollection, {Action as TagDetailsAction} from './details-collection'
import TagGalleryCollection, {Action as TagGalleryAction} from './gallery-collection'
import TagEntireGalleryCollection, {Action as TagEntireGalleryAction} from './gallery-entire-collection'

import VM, {Action as VMAction} from './view-model'
import Msg from './message'
import Loading, {Action as LoadingAction} from './loading'
import {VIEW_STATE, VIEW_TYPE} from './constants'
import {QUERY_ENGINE} from 'common/constants'
import {createUsergroup} from '../../../../common/usergroup-helper'
import {convertDateType, isRelative, tagFiltersAdaptToOldFormat} from '../../../../../common/param-transform'
import {compressUrlQuery} from '../../../../../common/sugo-utils'
import CryptoJS from 'crypto-js'
import {deepFlat} from './actions'
import {getCurFieldsAndTreeIds} from '../../../../common/get-curfields-and-treeids'
import {
  UsergroupFilterStrategyEnum,
  UserGroupFilterTypeEnum,
  UserGroupSetOperationEnum
} from '../../../../../common/constants'

/**
 * @typedef {Object} TagUserListStoreState
 * @property {SegmentCollectionState} SegmentCollection           - 用户分群列表
 * @property {TagDetailsCollectionState} TagDetailsCollection     - 用户详细列表
 * @property {TagGalleryCollectionState} TagGalleryCollection     - 标签画像列表
 * @property {TagGalleryCollectionState} TagEntireGalleryCollection - 标签所有用户统计
 * @property {TagUserGroupListViewModel} VM                       - View Model
 * @property {TagUserListMsgState} Msg                            - 消息处理
 * @property {TagUserListLoading} Loading                         - Loading
 */

/**
 * @param {string} type
 * @param {*} payload
 * @return {{type: string, payload: *}}
 */
function struct (type, payload) {
  return { type, payload }
}

export default class TagDetailsStore extends Store {
  constructor () {
    super()
    storeCollectionCreator(SegmentCollection, this)
    storeCollectionCreator(TagDetailsCollection, this)
    storeCollectionCreator(TagGalleryCollection, this)
    storeCollectionCreator(TagEntireGalleryCollection, this)
    storeViewModelCreator([VM, Msg, Loading], this)
    this.initialize()
  }

  /**
   * @param actionOrActions
   * @return {Promise.<TagUserListStoreState>}
   */
  async dispatchAsync (actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }

  /**
   * @param {ProjectModel} ProjectModel
   * @param {DataSourceModel} DataSourceModel
   * @param {Array<ParamTags>} currTagFilters
   * @param {string} [segment_id]
   * @param relation
   * @return {Promise.<void>}
   */
  async init(ProjectModel, DataSourceModel, segment_id, currTagFilters, relation, isModel = false) {
    // 请求分群列表
    if (isModel) {
      const segmentId = segment_id.replace('usergroup_', '')
      await this.dispatchAsync([
        struct(VMAction.initialTagTypes, { DataSourceModel, ProjectModel } ),
        struct(VMAction.change, {
          ProjectModel,
          DataSourceModel,
          tagEnhanceInfo: {},
          isMarketingModel: isModel
        }),
        struct(VMAction.queryUserCount, {
          tagsUser: 0,
          tags:  [{ col: 'distinct_id', op: 'lookupin', eq: segmentId }],
          project: ProjectModel,
          relation:'and'
        })
      ])
      await this.setSegment(segmentId, currTagFilters)
      return 
    }
    const state = await this.dispatchAsync(struct(SegmentColAction.fetch, ProjectModel.datasource_id))
    const segments = state.SegmentCollection.list
    const segment = segment_id && segments.find(seg => seg.id === segment_id)
    let ug = (segment || (segments && segments[0]))
    if (ug) {
      //此处只允许有一个标签筛选条件
      let ugTagFilters = _.get(ug, 'params.composeInstruction[0].config.tagFilters') || []
      const finalTagFilters = currTagFilters || tagFiltersAdaptToOldFormat(ugTagFilters).tagFilters
      
      // 由于分群编辑功能合并到用户分群那边，所以如果存在分群 id 时，则根据分群 lookup 筛选，否则根据标签实时筛选
      // 但是实际上分群可能在构建中，所以也需要直接读取 total
      const filterByLookup = ug.id && !_.startsWith(ug.id, 'temp_')
      await this.dispatchAsync([
        struct(VMAction.initialTagTypes, { DataSourceModel, ProjectModel } ),
        struct(VMAction.change, {
          ProjectModel,
          DataSourceModel,
          tagEnhanceInfo: _.pick(ug.params, ['tag', 'tag_from', 'tag_to', 'topn'])
        }),
        struct(VMAction.queryUserCount, {
          tagsUser: _.get(ug, 'params.total', 0) || _.get(ug, 'params.topn', 0),
          tags: filterByLookup
            ? [{ col: _.get(ug, 'params.groupby'), op: 'lookupin', eq: ug.id }]
            : finalTagFilters,
          project: ProjectModel,
          relation: filterByLookup
            ? 'and'
            : relation || tagFiltersAdaptToOldFormat(ugTagFilters).relation
        })
      ])
      await this.setSegment(ug.id, finalTagFilters)
    }
  }

  /**
   * 带有标签的初始化，表示此时可能会使用标签创建一个新的分群
   * 所以一开始先把SegmentModel.params.tags初始化
   * 后面取tags的值也取该值
   *
   * @param {Array<ParamTags>} tags
   * @param {ProjectModel} tagProject
   * @param {DataSourceModel} tagDataSource
   * @param relation
   * @param {DataSourceModel} currDataSource
   * @return {Promise.<void>}
   */
  async initWithTags (tags, tagProject, tagDataSource, relation, currDataSource) {
    let filters = tags
    let metricalField = _.get(tagDataSource, 'params.loginId') || _.get(tagDataSource, 'params.commonMetric[0]')
    let timeFlt = _.find(filters, flt => flt.col === '__time') || { col: '__time', op: 'in', eq: ['1000', '3000'] }

    let relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)

    let ug = createUsergroup({
      userGroupTitle: '临时标签分群',
      // 新用户群直接关联到当前项目
      dataSourceId: currDataSource.id,
      dataSourceName: currDataSource.name,
      metricalField,
      // relativeTime,
      // since: moment(since).toISOString(),
      // until: moment(until).toISOString(),
      openWith: 'tag-dict', // 编辑时只能用用户画像打开
      composeInstruction: [{
        op: UserGroupSetOperationEnum.union,
        type: UserGroupFilterTypeEnum.userTagFilter,
        config: {
          tagFilters: [{op: relation, eq: tags}]
        }
      }],
      relatedUserTagProjectId: tagProject.id
      // backToRefererTitle: '查看关联标签',
      // refererLink: `/console/tag-users`,
      // backToRefererHint: '这个分群由标签创建，点击查看关联的单图'
    })
    delete ug.md5
    delete ug.params.md5

    // 更新 Segment.params.tags
    await this.dispatchAsync([
      struct(VMAction.initialTagTypes, { DataSourceModel: tagDataSource, ProjectModel: tagProject }),
      struct(SegmentColAction.add, ug),
      struct(VMAction.change, {
        view_type: VIEW_TYPE.TAGS,
        DataSourceModel: tagDataSource,
        ProjectModel: tagProject
      }),
      struct(VMAction.queryUserCount, {
        tags,
        project: tagProject,
        relation
      })
    ])
    await this.setSegment(ug.id, tags)
  }

  /**
   * 选择分群，每次选择分群，就是一次初始化
   * @param {string} segment_id
   * @param currTagFilters
   */
  async setSegment (segment_id, currTagFilters) {
    if (!segment_id) return
    const state = this.state
    let segment = _.find(state.SegmentCollection.list, p => p.id === segment_id)
    let ugTagFilters = _.get(segment, 'params.composeInstruction[0].config.tagFilters') || []
    await this.dispatchAsync(struct(VMAction.change, {
      cur_segment: segment_id,
      tags: currTagFilters || tagFiltersAdaptToOldFormat(ugTagFilters).tagFilters
    }))
    // 默认第一次查询第一页数据源
    await this.setPage(1, state.VM.page_size)
  }

  /**
   * 更新分群title
   * @param {string} title
   */
  setSegmentTitle (title) {
    this.dispatch(struct(SegmentColAction.update, {
      primaryKey: this.state.VM.cur_segment,
      props: { title }
    }))
  }

  /**
   * 更新分群备注
   * @param {string} description
   */
  setSegmentDescription (description) {
    this.dispatch(struct(SegmentColAction.update, {
      primaryKey: this.state.VM.cur_segment,
      props: { description }
    }))
  }

  async reloadSegment() {
    return await this.dispatchAsync(struct(SegmentColAction.fetch, this.state.VM.ProjectModel.datasource_id))
  }

  async saveSegment () {
    await this.dispatchAsync(struct(SegmentColAction.sync, this.state.VM.cur_segment))
  }

  /**
   * 切换view显示内容
   * @param {number} view_state
   * @see {VIEW_STATE}
   */
  setViewState (view_state) {
    this.dispatch(
      struct(VMAction.change, { view_state }),
      state => {
        if (view_state === VIEW_STATE.GALLERY) {
          this.setActiveTabKey(state.VM.cur_types)
        } else {
          this.setCurFields(state.VM.cur_fields).then(_.noop)
        }
      }
    )
  }

  /**
   * 更新选中的字段
   * @param {Array<number>} cur_fields
   */
  async setCurFields (cur_fields) {
    const state = this.state
    const vm = state.VM
    await this.dispatchAsync(struct(VMAction.change, { cur_fields }))

    // 获取标签列表数据
    if (vm.view_state === VIEW_STATE.LIST) {
      // 如果有新的标签属性，则需要重新查询
      this.dispatch(struct(LoadingAction.content, true))
      await this.setPage(vm.page_current, vm.page_size)
      await this.dispatchAsync(struct(VMAction.flush))
      this.dispatch(struct(LoadingAction.content, false))
    } else {
      // 获取画像数据
      const dimensionsMap = _.keyBy(vm.dimensions, dim => dim.id)
      const segment_id = vm.cur_segment
      const segment = state.SegmentCollection.list.find(r => r.id === segment_id)
  
      if (!segment) {
        return
      }

      // 由于分群编辑功能合并到用户分群那边，这里要么根据标签实时筛选，要么根据分群 lookup 筛选
      let tagFilters = segment.id && !_.startsWith(segment.id, 'temp_')
        ? [{ col: _.get(segment, 'params.groupby'), op: 'lookupin', eq: segment.id }]
        : /*vm.tags ||*/ _.get(segment, 'params.tagFilters') || []

      const filter = {
        project_id: vm.ProjectModel.id,
        reference_tag_name: vm.ProjectModel.reference_tag_name,
        datasource_id: vm.ProjectModel.datasource_id,
        tags: cur_fields.map(id => _.get(dimensionsMap[id], 'name')).filter(_.identity)
      }

      // 基础画像数据
      /*    this.dispatch(struct(LoadingAction.content, true))
      this.dispatch([
        struct(TagGalleryAction.fetch, {
          ...filter,
          filter: tagFilters
        }),
        struct(VMAction.flush),
        struct(LoadingAction.content, false)
      ])

      // 标签整体画像数据
      if (vm.view_state === VIEW_STATE.ENTIRE_GALLERY) {
        this.dispatch(struct(LoadingAction.content, true))
        this.dispatch([
          struct(TagEntireGalleryAction.fetch, filter),
          struct(VMAction.flush),
          struct(LoadingAction.content, false)
        ])
      }*/
    }
  }

  /**
   * 更新页码
   * @param {number} page_current
   * @param {number} page_size
   */
  async setPage (page_current, page_size) {
    const state = this.state
    const vm = state.VM
    const segment_id = vm.cur_segment
    // 查询标签列表数据
    const dimensionsMap = _.keyBy(vm.dimensions, dim => dim.id)
    if(vm.isMarketingModel) {
      let tagFilters =  [{ col: 'distinct_id', op: 'lookupin', eq: segment_id }]
      await this.dispatchAsync(struct(TagDetailsAction.fetch, {
        project: vm.ProjectModel,
        druid_datasource_id:  vm.DataSourceModel.id,
        metricalField:'distinct_id',
        selectFields: vm.cur_fields.map(id => dimensionsMap[id]),
        page_current,
        page_size,
        tagFilters,
        ugId: segment_id,
        tempUgUserCount: _.get(vm, 'tagEnhanceInfo.topn', 0)
      }))
  
      this.dispatch(
        [
          struct(VMAction.change, { page_current, page_size }),
          struct(VMAction.flush),
          struct(LoadingAction.content, false)
        ],
        state => {
          // 更新列表总数
          this.dispatch(struct(VMAction.change, {
            page_total: state.TagDetailsCollection.total
          }))
        }
      )
      return
    }

    const segment = state.SegmentCollection.list.find(r => r.id === segment_id)
   
    if (!segment) {
      return
    }

    this.dispatch(struct(LoadingAction.content, true))

    const paramsFilters = _.get(segment, 'params.composeInstruction[0].config.tagFilters[0].eq', [])
    // 由于分群编辑功能合并到用户分群那边，这里要么根据标签实时筛选，要么根据分群 lookup 筛选
    let tagFilters = segment.id && !_.startsWith(segment.id, 'temp_')
      ? [{ col: _.get(segment, 'params.groupby'), op: 'lookupin', eq: segment.id }]
      : paramsFilters || []

    // 当前筛选的标签过滤条件 modify byWuQic 2020/03/24
    const { tags = [] } = vm
    if (!_.isEmpty(tags)) {
      tagFilters = tagFilters.concat(tags)
    }

    let tagEnhanceId = _.get(segment, 'params.tag_from')
      ? _.get(segment, 'params.md5') || segment.id
      : ''
    let finalTagFilters = vm.member_uuid
      ? [...tagFilters, {
        col: _.get(segment, 'params.groupby'),
        op: 'contains',
        eq: [vm.member_uuid],
        ignoreCase: true
      }]
      : tagFilters
    await this.dispatchAsync(struct(TagDetailsAction.fetch, {
      project: vm.ProjectModel,
      druid_datasource_id: segment.druid_datasource_id,
      metricalField: _.get(segment, 'params.groupby'),
      selectFields: vm.cur_fields.map(id => dimensionsMap[id]),
      page_current: page_current,
      page_size: page_size,
      tagFilters: finalTagFilters,
      ugId: tagEnhanceId,
      tempUgUserCount: _.get(vm, 'tagEnhanceInfo.topn', 0)
    }))

    this.dispatch(
      [
        struct(VMAction.change, { page_current, page_size }),
        struct(VMAction.flush),
        struct(LoadingAction.content, false)
      ],
      state => {
        // 更新列表总数
        this.dispatch(struct(VMAction.change, {
          page_total: state.TagDetailsCollection.total
        }))
      }
    )
  }

  /**
   * @param {string} member_uuid
   */
  searchMemberGuid (member_uuid) {
    const state = this.state
    const vm = state.VM
    // 搜索table列表
    if (vm.view_state === VIEW_STATE.LIST) {
      this.dispatch(
        struct(VMAction.change, { member_uuid }),
        () => this.setPage(1, vm.page_size)
      )
    } else {
      // 搜索画像列表
      // TODO 单个用户怎么画像？是不是切换到画像列表时，应该隐藏搜索member_guid按钮？
    }
  }

  /**
   * state modifier
   * @param {array} activeTreeIds
   */
  setTreeIds(activeTreeIds) {
    this.dispatch(
      struct(VMAction.change, { activeTreeIds })
    )
  }

  /**
   * @param {string} cur_types
   */
  setActiveTab (cur_types) {
    this.dispatch(struct(VMAction.change, { cur_types }))
  }

  /**
   * @param {string} cur_types
   */
  setActiveTabKey (cur_types) {
    const vm = this.state.VM
    let update = { cur_types }
    const { id: projectCurrentId }  = vm.ProjectModel
    const { localCurFields, localActiveTreeIds } = getCurFieldsAndTreeIds(projectCurrentId,'user_list_cur_fields','user_list_activeTreeIds')
    // 如果当前是画像列表，默认展示当前类别前10个画像
    if (vm.view_state === VIEW_STATE.GALLERY || vm.view_state === VIEW_STATE.ENTIRE_GALLERY) {
      const type = vm.types.find(type => type.treeId === cur_types)
      if (type) {
        let tags = deepFlat([type])
        let activeTreeIds = localActiveTreeIds ||  _.uniq(
          tags.reduce((prev, d) => {
            return [
              ...prev,
              ...(d && d.treeIds ? d.treeIds : [])
            ]
          }, [])
        )

        update.activeTreeIds = activeTreeIds
        let tps = localCurFields ||  _.take(tags, 10).filter(d => d).map(s => s.id)
        //if (!vm.cur_fields.length) {
        this.setCurFields(tps).then(_.noop)
        // }
      }
    }
    this.dispatch(struct(VMAction.change, update))
  }

  downLoadData () {
    if (!this.state.VM.ProjectModel || !this.state.VM.DataSourceModel) {
      return {
        downloadUrl: null,
        downloadAllFieldsUrl: null
      }
    }
    let { tags, dimensions, cur_fields, page_total, member_uuid, cur_segment, ProjectModel, DataSourceModel } = this.state.VM
    const segment = this.state.SegmentCollection.list.find(seg => seg.id === cur_segment)
    const metricalField = _.get(DataSourceModel, 'params.loginId') || _.get(DataSourceModel, 'params.commonMetric[0]')
    const dimensionsMap = _.keyBy(dimensions, dim => dim.id)
    let relation = segment
      ? tagFiltersAdaptToOldFormat(_.get(segment, 'params.composeInstruction[0].config.tagFilters') || []).relation
      : _.get(this.props, 'location.query.relation') || 'and'
    
    tags = relation === 'and'
      ? tags
      : [{
        op: 'or',
        eq: tags
      }]
    if (member_uuid) {
      tags = [...tags, {
        col: _.get(segment, 'params.groupby'),
        op: 'contains',
        eq: [member_uuid],
        ignoreCase: true
      }]
    }
    const queryParams = {
      druid_datasource_id: DataSourceModel.id,
      queryEngine: QUERY_ENGINE.UINDEX,
      tag_datasource_name: DataSourceModel.tag_datasource_name,
      params: {
        filters: tags,
        select: [
          metricalField,
          ...cur_fields.map(id => (dimensionsMap[id] || {}).name).filter(p => p && p !== metricalField && p !== '__time')],
        selectLimit: page_total,
        scanQuery: true // 批量下载采用scanQuery下载
      }
    }
    const queryParamsAllFields = {
      druid_datasource_id: DataSourceModel.id,
      queryEngine: QUERY_ENGINE.UINDEX,
      tag_datasource_name: DataSourceModel.tag_datasource_name,
      params: {
        filters: tags,
        select: [metricalField, ..._.values(dimensionsMap).map(p => p.name).filter(p => p !== metricalField && p !== '__time')],
        selectLimit: page_total,
        scanQuery: true // 批量下载采用scanQuery下载
      }
    }
    return {
      downloadUrl: `/app/download/batchtags?q=${compressUrlQuery(JSON.stringify(queryParams))}`,
      downloadAllFieldsUrl: `/app/download/batchtags?q=${compressUrlQuery(JSON.stringify(queryParamsAllFields))}`
    }
  }

  initWithTagEnhance = async (tagEnhanceId, member_uuid, ProjectModel, DataSourceModel, relation) => {
    await this.dispatchAsync(struct(VMAction.getTagEnhance, { tagEnhanceId }))
    const { tagEnhanceInfo } = this.state.VM
    const groupby = _.get(DataSourceModel, 'params.loginId') || _.get(DataSourceModel, 'params.commonMetric[0]')
    const info = _.pick(tagEnhanceInfo, ['id', 'tag', 'tag_from', 'tag_to', 'topn'])
    let md5 = 'temp_usergroup_' + CryptoJS.MD5(JSON.stringify(info)).toString()
    let ug = {
      id: md5,
      md5,
      params: {
        md5,
        createMethod: 'by-upload',
        openWith: 'tag-enhance',
        tagEnhanceId: tagEnhanceInfo.id,
        groupby,
        tag_from: info.tag_from,
        tag_to: info.tag_to,
        tag: info.tag,
        topn: info.topn,
        composeInstruction: [{ op: UserGroupSetOperationEnum.union, type: UserGroupFilterTypeEnum.userGroupFilter }],
        usergroupFilterStrategy: UsergroupFilterStrategyEnum.byUpload
      },
      datasource_name: DataSourceModel.tag_datasource_name,
      druid_datasource_id: DataSourceModel.id
    }
    await this.dispatchAsync([
      struct(VMAction.initialTagTypes, { DataSourceModel, ProjectModel }),
      struct(SegmentColAction.add, ug),
      struct(VMAction.change, {
        view_type: VIEW_TYPE.TAGS,
        DataSourceModel,
        ProjectModel
      }),
      struct(VMAction.queryUserCount, {
        project: ProjectModel,
        relation
      })
    ])
    await this.setSegment(ug.id, [])
  }
}
