import React from 'react'
import { Link } from 'react-router'
import { CloseCircleOutlined, EditOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Tooltip, Table, Button, Popconfirm, message } from 'antd';
import _ from 'lodash'
import moment from 'moment'
import Search from '../Common/search'

//用户类型，trial试用用户, payed付款用户
const typeDic = {
  trial: '试用用户',
  payed: '付款用户'
}

export default class CompanyList extends React.Component {

  state = {
    keyword: ''
  }

  onChange = e => {
    let keyword = e.target.value
    this.setState({keyword})
  }

  del = se => {
    return async () => {
      let res = await this.props.delCompany(se)
      if (res) message.success('删除成功')
    }
  }

  renderNoContent = () => {
    return (
      <p className="ug-empty pd2 aligncenter">
        还没有企业.
        <Link to="/console/company/new">
          <Button type="primary">
            <PlusCircleOutlined className="mg1r" />
            新建企业
          </Button>
        </Link>
      </p>
    );
  }

  renderEditBtn = ug => {
    let {title, id, is_root} = ug
    if (is_root) {
      return null
    }
    return (
      <Tooltip placement="topLeft" title={`编辑 ${title} `}>
        <Link className="pointer" to={`/console/company/${id}`} >
          <EditOutlined className="mg1r font14 pointer" />
        </Link>
      </Tooltip>
    );
  }

  renderDelBtn = ug => {
    if (ug.is_root) {
      return null
    }
    return (
      <Popconfirm
        title={`确定删除企业 "${ug.title}" 么？`}
        placement="topLeft"
        onConfirm={this.del(ug)}
      >
        <Tooltip title="删除">
          <CloseCircleOutlined className="font14 mg1l color-grey pointer" />
        </Tooltip>
      </Popconfirm>
    );
  }

  renderTitle = (title, ug) => {
    return (
      <Tooltip placement="topLeft" title={`编辑 ${title}`}>
        <div className="mw400 elli">
          <Link className="pointer" to={`/console/company/${ug.id}`} >
            {title}
          </Link>
        </div>
      </Tooltip>
    )
  }

  renderContent = () => {
    let {companys} = this.props
    let {keyword} = this.state
    let companys0 = keyword
      ? companys.filter(c => {
        return JSON.stringify(_.pick(c, ['name', 'description', 'email'])).includes(keyword)
      })
      : companys

    const pagination = {
      total: companys0.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    let columns = [{
      title: '企业名称',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name > b.name ? 1 : -1,
      render: this.renderTitle
    }, {
      title: '创建日期',
      dataIndex: 'createdAt',
      sorter: (a, b) => a.createdAt > b.createdAt ? 1 : -1,
      key: 'createdAt',
      render(date) {
        return moment(date).format('YYYY-MM-DD HH:mm:ss')
      }
    }, {
      title: '邮箱地址',
      dataIndex: 'email',
      sorter: (a, b) => a.email > b.email ? 1 : -1,
      key: 'email'
    }, {
      title: '联系电话',
      key: 'cellphone',
      dataIndex: 'cellphone',
      sorter: (a, b) => a.cellphone - b.cellphone ? 1 : -1
    }, {
      title: '类型',
      key: 'type',
      dataIndex: 'type',
      sorter: (a, b) => a.type - b.type,
      render (type) {
        return typeDic[type]
      }
    }, {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      sorter: (a, b) => a.active > b.active ? 1 : -1,
      render (active, ug) {
        if (ug.is_root) return '管理员'
        return active ? '正常' : '禁用'
      }
    }, {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      render: (text) => {
        return text
          ? <Tooltip placement="topLeft" title={text}>
            <div className="mw300 elli">{text}</div>
          </Tooltip>
          : null
      }
    }, {
      title: <div className="aligncenter">操作</div>,
      key: 'op',
      dataIndex: 'id',
      render: (text, ug) => {
        return (
          <div className="aligncenter">
            {this.renderEditBtn(ug)}
            {this.renderDelBtn(ug)}
          </div>
        )
      }
    }]
    return (
      <div>
        <div className="alignright pd2b">
          <Search
            value={keyword}
            className="iblock width200"
            placeholder="搜索"
            onChange={this.onChange}
          />
        </div>
        <Table
          columns={columns}
          pagination={pagination}
          dataSource={companys0}
          bordered
          rowKey={record => record.id}
          size="small"
        />
      </div>
    )

  }

  render () {
    let {
      companys
    } = this.props

    return companys.length
      ? this.renderContent()
      : this.renderNoContent()
  }
}

