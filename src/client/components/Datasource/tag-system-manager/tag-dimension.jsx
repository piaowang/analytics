import React from 'react'
import { ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  DatePicker,
  Input,
  notification,
  Popconfirm,
  Radio,
  Select,
  Spin,
  Tooltip,
  message,
} from 'antd';
import _ from 'lodash'
import {validateFieldsAndScroll} from 'client/common/decorators'
import {addUserTag, deleteUserTag, editUserTag, getDimensions} from 'client/databus/datasource'
import Icon from 'client/components/Common/sugo-icon'
import Fetch from 'client/common/fetch-final'
import DruidColumnType from 'common/druid-column-type'
import {DataSourceType, KEY_NONE_TYPE} from 'common/constants'
import realNameBuilder from 'common/uindex-dimension-name-builder'
import AuthSelect from '../auth-select'
import setStatePromise from 'client/common/set-state-promise'
import {findTreeNode} from './store/utils'
import moment from 'moment'
import {Auth} from 'client/common/permission-control'
import TagTypeTreeSelect from './tag-type-tree-select'
import {synchronizer} from '../../Fetcher/synchronizer'
import {browserHistory} from 'react-router'
import {interpose} from '../../../../common/sugo-utils'
import {buildTagItems} from '../../../../common/convertTagsValue'
import {untypedTreeId} from '../../TagManager/tag-type-list'
import {MultipleValuesTypeOffset} from '../../../../common/druid-column-type'
import HoverHelp from '../../Common/hover-help'
import { TAG_DEFAULT_DIMENSIONS } from '../../../../common/sdk-access-dimensions'
import { DIMENSION_TYPES } from '../../../../common/constants'
import {dimensionParamTypes} from '../../../../common/dimension-params-type'

const Option = Select.Option
const RadioGroup = Radio.Group
const FormItem = Form.Item
const DATE_FORMAT = 'YYYY-MM-DD'
const CanNotDel = TAG_DEFAULT_DIMENSIONS.map(p => p[0])

const dimensionTypes = _(DruidColumnType)
  .pickBy(val => {
    // 不支持 DateString，多值列目前只支持 StringArray
    return (val < MultipleValuesTypeOffset && val !== DruidColumnType.DateString) || val === DruidColumnType.StringArray
  })
  .keys()
  .map(key => {
    return {
      title: key.replace('Array', ' 多值列'),
      value: DruidColumnType[key]
    }
  })
  .value()

const DATE_FORMATS = [
  'YYYY-MM-DD',
  'YYYY/MM/DD',
  'YYYY年MM月DD日',
  'YYYY-MM-DD HH:mm:SS'
]

/**
 * @description 标签体系管理-添加标签
 * @export
 * @class TagDimension
 * @extends {React.Component}
 */
@Form.create()
@validateFieldsAndScroll
@setStatePromise
export default class TagDimension extends React.Component {

  constructor(props) {
    super(props)
    const { dimension, selected_tag_type } = props
    const flag = dimension.tag_extra && dimension.tag_extra.life_cycle
    this.state = {
      loading: false,
      loadingInfo: false,
      dimension,
      selectedTags: [],
      selected_tag_type,
      disableIsDesensitiz: false, //禁用脱敏表单项
      life_cycle_type: flag ? '2' : '1' // 生命周期类型1=长期有效; 2=时间段
      // selectedTags: dimension.tags || []
    }
  }

