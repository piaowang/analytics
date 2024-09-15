import React from 'react'
import { AreaChartOutlined, CloseCircleOutlined, EditOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Button, Tooltip, Popconfirm, Table, message, Input, Spin, Tabs } from 'antd'
import {connect} from 'react-redux'
import {bindActionCreators} from 'redux'
import * as actions from '../../actions'
import {Link} from 'react-router'
import moment from 'moment'
import Bread, {renderPageTitle} from '../Common/bread'
import ProjModal from './proj-edit-modal'
import {initProcess} from './constants'
import { checkPermission } from '../../common/permission-control'

// let {SugoRoles} = window.sugo.user
// let isAdmin = _.some(SugoRoles, s => s.type === 'built-in')
const TabPane = Tabs.TabPane

const canAdd = checkPermission(/^post:\/app\/proj\/add$/)
const canEdit = checkPermission('post:/app/proj/update')
const canDelete = checkPermission('delete:/app/proj/del/:id')
const canCloneCase = checkPermission('post:/app/proj/clone-case')
const canAddCase = checkPermission('post:/app/proj/add-case')
const canAddTemplate = checkPermission('post:/app/proj/add-template')

class ProjList extends React.Component {
  
  state = {
    search: '',
    process: initProcess('加载中...')
  }

  componentWillMount() {
    this.getData()
  }

  getData = async () => {
    let {setProp} = this.props
    setProp('set_loading', true)
    await this.props.getPioProjects()
    setProp('set_loading', false)
    await this.props.getCase()    
  }

  onChange = e => {
    console.debug(e)
    this.setState({
      search: e.target.value
    })
  }

  delProj = proj => {
    this.props.delProjects(proj, () => {
      message.success('删除成功', 8)
    })
  }

  renderNoProj = () => {
    return (
      <div className="proj-list pd3 aligncenter">
        还没有智能分析。
        <Link to="/console/pio-projects/new">
          {
            canAdd
              ? <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                >
                新建智能分析
              </Button>
              : null
          }
        </Link>
      </div>
    )
  }

  renderProj = (columns, pagination, projects0, search) => {
    return (
      <div className="proj-list pd3x">
        <div className="pd2b fix">
          <div className="fright">
            <Input
              onChange={this.onChange}
              value={search}
              placeholder="搜索"
              className="iblock width260"
            />
          </div>
        </div>
        <Table
          columns={columns}
          rowKey="id"
          pagination={pagination}
          dataSource={projects0}
          bordered
          size="small"
        />
      </div>
    )

  }

  toggleEditModal = () => {
    this.setState({showEditModal: !this.state.showEditModal})
  }

  handleEdit = async data => {
    let {id} = this.state.process

    let res = await this.props.updateProjects(id, data)
    if (!res) return
    let process = Object.assign({}, this.state.process, data)
    this.setState({
      process,
      showEditModal: false
    })
  }

