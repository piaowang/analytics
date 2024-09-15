import React from 'react'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Tooltip, Table, Spin, message, Popconfirm, Input, Button, Select ,Divider, Tag } from 'antd'
import Icon from '../Common/sugo-icon'
import {Auth} from '../../common/permission-control'
import LineManagementEditModal from './business-line-management-edit-modal.jsx'
import moment from 'moment'

export default class LineManagementTable extends React.Component {

  state = {
    editModalVisible: false,
    editData:null,
    type:'0'
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

  del = measure => {
    return async () => {
      message.success('删除成功', 2)
    }
  }

  modalSubmitCallBack = (type,data) => {
    console.log(type,data)
  }

  changeUserProp = prop => {
    // let limit = limitMap[prop]
    // return ev => {
    //   let value = 'target' in ev ? ev.target.value : ev
    //   this.setState({
    //     user: immutateUpdate(this.state.user, prop, () => value.slice(0, limit))
    //   })
    // }
  }


  

  render () {

    let loading = false
    let {editModalVisible,editData,type} = this.state

    const columns = [
      {
        title: 'value值',
        dataIndex: 'dict_id',
        key: 'dict_id'
      },
      {
        title: 'key值',
        dataIndex: 'dict_value',
        key: 'dict_value'
      },
      {
        title: '创建时间',
        dataIndex: 'createTime',
        key: 'createTime',
        render(text){
          return moment(parseInt(text)).format('YYYY-MM-DD HH:mm') 
        }
      },
      {
        title: '修改时间',
        key: 'modifyTime',
        dataIndex: 'modifyTime',
        render(text){
          return moment(parseInt(text)).format('YYYY-MM-DD HH:mm') 
        }
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
                  title={'确定删除指标 "xxx" 么？'}
                  placement="topLeft"
                  onConfirm={this.del(data)}
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
    
    const data = [
      {
        dict_id:'1',
        dict_value: 'John Brown',
        createTime:'1472048779952',
        modifyTime:'1472048779952'
      },
      {
        dict_id:'2',
        dict_value: 'Jim Green',
        createTime:'1472048779952',
        modifyTime:'1472048779952'
      },
      {
        dict_id:'3',
        dict_value:'jim',
        createTime:'1472048779952',
        modifyTime:'1472048779952'
      }
    ]

    return (
      <Spin spinning={loading}>
        <div className="users-lists pd2y pd3x">
          <div className="pd2b">
            <div className="fix">
              <div className="fright">
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={this.create}
                  className="mg1r itblock"
                >
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
                changeUserProp={this.changeUserProp}
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
    );
  }
}
