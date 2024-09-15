import React, { Component } from 'react'
import { EditOutlined, PushpinOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Table, Input, Select, Tooltip, Button, Modal, Collapse,Tag } from 'antd';
import {Auth} from '../../common/permission-control'
const { Option } = Select
import './table-page-style.less'
import MyModel from './model'
import CheckModal from './check-modal'
import { timeMonths } from 'd3'

const needAudit = _.get(window,'sugo.auditUserRoleInstitution')

let checkSame = (pre,next)=>{
  checkSame = checkNotSame
  return _.isEqual(pre,next)
}

let checkNotSame = (pre,next)=>{
  return !_.isEqual(pre,next)
}


@Form.create()

export default class TablePage extends Component {
  constructor(){
    super()
    this.state = {
      insCode:'',
      insName:'',
      insAuditStatus:undefined,
      dataSource:[],
      newDatasource:[],
      visible:false,
      mode:'add',
      isCheckModal:false,
      targetId:undefined
    }

    this.codeGrop = [
      {label:'正常',value:1},
      {label:'新增待审核',value:0},
      {label:'新增审核未通过',value:2},
      // {label:'删除待审核',value:3},
      // {label:'删除审核不通过',value:5},
    ]

    this.handleChange = this.handleChange.bind(this)
    this.handleSelectChange = this.handleSelectChange.bind(this)
    this.cleanForm = this.cleanForm.bind(this)
    this.handleCancel = this.handleCancel.bind(this)
    this.onCheck = this.onCheck.bind(this)
    this.editChildren = this.editChildren.bind(this)
    this.createChildren = this.createChildren.bind(this)
  }

 

  componentWillReceiveProps(nextprops){
    
    let pre = this.props.institutions
    let next = nextprops.institutions

    if(_.isUndefined(pre)||_.isUndefined(next)) return

    let children = nextprops.institutionsChildren

    if(_.isEqual(children,this.state.dataSource)) return
    let {insCode='',insName='',insAuditStatus} = this.state
    let newDatasource = children.filter(i=>{
      if(_.isUndefined(insAuditStatus)||_.isNull(insAuditStatus)){
        return i.serialNumber.includes(insCode) && i.name.includes(insName)
      }else{
        return i.serialNumber.includes(insCode) && i.name.includes(insName) && insAuditStatus === i.check_status
      }
    })
    this.setState(()=>{
      return {
        ...this.setState,
        dataSource:children,
        newDatasource,
      }
    })

  }

  handleChange(){
    let value = this.props.form.getFieldsValue(['insCode','insName','insAuditStatus'])
    let {insCode='',insName='',insAuditStatus} = value
    this.setState(()=>{
      let {dataSource} = this.state
      let newDatasource = dataSource.filter(i=>{
        if(_.isUndefined(insAuditStatus)||_.isNull(insAuditStatus)){
          return i.serialNumber.includes(insCode) && i.name.includes(insName)
        }else{
          return i.serialNumber.includes(insCode) && i.name.includes(insName) && insAuditStatus === i.check_status
        }
      })
      return {
        ...this.state,
        insCode,
        insName,
        insAuditStatus,
        newDatasource
      }
    })

  }

  handleSelectChange(selectValue){
    let value = this.props.form.getFieldsValue(['insCode','insName'])
    let {insCode='',insName=''} = value
    this.setState(()=>{
      let {dataSource} = this.state
      let newDatasource = dataSource.filter(i=>{
        if(_.isUndefined(selectValue)||_.isNull(selectValue)){
          return i.serialNumber.includes(insCode) && i.name.includes(insName)
        }else{
          return i.serialNumber.includes(insCode) && i.name.includes(insName) && selectValue === i.check_status
        }
      })
      return {
        ...this.state,
        insCode,
        insName,
        insAuditStatus:selectValue,
        newDatasource
      }
    })
  }

  handleOk(){

  }

  handleCancel(){
    this.props.changeVisible(false)
  }

  cleanForm(){
    this.props.form.resetFields()
    let { dataSource } = this.state
    this.setState(()=>{
      return{
        ...this.state,
        newDatasource:dataSource,
        insCode:'',
        insName:'',
        insAuditStatus:undefined,
      }
    })
  }

  onCheck(vals) {
    const institution = {}
    institution.check_status = vals.check_status
    institution.suggestion = vals.suggestion
    institution.id =this.state.targetId
    this.props.audit(institution,(res)=>{
      if(res.success){
        this.setState({isCheckModal:false})
      }
    })
  }

