import React from 'react'
import { DeleteOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, message, Input, Table, Popconfirm, Modal, Radio, Tooltip } from 'antd';
import { Auth } from '../../common/permission-control'
import { connect } from 'react-redux'
import importModel,{ namespace } from './model'
import moment from 'moment'
import PubSub from 'pubsub-js'
import {isDiffByPath} from '../../../common/sugo-utils'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'

const Search = Input.Search
const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 19 }
}
const RadioGroup = Radio.Group
@connect(state => ({ ...state[namespace],...state['sagaCommon']}))
@withRuntimeSagaModel(importModel)
export default class ImportHistoryList extends React.Component {

  componentDidMount() {  
    const { projectCurrent } = this.props
    this.subToken = PubSub.subscribe('analytic.hql-import-get-list', () => {    
      this.getData(projectCurrent.id, 1, '')
    })
  }

  componentDidUpdate(prevProps) {
    if (isDiffByPath(this.props, prevProps, 'projectCurrent')) {
      const { projectCurrent, pageIndex, searchKey } = this.props
      this.getData(projectCurrent.id, pageIndex, searchKey)
    }
  }

  componentWillUnmount() {
    PubSub.unsubscribe(this.subToken)
  }

  getData(projectId, pageIndex, searchKey = '') {
    this.props.dispatch({
      type: `${namespace}/getList`,
      payload: { projectId, pageIndex, searchKey }
    })
  }

  changeState(params) {
    this.props.dispatch({
      type: `${namespace}/change`,
      payload: params
    })
  }

  saveConfig(clearConfig) {
    this.props.dispatch({
      type: `${namespace}/saveConfig`,
      payload: { clearConfig }
    })
  }

  genTableColumns = () => {
    const { projectId, pageIndex, searchKey } = this.props
    return [
      {
        title: '文件名',
        dataIndex: 'file_name'
      },
      {
        title: '备注',
        dataIndex: 'file_memo',
        render: v => (
          <Tooltip title={v}>
            <div className="elli" style={{width:'70px'}}>{v}</div>
          </Tooltip>
        )
      },
      {
        title: '文件大小',
        dataIndex: 'file_size',
        render: v => {
          let text
          v = v + ''
          if (v.length >= 4) {
            text = Number(v * 0.001 ).toFixed(2)+ 'K'
          } else if (v.length >= 8) {
            text = Number(v * 0.000001 ).toFixed(2)+ 'M'
          }
          
          return <div>{text}</div>
        }
      },
      {
        title: '文件行数',
        dataIndex: 'line_count'
      },
      {
        title: '文件列数',
        dataIndex: 'column_count'
      },
      {
        title: '上传时间',
        dataIndex: 'created_at',
        render: v => moment(v).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        title: '提交用户',
        dataIndex: 'created_user_name'
      },
      {
        title: '操作',
        dataIndex: 'actions',
        render: (v, record) => {
          return (
            <div>
              {
                record.state === 1 ?
                  <Popconfirm
                    placement="top"
                    title={`确认删除文件[${record.file_name}]？`}
                    onConfirm={() => {
                      this.props.dispatch({
                        type: `${namespace}/deleteHistory`,
                        payload: { id: record.id, projectId, pageIndex, searchKey }
                      })
                      message.success('执行成功')
                    }}
                    okText="确定"
                    cancelText="取消"
                  >
                    <DeleteOutlined className="mg2r pointer" />
                  </Popconfirm>
                  : null
              }
            </div>
          );
        }
      }
    ];
  }

  import = () => {
    let { importData } = this.props
    importData()
  }

  render() {
    let { historyData, projectId, historyCount, clearConfig, configVisible, importData, searchKey, pageIndex, oldClearConfig } = this.props
    return (
      <React.Fragment>
        <div>
          <div className="itblock width200 mg1l">
            <Search
              placeholder="搜索文件名"
              onSearch={v => {
                this.getData(projectId, 1, v)
              }}
            />
          </div>
          <div className="fright">
            <Auth auth="app/tag-hql/clear-config/set">
              <Button
                type="primary"
                className="mg1r"
                onClick={() => this.changeState({ configVisible: true })}
              >周期配置</Button>
            </Auth>
            <Auth auth="app/tag-hql/data-import">
              <Button
                type="primary"
                onClick={this.import}
              >标签数据导入</Button>
            </Auth>
          </div>
        </div>
        <div className="pd2t">
          <Table
            rowKey="id"
            columns={this.genTableColumns()}
            dataSource={historyData}
            // expandedRowRender={record => <div>备注：{record.file_memo}</div>}
            pagination={{
              // current: page,
              current: pageIndex,
              defaultCurrent:1,
              onChange: (page) => this.getData(projectId, page, searchKey),
              showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
              total: historyCount,
              // showSizeChanger: true,
              defaultPageSize: 10
            }}
          />
          <Modal
            title="数据清理周期设置"
            visible={configVisible}
            onCancel={() => this.changeState({ configVisible: false })}
            footer={[
              <Button
                key="back"
                type="ghost"
                size="large"
                onClick={() => this.changeState({ configVisible: false, clearConfig: oldClearConfig})}
              >关闭</Button>,
              <Button
                key="downloadBtn"
                type="primary"
                size="large"
                onClick={() => this.saveConfig(clearConfig)}
              >保存</Button>
            ]}
          >
            <Form.Item {...formItemLayout} label="文件清理周期">
              <RadioGroup onChange={e => this.changeState({ clearConfig: e.target.value })} value={clearConfig}>
                <Radio value={'1'}>1个月</Radio>
                <Radio value={'3'}>3个月</Radio>
                <Radio value={'6'}>6个月</Radio>
                <Radio value={'12'}>12个月</Radio>
              </RadioGroup>
            </Form.Item>
          </Modal>
        </div>
      </React.Fragment>
    )
  }
}
