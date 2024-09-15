import React from 'react'
import Bread from '../Common/bread'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Select, Modal, message } from 'antd';
import _ from 'lodash'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import { OfflineCalcTargetType, OfflineCalcVersionStatus } from '../../../common/constants'
import {dictBy} from '../../../common/sugo-utils'
import {browserHistory} from 'react-router'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import IndicesEdit from './indices-edit'
import {SELECT_PERIOD} from '../../common/cron-picker-kit'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

const {Option} = Select

const initialCronVal = {
  unitType: '0',  // 0=每；1=每隔；2=自定义
  period: SELECT_PERIOD.Hour,
  option: {
    minute: '0',
    hour: '0',
    day: '1',
    month: '1'
  }
}

@connect(state => {
  const indicesList = state['pick-offline-calc-indices-in-formula-editor'] || {}
  return { 
    ...state['sagaCommon'], 
    ...state['offlineCalcReleaseVersion'],
    indicesIdDict: dictBy(indicesList.offlineCalcIndices, o => o.id),
    users: _.get(state, 'common.users', []) 
  }
})
@Form.create()
export default class ReleaseVersion extends React.Component {

  state = {
    backCount: 0,
    usableDims: []
  }
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }

  dispatch(func, payload) {
    this.props.dispatch({
      type: `offlineCalcReleaseVersion/${func}`,
      payload
    })
  }

  changeProps(payload) {
    this.props.dispatch({
      type: 'offlineCalcReleaseVersion/change',
      payload
    })
  }

  renderIndicesRelease(offlineCalcIndices, version, reuseSagaModel = false) {
    let currDim = _.get(offlineCalcIndices, [0])
    return (
      <Form
        className="width600 mg3t"
      >
        <div>
          {version}:
        </div>
        <IndicesEdit 
          reuseSagaModel={reuseSagaModel}
          onlyRenderItem
          curr={currDim}
          params={{ id: reuseSagaModel ? 'null' : _.get(currDim,'id')}}
        />
      </Form>
    )
  }

  renderUsableIndicesPicker = () => {
    let {offlineCalcIndices, offlineCalcDataSources} = this.props
    let idxIdDict = dictBy(offlineCalcIndices, o => o.id)
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let {indicesFilterByDsId} = this.state
    let dsIdDict = dictBy(offlineCalcDataSources, d => d.id, d => d.name)
    let targetKeys = getFieldValue('params.usingIndices') || []
    let targetKeySet = new Set(targetKeys)
    
    let usableIndices = (offlineCalcIndices || []).filter(idx => {
      let pickThis = true
      if (indicesFilterByDsId === 'null' || !indicesFilterByDsId) {
        pickThis = pickThis && !idx.data_source_id
      } else if (indicesFilterByDsId !== 'all') {
        pickThis = pickThis && idx.data_source_id === indicesFilterByDsId
      }
      return pickThis
    }).map(idx => {
      const dsName = idx.data_source_id ? `(${dsIdDict[idx.data_source_id]}) ` : ''
      return {
        key: idx.id,
        title: idx.title || idx.name,
        titleWhenSelected: `${dsName}${idx.title || idx.name}`
      }
    })
  
    // 重新构建已经选择了的维度数据，避免切换数据源后，看不见已选择的维度
    let selectedDimRebuild = targetKeys.map(k => {
      let idx = idxIdDict[k]
      if (!idx) {
        return null
      }
      const dsName = idx.data_source_id ? `(${dsIdDict[idx.data_source_id]}) ` : ''
      return {
        key: k,
        title: idx.title || idx.name,
        titleWhenSelected: `${dsName}${idx.title || idx.name}`
      }
    }).filter(_.identity)

    return (
      <Select
        disabled
        value={Array.from(targetKeySet)}
        mode="multiple"
      >
        {
          _.uniqBy([...selectedDimRebuild, ...usableIndices], 'key').map( i => (
            <Option value={i.key}>{i.title}</Option>
          ))
        }
      </Select>
    )
  }

  renderReview(offlineCalcCurrentItem, reuseSagaModel = true) {
    const { releaseTargetType } = this.props
    let renderList = {
      [OfflineCalcTargetType.Indices]: this.renderIndicesRelease(offlineCalcCurrentItem,'当前版本', reuseSagaModel),
      [OfflineCalcTargetType.IndicesModel]: null
    }
    return (
      renderList[releaseTargetType]
    )
  }

  renderHistory(targetType) {
    const { historyVersion, releaseTargetType } = this.props
    let type = targetType
    if (!type || targetType === OfflineCalcTargetType.Reviewer || targetType === OfflineCalcTargetType.DelReviewer) {
      type = releaseTargetType
    }

    let renderList = {
      [OfflineCalcTargetType.Indices]: this.renderIndicesRelease(historyVersion,'历史版本'),
      [OfflineCalcTargetType.IndicesModel]: null
    }
    return (
      renderList[type]
    )
  }

  renderButton(targetType) {
    const { id } = this.props.params
    
    //确认提交审核 在modal的onOk处理

    let commonButton = (
      <React.Fragment>
        <Button 
          type="primary"
          onClick={() => this.changeProps({ modalVisible: true, modalTitle: '提交审核' })}
        >
          确定提交
        </Button>
      </React.Fragment>
    )
    let buttonList = {
      [OfflineCalcTargetType.Indices]: commonButton,
      [OfflineCalcTargetType.IndicesModel]: commonButton,
      [OfflineCalcTargetType.Reviewer]: (
        <React.Fragment>
          <Button 
            type="primary"
            className="mg2r"
            onClick={() => this.changeProps({modalVisible: true, modalTitle: '拒绝审核', reviewResult: OfflineCalcVersionStatus.noPass})}
          >
            拒绝审核
          </Button>
          <Button 
            type="primary"
            onClick={() => this.changeProps({modalVisible: true, modalTitle: '通过审核', reviewResult: OfflineCalcVersionStatus.pass})}
          >
            通过审核
          </Button>
        </React.Fragment>
      ),
      [OfflineCalcTargetType.DelReviewer]: (
        <React.Fragment>
          <Button 
            type="primary"
            className="mg2r"
            onClick={() => this.dispatch('delReview', { id, reviewResult: OfflineCalcVersionStatus.noPass, handleSuccess: this.handleSuccess })}
          >
          取消删除
          </Button>
          <Button 
            type="primary"
            onClick={() => this.dispatch('delReview', { id, reviewResult: OfflineCalcVersionStatus.deleted, handleSuccess:this.handleSuccess })}
          >
          确认删除
          </Button>
        </React.Fragment>
      )
    }
    return (
      <React.Fragment>
        {
          buttonList[targetType]
        }
        <Button type="primary mg2l" onClick={() => browserHistory.goBack()}>取消</Button>
      </React.Fragment>
    )
  }

  submit = async (id, targetType) => {
    let { version, comment } = this.props

    if (targetType === OfflineCalcTargetType.Reviewer || targetType === OfflineCalcTargetType.DelReviewer) return await this.submitReview(id)
    if (!version) return message.error('版本号不能为空')
    if (_.isNaN(Number(version))) return message.error('版本号必须为数字')
    if ((version + '').split('.')[1] && (version + '').split('.')[1].length > 2) return message.error('版本号位数最多2位')
    this.dispatch('submit', { version: version + '', comment, id, targetType, handleSuccess: this.handleSuccess, handleFail: this.handleFail })
  }
  
  submitReview = async (id) => {
    let { comment, reviewResult } = this.props
    this.dispatch('submitReview', { id, comment, reviewResult, handleFail: this.handleFail, handleSuccess: this.handleSuccess })
  }

  handleSuccess(targetType) {
    message.success('提交成功')
    let locate = {
      [OfflineCalcTargetType.Indices]: '/console/offline-calc/indices',
      [OfflineCalcTargetType.IndicesModel]: '/console/offline-calc/models',
      [OfflineCalcTargetType.Reviewer]: '/console/offline-calc/review-manager',
      [OfflineCalcTargetType.DelReviewer]: '/console/offline-calc/review-manager'
    }
    browserHistory.push(locate[targetType])
  }

  handleFail(msg = '失败') {
    message.error(msg)
  }

  renderFlexBox(targetType) {
    const { offlineCalcCurrentItem } = this.props
    let renderList = {
      [OfflineCalcTargetType.Indices]: this.renderIndicesRelease(offlineCalcCurrentItem, '当前版本', true),
      [OfflineCalcTargetType.IndicesModel]: null,
      [OfflineCalcTargetType.Reviewer]: this.renderReview(offlineCalcCurrentItem,'当前版本', true),
      [OfflineCalcTargetType.DelReviewer]: this.renderReview(offlineCalcCurrentItem,'当前版本', true)
    }

    let dom1 = this.renderHistory(targetType)

    let className
    if (_.isEmpty(dom1)) className='width-100'
    return (
      <React.Fragment>
        <div>
          {
            dom1
          }
        </div>
        <div className={className}>
          {
            renderList[targetType]
          }
          <div className="fright mg2t">
            {
              this.renderButton(targetType)
            }
          </div>
        </div>
      </React.Fragment>
    )
  }

  renderModal() {
    const { modalTitle, modalVisible, location, params } = this.props
    const { id: id0 } = params
    const { getFieldDecorator } = this.props.form
    const { targetType, versionId } = _.get(location, 'query', {})
    let id = versionId || id0

    return (
      <Modal
        title={modalTitle}
        onOk={() => this.submit(id, targetType)}
        visible={modalVisible}
        onCancel={() => this.changeProps({ modalVisible: false })}
      >
        <Form>
          {
            targetType !== OfflineCalcTargetType.Reviewer ?
              <Form.Item label="版本号" {...formItemLayout}>
                {getFieldDecorator('version', {
                  rules: [
                    { required: true, message: '必填项' }
                  ]
                })(<Input 
                  onChange={(e) => this.changeProps({ version: e.target.value })}
                />)}
              </Form.Item>
              : null
          }
          <Form.Item label="备注" {...formItemLayout}>
            {getFieldDecorator('comment', {
            })(<Input.TextArea
              rows={5} 
              onChange={(e) => this.changeProps({comment: e.target.value})}
               />)}
          </Form.Item>
        </Form>
      </Modal>
    )
  }

  render() {
    let { params, form, offlineCalcCurrentItem, modalVisible, modalTitle, errorMessage, location, onlyRenderModal } = this.props
    const { backCount } = this.state
    let { getFieldDecorator } = form

    if (_.isEmpty(offlineCalcCurrentItem) && errorMessage) {
      if (backCount < 1) {
        message.error(errorMessage)
        browserHistory.goBack()
        this.setState({ backCount: backCount + 1 })
        return <div />
      }
    }
    
    const { id } = params
    const { targetType } = _.get(location, 'query', {}) 

    let breadArr = {
      [OfflineCalcTargetType.Indices]: { name: '指标库', link: '/console/offline-calc/indices' },
      [OfflineCalcTargetType.IndicesModel]: { name: '指标模型管理', link: '/console/offline-calc/models' },
      [OfflineCalcTargetType.Reviewer]: { name: '审核管理', link: '/console/offline-calc/review-manager'},
      [OfflineCalcTargetType.DelReviewer]: { name: '审核管理', link: '/console/offline-calc/review-manager'}
    }

    if (onlyRenderModal) return this.renderModal()
    return (
      <div className="height-100">
        {this.renderModal()}
        <Bread
          path={[
            breadArr[targetType],
            { name: '发布审核' }
          ]}
        />
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic pd2"
        >
          <div className="bg-white width-100 height-100" style={{padding: '10px 10px 10px 5px'}}>
            <div 
              className="height-100 overscroll-y"
              style={{
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              {this.renderFlexBox(targetType)}
            </div>
          </div>
        </HorizontalSplitHelper>
      </div>
    )
  }
}
