/**
 * Created on 14/03/2017.
 */

import React from 'react'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Table, message, Tooltip, Popconfirm, Select, Input } from 'antd'
import _ from 'lodash'
import moment from 'moment'

import Bread from '../Common/bread'
import Loading from '../../components/Common/loading'
import { ProjectStatus } from '../../../common/constants'

import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { Link } from 'react-router'
import * as actions from '../../actions'

import Fetch from '../../common/fetch-final'
import { RFM } from './interface'
import { checkPermission } from '../../common/permission-control'

const canAdd = checkPermission('/console/rfm/:id/new')
const canReadInfo = checkPermission('/console/rfm/:projectId/:id/info')
const canDelete = checkPermission('/app/rfm/delete')
class Main extends React.Component {
  
  static defaultProps = {
    projects: []
  }
  
  constructor (props, context) {
    super(props, context)
    this.state = {
      filter: {},
      project: {},
      records: [],
      current: []
    }
  }
  
  componentWillMount () {
    this.props.getProjects()
  }
  
  componentWillReceiveProps = async (nextProps) => {
    const { projects } = nextProps
    
    if (projects.length > 0) {
      // 查询所有项目的RFM
      const res = await Fetch.get(RFM.RFMOfProjects, { projects: projects.map(r => r.id) })
      if (!res) return null
      
      const ret = res.result
      
      if (!ret.success) message.error(ret.message)
      
      const { filter } = this.state
      const records = ret.result
      const def = records[0]
      const project = def ? _.find(projects, { id: def.project_id }) : projects[0]
      const next = { ...filter, project: project.id }
      
      this.setState({
        project,
        records,
        filter: next,
        current: this.filterPipe(records, next)
      })
    }
  }
  
  filterPipe (records, filter) {
    const { name, project } = filter
    return records.filter(r => {
      let check = true
      if (name) {
        check = r.name.indexOf(name) > -1
      }
      if (project) {
        check = check && r.project_id === project
      }
      return check
    })
  }
  
  updateFilter (name, v) {
    const { filter, records } = this.state
    const next = { ...filter, ...{ [name]: v } }
    const current = this.filterPipe(records, next)
    this.setState({ current, filter: next })
  }
  
  createDeleteBehavior (id) {
    return async () => await this.deleteBehavior(id)
  }
  
  deleteBehavior = async (id) => {
    const res = await Fetch.get(RFM.del, { id })
    
    if (!res) return null
    if (!res.result.success) return message.error(res.result.message)
    
    const { records, filter } = this.state
    const next = records.filter(f => f.id !== id)
    this.setState({ records: next, current: this.filterPipe(next, filter) })
    message.success('删除成功')
  }
  
  generateRFMTable () {
    const { projects } = this.props
    if (projects.length === 0) return null
    
    const { current } = this.state
    const compare = (a, b) => a > b ? 1 : -1
    const columns = [
      {
        title: 'RFM分群',
        dataIndex: 'name',
        key: 'name',
        sorter: compare,
        render: (text, record, index) => {
          return (
            <Link to={`/console/rfm/${record.project_id}/${record.id}/info`}>
              <span className="pd2l">{text}</span>
            </Link>
          )
        }
      },
      {
        title: '上一次计算时间',
        dataIndex: 'updated_at',
        key: 'updated_at',
        sorter: compare,
        render: (text, record, index) => {
          return moment(text ? text : record.created_at).format('YYYY-MM-DD HH:mm:ss')
        }
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'id',
        sorter: compare,
        render: (id, record, index) => {
          return (
            <div>
              {
                canDelete
                  ? (<Tooltip title="点击删除">
                    <Popconfirm
                      title="确认删除？"
                      onConfirm={this.createDeleteBehavior(id)}
                    >
                      <span className="pd1r pointer"><DeleteOutlined /></span>
                    </Popconfirm>
                  </Tooltip>)
                  : null
              }

              {
                canReadInfo
                  ? <Link to={`/console/rfm/${record.project_id}/${id}/info`}>
                    <span className="pd1l">查看详情</span>
                  </Link>
                  : null
              }
            </div>
          )
        }
      }
    ]
    
    return (
      <Table
        bordered
        size="small"
        rowKey="id"
        dataSource={current}
        columns={columns}
      />
    )
  }
  
  generateRFMFilter () {
    const { projects } = this.props
    
    if (projects.length === 0) {
      return (
        <div className="aligncenter pd2y">
          <p className="pd2b">没有项目可选</p>
          <Link to="/console/project">
            <Button type="primary" icon={<PlusCircleOutlined />}>创建项目</Button>
          </Link>
        </div>
      )
    }
    
    const { project } = this.state
    
    return (
      <div className="pd2y">
        <span className="pd1r">所属项目：</span>
        <Select
          className="mg2r width140"
          value={project.id}
          defaultActiveFirstOption
          dropdownMatchSelectWidth={false}
          notFoundContent="没有内容"
          onChange={v => {
            this.updateFilter('project', v)
            this.setState({ project: projects.find(p => p.id === v) })
          }}
        >
          {projects.map(p => (
            <Select.Option key={p.id} value={p.id}>
              {p.name}
            </Select.Option>
          ))}
        </Select>
        <Input
          size="default"
          style={{ width: 160 }}
          placeholder="请输入搜索的RFM名称"
          onChange={(v) => this.updateFilter('name', v.target.value.trim())}
        />
      </div>
    )
  }
  
  render () {
    const { isLoading } = this.props
    const { project } = this.state
    return (
      <div className="height-100 bg-white">
        <Loading isLoading={isLoading}>
          <Bread path={[
            { name: '智能运营', link: '/console/loss-predict' },
            { name: 'RFM客户细分' }
          ]}
          >
            {
              canAdd
                ? <Link to={`/console/rfm/${project.id}/new`}>
                  <Button type="primary" icon={<PlusCircleOutlined />}>
                    新增RFM客户细分
                  </Button>
                </Link>
                : null
            }
          </Bread>
          <div className="pd2y pd3x">
            {this.generateRFMFilter()}
            {this.generateRFMTable()}
          </div>
        </Loading>
      </div>
    )
  }
}

const mapStateToProps = (state) => ({ projects: state.common.projects.filter(p => p.status === ProjectStatus.Show) })
const mapDispatchToProps = dispatch => bindActionCreators({ getProjects: actions.getProjects }, dispatch)
export default connect(mapStateToProps, mapDispatchToProps)(Main)
