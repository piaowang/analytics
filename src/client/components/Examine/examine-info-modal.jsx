import React, { Component } from 'react'
import { Modal, Row, Col, Table, Button, Steps, Card } from 'antd';
import _ from 'lodash'
import { NumberTranslate } from './constans'
import { EXAMINE_STATUS_TRANSLATE, EXAMINE_STATUS } from '~/src/common/constants'
import moment from 'moment'
import './index.styl'

const {Step} = Steps
export default class ExamineModal extends Component {

  state = {
    expandableKey: ['']
  }

  render() {
    const { hide, editInfo = {}, editVisible = false } = this.props
    const { expandableKey } = this.state
    const { examine_step = 0, examine_info = [], created_by_name, model_name, created_at, status } = editInfo
    let data = examine_info.map((p, i) => {
      let status = ''
      if (!p.examieStatus) {
        status = '待审核'
      } else {
        status = p.examieStatus === 2 ? '通过' : '驳回'
      }
      return {
        id: i + 1,
        name: `${p.name}`,
        handlerName: p.handlerName,
        handlerAt: p.handlerAt,
        status,
        message: `审核结论：${status}，审核意见：${p.examineMsg || ''}`
      }
    })
    data = [{
      id: 0,
      name: '申请人发起审核',
      handlerName: created_by_name || window.sugo.user.first_name,
      handlerAt: created_at,
      status: '提交申请',
      message: `提交【${model_name}】审核申请成功`
    }, ...data]
    const columns = [
      {
        key: 'name',
        dataIndex: 'name',
        title: '任务名称'
      },
      {
        key: 'handlerName',
        dataIndex: 'handlerName',
        title: '处理人'
      },
      {
        key: 'handlerAt',
        dataIndex: 'handlerAt',
        title: '处理时间',
        render: (v) =>{
          return [2, 3].includes(status) ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '--'
        }
      },
      {
        key: 'status',
        dataIndex: 'status',
        title: '处理结果'
      },
      {
        key: 'operation',
        dataIndex: 'operation',
        title: '操作',
        render: (val, obj) => {
          return (<div>
            <a onClick={() => this.setState({
              expandableKey: expandableKey.includes(obj.id)
                ? expandableKey.filter(p => p !== obj.id)
                : [...expandableKey, obj.id]
            })}
            >详情</a>
          </div>)
        }
      }
    ]
    return (
      <Modal
        visible={editVisible}
        title="审核信息"
        onCancel={hide}
        width="1047px"
        style={{ height: 600, minWidth: '1047px' }}
        footer={
          <Button onClick={hide}>关闭</Button>
        }
        wrapClassName="examine-info-modal"
      >
        <Row className="examine-info-flow ">
          <Col span={6} className="aligncenter">
            <div>
              <Steps 
                current={status === 2 ? examine_info.length + 1 : examine_step}
                direction="vertical"
                size='small'
              >
                <Step 
                  description={
                    <Card className="mg3r alignleft color-white relative" 
                      style={{
                        background: '#6969d7', 
                        height: '68px',
                        marginBottom: '20px',
                        borderRadius: '7px',
                        marginLeft: '9px'
                      }}
                      bodyStyle={{padding: '8px'}}
                    >
                      <p className="bold">发起申请</p>
                      <div>
                        <span className="iblock mg2r">发起人</span> 
                        <span className="iblock elli" style={{width: '65%'}}>
                          {created_by_name || window.sugo.user.first_name}
                        </span>
                      </div>
                      <div className="border-triangle"/>
                    </Card>
                  }
                />
                {
                  examine_info.map((p, i) => {
                    return (
                      <Step 
                        key={i}
                        description={
                          <Card className="mg3r alignleft relative" 
                            style={
                              {
                                background: examine_step >= i +1 ? '#6969d7' : '#e5e5ff', 
                                color: examine_step >= i +1 ? 'white' : 'black',
                                height: '68px',
                                marginBottom: '20px',
                                borderRadius: '7px',
                                marginLeft: '9px'
                              }
                            }
                            bodyStyle={{padding: '8px'}}
                          >
                            <p className="bold">{p.name}</p>
                            <div>
                              <span className="iblock mg2r">执行人</span> 
                              <span className="iblock elli" style={{width: '65%'}}>{p.handlerName}</span>
                            </div>
                            <div className="border-triangle"  style={{borderBottomColor: examine_step >= i +1 ? '#6969d7' : '#e5e5ff'}}/>
                          </Card>
                        }
                      />
                    )
                  })
                }
                <Step 
                  description={
                    <Card className="mg3r alignleft relative"
                      style={
                        {
                          background: status === 2 ? '#6969d7' : 
                            (status === 3 ? '#ffb3d1' : '#e5e5ff'), 
                          color: status === 2 ? 'white' : 'black',
                          height: '68px',
                          marginBottom: '20px',
                          borderRadius: '7px',
                          marginLeft: '9px'
                        }
                      }
                      bodyStyle={{padding: '8px'}}
                    >
                      <div className="bold vertical-center-of-relative">结束</div>
                      <div className="border-triangle" 
                        style={{borderBottomColor: status === 2 ? '#6969d7' : 
                          (status === 3 ? '#ffb3d1' : '#e5e5ff')}}
                      />
                    </Card>
                  }
                />
              </Steps>
            </div>
            {/*<div className="font20 mg2b">节点流程</div>
            <div>
              <div className="start-button">开始</div>
              <div><Icon type="arrow-down" className="flow-icon" /></div>
              <div>
                <div className="node-title">
                  发起申请
                </div>
                <div className="node-content">执行人:{created_by_name || window.sugo.user.first_name}</div>
              </div>
              <div><Icon type="arrow-down" className="flow-icon" /></div>
              {
                examine_info.map((p, i) => {
                  return (<div key={`step_${i}`}>
                    <div>
                      <div className="node-title">
                        {examine_step === (i + 1) ? <div className="node-status" /> : null}
                        节点{i + 1}
                      </div>
                      <div className="node-content">执行人: {p.handlerName}</div>
                    </div>
                    <div><Icon type="arrow-down" className="flow-icon" /></div>
                  </div>)
                })
              }
              <div className={`${status === 2 ? 'success' :  (status === 3 ? 'error' : '')} end-button`}>结束</div>
            </div>*/}


          </Col>
          <Col span={18}>
            <Table
              expandable={{
                expandIcon: () => null
              }}
              columns={columns}
              expandedRowRender={record => <p style={{ margin: 0 }}>{record.message}</p>}
              expandedRowKeys={expandableKey}
              expandIconAsCell={false}
              rowKey="id"
              pagination={false}
              dataSource={data}
              expandIconColumnIndex={-1}
            />
          </Col>
        </Row>
      </Modal>
    )
  }
}
