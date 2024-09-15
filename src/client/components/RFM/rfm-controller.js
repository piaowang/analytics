/**
 * Created on 15/03/2017.
 */

import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Button, message } from 'antd'
import { Link } from 'react-router'

import RFMEditor, { ParamsType } from './editor'
import Loading from '../../components/Common/loading'

import Fetch from '../../common/fetch-final'
import { Scene, RFM } from './interface'
import Active from './constants'
import {
  SceneType,
  UsergroupFilterStrategyEnum,
  UserGroupFilterTypeEnum,
  UserGroupSetOperationEnum
} from '../../../common/constants'

import { convertDateType } from 'common/param-transform'

import {
  getRFMUserGroupsTitle,
  getBaseQueryParams,
  getCustomQueryParams,
  stringToBase64,
  checkName,
  checkCustomParams
} from './model'
import { checkPermission } from '../../common/permission-control'

const canAdd = checkPermission('/console/rfm/:id/new')
/**
 * @param {RFMSlice} record
 * @return {string}
 */

class RFMController extends React.Component {
  
  static defaultProps = {
    model: 'info'
  }
  
  static propTypes = {
    model: PropTypes.string.isRequired
  }
  
  constructor (props, context) {
    super(props, context)
    this.__dimensions = false
    this.state = {
      project: {},
      scene: null,
      params: {
        type: ParamsType.Base,
        value: {
          [ParamsType.Base]: {
            R: 2,
            F: 2,
            M: 2
          },
          [ParamsType.Custom]: {
            R: [[0], [0]],
            F: [[0], [0]],
            M: [[0], [0]]
          }
        }
      },
      name: `${props.model === 'new' ? '新增' : ''}RFM客户细分`,
      RFMName: '',
      time: {
        dateType: ['startOf year', 'endOf year'],
        format: 'YYYY-MM-DD'
      },
      record: null,
      RFMResultList: [],
      Querying: false
    }
  }
  
  componentWillMount () {
    this.props.getProjects()
  }
  
  componentWillReceiveProps (nextProps) {
    const { projects } = nextProps
    if (projects.length > 0 && !this.__dimensions) {
      const { params:{ id, projectId }, model } = this.props
      const p = _.find(projects, { id: model === 'new' ? id : projectId })
      
      if (p) {
        this.__dimensions = true
        this.setState({ project: p })
        this.hooks.fetchDimensionsAndScene.call(this, p.datasource_id, p.id)
      }
    }
  }
  
