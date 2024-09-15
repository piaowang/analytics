import React, { Component } from 'react'
import Bread from '~/components/common/bread'
import HorizontalSplitHelper from '~/components/common/horizontal-split-helper'
import { withSizeProvider } from '~/components/common/size-provider'
import { withCommonFilter } from '~/components/common/common-filter'
import smartSearch from 'common/smart-search'
import { validateFieldsAndScroll } from 'client/common/decorators'
import { PlusOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Menu, Button, Card, Modal, Input, Divider, Tooltip, Popconfirm, Spin } from 'antd';
import { connect } from 'react-redux'
import Icon from '~/components/common/sugo-icon'
import { Empty } from '~/components/common/empty'
import './css.styl'
import _ from 'lodash'
import moment from 'moment'
import SceneList from './scene-list'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}

const data = []
for (let i = 0; i < 5; i++) {
  data.push({
    key: i.toString(),
    title: `新客复购 ${i}`,
    status: 32,
    remark: `London Park no. ${i}`
  })
}

/**
 * @description
 * 自动化营销模型管理
 * @export
 * @class ModelEntry
 * @extends {Component}
 */
@connect(state => ({
  ...state['marketBrainModels'],
  loading: state.loading.models['marketBrainModels']
}))
@Form.create()
@validateFieldsAndScroll
export default class ModelsEntry extends Component {

  constructor(props){
    super(props)
  }

  componentDidMount() {
    this.userRole = 'admin'
    if (window.sugo.jwtData) {
      const { jwt_company_id, jwt_store_id } = _.get(window,'sugo.jwtData.others', {})
      if (jwt_company_id || jwt_store_id) {
        this.userRole = 'jwtUser'
      }
      if (!jwt_company_id && !jwt_store_id) {
        this.userRole = 'jwtAdmin'
      }
    }
  }

  renderMainContent = withSizeProvider(({ spWidth }) => {
    return (
      <HorizontalSplitHelper style={{height: 'calc(100% - 44px)'}}>
        <div
          defaultWeight={400}
          className="height-100"
          style={{padding: '10px 5px 10px 10px', overflowX: 'scroll'}}
        >
          <div className="bg-white height-100 corner" style={{minWidth: '380px'}}>
            {this.renderLeftList()}
          </div>
        </div>
        <div
          defaultWeight={spWidth - 255}
          className="height-100"
          style={{padding: '10px 10px 10px 5px'}}
        >
          <div className="height-100 corner bg-white">
            {this.renderRightContent()}
          </div>
        </div>
      </HorizontalSplitHelper>
    )
  })

  renderLeftList = withCommonFilter(commonFilter => {
    const { keywordInput: SearchBox, searching }  = commonFilter
    const { models, currentModel, loading } = this.props
    const selectedKey = _.isEmpty(currentModel) ? [] : [currentModel.id]
    const modelMenus = _.isEmpty(models) ? (
      <Empty />
    ) : (
      <Menu mode="inline" selectedKeys={selectedKey} onClick={this.modelClickHanlder}>
        {
          models.filter(item => searching ? smartSearch(searching, item.name) : true).map(item => {
            return (
              <Menu.Item model={item} key={item.id}>
                <div className="m-title">{item.name}</div>
                <div className="m-sub-content">
                  共有{item.scene_total}个启用场景
                  <span className="mg3l opt-btns hide">
                    <Tooltip title="置顶">
                      <Icon type="sugo-stick" onClick={() => this.sortHandler(item, 'moveTop')} className="mg1r pointer font16"/>
                    </Tooltip>
                    <Tooltip title="上移">
                      <Icon type="sugo-upward" onClick={() => this.sortHandler(item, 'moveUp')} className="mg1r pointer font16"/>
                    </Tooltip>
                    <Tooltip title="下移">
                      <Icon type="sugo-downward" onClick={() => this.sortHandler(item, 'moveDown')} className="mg1r pointer font16"/>
                    </Tooltip>
                    {Number(item.scene_total) === 0 && Number(item.event_total) === 0 ? (
                      //popover 
                      <Icon onClick={(e) => this.deleteHandler(item.id, e)} type="sugo-delete" className="font16"/>
                    // <Popconfirm title="确定要删除该营销模型吗" onConfirm={(e) => this.deleteHandler(item.id, e)}>
                      //   <Icon type="sugo-delete" className="font16"/>
                      // </Popconfirm>
                    ) : null}
                  </span>
                </div>
              </Menu.Item>
            )
          })
        }
      </Menu>
    )
    return (
      <React.Fragment>
        {/* <div style={{padding: '0 12px', height: '56px'}}> */}
          <div className="model-search-div">
            <span className="fleft">
              <SearchBox placeholder="搜索模型名称" />
            </span>
            {
              this.userRole === 'jwtUser'
              ? null
              :  <Button icon={<PlusOutlined />} type="primary" onClick={this.createHandler}>新增营销模型</Button>
            }
          </div>
        {/* </div> */}
        <Spin spinning={loading}>
          {modelMenus}
        </Spin>
      </React.Fragment>
    );
  })

