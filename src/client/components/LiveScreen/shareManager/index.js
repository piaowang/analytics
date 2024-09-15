import React from 'react'
import Bread from '../../Common/bread'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Select, Button, Table, Input, Tooltip, message } from 'antd'
import withFetchTableData from '../../../common/withFetchTableData'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import { shareStatus, shareType } from '../constants'
import ShareManagerModel from './model'
import moment from 'moment'
import _ from 'lodash'
import { EditModal1 } from './edit-modal'
import DeleteBtn from '../../../common/common-delete-btn'
import copyTextToClipboard from '../../../common/copy'
import { Anchor } from '../../Common/anchor-custom'

const namespace = 'share-manager'
const { Option } = Select

const showShare = namespace => props => {
  return ShareManagerModel({ ...props, namespace })
}

@withRuntimeSagaModel(showShare(namespace))
@Form.create()
class ShareManager extends React.Component {
  state = {
    shareId: ''
  }
  componentDidMount() {}
  cacheSearch = ''

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  columns = () => [
    {
      title: '分享名称',
      dataIndex: 'params',
      key: 'name',
      render: (t, r) => {
        return (
          <Anchor className='color-main' href={`${location.origin}/share/${r.id}`} target='_blank'>
            {_.get(t, 'shareContentName', '')}
          </Anchor>
        )
      }
    },
    {
      title: '分享类型',
      dataIndex: '',
      key: 'type',
      render: (t, r) => {
        if (_.get(r, 'params.restrictionsContent.value')) return '加密分享'
        return '公开分享'
      }
    },
    {
      title: '分享时间',
      dataIndex: 'updated_at',
      render: t => moment(t).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '分享结束时间',
      dataIndex: 'deadlineEnd'
    },
    {
      title: '剩余有效期',
      dataIndex: 'deadline',
      render: (t, r) => {
        if (r.deadlineEnd === '永久') return '无限制'
        if (moment(r.deadlineEnd).isBefore(moment())) return '--'
        return Math.ceil((moment(r.deadlineEnd) - moment()) / (24 * 60 * 60 * 1000)) + '天内'
      }
    },
    {
      title: '分享状态',
      dataIndex: '',
      key: 'status',
      render: (t, r) => {
        if (r.deadlineEnd === '永久') return '生效'
        if (moment().isBefore(moment(r.deadlineEnd))) return '生效'
        return '失效'
      }
    },
    {
      title: '操作',
      dataIndex: '',
      render: (t, r) => {
        return (
          <div>
            {moment(r.deadlineEnd).isBefore(moment()) ? null : (
              <Tooltip title='复制链接'>
                <a onClick={() => this.onCopy(r)} className='mg2r'>
                  复制链接
                </a>
              </Tooltip>
            )}
            <Tooltip title='编辑'>
              <a onClick={() => this.onEdit(r)} className='mg2r'>
                编辑
              </a>
            </Tooltip>
            {moment(r.deadlineEnd).isBefore(moment()) ? (
              <DeleteBtn text='删除' title='确定删除该项分享吗?' onClick={() => this.onDelete(r)} />
            ) : (
              <DeleteBtn text='取消' title='确定取消分享吗?' icon='rollback' onClick={() => this.onCancel(r)} />
            )}
          </div>
        )
      }
    }
  ]

  onCopy = r => {
    const sharingUrl = `${location.origin}/share/${r.id}`
    copyTextToClipboard(
      sharingUrl,
      () => message.success('复制分享链接成功'),
      () => message.warn('复制分享链接失败，请手动复制')
    )
  }

  onSearch = () => {
    const {
      form: { validateFields },
      onRefresh
    } = this.props
    validateFields((err, value) => {
      if (err) return
      const params = value
      if (JSON.stringify(value) === this.cacheSearch) return
      onRefresh(params)
      this.cacheSearch = JSON.stringify(params)
    })
  }

  onEdit = r => {
    this.changeState({ isShowEditModal: true })
    this.props.dispatch({
      type: `${namespace}/getShareById`,
      payload: { id: r.id }
    })
    this.setState({
      shareId: r.id
    })
  }

  onCancel = r => {
    this.props.dispatch({
      type: `${namespace}/cancelShare`,
      payload: { id: r.id },
      callback: () => this.props.onRefresh()
    })
  }

  onDelete = r => {
    this.props.dispatch({
      type: `${namespace}/deleteShare`,
      payload: { id: r.id },
      callback: () => this.props.onRefresh()
    })
  }

