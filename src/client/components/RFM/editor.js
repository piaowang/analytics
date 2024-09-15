/**
 * Created on 15/03/2017.
 */

import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import { DeleteOutlined, MinusCircleOutlined, PlusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import {
  Button,
  Table,
  Select,
  Input,
  Row,
  Col,
  Tabs,
  InputNumber,
  Popconfirm,
  Modal,
} from 'antd';
import { Link } from 'react-router'
import Bread from '../Common/bread'
import TimePicker from '../Common/time-picker'
import { SceneType } from '../../../common/constants'
import Active from './constants'
import { getRFMName, getRFMUserGroupsTitle, checkName } from './model'
import { checkPermission } from '../../common/permission-control'

export const ParamsType = { Base: 'Base', Custom: 'Custom' }
const TabPane = Tabs.TabPane
const canAdd = checkPermission('/console/rfm/:id/new')
const canDelete = checkPermission('/app/rfm/delete')

class RFMEditor extends React.Component {
  static defaultProps = {
    model: 'info',
    projects: [],
    project: {},
    dimensions: [],
    scene: {},
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
    name: '',
    RFMName: '',
    time: {
      dateType: '-7 days'
    },
    Querying: false,
    RFMResultList: [],
    onChange: _.noop
  }
  
  static propTypes = {
    model: PropTypes.string.isRequired,
    projects: PropTypes.array.isRequired,
    project: PropTypes.object.isRequired,
    dimensions: PropTypes.array.isRequired,
    scene: PropTypes.object.isRequired,
    params: PropTypes.object.isRequired,
    name: PropTypes.string.isRequired,
    RFMName: PropTypes.string.isRequired,
    time: PropTypes.object.isRequired,
    RFMResultList: PropTypes.array.isRequired,
    Querying: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired
  }
  
  constructor (props, context) {
    super(props, context)
    this.state = { current: null, filteredInfo: {}, sortedInfo: {} }
  }
  
  onChange (name, value) {
    this.props.onChange(name, value)
  }
  
  generateHeaderBar () {
    const { projects, project, RFMName, model } = this.props
    return (
      <div>
        <span className="pd1r">所属项目：</span>
        <Select
          disabled={model === 'info'}
          className="mg2r width140"
          value={project.id}
          defaultActiveFirstOption
          dropdownMatchSelectWidth={false}
          notFoundContent="没有内容"
          onChange={id => this.onChange(Active.UpdateCurrentProject, _.find(projects, { id }))}
        >
          {projects.map(p => (
            <Select.Option key={p.id} value={p.id}>
              {p.name}
            </Select.Option>
          ))}
        </Select>
        <span className="pd1l color-red">*</span>
        <span className="pd1l">RFM名称：</span>
        <div className={`iblock${checkName(RFMName) ? '' : ' has-error'}`}>
          <Input
            size="default"
            value={RFMName}
            style={{ width: 160 }}
            placeholder="请输入RFM名称"
            onChange={e => this.onChange(Active.UpdateRFMName, e.target.value.trim())}
          />
        </div>
      </div>
    )
  }
  
  generateParamsPanel () {
    const { time, Querying } = this.props
    return (
      <div>
        <div className="pd2b">
          <span className="pd1r">时间范围：</span>
          <TimePicker
            {...time}
            className="width180"
            onChange={date => this.onChange(Active.UpdateTime, date)}
          />
        </div>
        <div className="border">
          <Row gutter={32}>
            <Col span={8}>
              <div className="pd1 borderr borderb height300">
                {this.generatePresetsParamsPanel()}
              </div>
            </Col>
            <Col span={16}>
              <div className="pd1 borderl borderb height300">
                {this.generateParamsConfigurePanel()}
              </div>
            </Col>
          </Row>
          <div className="mg1t pd1 bordert aligncenter">
            <Button
              icon={<LegacyIcon type={Querying ? 'loading' : void 0} />}
              onClick={() => {
                if (!this.props.Querying) {
                  this.onChange(Active.QueryRFMResult)
                }
              }}
            >查询</Button>
          </div>
        </div>
      </div>
    );
  }
  
  generatePresetsParamsPanel () {
    const { project, scene:{ Date, Price, UserID }, dimensions } = this.props
    const dr = _.find(dimensions, { id: Date })
    const df = _.find(dimensions, { id: Price })
    const dm = _.find(dimensions, { id: UserID })
    
    return (
      <div>
        <div className="pd1b pd2x clearfix borderb">
          <div className="fleft">
            <strong>1. 预设相应的维度</strong>
          </div>
          <div className="fright">
            <Link to={{
              pathname: '/console/project/datasource-settings',
              query: { id: project.id, type: SceneType.RFM.toString() }
            }}
            >
              跳转到场景数据设置
            </Link>
          </div>
        </div>
        <ul className="pd3">
          <li className="pd2b clearfix line-height24">
            <div className="fleft width-50 alignright">
              <span className="pd2r">购买日期维度：</span>
            </div>
            <div className="fright width-50">
              <div className="pd1x border-dotted radius width-80 elli">
                {dr ? dr.title || dr.name : ''}
              </div>
            </div>
          </li>
          <li className="pd2b clearfix line-height24">
            <div className="fleft width-50 alignright">
              <span className="pd2r">购买金额维度：</span>
            </div>
            <div className="fright width-50">
              <div className="pd1x border-dotted radius width-80 elli">
                {df ? df.title || df.name : ''}
              </div>
            </div>
          </li>
          <li className="pd2b clearfix line-height24">
            <div className="fleft width-50 alignright">
              <span className="pd2r">客户ID维度：</span>
            </div>
            <div className="fright width-50">
              <div className="pd1x border-dotted radius width-80 elli">
                {dm ? dm.title || dm.name : ''}
              </div>
            </div>
          </li>
        </ul>
      </div>
    )
  }
  
  generateParamsConfigurePanel () {
    const { params:{ type } } = this.props
    return (
      <div>
        <div className="pd1b pd2x clearfix borderb">
          <div className="fleft">
            <strong>2. 配置参数</strong>
          </div>
        </div>
        <div className="pd2">
          <Tabs
            onChange={type => this.onChange(Active.UpdateBaseParam, { type, value: {} })}
            defaultActiveKey={type}
            activeKey={type}
          >
            <TabPane tab="基础设置" key={ParamsType.Base}>
              {this.generateParamsBaseConfigure()}
            </TabPane>
            <TabPane tab="自定义设置" key={ParamsType.Custom}>
              {this.generateParamsCustomConfigure()}
            </TabPane>
          </Tabs>
        </div>
      </div>
    )
  }
  
  generateParamsBaseConfigure () {
    const { params:{ type, value } } = this.props
    if (type !== ParamsType.Base) return null
    
    const RFMValues = [2, 3, 4]
    const items = [
      { title: '最近一次消费', key: 'R' },
      { title: '消费频率', key: 'F' },
      { title: '累计消费金额', key: 'M' }
    ]
    
    const params = value[type]
    
    return (
      <div className="pd2t">
        <Row>
          <Col span={12}>
            <div className="height30" />
          </Col>
          <Col span={12}>
            <div className="height30" style={{ paddingLeft: 16 }}>智能划分块数</div>
          </Col>
        </Row>
        {items.map(r => {
          return (
            <div className="pd1b" key={r.key}>
              <Row key={r.key} gutter={16}>
                <Col span={12} className="alignright">
                  {`${r.title}(${r.key})：`}
                </Col>
                <Col span={12}>
                  <Select
                    value={params.hasOwnProperty(r.key) ? params[r.key].toString() : void 0}
                    className="width120"
                    placeholder="请选择划分块数"
                    onChange={v => {
                      this.onChange(Active.UpdateBaseParam, {
                        type: ParamsType.Base,
                        value: { [r.key]: parseInt(v) }
                      })
                    }}
                  >
                    {RFMValues.map((v, i) => {
                      v = v.toString()
                      return (
                        <Select.Option value={v} key={i}>{v}</Select.Option>
                      )
                    })}
                  </Select>
                </Col>
              </Row>
            </div>
          )
        })}
      </div>
    )
  }
  
  generateParamsCustomConfigure () {
    const { params:{ type, value } } = this.props
    if (type !== ParamsType.Custom) return null
    
    const params = value[type]
    const items = [
      { title: '最近一次消费', key: 'R', unit: '天' },
      { title: '消费频率', key: 'F', unit: '次' },
      { title: '累计消费金额', key: 'M', unit: '元' }
    ]
    
    const span = ~~(24 / items.length)
    
    return (
      <Row gutter={16}>
        {items.map((r, i) => {
          let p = params[r.key]
          let l = p.length - 1
          return (
            <Col span={span} key={i}>
              <div className="pd1 aligncenter">{`${r.title}(${r.key})：`}</div>
              {p.map((v, j) => {
                return (
                  <Row gutter={16} key={j}>
                    <Col span={20}>
                      <div className="pd1y alignright">
                        {
                          j < l
                            ? (
                              <span>
                                <InputNumber
                                  disabled
                                  className="width60"
                                  size="small"
                                  value={j === 0 ? 0 : p[j - 1][0]}
                                />
                                <span className="pd1x">~</span>
                              </span>
                            )
                            : (<span className="pd1x">超过</span>)
                        }
                        <InputNumber
                          disabled={j === l}
                          onChange={
                            n => this.onChange(Active.UpdateCustomParam, {
                              value: n,
                              pos: j,
                              index: 0,
                              name: r.key
                            })
                          }
                          size="small"
                          className="width60"
                          value={v[0]}
                        />
                        <span className="pd1x">{r.unit}</span>
                      </div>
                    </Col>
                    <Col span={4}>
                      <div className="pd1y alignleft">
                        { j === 0
                          ? (
                            <PlusCircleOutlined
                              onClick={() => this.onChange(Active.AddCustomParam, r.key)}
                              className="pointer" />
                          )
                          : null
                        }
                        { j > 0 && j < l
                          ? (
                            <MinusCircleOutlined
                              onClick={() => this.onChange(Active.RemoveCustomParam, {
                                pos: j,
                                index: 1,
                                name: r.key
                              })}
                              className="pointer" />
                          )
                          : null
                        }
                      </div>
                    </Col>
                  </Row>
                );
              })}
            </Col>
          );
        })}
      </Row>
    );
  }
  
  tableSortHandle = (pagination, filters, sorter) => {
    this.setState({ filteredInfo: filters, sortedInfo: sorter })
  }
  
  generateRFMResultTable () {
    const { Querying, RFMResultList } = this.props
    if (Querying || RFMResultList.length === 0) return null
    
    const { sortedInfo = {}, filteredInfo = {} } = this.state
    const compare = (a, b) => a === b ? 0 : (a > b ? 1 : -1)
    const getArrayValue = arr => arr[arr.length - 1]
    const columns = [
      {
        title: 'R(天)',
        dataIndex: 'R',
        key: 'R',
        filteredValue: filteredInfo.R || null,
        sortOrder: sortedInfo.columnKey === 'R' && sortedInfo.order,
        sorter: (a, b) => compare(getArrayValue(a.R), getArrayValue(b.R)),
        render: arr => getRFMName(arr, 'R')
      },
      {
        title: 'F(次)',
        dataIndex: 'F',
        key: 'F',
        filteredValue: filteredInfo.F || null,
        sortOrder: sortedInfo.columnKey === 'F' && sortedInfo.order,
        sorter: (a, b) => compare(getArrayValue(a.F), getArrayValue(b.F)),
        render: arr => getRFMName(arr, 'F')
      },
      {
        title: 'M(元)',
        dataIndex: 'M',
        key: 'M',
        filteredValue: filteredInfo.M || null,
        sortOrder: sortedInfo.columnKey === 'M' && sortedInfo.order,
        sorter: (a, b) => compare(getArrayValue(a.M), getArrayValue(b.M)),
        render: arr => getRFMName(arr, 'M')
      },
      {
        title: '用户数',
        dataIndex: 'userCount',
        key: 'userCount',
        filteredValue: filteredInfo.userCount || null,
        sortOrder: sortedInfo.columnKey === 'userCount' && sortedInfo.order,
        sorter: (a, b) => compare(a.userCount, b.userCount),
        render: (text) => text
      },
      {
        title: '用户占比',
        dataIndex: 'userPercent',
        key: 'userPercent',
        filteredValue: filteredInfo.userPercent || null,
        sortOrder: sortedInfo.columnKey === 'userPercent' && sortedInfo.order,
        sorter: (a, b) => compare(parseFloat(a.userPercent), parseFloat(b.userPercent)),
        render: (text) => text
      },
      {
        title: '操作',
        dataIndex: 'ID',
        key: 'ID',
        filteredValue: null,
        sortOrder: false,
        render: (text, record) => {
          return (
            <div>
              <Button
                size="small"
                onClick={() => this.setState({ current: record })}
              >
                查看用户ID
              </Button>
              <Popconfirm
                title={`添加【${getRFMUserGroupsTitle(record)}】用户分群`}
                onConfirm={() => this.onChange(Active.AddToUserGroup, record)}
              >
                <Button
                  type="primary"
                  size="small"
                  className="mg1l"
                  icon={<PlusCircleOutlined />}
                >
                  添加到用户分群
                </Button>
              </Popconfirm>
            </div>
          );
        }
      }
    ]
    
    return (
      <div className="pd2t">
        {this.generateUserListModal()}
        <div>RFM分群结果</div>
        <div className="pd2t">
          <Table
            columns={columns}
            dataSource={RFMResultList.map((l, i) => ({ ...l, i }))}
            bordered
            size="small"
            onChange={this.tableSortHandle}
            pagination={{
              defaultPageSize: 10,
              showTotal: (total, range) => {
                return `总共 ${total} 条数据, 当前显示 ${range.join('~')} 条`
              },
              showQuickJumper: true
            }}
          />
        </div>
      </div>
    )
  }
  
  generateUserListModal () {
    const { current } = this.state
    if (current === null) return null
    return (
      <Modal
        className="width-60"
        visible={current !== null}
        onOk={() => this.setState({ current: null })}
        onCancel={() => this.setState({ current: null })}
      >
        <h3 className="pd2b">用户ID列表</h3>
        <Table
          rowKey="index"
          columns={[{ title: '用户ID', dataIndex: 'id', key: 'id' }]}
          dataSource={current.userIdList.map((id, index) => ({ id, index }))}
          size="small"
          bordered
          pagination={{
            defaultPageSize: 10,
            showTotal: (total, range) => {
              return `总共 ${total} 条数据, 当前显示 ${range.join('~')} 条`
            },
            showQuickJumper: true
          }}
        />
      </Modal>
    )
  }
  
  render () {
    const { name, model, project } = this.props
    const infoModel = model === 'info'
    return (
      <div>
        <Bread path={[
          { name: '智能运营', link: '/console/loss-predict' },
          { name: 'RFM客户细分', link: '/console/rfm' },
          { name }
        ]}
        >
          <Button
            onClick={() => this.onChange(Active.SaveRFM)}
            type="success"
            icon={<SaveOutlined />}
            className="mg1r"
          >
            保存
          </Button>
          {
            infoModel && canDelete
              ? (
                <Popconfirm
                  title="确认删除记录"
                  placement="bottom"
                  onConfirm={() => this.onChange(Active.DeleteRFM)}
                >
                  <Button icon={<DeleteOutlined />} className="mg1r">删除</Button>
                </Popconfirm>
              )
              : null
          }
          {
            infoModel && canAdd
              ? (
                <Link to={`/console/rfm/${project.id}/new`}>
                  <Button type="primary" icon={<PlusCircleOutlined />}>
                    新增RFM客户细分
                  </Button>
                </Link>
              )
              : null
          }
        </Bread>
        <div className="pd2y pd3x">
          <div className="pd2b pd2x borderb">{this.generateHeaderBar()}</div>
          <div className="pd2y pd2x">{this.generateParamsPanel()}</div>
          <div className="pd2x">{this.generateRFMResultTable()}</div>
        </div>
      </div>
    );
  }
}

export default RFMEditor
