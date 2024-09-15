/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import {browserHistory} from 'react-router'
import { validateFieldsAndScroll } from 'client/common/decorators'
import { connect } from 'react-redux'
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Row, Col, Select, InputNumber, Alert, message } from 'antd';
import Link from '../Common/link-nojam'
import _ from 'lodash'
import './css.styl'
import LifeStageInput from './life-stage-input'
import { defaultStages } from './store/constants'
import { namespace } from './store/life-cycle-form'
import {AccessDataType, DimDatasourceType, UsergroupFilterStrategyEnum, UserGroupFilterTypeEnum, UsergroupUpdateStrategyEnum, UsergroupRecomputeStrategyEnum, UserGroupBuildInTagEnum} from '../../../common/constants'
import {enableSelectSearch} from 'client/common/antd-freq-use-props'
import * as lifeCycleService from '../../services/life-cycle'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {Auth, checkPermission, PermissionLink} from '../../common/permission-control'
import {immutateUpdate, immutateUpdates} from '../../../common/sugo-utils'
import {urlBase, canSetDataSource, dsSettingPath, bool} from '../Usergroup/constants'
import { defaultParams } from '../Usergroup/usergroup-form'
import { defaultMeasure } from './store/constants'
import {tagFiltersAdaptToOldFormat} from '../../../common/param-transform'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 10 }
}

const queryData = {
  limit: 999
}

const {dataConfig} = window.sugo

function equals(v1, v2) {
  if (typeof v1 === 'undefined' && typeof v2 === 'undefined') return false
  else if (!v1 && !v2) return true
  return v1 === v2
}

const getPopupContainer = () => document.querySelector('.life-cycle-form-body')

@connect(state => ({
  ...state[namespace],
  ...state['common'],
  ...state['sagaCommon']
}))
/*@withDbDims(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    datasourceType: DimDatasourceType.tag
  }
})*/
@Form.create()
@validateFieldsAndScroll
export default class LifeCycleForm extends Component {

  constructor(props) {
    super(props)
    this.state = {
      usergroupHelper: this.createUsergroupHelper(props),
      isSavingUserGroup: false
    }
  }