  renderHeader = () => {
    const {
      form: { getFieldDecorator, resetFields },
      onRefresh
    } = this.props
    return (
      // <Form>
      //   <Row align="middle" >
      //     <Col span={4}>
      //       <Form.Item  {...formItemLayout} >
      //         {getFieldDecorator('search')(
      //           <Input placeholder="请输入分享名称" style={{ width: 200 }} />
      //         )}
      //       </Form.Item>
      //     </Col>
      //     <Col span={4}>
      //       <Form.Item {...formItemLayout} label="类型">
      //         {getFieldDecorator('type')(
      //           <Select allowClear >
      //             {_.map(shareType, (v, k) => ({id: k, name: v})).map(o => {
      //               return (
      //                 <Option value={o.id} key={o.id}>{o.name}</Option>
      //               )
      //             })}
      //           </Select>
      //         )}
      //       </Form.Item>
      //     </Col>
      //     <Col span={4}>
      //       <Form.Item {...formItemLayout} label="状态">
      //         {getFieldDecorator('status')(
      //           <Select  allowClear>
      //             {(_.map(shareStatus, (v, k) => ({ id: k, name: v }))).map(o => {
      //               return (<Option value={o.id} key={o.id}>{o.name}</Option>)
      //             })}
      //           </Select>
      //         )}
      //       </Form.Item>
      //     </Col>
      //     <Col span={5}>
      //       <Button type="primary" icon="search" className="mg2r mg2l" onClick={this.onSearch} >搜索</Button>
      //       <Button type="primary" icon="delete" onClick={() => {
      //         resetFields()
      //         onRefresh()
      //       }} >清空</Button>
      //     </Col>
      //   </Row>
      // </Form>
      <Form layout='inline'>
        <Form.Item label='类型' labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
          {getFieldDecorator('type')(
            <Select placeholder='请选择分享类型' allowClear style={{ width: 200 }}>
              {_.map(shareType, (v, k) => ({ id: k, name: v })).map(o => {
                return (
                  <Option value={o.id} key={o.id}>
                    {o.name}
                  </Option>
                )
              })}
            </Select>
          )}
        </Form.Item>
        <Form.Item label='状态' labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
          {getFieldDecorator('status')(
            <Select placeholder='请选择分享状态' allowClear style={{ width: 200 }}>
              {_.map(shareStatus, (v, k) => ({ id: k, name: v })).map(o => {
                return (
                  <Option value={o.id} key={o.id}>
                    {o.name}
                  </Option>
                )
              })}
            </Select>
          )}
        </Form.Item>
        <Form.Item>{getFieldDecorator('search')(<Input placeholder='请输入分享名称' style={{ width: 200 }} />)}</Form.Item>
        <Form.Item>
          <Button type={'primary'} icon={<SearchOutlined />} onClick={this.onSearch}>
            搜索
          </Button>
        </Form.Item>
        <Form.Item>
          <Button
            icon={<DeleteOutlined />}
            style={{ background: '#F5F5F5' }}
            onClick={() => {
              resetFields()
              onRefresh()
            }}
          >
            清空
          </Button>
        </Form.Item>
      </Form>
    )
  }

  render() {
    let { data, onRefresh, pagination, isShowEditModal } = this.props
    data = data.map(d => {
      return {
        ...d,
        deadlineEnd: _.isEmpty(d.max_age)
          ? moment(d.deadline).endOf('d').format('YYYY-MM-DD HH:mm')
          : d.max_age === 'unlimited'
          ? '永久'
          : moment(moment(d.updated_at) + moment.duration(d.max_age).asMilliseconds()).format('YYYY-MM-DD HH:mm')
      }
    })
    return (
      <div className=''>
        <Bread path={[{ name: '分享管理' }]} />
        <div
          className='pd2'
          style={{
            height: 'calc(100vh - 94px)',
            overflowX: 'hidden'
          }}
        >
          <div className='pd2b'>{this.renderHeader()}</div>
          <Table rowKey='id' dataSource={data} columns={this.columns()} bordered pagination={pagination} />
        </div>

        {isShowEditModal && <EditModal1 visible={isShowEditModal} onRefresh={onRefresh} namespace={namespace} />}
      </div>
    )
  }
}

export default withFetchTableData(Form.create()(ShareManager), { namespace })
