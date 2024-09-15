import React from 'react'
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  Card,
  Dropdown,
  Input,
  Menu,
  message,
  Popconfirm,
  Popover,
  Radio,
  Select,
  Tooltip,
  Alert,
} from 'antd';
import {browserHistory, Link} from 'react-router'
import _ from 'lodash'
import * as ls from '../../common/localstorage'
import deepCopy from '../../../common/deep-copy'
import moment from 'moment'
import setStatePromiseDec from '../../common/set-state-promise'
import UsergroupUpload from './usergroup-upload'
import {Auth, checkPermission, PermissionLink} from '../../common/permission-control'
import {immutateUpdate, immutateUpdates, interpose} from '../../../common/sugo-utils'
import {bool, formItemLayout, formItemLayout1} from './constants'
import HorizontalSplitHelper from 'client/components/Common/horizontal-split-helper'
import {
  UserGroupFilterTypeEnum,
  UserGroupFilterTypeTranslation,
  UserGroupSetOperationEnum,
  UserGroupSetOperationTranslation
} from 'common/constants'
import * as d3 from 'd3'
import classNames from 'classnames'
import iconDownBlue from '../../images/icon-down-blue.png'
import {enableSelectSearch} from 'client/common/antd-freq-use-props'
import {
  AccessDataType, DimDatasourceType,
  TagTypeEnum,
  UserGroupBuildInTags,
  UsergroupFilterStrategyEnum,
  UsergroupFilterStrategyTranslation,
  UsergroupRecomputeStrategyEnum,
  UsergroupRecomputeStrategyTranslation,
  UsergroupUpdateStrategyEnum, UsergroupUpdateStrategyTranslation,
  UserGroupBuildInTagEnum
} from '../../../common/constants'
import UserGroupSelector from '../Common/usergroup-selector'
import {withDataSourceTagsDec} from '../Fetcher/data-source-tags-fetcher'
import TagFilterEditor from './tag-filter-editor'
import BehaviorFilterEditor from './behavior-filter-editor'
import CronPicker from '../Common/cron-picker'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {tagFiltersAdaptToOldFormat} from '../../../common/param-transform'


const usergroupListPath = '/console/usergroup'
const FormItem = Form.Item
const Option = Select.Option
const RadioButton = Radio.Button
const RadioGroup = Radio.Group

const {dataConfig} = window.sugo

const canAdd = checkPermission('/app/usergroup/create')
const canVisitFunnel = checkPermission('/console/funnel')
const canEdit = checkPermission('app/usergroup/update')
const canDel = checkPermission('app/usergroup/delete')

const format02d = d3.format('02d')

const maxDic = {
  title: 254,
  description: 500
}

const queryData = {
  limit: 999
}

const getPopupContainer = () => document.querySelector('.usergroup-form-card .ant-card-body')

export const defaultParams = (groupby = '') => ({

  //条件过滤
  dimension: {
    relation: 'and', // or 'or'
    filters: [
      // {
      //   relation: 'and',
      //   filters: [
      //     {
      //         dimension: ''
      //         ,action: '=' // see actionPool
      //         ,value: 'www'
      //         ,actionType: 'str' //or 'num'
      //     }
      //   ]
      // }
    ]
  },

  //用户行为过滤
  measure: {
    relation: 'and', // or 'or'
    filters: [
      // {
      //   relation: 'and',
      //   filters: [
      //  {
      //      dimension: ''
      //      ,action: '=' // see actionPool
      //      ,value: 'www'
      //      ,actionType: 'str' //or 'num'
      //      ,formulaType: 'str' //or 'num'
      //      ,formula: 'count' // in [max, min, count, sum] or measure.formula
      //  }
      //   ]
      // }
    ]
  },

  //指标过滤
  measure3: {
    relation: 'and', // or 'or'
    filters: [
      // {
      //   relation: 'and',
      //   filters: [
      //  {
      //      dimension: ''
      //      ,action: '=' // see actionPool
      //      ,value: 'www'
      //      ,actionType: 'str' //or 'num'
      //      ,formulaType: 'str' //or 'num'
      //      ,formula: 'count' // in [max, min, count, sum] or measure.formula
      //  }
      //   ]
      // }
    ]
  },

  groupby, // dimension name for groupby
  relativeTime: '-7 days',
  since: moment().subtract(7, 'days').format('YYYY-MM-DD hh:mm:ss'),
  until: moment().format('YYYY-MM-DD hh:mm:ss'),
  dataConfig,

  // 用户群构造指令 [{op: UserGroupSetOperationEnum, type: UserGroupFilterTypeEnum}, ...]
  composeInstruction: [ ],
  // 用户群筛选 id
  usergroupFilterTargets: [],
  // 用户群筛选方式
  usergroupFilterStrategy: UsergroupFilterStrategyEnum.byExistingUserGroup,
  // 关联行为项目 id
  relatedBehaviorProjectId: null,
  // 关联标签项目 id
  relatedUserTagProjectId: null
})


function equals(v1, v2) {
  if (typeof v1 === 'undefined' && typeof v2 === 'undefined') return false
  else if (!v1 && !v2) return true
  return v1 === v2
}