  render() {
    let {search, process, showEditModal} = this.state
    let {pioProjects: projects, loading, pioCases, location} = this.props

    let projects0 = search
      ? projects.filter(ug => ug.name.indexOf(search) > -1)
      : projects.slice(0)

    const pagination = {
      total: projects0.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    let columns = [{
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name > b.name ? 1 : -1,
      render(text, ug) {
        if (!canEdit) {
          return text
        }
        return (        
          <div className="mw400 elli">
            <Link to={`/console/pio-projects/${ug.id}`} >
              <b>{text}</b>
            </Link>
          </div>
        )
      }
    }, {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => a.description > b.description ? 1 : -1,
      render(text) {
        return text      
          ? <Tooltip placement="topLeft" title={text}>
            <div className="mw400 elli">
              {text}
            </div>
          </Tooltip>
          : null
      }
    }, {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      sorter: (a, b) => a.updateTime > b.updateTime ? 1 : -1,
      render(text) {
        return moment(text).format('YYYY-MM-DD HH:mm:ss')
      }
    }, {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status > b.status ? 1 : -1
    }, {
      title: <div className="aligncenter">操作</div>,
      key: 'op',
      render: (text, ug) => {
        return (
          <div className="aligncenter">
            {!canEdit ? null : (
              <Tooltip title="编辑项目名称和描述" placement="left">
                <EditOutlined
                  className="font16 color-grey pointer"
                  onClick={() => {
                    this.setState({process: ug})
                    this.toggleEditModal()
                  }}
                />
              </Tooltip>
            )}
            {!canDelete ? null : (
              <Popconfirm
                title={`确定删除项目 "${ug.name}" 么？`}
                placement="topLeft"
                onConfirm={() => this.delProj(ug)}
              >
                <Tooltip title="删除项目" placement="right">
                  <CloseCircleOutlined className="mg2l font16 color-grey pointer" />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        )
      }
    }]

    return (
      <div className="height-100 pio-list-bgf5" id="process-list">
        {renderPageTitle('智能分析')}
        <div className="pd3x pd2y alignright" >
          {/*<div className="inline mg3r pio-list-underline">
            <Icon type="exclamation-circle-o" className="mg1r" />
            <a src="http://docs.sugo.io/">最新功能提醒</a><br/>
            <a src="#">读取单图算子上线</a>
          </div>
          <div className="inline pio-list-underline">
            <Icon type="question-circle-o" className="mg1r" />
            <a src="#">新手引导</a><br/>
            <a src="#">新手入门</a><br/>
            <a src="#">算子介绍</a>
          </div>*/}
          {
            canAdd
              ? (<Link to="/console/pio-projects/new" key="pio-link0">
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                >
                  新建智能分析
                </Button>
              </Link>)
              : null
          }
          {
            [
              canAddTemplate ? (<Link to="/console/pio-projects/new?type=1" key="pio-link1">
                <Button
                  className="mg2l"
                  icon={<PlusCircleOutlined />}
                >
                  新建模板
                </Button>
              </Link>) : null,
              canAddCase ? (<Link to="/console/pio-projects/new?type=2" key="pio-link2">
                <Button
                  className="mg2l"
                  icon={<PlusCircleOutlined />}
                >
                  新建案例
                </Button>
              </Link>) : null
            ].filter(_.identity)
          }
        </div>
        <Tabs style={{paddingLeft:'16px'}} defaultActiveKey={location.query.key || '1'}>
          <TabPane tab="机器学习案例库" key="1">
            <div className="pio-list-pd">
              {
                (canAdd ? [
                  <Link to="/console/pio-projects/new" key={0 + 'pio-case'}>
                    <div className="pointer-shadow pio-list-case pio-list-add">
                      <div className="pio-list-add-icon">
                        <PlusCircleOutlined />
                      </div>
                      <div className="pio-list-add-title">新建空白机器学习流程</div>
                    </div>
                  </Link>
                ] : []).concat(pioCases.map(d => (
                  <div key={d.id} className="pointer-shadow pio-list-case">
                    <div className="pio-list-case-title">{d.name}</div>
                    <div className="pio-list-case-icon hover-display-trigger relative">
                      <AreaChartOutlined />
                      <div className="hover-display absolute a-center" style={{paddingTop: '70px'}}>
                        {/*<Link to="#">查看案例文档</Link><br/>*/}
                        {!canCloneCase ? null : (
                          <Link to={`/console/pio-projects/new?type=3&id=${d.id}`}>
                            <Button type="primary">从案例创建</Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )))
              }
            </div>
          </TabPane>
          <TabPane tab="我的流程" key="2">
            <Spin spinning={loading}>
              {
                projects.length
                  ? this.renderProj(columns, pagination, projects0, search)
                  : this.renderNoProj()
              }
            </Spin>
          </TabPane>
        </Tabs>
        <ProjModal
          handleEdit={this.handleEdit}
          process={process}
          visible={showEditModal}
          onCancel={this.toggleEditModal}
        />
      </div>
    )
  }
}

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(ProjList)

