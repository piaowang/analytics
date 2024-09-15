import React, { PureComponent } from 'react'
import { browserHistory } from 'react-router'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Radio, Input, Row, Col, Button, Tabs, Collapse, Table, message } from 'antd'
import Bread from '../Common/bread'
import BackToListBtn from '../Common/back-to-list-btn'
import './data-checking.styl'
import Fetch from '../../common/fetch-final'
import { connect } from 'react-redux'
import moment from 'moment'
import './data-detail.styl'
import _ from 'lodash'
import { bindActionCreators } from 'redux'
import * as actions from '../../../client/actions'

const namespace = 'auditPage'

let mapStateToProps = (state, ownProps) => {
  let runtimeNamespace = namespace
  const auditPageModelState = state[runtimeNamespace] || {}
  const commonState = state.common
  return {
    ...auditPageModelState,
    ...commonState,
    runtimeNamespace
  }
}

let mapDispatchToProps = (dispatch) => {
  return {
    setTargetCheck: (payload) => {
      let { data } = payload
      dispatch({
        type: 'set_targetCheck',
        data
      })
    },
    getUsers: bindActionCreators(actions.getUsers, dispatch),
    getInstitutions: bindActionCreators(actions.getInstitutions, dispatch),
    getDatasources: bindActionCreators(actions.getDatasources, dispatch),
    getResForAudit: bindActionCreators(actions.getResForAudit, dispatch),
    getPermissions: bindActionCreators(actions.getPermissions, dispatch)
  }
}

const FormItem = Form.Item
const TextArea = Input.TextArea
const { TabPane } = Tabs
const { Panel } = Collapse

const formItemLayout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 20 }
}
@Form.create()
@connect(mapStateToProps, mapDispatchToProps)

