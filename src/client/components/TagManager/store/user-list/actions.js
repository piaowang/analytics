/**
 * @Author sugo.io<asd>
 * @Date 17-10-13
 */

import _ from 'lodash'
import { VIEW_STATE } from './constants'
import Resource from '../../../../models/resource'
import * as bus from '../../../../databus/datasource'
import DruidQueryResource from '../../../../models/druid-query/resource'
import { typesBuilder } from 'client/components/TagManager/tag-type-list'
import { getTagTrees } from '../../../../actions/tag-tree'
import { smartSort } from '../../common'
import { DimDatasourceType, TagType } from '../../../../../common/constants'
import { checkPermission } from '../../../../common/permission-control'
import { getCurFieldsAndTreeIds } from '../../../../common/get-curfields-and-treeids'
import { Anchor } from '../../../Common/anchor-custom'

const canInspectDetails = checkPermission('get:/console/microcosmic-portrait/:id')
const $resource = {
  tagTypes: Resource.create('/app/tag-type/get')
}

/**
 * 递归获取标签分类的所有标签节点
 * @param {array} types
 * @param {array} before
 */
export function deepFlat(types) {
  let res = []
  for (let t of types) {
    let { children = [] } = t
    let dims = children.filter(f => f.id)
    let tps = children.filter(f => f.treeId)
    res = [...res, ...dims, ...deepFlat(tps)].filter(d => d && d.id)
  }
  return res
}