  editChildren(id){
    this.setState({targetId:id})
    this.props.changeModelType('children')
    this.props.changeVisible(true)
  }
  
  createChildren(){
    let { add,changeVisible,institutions } = this.props
    add(institutions.id,institutions.level)
    changeVisible(true)
  }

  render() {
    let { institutions,institutionsChildren,changeVisible,changeModelType,visible,editor,audit,modelType } = this.props
    let { mode,isCheckModal,targetId } = this.state
    const {getFieldDecorator} = this.props.form
    let editParent = ()=>{
      changeVisible(true)
      changeModelType('details')
    }
    let columns = [
      {
        title: '机构名称',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title:'机构代码',
        dataIndex:'serialNumber',
        key:'serialNumber'
      },
      {
        title:'父级机构',
        dataIndex:'parent',
        key:'parent',
        render:parent =>{
          return institutions.name
        }
      },
      {
        title:'审核状态',
        dataIndex:'check_status',
        key:'check_status',
        render:text =>{
          switch (text) {
            case 0:
              return <Tag color="#f90">新增待审核</Tag>
            case 1:
              return <Tag color="#87d068">正常</Tag>
            case 2:
              return <Tag color="#108ee9">已拒绝</Tag>
            default:
              return <Tag color="#87d068">正常</Tag>
          }
        }
      },
      {
        title:'操作',
        key:'id',
        render:(text,record)=>{
          if (record.type === 'built-in') return null
        return (
          <div className="aligncenter">
            <Auth auth="app/institutions/edit" >
              <Tooltip title="编辑">
                  <EditOutlined
                    className="mg2l color-grey font16 pointer"
                    onClick={()=>{
                      this.editChildren(record.id)
                    }} />
              </Tooltip>
            </Auth>

            {
              record.check_status === 0 && needAudit?
              (
                <Auth auth="app/institutions/audit">
                  <Tooltip title="审核">
                    <PushpinOutlined
                      className="color-grey font16 pointer mg2l"
                      onClick={() => {this.setState({isCheckModal:true,targetId:record.id})}} />
                  </Tooltip>
                </Auth>
              ):null
            }
          </div>
        );
        }
      }
    ]

    if(!needAudit){
      columns = columns.filter(i=>i.title !=='审核状态')
    }
    return (
      <div className='table-page' >
        <div className='table-page-top' >
          <Form onChange={this.handleChange}>
            <Form.Item name='insCode' >
              {
                getFieldDecorator('insCode')(<Input placeholder='机构代码'></Input>)
              }
            </Form.Item>
            <Form.Item name='insName'>
              {
                getFieldDecorator('insName')(<Input placeholder='审核名称'></Input>)
              }
            </Form.Item>
            {
              needAudit?
              (
                <Form.Item name='insAuditStatus'>
                  {
                    getFieldDecorator('insAuditStatus')(
                      <Select onChange={this.handleSelectChange} placeholder='请选择审核状态' style={{width:'200px'}}>
                        {
                          this.codeGrop.map(i=>{
                            return (
                              <Option key={i.value} value={i.value} >{i.label}</Option>
                            )
                          })  
                        }
                      </Select>
                    )
                  }
                </Form.Item>
              ):null
            }
            <Button onClick={this.cleanForm}>
              清空
            </Button>
          </Form>
          <div className='table-page-top-right' >
            {
              _.get(institutions,'name')?
              (
              <div className='ins-name'>{_.get(institutions,'name')}</div>
              ):null
            }
            {
              _.get(institutions,'id')?
              (
                <Button style={{marginRight:'20px'}} onClick={()=>{editParent()}}>
                  修改信息
                </Button>
              ):null
            }
            {
              _.get(institutions,'id')?
              (
                <Button onClick={()=>{this.createChildren()}}>
                  新建下级机构
                </Button>
              ):null
            }
          </div>
        </div>
        <div className='table-page-middle' >
            <Table dataSource={this.state.newDatasource} columns={columns} ></Table>
        </div>
        <Modal
          title={modelType==='create'?'新建机构':'编辑信息'}
          visible={visible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          bodyStyle={{height:'600px',overflowY:'scroll'}}
          footer={[<Button onClick={this.handleCancel}>取消</Button>]}
        >
          <MyModel {...this.props.modelProps} targetId={this.state.targetId}></MyModel>
        </Modal>
        <CheckModal
          visible={isCheckModal} 
          onCancel={() => {this.setState({isCheckModal:false})}} 
          onOk={this.onCheck}
        ></CheckModal>
      </div>  
    ) 
  }
}
