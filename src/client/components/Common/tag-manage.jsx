import React from 'react'
import PropTypes from 'prop-types'

import {
  CheckOutlined,
  CloseCircleOutlined,
  DownOutlined,
  EditOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
  TagOutlined,
} from '@ant-design/icons';

import {
  Input,
  Button,
  Modal,
  Popconfirm,
  message,
  Spin,
  Popover,
  Tooltip,
  Tag,
  Radio,
} from 'antd';
import _ from 'lodash'
import {editTag, deleteTag, addTag, getTags, getDimensionLayer
} from '../../databus/datasource'
import classNames from 'classnames'
import {Auth, checkPermission} from '../../common/permission-control'
import {DataApiClientsManagerNameSpace} from '../DataAPI/clients-manager'
import {bindActionCreators} from 'redux'
import {setProp} from '../../actions'
import {connect} from 'react-redux'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const testTag = tag => {
  // return /^[^\s]{1,32}$/.test(tag)
  return /^[\u4e00-\u9fa5_a-zA-Z0-9]{1,32}$/.test(tag);
}
const modes = ['filter', 'change']
const tagTypeMap = {
  dimension: '维度',
  dimension_layer: '维度',
  measure: '指标',
  track_event: '可视化事件信息',
  slices: '单图',
  portals: '门户'
}

const mapStateToProps = (state, ownProps) => {
  return {
    tags: ownProps?.tags || _.get(state, 'common.tags', []),
  }
}

const mapDispatchToProps = dispatch => bindActionCreators({setProp}, dispatch)


@connect(mapStateToProps, mapDispatchToProps)
export default class TagManage extends React.Component {

  static propTypes = {
    // all 表示不限项目
    projectId: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,

    // tagId => ...
    afterDeleteTag: PropTypes.func,

    tags: PropTypes.array,
    className: PropTypes.string,
    mode: PropTypes.oneOf(modes),

    //同antd Popover palcement
    placement: PropTypes.string,

    //过滤的分组id
    filterTagIds: PropTypes.array,

    //选中的条目, 比如维度列表，格式 [{id: 'tt', tags: ['a']}, {id: 'xx', tags: ['a', 'b']}]
    items: PropTypes.array,

    // (newFilteredTagIds) => ...
    updateFilteredTags: PropTypes.func.isRequired,

    // (tagId, action) => ...
    // action === oneOf(['add', 'remove'])
    updateItemTag: PropTypes.func.isRequired,
    permissionUrl: PropTypes.string.isRequired
  }

  static defaultProps = {
    afterDeleteTag: _.noop,
    className: 'tags-btn-wrap iblock',
    mode: 'filter',
    filterTagIds: [],
    items: [],
    tags: [],
    placement: 'bottomRight',
    setSelect: _.noop
  }

  constructor(props) {
    super(props)
    this.state = {
      newTagName: '',
      loading: {
        '@all': false,
        '@new': false
      },
      visible: false,
      popVisible: false,
      onEditTagId: '',
      mode: this.props.mode
    }
  }

  componentWillMount() {
    if (this.props.projectId) this.getTags()
  }

  componentDidMount() {
    this.dom1 = document.getElementById('container')
  }

  componentWillReceiveProps(nextProps) {
    const {mode} = nextProps
    const oldMode = this.state.mode
    if (mode !== oldMode) {
      this.setState({
        mode
      })
    }
    if (
      nextProps.projectId !== this.props.projectId
    ) {
      this.getTags(nextProps.projectId)
    }
  }

  componentWillUnmount() {
    this.dom1.removeEventListener('click', this.onClickHidePopover)
  }

  onClickHidePopover = e => {
    if (e.target.type && e.target.type === 'checkbox') {
      return
    }
    this.setState({
      popVisible: false
    })
    this.dom1.removeEventListener('click', this.onClickHidePopover)
  }

  loading = (tagId = '@all', value = true)=> {
    let loading = _.cloneDeep(this.state.loading)
    loading[tagId] = value
    this.setState({loading})
  }

  getTags = async (projectId = this.props.projectId) => {
    let {type, setProp} = this.props
    this.loading()
    let res = await getTags(projectId, {type})
    this.loading('@all', false)
    if (!res) return
    if (type === 'dimension_layer'){
      return setProp({
        type: 'set_tagsLayer',
        data: res.data.map(t => {
          t.tempName = t.name
          return t
        })
      })
    } 

    setProp({
      type: 'set_tags',
      data: res.data.map(t => {
        t.tempName = t.name
        return t
      })
    })
    
  }

  hide = () => {
    this.setState({
      visible: false
    })
  }

  show = () => {
    this.setState({
      visible: true
    })
  }

  onChange = (e, updater) => {
    let newTagName = e.target.value
    let { type } = this.props
    updater(newTagName)
  }

