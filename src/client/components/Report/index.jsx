import React from 'react'
import {
  Button,
  Table,
  Input,
  Modal,
  message,
  Popconfirm,
  Tooltip
} from 'antd'
import {
  SearchOutlined,
  DeleteOutlined,
  PlusCircleOutlined
} from '@ant-design/icons'
import { connect } from 'react-redux'
import moment from 'moment'

import FormData from './form.jsx'
import { Auth } from '../../common/permission-control'
import Fetch from 'client/common/fetch-final'

@connect(({ reportModel }) => ({
  list: reportModel.list,
  total: reportModel.total
}))
class Report extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      pageSize: 20,
      page: 0,
      search: '',
      visible: false,
      isEdit: false,
      formData: {}
    }
  }
  componentDidMount() {
    this.getData()
  }
  //获取数据
  async getData() {
    const { pageSize, page, search } = this.state
    this.props.dispatch({
      type: 'reportModel/getData',
      payload: { pageSize, page, search }
    })
  }

  async delFun(id) {
    window.sugo.$loading.show()
    const res = await Fetch.post('/app/mannings/del', { id })
    window.sugo.$loading.hide()
    if(res.success){
      message.success('操作成功')
      this.setState(
        {
          page: 0
        },
        this.getData
      )
    }
    
  }
  //搜素
  searchFun() {
    this.setState(
      {
        page: 0
      },
      this.getData
    )
  }
  async handleOk(data) {
    window.sugo.$loading.show('', 10000)
    if (data.id) {
      // 编辑
      const res = await Fetch.post('/app/mannings/save', data)
      window.sugo.$loading.hide()
      if (res.success) {
        // 更新数据
        this.setState(
          {
            page: 0,
            visible: false,
            formData: {}
          },
          this.getData
        )
        message.success('操作成功')
      } else {
        message.error(res.message)
      }
    } else {
      //新增
      const res = await Fetch.post('/app/mannings/add', data)
      window.sugo.$loading.hide()
      if (res.result[1]) {
        // 更新数据
        message.success('操作成功')
        this.setState(
          {
            page: 0,
            visible: false,
            formData: {}
          },
          this.getData
        )
      } else {
        message.error('视图标题不能重复')
      }
    }
  }
  //取消
  handleCancel() {
    this.setState({
      visible: false,
      formData: {}
    })
  }
  //打开弹窗
  openModal(type, formData = {}) {
    this.setState({
      visible: true,
      isEdit: type ? false : true,
      formData
    })
  }
  columns = [
    {
      title: '排序',
      width: 50,
      key: 'sortNumber',
      dataIndex: 'sortNumber',
      onCell: (record) => ({
        record,
        editable: true,
        title: '排序'
      })
    },
    {
      title: '视图标题',
      key: 'title',
      dataIndex: 'title'
    },
    {
      title: '视图路径',
      key: 'name',
      dataIndex: 'name'
    },
    {
      title: '创建时间',
      key: 'createdAt',
      dataIndex: 'createdAt',
      render: (val) => {
        return moment(val).format('YYYY-MM-DD HH:mm:ss')
      }
    },
    {
      title: '操作',
      key: 'op',
      dataIndex: 'id',
      render: (id, val) => {
        return (
          <React.Fragment>
            <Auth auth="post:/app/mannings/save">
              <Button
                size="small"
                type="primary"
                className="mg1r"
                onClick={() => this.openModal(0, val)}
              >
                编辑
              </Button>
            </Auth>
            <Auth auth="post:/app/mannings/del">
              <Popconfirm
                title="确定删除该条数据吗？"
                onConfirm={() => this.delFun(id)}
                okText="确定"
                cancelText="取消"
              >
                <Button size="small" type="primary" danger>
                  删除
                </Button>
              </Popconfirm>
            </Auth>
          </React.Fragment>
        )
      }
    }
  ];
  //改变排序数字
  changeSort = (val, v) => {
    if (val.sortNumber == v) return false
    val.sortNumber = v
    this.handleOk(val)
  };
  EditableCell = ({ editable, children, record, ...restProps }) => {
    const [editing, setEditing] = React.useState(false)
    const [sortValue, setSortValue] = React.useState(record?.sortNumber || 0)
    const toggleEdit = () => {
      setEditing(true)
    }
    let refsInput = React.useRef()
    if (editable) {
      React.useEffect(() => {
        if (editing) {
          refsInput.current.focus()
        }
      }, [editing])
      const childNode = editing ? (
        <Input
          style={{ width: '50px', textAlign: 'center', height: '24px' }}
          ref={refsInput}
          onBlur={(e) => {
            setEditing(false)
            if (e.target.value != 0 && !e.target.value) {
              setSortValue(record.sortNumber)
              return
            }
            this.changeSort(record, e.target.value)
          }}
          value={sortValue}
          onChange={(e) => {
            const { value } = e.target
            const reg = /^\d*(\.\d*)?$/
            if (
              (!isNaN(value) && reg.test(value)) ||
              value === ''
            ) {
              setSortValue(value)
            } else {
              setSortValue(sortValue)
            }
          }}
        />
      ) : (
        <Tooltip title="数字越小越排在前面">
          <div
            style={{ textAlign: 'center', cursor: 'pointer', width: '50px' }}
            onClick={toggleEdit}
          >
            {record.sortNumber}
          </div>
        </Tooltip>
      )
      return <td {...restProps}>{childNode}</td>
    }
    return <td {...restProps}>{children}</td>
  };
  render() {
    const { search, visible, isEdit, formData, pageSize } = this.state
    const pagination = {
      total: this.props.total,
      showTotal: (total) => `共 ${total} 条数据`,
      pageSize,
      defaultCurrent: 1,
      showSizeChanger: true,
      size: 'middle',
      onChange: (page, pageSize) => {
        this.setState(
          {
            page: page - 1
          },
          this.getData
        )
      },
      onShowSizeChange: (current, size) => {
        this.setState(
          {
            page: 0,
            pageSize: size
          },
          this.getData
        )
      }
    }
    // 模板
    const components = {
      body: {
        cell: this.EditableCell
      }
    }
    return (
      <div className="height-100 bg-white" style={{ overflowY: 'auto' }}>
        <div className="pd2b pd3x height80 line-height80">
          <div className="fix">
            <div className="fleft">
              <Input
                onChange={(e) => this.setState({ search: e.target.value })}
                value={search}
                placeholder="请输入搜素标题"
                className="iblock width260 mg1l"
              />
              <Button
                className="mg2r mg2l"
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => this.searchFun()}
              >
                搜索
              </Button>
              <Button
                icon={<DeleteOutlined />}
                onClick={() => {
                  this.setState(
                    {
                      search: '',
                      page: 0
                    },
                    () => {
                      this.getData()
                    }
                  )
                }}
              >
                清空
              </Button>
            </div>
            <div className="fright">
              <Auth auth="post:/app/mannings/add">
                <Button type="primary" onClick={() => this.openModal(1)}>
                  <PlusCircleOutlined />
                  新建视图
                </Button>
              </Auth>
            </div>
          </div>
        </div>

        <div className="pd1t pd3x">
          <Table
            components={components}
            rowClassName={() => 'editable-row'}
            loading={false}
            bordered
            size="middle"
            rowKey="id"
            pagination={pagination}
            columns={this.columns}
            dataSource={this.props.list}
          />
        </div>
        <Modal
          title={isEdit ? '编辑视图' : '新建视图'}
          visible={visible}
          footer={null}
          onCancel={() => this.handleCancel()}
        >
          <FormData
            formData={{ ...formData }}
            onOk={(data) => this.handleOk(data)}
            onCancel={() => this.handleCancel()}
          />
        </Modal>
      </div>
    )
  }
}

export default Report
