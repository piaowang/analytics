import React from 'react'
import { ApiOutlined, PlusOutlined, TableOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Row, Radio, Col, DatePicker, Table, Divider, Tag, Popconfirm, Select, Drawer } from 'antd'
import Bread from '../../Common/bread'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import CatalogTree from './catalog-tree'
import moment from 'moment'
import { getAllParent, getRootNodeActionTypeByKey, treeNodeKeyStr, TASK_ACTION_TYPE } from '../constants'
import { connect } from 'react-redux'
import { namespace } from './catalog-tree-model'
import _ from 'lodash'
import VisualModelingList from 'client/components/TaskScheduleManager2/visual-modeling/visual-modeling-table'
import ConsanguinityAnalysis from './consanguinity-analysis'

const LEFT_PANEL_WIDTH = 240

@connect(props => props[namespace] || {})
@Form.create()
export default class DataDirectoryManage extends React.Component {
  state = {
    displayType: 'data-dir',
    isShowDrawer: false,
    tableName: ''
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  renderTableList = () => {
    const { listData = [], cataLogTreeInfo, expandedKeys, selectedKeys = [] } = this.props
    const selectKey = _.get(selectedKeys, '0', '')
    // const canDel = getRootNodeActionTypeByKey(treeNodeKeyStr(selectKey), cataLogTreeInfo.types, cataLogTreeInfo.tasks, _.startsWith(selectKey, 'type-')) == TASK_ACTION_TYPE.dataCollection

    if (_.startsWith(selectKey, 'type-') && this.state.displayType !== 'data-dir') {
      const typeId = selectKey.substr(5)
      return (
        <div className='task-table-panel corner pd2'>
          <div className='alignright'>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={() => {
                this._visualModelingList.setState({
                  visiblePopoverKey: 'editor-modal'
                })
              }}
            >
              创建数据模型
            </Button>
          </div>
          <VisualModelingList innerRef={ref => (this._visualModelingList = ref)} key={typeId} typeId={typeId} />
        </div>
      )
    }
    const columns = [
      {
        title: '表名',
        dataIndex: 'TABLE_NAME',
        width: 200
      },
      {
        title: '别名',
        dataIndex: 'TABLE_CAT',
        width: 200
      },
      {
        title: '业务',
        dataIndex: 'business',
        width: 200
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        render: v => (v ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-'),
        width: 200
      },
      {
        title: '操作',
        dataIndex: 'operation',
        width: 150,
        render: (v, o) => (
          <div>
            <a
              onClick={() => {
                const newExpandedKeys = `type-${o.TABLE_SCHEM}` // getAllParent({ ...cataLogTreeInfo, selectId: o.id.toString() })
                this.props.dispatch({
                  type: `${namespace}/getDataFields`,
                  payload: { selectedKeys: [`${o.TABLE_SCHEM}##${o.TABLE_NAME}`], expandedKeys: _.concat(newExpandedKeys, expandedKeys) }
                })
              }}
            >
              查看
            </a>
            {/* {
            canDel
              ? <Popconfirm
                title="确定删除当前报告？"
                onConfirm={() => {
                  this.props.dispatch({
                    type: `${namespace}/deleteBaseTable`,
                    payload: { dbId: o.dbId, tableName: o.tableName }
                  })
                }}
              >
                <a className="mg2l" >删除</a>
              </Popconfirm>
              : null
          } */}
            {o.TABLE_SCHEM && (
              <a
                className='mg2l'
                onClick={() => {
                  this.props.dispatch({
                    type: `${namespace}/getLineageData`,
                    // payload: {name: `${"azkaban"}.${o.tableName}`}
                    payload: { name: `${o.TABLE_SCHEM}.${o.TABLE_NAME}` }
                    // payload: {name: 'default.target_table3'}
                  })
                  this.setState({ isShowDrawer: true, tableName: o.TABLE_NAME })
                }}
              >
                血缘分析
              </a>
            )}
          </div>
        )
      }
    ]
    const data = listData.filter(p => p.TABLE_SCHEM === selectKey.replace('type-', ''))
    return (
      <div className='task-table-panel corner pd2' style={{ overflowY: 'auto' }}>
        <Table
          rowKey='id'
          size='middle'
          columns={columns}
          dataSource={data}
          bordered
          pagination={{
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
            total: data.length,
            showSizeChanger: true,
            defaultPageSize: 10
          }}
        />
      </div>
    )
  }

  getTableInfoByVersion = selectVersion => {
    this.props.dispatch({
      type: `${namespace}/getDataFieldsByVersion`,
      payload: { selectVersion }
    })
  }

  baseMsgView = () => {
    const { tableInfo = {}, versions = [], selectVersion } = this.props
    return (
      <div className='bg-grey-f5'>
        <div className='pd2'>
          <Row>
            <Col span={9} className='data-dict-title bold' style={{ lineHeight: '33px' }}>
              {tableInfo.tableName}
            </Col>
            <Col span={5} style={{ lineHeight: '33px' }}>
              {' '}
              <span>业务:</span>
              <span className='bold mg1l'>{tableInfo.business}</span>
            </Col>
            <Col span={5} style={{ lineHeight: '33px' }}>
              <span>创建时间:</span>
              <span className='bold mg1l'>{moment(tableInfo.createTime).format('YYYY-MM-DD HH:mm')}</span>
            </Col>
            <Col span={5} style={{ lineHeight: '33px' }}>
              <span>版本:</span>
              <span className='bold mg1l'>
                <Select value={selectVersion} onChange={v => this.getTableInfoByVersion(v)} style={{ minWidth: '100px' }}>
                  <Select.Option value=''>请选择版本时间</Select.Option>
                  {versions.map((p, ind) => (
                    <Select.Option value={p.id} key={ind}>
                      {moment(p.createTime).format('YYYY-MM-DD')}
                    </Select.Option>
                  ))}
                </Select>
              </span>
            </Col>
          </Row>
        </div>
      </div>
    )
  }

  tableStructView = () => {
    const { dataFields = [] } = this.props
    const columns = [
      {
        title: '字段名',
        dataIndex: 'name',
        width: 200
      },
      {
        title: '类型',
        dataIndex: 'type',
        width: 200
      },
      {
        title: '描述',
        dataIndex: 'comment',
        render: v => (v ? v : '-'),
        width: 200
      }
    ]

    return (
      <div className='pd2t'>
        <span>
          <TableOutlined style={{ color: '#7F7CE0' }} />
        </span>
        <span className='data-dict-title bold mg1l'>表结构</span>
        <div className='pd2t'>
          <Table bordered size='middle' pagination={false} dataSource={dataFields} columns={columns} scroll={{ y: 320 }} />
        </div>
      </div>
    )
  }

  tableIndexView = () => {
    const { dataIndexs = [] } = this.props
    const columns = [
      {
        title: '索引名',
        dataIndex: 'name',
        width: 200
      },
      {
        title: '索引字段',
        dataIndex: 'columns',
        width: 200
      },
      {
        title: '索引类型',
        dataIndex: 'type',
        render: v => (v ? v : '-'),
        width: 200
      }
    ]
    return (
      <div className='pd2t'>
        <span>
          <ApiOutlined style={{ color: '#7F7CE0' }} />
        </span>
        <span className='data-dict-title bold mg1l'>表索引</span>
        <div className='pd2t'>
          <Table bordered size='middle' pagination={false} dataSource={dataIndexs} columns={columns} scroll={{ y: 220 }} />
        </div>
      </div>
    )
  }

  render() {
    const { dataFields = [], dataIndexs = [], tableInfo = {}, selectedKeys, location } = this.props
    const { isShowDrawer, tableName } = this.state
    let displayHiveDs = _.endsWith(location.pathname, 'data-dictionary-manager')
    const selectKey = _.get(selectedKeys, '0', '')
    const pageTitle = displayHiveDs ? '数据字典' : '数据建模'
    return (
      <div className='width-100 task-schedule height-100'>
        <Bread path={[{ name: '数据建模' }]} />
        <HorizontalSplitHelper style={{ height: 'calc(100% - 44px)' }} collapseWidth={100}>
          <div className='height-100 task-left-panel' defaultWeight={LEFT_PANEL_WIDTH} collapseTitle='数据建模'>
            <CatalogTree />
          </div>
          <div className='height-100 task-right-panel' defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH}>
            {_.startsWith(selectKey, 'type-') ? (
              this.renderTableList()
            ) : (
              <div className='task-table-panel corner pd2'>
                {this.baseMsgView()}
                {this.tableStructView()}
                <div className='mg2t pd1t bg-grey-f5' />
                {this.tableIndexView()}
              </div>
            )}
          </div>
        </HorizontalSplitHelper>
        <Drawer
          placement='right'
          closable
          onClose={() => this.setState({ isShowDrawer: false })}
          visible={isShowDrawer}
          width='90%'
          bodyStyle={{ height: '100%', padding: '0px' }}
          className='dataDiretoryManageDrawer'
        >
          <ConsanguinityAnalysis tableName={tableName} />
        </Drawer>
      </div>
    )
  }
}