  updateNewTag = (newTagName) => {
    this.setState({
      newTagName: newTagName.slice(0, 32)
    })
  }

  updateEditTag = (id) => {
    let { type } =this.props
    if (type === 'dimension_layer') {
      return tempName => {
        this.props.setProp('update_tagsLayer', {
          id,
          tempName
        })
      }
    }
    return tempName => {
      this.props.setProp('update_tags', {
        id,
        tempName
      })
    }
  }

  validateTagName = (name) => {
    let res = true
    let {type} = this.props
    let nameLayer = type ==='dimension_layer' ? '分层' : '分组'
    if (!testTag(name)) {
      message.error(`${nameLayer}只能是数字、字母和中文组成，不能包含特殊符号和空格，不超过32个字符`)
      return false
    }
    if (_.find(this.state.tags, {name})) {
      res = false
      message.error(`不能与现有${nameLayer}重名`)
    }
    return res
  }
  
  onCreate = async () => {
    let {newTagName} = this.state
    let {projectId, type, setProp} = this.props
    if (!this.validateTagName(newTagName)) return
    let params = {
      name: newTagName,
      projectId,
      type
    }
    this.loading('@new')
    let res = await addTag(projectId, params)
    this.loading('@new', false)
    if (!res) return
    this.setState({
      newTagName: ''
    })
    message.success('添加成功', 8)
    let tag = res.result
    tag.tempName = tag.name
    if (type === 'dimension_layer') {
      let dimLayer = await getDimensionLayer()
      setProp({
        type: 'set_dimensionLayer',
        data: dimLayer
      })
      return setProp('add_tagsLayer', tag)
    }
    setProp('add_tags', tag)
    
  }

  //更改分组名
  async saveNewTagName(id) {
    let {type, projectId, setProp, tags} = this.props
    let {tempName, name} = _.find(tags, {id})

    //判断是否有更改过名字
    if(tempName === name) {
      return this.setState({
        onEditTagId: ''
      })
    }

    if (!this.validateTagName(tempName)) return
    this.loading(id)
    let res = await editTag(id, {
      name: tempName,
      projectId,
      type
    })
    this.loading(id, false)
    if (!res) return
    message.success('修改成功', 8)
    if (type === 'dimension_layer') {
      setProp('update_tagsLayer', {
        id,
        name: tempName
      })
    }else{
      setProp('update_tags', {
        id,
        name: tempName
      })
    }
    
    this.setState({
      onEditTagId: ''
    })

  }

  async deleteTag(id) {
    let {afterDeleteTag, setProp, type} = this.props
    this.loading(id)
    let res = await deleteTag(id, {type})
    this.loading(id, false)
    if (!res) return
    message.success('删除成功', 8)
    if (type === 'dimension_layer') {
      setProp('del_tagsLayer', {
        id
      })
    }else{
      setProp('del_tags', {
        id
      })
    }
    afterDeleteTag(id, type)
  }

  cancelEdit = id => {
    let {setProp, tags, type} = this.props
    let tag = _.find(tags, {id})
    if (type === 'dimension_layer') {
      setProp('update_tagsLayer', {
        id,
        tempName: tag.name
      })
    }else{
      setProp('update_tags', {
        id,
        tempName: tag.name
      })
    }
    
    this.setState({
      onEditTagId: ''
    })
  }

  onEdit = onEditTagId => {
    this.setState({
      onEditTagId
    })
  }

  renderEditTag = tag => {
    let {tempName, id} = tag
    return (
      <span className="fleft">
        <Input
          value={tempName}
          className="iblock mg1r width100"
          onChange={e => this.onChange(e, this.updateEditTag(id))}
        />
        <Button
          type="primary"
          className="iblock mg1r"
          onClick={() => this.saveNewTagName(id)}
        >
        提交
        </Button>
        <Button
          type="ghost"
          className="iblock mg1r"
          onClick={() => this.cancelEdit(id)}
        >
        取消
        </Button>
      </span>
    )
  }

