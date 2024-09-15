import React from 'react'
import { 
  EditOutlined,
  FilterOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { Checkbox, Table, Tooltip } from 'antd'
import {typeMap} from './constants'
import {getRes} from '../../databus/datasource'
import _ from 'lodash'
import AuthModal from './auth-modal'
import {checkPermission} from '../../common/permission-control'
import {immutateUpdate} from '../../../common/sugo-utils'
import DataPermissionFiltersEditor from './data-permission-filters-editor'

const canEditDataPermission = checkPermission('post:/app/role/data-permission-management')

export default class DataPermissions extends React.Component {

  state = {
    dimensions: [],
    measures: [],
    tagGroups: [],
    modalData: {},
    modalType: '',
    dimensionTree: {},
    measureTree: {},
    modalVisible: false,
    dataPermissionFiltersEditForProject: false
  }

  componentDidMount() {
    this.getData()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.role.id !== this.props.role.id) {
      this.updateRole(nextProps)
    }
  }

  stateChanger = (update) => {
    this.setState(update)
  }

  getData = async () => {
    let res = await getRes()
    if (!res) return
    let update = res.result
    // 排除__encode结尾的脱敏维度
    update.dimensions = _.filter(update.dimensions, d => !_.endsWith(d.name, '__encode'))
    update.dimensionTree = _.keyBy(update.dimensions, 'id')
    update.measureTree = _.keyBy(update.measures, 'id')
    update.tagGroupTree = _.keyBy(update.tagGroups, 'id')
    this.setState(update, this.updateRole)
  }

  updateRole = (props = this.props) => {
    let {datasources, modifier, role} = props
    let {id: role_id} = role
    let {dimensions, measures, tagGroups} = this.state
    let nextRole = immutateUpdate(role, 'dataPermissions', () => {
      return {
        datasourceIds: datasources.map(ds => {
          return ds.role_ids.includes(role_id) ? ds.child_project_id || ds.id : null
        }).filter(_.identity) || [],
        measureIds: measures.filter(mea => mea.role_ids.includes(role_id)).map(ds => ds.id) || [],
        dimensionIds: dimensions.filter(dim => dim.role_ids.includes(role_id)).map(ds => ds.id) || [],
        tagGroupIds: tagGroups.filter(tg => tg.role_ids.includes(role_id)).map(ds => ds.id) || []
      }
    })

    modifier({
      role: nextRole,
      originalRole: props.role
    })
  }

  onToggleProj = ds => {
    return e => {
      let {datasources, role} = this.props
      let { datasourceIds } = role.dataPermissions
      let {id, child_project_id} = ds
      let {dimensions, measures, tagGroups} = this.state
      let dsDict = _(datasources).keyBy(ds => ds.child_project_id || ds.id).mapValues(ds => ds.id).value()
      
      if (e.target.checked) {
        role = immutateUpdate(role, 'dataPermissions', () => {
          const datasourceOrChildProjIds = datasourceIds.concat(child_project_id || id)
          let dsIdSet = new Set(datasourceOrChildProjIds.map(dsIdOrChildProjId => dsDict[dsIdOrChildProjId]))
          return {
            datasourceIds: datasourceOrChildProjIds, // 有些可能是子项目 id
            dimensionIds: dimensions.filter(d => dsIdSet.has(d.parentId)).map(d => d.id),
            measureIds: measures.filter(d => dsIdSet.has(d.parentId)).map(d => d.id),
            tagGroupIds: tagGroups.filter(d => dsIdSet.has(d.parentId)).map(d => d.id)
          }
        })
      } else {
        role = immutateUpdate(role, 'dataPermissions', () => {
          const datasourceOrChildProjIds = _.without(datasourceIds, child_project_id || id)
          let dsIdSet = new Set(datasourceOrChildProjIds.map(dsIdOrChildProjId => dsDict[dsIdOrChildProjId]))
          return {
            datasourceIds: datasourceOrChildProjIds,
            dimensionIds: dimensions.filter(d => dsIdSet.has(d.parentId)).map(d => d.id),
            measureIds: measures.filter(d => dsIdSet.has(d.parentId)).map(d => d.id),
            tagGroupIds: tagGroups.filter(d => dsIdSet.has(d.parentId)).map(d => d.id)
          }
        })
      }
      let {modifier} = this.props
      modifier({role})
    }
  }

  checkProjValue = ds => {
    let {
      role: {
        dataPermissions: {
          datasourceIds
        }
      }
    } = this.props
    return datasourceIds.includes(ds.child_project_id || ds.id)
  }

  renderProjectCheck = (proj) => {
    let disabled = !canEditDataPermission
    return (
      <div className='class1'>
        <Checkbox
          onChange={this.onToggleProj(proj)}
          checked={this.checkProjValue(proj)}
          disabled={disabled}
        >
          {proj.title || proj.name}
        </Checkbox>
      </div>
    )
  }

  openModal = (ug, type) => {
    return () => {
      this.setState({
        modalData: ug,
        modalType: type,
        modalVisible: true
      })
    }
  }

  renderCheck = (type) => {
    return (ids, item) => {
      let count = ids.length
      let disabled = !canEditDataPermission
      let projChecked = this.checkProjValue(item.project)
      let cls = `class1 ${projChecked && !disabled ? 'pointer': 'disabled'}`
      let title = projChecked ? `点击设置${type}权限` : '请先选择项目'
      if (disabled) {
        title = `已授权全部${type}`
      }
      let onClick = projChecked && !disabled
        ? this.openModal(item, type)
        : _.noop
      let prop = [typeMap[type]]
      let pool = this.state[prop]
      let all = pool.filter(p => p.parentId === item.project.id).length
      return (
        <Tooltip
          placement='topLeft'
          title={title}
        >
          <div
            className={cls}
            onClick={onClick}
          >
            已选中<b>{count}/{all}</b>个{type}
            {projChecked && !disabled ? <EditOutlined className='mg1l' /> : null}
          </div>
        </Tooltip>
      )
    }
  }

  getProjPermissions = () => {
    let {
      datasources,
      pendingProjects,
      role,
      role: {
        dataPermissions: {
          measureIds,
          dimensionIds,
          tagGroupIds
        }
      }
    } = this.props
    let {dimensionTree, measureTree, tagGroupTree} = this.state
    let dimsDsIdDict = _(dimensionIds).groupBy(dimId => dimensionTree[dimId].parentId).value()
    let metricsDsIdDict = _(measureIds).groupBy(metId => measureTree[metId].parentId).value()
    let tagGroupDsIdDict = _(tagGroupIds).groupBy(tgId => tagGroupTree[tgId].parentId).value()
    
    let dsIdProjectDict = _.keyBy(pendingProjects, p => p.datasource_id)
  
    const currentRoleFiltersPath = ['extra_params', 'roleFiltersDict', role.id || 'new']
    return datasources.map(ds => {
      return {
        project: ds,
        dimensionIds: dimsDsIdDict[ds.id] || [],
        measureIds: metricsDsIdDict[ds.id] || [],
        tagGroupIds: tagGroupDsIdDict[ds.id] || [],
        dbProject: dsIdProjectDict[ds.id],
        filters: _.get(dsIdProjectDict[ds.id], currentRoleFiltersPath)
      }
    })
  }
  
  renderDataPermissionFiltersEditorModal() {
    let {role, modifier, pendingProjects} = this.props
    let { dataPermissionFiltersEditForProject } = this.state
    
    if (!dataPermissionFiltersEditForProject) {
      return null
    }
    const project = _.find(pendingProjects, p => p.id === dataPermissionFiltersEditForProject)
    if (!project || !role) {
      return null
    }
    return (
      <DataPermissionFiltersEditor
        project={project}
        roleName={role.name}
        value={_.get(project, ['extra_params', 'roleFiltersDict', role.id || 'new'])}
        onChange={async nextFilters => {
          let projIdx = _.findIndex(pendingProjects, p => p.id === project.id)
          if (projIdx === -1) {
            return {}
          }
          const compactFilters = _.filter(nextFilters, flt => !_.isEmpty(flt.eq))
          modifier({
            pendingProjects: immutateUpdate(pendingProjects, [projIdx, 'extra_params', 'roleFiltersDict'], dict => {
              return _.pickBy({...dict, [role.id || 'new']: compactFilters}, v => v && !_.isEmpty(v))
            })
          })
        }}
        onCancel={() => {
          this.setState({
            dataPermissionFiltersEditForProject: null
          })
        }}
      />
    )
  }
  
  render() {
    let { dimensions } = this.state
    if (!dimensions.length) {
      return null
    }
    let data = this.getProjPermissions()
    let columns = [{
      title: '项目',
      dataIndex: 'project',
      key: 'project',
      render: this.renderProjectCheck
    }, {
      title: '维度',
      dataIndex: 'dimensionIds',
      key: 'dimensionIds',
      render: this.renderCheck('维度')
    }, {
      title: '指标',
      dataIndex: 'measureIds',
      key: 'measureIds',
      render: this.renderCheck('指标')
    }, {
      title: '组合标签',
      dataIndex: 'tagGroupIds',
      key: 'tagGroupIds',
      render: this.renderCheck('组合标签')
    }, {
      title: '数据过滤条件',
      dataIndex: 'filters',
      key: 'filters',
      className: 'hover-display-trigger',
      render: (filters, record) => {
        const onClick = () => this.setState({dataPermissionFiltersEditForProject: record?.dbProject?.id})
        if (!_.isEmpty(filters)) {
          return <FilterOutlined className='pointer' onClick={onClick} />
        }
        return <SettingOutlined className='pointer' onClick={onClick} />
      }
    }]
    let props = {
      ..._.pick(this.props, ['role', 'modifier']),
      ...this.state,
      stateUpdater: this.stateChanger
    }
    return (
      <div>
        <Table
          columns={columns}
          pagination={false}
          dataSource={data}
          rowKey={(r, idx) => idx}
          bordered
          size='small'
        />
        <AuthModal
          {...props}
        />
        {this.renderDataPermissionFiltersEditorModal()}
      </div>
    )
  }
}
