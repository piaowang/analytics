import React from 'react'
import _ from 'lodash'
import { TagOutlined, TagsOutlined } from '@ant-design/icons';
import {Button, Divider, Radio, Spin} from 'antd'
import Bread from 'client/components/Common/bread'
import Store from './store'
import HorizontalSplitHelper from 'client/components/Common/horizontal-split-helper'
import {withSizeProvider} from 'client/components/Common/size-provider'
import './css.styl'
import {PAGE_VIEW} from './store/constants'
import TagTypeTree from './tag-type-tree'
import TagDimension from './tag-dimension'
import TagTypeTreeForm from './tag-type-tree-form'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from 'client/actions'
import TagDimensionsTable from '../dimensions-table'
import {Auth} from 'client/common/permission-control'
import {findTreeNode} from './store/utils'
import {synchronizer} from '../../Fetcher/synchronizer'
import tagRequirementChecker from '../../TagManager/tag-require'
import {isDiffBySomePath, compressUrlQuery} from '../../../../common/sugo-utils'
import TagGroupForm from '../../TagManager/tag-group-form'
import HoverHelp from '../../Common/hover-help'

import { AccessDataType } from '../../../../common/constants'

const { cdn } = window.sugo

const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`

export const TAG_TREE_PANEL_WIDTH = 252

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

/**
 * @description 标签体系管理
 * @export
 * @class TagSystemManager
 * @extends {React.Component}
 */
@connect(mapStateToProps, mapDispatchToProps)
export default class TagSystemManager extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
  }

  componentDidMount() {
    this.props.getRoles()
    this.props.getUsers()
    this.props.getTagGroups()
    this.init(this.props)
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.projectCurrent, this.props.projectCurrent) 
    || !_.isEqual(nextProps.tagGroups, this.props.tagGroups)) {
      this.init(nextProps)
    }

    // 处理标签维度跳转
    if (!_.isEqual(nextProps.location, this.props.location)) {
      const { query: { action, dimId } } = nextProps.location
      if (action === 'create-tag') { // 创建标签
        this.store.setState({
          pageView: PAGE_VIEW.MAIN_TREE,
          rightContentView: PAGE_VIEW.MAIN_TREE_RIGHT_TAG_TYPE_CREATE
        })
        this.onCreateTag()
        // 处理完视图，清除地址栏参数
        this.props.changeUrl(['action', 'datasource_type', 'dimId'], 'remove')
      } else if (action === 'update-tag') { // 更新标签
        this.selectTag(dimId)
      }
    }

    //如果url指定了id或者datasource_id，并且跟顶部菜单不一致
    //主动切换顶部菜单
    const { query: { id } } = nextProps.location
    let nid = nextProps.datasourceCurrent.id
    let {changeProject, projectList, datasourceList} = nextProps
    let nDatasourceId = _.get(_.find(datasourceList, {id}), 'id')
    let proj = _.find(projectList, { datasource_id: nDatasourceId})
    if (
      proj && nid !== nDatasourceId &&
      !this.onChange
    ) {
      this.shouldNotChangeProject = true
      changeProject(proj.id)
      this.props.changeUrl({ id }, 'replace')
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // 如果需要跳转到特定的标签，则等加载完后再跳转
    const { query: { action, dimId } } = this.props.location
    const keys = ['dimensionList', 'tagTypes', 'treeData']
    if (
      action === 'update-tag' && dimId
      && isDiffBySomePath(this.state.vm, prevState.vm, keys)
      && _.every(keys, key => !_.isEmpty(this.state.vm[key]))
    ) {
      setTimeout(() => this.selectTag(dimId), 50)
    }
  }

  selectTag(dimId) {
    this.store.setState({
      pageView: PAGE_VIEW.MAIN_TREE,
      rightContentView: PAGE_VIEW.MAIN_TREE_RIGHT_TAG_INFO
    })
    let {treeData, tagTypes, expandedKeys} = this.state.vm
    findTreeNode(treeData, dimId, node => {
      // 选中节点
      const fakeNode = { props: { dataRef: node, isTagDimension: true}}
      this.onTreeSelect([dimId], {selected: true, node: fakeNode})

      // 展开必要的 type
      const [tagType] = tagTypes.filter(t => t.dimension_id === dimId)
      const {tag_tree_id: selected_tag_type} = tagType || { tag_tree_id: 'not-typed' }
      this.store.setState({
        selected_tag_type,
        expandedKeys: _.uniq([...expandedKeys, selected_tag_type].filter(_.identity))
      })
    })

    // 处理完视图，清除地址栏参数
    this.props.changeUrl(['action', 'datasource_type', 'dimId'], 'removeByReplace')
  }

  /**
   * 入口组件，有两种方式进入
   * 1. 输入路由直接进入，此时需要从 componentWillReceiveProps 中取值
   * 2. 通过页面Link跳转，此时可以在 componentWillMount 中父级传入取值
   * @param props
   */
  init = (props) => {
    let {projectCurrent, datasourceCurrent, tagProject, tagDatasource, tagGroups} = props
    if (projectCurrent.id) {
      this.store.initPageData(projectCurrent, datasourceCurrent, tagProject, tagDatasource, tagGroups)
    }
    if (props && props.location.query.datasource_type === 'tag') {
      this.store.setState({pageView: PAGE_VIEW.MAIN_TABLE})
    }
  }

  /**
   * @description 切换视图列表
   * @memberOf TagSystemManager
   */
  onChangePageType = (e) => {
    const pageView = e.target.value
    this.props.changeUrl(['action', 'datasource_type', 'dimId'], 'remove')
    if (pageView === PAGE_VIEW.MAIN_TABLE) {
      this.props.changeUrl(['action', 'datasource_type', 'dimId'], 'remove')
      this.props.changeUrl({
        datasource_type: 'tag'
      })
    }
    this.store.setState({ pageView })
  }

  // 点击数节点
  onTreeSelect = (selectedKeys, info) => {
    if (!info.selected) { // 非选中状态时
      return
    }
    const { dimensionList, treeData } = this.state.vm
    const treeNode = info.node
    const { isTagDimension = false, dataRef } = treeNode.props
    const [ selectedTagDimension ] = dimensionList.filter(d => d.id === dataRef.id)
    const seletedTagTypeTree = dataRef
    const parentTreeIds = seletedTagTypeTree.treeIds || []
    const curIdx = _.findIndex(parentTreeIds, id => id === seletedTagTypeTree.treeId)
    const pIdx = parentTreeIds.length === 1 ? 0 : curIdx - 1
    const parentTreeId = parentTreeIds[pIdx]
    let selectedParentTreeNode
    findTreeNode(treeData, parentTreeId, item => {
      if (item.treeId !== seletedTagTypeTree.treeId) {
        selectedParentTreeNode = item
      }
    })
    this.store.setState({
      rightContentView: isTagDimension ? PAGE_VIEW.MAIN_TREE_RIGHT_TAG_INFO : PAGE_VIEW.MAIN_TREE_RIGHT_TAG_TYPE_INFO,
      selectedKeys,
      isTagDimension,
      selectedTagDimension,
      selectedTreeNode: treeNode,
      seletedTagTypeTree,
      selectedParentTreeNode
    })
  }

  // 创建标签
  onCreateTag = () => {
    const { isTagDimension } = this.state.vm
    let state = {
      rightContentView: PAGE_VIEW.MAIN_TREE_RIGHT_TAG_CREATE,
      tagGroup: {},
      selectedKeys: []
    }
    if (isTagDimension) {
      state.selectedKeys = []
    }
    this.store.setState(state)
  }

  // 创建标签分类
  onCreateTagType = () => {
    this.store.setState({
      rightContentView: PAGE_VIEW.MAIN_TREE_RIGHT_TAG_TYPE_CREATE,
      tagGroup: {},
      selectedKeys: []
    })
  }

  renderPageType() {
    const { pageView } = this.state.vm
    return (
      <div className="itblock mg1l">
        <Radio.Group
          onChange={this.onChangePageType}
          value={pageView}
          defaultValue={PAGE_VIEW.MAIN_TREE}
        >
          <Radio.Button key="rdo-tree" value={PAGE_VIEW.MAIN_TREE}>标签分类</Radio.Button>
          <Radio.Button key="rdo-table" value={PAGE_VIEW.MAIN_TABLE}>标签列表</Radio.Button>
        </Radio.Group>
      </div>
    )
  }

  saveForm = (model) => {
    const { tagGroups = [] } = this.props
    this.store.save(model, tagGroups)
  }

  saveOrder = (datasource_id, modifyData) => {
    this.store.saveOrder(datasource_id, modifyData)
  }

  remove = (id, parentId) => {
    const { tagGroups = [] } = this.props
    this.store.remove(id, parentId, tagGroups)
  }

  renderRightContent = (tagProject, tagDatasource) => {
    const {
      selectedTagDimension,
      selectedTreeNode={},
      loading,
      rightContentView,
      seletedTagTypeTree={},
      treeList,
      treeData,
      dimensionList,
      roles,
      selectedKeys,
      selected_tag_type,
      selectedParentTreeNode
    } = this.state.vm
    
    const { tagGroups } = this.props
    const tagGroup = _.find(tagGroups, p => selectedKeys.includes(p.id))

    const { setProp } = this.props
    // 判断项目类型 使用关联tag项目的数据源
    const buttons = (
      <div className="mg2b">
        <Auth auth="app/tag-type-tree/create">
          <Button
            className="iblock mg2r"
            icon={<TagsOutlined />}
            onClick={() => this.onCreateTagType()}
          >添加标签分类</Button>
        </Auth>
        <Auth auth="app/tag-dict/create">
          <Button
            className="iblock"
            icon={<TagOutlined />}
            onClick={() => this.onCreateTag()}
          >添加标签</Button>
        </Auth>
      </div>
    )
    // 标签信息视图
    if (rightContentView === PAGE_VIEW.MAIN_TREE_RIGHT_TAG_CREATE || rightContentView === PAGE_VIEW.MAIN_TREE_RIGHT_TAG_INFO || tagGroup) {
      const isCreateTag = rightContentView === PAGE_VIEW.MAIN_TREE_RIGHT_TAG_CREATE
      let dimension = selectedTagDimension
      if (isCreateTag) {
        let role = _.find(roles, {
          type: 'built-in'
        })
        let currentUserRoleIds = window.sugo.user.SugoRoles.map(p => p.id)
        let role_ids = _.uniq(
          [role.id, ...currentUserRoleIds]
        )
        dimension = {
          name: '',
          title: '',
          type: 2,
          role_ids,
          user_ids: [],
          tags: [],
          params: {}
        }
      }
      return (
        <div className="pd3">
          {buttons}
          <Divider orientation="left">{tagGroup ? '分组标签信息' : (isCreateTag ? '添加标签' : '标签信息')}</Divider>
          {
            tagGroup ? this.renderTagGroupEdit(tagGroup) : (
              <TagDimension
                setProp={setProp}
                datasource={tagDatasource}
                project={tagProject}
                treeNode={selectedTreeNode}
                dimension={dimension}
                roles={roles}
                refresh={this.refresh}
                setState={this.store.setState}
                dimensions={dimensionList}
                selected_tag_type={selected_tag_type}
                treeData={treeData}
                treeList={treeList}
                tags={[]}
                projectCurrent={this.props.projectCurrent}
              />
            )
          }
        </div>
      )
    }
    const isCreateType = rightContentView === PAGE_VIEW.MAIN_TREE_RIGHT_TAG_TYPE_CREATE
    let tagTypeTree = seletedTagTypeTree
    if (isCreateType) {
      tagTypeTree = {
        datasource_id: tagDatasource.id,
        name: '',
        remark: ''
      }
    } else { // 更新时取出列表中的原记录信息
      const [ dbTagTypeTree = {} ] = treeList.filter(t => t.id === tagTypeTree.id)
      tagTypeTree = {
        ...tagTypeTree,
        ...dbTagTypeTree
      }
    }
    return (
      <Spin spinning={loading}>
        <div className="pd3">
          {buttons}
          <Divider orientation="left">{isCreateType ? '添加标签分类' : '标签分类信息'}</Divider>
          <TagTypeTreeForm
            lodding={loading}
            save={this.saveForm}
            remove={this.remove}
            setState={this.store.setState}
            selectedKeys={selectedKeys}
            treeData={treeData}
            isCreateType={isCreateType}
            tagTypeTree={tagTypeTree}
            parentTreeNode={selectedParentTreeNode}
            treeNode={selectedTreeNode}
          />
        </div>
      </Spin>
    )
  }

  renderMainTable = synchronizer(_.identity)(sync => {
    let {taskExtraInfos} = sync
    const { treeList, tagTypes } = this.state.vm
    let dimNameRelatedTaskDict = (taskExtraInfos || []).reduce((dict, task) => {
      let {related_tags, task_id} = task
      if (_.isEmpty(related_tags)) {
        return dict
      }
      return {...dict, ..._.zipObject(related_tags, related_tags.map(() => task_id))}
    }, {})
    return (
      <TagDimensionsTable
        {...this.props}
        treeList={treeList}
        tagTypes={tagTypes}
        dimNameRelatedTaskDict={dimNameRelatedTaskDict}
      />
    )
  })

  //构建详情页面url
  buildUrl = (filters, relation) => {
    let hash = compressUrlQuery(filters)
    return `/console/tag-users?relation=${relation}&tags=${hash}`
  }

  renderTagGroupEdit(tagGroup) {
    const { tagTypes, dimensionList, treeList } = this.state.vm
    const { datasourceCurrent, projectCurrent, delTagGroup, addTagGroup, updateTagGroup, tagGroups } = this.props
    return (
      <TagGroupForm
        dimensions={dimensionList}
        tagGroup={tagGroup}
        tagGroups={tagGroups}
        datasourceCurrent={datasourceCurrent}
        projectCurrent={projectCurrent}
        delTagGroup={delTagGroup}
        addTagGroup={addTagGroup}
        updateTagGroup={updateTagGroup}
        tagTypes={tagTypes}
        buildUrl={this.buildUrl}
        tagTrees={treeList}
        showCreateTagType={false}
        isTagManager
      />
    )
  }

  renderMainContent = withSizeProvider(({spWidth, spHeight, tagProject, tagDatasource}) => {
    const { tagGroups } = this.props
    const { treeData, defaultSelectedKeys, expandedKeys, selectedKeys, defaultExpandedKeys, loading, pageView } = this.state.vm
    // 标签列表管理页面
    if (pageView === PAGE_VIEW.MAIN_TABLE) {
      return this.renderMainTable({
        url: '/app/sugo-schedule-task-extra-infos',
        modelName: 'taskExtraInfos',
        query: {
          where: {
            project_id: tagProject.id
          }
        }
      })
    }
    return (
      <div
        className="contain-docs-analytic bg-white"
        style={{height: 'calc(100% - 44px)'}}
      >
        <HorizontalSplitHelper
          style={{height: spHeight - 44}}
          collapseWidth={125}
        >
          <div
            defaultWeight={TAG_TREE_PANEL_WIDTH}
            ref={node => this.treeContainer = node}
            className="itblock pd2l bg-white height-100 overscroll-y always-display-scrollbar no-active-underline"
          >
            <Spin spinning={loading}>
              <TagTypeTree
                project={tagProject}
                datasource={tagDatasource}
                expandedKeys={expandedKeys}
                selectedKeys={selectedKeys}
                defaultExpandedKeys={defaultExpandedKeys}
                defaultSelectedKeys={defaultSelectedKeys}
                setState={this.store.setState}
                treeData={treeData}
                saveOrder={this.store.saveOrder}
                treeContainer={this.treeContainer}
                onSelect={this.onTreeSelect}
                tagGroups={tagGroups}
              />
            </Spin>
          </div>
          <div
            defaultWeight={spWidth - TAG_TREE_PANEL_WIDTH}
            className="itblock height-100 bg-white overscroll-y relative always-display-scrollbar"
          > 
            {this.renderRightContent(tagProject, tagDatasource)}
          </div>
        </HorizontalSplitHelper>
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
    // 判断项目类型 使用关联tag项目的数据源
    let {projectCurrent, tagProject, tagDatasource} = this.props

    // fix 932，数据应用中心，【用户画像】如果不是标签项目时，宏观画像和微观画像，提示正常，但标签体系、标签体系管理应同步增加提示
    if (AccessDataType.Tag !== projectCurrent.access_type) {
      return this.renderNotOk()
    }

    let hintPage = tagRequirementChecker({projectCurrent: tagProject, datasourceCurrent:tagDatasource, moduleName: '标签体系管理'})
    if (hintPage) {
      return hintPage
    }
    return (
      <div className="height-100 bg-white">
        <Bread
          path={[
            {
              name: tagProject.id !== projectCurrent.id
                ? <HoverHelp placement="right" icon="link" addonBefore="标签体系管理 " content={`已关联标签项目【${tagProject.name}】`} />
                : '标签体系管理'
            }
          ]}
        >
          {this.renderPageType()}
        </Bread>
        {this.renderMainContent({ tagProject, tagDatasource })}
      </div>
    )
  }
}