  renderTags = () => {
    let { onEditTagId, loading } = this.state
    let {type, tags} = this.props
    let nameLayer = type ==='dimension_layer' ? '分层' : '分组'
    let typeName = tagTypeMap[type]
    if (!tags.length) {
      return (
        <div className="pd2y aligncenter">
          还没有{nameLayer}，新建一个吧。
        </div>
      )
    }

    return (
      <div className="tag-list">
        {
          tags.map((tag, index) => {
            let {name, id} = tag
            let isEditting = onEditTagId === id
            let iconCls = classNames(
              onEditTagId ? 'hide' : '',
              'pointer mg2x font16 color-grey'
            )
            let cls = classNames(
              'tag-unit fix',
              index % 2 ? 'odd' : 'even'
            ) 
            return (
              <Spin spinning={!!loading[id]} key={id + '@ti'}>
                <div className={cls}>
                  {
                    isEditting
                      ? this.renderEditTag(tag)
                      : <span className="fleft"><b className="width-70 pd2x elli">{name}</b></span>
                  }
                  <span className="fright">
                    <Tooltip
                      title={`编辑${nameLayer}`}
                    >
                      <EditOutlined className={iconCls} onClick={() => this.onEdit(id)} />
                    </Tooltip>
                    <Popconfirm
                      title={`确定删除${nameLayer}"${name}" 么？这将删除所有${typeName}的这个${nameLayer}`}
                      placement="topLeft"
                      onConfirm={() => this.deleteTag(id)}
                    >
                      <Tooltip
                        title={`删除${nameLayer}`}
                      >
                        <CloseCircleOutlined className={iconCls} />
                      </Tooltip>
                    </Popconfirm>
                  </span>
                </div>
              </Spin>
            );
          })
        }
      </div>
    );
  }

  renderTagList = () => {
    let { loading } = this.state
    return (
      <Spin spinning={loading['@all']}>
        {this.renderTags()}
      </Spin>
    )
  }

  togglePopVisible = () => {
    let {popVisible} = this.state
    if (!popVisible) {
      this.dom1.addEventListener('click', this.onClickHidePopover)
    }
    this.setState({
      popVisible: !popVisible
    })
  }

  goTagManage = () => {
    this.setState({
      visible: true,
      popVisible: false
    })
  }

  renderPopTitle = () => {
    let {permissionUrl, type} = this.props
    let name = type ==='dimension_layer' ? '分层' : '分组'
    return (
      <div className="fix tag-pop-title">
        <span className="fleft bold">
          {name}
        </span>
        <span className="fright">
          <Auth auth={permissionUrl}>
            <Button
              onClick={this.goTagManage}
              size="small"
            >
              <TagOutlined /> {name}管理
            </Button>
          </Auth>
          <Tooltip title={`关闭${name}面板`}>
            <span style={{padding:'5px',cursor: 'pointer'}} onClick={this.togglePopVisible}>
              <CloseCircleOutlined className="mg2l pointer"/>
            </span>
          </Tooltip>
        </span>
      </div>
    );
  }

  renderModeHelp = mode => {
    const {type} = this.props
    const typeName = tagTypeMap[type]
    let name = type ==='dimension_layer' ? '分层' : '分组'
    if (mode === 'filter') {
      return (
        <Tooltip title={`点击${name}来过滤${typeName}`}>
          <span className="bold">
            {name}过滤
            <QuestionCircleOutlined className="mg1l" />
          </span>
        </Tooltip>
      );
    } else if (mode === 'change') {
      let tip = <span>点击{name}给<b>选中的{typeName}</b>添加或者移除该{name}</span>
      return (
        <Tooltip title={tip}>
          <span className="bold">
            批量添加/移除{name}
            <QuestionCircleOutlined className="mg1l" />
          </span>
        </Tooltip>
      );
    }
  }

  toggleFilter = tag => {
    let { filterTagIds = [], updateFilteredTags, type } = this.props
    let {id} = tag
    let inFilter = filterTagIds.includes(id)
    let newTags = inFilter
      ? _.without(filterTagIds, id)
      : filterTagIds.concat(id)

    updateFilteredTags(newTags, type)
  }

  toggleTag = tag => {
    let {updateItemTag, items, type } = this.props
    let {id} = tag
    let inAllItem = this.checkInAllItem(id, items)
    let action = inAllItem ? 'remove' : 'add'
    updateItemTag(id, action, type)
  }

  checkInAllItem = (id, items) => {
    let {type} = this.props
    if (type ==='dimension_layer') return items.filter(item => (item?.tags_layer || []).includes(id)).length === items.length
    return items.filter(item => (item?.tags || []).includes(id)).length === items.length
  }

  renderTagFilter = (tag) => {
    let {mode} = this.state
    let {filterTagIds = [], items, type} = this.props
    let nameLayer = type ==='dimension_layer' ? '分层' : '分组'
    let {id, name} = tag
    let typeName = tagTypeMap[type]
    if (mode === 'filter') {
      let inFilter = filterTagIds.includes(id)
      let flag = inFilter
        ? <CheckOutlined className="color-green" />
        : null
      let title = inFilter
        ? `点击移除这个${nameLayer}过滤条件`
        : `点击添加这个${nameLayer}过滤条件`
      return (
        <div
          key={id}
          title={title}
          className="tag-filter-single"
          onClick={() => this.toggleFilter(tag)}
        >
          <span className="tag-flag-wrap iblock">
            {flag}
          </span>
          <span className="tag-flag-txt iblock pd1x">{name}</span>
        </div>
      )
    } else if (mode === 'change') {
      let inAllItem = this.checkInAllItem(id, items)
      let flag = inAllItem
        ? <CheckOutlined className="color-grey" />
        : null
      let title = inAllItem
        ? `点击从选中${typeName}中批量移除${nameLayer}`
        : `点击给选中${typeName}中批量添加${nameLayer}`
      return (
        <div
          title={title}
          key={id}
          className="tag-filter-single"
          onClick={() => this.toggleTag(tag)}
        >
          <span className="tag-flag-wrap iblock">
            {flag}
          </span>
          <span className="tag-flag-txt iblock pd1x">{name}</span>
        </div>
      )
    }
  }

