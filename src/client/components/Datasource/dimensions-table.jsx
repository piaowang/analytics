import React from 'react'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { Tooltip, Table, Spin, message, Popover, Popconfirm, Button, Select, Menu, Input, Dropdown, notification, Tag } from 'antd'
import Icon from '../Common/sugo-icon'
import _ from 'lodash'
import Link from '../Common/link-nojam'
import DimensionModal from './dimension-modal'
import DimensionTagModal from './dimension-tag-modal'
import { Auth } from '../../common/permission-control'
import AuthRender from './auth-render'
import AuthTitle from './auth-title'
import setStatePromise from '../../common/set-state-promise'
import MultiAuthModal from './multi-auth-modal'
import {
  editDimension,
  deleteDimension,
  syncDimensions,
  authorizeDimension,
  editUserTag,
  deleteUserTag,
  syncUserTag,
  authorizeUserTag,
  getDimensionLayer,
  editDimensionLayer
} from '../../databus/datasource'
import { DIMENSION_TYPES, DimDatasourceType, AccessDataType } from '../../../common/constants'
import OrderModal from './order-modal'
import TagManage, { tagRender } from '../Common/tag-manage'
import Bread from '../Common/bread'
import helpLinkMap from 'common/help-link-map'
import Search from '../Common/search'
import copy from 'common/deep-copy'
import { browserHistory } from 'react-router'
import { getCurrentTagProject } from '../../common/tag-current-project'
import Fetch from 'client/common/fetch-final'
import HiddenDimensionPng from '../../images/hidden-diemension.png'
import { dimensionParamTypes } from '../../../common/dimension-params-type'
import { Anchor } from '../Common/anchor-custom'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/dimension']
const DIMENSION_TYPES_INVERT = _.invert(DIMENSION_TYPES)
const MenuItem = Menu.Item
const { Option } = Select

//编辑类型维度选择
const editDimSelect = {
  all: '全部维度',
  editable: '未应用维度',
  nonEditable: '已应用维度'
}

const dimTips = (
  <div>
    <p>已应用维度：已上报维度且数据已落地，此时只能修改维度别名</p>
    <p>未应用维度：未上报维度或者数据未落地，可任意修改，删除此维度信息</p>
  </div>
)

@setStatePromise
export default class DimensionList extends React.Component {
  state = {
    search: '',
    modalVisible: false,
    orderModalVisible: false,
    dimension: {},
    selectedRowKeys: [],
    loading: false,
    syncLoading: false,
    dimEditData: {},
    selectedTags: [],
    dimEditSelect: 'all',
    onBatchEdit: false,
    selectRole: 'all',
    datasource_type: DimDatasourceType.default,
    tagValue: {},
    expand: []
  }