  renderRightContent = () => {
    const { currentModel } = this.props
    return (
      <Card
        title={<span>模型概览</span>}
        className="height-100 usergroup-list-card"
        bordered={false}
      >
        {
          _.isEmpty(currentModel) ? <Empty /> : (
            <div>
              <h1>
                {currentModel.name}
                {
                  this.userRole === 'jwtUser' 
                    ? null
                    :  <Tooltip title="修改营销模型">
                      <a className="mg2l" onClick={() => this.editHandler(currentModel)}>
                        <Icon type="form" className="font14" />
                      </a>
                    </Tooltip>
                }
              </h1>
              <div className="model-create-timer">创建时间：{moment(currentModel.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
              <p className="wordwrap-break-word wordbreak">{currentModel.remark}</p>
            </div>
          )
        }
        <Divider />

        <SceneList currentModel={currentModel} model_id={currentModel.id}/>
      </Card>
    )
  }

  modelClickHanlder = ({ item }) => {
    const { model } = item.props
    this.changeState({
      currentModel: model
    })
  }

  createHandler = () => {
    this.changeState({
      editModel: {},
      modelModalVisible: true
    })
  }

  editHandler = (item) => {
    this.changeState({
      editModel: _.clone(item),
      modelModalVisible: true
    })
  }

  deleteHandler = (id, e) => {
    // e.preventDefault()
    e.stopPropagation()
    this.props.dispatch({
      type: 'marketBrainModels/remove',
      payload: id
    })
  }

  changeState = (payload) => {
    this.props.dispatch({
      type: 'marketBrainModels/change',
      payload
    })
  }

  okHandler = async () => {
    const { editModel } = this.props
    const values = await this.validateFieldsAndScroll()
    if (!values) return
    await this.props.dispatch({
      type: 'marketBrainModels/save',
      payload: {
        id: editModel && editModel.id,
        values
      }
    })
    this.props.form.resetFields()
  }

  cancelHandler = () => {
    this.changeState({
      modelModalVisible: false
    })
  }

  /**
   * @description 排序操作
   * @memberOf ModelsEntry
   */
  sortHandler = (item, type) => {
    this.props.dispatch({
      type: 'marketBrainModels/updateOrders',
      payload: {
        type,
        item
      }
    })
  }

  render() {
    const { modelModalVisible, form: { getFieldDecorator }, editModel } = this.props
    return (
      <div className="height-100 marketing-container">
        <Bread path={[
          { name: '营销策略中心' },
          { name: '营销模型' }
        ]}
        />
        <Modal
          title="营销模型"
          visible={modelModalVisible}
          onOk={() => this.okHandler()}
          onCancel={this.cancelHandler}
          okText="保存"
        >
          <Form>
            <Form.Item
              {...formItemLayout}
              label="模型名称"
              hasFeedback
            >
              {getFieldDecorator('name', {
                rules: [{
                  required: true,
                  message: '请输入模型名称'
                }, {
                  min: 1,
                  max: 50,
                  type: 'string',
                  message: '1~50个字符'
                }],
                initialValue: _.get(editModel, 'name', '')
              })(
                <Input placeholder="请输入模型名称" type="text"/>
              )}
            </Form.Item>
            <Form.Item
              {...formItemLayout}
              label="模型说明"
              hasFeedback
            >
              {getFieldDecorator('remark', {
                initialValue: _.get(editModel, 'remark', '')
              })(
                <Input.TextArea placeholder="模型说明" type="text" autosize={{ minRows: 4, maxRows: 6 }}/>
              )}
            </Form.Item>
          </Form>
        </Modal>
        {this.renderMainContent()}
      </div>
    )
  }
}