  removeAllFilter = () => {
    let { type } = this.props
    this.props.updateFilteredTags([], type)
  }

  renderRemoveAllFilter = () => {
    let {filterTagIds, type} = this.props
    let nameLayer = type ==='dimension_layer' ? '分层' : '分组'

    let {mode} = this.state
    if (!filterTagIds.length || mode !== 'filter') {
      return
    }
    return (
      <div className="pd2y">
        <span
          className="pointer"
          onClick={this.removeAllFilter}
        >
          <CloseCircleOutlined className="mg1r" />
          移除所有{nameLayer}过滤
        </span>
      </div>
    );
  }

  renderPopTagList = () => {
    let {tags, permissionUrl, items, type} = this.props
    let {mode} = this.state
    let nameLayer = type ==='dimension_layer' ? '分层' : '分组'
    let typeName = tagTypeMap[type] || type
    if (mode === 'change' && !checkPermission(permissionUrl)) {
      return (
        <div className="pd2y aligncenter">
          您没有权限操作<b>{typeName}</b>的{nameLayer}
        </div>
      )
    }
    if (mode === 'change' && !items.length) {
      return (
        <div className="pd2y aligncenter">
          请先选择<b>{typeName}</b>
        </div>
      )
    }

    if (!tags.length) {
      return (
        <div className="pd2y aligncenter">
          还没有{nameLayer}，新建一个吧。
          <Auth auth={permissionUrl}>
            <Button
              type="primary"
              icon={<PlusCircleOutlined />}
              className="ml1l"
              onClick={this.goTagManage}
            >新建{nameLayer}</Button>
          </Auth>
        </div>
      );
    }

    return (
      <div className="tag-list">
        {this.renderRemoveAllFilter()}
        {tags.map(this.renderTagFilter)}
      </div>
    )
  }

  onChangeMode = e => {
    this.setState({
      mode: e.target.value
    })
  }

  renderPopContent = () => {
    const {mode, loading} = this.state
    return (
      <div className="tag-filter-wrap">
        <div className="pd1">
          <RadioGroup
            value={mode}
            onChange={this.onChangeMode}
          >
            {
              modes.map(m => {
                return (
                  <RadioButton value={m} key={m}>
                    {this.renderModeHelp(m)}
                  </RadioButton>
                )
              })
            }
          </RadioGroup>
        </div>
        <Spin spinning={loading['@all']}>
          {this.renderPopTagList()}
        </Spin>
      </div>
    )
  }

  render () {
    let {newTagName, visible, popVisible} = this.state
    let {className, placement, filterTagIds, setSelect, type, currentType} = this.props
    let nameLayer = type === 'dimension_layer' ? '分层' : '分组'
    let len = filterTagIds.length
    let title = len
      ? `${len}个${nameLayer}过滤条件`
      : ''
    let txt = len && currentType
      ? `${nameLayer}(${len})`
      : nameLayer
    return (
      <div className={className}>
        <Popover
          title={this.renderPopTitle()}
          content={this.renderPopContent()}
          overlayClassName="tag-overlay"
          visible={popVisible}
          placement={placement}
        >
          <Button
            type="ghost"
            onClick={()=>{
              this.togglePopVisible()
              setSelect(type)
            }}
            title={title}
          >
            {txt}
            <DownOutlined className="font12" />
          </Button>
        </Popover>
        <Modal
          title={`${nameLayer}管理`}
          visible={visible}
          width={600}
          onCancel={this.hide}
          className="tag-modal"
          footer={null}
        >
          <div className="tag-create pd2b">
            <Input
              className="width200"
              value={newTagName}
              placeholder={`请输入${nameLayer}名称`}
              onChange={e => this.onChange(e, this.updateNewTag)}
            />
            <Button
              className="mg1l"
              onClick={this.onCreate}
              disabled={!newTagName}
              type="primary"
            >
            新增{nameLayer}
            </Button>
          </div>
          {this.renderTagList()}
        </Modal>
      </div>
    );
  }

}

export function tagRender(tags) {
  return tagIds => {
    return (tagIds || []).map((id, i) => {
      let tag = _.find(tags, {id})
      return tag
        ? <Tag color="#479cdf" key={i + ''} className="mg1r mg1b">
          {tag.name || ''}
        </Tag>
        : null
    })
  }
}