  componentWillMount() {
    this.initData()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.datasourceCurrent.id !== this.props.datasourceCurrent.id || nextProps.location.query.datasource_type !== this.props.location.query.datasource_type) {
      this.initData(nextProps)
    }
  }

  initData = async (nextProps = this.props) => {
    let { id } = nextProps.datasourceCurrent
    let { datasource_type = DimDatasourceType.default } = nextProps.location.query
    if (!id) {
      return
    }
    this.setState({
      loading: true,
      datasource_type // 更新
    })
    await this.getDimensions(id, datasource_type)
    let data = await getDimensionLayer()
    this.props.setProp('set_dimensionLayer', data)
    await this.getOriginDimensions(id, datasource_type)
    await this.setStatePromise({
      loading: false
    })
  }

  getDimensions = async (id = this.props.datasourceCurrent.id, datasource_type = this.props.location.query.datasource_type || DimDatasourceType.default) => {
    await this.props.getDimensions(id, {
      // 设置了 noauth 的话没有权限的维度也会显示出来，不能加这个参数
      // noauth: 1,
      includeNotUsing: true,
      datasource_type
    })
  }

  getOriginDimensions = async (id = this.props.datasourceCurrent.id, datasource_type) => {
    await this.props.getOriginDimensions(id, {
      // 设置了 noauth 的话没有权限的维度也会显示出来，不能加这个参数
      // noauth: 1,
      noSort: true,
      datasource_type
    })
  }

  submitBatchEdit = async () => {
    let { dimEditData, datasource_type } = this.state
    const isTagManage = datasource_type === DimDatasourceType.tag
    let submitData = Object.keys(dimEditData).reduce((prev, id) => {
      let obj = dimEditData[id]
      if (obj.oldTitle !== obj.title) {
        prev.push(obj)
      }
      return prev
    }, [])
    if (!submitData.length) {
      return this.setState({
        onBatchEdit: false
      })
    }
    this.setState({
      onBatchEditLoading: true
    })
    let { setProp } = this.props
    for (let dim of submitData) {
      let { id } = dim
      let update = {
        title: dim.title
      }

      if (isTagManage) {
        await editUserTag(id, update)
      } else {
        await editDimension(id, update)
      }

      setProp({
        type: 'update_dimensions',
        data: {
          id,
          ...update
        }
      })
    }
    this.setState({
      onBatchEdit: false,
      onBatchEditLoading: false
    })
  }

  onChangeEdit = (e, dim) => {
    let title = e.target.value
    let { id } = dim
    let dimEditData = copy(this.state.dimEditData)
    dimEditData[id].title = title
    this.setState({
      dimEditData
    })
  }

  doBatchEdit = () => {
    let { dimensions } = this.props
    let dimEditData = dimensions.reduce((prev, dim) => {
      let title = dim.title || ''
      prev[dim.id] = {
        id: dim.id,
        title,
        oldTitle: title
      }
      return prev
    }, {})
    this.setState({
      onBatchEdit: true,
      dimEditData
    })
  }

  onChange = e => {
    this.setState({
      selectedRowKeys: [],
      search: e.target.value
    })
  }

  edit = dimension => {
    return () => {
      const { datasource_type } = this.state
      if (datasource_type === DimDatasourceType.tag) {
        this.props.changeUrl({
          action: 'update-tag',
          dimId: dimension.id
        })
        return
      }
      this.setState({
        dimension: _.cloneDeep(dimension),
        modalVisible: 'modalVisible'
      })
    }
  }

  del = dimension => {
    return async () => {
      let { id, name } = this.props.datasourceCurrent
      this.setState({
        loading: true
      })
      let { datasource_type, selectedRowKeys } = this.state
      let { dimensionLayer } = this.props
      const isTagManage = datasource_type === DimDatasourceType.tag
      let res = isTagManage ? await deleteUserTag([dimension.name], id, name, [dimension.title]) : await deleteDimension([dimension.name], id, name, [dimension.title])
      this.setState({
        loading: false
      })
      if (res) {
        //删除维度，要删除维度分层的dimension_id 包含的维度id
        this.setState({ selectedRowKeys: _.without(selectedRowKeys, dimension.id) })
        if (!isTagManage) {
          dimensionLayer.map(async item => {
            if (_.includes(item.dimension_id, dimension.id)) {
              let dimension_id = _.without(item.dimension_id, dimension.id)
              await editDimensionLayer(item.id, { dimension_id })
              this.props.setProp({
                type: 'update_dimensionLayer',
                data: {
                  id: item.id,
                  dimension_id
                }
              })
            }
            return item
          })
        }
        this.props.setProp({
          type: 'del_dimensions',
          data: dimension
        })
        message.success('删除成功', 2)
      }
    }
  }

  hideModal = (e, key = 'modalVisible') => {
    this.setState({
      [key]: false
    })
  }

  /**
   * @description 创建维度
   * @memberOf DimensionList
   */
  onCreate = () => {
    let role = _.find(this.props.roles, {
      type: 'built-in'
    })
    let currentUserRoleIds = window.sugo.user.SugoRoles.map(p => p.id)
    let role_ids = _.uniq([role.id, ...currentUserRoleIds])
    this.setState({
      dimension: {
        name: '',
        title: '',
        type: 2,
        role_ids,
        user_ids: [],
        tags: [],
        params: {},
        datasource_type: 'tag'
      },
      modalVisible: 'modalVisible'
    })
  }

  /**
   * @description 添加标签
   * @memberOf DimensionList
   */
  onCreateTag = () => {
    this.props.changeUrl({
      action: 'create-tag'
    })

    // let role = _.find(this.props.roles, {
    //   type: 'built-in'
    // })
    // let currentUserRoleIds = window.sugo.user.SugoRoles.map(p => p.id)
    // let role_ids = _.uniq(
    //   [role.id, ...currentUserRoleIds]
    // )
    // this.setState({
    //   dimension: {
    //     name: '',
    //     title: '',
    //     type: 2,
    //     role_ids,
    //     user_ids: [],
    //     tags: [],
    //     params: {}
    //   },
    //   modalVisible: true
    // })
  }

  onChangeSelect = selectedRowKeys => {
    this.setState({
      selectedRowKeys
    })
  }

  onOrder = () => {
    this.setState({
      orderModalVisible: true
    })
  }

  hideOrderModal = () => {
    this.setState({
      orderModalVisible: false
    })
  }

  //维度同步
  onSyncDimension = async isTag => {
    let dsId = ''
    let { projectCurrent, projectList } = this.props
    if (isTag) {
      const { tagProject } = getCurrentTagProject(projectList, projectCurrent)
      dsId = tagProject.datasource_id
    } else {
      dsId = projectCurrent.datasource_id
    }
    this.setState({
      syncLoading: true
    })
    let res = isTag ? await syncUserTag(dsId) : await syncDimensions(dsId)
    let addedDims = []
    let updatedDims = []
    if (res && res.result) {
      ;({ addedDims, updatedDims } = res.result)
    }
    this.setState({
      syncLoading: false
    })
    if (addedDims.length || updatedDims.length) {
      this.getDimensions()
    }
    let updatedDimsNames = updatedDims.map(d => d.name)
    notification.success({
      message: <p className='font16'>温馨提示:</p>,
      description: (
        <div className='font11'>
          <p>维度同步完成,总共{addedDims.length + updatedDims.length}个维度同步</p>
          <p>
            其中，新增维度有{addedDims.length}个{addedDims.length ? `,分别为:${addedDims.join(', ')},` : ''}
          </p>
          <p>
            同步修改的维度有{updatedDims.length}个{updatedDims.length ? `,分别为:${updatedDimsNames.join(', ')}.` : ''}
          </p>
        </div>
      ),
      duration: 15
    })
  }

  // afterDeleteTag = (tagId) => {
  //   let {dimensions, setProp} = this.props
  //   let dims = _.cloneDeep(dimensions).map(dim => {
  //     _.remove(dim.tags, tagId)
  //     return dim
  //   })
  //   setProp({
  //     type: 'set_dimension',
  //     data: dims
  //   })
  // }

  updateFilteredTags = selectedTags => {
    this.setState({
      selectedTags
    })
  }

  updateItemTag = async (tagId, action, type) => {
    let { selectedRowKeys, datasource_type } = this.state
    let { dimensions, setProp, dimensionLayer } = this.props
    const isTagManage = datasource_type === DimDatasourceType.tag

    if (type === 'dimension_layer') {
      let dimLayer = _.find(dimensionLayer, { id: tagId })
      if (!dimLayer) return
      let filterLayer = dimensionLayer.filter(item => item.id !== tagId)
      let filter = filterLayer.filter(item => {
        let hasId = item.dimension_id.filter(id => _.includes(selectedRowKeys, id))
        return _.isEmpty(hasId) ? false : true
      })
      if (action === 'add' && !_.isEmpty(filter)) return message.warning('一个维度只能有一个分层')
      let dimension_id = action === 'add' ? _.uniq(dimLayer.dimension_id.concat(selectedRowKeys)) : _.without(dimLayer.dimension_id, ...selectedRowKeys)
      await editDimensionLayer(tagId, { dimension_id })
      setProp({
        type: 'update_dimensionLayer',
        data: {
          id: dimLayer.id,
          dimension_id
        }
      })
    }

    for (let id of selectedRowKeys) {
      let dim = _.find(dimensions, { id })
      if (!dim) continue

      if (type === 'dimension_layer') {
        let tags_layer = action === 'add' ? _.uniq(dim?.tags_layer.concat(tagId)) : _.without(dim?.tags_layer, tagId)

        if (_.isEqual(tags_layer, dim?.tags_layer)) {
          continue
        }
        let res = await editDimension(id, { tags_layer })
        if (!res) continue
        setProp({
          type: 'update_dimensions',
          data: {
            id: dim.id,
            tags_layer
          }
        })
      } else {
        let tags = action === 'add' ? _.uniq(dim.tags.concat(tagId)) : _.without(dim.tags, tagId)
        if (_.isEqual(tags, dim.tags)) {
          continue
        }

        let res = isTagManage ? await editUserTag(id, { tags }) : await editDimension(id, { tags })
        if (!res) continue
        setProp({
          type: 'update_dimensions',
          data: {
            id: dim.id,
            tags
          }
        })
      }
    }
  }

  dimEditSelectChange = value => {
    this.setState({
      dimEditSelect: value
    })
  }

  afterDeleteTag = (tagId, type) => {
    let { dimensions, setProp } = this.props
    let res = dimensions.map(dim => {
      type === 'dimension_layer' ? _.remove(dim?.tags_layer, tagId) : _.remove(dim.tags, tagId)
      return dim
    })
    setProp('dimensions', res)

    //更新seletedtags
    let { selectedTags } = this.state
    this.setState({
      selectedTags: _.without(selectedTags, tagId)
    })
  }

  renderSyncButton = syncLoading => {
    if (this.props.datasourceCurrent.parent_id) return null
    const isTag = this.props.location.query.datasource_type === DimDatasourceType.tag

    return (
      <Auth auth={`post:/app/${isTag ? 'tag-dict' : 'dimension'}/sync/:id`}>
        <Button type='primary' onClick={() => this.onSyncDimension(isTag)} className='iblock mg1l' disabled={syncLoading} loading={syncLoading}>
          {isTag ? '同步标签' : '同步维度'}
        </Button>
      </Auth>
    )
  }

  selectRoleChange = e => {
    this.setState({ selectRole: e })
  }

  renderTitleEdit(dim) {
    let { dimEditData, onBatchEditLoading } = this.state
    let obj = dimEditData[dim.id]
    return <Input value={obj.title} disabled={onBatchEditLoading} onChange={e => this.onChangeEdit(e, dim)} />
  }

  renderCreateButton = () => {
    if (this.props.location.query.datasource_type === DimDatasourceType.tag) {
      return (
        <Auth auth='app/tag-dict/create'>
          <Button type='primary' className='iblock' icon={<PlusOutlined />} onClick={() => this.onCreateTag()}>
            添加标签
          </Button>
        </Auth>
      )
    }
    return (
      <Auth auth='app/dimension/create'>
        <Button type='primary' className='iblock' icon={<PlusOutlined />} onClick={() => this.onCreate()}>
          创建维度
        </Button>
      </Auth>
    )
  }

  renderOtherLink(datasource_type, id) {
    let t = datasource_type === DimDatasourceType.tag ? DimDatasourceType.default : DimDatasourceType.tag
    // let to = `/console/dimension?datasource_type=${t}&id=${id}`
    const to = `/console/tag-system-manager?datasource_type=${t}&id=${id}`
    let txt = t === DimDatasourceType.tag ? '切换到标签体系管理' : '切换到普通维度管理'
    return (
      <Link to={to}>
        <Button type='primary' className='mg1x'>
          {txt}
        </Button>
      </Link>
    )
  }

  renderImportEditBtn() {
    let datasource_type = this.props.location.query.datasource_type || DimDatasourceType.default
    return (
      <Button type='primary' className='mg2l'>
        <a href={`/console/dimension/import?id=${this.props.datasourceCurrent.id}&datasource_type=${datasource_type}`}>文件导入批量修改别名</a>
      </Button>
    )
  }

  renderBatchEditBtn() {
    let { onBatchEdit, onBatchEditLoading } = this.state
    let txt = onBatchEdit ? '提交' : '修改别名'
    let func = onBatchEdit ? this.submitBatchEdit : this.doBatchEdit
    return (
      <Button type='primary' onClick={func} loading={onBatchEditLoading} disabled={onBatchEditLoading}>
        {txt}
      </Button>
    )
  }

  renderBread = () => {
    let { datasource_type, id } = this.props.location.query
    const isTagManage = datasource_type === DimDatasourceType.tag
    if (isTagManage) {
      // 新版本不需要渲染bread（內嵌在标签体系管理页面）
      return null
    }
    let title = isTagManage ? '标签体系管理' : '维度管理'
    let { tag_datasource_name } = this.props.datasourceCurrent
    let otherDimsionLink = isTagManage && !tag_datasource_name ? this.renderOtherLink(datasource_type, id) : null
    let help = (
      <div className='width300'>
        <p>维度管理可以对数据源的维度进行规范管理，例 如，同步维度、批量授权、批量取消授权、维度 打标签、维度标签化管理等功能，还可以灵活自 定义新的数据维度</p>
        <p>
          <Anchor href={helpLink} target='_blank' className='pointer'>
            <Icon type='export' /> 查看帮助文档
          </Anchor>
        </p>
      </div>
    )
    let extra = (
      <Popover content={help} trigger='hover' placement='bottomLeft'>
        <Anchor href={helpLink} target='_blank' className='color-grey pointer'>
          <Icon type='question-circle' />
        </Anchor>
      </Popover>
    )
    // 农商行标识
    const isdrcBank = _.get(window.sugo, 'enableDataChecking', false)

    return (
      <Bread path={[{ name: title }]} extra={extra}>
        <span>
          {otherDimsionLink}
          <Auth auth={isTagManage ? 'put:/app/tag-dict/update/:id' : 'put:/app/dimension/update/:id'}>{this.renderBatchEditBtn()}</Auth>
          {!isdrcBank && <Auth auth={isTagManage ? 'put:/app/tag-dict/update/:id' : 'put:/app/dimension/update/:id'}>{this.renderImportEditBtn()}</Auth>}
        </span>
      </Bread>
    )
  }

  renderModal = () => {
    let { modalVisible, dimension } = this.state
    let {
      datasourceCurrent,
      setProp,
      roles,
      tags,
      dimensions,
      projectCurrent,
      location: {
        query: { datasource_type = DimDatasourceType.default }
      }
    } = this.props
    let isUindex = datasource_type === DimDatasourceType.tag
    let ModalDom = isUindex ? DimensionTagModal : DimensionModal
    return modalVisible === 'modalVisible' ? (
      <ModalDom
        hideModal={this.hideModal}
        datasource_type={datasource_type}
        modalVisible={modalVisible}
        datasource={datasourceCurrent}
        project={projectCurrent}
        setProp={setProp}
        roles={roles}
        dimension={dimension}
        dimensions={dimensions}
        tags={tags}
        isInstitution={dimensions.some(i => i.params.isInstitution)}
      />
    ) : null
  }

  handleExpand = async record => {
    let { expand } = this.state
    let expandKeys = _.cloneDeep(expand)
    if (expandKeys.includes(record.id)) {
      expandKeys = expandKeys.filter(i => i !== record.id)
    } else {
      expandKeys.push(record.id)
    }
    this.setState({ expand: expandKeys })
  }

  renderContent() {
    let {
      dimensions,
      originDimensions,
      roles,
      tags,
      tagsLayer,
      loading: propsLoading,
      setProp,
      datasourceCurrent,
      dimNameRelatedTaskDict,
      projectCurrent,
      projectList,
      datasourceList,
      treeList = [],
      tagTypes = []
    } = this.props
    let {
      search,
      loading,
      selectedRowKeys,
      selectedTags,
      orderModalVisible,
      syncLoading,
      dimEditSelect,
      selectRole,
      onBatchEdit,
      datasource_type,
      expand,
      currentType
    } = this.state
    const { showTagSync = '' } = this.props.location.query
    const treeLIstMap = _.keyBy(treeList, p => p.id)
    const tagTypesMap = _.keyBy(tagTypes, p => p.dimension_id)
    const { tagDatasource } = getCurrentTagProject(projectList, projectCurrent, datasourceList, datasourceCurrent)
    // let {datasource_type = DimDatasourceType.default} = this.props.location.query
    // console.log()
    // originDimensions = originDimensions.filter(d => d.datasource_type === datasource_type)

    dimensions = search
      ? dimensions.filter(m => {
          return (m.title + ' ' + m.name).toLowerCase().includes(search.trim().toLowerCase())
        })
      : dimensions
    if (selectRole !== 'all') {
      dimensions = dimensions.filter(p => _.find(p.role_ids, val => val === selectRole))
    }
    if (selectedTags.length) {
      dimensions = dimensions.filter(dim => {
        let con = this.state.currentType === 'dimension_layer' ? dim?.tags_layer.concat(selectedTags) : dim?.tags.concat(selectedTags)
        let uniq = _.uniq(con)
        return con.length !== uniq.length
      })
    }
    if ('all' !== dimEditSelect) {
      dimensions = dimensions.filter(dim => {
        if ('editable' === dimEditSelect) {
          return !dim.is_druid_dimension
        } else if ('nonEditable' === dimEditSelect) {
          return dim.is_druid_dimension
        }
      })
    }

    const pagination = {
      showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
      total: dimensions.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    let tagProps = {
      projectId: datasourceCurrent.id || '',
      type: 'dimension',
      currentType: currentType === 'dimension' ? true : false,
      afterDeleteTag: this.afterDeleteTag,
      mode: selectedRowKeys.length ? 'change' : 'filter',
      filterTagIds: selectedTags,
      items: dimensions.filter(dim => selectedRowKeys.includes(dim.id)),
      updateFilteredTags: this.updateFilteredTags,
      updateItemTag: this.updateItemTag,
      setProp,
      tags,
      permissionUrl: 'app/dimension/update',
      setSelect: type => {
        this.setState({
          selectedTags: [],
          currentType: type
        })
      }
    }

    let tagProps_layer = {
      projectId: datasourceCurrent.id || '',
      type: 'dimension_layer',
      currentType: currentType === 'dimension_layer' ? true : false,
      afterDeleteTag: this.afterDeleteTag,
      mode: selectedRowKeys.length ? 'change' : 'filter',
      filterTagIds: selectedTags,
      items: dimensions.filter(dim => selectedRowKeys.includes(dim.id)),
      updateFilteredTags: this.updateFilteredTags,
      updateItemTag: this.updateItemTag,
      setProp,
      tags: tagsLayer,
      permissionUrl: 'app/dimension/update',
      setSelect: type => {
        this.setState({
          selectedTags: [],
          currentType: type
        })
      }
    }

    const isTagManage = datasource_type === DimDatasourceType.tag
    let columns = [
      isTagManage
        ? {
            title: '上级分类',
            dataIndex: 'parent',
            key: 'parent',
            sorter: (a, b) => (a.parent > b.parent ? 1 : -1),
            render: (text, obj) => {
              const parent = _.get(tagTypesMap, obj.id)
              if (!parent) return '未分类'
              return _.get(treeLIstMap, [parent.tag_tree_id, 'name'], '未分类')
            }
          }
        : null,
      {
        title: isTagManage ? '标签名称（英文名）' : '维度',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => (a.name > b.name ? 1 : -1),
        render: (text, dbDim) => {
          return (
            <div className='mw200 elli'>
              <Tooltip placement='topLeft' title={text}>
                <Auth auth={isTagManage ? 'put:/app/tag-dict/update/:id' : 'put:/app/dimension/update/:id'} alt={<span className='bold'>{text}</span>}>
                  <span className='pointer bold' onClick={this.edit(dbDim)}>
                    {text}
                  </span>
                  {dbDim.params.isInstitution ? <Tag className='mg2l'>机构维度</Tag> : null}
                </Auth>
              </Tooltip>
            </div>
          )
        }
      },
      {
        title: isTagManage ? '标签名称（中文名）' : '别名',
        dataIndex: 'title',
        key: 'title',
        sorter: (a, b) => (a.title > b.title ? 1 : -1),
        render: (text, obj) => {
          if (onBatchEdit) {
            return this.renderTitleEdit(obj)
          }
          return text ? (
            <Tooltip placement='topLeft' title={text}>
              <div className='mw300 elli'>{text}</div>
            </Tooltip>
          ) : null
        }
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        sorter: (a, b) => a.type - b.type,
        render(text) {
          return (DIMENSION_TYPES_INVERT[text] || '').replace('Array', ' 多值列')
        }
      },
      {
        title: '创建方式',
        dataIndex: 'params.type',
        key: 'params.type',
        sorter: (a, b) => a.params.type - b.params.type,
        render(text) {
          return _.get(dimensionParamTypes, `${text}.name`, '普通维度')
        }
      },
      {
        title: <AuthTitle title='维度' />,
        key: 'auth',
        render: (text, record) => {
          return <AuthRender record={record} roles={roles} />
        }
      },
      isTagManage
        ? null
        : {
            title: '分组',
            dataIndex: 'tags',
            key: 'tags',
            render: tagRender(tags)
          },
      isTagManage
        ? null
        : {
            title: '分层',
            dataIndex: 'tags_layer',
            key: 'tags_layer',
            render: tagRender(tagsLayer)
          },
      {
        title: <div className='aligncenter'>操作</div>,
        key: 'op',
        width: '80px',
        render: (text, dbDim) => {
          return (
            <div className='aligncenter'>
              {isTagManage && dimNameRelatedTaskDict && dbDim.name in dimNameRelatedTaskDict && (
                <Auth auth='/console/task-schedule-manager'>
                  <Tooltip title='跳转到关联的调度任务'>
                    <Icon
                      type='clock-circle-o'
                      className='mg2r font14 color-grey pointer hover-color-red'
                      onClick={() => {
                        browserHistory.push(`/console/task-schedule-manager/${dimNameRelatedTaskDict[dbDim.name]}`)
                      }}
                    />
                  </Tooltip>
                </Auth>
              )}
              <Auth auth={`put:/app/${isTagManage ? 'tag-dict' : 'dimension'}/update/:id`}>
                <Tooltip title='编辑'>
                  <Icon type='sugo-edit' className='color-grey font14 pointer hover-color-main' onClick={this.edit(dbDim)} />
                </Tooltip>
              </Auth>
              <Auth auth={isTagManage ? 'post:/app/tag-dict/delete' : 'post:/app/dimension/delete'}>
                <Popconfirm title={`确定删除维度 "${dbDim.name}" 么？`} placement='topLeft' onConfirm={this.del(dbDim)}>
                  <Tooltip title='删除'>
                    <Icon type='sugo-trash' className='mg2l font14 color-grey pointer hover-color-red' />
                  </Tooltip>
                </Popconfirm>
              </Auth>
            </div>
          )
        }
      },
      isTagManage
        ? {
            title: (
              <div style={{ width: '80px' }} className='aligncenter'>
                标签详情
              </div>
            ),
            dataIndex: 'info',
            key: 'info',
            width: '80px',
            render: (t, r) => {
              return (
                <div sytle={{ width: '80px' }} className='aligncenter'>
                  <a className='pointer' onClick={() => this.handleExpand(r)}>
                    查看
                  </a>
                </div>
              )
            }
          }
        : null
    ].filter(_.identity)
    const rowSelection = {
      selectedRowKeys,
      onChange: this.onChangeSelect
    }

    let authMenu = (
      <Menu
        onClick={e => {
          if (e.key === 'add') {
            this.authModal.auth()
          } else if (e.key === 'cancel') {
            this.authModal.deAuth()
          } else if (e.key === 'addAll') {
            this.authModal.authAll()
          } else if (e.key === 'cancelAll') {
            this.authModal.deAuthAll()
          }
        }}
      >
        <MenuItem key='add' disabled={!selectedRowKeys.length}>
          批量授权所选维度
        </MenuItem>
        <MenuItem key='cancel' disabled={!selectedRowKeys.length}>
          批量取消授权所选维度
        </MenuItem>
        <Menu.Item key='addAll'>全部授权</Menu.Item>
        <Menu.Item key='cancelAll'>全部取消授权</Menu.Item>
      </Menu>
    )

    let isTag = datasource_type === DimDatasourceType.tag
    return (
      <Spin spinning={propsLoading || loading}>
        {this.renderModal()}
        {orderModalVisible ? (
          <OrderModal
            modalVisible={orderModalVisible}
            datasource={datasourceCurrent}
            data={originDimensions}
            hideModal={this.hideOrderModal}
            type='dimension'
            submitCallback={this.getDimensions}
          />
        ) : null}
        <MultiAuthModal
          ref={ref => (this.authModal = ref)}
          data={this.props.dimensions}
          keys={selectedRowKeys}
          updater={isTag ? authorizeUserTag : authorizeDimension}
          roles={roles}
          setProp={setProp}
          datasource={tagDatasource}
          type='dimension'
        />
        <div className='datasources-lists pd2y pd3x dimension-table'>
          <div className='pd2b'>
            <div className='fix'>
              <div className='fleft'>
                <Select value={dimEditSelect} className='width140 iblock' dropdownMatchSelectWidth={false} onChange={this.dimEditSelectChange}>
                  {Object.keys(editDimSelect).map(key => {
                    return (
                      <Option value={key} key={key}>
                        {editDimSelect[key]}
                      </Option>
                    )
                  })}
                </Select>
                <Popover placement='right' content={dimTips}>
                  <Icon className='mg1l mg2r' type='question-circle-o' />
                </Popover>
                <Auth auth={`post:/app/${isTag ? 'tag-dict' : 'dimension'}/order-management`}>
                  <Tooltip title='设置维度排序和隐藏'>
                    <Button type='ghost' icon={<SettingOutlined />} onClick={this.onOrder} className='iblock'>
                      排序和隐藏
                    </Button>
                  </Tooltip>
                </Auth>
                <Select value={selectRole} dropdownMatchSelectWidth={false} onChange={this.selectRoleChange} className='mg1l width140 iblock'>
                  <Option value='all' key='all'>
                    全部角色
                  </Option>
                  {roles.map(groups => {
                    let { id, name } = groups
                    return (
                      <Option value={id} key={id}>
                        {name}
                      </Option>
                    )
                  })}
                </Select>
                <div className='width180 iblock mg1l'>
                  <Search onChange={this.onChange} value={search} placeholder='搜索' className='iblock' />
                </div>
              </div>

              <div className='fright'>
                {this.renderCreateButton()}

                {!isTagManage || showTagSync ? this.renderSyncButton(syncLoading) : null}

                <Auth auth={`put:/app/${isTag ? 'tag-dict' : 'dimension'}/authorize`}>
                  <Dropdown overlay={authMenu} trigger={['click']}>
                    <Button type='ghost' className='iblock mg1l'>
                      授权
                      <Icon type='down' />
                    </Button>
                  </Dropdown>
                </Auth>
                {!isTagManage ? (
                  <Auth auth='post:/app/dimension/tags-management'>
                    <TagManage {...tagProps} className='iblock mg1l' />
                  </Auth>
                ) : null}
                {!isTagManage ? (
                  <Auth auth='post:/app/dimension/tags-management'>
                    <TagManage {...tagProps_layer} layer={'layer'} className='iblock mg1l' />
                  </Auth>
                ) : null}
              </div>
            </div>
          </div>
          <Table
            columns={columns}
            rowKey={rec => rec.id}
            rowSelection={rowSelection}
            pagination={pagination}
            dataSource={dimensions}
            expandedRowKeys={expand}
            expandedRowRender={isTagManage ? this.expandedRowRender : null}
            onChange={this.handleChange}
            className='table'
            expandIconAsCell={false} // 去除表格标题栏+号
            expandIconColumnIndex={-1} // 去除表格body里的+号
          />
        </div>
      </Spin>
    )
  }

  getDimensionTagInfo = async data => {
    const { projectCurrent } = this.props
    let { tagValue } = this.state
    tagValue = _.cloneDeep(tagValue)
    let dimensionTagInfo = await Fetch.get('/app/tag-dict/get-tag-info', {
      name: data.name,
      project_id: projectCurrent.id
    })
    let infos = _.get(dimensionTagInfo, 'result') || []
    let tag_value = infos.reduce((prev, v) => {
      return prev + v.title + '=' + v.tag_value + '\n'
    }, '')
    _.set(tagValue, data.name, tag_value)
    return this.setState({ tagValue })
  }

  expandedRowRender = data => {
    const { tagValue } = this.state
    const val = _.get(tagValue, data.name, null)
    if (val === null) {
      this.getDimensionTagInfo(data)
    }
    let life_cycle = _.get(data, 'tag_extra.life_cycle', '长期有效')
    life_cycle = !_.isArray(life_cycle) ? '长期有效' : life_cycle.join(' ~ ')

    return (
      <div>
        <div className='mg1b font16'>
          <div className='width150 alignright bold'>"{data.title || data.name}"标签详情：</div>
        </div>
        <div className='mg1b elli'>
          <div className='width150 alignright iblock'>定义口径：</div>
          <div className='iblock'>{_.get(data, 'tag_desc', '') || '暂无'}</div>
        </div>
        <div className='mg1b elli'>
          <div className='width150 alignright iblock'> 数据来源：</div>
          <div className='iblock'>{_.get(data, 'tag_extra.data_from', '') || '暂无'}</div>
        </div>
        <div className='mg1b elli'>
          <div className='width150 alignright iblock'>清洗规则：</div>
          <div className='iblock'>{_.get(data, 'tag_extra.cleaning_rule', '') || '暂无'}</div>
        </div>
        <div className='mg1b elli'>
          <div className='width150 alignright iblock'> 生效时间：</div>
          <div className='iblock'>{life_cycle}</div>
        </div>
        <div className='mg1b elli'>
          <div className='width150 alignright iblock'>备注：</div>
          <div className='iblock'>{_.get(data, 'params.description', '') || '暂无'}</div>
        </div>
        <div className='mg1b elli'>
          <div className='width150 alignright itblock'>子标签定义：</div>
          <div className='iblock'>{val ? <Input.TextArea rows={4} className='width250' value={val} placeholder='标签说明' /> : null}</div>
        </div>
      </div>
    )
  }

  notok() {
    return (
      <div className='relative' style={{ height: 'calc(100vh - 200px)' }}>
        <div className='center-of-relative aligncenter'>
          <p>
            <img style={{ width: 80 }} src={HiddenDimensionPng} alt='' className='iblock' />
            <sapn className='font16 bold'>标签项目无维度管理</sapn>
          </p>
        </div>
      </div>
    )
  }

  render() {
    let { projectCurrent } = this.props
    let { datasource_type } = this.state
    const isTag = projectCurrent.access_type === AccessDataType.Tag && datasource_type !== DimDatasourceType.tag
    return (
      <div className='height-100 bg-white'>
        {this.renderBread()}
        <div className='scroll-content' style={{ height: 'calc(100% - 44px)' }}>
          {isTag ? this.notok() : this.renderContent()}
        </div>
      </div>
    )
  }
}