  componentWillMount() {
    this.initData()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.dimension && !_.isEqual(nextProps.dimension, this.props.dimension)) {
      const flag = nextProps.dimension.tag_extra && nextProps.dimension.tag_extra.life_cycle
      this.setState({
        dimension: nextProps.dimension,
        selected_tag_type: nextProps.selected_tag_type,
        life_cycle_type: flag ? '2' : '1' // 生命周期类型1=长期有效; 2=时间段
      }, () => {
        this.initData()
        this.props.form.resetFields()
      })
    }
  }

  datasource_type = 'tag'
  validateName = _.throttle(async (rule, name, callback = () => null) => {
    let {datasource} = this.props
    let {dimension} = this.state
    let formType = this.props.form.getFieldValue('type') || ''
    let realName = realNameBuilder(name, formType)
    if (_.isEmpty(name)) {
      return callback()
    }
    //includeNotUsing 把禁用状态的标签也请求回来
    let res = await getDimensions(datasource.id, {
      limit: 1,
      name: encodeURIComponent(realName),
      datasource_type: this.datasource_type,
      includeNotUsing: true
    })
    if (!res) {
      return callback('出错了')
    }
    if (
      (res.data.length > 0 && !dimension.id) ||
      (res.data.length > 0 && dimension.id !== res.data[0].id)
    ) {
      callback('已经被占用，换一个吧')
    } else callback()

  }, 100)

  //编辑维度时候需要获取维度对应的所有标签信息
  initData = async () => {
    const { dimension } = this.state
    let {id, name} = dimension
    if (!id) {
      return
    }
    this.setState({
      loadingInfo: true
    })
    // 如果存在子项目，优先取子项目parent_id
    let project_id = this.props.project.parent_id || this.props.project.id
    //点击右侧标签树后 查取对应标签的tag_value
    let dimensionTagInfo = await Fetch.get('/app/tag-dict/get-tag-info', {
      name, project_id
    })
    if (!dimensionTagInfo) {
      return await this.setStatePromise({
        loadingInfo: false
      })
    }
    let infos = _.get(dimensionTagInfo, 'result') || []
    let tag_value = infos.reduce((prev, v) => {
      return prev + v.title + '=' + v.tag_value + '\n'
    }, '')
    let sub_type = _.get(infos, '[0].sub_type')
    await this.setStatePromise(old => {
      old.dimension.tag_value = tag_value
      old.dimension.sub_type = sub_type
      old.loadingInfo = false
      return old
    })
  }

  onRoleClick = role => {
    let {dimension} = this.state
    let {role_ids} = dimension
    let {id} = role
    let update = _.cloneDeep(dimension)
    if (role_ids.includes(id)) {
      update.role_ids = role_ids.filter(rid => rid !== id)
    } else {
      update.role_ids = role_ids.concat(id)
    }
    this.setState({
      dimension: update
    })
  }

  onTagTypeChange = (val) => {
    this.setState({selected_tag_type: val})
  }

  getRelatedTagGroups = async tagDim => {
    let {id: dsId} = this.props.datasource
    let fetchRes = await Fetch.get('/app/tag-group/get', {
      where: {
        datasource_id: dsId,
        params: {
          filters: { $like: `%${tagDim.name}%` }
        }
      }
    })
    return _.get(fetchRes, 'result', []).filter(tg => {
      return _.some(tg.params.filters, flt => {
        if ('children' in flt) {
          return flt.dimension.name === tagDim.name
        } else if ('filters' in flt) {
          return _.some(flt.filters, flt0 => flt0.dimension.name === tagDim.name)
        }
        return false
      })
    })
  }

  del = dimension => {
    return async () => {
      let {id: dsId, name} = this.props.datasource
      this.setState({ loading: true })

      // 如果被组合标签使用，则不能删除
      let usingByTagGroups = await this.getRelatedTagGroups(dimension)
      if (!_.isEmpty(usingByTagGroups)) {
        const linkDoms = interpose(
          (v, i) => <span key={i}>, </span>,
          usingByTagGroups.map(tg => <a key={tg.id} href={`/console/tag-group?id=${tg.id}`}>{tg.title}</a>))

        notification.warn({
          message: '提示',
          description: (
            <div>
              此标签正在被组合标签 {linkDoms} 使用，不能删除
            </div>
          )
        })
        this.setState({ loading: false })
        return
      }

      let res = await deleteUserTag([dimension.name], dsId, name, [dimension.title])
      this.setState({ loading: false })
      if (!res) {
        return
      }
      this.props.setProp({
        type: 'del_dimensions',
        data: dimension
      })
      notification.success({
        message: '提示',
        description: '删除成功'
      })
      const { treeNode } = this.props
      // 同步左边分类树信息
      if (treeNode && treeNode.props) {
        findTreeNode(this.props.treeData, dimension.id, (item, idx, arr) => {
          arr.splice(idx, 1) // 移除标签
        })
        const { dimensions } = this.props
        _.remove(dimensions, d => d.id === dimension.id)
        this.props.setState({selectedTreeNode: { ...treeNode }, dimensionList: dimensions })
        // 删除标签维度后清空表单
        const emptyDim = {
          name: '',
          title: '',
          type: 2,
          role_ids: dimension.role_ids,
          user_ids: [],
          tags: [],
          params: {}
        }
        this.setState({
          dimension: emptyDim,
          selected_tag_type: KEY_NONE_TYPE
        })
      }
    }
  }

  getSubTagWhichCanNotRemove = async (pendingFormVals) => {
    let {dimension} = this.state
    let prevSubTags = buildTagItems(dimension.tag_value, dimension.name, this.props.project)
    let currSubTags = buildTagItems(pendingFormVals.tag_value, pendingFormVals.name, this.props.project)

    let validSubTags = currSubTags.filter(p => {
      const tagValues = p.tag_value.split('`')
      if(!tagValues.filter(_.identity).length) {
        return true
      } else {
        return _.some(tagValues, t => {
          if(pendingFormVals.sub_type === '3') {
            return !!t && !moment(t).isValid()
          } else if (pendingFormVals.sub_type === '1') {
            return !!t && _.isNaN(_.toNumber(t))
          }
        })
      }
    }).filter(_.identity)

    if(validSubTags.length) {
      message.error(`子标签[${validSubTags.map(p => p.title).join(',')}]值设置不规范`)
      return false
    }

    let deletingSubTags = _.differenceBy(prevSubTags, currSubTags, st => st.title)
    if (_.isEmpty(deletingSubTags)) {
      return null
    }
    let tagGroups = await this.getRelatedTagGroups(dimension)
    if (_.isEmpty(tagGroups)) {
      return null
    }
    let deletingSubTagsNameSet = new Set(deletingSubTags.map(st => st.title))
    // { subTagName: [tagGroupObj0, tagGroupObj1], subTagName2: [...], ... }
    return _(tagGroups).flatMap(tg => {
      return _.flatMap(
        _.flatMap(tg.params.filters, flt => _.isEmpty(flt.filters) ? flt : flt.filters).filter(flt => flt.dimension.name === dimension.name),
        flt => flt.children.filter(subTagFlt => deletingSubTagsNameSet.has(subTagFlt.title)).map(c => ({...c, tagGroup: tg}))
      )
    })
      .groupBy(tg => tg.title).mapValues((childs, subTagName) => {
        return childs.map(c => c.tagGroup)
      })
      .value()
  }

  handleUsingTag = async () => {
    const { dimension } = this.state
    const { params: { isUsingTag } } = dimension
    let dimension1 = _.cloneDeep(dimension)
    //如果不存在 是历史数据 而且默认启用了 点击就变禁用
    if (_.isUndefined(isUsingTag)) {
      dimension1.params.isUsingTag = false
    } else {
      dimension1.params.isUsingTag = !isUsingTag
    }
    const res = await Fetch.put(`/app/tag-dict/use-tag/${dimension.id}`, dimension1)
    let tip
    if (!res) {
      tip = _.get(dimension1, 'params.isUsingTag') ? '启用' : '停用'
      return
    }
    this.setState({
      dimension: dimension1
    })
    // findTreeNode(this.props.treeData, dimension.id, (item, idx, arr) => {
    //   arr.splice(idx, 1, {
    //     ...dimension1
    //   })
    // })
    // this.props.setState({ treeData: [...this.props.treeData] })
    tip = _.get(dimension1, 'params.isUsingTag') ? '启用' : '停用'
    notification.success({
      message: '提示',
      description: `${tip}成功`
    })

    const { treeNode } = this.props
    // 同步左边分类树信息
    if (treeNode && treeNode.props) {
      findTreeNode(this.props.treeData, dimension.id, (item, idx, arr) => {
        arr.splice(idx, 1) // 移除标签
        arr.splice(idx, 0, {
          ...item,
          ...dimension1
        })
      })
      // console.log(this.props.treeData)
      this.props.setState({ treeData: [...this.props.treeData ] })
    }
    let { dimensions } = this.props
    let dimensionList = _.cloneDeep(dimensions)
    const index = _.findIndex(dimensionList, p => p.id === dimension1.id)
    _.set(dimensionList, [index, 'params', 'isUsingTag'], _.get(dimension1, 'params.isUsingTag'))
    this.props.setState({ dimensionList })
  }

  submit = async () => {
    let fieldsValue = await this.validateFieldsAndScroll()
    if (!fieldsValue) return
    let {dimension, selectedTags, life_cycle_type} = this.state

    let tagGroupSubTagNameDict = await this.getSubTagWhichCanNotRemove(fieldsValue)
    if (tagGroupSubTagNameDict === false) {
      return 
    } else if (!_.isEmpty(tagGroupSubTagNameDict)) {
      notification.warn({
        message: '提示',
        description: _(tagGroupSubTagNameDict).keys().map(subTag => {
          const linkDoms = interpose(
            (v, i) => <span key={i}>, </span>,
            tagGroupSubTagNameDict[subTag].map(tg => <a key={tg.id} href={`/console/tag-group?id=${tg.id}`}>{tg.title}</a>))

          return (
            <div key={subTag}>子标签 {subTag} 正在被组合标签 {linkDoms} 使用，不能修改</div>
          )
        }).value()
      })
      return
    }

    Object.assign(fieldsValue,
      _.pick(dimension, ['user_ids', 'role_ids'])
    )
    let {datasource, setProp} = this.props
    let dimId = dimension.id
    if (fieldsValue.type) fieldsValue.type = parseInt(fieldsValue.type, 10)
    this.setState({
      loading: false
    })
    const rangeValue = fieldsValue['life_cycle']
    const tagType = fieldsValue['tag_type_id']
    if (life_cycle_type !== '1' && _.some(rangeValue, _.isNull)) {
      notification.warn({
        message: '提示',
        description: '请设置生命周期起始值'
      })
      return
    }
    Object.assign(fieldsValue, {
      // 新增时前端数据库直接存真实列名，避免同步维度后名称发生变化
      name: dimId ? dimension.name : realNameBuilder(fieldsValue.name, fieldsValue.type),
      tags: selectedTags,
      sub_type: parseInt(fieldsValue.sub_type, 10),
      sourceName: datasource.name,
      datasource_type: this.datasource_type,
      isUindex: datasource.type === DataSourceType.Uindex,
      life_cycle: life_cycle_type === '1' ? null : [rangeValue[0].format('YYYY-MM-DD'), rangeValue[1].format('YYYY-MM-DD')],
      tag_type_id: tagType.selectedValue,
      params: {
        ...(dimension.params || {}),
        ...(fieldsValue.params || {})
      }
    })

    /*
    tag_extra => keys: {
      * // tag_desc: 定义口径
      * data_from: 数据来源
      * cleaning_rule: 清洗规则
      * life_cycle: 生命周期
      * is_base_tag: 是否是基础标签
      * is_base_prop: 是否是基础标签
      * null_display_text: 空值显示默认值
     * }
     */
    const tagExtraKeys = ['data_from', 'cleaning_rule', 'life_cycle','is_base_tag','is_base_prop', 'date_display_format', 'is_Desensitiz', 'null_display_text']
    fieldsValue.tag_extra = {
      ..._.pick(fieldsValue, tagExtraKeys)
    }
    // 移除tag_extra中的属性
    fieldsValue = _.omit(fieldsValue, tagExtraKeys)
    if (life_cycle_type === '1') { // 如果是长期有效则设置为null
      fieldsValue.tag_extra.life_cycle = null
    }
    let res
    if (dimId) {
      const { is_base_prop } = fieldsValue.tag_extra

      if (~~is_base_prop) {
        //宏观分析会把用户选了哪些标签缓存在ls里 这里如果某个标签设置了用户基础属性 需要剔除掉 因为用户基础属性不会出现在宏观分析的标签树上
        const { projectCurrent: { id: projectCurrentId } } = this.props
        let curIndex = 'tag_macroscopic_cur_fields'
        let { user:{id:user_id}} = window.sugo
        let ls = JSON.parse(localStorage.getItem(curIndex))
        let localCurFields = _.get(ls, `${projectCurrentId}.${user_id}.nextCurFields`, [])

        localCurFields = localCurFields.filter( i => i !== dimId )
        localStorage.setItem(curIndex, JSON.stringify({
          ...ls,
          [`${projectCurrentId}`]: {
            ..._.get(ls, `${projectCurrentId}`),
            [`${user_id}`]: {
              ..._.get(ls, `${user_id}`),
              nextCurFields: localCurFields
            }
          }
        }))
        /**-------------------------------------------------------------------- */
      }
      let { company_id, parentId } = dimension
      fieldsValue.datasourceId = parentId
      fieldsValue.company_id = company_id
      // 修改时 如果没修改子标签定义 不传给后端
      const preMod = dimension['tag_value'] === fieldsValue['tag_value'] ? _.omit(fieldsValue, 'tag_value') : fieldsValue
      res = await editUserTag(dimId, preMod)
    } else {
      //生成标签使用状态属性 默认停用
      fieldsValue.params.isUsingTag = false
      res = await addUserTag(datasource.id, fieldsValue)
    }
    
    await this.setStatePromise({
      loading: false
    })
    if (!res) return
    const { treeNode } = this.props
    if (dimId) {
      notification.success({
        message: '提示',
        description: '更新成功'
      })
      setProp({
        type: 'update_dimensions',
        data: {
          id: dimId,
          ...fieldsValue
        }
      })
      setProp({
        type: 'update_originDimensions',
        data: {
          id: dimId,
          ...fieldsValue
        }
      })
      // 
      Object.assign(dimension, fieldsValue)
      this.setState({dimension})
      let newTreeNode = _.cloneDeep(treeNode)
      // 同步左边分类树信息
      if (treeNode && treeNode.props) {
        const { dataRef } = treeNode.props
        if (fieldsValue.tag_type_id !== dataRef.treeId) { // 更改了分类
          let currItem
          findTreeNode(this.props.treeData, dimId, (item, idx, arr) => {
            arr.splice(idx, 1) // 移除标签
            currItem = { ...item, title: fieldsValue.title }
          })
          findTreeNode(this.props.treeData, fieldsValue.tag_type_id, item => {
            currItem.treeId = fieldsValue.tag_type_id
            item.children = item.children || []
            item.children.push(currItem) // 追加的尾部
          })
          this.setState({ selected_tag_type: fieldsValue.tag_type_id })
          _.set(newTreeNode, 'props.dataRef.treeId', fieldsValue.tag_type_id)
        } else {
          findTreeNode(this.props.treeData, dimension.id, (item, idx, arr) => {
            arr.splice(idx, 1) // 移除标签
            arr.splice(idx, 0, {
              ...item,
              ...dimension
            })
          })
        }
        this.props.setState({ treeData: [...this.props.treeData ], selectedTreeNode: newTreeNode })
      }
    } else {
      notification.success({
        message: '提示',
        description: '添加成功'
      })
      setProp({
        type: 'add_dimensions',
        data: res.result
      })
      setProp({
        type: 'add_originDimensions',
        data: res.result
      })
      // 同步左边分类树信息
      if (treeNode && treeNode.props) {
        findTreeNode(this.props.treeData, fieldsValue.tag_type_id || untypedTreeId, (item, idx, arr) => {
          item.children = item.children || []
          item.children.push({
            ...res.result,
            treeId: fieldsValue.tag_type_id || untypedTreeId,
            isTagDimension: true,
            is_druid_dimension: true
          }) // 追加的尾部
        })
        this.props.setState({ treeData: [ ...this.props.treeData ] })
      }
      const { dimensions } = this.props
      dimensions.push(res.result)
      this.props.setState({ dimensionList: [...dimensions] })
    }
    this.props.form.resetFields()
  }

  renderRelatedScheduleTaskJumpBtn = synchronizer(_.identity)(sync => {
    let relatedScheduleTaskId = _.get(sync, 'taskExtraInfos[0].task_id')
    if (!relatedScheduleTaskId) {
      return null
    }
    return (
      <Button
        className="mg2l iblock"
        icon={<ClockCircleOutlined />}
        onClick={() => {
          browserHistory.push(`/console/task-schedule-manager/${relatedScheduleTaskId}`)
        }}
      >跳转到关联调度任务</Button>
    );
  })

  render () {
    let { loading, loadingInfo, life_cycle_type = '1', selected_tag_type, disableIsDesensitiz} = this.state
    const dimension = _.cloneDeep(this.state.dimension || {})
    let isUsingTag = _.get(dimension, 'params.isUsingTag')
    let is_Desensitiz = _.get(dimension, 'tag_extra.is_Desensitiz')
    let { datasource, roles, treeNode } = this.props
    let tag_type_id = KEY_NONE_TYPE
    //isUsingTag 如果不存在这个属性 就是历史数据 默认启用
    if(_.isUndefined(isUsingTag)){
      isUsingTag = true
    }
    if (!selected_tag_type && treeNode) {
      try {
        const { dataRef } = treeNode.props
        tag_type_id = dataRef.treeId
      } catch(e) {
        tag_type_id = KEY_NONE_TYPE
      }
    } else {
      tag_type_id = selected_tag_type
    }
    let {
      title, name, id, type, params = {},
      sub_type = '2',
      tag_desc,
      tag_value,
      tag_extra = {}
    } = dimension
    const {getFieldDecorator} = this.props.form
    let dimensionType = params.type || dimensionParamTypes.normal.type
    // let dimType = getFieldValue('type') || type
    let editFlag = !!id
    editFlag && (editFlag = dimension.is_druid_dimension)
    // 如果是分组维度，类型与所选的基本维度一致所以不可编辑
    !editFlag && (editFlag = dimensionType === dimensionParamTypes.group.type || dimensionType === dimensionParamTypes.business.type)
    // 如果是分组维度，类型与所选的基本维度一致所以不可编辑
    // 如果是分组维度，类型强制为string
    type = dimensionType === dimensionParamTypes.group.type ? DruidColumnType.String : type

    let formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 18 }
    }

    let canEdit = !id || (id && !dimension.is_druid_dimension)

    let nameRules = canEdit ? [{
      required: true,
      message: '维度名称不能为空，请键入字母或_ 开头 与字母、数字组合，且长度为2至50个字符'
    },
    {
      pattern: /^[_A-Za-z][\w]{1,49}$/i,
      message: '可用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位'
    },
    {
      validator: this.validateName,
      validateTrigger: 'onBlur'
    }] : []
    const holder = `列出标签可能的标题和取值，(每行为一组取值，等号前为标题，等号后为取值，取值以\`分割)
    当类型为数值时，应该输入分档值，例如：
    3周岁=3 // 等于3
    未成年=\`14 // 小于14
    青年=15\`30 // 大于等于15且小于30
    中年=30\`50 // 大于等于30且小于50
    老年=50\`   // 大于等于50
    若为字符类型，则输入可能的取值，例如：
    东南=广东省,福建省
    吉林=吉林省
    如果标题与取值一致，也可以省略标题，例如：
    广东省
    福建省
    `
    const tooltipTitle = (
      <div>
        {holder.split('\n').map((t, idx) => <p key={`remark-r-${idx}`}>{t}</p>)}
      </div>
    )
    const formType = this.props.form.getFieldValue('type') || ''
    const formName = this.props.form.getFieldValue('name') || ''
    let subType = '1'
    if(formType === DruidColumnType.Date.toString()) {
      subType = '3'
    } else if(!formType || formType === DruidColumnType.String.toString() || formType === DruidColumnType.StringArray.toString()) {
      subType = '2'
    } 

    let isCreating = !_.get(dimension, 'id')
    return (
      <div className="tag-dimension-content mg2t">
        <div className="aligncenter mg3b">
          <Auth auth="app/tag-dict/use-tag/:id" isUsingTag={isUsingTag}>
            {
              dimension.id ?
                <Popconfirm
                  title={[
                    <div key="0">{`确定${!isUsingTag ? '启用' : '停用'}该标签吗?`}</div>,
                    <div style={{color: '#dd585d'}} className="mg1y" key="1">注意:{`${!isUsingTag ? '启用' : '停用'}`}后将会在标签体系中{`${!isUsingTag ? '显示' : '隐藏'}`}</div>
                  ]}
                  onConfirm={this.handleUsingTag}
                  getPopupContainer={() => document.querySelector('.aligncenter')}
                >
                  <Button
                    type={!isUsingTag ? 'success' : 'danger'}
                    icon={<LegacyIcon type={!isUsingTag ? 'check' : 'close'} />}
                    className="mg1l iblock"
                  >{!isUsingTag ? '启用' : '停用'}</Button>
                </Popconfirm>
                :
                null
            }
          </Auth>
          <Auth auth={`app/tag-dict/${isCreating ? 'create' : 'update'}`}>
            <Button
              type="success"
              icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
              className="mg1l iblock"
              onClick={this.submit}
            >{loading ? '保存中...' : '保存'}</Button>
            <Button
              type="ghost"
              className="mg1l iblock"
              icon={<CloseCircleOutlined />}
              onClick={() => this.props.form.resetFields()}
            >重置</Button>
          </Auth>
          {
            CanNotDel.includes(name)
              ? null
              : <Auth auth="app/tag-dict/delete">
                {!dimension.id ? null :
                  <Popconfirm placement="top" title="确定要删除该标签维度吗" onConfirm={this.del(dimension)} okText="是" cancelText="否">
                    <Button
                      className="mg1l iblock"
                      icon={<CloseCircleOutlined />}
                    >删除</Button>
                  </Popconfirm>
                }
              </Auth>
          }
          <Auth auth="/console/task-schedule-manager">
            {this.renderRelatedScheduleTaskJumpBtn({
              url: '/app/sugo-schedule-task-extra-infos',
              modelName: 'taskExtraInfos',
              query: {
                where: {
                  related_tags: {$contains: [dimension.name]}
                },
                limit: 1
              }
            })}
          </Auth>
        </div>
        <Spin spinning={loading || loadingInfo}>
          <Form layout="horizontal" onSubmit={this.submit}>
            <FormItem {...formItemLayout} label="标签名称(中文)" hasFeedback>
              {getFieldDecorator('title', {
                rules: [{
                  min: 2,
                  max: 20,
                  type: 'string',
                  message: '2~20个字符，可以是中文'
                }],
                initialValue: title
              }) (
                <Input type="text" autoComplete="off" holder="中文描述符，不超过20个字符"/>
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="标签名称(英文)" hasFeedback>
              {getFieldDecorator('name', {
                rules: nameRules,
                initialValue: name
              }) (
                <Input type="text" autoComplete="off" disabled={!canEdit} />
              )}
            </FormItem>
            <FormItem
              {...formItemLayout}
              label="标签类型"
            >
              {getFieldDecorator('type', {
                initialValue: type + ''
              })(
                <Select
                  dropdownMatchSelectWidth={false}
                  disabled={editFlag}
                  onChange={(e) => {
                    if (e === '2' ) {
                      disableIsDesensitiz = false
                    } else {
                      disableIsDesensitiz = true
                      this.props.form.setFieldsValue({tag_extra:{ is_Desensitiz: '0' }})
                    }
                    this.setState({
                      disableIsDesensitiz
                    })
                  }}
                  // getPopupContainer={() => {
                  //   return document.querySelector('div.overscroll-y.relative')
                  // }}
                >
                  {
                    dimensionTypes
                      .filter(t => ![DruidColumnType.Text, DruidColumnType.BigDecimal, DruidColumnType.DateString].includes(t.value))
                      .map((t, i) => {
                        let {value, title} = t
                        return (
                          <Option value={value + ''} key={i + 'dt'}>{title}</Option>
                        )
                      })
                  }
                </Select>
              )}
            </FormItem>
            <FormItem
              {...formItemLayout}
              label={(
                <span>
                  真实列名&nbsp;
                  <Tooltip title="类型_名称（英文），例如：类型为int的age字段为i_age">
                    <Icon type="question-circle-o"/>
                  </Tooltip>
                </span>
              )}
            >
              {id ? formName : realNameBuilder(formName, formType)}
            </FormItem>
            <FormItem {...formItemLayout} label="子标签类型">
              {getFieldDecorator('sub_type', {
                initialValue: subType
              })(
                <RadioGroup disabled>
                  <Radio key="rdo-st-2" value="2">字符</Radio>
                  <Radio key="rdo-st-1" value="1">数值</Radio>
                  <Radio key="rdo-st-3" value="3">时间</Radio>
                </RadioGroup>
              )}
            </FormItem>
            {
              subType === '3'
                ? <FormItem {...formItemLayout} label="显示格式">
                  {getFieldDecorator('date_display_format', {
                    initialValue: (tag_extra.date_display_format || DATE_FORMATS[0]) + '' // 目前除了字符类型，其他都是数值类型
                  })(
                    <Select >
                      {
                        DATE_FORMATS.map((p, i) => <Option value={p} key={i + 'dtf'}>{moment().format(p)}</Option>)
                      }
                    </Select>
                  )}
                </FormItem>
                : null
            }
            <FormItem {...formItemLayout} label="标签分类">
              {getFieldDecorator('tag_type_id', {
                initialValue: {
                  treeList: this.props.treeList,
                  selectedValue: tag_type_id
                }
              }) (
                <TagTypeTreeSelect />
              )}
            </FormItem>
            
            <FormItem {...formItemLayout} label="基础标签">
              {getFieldDecorator('is_base_tag', {
                initialValue: (tag_extra.is_base_tag || 0) + '' // 目前除了字符类型，其他都是数值类型
              })(
                <RadioGroup>
                  <Radio key="rdo-base-2" value="1">是</Radio>
                  <Radio key="rdo-base-1" value="0">否</Radio>
                </RadioGroup>
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="是否脱敏">
              {getFieldDecorator('is_Desensitiz', {
                initialValue: (is_Desensitiz || 0) + '' // 目前除了字符类型，其他都是数值类型
              })(
                <RadioGroup disabled={disableIsDesensitiz || type !== DIMENSION_TYPES.string}>
                  <Radio key="rdo-base-2" value="1">是</Radio>
                  <Radio key="rdo-base-1" value="0">否</Radio>
                </RadioGroup>
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="用户基础属性">
              {getFieldDecorator('is_base_prop', {
                initialValue: (tag_extra.is_base_prop || 0) + '' // 目前除了字符类型，其他都是数值类型
              })(
                <RadioGroup>
                  <Radio key="rdo-base-prop2" value="1">是</Radio>
                  <Radio key="rdo-base-prop1" value="0">否</Radio>
                </RadioGroup>
              )}
            </FormItem>
            <FormItem
              {...formItemLayout}
              label={(
                <span>
                  子标签定义&nbsp;
                  <Tooltip title={tooltipTitle}>
                    <Icon type="question-circle-o" />
                  </Tooltip>
                </span>
              )}
            >
              {getFieldDecorator('tag_value', {
                initialValue: tag_value
              }) (
                <Input.TextArea
                  rows={11}
                  placeholder={holder}
                />
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="空值显示">
              {getFieldDecorator('null_display_text', {
                initialValue: tag_extra.null_display_text
              })(
                <Input placeholder="空值显示内容" />
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="定义口径">
              {getFieldDecorator('tag_desc', {
                initialValue: tag_desc
              })(
                <Input.TextArea rows={3} placeholder="标签说明" />
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="数据来源">
              {getFieldDecorator('data_from', {
                initialValue: tag_extra.data_from || ''
              }) (
                <Input placeholder="eg.从xxx系统的xxx库userinfo表的age字段" />
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="清洗规则">
              {getFieldDecorator('cleaning_rule', {
                initialValue: tag_extra.cleaning_rule || ''
              }) (
                <Input placeholder="用文字说明该标签的清洗规则" />
              )}
            </FormItem>
            {/**
              标签的生效时间，长期有效/具体的时间段，如果超出了生命周期，则不显示该标签，不再计算该标签的值（需要手动在hql中设置？是否可以自动？）。
            */}
            <FormItem
              {...formItemLayout}
              label={(
                <span>
                  生效时间&nbsp;
                  <Tooltip title="标签的生效时间，长期有效/具体的时间段，如果超出了生效时间，则不显示该标签，不再计算该标签的值.">
                    <Icon type="question-circle-o"/>
                  </Tooltip>
                </span>
              )}
            >
              <Radio.Group
                onChange={e => {
                  this.setState({life_cycle_type: e.target.value})
                }}
                value={life_cycle_type}
                defualtValue={life_cycle_type}
              >
                <Radio value="1">长期有效</Radio>
                <Radio value="2">具体的时间段</Radio>
              </Radio.Group>
              {life_cycle_type === '1' ? '' : getFieldDecorator('life_cycle', {
                initialValue: tag_extra.life_cycle ? tag_extra.life_cycle.map(d => moment(d, DATE_FORMAT)) : [moment(), null],
                rules: [{ type: 'array', required: true, message: '请选择标签过期时间!' }]
              }) (
                <DatePicker.RangePicker
                  allowClear
                  format={DATE_FORMAT}
                  className="width250"
                />
              )}
            </FormItem>

            <FormItem
              {...formItemLayout}
              label={(
                <HoverHelp
                  icon="question-circle-o"
                  addonBefore="展示图表类型 "
                  content="宏观画像中的图表类型，一般来说子标签的覆盖面没有交叉的话则选择饼图，否则选择柱状图"
                />
              )}
            >
              {getFieldDecorator('params.chartType', {
                initialValue: params.chartType || 'dist_bar'
              }) (
                <Radio.Group >
                  <Radio value="dist_bar">柱状图</Radio>
                  <Radio value="pie">饼图</Radio>
                </Radio.Group>
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="备注">
              {getFieldDecorator('params.description', {
                initialValue: params.description
              })(
                <Input.TextArea rows={3} placeholder="备注" />
              )}
            </FormItem>
            <FormItem {...formItemLayout} label="授权访问">
              <Auth auth="put:/app/tag-dict/authorize/:id" alt="您所在角色无授权权限">
                <AuthSelect
                  roles={roles}
                  dataSourceRoles={datasource.role_ids}
                  record={dimension}
                  onClick={this.onRoleClick}
                />
              </Auth>
            </FormItem>
          </Form>
        </Spin>
      </div>
    );
  }
}