  UNSAFE_componentWillMount() {
    let {lifeCycleId} = this.props.params
    let {usergroups, datasourceCurrent} = this.props
    if (lifeCycleId) {
      this.dispatch('fetchLifeCycle')
    } else if (!_.isEmpty(datasourceCurrent)) {
      this.setState({
        usergroupHelper: this.createUsergroupHelper()
      })
      this.dispatch('createUsergroup', { datasourceCurrent })
    }
    this.getDimensions(datasourceCurrent.id)
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    let nid = nextProps.datasourceCurrent.id
    let cid = this.props.datasourceCurrent.id

    const { projectCurrent } = this.props
    if (!_.isEmpty(projectCurrent.id) && projectCurrent.id !== nextProps.projectCurrent.id) {
      this.getDimensions(nid)
      return browserHistory.push('/console/life-cycle')
    } 

    if (nid !== cid && !cid) {
      this.dispatch('createUsergroup', { datasourceCurrent: nextProps.datasourceCurrent })
      this.getDimensions(nid)
    }

    let oldUsergroup = this.state.usergroupHelper
    if ( nid !== cid && cid) {
      return this.pickDatasource(nextProps)
    }
    let {usergroupId} = _.get(nextProps,'params',{})
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
    } else if (usergroupId !== _.get(this.props,'params.usergroupId'))  {
      this.getDatas()
    }
  }

  async getDimensions(druid_datasource_id) {
    const res = await lifeCycleService.getDimensions(druid_datasource_id, {limit: 999})
    this.changeProps({
      dimensionTree: _.keyBy(res && res.data, 'name')
    })
  }

  changeProps(payload) {
    this.props.dispatch({
      type: `${namespace}/setState`,
      payload
    })
  }

  dispatch(func, payload = {}) {
    this.props.dispatch({
      type: `${namespace}/${func}`,
      payload
    })
  }

  pickDatasource(nextProps) {
    let {usergroups, projectCurrent, projectList} = nextProps
    let {lifeCycleId} = _.get(nextProps,'params',{})
    let usergroupHelper = lifeCycleId && usergroups.length
    let usergroupId = ''
    //TODO usergroupId 从分群组里拉第一个
      ? _.find(usergroups, {id: usergroupId}) || ls.get(usergroupId)(this.state.usergroupHelper)
      : deepCopy(this.state.usergroupHelper)
    if (usergroupId && usergroupHelper) {
      return this.setState({usergroupHelper}, this.getDatas)
    } else if (usergroupId && !usergroupHelper) {
      return this.on404()
    }
    let {datasourceCurrent} = nextProps
    let {name, id} = nextProps.datasourceCurrent
    usergroupHelper.druid_datasource_id = id
    usergroupHelper.datasource_name = name
    _.set(
      usergroupHelper,
      'params.groupby',
      _.get(datasourceCurrent, 'params.commonMetric[0]') || ''
    )
    // _.set(usergroupHelper, 'params.dimension.filters', [])
    // _.set(usergroupHelper, 'params.measure.filters', [])
    // _.set(usergroupHelper, 'params.measure3.filters', [])

    let { tag_datasource_name } = projectCurrent
    // 如果当前项目设置了 tag_datasource_name，则标签项目必须关联到该数据源所指定的项目
    if (tag_datasource_name) {
      let proj = _.find(projectList, p => p.access_type === AccessDataType.Tag && p.tag_datasource_name === tag_datasource_name)
      if (proj) {
        usergroupHelper = immutateUpdate(usergroupHelper, 'params.relatedUserTagProjectId', () => proj.id)
      }
    }
    return this.setState({usergroupHelper}, this.getDatas)
  }

  initUsergroupData = (usergroups, usergroupId) => {
    let usergroupHelper = _.find(usergroups, {id: usergroupId}) || ls.get(usergroupId)
    if (!usergroupHelper) {
      return this.on404()
    }
    if (!usergroupHelper.params.measure3) {
      usergroupHelper.params.measure3 = defaultParams().measure3
    }
    this.setState({
      usergroupHelper
    }, this.getDatas)
  }

  initUsergroupEmptyData = (nextProps) => {
    let usergroupHelper = this.createUsergroupHelper(nextProps)
    this.setState({
      usergroupHelper
    }, this.getDatas)
  }

  getDatas = async () => {
    let {id: druid_datasource_id} = this.props.datasourceCurrent
    if(!druid_datasource_id) return
    this.setState({
      loadingDimension: true
    })
    let res = await lifeCycleService.getDimensions(druid_datasource_id, queryData)
    if (!res) {
      this.setState({ loadingDimension: false })
      return
    }
    await lifeCycleService.getMeasures(druid_datasource_id, queryData)

    this.setState({
      loadingDimension: false
    })
    this.changeProps({
      dimensionTree: _.keyBy(res && res.data, 'name')
    })
  }

  createUsergroupHelper(props = this.props) {
    let {datasourceCurrent, projectList, projectCurrent} = props
    let {id, name} = datasourceCurrent
    let groupby = _.get(props.datasourceCurrent, 'params.commonMetric[0]')
    let params = defaultParams(groupby)
    this.changeProps({groupby})

    let { tag_datasource_name } = projectCurrent
    // 如果当前项目设置了 tag_datasource_name，则标签项目必须关联到该数据源所指定的项目
    if (tag_datasource_name) {
      let proj = _.find(projectList, p => p.access_type === AccessDataType.Tag && p.tag_datasource_name === tag_datasource_name)
      if (proj) {
        params = immutateUpdate(params, 'relatedUserTagProjectId', () => proj.id)
        this.changeProps({relatedUserTagProjectId: proj.id})
      }
    }
    return {
      id: '',
      druid_datasource_id: id,
      datasource_name: name,
      params: params
    }
  }

  save = async () => {
    const baseData = await this.validateFieldsAndScroll()
    if (!baseData) return message.error('请填写完整的阶段名称和说明')

    this.changeProps({saving: true})
    let pass = this.validate()
    if (!pass) {
      this.changeProps({saving: false})
      return
    }

    let {projectCurrent, stageState, relatedBehaviorProjectId, relatedUserTagProjectId, updateHour} = this.props
    const { stages, userGroupByDimName: groupby } = baseData

    let tempStageState = _.cloneDeep(stageState)

    tempStageState = stages.map( (i, idx) => {

      const { stage: title, description } = i
      i.title = title
      i.description = description
      i.druid_datasource_id = tempStageState[idx].druid_datasource_id

      if (_.some(tempStageState[idx].params.composeInstruction, ci => ci.type === UserGroupFilterTypeEnum.userGroupFilter && ci.config.usergroupFilterStrategy === UsergroupFilterStrategyEnum.byUpload)) {
        tempStageState[idx].params.composeInstruction = tempStageState[idx].params.composeInstruction.map( ci => {
          if (ci.type === UserGroupFilterTypeEnum.userGroupFilter) {
            ci.config.usergroupIds = ci.config.usergroupIds || ci.config.uploadResult
          }
          ci.config = _.omit(ci.config, 'uploadResult')
          return ci
        }) 
      }

      // i = _.omit(i, 'id')
      //所属用户群分组
      i.tags = [UserGroupBuildInTagEnum.UserGroupWithLifeCycle]
      i.params = {
        ...tempStageState[idx].params,
        groupby,
        //按segment.service中逻辑 更新后替换原有用户群 不需要该项
        // updateStrategy: UsergroupUpdateStrategyEnum.replace,
        recomputeStrategy: UsergroupRecomputeStrategyEnum.byHand,
        relatedBehaviorProjectId,
        relatedUserTagProjectId,
        //TODO 更新时间
        computeIntervalInfo: {
          'cronExpression': `0 0 ${updateHour} * * *`
        }
      }
      return i
    })

    let lifeCycle = {
      stages: tempStageState,
      group_by_name: groupby,
      project_id: projectCurrent.id,
      relatedbehaviorprojectid:　relatedBehaviorProjectId,
      relatedusertagprojectid: relatedUserTagProjectId,
      trigger_timer: {
        updateHour
      }
    }

    //路由参数 有就是在修改操作
    const { lifeCycleId } = this.props.params
    if (lifeCycleId) {
      this.dispatch('updateLifeCycle', { lifeCycle, lifeCycleId })
    } else {
      this.dispatch('createLifeCycle', lifeCycle )
    }
    return
  }

  validate = () => {
    let {projectCurrent, stageState, relatedBehaviorProjectId, relatedUserTagProjectId} = this.props

    for (let i = stageState.length - 1; i >= 0; i --) {
      let usergroup = stageState[i]
      let composeInstruction = _.get(usergroup, 'params.composeInstruction', [])
      if (_.isEmpty(composeInstruction)) {
        message.error('有用户群没设置创建规则')
        return false
      }

      for (let j = composeInstruction.length - 1; j >= 0; j --) {
        let {type, config: params} = composeInstruction[j]
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
          let {usergroupFilterTargets, usergroupFilterStrategy, uploadResult, uploadedUserGroup} = params
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
  
    }
    return true
  }

  checkStagesHandler = (rule, value, callback)  => {
    if (_.some(value, o => o.stage.length > 4)) callback('阶段名称字数最多4个')
    if(_.some(value, o => !o.stage || !o.description)) {
      callback('请填写完整的阶段名称和说明')
      return
    }
    callback()
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

  renderGroupBy = () => {
    const { datasourceCurrent, dimensionTree, groupby } = this.props
    const { getFieldDecorator } = this.props.form
    let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
    return (
      <Form.Item
        label="用户ID"
        className="user-id-select"
        required
        {...formItemLayout}
      >
        {
          getFieldDecorator('userGroupByDimName', {
            initialValue: groupby
          }) (
            <Select
              dropdownMatchSelectWidth={false}
              className="iblock width140"
              onChange={(v) => {
                this.changeProps({groupby: v})
              }}
            >
              {
                commonMetric.map(m => {
                  let dim = dimensionTree[m] || {name: m}
                  let {name, title} = dim
                  return (
                    <Select.Option key={name + '@gy'} value={name}>
                      {title || name}
                    </Select.Option>
                  )
                })
              }
            </Select>
          )
        }
      </Form.Item>
    )
  }

  renderContactProject() {
    const { projectCurrent, projectList = [], relatedBehaviorProjectId, relatedUserTagProjectId, groupby, stageState } = this.props
    const {usergroupHelper} = this.state

    let composeInstructionArr = stageState.map( usergroup => _.get(usergroup, 'params.composeInstruction') || [])

    let behaviorProjectOptions = projectCurrent.access_type !== AccessDataType.Tag
      ? projectList.filter(proj => proj.id === projectCurrent.id)
      : projectList.filter(proj => proj.access_type !== AccessDataType.Tag && proj.tag_datasource_name === projectCurrent.tag_datasource_name)
    let userTagProjectOptions = projectCurrent.access_type !== AccessDataType.Tag
      ? projectList.filter(proj => proj.access_type === AccessDataType.Tag && proj.tag_datasource_name === projectCurrent.tag_datasource_name)
      : projectList.filter(proj => proj.id === projectCurrent.id)

    let originalUg = usergroupHelper.id && _.find(usergroups, ug => ug.id === usergroupHelper.id) || null
    return (
      <React.Fragment>
        <Form.Item
          {...formItemLayout}
          className="user-id-select"
          label="关联行为项目"
          required={projectCurrent.access_type === AccessDataType.Tag
            && _.some(composeInstructionArr, composeInstruction => _.some(composeInstruction, ci => ci.type === UserGroupFilterTypeEnum.behaviorFilter))}
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
                  this.changeProps({
                    relatedBehaviorProjectId: nextRelatedBehaviorProjId,
                    stageState: stageState.map( i => {
                      i.params.composeInstruction.map( j => {
                        if (j.type === UserGroupFilterTypeEnum.behaviorFilter) {
                          j.config = {
                            ...j.config,
                            ... _.pick(defaultParams(), ['relativeTime', 'since', 'until', 'measure', 'measure3', 'dimension', 'tagFilters', 'usergroupFilterTargets', 'usergroupFilterStrategy'])
                          }
                        }
                        return j
                      }) 
                      return i
                    }) 
                  })
                }}
                getPopupContainer={getPopupContainer}
              >
                {
                  // 可选的行为项目：行为项目：锁定自己。标签项目，只能关联 关联了此标签的行为项目
                  behaviorProjectOptions.map(m => {
                    return (
                      <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
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
        </Form.Item>

        <Form.Item
          {...formItemLayout}
          className="user-id-select"
          label="关联标签项目"
          required={projectCurrent.access_type !== AccessDataType.Tag
            && _.some(composeInstructionArr, composeInstruction => _.some(composeInstruction, ci => ci.AccessDataType === UserGroupFilterTypeEnum.userTagFilter))}
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
                  || Boolean((_.get(originalUg, 'params.relatedUserTagProjectId') && projectCurrent.tag_datasource_name))
                  /* 新建分群时，如果项目关联了标签项目，则不能修改 */
                  || Boolean((relatedUserTagProjectId && projectCurrent.tag_datasource_name))
                }
                onChange={nextRelatedUserTagProjId => {
                  this.changeProps({
                    relatedUserTagProjectId: nextRelatedUserTagProjId
                  })
                }}
                getPopupContainer={getPopupContainer}
              >
                {
                  // 可选的标签项目：行为项目，只能选择关联了的标签项目。标签项目：锁定自己
                  userTagProjectOptions.map(m => {
                    return (
                      <Select.Option key={m.id} value={m.id}>{m.name}</Select.Option>
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
        </Form.Item>
      </React.Fragment>
    )
  }

  renderUserIdDimCheckerForUserTagProject = withDbDims(_.identity)(({isFetchingDataSourceDimensions, dimNameDict}) => {
    let {usergroupHelper} = this.state
    let { dimensionTree, groupby: gB } = this.props
    let groupBy = gB || _.get(usergroupHelper, 'params.groupby')

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

  renderUserIdDimCheckerForBehaviorProject = withDbDims(_.identity)(({isFetchingDataSourceDimensions, dimNameDict}) => {
    let {usergroupHelper} = this.state
    let { dimensionTree } = this.props
    let groupBy = _.get(usergroupHelper, 'params.groupby')

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

  renderSettingGuide() {
    let {projectCurrent} = this.props
    return  (
      <div
        className="relative"
        style={{height: 'calc(100vh - 200px)'}}
      >
        <div className="center-of-relative aligncenter">
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <p className="font16 pd2y">
            要使用用户分群，请设置这个项目的
            <b className="color-red">用户ID</b>
          </p>
          <div>
            {
              canSetDataSource
                ? <Link to={`${dsSettingPath}?id=${projectCurrent.id}`}>
                  <Button type="primary">马上设置</Button>
                </Link>
                : null
            }
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { getFieldDecorator } = this.props.form
    const { updateHour, editUpdateHour, datasourceCurrent, stage, saving} = this.props
    if (!_.get(datasourceCurrent, 'params.commonMetric[0]')) {
      return this.renderSettingGuide()
    }

    return (
      <div className="life-cycle-form bg-white height-100 pd3">
        <div className="split-line" />
        <Row gutter={24}>
          <Col span={15}>
            <div>
              每天
              {
                editUpdateHour ? <InputNumber min={0} max={23} value={updateHour} onChange={(v) => this.changeProps({updateHour: v})}/> : updateHour
              }
              点更新各阶段人群数据
              <span className="mg2x">
                {
                  !editUpdateHour ?
                    <Button size="small" type="primary" onClick={() => this.changeProps({editUpdateHour: true})}>编辑</Button>
                    :   <Button size="small" type="primary" onClick={() => this.changeProps({editUpdateHour: false})}>确定</Button>
                }
              </span>
            </div>
            
            <div className="mg2 life-cycle-form-body">
              <Form>
                {this.renderGroupBy()}
                {this.renderContactProject()}
                <Form.Item>
                  {getFieldDecorator('stages', {
                    initialValue: stage, 
                    rules: [{ validator: this.checkStagesHandler }]
                  }) (
                    <LifeStageInput/>
                  )}
                </Form.Item>
              </Form>
            </div>
          </Col>
          <Col span={9} className="pd2">
            <div style={{marginTop: '100px'}}>
              <h4><QuestionCircleOutlined className="mg2r" />生命周期说明</h4>
            </div>
            <p>用户生命周期是指从一个用户开始对企业进行了解或企业欲对某一用户进行开发开始，直到用户与企业的业务关系完全终止且与之相关的事宜完全处理完毕的这段时间。</p>
            <p>在生命周期上用户关系的发展是分阶段的，用户关系的阶段划分是研究用户生命周期的基础。目前这方面已有较多的研究，大部分学者提出了用户关系发展的五阶段模型：</p>
            <p>阶段A:用户引入。通过有效渠道提供合适的价值定位促使新用户的转化。</p>
            <p>阶段B:用户提升。通过刺激需求的产品组合或服务组合把用户培养成高价值用户。</p>
            <p>阶段C:用户成熟。通过关怀策略使用户持续活跃，培养用户的忠诚度。</p>
            <p>阶段D:用户衰退。建立高危用户预警机制，延长用户的生命周期。</p>
            <p>阶段E:用户离网。该阶段主要是赢回用户。</p>
            <p>与之相关的营销学上，涉及的理论是CRM。根据该理论，可以采取科学的方法计算用户生命周期价值，进而进行企业经营决策的分析。</p>
          </Col>
          <Col span={12} className="alignright">
            <Button loading={saving} className="mg2x" onClick={() => history.go(-1)}>取消</Button>
            <Button loading={saving} type="primary" onClick={this.save}>保存</Button>
          </Col>
        </Row>
      </div>
    );
  }
}
