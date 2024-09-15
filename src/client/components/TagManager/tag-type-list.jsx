/**
 * 标签分类树
 */
import React from 'react'
import PropTypes from 'prop-types'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import {
  AppstoreOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  TagOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import {
Button, // Input,
// Modal,
message, Tooltip, Popconfirm
} from 'antd';
import _ from 'lodash'
import deepCopy from 'common/deep-copy'
//import MultiSelect from '../Common/multi-select-buttons'
import classnames from 'classnames'
import Search from '../Common/search'
import SugoIcon from '../Common/sugo-icon'
import TagTypeListCustomOrder from './tag-type-list-custom-order'
import Fetch from '../../common/fetch-final'
import Link from '../Common/link-nojam'
import {dimensionFilter} from './common'
import {checkPermission} from '../../common/permission-control'
import { KEY_NONE_TYPE } from 'common/constants'
import {isSuperUser} from '../../common/user-utils'

const canCreateTagType = checkPermission('post:/app/tag-type/create')
// const canEditTagType = checkPermission('put:/app/tag-type/update')
// const canDeleteTagType = checkPermission('post:/app/tag-type/delete')

// const canEditGroupTag = checkPermission('put:/app/tag-group/update')
// const canDeleteGroupTag = checkPermission('post:/app/tag-group/delete')

export const untypedTreeId = 'not-typed'
export const untypedTitle = '未分类'
function filterByKeyword (keyword, _types) {
  let res = []
  let types = deepCopy(_types)
  for (let r of types) {
    if (r.type.includes(keyword)) {
      res.push(r)
    } else {
      let dims = r.children.filter(f => f.id)
      let tps = r.children.filter(f => f && !f.id)
      let resDim = dims.filter(f => (f.title + '##' + f.name).includes(keyword))
      let resTps = tps.filter(t => {
        return t && t.type && t.type.includes(keyword)
      })
      let all = [
        ...resTps,
        ...resDim
      ]
      if (all.length) {
        r.children = all
        res.push(r)
      }
      else {
        let cc = filterByKeyword(keyword, tps)
        if (cc.length) {
          r.children = cc
          res.push(r)
        }
      }
    }
  }
  return res
}

/**
 * 构建标签列表的树型结构的递归方法
 * @param {*} treeGroup
 */
function findChildsFromTree (
  treeGroup,
  tagTypesDic,
  tagTypesGroup,
  dimDic,
  tagGroupsDic,
  order,
  parent_id,
  treeIdsParent = []
) {
  return (treeGroup[parent_id] || [])
    .map(d => {
      let { id, name, remark } = d
      let tagTypes = tagTypesGroup[id] || []
      let treeIds = [...treeIdsParent, id]
      let dims = tagTypes
        .map(d => {
          let dim = dimDic[d.dimension_id] || {}
          if (!_.isEmpty(dim)) {
            return {
              ...dim,
              typeTitle: name,
              treeIds,
              treeId: id
            }
          }
          let tagGroup = tagGroupsDic[d.dimension_id] || {}
          if (!_.isEmpty(tagGroup)) {
            return {
              ...tagGroup,
              typeTitle: name,
              treeIds,
              treeId: id,
              nodeType: 'tagGroup'
            }
          }
          return false
        })
        .filter(d => d)
      let sortArr = _.get(order, id) || []
      dims = _.sortBy(dims, d => {
        return _.findIndex(sortArr, id => id === d.id)
      })
      let subTypes = findChildsFromTree(
        treeGroup,
        tagTypesDic,
        tagTypesGroup,
        dimDic,
        tagGroupsDic,
        order,
        id,
        treeIds
      )
      subTypes = _.sortBy(subTypes, d => {
        return _.findIndex(sortArr, id => id === d.treeId)
      })
      return {
        type: name,
        treeId: id,
        treeIds,
        remark,
        children: [
          ...subTypes,
          ...dims
        ]
      }
    })
}

/**
 * 构建types数组方法
 */
export const typesBuilder = async (props) => {
  let {
    dimensions,
    tagTypes,
    tagTrees = [],
    datasourceCurrent,
    filterDimensions = true,
    tagGroups = []
  } = props
  if (!datasourceCurrent.id) {
    return {}
  }
  const dimIds = dimensions.map(p => p.id)
  
  let tagTypesDic = tagTypes.reduce((prev, tt) => {
    prev[tt.dimension_id] = tt
    return prev
  }, {})
  //过滤基础分类属性
  // const baseCategory = tagTrees.find(p => p.type === 0) || {}
  //标签体系 组合标签是放在dimensions中  过滤包含停用标签的组合标签和停用的组合标签
  dimensions = dimensions.filter(p => {
    if (p.from !== 'tagGroup') {
      return true
    }
    const filterDimIds = _(p).chain().get(['params', 'filters'], [])
      .flatMap(f => {
        return ('filters' in f) ? f.filters.map(f0 => f0.dimension.id) : [f.dimension.id]
      })
      .value()
    return !(p.status === 0 || _.some(filterDimIds, d => !dimIds.includes(d)))
  })
  tagGroups = tagGroups.filter(p => p.datasource_id === datasourceCurrent.id)
  let res = await Fetch.get(`/app/custom-orders/get/${datasourceCurrent.id}?dataType=global`)
  let order = _.get(res, 'result.tags_order')
  let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
  if (filterDimensions) {
    dimensions = dimensionFilter(dimensions, commonMetric)
  }
  let dimDic = dimensions.reduce((prev, tt) => {
    prev[tt.id] = tt
    return prev
  }, {})
  let tagGroupsDic = tagGroups.reduce((prev, tt) => {
    prev[tt.id] = tt
    return prev
  }, {})
  let tagDimDic = tagTypes.reduce((prev, v) => {
    prev[v.dimension_id] = v.type
    return prev
  }, {})
  let untypedDimensions = dimensions.filter(dim => {
    return !tagTypesDic[dim.id]
  })
  let untypedTagGroups = tagGroups.filter(dim => {
    return !tagTypesDic[dim.id]
  })
  // tagTypes = tagTypes.filter(t => {
  //   return dimDic[t.dimension_id]
  // })
  let treeGroup = tagTrees.reduce((p, t) => {
    let {parent_id = '-1'} = t
    if (!p[parent_id]) {
      p[parent_id] = []
    }
    p[parent_id].push(t)
    return p
  }, {})
  let tagTypesGroup = tagTypes.reduce((p, t) => {
    let {tag_tree_id} = t
    if (!p[tag_tree_id]) {
      p[tag_tree_id] = []
    }
    p[tag_tree_id].push(t)
    return p
  }, {})

  let types = findChildsFromTree(
    treeGroup,
    tagTypesDic,
    tagTypesGroup,
    dimDic,
    tagGroupsDic,
    order,
    '-1'
  )

  // let types = Object.keys(obj).map(type => {
  //   return {
  //     type,
  //     children: obj[type]
  //       .map(obj => {
  //         return {
  //           ...dimDic[obj.dimension_id],
  //           typeTitle: type
  //         }
  //       })
  //       .filter(_.identity)
  //   }
  // })
  if (untypedDimensions.length || untypedTagGroups.length) {
    let orderUntyped = _.get(order, KEY_NONE_TYPE) || []
    let dims = untypedDimensions.map(d => {
      return {
        ...d,
        treeId: untypedTreeId,
        treeIds: [untypedTreeId],
        typeTitle: untypedTitle
      }
    })
    let groups = untypedTagGroups.map(t => {
      return {
        ...t,
        typeTitle: untypedTitle,
        treeId: untypedTreeId,
        treeIds: [untypedTreeId],
        nodeType: 'tagGroup'
      }
    })
    dims = _.orderBy(_.concat(dims, groups), d => {
      return _.findIndex(orderUntyped, s => s === d.id)
    })

    // 添加未分类节点
    const idx = _.findIndex(types, t => (t.id || t.treeId) === untypedTreeId)
    const untypedItem = types[idx]
    if (!untypedItem) {
      types.push({
        type: untypedTitle,
        treeId: untypedTreeId,
        children: dims
      })
    } else {
      types[idx] = {
        ...untypedItem,
        type: untypedTitle,
        treeId: untypedTreeId,
        children: [...untypedItem.children, ...dims]
      }
    }
  }
  let orderTop = _.get(order, '-1') || []
  types = _.orderBy(types, t => {
    return _.findIndex(orderTop, d => {
      let {treeId} = t
      return d === (treeId === untypedTreeId ? KEY_NONE_TYPE : treeId)
    })
  })
  let dimNameDic = dimensions.reduce((prev, tt) => {
    prev[tt.name] = tt
    return prev
  }, {})
  // let res = await Fetch.get(`/app/custom-orders/get/${datasourceCurrent.id}?dataType=global`)
  // let order = _.get(res, 'result.tags_order')
  // if (order && order.length) {
  //   let typesOrder = order.map(p => p.type)
  //   types = _.orderBy(types, p => _.indexOf(typesOrder, p.type))
  //   types = types.map(p => {
  //     let tagsOrder = _.find(order, o => o.type === p.type)
  //     if (tagsOrder) {
  //       return {
  //         type: p.type,
  //         children: _.orderBy(p.children, c => _.indexOf(tagsOrder.children, c.name))
  //       }
  //     } else {
  //       return p
  //     }
  //   })
  // }
  return {
    types,
    tagDimDic,
    untypedDimensions,
    dimNameDic,
    dimDic
  }
}

export default class TagTypeList extends React.Component {
  static propTypes = {
    datasourceCurrent: PropTypes.object.isRequired,
    dimensions: PropTypes.array.isRequired,
    types: PropTypes.array.isRequired,
    tagTypes: PropTypes.array.isRequired,
    addTagType: PropTypes.func,
    delTagType: PropTypes.func,
    activeChildIds: PropTypes.array,
    activeTypes: PropTypes.array,
    activeTreeIds: PropTypes.array,
    activeChildIcon: PropTypes.string,
    className: PropTypes.string,
    onClickTitle: PropTypes.func
  }

  static defaultProps = {
    activeChildIcon: 'check-square',
    activeChildIds: [],
    activeTypes: [],
    activeTreeIds: [],
    className: 'no-active-underline',
    onClickTitle: _.noop
  }

  constructor (props) {
    super(props)
    this.state = {
      expandedKeys: [],
      keyword: '',
      showModal: false,
      submitting: false,
      type: {
        title: '',
        titleTemp: '',
        children: []
      },
      tempOrders: [],
      isSettingOrder: false
    }
  }

  onChangeTempTypeTitle = e => {
    let titleTemp = e.target.value.slice(0, 50)
    let type = deepCopy(this.state.type)
    type.titleTemp = titleTemp
    this.setState({ type })
  }

  onChangeTypeTitle = () => {
    let title = this.state.type.titleTemp
    let type = deepCopy(this.state.type)
    type.title = title
    this.setState({ type })
  }

  onNewTag = (callback) => {
    this.setState({
      showModal: true,
      type: {
        title: '',
        titleTemp: '',
        isNew: true,
        children: []
      },
      oldType: null
    })
    if (callback) {
      this.callback = callback
    }
  }

  onEditTag = (type, event) => {
    event.stopPropagation()
    let obj = this.getOldType(type.type)
    this.setState({
      showModal: true,
      type: obj
    })
  }

  onSelectTypeChildren = children => {
    let type = deepCopy(this.state.type)
    type.children = children
    this.setState({
      type
    })
  }

  onDelTag = async ({ type }) => {
    let { tagTypes } = this.props
    let ids = tagTypes.filter(o => o.type === type).map(o => o.id)
    let rest = tagTypes.filter(o => o.type !== type)
    await this.props.delTagType(ids, rest)
  }

  getOldType = type => {
    let { tagTypes } = this.props
    return tagTypes.filter(o => o.type === type)
      .reduce((prev, o) => {
        prev.children.push(o.dimension_id)
        return prev
      }, {
        title: type,
        titleTemp: type,
        children: []
      })
  }

  getUpdate = (type, children, oldType, isNew) => {
    let { id } = this.props.datasourceCurrent
    let { tagTypes } = this.props
    let toDel = false
    let toAdd = false
    if (isNew) {
      toAdd = {
        datasource_id: id,
        dimension_ids: children,
        type
      }
      return { toDel, toAdd }
    } else if (oldType.title !== type) {
      let ids = tagTypes.filter(t => t.type === oldType.title)
      if (ids.length) {
        toDel = { ids: ids.map(d => d.id) }
      }
      toAdd = {
        datasource_id: id,
        dimension_ids: children,
        type
      }
      return { toDel, toAdd }
    }
    let dids = oldType.children.filter(id => {
      return !children.includes(id)
    })
    let ids = tagTypes.filter(t => dids.includes(t.dimension_id))
    if (ids.length) {
      toDel = { ids: ids.map(d => d.id) }
    }
    let ids2 = children.filter(id => {
      return !oldType.children.includes(id)
    })
    if (ids2.length) {
      toAdd = {
        datasource_id: id,
        dimension_ids: ids2,
        type
      }
    }
    return { toDel, toAdd }
  }

  onSubmit = async () => {
    let { title: type, children, isNew } = this.state.type
    let { delTagType, addTagType, tagTypes } = this.props
    if (isNew && !type.trim()) {
      return message.warn('分类名称不能为空')
    } else if (
      type === untypedTitle
    ) {
      return message.warn('分类名称已经存在，请换个名称')
    }
    else if (!children.length) {
      return message.warn('至少选择一个标签')
    }
    let oldType = this.getOldType(type)
    let { toDel, toAdd } = this.getUpdate(type, children, oldType, isNew)

    let r1, r2
    let final = tagTypes
    this.setState({
      submitting: true
    })
    if (toDel) {
      let { ids } = toDel
      final = tagTypes.filter(t => !ids.includes(t.id))
      r1 = await delTagType(toDel.ids, final)
    }
    if (toAdd) {
      r2 = await addTagType(toAdd, final)
      if (r2) {
        final = [
          ...final,
          ...r2.result
        ]
      }
    }
    if (r1 || r2) {
      if (_.isFunction(this.callback)) {
        this.callback(type)
        delete this.callback
      }
      this.props.getTagTypes()
      this.setState({
        showModal: false,
        submitting: false
      })
    } else {
      this.setState({
        submitting: false
      })
    }
  }

  onChange = e => {
    let keyword = e.target.value
    this.setState({
      keyword
    })
  }

  closeModal = () => {
    this.setState({
      showModal: false
    })
  }

  renderLevel2 = (obj, i) => {
    let { title, name, id, from, status, created_by, role_ids } = obj
    let {id: currUserId, SugoRoles} = window.sugo.user
    let currUserRoleIdsSet = new Set(SugoRoles.map(r => r.id))
    if (from === 'tagGroup' && created_by !== currUserId && !_.some(role_ids, r => currUserRoleIdsSet.has(r))
      && !isSuperUser()) {
      return null
    }
    let { activeChildIds, activeChildIcon, delGroupTag } = this.props
    let cls = classnames('tag-tree-lv2-title elli', {
      active: activeChildIds.includes(id)
    })
    let tt = title || name
    return (
      <div
        className={cls}
        key={id + 'tr2' + i}
        onClick={() => this.props.onClickTitle(obj)}
      >
        <Tooltip
          title={tt}
          placement="right"
        >
          <span>
            <LegacyIcon
              type={activeChildIcon}
              className="mg1r tag-icon"
            />
            <span className="pd1r pd1l">
              {
                from === 'tagGroup'
                  ? <TagsOutlined className="pd1r" />
                  : <TagOutlined className="pd1r" />
              }
              {tt}</span>
          </span>
        </Tooltip>
      </div>
    );
  }

  // renderEditIcon = obj => {
  //   if (
  //     !canEditTagType ||
  //     obj.type === untypedTitle ||
  //     !this.props.delTagType
  //   ) {
  //     return null
  //   }
  //   return (
  //     <Tooltip title="编辑这个分类">
  //       <Icon
  //         type="edit"
  //         className="pointer tag-tree-op-icon edit-tag-icon"
  //         onClick={e => this.onEditTag(obj, e)}
  //       />
  //     </Tooltip>
  //   )
  // }

  // renderDelIcon = obj => {
  //   if (
  //     !canDeleteTagType ||
  //     obj.type === untypedTitle ||
  //     !this.props.delTagType
  //   ) {
  //     return null
  //   }
  //   return (
  //     <Popconfirm
  //       title="确定删除这个分类"
  //       onConfirm={e => this.onDelTag(obj, e)}
  //     >
  //       <Tooltip title="删除这个分类">
  //         <Icon
  //           type="close"
  //           className="pointer tag-tree-op-icon del-tag-icon"
  //         />
  //       </Tooltip>
  //     </Popconfirm>
  //   )
  // }

  renderLevel1 = (obj, i) => {
    let { type, children, treeId } = obj
    let { activeTypes, activeTreeIds } = this.props
    let { keyword, tempOrders } = this.state
    let isActive = activeTypes.includes(type) || activeTreeIds.includes(treeId) || keyword
    let cls = classnames('tag-tree-lv1', {
      active: isActive
    })
    let icon = isActive ? 'caret-down' : 'caret-right'
    let tagsOrder = _.find(tempOrders, p => p.type === type || p.treeId === treeId)
    if (tagsOrder) {
      children = _.orderBy(children, p => _.indexOf(tagsOrder.children, p.treeId || p.name))
    }
    return (
      <div
        className={cls}
        key={type + 'tr' + i}
      >
        <div
          className="tag-tree-lv1-title elli"
          onClick={() => this.props.onClickTitle(obj)}
        >
          <Tooltip
            title={type}
            placement="right"
          >
            <span className="elli iblock">
              <LegacyIcon
                type={icon}
                className="mg1r font12"
              />
              <span className="pd1l pd1r font"><AppstoreOutlined className="font12" /> {type}</span>
            </span>
          </Tooltip>
          {/*this.renderEditIcon(obj)*/}
          {/*this.renderDelIcon(obj)*/}
        </div>
        {
          children && children.length
            ? children.map(this.renderLevelX)
            : null
        }
      </div>
    );
  }

  renderLevelX = (item, i) => {
    let {id} = item
    if (id) {
      return this.renderLevel2(item, i)
    }
    return this.renderLevel1(item, i)
  }

  renderTree () {
    let { types } = this.props
    let { keyword, tempOrders } = this.state
    if (tempOrders && tempOrders.length) {
      let typesOrder = tempOrders.map(p => p.type)
      types = _.orderBy(types, p => _.indexOf(typesOrder, p.type))
    }
    types = keyword
      ? filterByKeyword(keyword, types)
      : types
    return (
      <div className="overscroll-y" style={{height: 'calc(100% - 42px - 42px)'}}>
        <div>
          {
            types.map(this.renderLevelX)
          }
        </div>
      </div>
    )
  }

  renderSearch = () => {
    let { isSettingOrder } = this.state
    return (
      <div className="pd1y pd2x">
        <Search
          value={this.state.keyword}
          placeholder="搜索"
          disabled={isSettingOrder}
          onChange={this.onChange}
        />
      </div>
    )
  }

  renderFooter () {
    let { submitting } = this.state
    return [
      <Button
        type="ghost"
        key="back"
        icon={<CloseCircleOutlined />}
        className="mg1r iblock"
        onClick={this.closeModal}
      >
        取消
      </Button>,
      <Button
        key="submit"
        type="success"
        className="iblock"
        icon={<CheckOutlined />}
        loading={submitting}
        onClick={this.onSubmit}
      >
        {submitting ? '提交中...' : '提交'}
      </Button>
    ];
  }

  // renderEditModal () {
  //   let {
  //     type: {
  //       titleTemp,
  //       isNew,
  //       children
  //     },
  //     showModal
  //   } = this.state
  //   let { dimensions } = this.props
  //   let props = {
  //     title: !isNew ? '编辑标签分类' : '新建标签分类',
  //     visible: showModal,
  //     width: 600,
  //     onCancel: this.closeModal,
  //     footer: this.renderFooter()
  //   }
  //   let props1 = {
  //     options: dimensions,
  //     value: children,
  //     onChange: this.onSelectTypeChildren,
  //     getTitleFromOption: opt => opt.title
  //   }
  //   return (
  //     <Modal
  //       {...props}
  //     >
  //       <div className="pd1b">分类名称</div>
  //       <div className="pd2b">
  //         <Input
  //           value={titleTemp}
  //           onChange={this.onChangeTempTypeTitle}
  //           onBlur={this.onChangeTypeTitle}
  //         />
  //       </div>
  //       <div className="pd1b">包含的标签</div>
  //       <div>
  //         <MultiSelect
  //           {...props1}
  //         />
  //       </div>
  //     </Modal>
  //   )
  // }

  toggleSettingOrder = async () => {
    let { types, datasourceCurrent } = this.props
    let { isSettingOrder, tempOrders } = this.state
    if (isSettingOrder) {
      // 关闭排序功能，保存排序
      await Fetch.post(`/app/custom-orders/update/${datasourceCurrent.id}`, { tags_order: tempOrders, dataType: 'global' })
      this.setState({ isSettingOrder: false })
    } else {
      let initTempOrders = tempOrders
      if (!tempOrders.length) {
        initTempOrders = types.map(p => {
          return {
            type: p.type,
            children: p.children.map(c => c.name)
          }
        })
      }
      // 启用排序，通知维度的排序功能关闭，因为同时启用两个排序组件会报错
      this.setState({ isSettingOrder: true, tempOrders: initTempOrders })
    }
  }

  updateTempOrders = (tempOrders) => {
    this.setState({ tempOrders })
  }

  render () {
    let { className, setProp, types, dimensions, style } = this.props
    let { isSettingOrder, tempOrders } = this.state
    return (
      <div
        className={className}
        style={{padding: '10px 5px 10px 10px', ...style}}
      >
        <div className="bg-white corner height-100">
          <div className="tag-types-title pd2t pd1b pd2x">
            <div className="fix">
              <div className="fleft">标签分类</div>
              {
                setProp
                  ? <div className="fright">
                    {/*<Tooltip
                      title={isSettingOrder ? '保存标签排序' : '编辑标签排序'}
                      placement="topLeft"
                      arrowPointAtCenter
                    >
                      {<SugoIcon
                        type={isSettingOrder ? 'sugo-save' : 'sugo-setting'}
                        onClick={this.toggleSettingOrder}
                        className={classnames('font16 mg1r pointer iblock-force', {
                          'grey-at-first': !isSettingOrder,
                          'color-blue': isSettingOrder
                        })}
                      />
                    </Tooltip>*/}
                    {!canCreateTagType ? null : (
                      <Tooltip title="新建分类">
                        <Link to="/console/tag-system-manager">
                          <SugoIcon
                            type="sugo-add"
                            className="font20 mg1r pointer grey-at-first iblock-force"
                            onClick={this.onNewTag}
                          />
                        </Link>
                      </Tooltip>
                    )}
                  </div>
                  : null
              }
            </div>
          </div>
          {this.renderSearch()}
          {
            isSettingOrder
              ? (
                <div className="overscroll-y" style={{height: 'calc(100% - 42px - 42px)'}}>
                  <TagTypeListCustomOrder
                    types={types}
                    tempOrders={tempOrders}
                    updateTempOrders={this.updateTempOrders}
                    dimensions={dimensions}
                  />
                </div>
              )
              : this.renderTree()
          }
        </div>
      </div>
    )
  }

}