  hooks = {
    
    updateRFMName(RFMName){
      this.setState({ RFMName })
    },
    
    updateCurrentProject(datasource_id, project_id){
      this.hooks.fetchDimensionsAndScene.call(this, datasource_id, project_id)
      this.setState({ project: _.find(this.props.projects, { id: project_id }) })
    },
    
    updateBaseParam(t, v){
      const { params:{ value } } = this.state
      const next = { ...value[t], ...v }
      const result = { ...value, ...{ [t]: next } }
      
      this.setState({ params: { type: t, value: result } })
    },
    
    updateCustomParam(props) {
      let { value, pos, index, name } = props
      
      const { params: { value: prev } } = this.state
      const next = prev[ParamsType.Custom][name].slice()
      const cur = next[pos]
      
      if (value === '') {
        value = 0
      }
      
      if (value < 0) {
        value = cur[index]
        message.destroy()
        message.error('不能为负数')
      }
      
      if (['R', 'F'].includes(name) && value !== ~~value) {
        value = cur[index]
        message.destroy()
        message.error('R与F的值不能为小数')
      }
      
      if (pos > 0) {
        const p = next[pos - 1]
        if (p[index] > value) {
          // cur[index] = p[index]
          // pos = next.length
          message.destroy()
          message.error('排后的值不能小于前面')
        }
      }
      
      // pos 之后的数都设置为当前值
      for (let len = next.length; pos < len; pos++) {
        next[pos][index] = value
      }
      
      return this.hooks.updateBaseParam.call(this, ParamsType.Custom, { [name]: next })
    },
    
    addCustomParam(name){
      const { params:{ type, value } } = this.state
      if (type !== ParamsType.Custom) return this
      
      const prev = value[ParamsType.Custom][name]
      
      if (prev.length >= 4) {
        return message.warn('最多只能创建四个分位条件')
      }
      
      const last = prev.slice(-1)[0]
      const next = prev.slice()
      next.push(last.slice())
      
      return this.hooks.updateBaseParam.call(this, ParamsType.Custom, { [name]: next })
    },
    
    removeCustomParam(props){
      const { pos, name } = props
      const { params: { value: prev } } = this.state
      const p = prev[ParamsType.Custom][name].slice()
      const next = p.filter((v, i) => i !== pos)
      
      const last = next[next.length - 1]
      const last_1 = next[next.length - 2]
      if (last_1) last[0] = last_1[0]
      return this.hooks.updateBaseParam.call(this, ParamsType.Custom, { [name]: next })
    },
    
    queryRFMResult () {
      if (this.state.Querying) return this
      
      const { project, scene, params:{ value, type }, time } = this.state
      const { dimensions } = this.props
      
      const dateRange = time.dateType === 'custom'
        ? time.dateRange
        : convertDateType(time.dateType, 'YYYY-MM-DD')
      
      const base = type === ParamsType.Base
      const params = base ? getBaseQueryParams(value[type]) : getCustomQueryParams(value[type])
      const [startDate, endDate] = dateRange
      
      if (!base && !checkCustomParams(params)) {
        return message.error('查询条件错误：排后的值不能小于前面')
      }
      
      /** @type {RFMQueryParams} */
      const QueryParams = {
        datasource: project.datasource_name,
        startDate,
        endDate,
        scene: {
          UserID: dimensions.find(d => d.id === scene.params.UserID).name,
          Price: dimensions.find(d => d.id === scene.params.Price).name,
          Date: dimensions.find(d => d.id === scene.params.Date).name
        },
        params
      }
      
      const url = type === ParamsType.Base ? RFM.RFMSliceDefault : RFM.REMSliceCustomized
      
      this.setState({ Querying: true })
      
      Fetch
        .connect(`${url}/${stringToBase64(JSON.stringify(QueryParams))}`, 'get', null, {
          credentials: 'omit', // 忽略cookie的发送
          headers: {}
        })
        .then(
          (res) => {
            if (!res) return this.setState({ Querying: false })
            const RFMResultList = res.groups
            if (!RFMResultList || RFMResultList.length === 0) {
              message.info('没有数据，请扩大时间范围试试')
              return this.setState({ Querying: false })
            }
            // 最长取64个 4*4*4
            this.setState({ RFMResultList: RFMResultList.slice(0, 64), Querying: false })
          },
          (err) => {
            message.error(err)
            this.setState({ Querying: false })
          }
        )
    },
    
    saveRFM () {
      const { params, params: { value, type }, RFMName, project, time, record } = this.state
      
      if (!checkName(RFMName)) return message.error('RFM名称长度为2~32位')
      if (!checkCustomParams(getCustomQueryParams(value[ParamsType.Custom]))) {
        return message.error('排后的值不能小于前面')
      }
      
      const { model } = this.props
      const created = model === 'new'
      
      Fetch
        .post(created ? RFM.create : RFM.update, {
          id: created ? void 0 : record.id,
          project_id: project.id,
          name: RFMName,
          params: { ...params, time }
        })
        .then(res => {
          if (!res) return this
          const ret = res.result
          if (!ret.success) return message.warn(ret.message)
          
          message.success(`${created ? '创建' : '更新'}成功`)
          
          if (created) {
            location.href = `/console/rfm/${ret.result.project_id}/${ret.result.id}/info`
          }
          
          this.setState({ record: { ...record, ...ret.result } })
        })
    },
    
    deleteRFM () {
      const { record } = this.state
      if (!record.id) return message.error('没有记录或数据异常')
      Fetch.get(RFM.del, { id: record.id })
        .then(res => {
          if (!res) return this
          if (!res.result.success) return message.error(res.result.message)
          message.success(`删除${record.name}成功`)
          location.href = '/console/rfm'
        })
    },
    
    addToUserGroup(record){
      const { userIdList } = record
      
      if (!userIdList || userIdList.length === 0)
        return message.warn('该组用户数为0，不能创建用户分群')
      
      const { project, time } = this.state
      const { dataConfig } = window.sugo
      
      const dateRange = time.dateType === 'custom'
        ? time.dateRange
        : convertDateType(time.dateType)
      
      const [since, until] = dateRange
      
      const params = {
        druid_datasource_id: project.datasource_id,
        datasource_name: project.datasource_name,
        params: {
          dataConfig,
          createMethod: 'by-upload',
          relativeTime: time.dateType,
          since,
          until,
          composeInstruction: [{ op: UserGroupSetOperationEnum.union, type: UserGroupFilterTypeEnum.userGroupFilter }],
          usergroupFilterStrategy: UsergroupFilterStrategyEnum.byUpload
        },
        title: getRFMUserGroupsTitle(record),
        usergroupIds: userIdList
      }
      
      this.props.addUsergroup(params, (res) => {
        if (!res)
          return message.error('创建用户分群失败')
        message.info('创建用户分群成功')
      })
    },
    
    fetchDimensionsAndScene (datasource_id, project_id) {
      
      this.props.getDimensions(datasource_id)
      const getRFMInfo = id => {
        Fetch
          .get(RFM.query, { id })
          .then(res => {
            if (!res) return this.setState({ record: {} })
            
            const ret = res.result
            if (!ret.success) {
              message.error(ret.message)
              return this.setState({ record: {} })
            }
            if (!ret.result) return this.setState({ record: {} })
            
            const { time, ...other } = ret.result.params
            this.setState(
              {
                record: ret.result,
                params: other,
                time,
                RFMName: ret.result.name
              },
              () => this.hooks.queryRFMResult.call(this)
            )
          })
      }
      
      Fetch
        .get(Scene.getSceneOfProjects, { projects: [project_id] })
        .then(res => {
          if (!res) return null
          const { model } = this.props
          const ret = res.result
          if (!ret.success) return message.error(ret.message)
          
          const scene = ret.result[0] || {}
          this.setState(
            { scene },
            () => {
              const info = model === 'info'
              if (info) {
                getRFMInfo(this.props.params.id)
              } else {
                this.setState({
                  record: {}
                })
              }
            })
        })
      
    }
  }
  
