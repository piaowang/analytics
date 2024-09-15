import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import Fetch from '../../common/fetch-final'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Modal, Button, message, Tree, Tag } from 'antd';
import { EXAMINE_STATUS } from '../../../common/constants'

const { TextArea } = Input

const namespace = 'examineCheckModel'

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
      examineInfo: {}
    },
    reducers: {
      changeState(state, { payload }) {
        return {
          ...state,
          ...payload
        }
      }
    },
    sagas: {
      *getExamineInfo({ payload }, { call, put }) {
        let url = '/app/examine/get'
        const { live_screen_id } = payload
        let res = yield call(Fetch.get, url, { live_screen_id })
        if (res && res.success) {
          yield put({ type: 'changeState', payload: { examineInfo: res.result } })
        }
      },
      *examineCheck({ payload }, { call }) {
        const { live_screen_id, status = 0, fail_describe = '', cb } = payload
        let url = '/app/examine/update'
        let res = yield call(Fetch.post, url, { live_screen_id, status, fail_describe })
        if (res && res.success) {
          message.success('审核完成')
          if (cb) {
            yield cb(status)
          }
        } else {
          message.success('审核失败')
        }
      }
    },
    subscriptions: {
      init({ dispatch }) {
        dispatch({ type: 'getExamineInfo', payload: { live_screen_id: props.screenId } })
      }
    }
  }
}

@Form.create()
@withRuntimeSagaModel(sagaModelGenerator)
@connect(mapStateToProps)
export default class ExamineSettingsModal extends React.PureComponent {

  submitCheck = (check) => {
    const { screenId: live_screen_id, form: { validateFields }, dispatch, changeStatus } = this.props
    validateFields((err, value) => {
      if (err) { return }
      dispatch({
        type: `${namespace}/examineCheck`,
        payload: {
          ...value,
          status: check,
          live_screen_id,
          cb: changeStatus
        }
      })
    })
  }

  renderModal() {
    let { form: { getFieldDecorator }, visible, hideModal, examineInfo, getContainer } = this.props

    return (
      <Modal
        visible={visible}
        onCancel={hideModal}
        onOk={hideModal}
        title="审核"
        maskClosable={false}
        getContainer={ getContainer || (() => document.body)}
        footer={<div className="textalignright">
          <Button className="mg2r" onClick={() => this.submitCheck(EXAMINE_STATUS.pass)}>通过</Button>
          <Button className="mg2r" onClick={() => this.submitCheck(EXAMINE_STATUS.failed)}>不通过</Button>
        </div>}
        width={450}
      >
        <Form>
          <Form.Item label="提审信息" {...formItemLayout}>
            {examineInfo.examine_describe}
          </Form.Item>
          <Form.Item label="审批信息" {...formItemLayout}>
            {getFieldDecorator('fail_describe', {
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
  render() {
    return this.renderModal()
  }
}
