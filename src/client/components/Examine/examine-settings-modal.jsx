import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import Fetch from '../../common/fetch-final'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Modal, Row, Col, Tree, Tag } from 'antd';
import ExamineUserPick from './examine-user-pick'

const { TextArea } = Input

const namespace = 'examineSettingsModal'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}

let mapStateToProps = props => {
  return {
    ...props[namespace]
  }
}
const sagaModelGenerator = props => {
  return {
    namespace: `${namespace}`,
    state: {
      categoryList: [],
      selectedCategoryId: '',
      deleteCategoryModal: ''
    },
    reducers: {
    },
    sagas: {
      *examine({ payload }, { call, select, put }) {
        const {data, callback} = payload
        let url = '/app/examine/create'
        let res = yield call(Fetch.post, url, { ...data })
        if (res && res.success) {
          typeof callback === 'function' && callback(res.result)
        } else {
          console.error('操作失败')
        }
        typeof callback === 'function' && callback()
      }
    },
    subscriptions: {
    }
  }
}

@Form.create()
@withRuntimeSagaModel(sagaModelGenerator)
@connect(mapStateToProps)
export default class ExamineSettingsModal extends React.Component {
  
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
    title: PropTypes.string,
  }
  
  state = {
    showModal: false,
    confirmLoading: false
  }

  submit = () => {
    const {changeExamine, screenId: live_screen_id, form: {validateFields}, dispatch } = this.props 
    validateFields((err, value) => {
      if (err) { return }
      this.setState({confirmLoading: true})
      dispatch({
        type: `${namespace}/examine`,
        payload: {
          data: {
            ...value,
            live_screen_id
          },
          callback: (examine) => {
            this.setState({confirmLoading: false, showModal: false})
            examine && changeExamine(examine)
          }
        }
      })
    })
  }
  
  renderModal() {
    let { form: { getFieldDecorator }, getContainer } = this.props
    let { showModal, confirmLoading } = this.state
  
    return (
      <Modal
        visible={showModal}
        onCancel={this.toggleModalVisible}
        onOk={this.submit}
        title="提交审核"
        confirmLoading={confirmLoading}
        closable
        width={450}
        getContainer={ getContainer || (() => document.body)}
      >
        <Form>
          <Form.Item
            label="审核人"
            {...formItemLayout}
          >
            {getFieldDecorator('examine_user', {
              rules: [{
                required: true
              }]
            })(<ExamineUserPick getPopupContainer={getContainer}/>)}
          </Form.Item>
          <Form.Item
            label="提审信息"
            {...formItemLayout}
          >
            {getFieldDecorator('examine_describe', {
              initialValue: '',
              rules: [{
                required: false,
                max: 255
              }]
            })(<TextArea />)}
          </Form.Item>
        </Form>
      </Modal>
    )
  }
  
  toggleModalVisible = () => {
    this.setState(prevState => ({
      showModal: !prevState.showModal
    }))
  }
  
  render() {
    let {children} = this.props
    return (
      <React.Fragment>
        {this.renderModal()}
        <span onClick={this.toggleModalVisible}>
          {children}
        </span>
      </React.Fragment>
    )
  }
}
