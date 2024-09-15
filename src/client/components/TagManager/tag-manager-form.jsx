import React from 'react'
import {Spin, notification} from 'antd'
import TagTypeListRender, { typesBuilder } from './tag-type-list'
import _ from 'lodash'
import Bread from '../Common/bread'
import TagSelect from './tag-select'
import TagFilter from './tag-filter'
import deepCopy from 'common/deep-copy'
import {withHashStateDec} from '../Common/hash-connector'
import {compressUrlQuery, immutateUpdate, immutateUpdates} from '../../../common/sugo-utils'
import {getTagChildren, addFilter2TagManager, computeTagResult, removeSubFilterFromTagManager} from '../../actions'
import TagUpdateTime from './tag-update-time'
import UsergroupPanel from './usergroup-panel'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import {withSizeProvider} from '../Common/size-provider'
import HoverHelp from '../Common/hover-help'
import { AccessDataType } from '../../../common/constants'

const { cdn } = window.sugo

const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

export const TAG_PANEL_WIDTH = 252


@withHashStateDec(
  s => {
    return { filters: s.filters, relation: s.relation }
  },
  {filters: [], relation: 'and'}
)
export default class TagForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      activeTreeIds: [],
      activeChildId: '',
      types: [],
      dimNameDic: {},
      dimDic: {},
      tagResult: {},
      computing: false,
      computeResult: null,
      maxTime: null,
      tagGroupFilters: [],
      untypedDimensions: []
    }
  }

  componentDidMount() {
    this.initState()
  }

  componentWillReceiveProps(nextProps) {
    let props = ['dimensions', 'tagTypes']
    let oldProps = _.pick(this.props, props)
    let newProps = _.pick(nextProps, props)
    if ( !_.isEqual(oldProps, newProps) ||
      // (!this.state.types.length && nextProps.dimensions.length) || // 减少查询
      (!_.isEqual(this.props.tagDatasource, nextProps.tagDatasource)) ||
      (!_.isEqual(nextProps.tagTrees, this.props.tagTrees))
    ) {
      this.initState(nextProps)
    }
  }

  modifier = (...args) => {
    this.setState(...args)
  }

  //递归找到第一个有标签的child，并且给出第一个标签
  findFirstChildWithTag = (types, parentIds = []) => {
    for (let t of types) {
      let {children, treeId} = t
      let c = _.find(children, c => c.id)
      if (c) {
        return {
          activeTreeIds: [...parentIds, treeId],
          activeChildId: c.id
        }
      }
      let childs = children.filter(d => d.treeId)
      let res = this.findFirstChildWithTag(childs, [
        ...parentIds, treeId
      ])
      if (res.activeTreeIds) {
        return res
      }
    }
    return {}
  }

  initState = async (props = this.props) => {
    let { dimensions, tagTypes, tagDatasource, tagTrees } = props
    let { types = [], untypedDimensions, dimNameDic, dimDic } = await typesBuilder({
      dimensions, tagTypes, datasourceCurrent: tagDatasource, tagTrees
    })
    let update = {types, untypedDimensions, dimNameDic, dimDic, loadingTagSelect: true}
    let {activeTreeIds} = this.state
    let typeObj = _.find(types, t => t.treeId === activeTreeIds[0])
    if (!typeObj) {
      Object.assign(
        update,
        this.findFirstChildWithTag(types)
      )
    }
    this.setState(update, this.getCounts)
    return update
  }

  /**
   * 删除组合标签
   */
  delGroupTag = async (id, cb) => {
    let res = await this.props.delTagGroup(id)
    if (res) {
      notification.success({
        message: '提示',
        description: '删除成功'
      })
      if (cb) {
        cb()
      }
    }
  }

  /**
   * 查询标签表对应维度的标签列表
   * @param dimension
   * @returns {Promise.<{ children, total }>}
   */
  getTagChildren = async (dimension) => {
    const {userTotal, tagProject, tagDatasource} = this.props
    return getTagChildren(dimension, tagProject, tagDatasource, userTotal)
  }

  //获取当前标签的计算结果
  getCounts = async () => {
    let {activeChildId, dimDic} = this.state
    let {userTotal = 0} = this.props
    let dimension = dimDic && dimDic[activeChildId] || {}
    const res = await this.getTagChildren(dimension)
    const { children, params, recent_updated_at } = res
    let title = dimension.title || dimension.name
    if ((!children || children.length === 0) && !params) {
      this.setState({
        loadingTagSelect: false,
        tagResult: {
          count: 0,
          title,
          dimension,
          children: [],
          recent_updated_at: null
        }
      })
      return
    }
    this.setState({
      loadingTagSelect: false,
      tagResult: params
        ? res
        : {
          count: userTotal,
          title,
          children,
          dimension,
          recent_updated_at
        }
    })
  }

  //构建filters数组，加入title，name
  buildFilters = () => {
    let {dimNameDic, types} = this.state
    let arr = (this.props.filters || []).map(f => {
      let dim = dimNameDic && dimNameDic[f.col] || {}
      let {id} = dim
      let type = _.find(types, t => {
        return t.children.map(g => g.id).includes(id)
      }) || {}
      return {
        ...f,
        ...dim,
        typeTitle: type.type
      }
    })
    let tree = arr.reduce((prev, item) => {
      let {typeTitle} = item
      if (!prev[typeTitle]) {
        prev[typeTitle] = []
      }
      prev[typeTitle].push(item)
      return prev
    }, {})
    return Object.keys(tree).map(title => {
      return {
        title,
        children: tree[title]
      }
    })
  }

  //计算过滤条件查询人群
  compute = async () => {
    this.setState({computing: true})
    const { tagProject, filters: _filters, dimensions } = this.props
    const filters = deepCopy(_filters)
    let relation = this.props.relation || 'and'
    let res = await computeTagResult(tagProject, filters, relation, dimensions)
    let byFilters = this.buildFilters()
    this.setState({
      computing: false,
      computeResult: {
        byFilters, // 用于判断筛选器是否变更
        ...res
      }
    })
  }

  //构建详情页面url
  buildUrl = (filters = this.props.filters, relation = this.props.relation) => {
    let hash = compressUrlQuery(filters)
    let ugId = _.get(this.props, 'location.query.ugId')
    return ugId
      ? `/console/tag-users?ugId=${ugId}&tags=${hash}&relation=${relation}`
      : `/console/tag-users?tags=${hash}&relation=${relation}`
  }

  //移除过滤条件
  removeFilter = item => {
    let props = ['col', 'eq', 'op']
    let nextFilters = this.props.filters.filter(f => {
      return !_.isEqual(
        _.pick(f, props),
        _.pick(item, props)
      )
    })
    this.setState({
      computeResult: null
    })
    this.props.updateHashState({filters: nextFilters})
  }

  //加入过滤条件
  addFilter = item => {
    this.setState({
      computeResult: null
    })

    let filters = addFilter2TagManager(this.props.filters, item)
    this.props.updateHashState({filters})
  }

  //加入组合标签创建
  addTagGroupFilter = subTagInfo => {
    let tagGroupFilters = deepCopy(this.state.tagGroupFilters)
    let {dimension, title, value, percent} = subTagInfo
    let rest = {title, value, percent}
    let find = flt => {
      return flt.dimension.id === dimension.id
    }
    let has = _.find(tagGroupFilters, find)
    if (!has) {
      let obj = {
        dimension,
        children: [rest]
      }
      tagGroupFilters.push(obj)
    } else {
      let index = _.findIndex(tagGroupFilters, find)
      has.children.push(rest)
      tagGroupFilters.splice(index, 1, has)
    }
    this.setState({
      tagGroupFilters
    })
  }

  //移除组合标签创建
  removeTagGroupFilter = item => {
    let tagGroupFilters = deepCopy(this.state.tagGroupFilters)
    let {dimension, title} = item
    if (!title) {
      tagGroupFilters = tagGroupFilters.filter(f => {
        return f.dimension.id !== dimension.id
      })
      return this.setState({
        tagGroupFilters
      })
    }
    let find = f => {
      return f.dimension.id === dimension.id
    }
    let index = _.findIndex(tagGroupFilters, find)
    let has = _.find(tagGroupFilters, find)
    if (has) {
      if (has.children.length <= 1) {
        tagGroupFilters.splice(index, 1)
      } else {
        has.children = has.children.filter(f => {
          return f.title !== title
        })
        tagGroupFilters.splice(index, 1, has)
      }
    }
    this.setState({
      tagGroupFilters
    })
  }

  //构建新建组合标签的url
  buildTagGroupUrl = () => {
    let obj = {
      tagGroup: {
        params: {
          filters: this.state.tagGroupFilters
        }
      }
    }
    let hash = compressUrlQuery(obj)
    return `/console/tag-group#${hash}`
  }

  //点击标签树事件处理
  onClickTitle = obj => {
    let {activeTreeIds, activeChildId} = this.state
    let update = {}
    let {id, typeTitle, treeId} = obj
    //点击分类
    if (!typeTitle) {
      update.activeTreeIds = activeTreeIds.includes(treeId)
        ? activeTreeIds.filter(d => d !== treeId)
        : [...activeTreeIds, treeId]
      // 点击分类不用查询数据
      this.setState(update)
      return
    }
    // 点击标签
    if (activeChildId === id) {
      return
    }
    update.loadingTagSelect = true
    update.activeChildId = id
    this.setState(update, this.getCounts)
  }

  controlHeight = () => {
    return {minHeight: window.innerHeight - 48 - 44}
  }

  renderBread() {
    let {tagProject, tagDatasource, projectCurrent} = this.props
    let arr = [
      {
        name: tagProject.id !== projectCurrent.id
          ? <HoverHelp placement="right" icon="link" addonBefore="标签体系 " content={`已关联标签项目【${tagProject.name}】`} />
          : '标签体系'
      }
    ]
    let ugId = _.get(this.props, 'location.query.ugId')
    if (ugId) {
      let ug = _.find(this.props.usergroups, ug => ug.id === ugId)
      if (ug) {
        arr.push({
          name: '编辑用户分群:' + ug.title
        })
      }
    }
    return (
      <Bread
        path={arr}
      >
        <TagUpdateTime {...{datasourceCurrent: tagDatasource}} />
      </Bread>
    )
  }

  changeFilter = (col, patches) => {
    let { filters } = this.props
    let filterPos = filters.findIndex(p => p.col === col)
    if (filterPos === -1) {
      return
    }
    let nextFilters = immutateUpdates(filters, [filterPos], flt => ({...flt, ...patches}))

    this.props.updateHashState({ filters: nextFilters })
  }

  renderMainContent = withSizeProvider(({spWidth, spHeight}) => {
    let {
      loading: propLoading,
      tagTypes,
      loadingProject,
      usergroups,
      location
    } = this.props
    let {
      activeTreeIds,
      activeChildId,
      types,
      tagResult,
      tagGroupFilters,
      untypedDimensions,
      loadingTagSelect
    } = this.state
    let loading = propLoading || loadingProject
    let usergroup = _.find(usergroups, u => u.id === location.query.ugId ) || {}
    let props1 = {
      ...this.props,
      ..._.pick(this, [
        'compute',
        'buildUrl',
        'onClickTitle',
        'addFilter',
        'modifier',
        'removeFilter',
        'buildTagGroupUrl',
        'removeTagGroupFilter',
        'addTagGroupFilter',
        'delGroupTag'
      ]),
      tagGroupFilters,
      activeTreeIds,
      activeChildIds: [activeChildId],
      tagTypes,
      types,
      tagResult,
      untypedDimensions,
      usergroup,
      computeResult: this.state.computeResult,
      loadingTagSelect
    }
    return (
      <div
        className="contain-docs-analytic"
        style={{height: 'calc(100% - 44px)'}}
      >
        <Spin spinning={loading}>
          <HorizontalSplitHelper
            style={{height: spHeight - 44}}
            collapseWidth={125}
          >
            <TagTypeListRender
              defaultWeight={TAG_PANEL_WIDTH}
              {...props1}
              activeChildIcon={null}
              className="itblock height-100"
            />

            <div
              defaultWeight={spWidth - TAG_PANEL_WIDTH}
              className="itblock height-100 overscroll-y always-display-scrollbar"
              style={{paddingBottom: '10px'}}
            >
              <UsergroupPanel
                {...props1}
              />
              <TagFilter
                {...props1}
                filters={this.buildFilters()}
                changeFilter={this.changeFilter}
              />
              <TagSelect
                {...props1}
              />
            </div>
          </HorizontalSplitHelper>
        </Spin>
      </div>
    )
  })

  renderNotOk = () => {
    return (
      <div
        className="relative"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="center-of-relative aligncenter">
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <div className="pd2t">
            这个项目不是由标签系统创建的，不能使用用户画像，请切换到由标签系统创建的项目。
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { projectCurrent } = this.props
    if (AccessDataType.Tag !== projectCurrent.access_type) {
      return this.renderNotOk()
    }
    return (
      <div className="height-100">
        {this.renderBread()}

        {this.renderMainContent()}
      </div>
    )
  }
}


