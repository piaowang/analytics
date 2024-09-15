import React, { PureComponent } from 'react'
import { Spin, Table, Tooltip,Tag } from 'antd'
import { Link } from 'react-router'
import moment from 'moment'
export default class TableComponent extends PureComponent {
  state = {
    pageSize: 30,
    page: 0,
    type:null,
    status:null,
    keyWord:null,
    listData: []
  };
  componentDidMount() {
    
  }

  fixType(type) {
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
  fixStatus(type) {
    switch (type) {
      case -1:
        return <Tag color="#f50">未提交</Tag>
      case 0:
        return <Tag color="#f50">待审核</Tag>
      case 1:
        return <Tag color="#87d068">正常</Tag>
      case 2:
        return <Tag color="#108ee9">已驳回</Tag>
      default:
        return ''
    }
  }
  fixCheckName(item) {
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
  operationType(val) {
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
  fixName(item) {
    const user = this.fixType(item.type)
    return (
      user +
      this.operationType(item.operationType) +
      '_' +
      this.fixCheckName(item)
    )
  }
  columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      align: 'center',
      render: (text, item) => {
        return <Tooltip placement="topLeft">{this.fixName(item)}</Tooltip>
      }
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      align: 'center',
      render: text => {
        return (
          <Tooltip placement="topLeft">{this.operationType(text)}</Tooltip>
        )
      }
    },
    {
      title: '类别',
      dataIndex: 'type',
      key: 'type',
      align: 'center',
      render: type => {
        return <Tooltip placement="topLeft">{this.fixType(type)}</Tooltip>
      }
    },
    {
      title: '申请人',
      dataIndex: 'apply_user',
      key: 'apply_user',
      align: 'center',
      render: val => {
        return <Tooltip placement="topLeft">{val.username || ''}</Tooltip>
      }
    },
    {
      title: '提交时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      align: 'center',
      render: val =>{
        return val?moment(val).format('YYYY-MM-DD HH:mm:ss'):''
      }
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      key: 'status',
      align: 'center',
      render: val => {
        return <Tooltip placement="topLeft">{this.fixStatus(val)}</Tooltip>
      }
    },
    {
      title: '审核时间',
      dataIndex: 'acceptanceTime',
      key: 'acceptanceTime',
      align: 'center',
      render: (val,d) =>{
        return d.status === 1 ? moment(val).format('YYYY-MM-DD HH:mm:ss'):''
      }
    },
    {
      title: '审核人',
      dataIndex: 'check_user',
      key: 'check_user',
      align: 'center',
      render: (val,d) => {
        return <Tooltip placement="topLeft">{d.status === 1? val?.username : ''}</Tooltip>
      }
    },
    {
      title: '操作',
      align: 'center',
      render: (text, record) => {
        return (
          <div className="data-checking-option">
            {record.status === 0? (
              <Link className="mg2r" 
                onClick={()=>{this.props.setTargetCheck({data:record})}}  
                to={`/console/data-checking/detail?id=${record.id}`}
              >
                审核
              </Link>
            ):null}
            {
              record.status === 1 && (
                <Link className="mg2r" 
                  onClick={()=>{this.props.setTargetCheck({data:record})}} 
                  to={`/console/data-checking/detail?id=${record.id}`}
                >
                  查看详细
                </Link>
              )
            }
            
          </div>
        )
      }
    }
  ];

  render() {

    const onPageChange = (page,pageSize)=>{
      this.props.changeQuery({data:{page,pageSize}})
    }

    const pagination = {
      total:this.props.total,
      defaultPageSize: this.props.pageSize,
      onChange: (p,s)=>{onPageChange(p,s)},
      showTotal: total => `共 ${total} 条数据`
    }

    return (
      <Spin spinning={false}>

        <Table
          columns={this.columns}
          dataSource={this.props.listData}
          bordered
          size="small"
          pagination={pagination}
          rowKey={record => record.id}
        />
        {/* <Pagination 
          style={{textAlign:'center',marginTop:'10px'}} 
          current={this.props.page} 
          pageSize={this.props.pageSize} 
          total={this.props.total}
          showSizeChanger 
          pageSizeOptions={['20','30']} 
          onChange={(c,p)=>{
            onPageChange(p,s)
          }}
          onShowSizeChange={(c,s)=>{
            onPageSizeChange(c,s)
          }}
        /> */}
      </Spin>
    )
  }
}