export default {
  /**
   * 查询用户总数及当前条件下用户数
   * @param {Array<ParamTags>} tags
   * @param project
   * @param relation
   * @param {int} tagsUser
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async queryUserCount(tags, project, relation, tagsUser, dimensions, done) {
    let { datasource_id } = project
    let childProjectId = project.parent_id ? project.id : null
    const params = {
      druid_datasource_id: datasource_id,
      child_project_id: childProjectId,
      granularity: 'P1D',
      customMetrics: [{ name: 'total', formula: '$main.count()' }],
      druidQueryId: '',
      queryEngine: 'uindex'
    }

    let res = await DruidQueryResource.query(params)
    const user_total = _.get(res, 'result.[0].total', 0)
    let tags_user
    if (user_total === 0) {
      tags_user = 0
    } else if (tagsUser) {
      //价值升档已设置用户数直接使用
      tags_user = tagsUser
    } else {
      params.filters =
        relation === 'and'
          ? tags
          : [
              {
                op: 'or',
                eq: tags
              }
            ]
      res = await DruidQueryResource.query(params)
      tags_user = _.get(res, 'result.[0].total', 0)
    }

    done({
      user_total,
      tags_user,
      tags,
      page_total: user_total
    })
  },

  /**
   * 查询价值升档的数据
   * @param {Array<ParamTags>} id
   * @return {Promise.<void>}
   */
  async getTagEnhance(id, done) {
    let res = await Resource.create('/app/tag-enhance/get/' + id)
      .get()
      .json()
    done({
      tagEnhanceInfo: res.result || {}
    })
  },

  /**
   * 初始化标签类型列表
   * @param {Object} datasource
   * @param {TagUserGroupListViewModel} state
   * @param {Function} done
   */
  async initialTagTypes(payload, state, done) {
    const { DataSourceModel: datasource, ProjectModel } = payload
    let res = await bus.getDimensions(datasource.id, {
      datasource_type: DimDatasourceType.tag
    })
    const tags = await $resource.tagTypes.get({}, { where: { datasource_id: datasource.id } }, void 0).json()
    const member_uuid = _.get(datasource, 'params.loginId') || _.get(datasource, 'params.commonMetric[0]')
    const omitDims = state.omitDims.concat(member_uuid)

    const dimensions = (res ? res.data : []).filter(d => d.is_druid_dimension && !omitDims.includes(d.name))
    const tagTypes = (tags.result || []).filter(t => !dimensions.includes(t.dimension_id))
    let tagTrees = await getTagTrees(
      datasource.id,
      {
        parentId: 'all'
      },
      false
    )(_.noop)
    tagTrees = _.get(tagTrees, 'result.trees') || []
    const { types } = await typesBuilder({
      dimensions,
      tagTypes,
      tagTrees,
      datasourceCurrent: datasource
    })
    const fields = deepFlat(types)
    const selectedTags = _.take(fields, 10).filter(d => d)
    let uuidFieldName = member_uuid
    if (uuidFieldName) {
      let uuidField = (res ? res.data : []).find(p => p.name === uuidFieldName)
      uuidFieldName = uuidField ? uuidField.title : uuidFieldName
    }
    let activeTreeIds = _.uniq(
      (selectedTags || []).reduce((prev, d) => {
        return [...prev, ...(d ? d.treeIds || [] : [])]
      }, [])
    )
    const { id: projectCurrentId } = ProjectModel
    const { localCurFields, localActiveTreeIds } = getCurFieldsAndTreeIds(projectCurrentId, 'user_list_cur_fields', 'user_list_activeTreeIds')
    done({
      dimensions,
      tagTypes,
      tagTrees,
      types,
      omitDims,
      activeTreeIds: localActiveTreeIds || activeTreeIds,
      selectedTags,
      dimNameDict: _.keyBy(dimensions, 'name'),
      fields: fields.map(d => d.id),
      // 默认只选前10个标签，从 localstorage 读出旧的选项，并且排除掉已经删除了的
      cur_fields: (localCurFields && localCurFields.filter(fid => _.some(fields, f => f.id === fid))) || selectedTags.map(s => s.id),
      cur_types: selectedTags.map(s => s.treeId)[0] || null,
      uuidFieldName
    })
  },

  /**
   * 根据当前状态更新table内容
   * @param {TagUserListStoreState} storeState
   * @param {TagUserGroupListViewModel} state
   * @param {Function} done
   * @return {undefined}
   */
  flushTableColumns(storeState, state, done) {
    const dimensionsMap = _.keyBy(state.dimensions, dim => dim.id)

    /** @type {Array<TagDetailsModel>} */
    const details = storeState.TagDetailsCollection.list.map(r => ({
      member_uuid: r.member_uuid,
      // 过滤出当前选择的字段
      values: state.cur_fields.map(id => r.values[(dimensionsMap[id] || {}).name])
    }))

    // 将 TagDetailsModel 映射为view层table所需的结构
    // 以index作为dataIndex的值
    // 在columns之前要加上member_uuid字段，此字段一直放在表格第一列
    const fields = state.cur_fields.map(id => {
      const dim = dimensionsMap[id] || {}
      return dim.title || dim.name
    })
    let { cur_segment } = state
    let ug = storeState.SegmentCollection.list.find(ug => ug.id === cur_segment)
    let metricalField = _.get(ug, 'params.groupby') || _.get(state.DataSourceModel, 'params.loginId') || _.get(state.DataSourceModel, 'params.commonMetric[0]')
    const columns = [
      {
        key: 'member_uuid',
        dataIndex: 'member_uuid',
        width: 150,
        fixed: 'left',
        title: state.uuidFieldName,
        // eslint-disable-next-line react/display-name
        render: id => {
          if (!canInspectDetails) {
            return id
          }
          const encodeId = encodeURIComponent(id)
          return (
            <Anchor
              target='_blank'
              className='under-line pointer'
              href={
                cur_segment && !_.startsWith(cur_segment, 'temp_')
                  ? `/console/microcosmic-portrait/${encodeId}?userDimName=${metricalField}` //ugId=${cur_segment}&
                  : `/console/microcosmic-portrait/${encodeId}?userDimName=${metricalField}`
              }
            >
              {id}
            </Anchor>
          )
        }
      }
    ].concat(
      fields.map((v, i) => ({
        key: '' + i,
        dataIndex: '' + i,
        title: v,
        width: 150
      }))
    )

    // 生成dataSource时，需要将member_uuid单独提出来
    // 其他数据的dataIndex以index的值
    // 需要保证参数 fields 与 TagDetailsModel.values 是对应的
    const dataSource = details.map(d => {
      const obj = {
        key: d.member_uuid,
        member_uuid: d.member_uuid
      }
      return d.values.reduce((p, c, i) => {
        p[i] = '' + c
        return p
      }, obj)
    })

    done({
      dataSource,
      columns
    })
  },

  /**
   * @param {ReferenceTagModel} tag
   * @return {{type:string, value:Array}}
   * @private
   */
  _tagValueParser(tag = {}) {
    const val = _.get(tag, 'tag_value', '').split('`')
    return {
      type: tag.type,
      value: tag.type === TagType.Range ? val.map(v => (v ? Number(v) : null)) : val
    }
  },

  /**
   * @param {TagGalleryCollectionState} groups
   * @param {TagGalleryCollectionState} entire
   * @param {TagUserGroupListViewModel} state
   * @return {{galleries:Array<{TagGalleryGroupModel}>,entireGalleries:Array<{TagGalleryGroupModel}>}}
   * @private
   */
  _galleriesGraphData(groups, entire, state) {
    const groups_tag_groups = groups.list.reduce((m, g) => {
      m[g.tag] = g.groups
      return m
    }, {})
    const entire_tag_groups = entire.list.reduce((m, g) => {
      m[g.tag] = g.groups
      return m
    }, {})

    let { cur_fields, types } = state
    let dims = deepFlat(types)
    let dimsDict = dims.reduce((p, v) => {
      return {
        ...p,
        [v.id]: v
      }
    }, {})
    let selectedTags = cur_fields.reduce((p, v) => {
      if (dimsDict[v]) {
        return [...p, dimsDict[v]]
      } else {
        return p
      }
    }, [])
    let treeIds = _.uniq(
      selectedTags.reduce((p, v) => {
        return [...p, ...(v.treeIds || [])]
      }, [])
    )

    function getTypes(types) {
      let res = []
      for (let t of types) {
        let { treeId, children, type } = t
        if (treeIds.includes(treeId)) {
          let dims = children.filter(f => f.id)
          let tps = children.filter(f => f && !f.id)
          if (dims.length) {
            res.push({
              name: type,
              treeId,
              tags: dims
            })
          }
          let rest = getTypes(tps)
          if (rest.length) {
            res = [...res, ...rest]
          }
        }
      }
      return res
    }

    let tag_group = getTypes(types)

    // state.types.map(t => ({
    //   name: t.type,
    //   treeId: t.treeId,
    //   tags: deepFlat([t])
    // }))

    const dict = state.dimNameDict
    // 只展示当前选中的标签
    const current_tags = state.fields.filter(v => state.cur_fields.includes(v))
    const galleries = []
    const entireGalleries = []

    /**
     * @param {{name:string, tags:Array<DimensionModel>}} r
     * @return {TagGalleryGroupModel}
     */
    const mapper = r => {
      // 展示标签
      const g = r.tags.filter(tag => current_tags.includes(tag.id) && groups_tag_groups.hasOwnProperty(tag.name))
      const base = {
        group_name: r.name,
        group_id: r.treeId,
        primary_key: r.treeId
      }
      const gp = { ...base, groups: [] }
      const ep = { ...base, groups: [] }

      g.forEach(tag => {
        const dim = dict[tag.name]
        const list = groups.tags[tag.name] || []
        const one = list[0]

        if (one === void 0) {
          return
        }

        let tags = []
        if (one.type === TagType.String) {
          // 按大小排序筛选前10个，以免数据过多图表展示不了
          tags = _.take(
            groups_tag_groups[tag.name].sort((a, b) => b.total - a.total),
            10
          )
        } else if (one.type === TagType.Range) {
          // 按标签名排序
          tags = groups_tag_groups[tag.name].sort((a, b) => {
            return smartSort(this._tagValueParser(list.find(t => t.tag_name === a.value)), this._tagValueParser(list.find(t => t.tag_name === b.value)))
          })
        }

        gp.groups.push({
          tag: tag.name,
          name: dim.title || dim.name,
          values: tags.map(t => ({
            name: t.value,
            value: t.total
          }))
        })

        if (entire_tag_groups.hasOwnProperty(tag.name)) {
          ep.groups.push({
            tag: tag.name,
            name: dim.title || dim.name,
            values: tags.map(t => {
              const rc = entire_tag_groups[tag.name].find(r => r.value === t.value)
              return {
                name: rc.value,
                value: rc.total
              }
            })
          })
        }
      })

      galleries.push(gp)
      entireGalleries.push(ep)
    }

    // 分组并分配 primary_key
    tag_group.map(mapper)
    return { galleries, entireGalleries }
  },

  /**
   * 根据当前状态更新画像内容
   * @param {TagUserListStoreState} storeState
   * @param {TagUserGroupListViewModel} state
   * @param {Function} done
   * @return {undefined}
   */
  flushGalleries(storeState, state, done) {
    const groups = this._galleriesGraphData(storeState.TagGalleryCollection, storeState.TagEntireGalleryCollection, state)

    done(groups)
  },

  /**
   * 根据当前状态更新table内容
   * @param {TagUserListStoreState} storeState
   * @param {TagUserGroupListViewModel} state
   * @param {Function} done
   * @return {undefined}
   */
  flush(storeState, state, done) {
    return state.view_state === VIEW_STATE.LIST ? this.flushTableColumns(storeState, state, done) : this.flushGalleries(storeState, state, done)
  }
}