  onChange (type, value) {
    switch (type) {
      case Active.UpdateCurrentProject:
        return this.hooks.updateCurrentProject.call(this, value.datasource_id, value.id)
      
      case Active.UpdateRFMName:
        return this.hooks.updateRFMName.call(this, value)
      
      case Active.UpdateBaseParam:
        return this.hooks.updateBaseParam.call(this, value.type, value.value)
      
      case Active.UpdateCustomParam:
        return this.hooks.updateCustomParam.call(this, value)
      
      case Active.AddCustomParam:
        return this.hooks.addCustomParam.call(this, value)
      
      case Active.RemoveCustomParam:
        return this.hooks.removeCustomParam.call(this, value)
      
      case Active.UpdateTime:
        return this.setState({ time: value })
      
      case Active.QueryRFMResult:
        return this.hooks.queryRFMResult.call(this)
      
      case Active.SaveRFM:
        return this.hooks.saveRFM.call(this)
      
      case Active.DeleteRFM:
        return this.hooks.deleteRFM.call(this)
      
      case Active.AddToUserGroup:
        return this.hooks.addToUserGroup.call(this, value)
      default:
        break
    }
  }
  
  getInfoModelContent () {
    const { loading, projects, params:{ id, projectId }, dimensions, model } = this.props
    const {
      project,
      scene,
      params,
      name,
      RFMName,
      time,
      RFMResultList,
      Querying,
      record
    } = this.state
    
    // url错误
    if (!id) {
      return (
        <div className="aligncenter pd2y">
          <p className="pd2b">页面参数错误，您可以返回RFM客户细分列表</p>
          <Link to="/console/rfm">
            <Button type="primary">RFM客户细分</Button>
          </Link>
        </div>
      )
    }
    
    if (!loading && projects.length === 0) {
      return (
        <div className="aligncenter pd2y">
          <p className="pd2b">没有项目可选</p>
          <Link to="/console/project">
            <Button type="primary" icon={<PlusCircleOutlined />}>创建项目</Button>
          </Link>
        </div>
      );
    }
    
    // 未找到记录
    if (record && !record.hasOwnProperty('id')) {
      return (
        <div className="aligncenter pd2y">
          <p className="pd2b">未找到记录，数据可能已删除，您可以创建记录</p>
          {
            canAdd
              ? <Link to={`/console/rfm/${projectId}/new`}>
                <Button type="primary">新增RFM客户细分</Button>
              </Link>
              : null
          }
        </div>
      )
    }
    
    // 场景数据未配置
    if (scene && !scene.params.UserID) {
      return (
        <div className="aligncenter pd2y">
          <p className="pd2b">未找到RFM场景数据，请创建场景数据</p>
          <Link to={{
            pathname: '/console/project/datasource-settings',
            query: { id: project.id, type: SceneType.RFM.toString() }
          }}
          >
            <Button type="primary">新增RFM场景数据</Button>
          </Link>
        </div>
      )
    }
    
    // 项目与维度已加载、场景数据已加载、记录已加载
    if (!loading && scene && record) {
      return (
        <RFMEditor
          model={model}
          projects={projects}
          project={project}
          dimensions={dimensions}
          scene={(scene || {}).params || {}}
          params={params}
          name={name}
          RFMName={RFMName}
          time={time}
          RFMResultList={RFMResultList}
          Querying={Querying}
          onChange={(n, v) => this.onChange(n, v)}
        />
      )
    }
    return null
  }
  