/*@withDbDims(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    datasourceType: DimDatasourceType.tag
  }
})*/
@setStatePromiseDec
export default class UsergroupForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      usergroup: this.createUsergroup(props),
      loadingDimension: false,
      // uploadResult: [],
      dimensionTree: {},
      hasUpload: false,
      editingUserGroupFilterType: '', // 空代表正在编辑基本信息
      nowIdx: '', // 空代表正在编辑基本信息
      visiblePopoverKey: '',
      isSavingUserGroup: false,
      maxLength: 6
    }
    this.getDatas()
  }

  UNSAFE_componentWillMount() {
    let {usergroupId} = this.props.params
    let {usergroups, datasourceCurrent} = this.props
    if (usergroupId && usergroupId !== 'new' && usergroups.length) {
      //update逻辑
      this.initUsergroupData(usergroups, usergroupId)
    } else if (!_.isEmpty(datasourceCurrent)) {
      //create逻辑
      this.setState({
        usergroup: this.createUsergroup()
      })
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    let nid = nextProps.datasourceCurrent.id
    let cid = this.props.datasourceCurrent.id
    let oldUsergroup = _.cloneDeep(this.state.usergroup)
    if ( nid !== cid && cid) {
      return this.pickDatasource(nextProps)
    }
    let {usergroupId} = nextProps.params
    let {usergroups} = nextProps

    if (
      usergroupId &&
      usergroups.length &&
      usergroupId !== 'new' &&
      !equals(oldUsergroup.id, usergroupId)
    ) {
      this.initUsergroupData(usergroups, usergroupId)
    } else if ((!usergroupId || usergroupId === 'new') && nid !== cid) {
      this.initUsergroupEmptyData(nextProps)
    } else if (usergroupId !== this.props.params.usergroupId)  {
      this.getDatas()
    }
  }

  createUsergroup(props = this.props) {
    let {datasourceCurrent, projectList, projectCurrent} = props
    let {id, name} = datasourceCurrent
    let groupby = _.get(props.datasourceCurrent, 'params.commonMetric[0]')
    let params = defaultParams(groupby)

    let { tag_datasource_name } = projectCurrent
    // 如果当前项目设置了 tag_datasource_name，则标签项目必须关联到该数据源所指定的项目
    if (tag_datasource_name) {
      let proj = _.find(projectList, p => p.access_type === AccessDataType.Tag && p.tag_datasource_name === tag_datasource_name)
      if (proj) {
        params = immutateUpdate(params, 'relatedUserTagProjectId', () => proj.id)
      }
    }
    return {
      id: '',
      druid_datasource_id: id,
      datasource_name: name,
      params: _.pick(params,['relatedUserTagProjectId', 'relatedBehaviorProjectId', 'groupby','composeInstruction']) 
    }
  }

  pickDatasource(nextProps) {
    let {usergroups, projectCurrent, projectList} = nextProps
    let {usergroupId} = nextProps.params
    let usergroup = usergroupId && usergroups.length
      ? _.find(usergroups, {id: usergroupId}) || ls.get(usergroupId)(this.state.usergroup)
      : deepCopy(this.state.usergroup)
    if (usergroupId && usergroup) {
      return this.setState({usergroup}, this.getDatas)
    } else if (usergroupId && !usergroup) {
      return this.on404()
    }
    let {datasourceCurrent} = nextProps
    let {name, id} = nextProps.datasourceCurrent
    usergroup.druid_datasource_id = id
    usergroup.datasource_name = name
    _.set(
      usergroup,
      'params.groupby',
      _.get(datasourceCurrent, 'params.commonMetric[0]') || ''
    )
    // _.set(usergroup, 'params.dimension.filters', [])
    // _.set(usergroup, 'params.measure.filters', [])
    // _.set(usergroup, 'params.measure3.filters', [])

    let { tag_datasource_name } = projectCurrent
    // 如果当前项目设置了 tag_datasource_name，则标签项目必须关联到该数据源所指定的项目
    if (tag_datasource_name) {
      let proj = _.find(projectList, p => p.access_type === AccessDataType.Tag && p.tag_datasource_name === tag_datasource_name)
      if (proj) {
        usergroup = immutateUpdate(usergroup, 'params.relatedUserTagProjectId', () => proj.id)
      }
    }
    return this.setState({usergroup}, this.getDatas)
  }

  initUsergroupData = (usergroups, usergroupId) => {
    let usergroup = _.find(usergroups, {id: usergroupId}) || ls.get(usergroupId)
    if (!usergroup) {
      return this.on404()
    }

    //作用不明确
    // if (!usergroup.params.measure3) {
    //   usergroup.params.measure3 = defaultParams().measure3
    // }

    this.setState({
      usergroup
    }, this.getDatas)
  }

  initUsergroupEmptyData = (nextProps) => {
    let usergroup = this.createUsergroup(nextProps)
    this.setState({
      usergroup
    }, this.getDatas)
  }

  modifier = (...args) => {
    this.setState(...args)
  }

  on404 = () => {
    setTimeout(() => browserHistory.push(usergroupListPath), 7000)
    return message.error('分群不存在', 7)
  }

  onChangeUploadResult = uploadResult => {
    const { editingUserGroupFilterType, usergroup, nowIdx: composeIdx } = this.state
    this.setState({
      usergroup: immutateUpdate(usergroup, `params.composeInstruction[${composeIdx}].config.uploadResult`, () => uploadResult),
      hasUpload: true
    })
  }

  getDatas = async () => {
    let {id: druid_datasource_id} = this.props.datasourceCurrent
    if(!druid_datasource_id) return
    this.setState({
      loadingDimension: true
    })
    let res = await this.props.getDimensions(druid_datasource_id, queryData)
    if (!res) {
      this.setState({ loadingDimension: false })
      return
    }
    await this.props.getMeasures(druid_datasource_id, queryData)

    this.setState({
      loadingDimension: false,
      dimensionTree: _.keyBy(res && res.data, 'name')
    })
  }

  onPickGroupby = (dimensionName) => {
    let usergroup  = _.cloneDeep(this.state.usergroup)
    _.assign(usergroup.params, {
      groupby: dimensionName
    })
    this.setState({
      usergroup
    })
  }

  //没用到
  // onChangeDate = ({dateType, dateRange: [since, until]}) => {
  //   let usergroup  = _.cloneDeep(this.state.usergroup)
  //   _.assign(usergroup.params, {
  //     since,
  //     until,
  //     relativeTime: dateType
  //   })
  //   this.setState({
  //     usergroup
  //   })
  // }

  // onChangeCreateMethod = (e) => {
  //   let usergroup  = _.cloneDeep(this.state.usergroup)
  //   usergroup.params.createMethod = e.target.value
  //   this.setState({usergroup})
  // }

  onReCompute = () => {
    let usergroup = _.cloneDeep(this.state.usergroup)
    usergroup.params.random = +new Date()
    this.setState({usergroup}, this.submit)
  }

  validateDimValue = (filters) => {
    return filters.reduce((prev, f) => {
      let {value, filters, dimension, action} = f
      if (filters) {
        prev = prev && filters.length && this.validateDimValue(filters)
        return prev
      }
      prev = prev && bool(dimension) && bool(value, action)
      return prev
    }, true)
  }

  //todo better validate
  validate = () => {
    let {projectCurrent} = this.props
    let {usergroup} = this.state
    usergroup = _.cloneDeep(usergroup)
    let {title, params} = usergroup
    let {relatedBehaviorProjectId, relatedUserTagProjectId, composeInstruction} = params
    
    title = _.trim(title)

    if (!title) {
      message.error('基础信息：请填写标题', 5)
      return false
    }

    for (let i = composeInstruction.length - 1; i >= 0; i --) {
      let {type, config: params} = composeInstruction[i]
      type = type
      if (type === UserGroupFilterTypeEnum.behaviorFilter) {
        if (projectCurrent.access_type === AccessDataType.Tag && !relatedBehaviorProjectId) {
          message.warn('行为筛选：请先关联行为项目再设置行为筛选')
          return false
        }
        let errs2 = params.measure.filters.reduce((p, F) => {
          return F.filters.reduce((prev, f) => {
            return prev && bool(f.value) &&
              (f.filters ? f.filters.map(ff => ff.value).join('') : true)
          }, true)
        }, true)
  
        if(!errs2) {
          message.error('行为筛选：未设定用户行为筛选或用户行为筛选值', 10)
          return false
        }
  
        let errs3 = params.measure3.filters.reduce((p, F) => {
          return F.filters.reduce((prev, f) => {
            return prev && bool(f.value) && bool(f.measure)
          }, true)
        }, true)
  
        if(!errs3) {
          message.error('行为筛选：未设定指标筛选或指标筛选值', 10)
          return false
        }
  
        let errs1 = this.validateDimValue(params.dimension.filters)
  
        if(!errs1) {
          message.error('行为筛选：未正确设定条件筛选或者条件筛选值', 5)
          return false
        }
  
        if (
          !params.measure.filters.length &&
          !params.dimension.filters.length &&
          !params.measure3.filters.length
        ) {
          message.error('行为筛选：请至少设定一个用户行为筛选或者条件筛选', 10)
          return false
        }
      }

      if (type === UserGroupFilterTypeEnum.userTagFilter) {
        if (projectCurrent.access_type !== AccessDataType.Tag && !relatedUserTagProjectId) {
          message.warn('标签筛选：请先关联标签项目再设置标签筛选')
          return false
        }
        let ugTagFilters = _.get(params, 'tagFilters') || []
        let {tagFilters} = tagFiltersAdaptToOldFormat(ugTagFilters)
        if (_.size(tagFilters) < 1) {
          message.error('标签筛选：请至少设定一个用户行为筛选或者条件筛选', 10)
          return false
        }
      }

      if (type === UserGroupFilterTypeEnum.userGroupFilter) {
        let {usergroupFilterTargets, usergroupFilterStrategy, uploadedUserGroup, uploadResult} = params
        if (usergroupFilterStrategy === UsergroupFilterStrategyEnum.byUpload && _.isEmpty(uploadResult) && !uploadedUserGroup) {
          message.warn('用户群筛选：请先上传用户群')
          return false
        }
        if (usergroupFilterStrategy === UsergroupFilterStrategyEnum.byExistingUserGroup && _.isEmpty(usergroupFilterTargets)) {
          message.warn('用户群筛选：请先选择用户群')
          return false
        }
        if (!usergroupFilterStrategy) {
          message.warn('用户群筛选：请先选择用户群来源')
          return false
        }
      }
    }

    return true
  }

  onChangeProp = (prop, e) => {
    let usergroup = _.cloneDeep(this.state.usergroup)
    usergroup[prop] = e.target.value.slice(0, maxDic[prop])
    this.setState({
      usergroup
    })
  }

  diff = (usergroup) => {
    let {id} = usergroup
    let old = _.find(this.props.usergroups, {id}) || {}
    return Object.keys(usergroup).reduce((prev, k) => {
      let v = usergroup[k]
      let v2 = old[k]
      if (!_.isEqual(v, v2)) {
        prev[k] = v
      }
      return prev
    }, {})
  }

  submit = (e) => {
    e && e.preventDefault()

    let pass = this.validate()
    if (!pass) return
    let {projectCurrent, getUsergroups} = this.props
    let { usergroup: ug } = this.state
    let usergroup = _.cloneDeep(ug)
    let { params } = usergroup
    if (projectCurrent.access_type === AccessDataType.Tag) {
      usergroup = immutateUpdate(usergroup, 'params.openWith', () => 'tag-dict')
    }

    if (_.isEmpty(params.composeInstruction)) {
      return message.error('请添加创建规则')
    }
    
    if (_.some(params.composeInstruction, ci => ci.type === UserGroupFilterTypeEnum.userGroupFilter && ci.config.usergroupFilterStrategy === UsergroupFilterStrategyEnum.byUpload)) {
      usergroup.params.composeInstruction = params.composeInstruction.map( ci => {
        if (ci.type === UserGroupFilterTypeEnum.userGroupFilter) {
          ci.config.usergroupIds = ci.config.usergroupIds || ci.config.uploadResult
        }
        ci.config = _.omit(ci.config, 'uploadResult')
        return ci
      }) 
    }
    let cb = res => {
      if (res) {
        message.success('更新成功', 5)
        getUsergroups()
      }
      this.setState({isSavingUserGroup: false})
    }

    let cb1 = res => {
      if (res) {
        let usergroup = res.result
        message.success('添加分群成功', 5)
        getUsergroups()
        browserHistory.push(`/console/usergroup/${usergroup.id}`)
      }
      this.setState({isSavingUserGroup: false})
    }

    if (_.startsWith(usergroup.id, 'temp')) {
      usergroup = _.omit(usergroup, 'id')
    }
    if (usergroup.id) {
      let diff = this.diff(usergroup)
      this.props.updateUsergroup(usergroup.id, diff, cb)
    } else {
      this.props.addUsergroup(usergroup, cb1)
    }
  }

  delUsergroup = usergroup => {
    this.props.delUsergroup(usergroup)
  }

  getLinkFromReferer = link => {
    return link.indexOf('slice') > -1
      ? '/console'
      : '/console/funnel'
  }

  renderRelatedFunnel = params => {
    return params.funnelId && canVisitFunnel
      ? <Link to={`/console/funnel/${params.funnelId}`}>
        <Tooltip
          title="这个分群由漏斗流失分析创建，点击查看关联的漏斗"
          placement="bottomRight"
        >
          <Button type="ghost" icon={<FilterOutlined />} className="mg1l">查看关联漏斗</Button>
        </Tooltip>
      </Link>
      : null;
  }

  renderRefLink = params => {
    let {
      backToRefererTitle,
      backToRefererHint,
      refererLink
    } = params

    return backToRefererTitle && checkPermission(this.getLinkFromReferer(refererLink))
      ? <Link to={refererLink}>
        <Tooltip
          title={backToRefererHint}
          placement="bottomRight"
        >
          <Button type="ghost" icon={<FilterOutlined />} className="mg1l">{backToRefererTitle}</Button>
        </Tooltip>
      </Link>
      : null;
  }

  renderAddBtn = (params) => {
    return (canAdd && params.md5) || (canEdit && !params.md5 && !params.tagFilters)
      ? <Button
        type="ghost"
        icon={<CheckCircleOutlined />}
        className="mg1l"
        size="default"
        onClick={this.submit}
        >
        {params.md5 ? '保存为分群' : '更新'}
      </Button>
      : null;
  }

  renderDelBtn = params => {
    let {usergroup} = this.state
    return params.md5 || !canDel
      ? null
      : <Popconfirm
        title={`确定删除用户分群 "${usergroup.title}" 么？`}
        placement="topLeft"
        onConfirm={() => this.delUsergroup(usergroup)}
      >
        <Button type="ghost"  icon={<CloseOutlined />} className="mg1l" >删除</Button>
      </Popconfirm>;
  }

  renderReComputeBtn = () => {
    const {createMethod} = this.state.usergroup.params
    if (createMethod === 'by-upload') {
      return null
    }
    return (
      <Auth auth="app/usergroup/update">
        <Popover content="根据当前分群条件重新计算分群并保存当前分群条件" >
          <Button
            type="ghost"
            onClick={this.onReCompute}
            icon={<ReloadOutlined />}
            className="mg1r"
          >重新计算 <QuestionCircleOutlined /></Button>
        </Popover>
      </Auth>
    );
  }

  renderEditorBtns = () => {
    let urlParams = this.props.params
    let {usergroup} = this.state
    usergroup = _.cloneDeep(usergroup)
    const {params} = usergroup
    return (
      <FormItem wrapperCol={{ span: 18, offset: 3 }}>
        {this.renderReComputeBtn()}
        <Link to={`/console/usergroup/${urlParams.usergroupId}/users`}>
          <Button type="ghost" icon={<InfoCircleOutlined />}>用户详情</Button>
        </Link>
        {this.renderRelatedFunnel(params)}
        {this.renderRefLink(params)}
        {this.renderAddBtn(params, usergroup)}
        {this.renderDelBtn(params)}
      </FormItem>
    );
  }

  renderGroupBy = () => {
    const {datasourceCurrent} = this.props
    let {usergroup, dimensionTree} = this.state
    usergroup = _.cloneDeep(usergroup)
    const {params} = usergroup
    let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
    return (
      <FormItem
        {...formItemLayout}
        label="用户ID"
        required
      >
        <Select
          dropdownMatchSelectWidth={false}
          className="iblock width140"
          value={params.groupby}
          onChange={this.onPickGroupby}
          getPopupContainer={getPopupContainer}
        >
          {
            commonMetric.map(m => {
              let dim = dimensionTree[m] || {name: m}
              let {name, title} = dim
              return (
                <Option key={name + '@gy'} value={name}>
                  {title || name}
                </Option>
              )
            })
          }
        </Select>
      </FormItem>
    )
  }

  renderBehaviorFilterForm = () => {
    let {projectCurrent, projectLis, projectList} = this.props
    let {usergroup: preUsergroup, nowIdx: composeIdx} = this.state
    let usergroup = _.cloneDeep(preUsergroup)
    const {params} = usergroup
    let {relatedBehaviorProjectId} = params

    if (projectCurrent.access_type === AccessDataType.Tag && !relatedBehaviorProjectId) {
      return (
        <div className="pd3 aligncenter color-gray font16">
          请先关联行为项目再设置行为筛选
        </div>
      )
    }

    //usergroup传入前需要组装成旧结构
    let config = _.get(usergroup,`params.composeInstruction[${composeIdx}].config`)
    if (!config) return null
    usergroup.params = {
      ...usergroup.params,
      ...config
    }
    let behaviorProject = projectCurrent.access_type !== AccessDataType.Tag
      ? projectCurrent
      : _.find(projectList, {id: relatedBehaviorProjectId})
    return (
      <div className="pd2y pd3x ug-form">
        <Form className="clear">
          <BehaviorFilterEditor
            behaviorProject={behaviorProject}
            usergroup={usergroup}
            onUsergroupChange={nextUg => {
              let nextConfig = _.pick(nextUg.params, ['dimension', 'measure', 'measure3','relativeTime','since','until'])
              this.setState({usergroup: immutateUpdate(preUsergroup, `params.composeInstruction[${composeIdx}].config`, () => nextConfig)})
            }}
            getPopupContainer={getPopupContainer}
          />
        </Form>
      </div>
    )
  }

  getCurrentSelectedTags = () => {
    let { usergroup: ug }  = this.state
    let usergroup = _.cloneDeep(ug)
    let  { tags } = usergroup
    const { query = {} } = this.props.location || {}
    let { tags: initTags } = query
    if (_.isEmpty(tags) && !_.isEmpty(initTags)) {
      tags = [initTags]
      this.setState({
        usergroup: immutateUpdate(ug, 'tags', () => tags)
      })
    }
    return tags
  }

  renderUserGroupTagPicker = withDataSourceTagsDec(_.identity)(({dataSourceTags}) => {
    let { usergroup: ug }  = this.state
    let usergroup = _.cloneDeep(ug)
    const tags = this.getCurrentSelectedTags()
    return (
      <FormItem
        {...formItemLayout}
        label="分组"
      >
        <Select
          {...enableSelectSearch}
          dropdownMatchSelectWidth={false}
          className="iblock width140"
          allowClear
          placeholder="默认组"
          value={_.isEmpty(tags) ? undefined : tags[0]}
          onChange={nextTags => {
            this.setState({
              usergroup: immutateUpdate(ug, 'tags', () => [nextTags].filter(_.identity))
            })
          }}
          getPopupContainer={getPopupContainer}
        >
          {
            // 不能选择某些内置组，除非本身就属于该组
            [...UserGroupBuildInTags, ...dataSourceTags].map(m => {
              return (
                <Option disabled={m.allowSelect === false} key={m.id} value={m.id}>{m.name}</Option>
              )
            }).filter(dom => !dom.props.disabled || _.isEqual(tags && tags[0], dom.props.value))
          }
        </Select>
      </FormItem>
    )
  })

  renderBasicInfoForm = () => {
    const {datasourceCurrent, projectList = [], projectCurrent, usergroups} = this.props
    let {usergroup: ug, isSavingUserGroup} = this.state
    let usergroup = _.cloneDeep(ug)
    const { params } = usergroup
    let {
      relatedBehaviorProjectId, relatedUserTagProjectId, composeInstruction, updateStrategy,
      computeIntervalInfo, recomputeStrategy
    } = params
    const tags = this.getCurrentSelectedTags()
    let originalUg = usergroup.id && _.find(usergroups, ug => ug.id === usergroup.id) || null
    let dsId = _.get(datasourceCurrent, 'id') || ''

    // 可选的行为项目：行为项目：锁定自己。标签项目，只能关联 关联了此标签的行为项目
    let behaviorProjectOptions = projectCurrent.access_type !== AccessDataType.Tag
      ? projectList.filter(proj => proj.id === projectCurrent.id)
      : projectList.filter(proj => proj.access_type !== AccessDataType.Tag && proj.tag_datasource_name === projectCurrent.tag_datasource_name)
    // 可选的标签项目：行为项目，只能选择关联了的标签项目。标签项目：锁定自己
    let userTagProjectOptions = projectCurrent.access_type !== AccessDataType.Tag
      ? projectList.filter(proj => proj.access_type === AccessDataType.Tag && proj.tag_datasource_name === projectCurrent.tag_datasource_name)
      : projectList.filter(proj => proj.id === projectCurrent.id)
    return (
      <div className="pd2y pd3x ug-form">
        <Form onSubmit={this.submit} className="clear">
          <FormItem
            {...formItemLayout1}
            label="标题"
            required
          >
            <Input
              type="text"
              value={usergroup.title}
              onChange={e => this.onChangeProp('title', e)}
            />
          </FormItem>

          <FormItem
            {...formItemLayout1}
            label="备注"
          >
            <Input
              type="text"
              value={usergroup.description}
              onChange={e => this.onChangeProp('description', e)}
            />
          </FormItem>

          {this.renderGroupBy()}

          {this.renderUserGroupTagPicker({
            dataSourceId: dsId,
            doFetch: !!dsId,
            type: TagTypeEnum.user_group
          })}

          {window.sugo.userGroupsClustering
            ? null  // 禁用用户分群时这项不需要
            :<FormItem
              {...formItemLayout}
              label="关联行为项目"
              required={projectCurrent.access_type === AccessDataType.Tag
              && _.some(composeInstruction, ci => ci.type === UserGroupFilterTypeEnum.behaviorFilter)}
            >
              {_.isEmpty(behaviorProjectOptions)
                ? <div className="pd1 color-gray font14">如需关联行为项目，请到 <PermissionLink className="pointer" to="/console/project">项目管理</PermissionLink> 处，将行为项目关联到此标签项目</div>
                : (
                  <Select
                    {...enableSelectSearch}
                    dropdownMatchSelectWidth={false}
                    className="iblock width140"
                    allowClear
                    placeholder="请选择..."
                    value={projectCurrent.access_type !== AccessDataType.Tag ? projectCurrent.id : relatedBehaviorProjectId}
                    disabled={projectCurrent.access_type !== AccessDataType.Tag}
                    onChange={nextRelatedBehaviorProjId => {
                      let nextUg = immutateUpdates(ug,
                        'params.relatedBehaviorProjectId', () => nextRelatedBehaviorProjId,
                        'params.composeInstruction', arr => {
                          arr = arr.map( i => {
                            if (i.type.includes('behaviorFilter')) {
                              i.config = {
                                ...i.config,
                                ... _.pick(defaultParams(), ['relativeTime', 'since', 'until', 'measure', 'measure3', 'dimension', 'tagFilters', 'usergroupFilterTargets', 'usergroupFilterStrategy'])
                              }
                            }
                            return i
                          })
                          return arr
                        })
                      this.setState({
                        usergroup: nextUg
                      })
                    }}
                    getPopupContainer={getPopupContainer}
                  >
                    {
                    // 可选的行为项目：行为项目：锁定自己。标签项目，只能关联 关联了此标签的行为项目
                      behaviorProjectOptions.map(m => {
                        return (
                          <Option key={m.id} value={m.id}>{m.name}</Option>
                        )
                      })
                    }
                  </Select>
                )}

              {
                projectCurrent.access_type !== AccessDataType.Tag || !relatedBehaviorProjectId
                  ? null
                  : this.renderUserIdDimCheckerForBehaviorProject(
                    (() => {
                      const relatedBehaviorDataSourceId = _(projectList).chain()
                        .find(p => p.id === relatedBehaviorProjectId)
                        .get('datasource_id')
                        .value()
                      return {
                        dataSourceId: relatedBehaviorDataSourceId,
                        doFetch: !!relatedBehaviorDataSourceId,
                        exportNameDict: true
                      }
                    })()
                  )
              }
            </FormItem>
          }
          <FormItem
            {...formItemLayout}
            label="关联标签项目"
            required={projectCurrent.access_type !== AccessDataType.Tag
              && _.some(composeInstruction, ci => ci.type === UserGroupFilterTypeEnum.userTagFilter)}
          >
            {_.isEmpty(userTagProjectOptions)
              ? <div className="pd1 color-gray font14">如需关联标签项目，请到 <PermissionLink className="pointer" to="/console/project">项目管理</PermissionLink> 处设置</div>
              : (
                <Select
                  {...enableSelectSearch}
                  dropdownMatchSelectWidth={false}
                  className="iblock width140"
                  allowClear
                  placeholder="请选择..."
                  value={projectCurrent.access_type === AccessDataType.Tag ? projectCurrent.id : relatedUserTagProjectId}
                  disabled={projectCurrent.access_type === AccessDataType.Tag
                  /* 用户群已经关联过标签项目：项目已经关联过标签项目，则不能修改，否则可以修改 */
                  || (_.get(originalUg, 'params.relatedUserTagProjectId') && projectCurrent.tag_datasource_name)
                  /* 新建分群时，如果项目关联了标签项目，则不能修改 */
                  || (relatedUserTagProjectId && projectCurrent.tag_datasource_name)
                  }
                  onChange={nextRelatedUserTagProjId => {
                    this.setState({
                      usergroup: immutateUpdates(ug,
                        'params.relatedUserTagProjectId', () => nextRelatedUserTagProjId,
                        'params.tagFilters', () => [])
                    })
                  }}
                  getPopupContainer={getPopupContainer}
                >
                  {
                    // 可选的标签项目：行为项目，只能选择关联了的标签项目。标签项目：锁定自己
                    userTagProjectOptions.map(m => {
                      return (
                        <Option key={m.id} value={m.id}>{m.name}</Option>
                      )
                    })
                  }
                </Select>
              )}
            {
              projectCurrent.access_type === AccessDataType.Tag || !relatedUserTagProjectId
                ? null
                : this.renderUserIdDimCheckerForUserTagProject(
                  (() => {
                    const relatedUserTagDataSourceId = _(projectList).chain()
                      .find(p => p.id === relatedUserTagProjectId)
                      .get('datasource_id')
                      .value()
                    return {
                      dataSourceId: relatedUserTagDataSourceId,
                      doFetch: !!relatedUserTagDataSourceId,
                      exportNameDict: true,
                      datasourceType: DimDatasourceType.tag
                    }
                  })()
                )
            }
          </FormItem>

          <FormItem
            {...formItemLayout1}
            label="更新时间"
          >
            <RadioGroup
              onChange={ev => {
                let nextRecomputeStrategy = ev.target.value
                this.setState({
                  usergroup: immutateUpdate(ug, 'params.recomputeStrategy', () => nextRecomputeStrategy)
                })
              }}
              value={recomputeStrategy || UsergroupRecomputeStrategyEnum.byHand}
            >
              {_.keys(UsergroupRecomputeStrategyEnum).map(k => {
                return (
                  <Radio value={k} key={k}>{UsergroupRecomputeStrategyTranslation[k]}</Radio>
                )
              })}
            </RadioGroup>
            <div
              className="mg1t"
              style={{marginLeft: recomputeStrategy === UsergroupRecomputeStrategyEnum.byInterval ? '90px' : '0px'}}
            >
              {recomputeStrategy === UsergroupRecomputeStrategyEnum.byInterval ? (
                <CronPicker
                  getPopupContainer={getPopupContainer}
                  value={computeIntervalInfo}
                  onChange={nextComputeIntervalInfo => {
                    this.setState({
                      usergroup: immutateUpdate(ug, 'params.computeIntervalInfo', () => nextComputeIntervalInfo)
                    })
                  }}
                />
              ) : (
                usergroup.id
                  ? (
                    <Button
                      type="ghost"
                      onClick={this.onReCompute}
                      icon={<ReloadOutlined />}
                      className="mg1r"
                      disabled={!canEdit}
                      loading={isSavingUserGroup}
                    >重新计算 {canEdit ? '' : '（无权限）'}</Button>
                  ) : <div className="color-grey font16 pd2x pd1y ">用户群未保存，无法计算</div>
              )}
            </div>
          </FormItem>

          <FormItem
            {...formItemLayout1}
            label="更新方式"
          >
            <RadioGroup
              onChange={ev => {
                let nextUpdateStrategy = ev.target.value
                this.setState({
                  usergroup: immutateUpdate(ug, 'params.updateStrategy', () => nextUpdateStrategy)
                })
              }}
              value={updateStrategy || UsergroupUpdateStrategyEnum.replace}
            >
              {_.keys(UsergroupUpdateStrategyEnum).map(k => {
                return (
                  <Radio value={k} key={k}>{UsergroupUpdateStrategyTranslation[k]}</Radio>
                )
              })}
            </RadioGroup>
          </FormItem>
        </Form>
      </div>
    );
  }

  renderUserIdDimCheckerForBehaviorProject = withDbDims(_.identity)(({isFetchingDataSourceDimensions, dimNameDict}) => {
    let {usergroup, dimensionTree} = this.state
    usergroup = _.cloneDeep(usergroup)
    let groupBy = _.get(usergroup, 'params.groupby')

    let groupByDim = _.get(dimensionTree, [groupBy]) || {name: groupBy}

    if (groupBy in dimNameDict || isFetchingDataSourceDimensions) {
      return null
    }
    const dimName = groupByDim.title && groupByDim.title !== groupBy ? `${groupBy}（${groupByDim.title}）` : groupBy
    return (
      <Alert
        message={`此行为项目不存在用户ID维度 ${dimName}，行为筛选的计算结果将会为空`}
        type="error"
      />
    )
  })

  renderUserIdDimCheckerForUserTagProject = withDbDims(_.identity)(({isFetchingDataSourceDimensions, dimNameDict}) => {
    let {usergroup, dimensionTree} = this.state
    usergroup = _.cloneDeep(usergroup)
    let groupBy = _.get(usergroup, 'params.groupby')

    let groupByDim = _.get(dimensionTree, [groupBy]) || {name: groupBy}

    if (groupBy in dimNameDict || isFetchingDataSourceDimensions) {
      return null
    }
    const dimName = groupByDim.title && groupByDim.title !== groupBy ? `${groupBy}（${groupByDim.title}）` : groupBy
    return (
      <Alert
        message={`此标签项目不存在用户ID维度 ${dimName}，标签筛选的计算结果将会为空`}
        type="error"
      />
    )
  })

  renderUserTagFilterForm = () => {
    let {projectCurrent, projectList} = this.props
    let {usergroup: preUsergroup, editingUserGroupFilterType, nowIdx: composeIdx} = this.state
    let usergroup = _.cloneDeep(preUsergroup)
    let {relatedUserTagProjectId} = usergroup.params
    if (projectCurrent.access_type !== AccessDataType.Tag && !relatedUserTagProjectId) {
      return (
        <div className="pd3 aligncenter color-gray font16">
          请先关联标签项目再设置标签筛选
        </div>
      )
    }
    let tagProject = projectCurrent.access_type === AccessDataType.Tag
      ? projectCurrent
      : _.find(projectList, {id: relatedUserTagProjectId})

    let config = usergroup.params.composeInstruction[composeIdx].config
    usergroup.params = {
      ...usergroup.params,
      ...config
    }

    return (
      <div className="pd2y pd3x ug-form">
        <Form>
          <FormItem
            {...formItemLayout}
            label="标签筛选条件"
          >
            <TagFilterEditor
              tagProject={tagProject}
              usergroup={usergroup}
              onUsergroupChange={nextUg => {
                let nextConfig = _.pick(nextUg.params, ['tagFilters'])
                this.setState({usergroup: immutateUpdate(preUsergroup, `params.composeInstruction[${composeIdx}].config`, () => nextConfig)})
              }}
            />
          </FormItem>
        </Form>
      </div>
    )
  }

  renderUserGroupFilterForm = () => {
    let {datasourceCurrent, projectList} = this.props
    let {usergroup: preUsergroup, hasUpload, nowIdx: composeIdx } = this.state
    let usergroup = _.cloneDeep(preUsergroup)
    let config = usergroup.params.composeInstruction[composeIdx].config
    usergroup.params = {
      ...usergroup.params,
      ...config
    }
    let uploadResult = config.uploadResult

    //此时 get里面的usergroup是重组过的 所以这步需要放下面
    let {usergroupFilterTargets, usergroupFilterStrategy} = _.get(usergroup, 'params')

    return (
      <div className="pd2y pd3x ug-form">
        <Form className="clear">
          <FormItem {...formItemLayout} label="用户群来源">
            <RadioGroup
              onChange={ev => {
                let nextUsergroupFilterStrategy = ev.target.value
                let nextConfig = immutateUpdates(config,'usergroupFilterStrategy', () => nextUsergroupFilterStrategy)
                this.setState({
                  usergroup: immutateUpdate(preUsergroup, `params.composeInstruction[${composeIdx}].config`, () => nextConfig)
                })
              }}
              value={usergroupFilterStrategy || UsergroupFilterStrategyEnum.byExistingUserGroup}
            >
              {_.keys(UsergroupFilterStrategyEnum).map(k => {
                return (
                  <RadioButton value={k} key={k}>{UsergroupFilterStrategyTranslation[k]}</RadioButton>
                )
              })}
            </RadioGroup>
          </FormItem>

          {usergroupFilterStrategy === UsergroupFilterStrategyEnum.byUpload
            ? (
              <UsergroupUpload
                usergroup={usergroup}
                formItemLayout={formItemLayout1}
                onChangeUploadResult={this.onChangeUploadResult}
                uploadResult={uploadResult}
                uploadedUserGroup={config.uploadedUserGroup}
                hasUpload={hasUpload}
              />
            )
            : (
              <FormItem {...formItemLayout} label="目标用户群">
                <UserGroupSelector
                  className="width300"
                  datasourceCurrent={datasourceCurrent}
                  projectList={projectList}
                  userGroupFilter={dbUg => dbUg.id !== usergroup.id}
                  showBuildInUserGroups={false}
                  value={_.isEmpty(usergroupFilterTargets) ? '' : usergroupFilterTargets[0]}
                  onChange={targetUg => {
                    let nextConfig = immutateUpdates(config,
                      'usergroupFilterTargets', () => [targetUg.id].filter(_.identity),
                      'usergroupFilterStrategy', () => UsergroupFilterStrategyEnum.byExistingUserGroup
                    )
                    
                    this.setState({
                      usergroup: immutateUpdates(preUsergroup,
                        `params.composeInstruction[${composeIdx}].config`, () => nextConfig)
                    })
                  }}
                />
              </FormItem>
            )}

        </Form>
      </div>
    )
  }

  renderRightPart = () => {
    let {editingUserGroupFilterType} = this.state
    editingUserGroupFilterType = editingUserGroupFilterType.substr(0, editingUserGroupFilterType.length - 1)
    const title = editingUserGroupFilterType in UserGroupFilterTypeEnum
      ? UserGroupFilterTypeTranslation[editingUserGroupFilterType]
      : '基本信息'
    const filterType = editingUserGroupFilterType
    return (
      <Card
        title={title}
        className="height-100 usergroup-form-card"
        bordered={false}
      >
        {filterType === UserGroupFilterTypeEnum.behaviorFilter
          ? this.renderBehaviorFilterForm()
          : filterType === UserGroupFilterTypeEnum.userTagFilter
            ? this.renderUserTagFilterForm()
            : filterType === UserGroupFilterTypeEnum.userGroupFilter
              ? this.renderUserGroupFilterForm()
              : this.renderBasicInfoForm()}
      </Card>
    )
  }

  renderAppendFilterTypeBtn = () => {
    let {usergroup, maxLength} = this.state
    usergroup = _.cloneDeep(usergroup)
    let composeInstruction = _.get(usergroup, 'params.composeInstruction') || []
    if (composeInstruction.length === maxLength) {
      return null
    }

    let tags = _.get(usergroup, 'tags', [])
    let isFilteredResultAsUserGroup = tags.includes(UserGroupBuildInTagEnum.UserTagFilteredResultAsUserGroup)
    let isUserGroupFilter = tags.includes(UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup)
    if ((isFilteredResultAsUserGroup || isUserGroupFilter) && composeInstruction.length >= 1) {
      return null
    }

    const menu = (
      <Menu
        onClick={({key}) => {
          let preAppend = {}
          let defaultParams0 = defaultParams()

          //此处不需要减一 因为还没push
          let nowIdx = composeInstruction.length

          //TODO 改回 === 常数
          if (key.includes('behaviorFilter')) {
            preAppend = {
              type: key,
              op: UserGroupSetOperationEnum.union,
              config:  _.pick(defaultParams0, ['relativeTime', 'since', 'until', 'measure', 'measure3', 'dimension', 'tagFilters', 'usergroupFilterTargets', 'usergroupFilterStrategy'])
            }
          } else if (key.includes('userTagFilter')) {
            preAppend = {
              type: key,
              op: UserGroupSetOperationEnum.union,
              config:  _.pick(defaultParams0, ['tagFilters'])
            }
          } else if (key.includes('userGroupFilter')) {
            preAppend = {
              type: key,
              op: UserGroupSetOperationEnum.union,
              config:  {
                ..._.pick(defaultParams0, ['usergroupFilterTargets', 'usergroupFilterStrategy']),
                uploadResult: []
              }
            }
          }

          this.setState({
            editingUserGroupFilterType: key,
            nowIdx,
            usergroup: immutateUpdate(usergroup, 'params.composeInstruction', arr => {
              return [...(arr || []), preAppend]
            })
          })
        }}
      >
        { _.keys(UserGroupFilterTypeEnum).filter( filterType => {
          if (isFilteredResultAsUserGroup && filterType !== UserGroupFilterTypeEnum.userTagFilter) {
            return false
          } else if (isUserGroupFilter && filterType !== UserGroupFilterTypeEnum.behaviorFilter) {
            return false
          } else if(window.sugo.userGroupsClustering && filterType !== 'userTagFilter') {
            return null
          } else {
            return true
          }
        }).map( (filterType, idx) => {
          return (
            <Menu.Item
              filter-type={UserGroupFilterTypeEnum[filterType]}
              key={`${UserGroupFilterTypeEnum[filterType]}`}
            >
              {UserGroupFilterTypeTranslation[filterType]}
            </Menu.Item>
          )
        })}
      </Menu>
    )
    return (
      <Dropdown overlay={menu} trigger={['click']}>
        <Button
          icon={<PlusCircleOutlined />}
          className="width150"
          type="primary"
          style={{marginTop: '20px'}}
        >添加创建规则</Button>
      </Dropdown>
    );
  }

  renderFilterSwitcherPanel = () => {
    let {usergroup, editingUserGroupFilterType, isSavingUserGroup, nowIdx} = this.state
    usergroup = _.cloneDeep(usergroup)
    let composeInstruction = _.get(usergroup, 'params.composeInstruction') || []
    return (
      <div style={{padding: '0 10px', height: '100%', overflowY: 'scroll'}}>
        <div style={{lineHeight: '32px', padding: '10px 0'}} className="borderb">
          {usergroup.id ? usergroup.title : '新建用户分群'}
        </div>

        <div className="aligncenter" style={{marginTop: '40px'}}>
          {usergroup.id && !_.startsWith(usergroup.id, 'temp_')
            ? (
              <React.Fragment>
                <Button
                  type="ghost"
                  icon={<CheckOutlined />}
                  onClick={this.submit}
                  disabled={!canEdit}
                  loading={isSavingUserGroup}
                >更新{canEdit ? '' : '（无权限）'}</Button>

                <Popconfirm
                  title={`确定删除用户分群 "${usergroup.title}" 么？`}
                  placement="topLeft"
                  onConfirm={() => this.delUsergroup(usergroup)}
                >
                  <Button
                    type="ghost"
                    icon={<CloseOutlined />}
                    className="mg2l"
                    disabled={!canDel}
                  >删除{canDel ? '' : '（无权限）'}</Button>
                </Popconfirm>
              </React.Fragment>
            )
            : (
              <Button
                type="ghost"
                icon={<CheckOutlined />}
                onClick={this.submit}
                loading={isSavingUserGroup}
              >保存{canAdd ? '' : '（无权限）'}</Button>
            )}
        </div>

        <div style={{padding: '70px 7% 0px'}} className="usergroup-filter-type-switcher">
          <Button
            type={!editingUserGroupFilterType ? 'primary' : 'ghost'}
            style={{
              marginBottom: '20px',
              height: 48,
              fontSize: '16px',
              backgroundColor: editingUserGroupFilterType ? '#e6e6e6' : undefined
            }}
            className="width-100"
            onClick={() => {
              this.setState({editingUserGroupFilterType: '', nowIdx: ''})
            }}
          >设置基础信息</Button>

          {interpose((dom, idx) => {
            let composeInst = composeInstruction[idx + 1]
            if (!composeInst) {
              return null
            }
            return (
              <div key={idx} className="aligncenter" style={{padding: '10px 0 5px'}}>
                <RadioGroup
                  className="block"
                  value={composeInst.op}
                  onChange={ev => {
                    let nextOp = ev.target.value
                    this.setState(prevState => {
                      return immutateUpdate(prevState, `usergroup.params.composeInstruction[${idx + 1}].op`, () => nextOp)
                    })
                  }}
                >
                  {_.keys(UserGroupSetOperationEnum).map(op => {
                    return (
                      <RadioButton
                        key={op}
                        value={UserGroupSetOperationEnum[op]}
                        className="font14"
                      >{UserGroupSetOperationTranslation[op]}</RadioButton>
                    )
                  })}
                </RadioGroup>

                <img
                  src={iconDownBlue}
                  style={{marginTop: '5px'}}
                />
              </div>
            )
          }, composeInstruction.map((composeInst, idx) => {
            let {type: key, op} = composeInst
            const filterType = key
            let selected = key + idx === editingUserGroupFilterType

            return (
              <div
                key={key + idx}
                className={classNames('border corner relative filter-type-item fpointer', {'active': selected})}
                style={{width: '100%', height: 48, lineHeight: '48px', padding: '0 0 0 5px'}}
                onClick={() => {
                  this.setState({editingUserGroupFilterType: key + idx, nowIdx: idx})
                }}
              >
                <div
                  className={classNames('iblock corner font16 line-height24 color-white', {
                    'bg-purple': selected,
                    'bg-be': !selected
                  })}
                  style={{width: 24, height: 24, padding: '0 4px'}}
                >{format02d(idx + 1)}</div>

                <div className="center-of-relative font16 elli">{`设置${UserGroupFilterTypeTranslation[filterType]}`}</div>

                <MinusCircleOutlined
                  className={classNames('font16 absolute vertical-center-of-relative', {'color-main': selected, 'color-bf': !selected})}
                  style={{right: '20px'}}
                  onClick={ev => {
                    ev.stopPropagation()
                    this.setState({
                      usergroup: immutateUpdate(usergroup, 'params.composeInstruction', arr => {
                        return arr.filter((v, i) => i !== idx)
                      }),
                      editingUserGroupFilterType: selected ? '' : editingUserGroupFilterType,
                      nowIdx: idx
                    })
                  }} />
              </div>
            );
          }))}

          <div className="aligncenter">
            {this.renderAppendFilterTypeBtn()}
          </div>

        </div>
      </div>
    );
  }

  renderMainContent = () => {
    return (
      <HorizontalSplitHelper className="contain-docs-analytic" style={{height: 'calc(100% - 44px)'}}>
        <div
          defaultWeight={5}
          className="height-100"
          style={{padding: '10px 5px 10px 10px'}}
        >
          <div className="bg-white height-100 corner">
            {this.renderFilterSwitcherPanel()}
          </div>
        </div>
        <div
          defaultWeight={13}
          className="height-100"
          style={{padding: '10px 10px 10px 5px'}}
        >
          <div className="height-100 corner bg-white">
            {this.renderRightPart()}
          </div>
        </div>
      </HorizontalSplitHelper>
    )
  }

  render () {
    return this.renderMainContent()
  }
}