class DataCheckingDetail extends PureComponent {
  constructor(props) {
    super(props)

  }
  state = {
    radioValue: 1,
    textValue: ''
  }
  componentDidMount () {
    let { targetCheck } = this.props
    if (!_.get(targetCheck, 'id')) {
      this.getData()
    }
  }
  async getData () {
    const id = this.props.location.query.id
    let res = await Fetch.get('/app/data-checking/detail', { id })
    this.props.setTargetCheck({ data: res.result })
    this.props.getUsers()
    this.props.getInstitutions()
    this.props.getDatasources()
    this.props.getResForAudit()
    this.props.getPermissions()
  }
  // 1-角色-基本信息
  renderBasicInfo = () => {
    let { targetCheck } = this.props
    let { name, operationType, type, apply_user, updated_at } = targetCheck
    return (
      <div className="review-box">
        <span>基本信息</span>
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '33%', marginTop: '10px' }}>
            <span>名称：</span>
            <span>{this.fixName(targetCheck)}</span>
          </div>
          <div style={{ width: '33%', marginTop: '10px' }}>
            <span>操作类型：</span>
            <span>{this.operationType(operationType)}</span>
          </div>
          <div style={{ width: '33%', marginTop: '10px' }}>
            <span>类别：</span>
            <span>{this.fixType(type)}</span>
          </div>
          <div style={{ width: '33%', marginTop: '10px' }}>
            <span>申请人：</span>
            <span>{_.get(apply_user, 'username', '')}</span>
          </div>
          <div style={{ width: '33%', marginTop: '10px' }}>
            <span>提交时间：</span>
            <span>{updated_at ? moment(updated_at).format('YYYY-MM-DD HH:mm:ss') : ''}</span>
          </div>
        </div>
      </div>
    )
  };


  radioChange (e) {
    this.setState({
      radioValue: e.target.value
    })
  }
  async commitFun () {
    if (this.state.radioValue === 0 && !_.trim(this.state.textValue)) {
      // 复核结论为驳回时，审核意见为必填
      message.warning('审核意见为必填')
      return
    }
    const id = this.props.location.query.id
    let res = await Fetch.post('/app/data-checking/checking', { ctrStatus: this.state.radioValue, text: this.state.textValue, id })
    if (res?.success) {
      message.success('操作成功')
      browserHistory.push('/console/data-checking')
    }
  }
  // 复核结论
  renderReviewResult = () => {
    let { targetCheck } = this.props
    return (
      <div className="review-box">
        <span>审核结论</span>
        <FormItem {...formItemLayout} label="审核结论">
          <Radio.Group onChange={(e) => { this.radioChange(e) }} value={this.state.radioValue} name="radioResult">
            <Radio value={1}>通过</Radio>
            <Radio value={0}>驳回</Radio>
          </Radio.Group>
        </FormItem>
        <FormItem {...formItemLayout} label="审核意见" required={this.state.radioValue === 0}>
          <TextArea onChange={(val) => { this.textChange(val) }} value={this.state.textValue} rows={3} />
        </FormItem>
        <div className="review-submit">
          <Button onClick={() => browserHistory.goBack()} className="mg2r">取消</Button>
          <Button type="primary" onClick={() => this.commitFun()}>提交</Button>
        </div>
      </div>
    )
  };

  renderReviewResultReadOnly = () => {
    let { targetCheck } = this.props
    let { status, checkUserId, comment, acceptanceTime } = targetCheck
    return (
      <div className="review-box">
        <span>审核结论</span>
        <FormItem {...formItemLayout} label="审核结论">
          <span>{status === 2 ? '未通过' : '通过'}</span>
        </FormItem>
        <FormItem {...formItemLayout} label="审核意见">
          <span>{comment || ''}</span>
        </FormItem>
        <FormItem {...formItemLayout} label="审核时间">
          <span>{acceptanceTime ? moment(acceptanceTime).format('YYYY-MM-DD HH:mm:ss') : ''}</span>
        </FormItem>
        <FormItem {...formItemLayout} label="审核人">
          <span>{checkUserId ? _.get(this.props.users.find(i => i.id === checkUserId), 'first_name') : ''}</span>
        </FormItem>
      </div>
    )
  }

  textChange = (val) => {
    this.setState({
      textValue: val.target.value
    })
  }

  // 3-功能权限
  renderFunPermission = () => {
    let tree = this.newRenderFunPermission(this.props.targetCheck.SugoRole.funcPermissions)
    // const keys = mockData.jurisdiction_fun.map(item => item.first)
    const keys = tree.map(item => item.name)
    return (
      <Collapse defaultActiveKey={keys} className="permission-fun">
        {tree.map(item => (
          <Panel header={item.name} key={item.name}>
            {item.children.map((it,index) => {
              return (
                <div key={index} className="permission-row">
                  <div className="permission-left">{it.name}</div>
                  <div className="permission-right">{it.children.join('、')}</div>
                </div>
              )
            })}
          </Panel>
        ))}
      </Collapse>)
  };

  newRenderFunPermission = (permissions) => {
    let tempArr = this.props.permissions.filter(i => permissions.includes(i.id))
    let tree = _.reduce(tempArr, (total, current) => {
      if (!total.find(i => _.get(i, 'name') === current.class)) {
        total.push({
          name: current.class,
          children: [{
            name: current.group,
            children: [current.title]
          }]
        })
        return total
      }
      if (!total.find(i => _.get(i, 'children', []).find(j => _.get(j, 'name') === current.group))) {
        total = total.map(k => {
          if (_.get(k, 'name') === current.class) {
            return {
              ...k,
              children: [...k.children, { name: current.group, children: [current.title] }]
            }
          }
          return k
        })
        return total
      }
      total = total.map(i => {
        if (_.get(i, 'name') === current.class) {
          return {
            ...i,
            children: i.children.map(j => {
              if (_.get(j, 'name') === current.group) {
                return {
                  ...j,
                  children: Array.from(new Set([...j.children, current.title]))
                }
              }
              return j
            })
          }
        }
        return i
      })
      return total
    }, [])
    return tree
  }

  // 3-数据权限
  renderDataPermission = () => {
    let datasource = this.newRenderDataPermission()
    const columns = [
      {
        title: '项目',
        dataIndex: 'datasource',
        key: 'datasource',
        width: '10%',
        render: (val) => _.get(val, 'title', '')

      },
      {
        title: '维度',
        dataIndex: 'dimensions',
        key: 'dimension',
        width: '25%',
        render: (val) => val ? val.map(i => i.name).join(', ') : ''
      },
      {
        title: '指标',
        dataIndex: 'measures',
        key: 'measures',
        width: '25%',
        render: (val) => val ? val.map(i => i.title).join(', ') : ''
      },

      {
        title: '组合标签',
        dataIndex: 'tagGroups',
        key: 'ltagGroups',
        width: '25%',
        render: (val) => val ? val.map(i => i.title).join(', ') : ''
      }

      // {
      //   title: '过滤条件',
      //   dataIndex: 'condition',
      //   key: 'condition',
      //   width: '15%'
      // }
    ]
    return (
      <Table
        columns={columns}
        pagination={false}
        dataSource={datasource}
        rowKey={r => r.datasource.id}
        bordered
        size="small"
      />
    )
  };

  newRenderDataPermission = () => {
    let { targetCheck, datasources = [] } = this.props
    let { dimensions = [], measures = [], tagGroups = [] } = this.props.resForAudit
    let { dataPermissions = {} } = targetCheck.SugoRole


    datasources = datasources.filter(i => dataPermissions.datasourceIds.includes(i.id))
    dimensions = dimensions.filter(i => dataPermissions.dimensionIds.includes(i.id))
    measures = measures.filter(i => dataPermissions.measureIds.includes(i.id))
    tagGroups = tagGroups.filter(i => dataPermissions.tagGroupIds.includes(i.id))

    let dimensionTree = _.groupBy(dimensions, 'parentId')
    let measureTree = _.groupBy(measures, 'parentId')
    let tagGroupTree = _.groupBy(tagGroups, 'parentId')


    let tableDataSource = datasources.map(i => {
      return {
        datasource: i,
        measures: measureTree[i.id],
        dimensions: dimensionTree[i.id],
        tagGroups: tagGroupTree[i.id]
      }
    })

    return tableDataSource
  }

  // 3-角色权限 Tabs
  renderTabs = () => {
    return (
      <Tabs defaultActiveKey="fun" style={{ width: '100%', marginTop: '20px' }}>
        <TabPane tab="功能权限" key="fun">
          {this.renderFunPermission()}
        </TabPane>
        <TabPane tab="数据权限" key="data">
          {this.renderDataPermission()}
        </TabPane>
      </Tabs>
    )
  };

  fixType (type) {
    switch (type) {
      case 1:
        return '用户'
      case 2:
        return '角色'
      case 3:
        return '机构'
      default:
        return ''
    }
  }
  fixStatus (type) {
    switch (type) {
      case -1:
        return '未提交'
      case 0:
        return '待审核'
      case 1:
        return '正常'
      case 2:
        return '已驳回'
      default:
        return ''
    }
  }
  fixCheckName (item) {
    switch (item.type) {
      case 1:
        return item.SugoUser.username
      case 2:
        return item.SugoRole.name
      case 3:
        return item.SugoInstitutions.name
      default:
        return ''
    }
  }
  operationType (val) {
    switch (val) {
      case 1:
        return '新增'
      case 2:
        return '修改'
      case 3:
        return '删除'
      default:
        return ''
    }
  }
  //返回组装后的名字
  fixName (item) {
    const user = this.fixType(item.type)
    return (
      user +
      this.operationType(item.operationType) +
      '_' +
      this.fixCheckName(item)
    )
  }

  buildUserList (user = {}) {
    let tempArr = [
      {
        title: '用户名',
        value: user.username || ''
      },
      {
        title: '用户名称',
        value: user.first_name || ''
      },
      {
        title: '邮箱',
        value: user.email || ''
      },
      {
        title: '手机',
        value: user.cellphone || ''
      },
      {
        title: '密码',
        value: '**********'
      },
      {
        title: '用户状态',
        value: user.status ? '启用' : '弃用'
      },
      {
        title: '生效日期',
        value: user.efficacy_at
          ? moment(user.efficacy_at).startOf('day').format('YYYY-MM-DD HH:mm:ss')
          : ''
      },
      {
        title: '失效日期',
        value: user.efficacy_at
          ? moment(user.efficacy_at).endOf('day').format('YYYY-MM-DD HH:mm:ss')
          : ''
      },
      {
        title: '所属机构',
        value: user.institutions_id
          ? _.get(this.props.institutionsList.find(i => i.id === user.institutions_id), 'name', '')
          : ''
      },
      {
        title: '所属部门',
        value: user.departments.length
          ? user.departments.map((v)=>{
            return v.name
          }).join(','):''
      },
      {
        title: '角色',
        value: user?.roles ? user?.roles?.map(i => i.name).join(', ') : ''
      }
    ]
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap' }}>
        {
          tempArr.map((i,ind)=> {
            return (
              <div key={ind} style={{ width: '33%', marginTop: '10px' }}>
                <span>{i.title + '：'}</span>
                <span>{i.value}</span>
              </div>
            )
          })
        }
      </div>
    )
  }

  buildInsList (ins = {}) {
    let tempArr = [
      {
        title: '机构编号',
        value: ins.serial_number || ''
      },
      {
        title: '机构名称',
        value: ins.name || ''
      },
      {
        title: '机构层级',
        value: ins.level || ''
      },
      {
        title: '上级机构',
        value: ins.parent ? _.get(this.props.institutionsList.find(i => i.id === ins.parent), 'name', '') : ''
      },
      {
        title: '机构状态',
        value: ins.status ? '启用' : '停用'
      },
      {
        title: '备注',
        value: ins.description || ''
      }
    ]
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap' }}>
        {
          tempArr.map((i,k) => {
            return (
              <div key={k} style={{ width: '33%', marginTop: '10px' }}>
                <span>{i.title + '：'}</span>
                <span>{i.value}</span>
              </div>
            )
          })
        }
      </div>
    )
  }

  buildRoleList (role = {}) {

    let tempArr = [
      {
        title: '角色名称',
        value: role.name || ''
      },
      {
        title: '角色状态',
        value: role.status ? '启用' : '停用'
      },
      {
        title: '所属机构',
        value: role.institutionsIds ? role.institutionsIds.map(i => {
          return _.get(this.props.institutionsList.find(j => j.id === i), 'name', '')
        }).filter(k => !_.isEmpty(k)).join(', ') : null
      },
      {
        title: '备注',
        value: role.description || ''
      }
    ]
    // return (
    //   <div className="check-info-list">
    //     {
    //       tempArr.map(i=>{
    //         return (
    //           <div className="check-info-list-item" >
    //             <div className="check-info-list-item-label elli">{i.title}</div>
    //             <div className="check-info-list-item-value">{i.value}</div>
    //           </div>
    //         )
    //       })
    //     }
    //     {
    //       this.renderTabs()
    //     }
    //   </div>
    // )
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap' }}>
        {
          tempArr.map((i,index)=> {
            return (
              <div key={index} style={{ width: '33%', marginTop: '10px' }}>
                <span>{i.title + '：'}</span>
                <span>{i.value}</span>
              </div>
            )
          })
        }
        {
          this.renderTabs()
        }
      </div>
    )
  }

  bulidInfoList = () => {
    let { SugoUser, SugoInstitutions, SugoRole, type } = this.props.targetCheck
    return (
      <div className="review-box">
        <span>审核要素</span>
        {
          type === 1 ? this.buildUserList(SugoUser) : null
        }
        {
          type === 2 ? this.buildRoleList(SugoRole) : null
        }
        {
          type === 3 ? this.buildInsList(SugoInstitutions) : null
        }
      </div>
    )
  }

  buildAuditResult = () => {
    let { targetCheck } = this.props
    let { status, checkUserId, comment, acceptanceTime } = targetCheck
    return (
      <div className="check-info-yard-wrap" style={{ marginBottom: '60px' }}>
        <div className="check-info-title" >审核结论</div>
        <div className="check-info-yard">
          <div className="check-info-list">
            <div className="check-info-list-item" >
              <div className="check-info-list-item-label elli">审核结论</div>
              <div className="check-info-list-item-value">{status === 2 ? '未通过' : '通过'}</div>
            </div>
            <div className="check-info-list-item" >
              <div className="check-info-list-item-label elli">审核意见</div>
              <div className="check-info-list-item-value">{comment || ''}</div>
            </div>
            <div className="check-info-list-item" >
              <div className="check-info-list-item-label elli">审核时间</div>
              <div className="check-info-list-item-value elli">{acceptanceTime ? moment(acceptanceTime).format('YYYY-MM-DD HH:mm:ss') : ''}</div>
            </div>
            <div className="check-info-list-item" >
              <div className="check-info-list-item-label elli">审核人</div>
              <div className="check-info-list-item-value elli">{checkUserId ? _.get(this.props.users.find(i => i.id === checkUserId), 'first_name') : ''}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  render () {
    let { targetCheck } = this.props
    let renderBaseInfo = () => {
      let { targetCheck } = this.props
      let { name, operationType, type, apply_user, updated_at } = targetCheck
      let tempArr = [
        {
          label: '名称',
          value: this.fixName(targetCheck)
        },
        {
          label: '操作类型',
          value: this.operationType(operationType)
        },
        {
          label: '类别',
          value: this.fixType(type)
        },
        {
          label: '申请人',
          value: _.get(apply_user, 'username', '')
        },
        {
          label: '提交时间',
          value: updated_at ? moment(updated_at).format('YYYY-MM-DD HH:mm:ss') : ''
        }
      ]
      return (
        <div className="base-info-wrap" >
          <div className="base-info">
            {
              tempArr.map((i,index) => {
                return (
                  <div key={index} className="base-info-item" >
                    <div className="base-info-item-label elli">{i.label}</div>
                    <div className="base-info-item-value elli">{i.value}</div>
                  </div>
                )
              })
            }
          </div>
        </div>
      )
    }

    let breadName

    switch (_.get(targetCheck, 'type')) {
      case 1:
        breadName = '用户'
        break
      case 2:
        breadName = '角色'
        break
      case 3:
        breadName = '机构'
        break
      default:
        break
    }


    return (
      <div className="height-100 bg-white">
        <Bread
          path={[
            { name: '数据审核', link: '/console/data-checking' },
            { name: breadName }
          ]}
        >
          <BackToListBtn to="/console/data-checking" title="返回列表" />
        </Bread>
        <div className="scroll-content pd2y pd3x">
          {this.renderBasicInfo()}
          {this.bulidInfoList()}
          {
            _.get(targetCheck, 'status') === 0 ?
              this.renderReviewResult()
              // :this.buildAuditResult()
              : this.renderReviewResultReadOnly()
          }
        </div>
      </div>
    )
  }
}

export default DataCheckingDetail 
