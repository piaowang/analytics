import React from 'react'
import _ from 'lodash'
import PropTypes from 'prop-types'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import {Auth} from '../../common/permission-control'
import { PlusOutlined } from '@ant-design/icons';
import { Tooltip, Button, Table, Select, Input } from 'antd';
import MyModel from './model'
import {BusinessDimensionTypeEnum, BusinessDimensionCreateModeEnum, BusinessDimensionStatusEnum} from '../../../common/constants'

const {Option} = Select
const { Search } = Input

let mapStateToProps = state => {
  return {
    businessDimension: state.common.businessDimension,
    roles: state.common.roles
  }
}
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
class List extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      createMode: 0,
      pagination: this.pagination(),
      seletRow: [],
      visible: false,
      rows: {},
      modleType: 'create'
    }
    this.getData()
  }

  getData = async () => {
    await this.props.getBusinessDimension({}, ()=>{
      const {businessDimension } = this.props
      const {total, pageSize, current} = businessDimension
      const pagination = this.pagination(total, pageSize, current)
      this.setState({
        pagination
      })
    })
    await this.props.getRoles()
  }
 
  columns() {
    const {roles=[]} = this.props
    return [{
      title: '维度名称',
      dataIndex: 'name'
    }, {
      title: '别名',
      dataIndex: 'alias'
    }, {
      title: '类型',
      dataIndex: 'type',
      render: (value) => {
        const texts = BusinessDimensionTypeEnum
        return (<span>{texts[value]}</span>)
      }
    }, {
      title: '创建方式',
      dataIndex: 'create_mode',
      render: (value) => {
        const texts = BusinessDimensionCreateModeEnum
        return (<span>{texts[value]}</span>)
      }
    }, {
      title: '授权访问',
      width: '30%',
      dataIndex: 'roleIds',
      render: (value) => {  
        return (
          <div>
            {
              roles.map(role => {
                let {id, name} = role
                if (value && value.includes && value.includes(id)) {
                  return (<span className="pd2r">{name}</span>)
                } else {
                  return null
                }
              })
            }
          </div>
        )
      }
    }, {
      title: '状态',
      dataIndex: 'status',
      render: (value) => {
        const texts = BusinessDimensionStatusEnum
        return (<span>{texts[value]}</span>)
      }
    }, {
      title: '操作',
      dataIndex: 'option',
      render: (text, row) => {
        return (
          <div>
            <Tooltip placement="top" title="修改">
              <a disabled={(status === 3)} onClick={this.edit(row)} style={{ padding: '0', marginRight: '6px' }}>编辑</a>
            </Tooltip>
            <Tooltip placement="top" title="详情">
              <a onClick={this.delete(row.id)} style={{ padding: '0 6px' }}>删除</a>
            </Tooltip>
          </div>
        )
      }
    }]
  }

  cancel = () => {
    this.setState({
      visible: false
    })
  }

  edit = (row) => {
    return () => {
      this.setState({
        visible: true,
        row,
        modleType: 'editor'
      })
    }
  }

  delete = (id) => {
    return async() => {
      await this.props.deleteBusinessDimension({id}, () => {
        this.getData()
      })
    }
  }

  add = () => {
    this.setState({
      modleType: 'create',
      visible: true
    })
  }

  create = async (value) => {
    console.log(value)
    await this.props.createBusinessDimension(value, () => {
      this.setState({visible: false})
      this.getData()
    })
  }

  update = async (value) => {
    await this.props.updateBusinessDimension(value, () => {
      this.setState({visible: false})
      this.getData()
    })
  }

  changePage = async (current, pageSize= 10) => {
    await this.props.getBusinessDimension({pageSize, current}, ()=> {
      const {businessDimension } = this.props
      const {total, pageSize, current} = businessDimension
      const pagination = this.pagination(total, pageSize, current)
      this.setState({
        pagination
      })
    })
  }

  pagination = (total=0, pageSize=10, current=1) => {
    return {
      total,
      showSizeChanger: true,
      defaultPageSize: 10,
      current,
      pageSize,
      onChange: this.changePage,
      onShowSizeChange: this.changePage,
      showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
    }
  }

  selectCreateMode = async (value) => {
    const queryParams = {
      create_mode: value
    }
    await this.props.getBusinessDimension({queryParams}, ()=>{
      const {businessDimension } = this.props
      const {total, pageSize, current} = businessDimension
      const pagination = this.pagination(total, pageSize, current)
      this.setState({
        pagination,
        createMode: value
      })
    })
  }

  onSearch= async (value) => {
    const queryParams = {
      name: value
    }
    await this.props.getBusinessDimension({queryParams}, ()=>{
      const {businessDimension } = this.props
      const {total, pageSize, current} = businessDimension
      const pagination = this.pagination(total, pageSize, current)
      this.setState({
        pagination,
        createMode: 0
      })
    })
  }

  render() {
    const {businessDimension, roles=[] } = this.props
    const {seletRow, row, modleType, visible, createMode, pagination} = this.state

    const {list: dataSource} = businessDimension
  
    const rowSelection = {
      onChange: (keys, rows) => this.setState({ seletRow: rows }),
      selectedRowKeys: seletRow.map(({ id }) => id)
    }
    const onRow = (record) => ({
      onClick: (e) => {
        if (e.target.tagName !== 'TD') {
          return ''
        }
        const rowSet = new Set(seletRow)
        if (rowSet.has(record)) {
          rowSet.delete(record)
          return this.setState({ seletRow: [...rowSet] })
        }
        return this.setState({ seletRow: [...seletRow, record] })
      }
    })

    const modelProps = {
      row,
      visible,
      modleType,
      cancel: this.cancel,
      onOk: this.create,
      editor: this.update,
      roles
    }

    return (
      <React.Fragment>
        <div className="nav-bar">
          <div className="fix">
            <div className="itblock">
              <div className="iblock">
                <div className="ant-breadcrumb">
                  <span className="itblock elli"><b>业务维度管理</b></span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pd3x pd2y">
          <div className="pd2b" style={{overflow: 'hidden'}}>
            <div className="fleft" style={{display:'flex',alignItems:'center'}}>
              <Select
                className="width100"
                value={createMode}
                onChange={this.selectCreateMode}
              >
                {BusinessDimensionCreateModeEnum.map((name, index) => (<Option key={index} value={index}>{name}</Option>))}
              </Select>
              <Search
                allowClear 
                className="width200"
                style={{marginLeft: '10px',height:'32px',boxSizing:'border-box',padding:'0px 11px',overflow:'hidden'}}
                placeholder="请输入维度名称"  
                onSearch={this.onSearch}
              />
            </div>
            <div className="fright">
              <Auth auth="post:/app/offline-calc/tables">
                <Button type="primary" icon={<PlusOutlined />} onClick={this.add} >添加业务维度</Button>
              </Auth>
            </div>
          </div>
          <Table
            bordered
            rowKey="id"
            size="middle"
            rowSelection={rowSelection}
            columns={this.columns()}
            dataSource={dataSource}
            pagination={pagination}
            onRow={onRow}
          />
        </div>
        <MyModel {...modelProps} />
      </React.Fragment>
    );
  }
}

List.propTypes  = {
  businessDimension: PropTypes.object,
  pagination: PropTypes.object,
  getBusinessDimension: PropTypes.func,
  getRoles: PropTypes.func
  
}

export default List