  getNewModelContent () {
    const { loading, projects, dimensions, model } = this.props
    const {
      project,
      scene,
      params,
      name,
      RFMName,
      time,
      RFMResultList,
      Querying
    } = this.state
    
    if (loading) return null
    if (!loading && projects.length === 0) {
      return (
        <div className="aligncenter pd2y">
          <p className="pd2b">没有项目可选</p>
          <Link to="/console/project">
            <Button type="primary" icon={<PlusCircleOutlined />}>创建项目</Button>
          </Link>
        </div>
      );
    }
    if (!scene) return null
    if (!scene.id && project) {
      return (
        <div className="aligncenter pd2y">
          <p className="pd2b">没有设置场景数据</p>
          <Link to={{
            pathname: '/console/project/datasource-settings',
            query: { id: project.id, type: SceneType.RFM.toString() }
          }}
          >
            <Button type="primary">跳转到场景数据设置</Button>
          </Link>
        </div>
      )
    }
    
    return (
      <RFMEditor
        model={model}
        projects={projects}
        project={project}
        dimensions={dimensions}
        scene={scene.params}
        params={params}
        name={name}
        RFMName={RFMName}
        time={time}
        RFMResultList={RFMResultList}
        Querying={Querying}
        onChange={(n, v) => this.onChange(n, v)}
      />
    )
  }
  
  render () {
    const { loading, model } = this.props
    return (
      <div className="height-100 bg-white" style={{ overflowY: 'auto' }}>
        <Loading isLoading={loading}>
          {model === 'new' ? this.getNewModelContent() : this.getInfoModelContent()}
        </Loading>
      </div>
    )
  }
}

export default RFMController

