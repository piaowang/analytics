import React from 'react'
import Bread from '../Common/bread'
import sagaModelGenerator, { namespace } from './business-line-management-model'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Tooltip, Table, Spin, message, Popconfirm, Input, Button, Select ,Divider, Tag } from 'antd'
import Icon from '../Common/sugo-icon'
import {Auth} from '../../common/permission-control'
import LineManagementEditModal from './business-line-management-edit-modal.jsx'
import moment from 'moment'
import { connect } from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'

@withRuntimeSagaModel(sagaModelGenerator)
@connect(state => ({ ...state[namespace], ...state['sagaCommon'] }))
export default class OfflineCalcBusinessLineManagement extends React.Component {

  state = {
    editModalVisible: false,
    editData:null,
    type:'0',
    data:[]
  }

  //初始化
  componentWillMount() {
    this.props.dispatch({
      type: `${namespace}/list`,
      payload:null,
      callback:this.resetData
    })
  }

  resetData = (data) => {
    this.setState({
      data:data
    })
  }

  hideModal = () => {
    this.setState({
      editModalVisible: false
    })
  }

  showModal = () =>{
    this.setState({
      editModalVisible: true
    })
  }

  create = () => {
    this.setState({
      editData:null,
      type:'0'
    })
    this.showModal()
  }


  edit = data => {
    this.setState({
      editData:data,
      type:'1'
    })
    this.showModal()
  }

  del = data => {
    this.props.dispatch({
      type: `${namespace}/delete`,
      payload:data,
      resetDataCallback:this.resetData,
      successCallback:this.hideModal
    })
  }

  modalSubmitCallBack = (type,data) => {
    if(type === '0'){
      this.props.dispatch({
        type: `${namespace}/save`,
        payload:data,
        resetDataCallback:this.resetData,
        successCallback:this.hideModal
      })
    }else if(type === '1'){
      this.props.dispatch({
        type: `${namespace}/update`,
        payload:data,
        resetDataCallback:this.resetData,
        successCallback:this.hideModal
      })
    }
  }

  render() {

    let loading = false
    let {editModalVisible,editData,type,data} = this.state

    const columns = [
      {
        title: 'id',
        dataIndex: 'id',
        key: 'id'
      },
      {
        title: '字典',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        render(text){
          return moment(text).format('YYYY-MM-DD HH:mm') 
        }
      },
      {
        title: '修改时间',
        key: 'updated_at',
        dataIndex: 'updated_at',
        render(text){
          return moment(text).format('YYYY-MM-DD HH:mm') 
        }
      },
      {
        title: '描述',
        dataIndex: 'describe',
        key: 'describe'
      },
      {
        title: <div className="aligncenter">操作</div>,
        dataIndex    : 'action',
        render: (text, data) => {
          return (
            <div className="aligncenter">
              <Auth auth="app/measure/update">
                <Tooltip title="编辑">
                  <Icon
                    type="sugo-edit"
                    className="color-grey font14 pointer hover-color-main"
                    onClick={() => this.edit(data)}
                  />
                </Tooltip>
              </Auth>
              <Auth auth="app/measure/delete">
                <Popconfirm
                  title={`确定删除字典${data.name}么？`}
                  placement="topLeft"
                  onConfirm={() => this.del(data)}
                >
                  <Tooltip title="删除">
                    <Icon type="sugo-trash" className="mg2l font14 color-grey hover-color-red pointer" />
                  </Tooltip>
                </Popconfirm>
              </Auth>
            </div>
          )
        }
      }
    ]
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '业务线条管理' }
          ]}
        />
        <div className="scroll-content">
        <Spin spinning={loading}>
        <div className="users-lists pd2y pd3x">
          <div className="pd2b">
            <div className="fix">
              <div className="fright">
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={this.create}
                  className="mg1r itblock">
                  新建字典
                    </Button>
                  </div>
                </div>
              </div>

              {
                editModalVisible
                  ? <LineManagementEditModal 
                    modalVisible={editModalVisible} 
                    hideModal={this.hideModal}
                    type={type}
                    data = {type === '1'?editData:null}
                    submitCallback={this.modalSubmitCallBack}
                  />
                  : null
              }

              <Table 
                columns={columns} 
                dataSource={data}
                bordered
              />
            </div>
          </Spin>
        </div>
      </React.Fragment>
    );
  }
}
