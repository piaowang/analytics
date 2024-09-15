import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import { CopyOutlined, WarningOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import {
  Divider,
  Input,
  message,
  Modal,
  Radio,
  Switch,
  Card,
  Button,
  Popover,
  Checkbox
} from 'antd'
import copyTextToClipboard from '../../common/copy'
import { connect } from 'react-redux'
import moment from 'moment/moment'
import { sagaSyncModel } from '../Fetcher/saga-sync'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import Fetch from '../../common/fetch-final'
import { checkPermission } from '../../common/permission-control'
import QrCode from '../Common/qr-code'
import { SharingTypeEnum, SharingRestrictionsTypeEnum } from '../../../common/constants'
import EditorModal from '../LiveScreen/shareManager/edit-modal'

const namespace = 'publishSettingsModal'
const canDelShares = checkPermission('delete:/app/sharing/:id')

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}


const radioStyle = {
  display: 'block',
  height: '30px',
  lineHeight: '30px'
}

// const { Group: RadioGroup } = Radio
const { Item: FormItem } = Form
const { Group: RadioGroup } = Radio

const { Group: CheckboxGroup } = Checkbox

class MaxAge extends React.PureComponent {
  render() {
    let { value, onChange, ...rest } = this.props
    return (
      <Radio.Group
        value={value || 'unlimited'}
        onChange={ev => onChange(ev.target.value)}
        {...rest}
      >
        <Radio.Button value="unlimited">无限制</Radio.Button>
        <Radio.Button value="P1D">1 天</Radio.Button>
        <Radio.Button value="P7D">7 天</Radio.Button>
      </Radio.Group>
    )
  }
}

let mapStateToProps = (state, ownProps) => {
  const runtimeSagaModelNamespace = `${namespace}-${ownProps.shareContentId || 'new'}`
  const modelState = state[runtimeSagaModelNamespace] || {}
  return {
    ...modelState,
    datasourceCurrent: _.get(state, 'sagaCommon.datasourceCurrent', {}),
    runtimeSagaModelNamespace
  }
}
const sagaModelGenerator = props => {
  return sagaSyncModel(
    {
      namespace: `${namespace}-${props.shareContentId || 'new'}`,
      modelName: 'shares',
      getEffect: async () => {
        let res = await Fetch.get('/app/sharing', { content_id: props.shareContentId })
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/sharing', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/sharing/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/sharing/${model.id}`)
      }
    }
  )
}

@Form.create()
@connect(mapStateToProps)
@withRuntimeSagaModel(sagaModelGenerator)
export default class PublishSettingsModal extends React.Component {

  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
    shareType: PropTypes.number.isRequired,
    shareContentId: PropTypes.string.isRequired,
    extraInfo: PropTypes.object,
    contentDataSourceId: PropTypes.string,
    showQRCode: PropTypes.bool,
    title: PropTypes.string
  }

  static defaultProps = {
    showQRCode: false
  }

  state = {
    renderModal: false,
    showModal: false,
    showDeleteHint: false,
    accessRestrictions: false,
    restrictionsContent: {},
    maxAge: 'unlimited'
  }

  componentDidUpdate(prevProps) {
    const { shares, shareType } = this.props
    const [currShare] = shares || []
    if ((shareType === SharingTypeEnum.LiveScreenPub || shareType === SharingTypeEnum.LiveScreen 
      || shareType === SharingTypeEnum.Dashboard) 
      && currShare && currShare.id && currShare.id !== _.get(prevProps, 'shares.0.id', '')) {
      const restrictionsContent = _.get(currShare, 'params.restrictionsContent', {})
      this.setState({ accessRestrictions: !!restrictionsContent.type, restrictionsContent })
    }
  }

  genSharingUrl() {
    let { shares } = this.props
    const [currShare] = shares || []
    if (!currShare) {
      return ''
    }
    return `${location.origin}/share/${currShare.id}?theme=${this.props.theme}`
  }

  renderModal() {
    let {
      title, shareType, shareContentId, shares, isFetchingShares, dispatch, datasourceCurrent, runtimeSagaModelNamespace,
      extraInfo, showQRCode, getContainer
    } = this.props
    const { getFieldDecorator, getFieldsValue } = this.props.form
    const [currShare] = shares || []
    let { renderModal, showModal, showDeleteHint, accessRestrictions, restrictionsContent, maxAge } = this.state
    // 延迟渲染 modal，节约内存
    if (!renderModal) {
      return null
    }
    let sharingUrl = this.genSharingUrl()
    const doCopy = () => {
      if (!sharingUrl) {
        message.warn('请先启用分享')
        return
      }
      copyTextToClipboard(sharingUrl,
        () => message.success('复制分享链接成功'),
        () => message.warn('复制分享链接失败，请手动复制'))
    }

    let max_age = currShare && currShare.max_age || 'unlimited'
    let remainAgeInSec = max_age === 'unlimited'
      ? 'unlimited'
      : moment.duration(max_age).asSeconds() - moment().diff(currShare.created_at || Date.now(), 's')
    getFieldDecorator('content_type', { initialValue: shareType })
    getFieldDecorator('content_id', { initialValue: shareContentId })
    getFieldDecorator('content_datasource_id', { initialValue: datasourceCurrent && datasourceCurrent.id })
    getFieldDecorator('params', { initialValue: extraInfo })
    const powerOption = []
    // 大屏分享功能
    const isLiveScreenShare = window.location.pathname.startsWith('/console/livescreen')
    if (checkPermission('put:/app/dashboards/export-excel') && !isLiveScreenShare) {
      powerOption.push({
        label: '导出excel', value: 'export-excel'
      })
    }
    if (checkPermission('put:/app/dashboards/subscribe') && !isLiveScreenShare) {
      powerOption.push({
        label: '订阅看板', value: 'subscribe'
      })
    }
    if (checkPermission('put:/app/dashboards/global-filter') && !isLiveScreenShare) {
      powerOption.push({
        label: '全局筛选覆盖', value: 'global-filter'
      })
    }
    let container = document.querySelector('.dashboard-layout')
    if (checkPermission('put:/app/dashboards/code')) {
      powerOption.push({
        label: '二维码', value: 'code'
      })
    }
    
    if (checkPermission('put:/app/dashboards/download')) {
      powerOption.push({
        label: '单图下载', value: 'download'
      })
    }
    

    return (
      <Modal
        wrapClassName={`slice-modal-wrapper-theme-${this.props.theme}`}
        visible={showModal}
        onCancel={this.toggleModalVisible}
        title={title || '发布'}
        closable
        width={450}
        onOk={() => {
          dispatch({
            type: `${runtimeSagaModelNamespace}/sync`,
            payload: [{ ...(currShare || {}), ...getFieldsValue(), 
              params: { ...extraInfo, restrictionsContent: accessRestrictions ? restrictionsContent : {} }, max_age: maxAge }]
          })
          setTimeout(() => this.toggleModalVisible(), 500)
        }}
        getContainer={container}
      >
        <Form>
          <FormItem
            label="发布分享"
            {...formItemLayout}
          >
            <Popover
              title="确认取消分享？"
              trigger="click"
              content={(
                <React.Fragment>
                  <div className="mg2b"><WarningOutlined className="color-red" /> 下次再启用分享时，分享链接会发生变化</div>
                  <div className="alignright">
                    <Button
                      onClick={() => this.setState({ showDeleteHint: false })}
                    >取消</Button>
                    <Button
                      type="primary"
                      className="mg2l"
                      onClick={() => {
                        dispatch({
                          type: `${runtimeSagaModelNamespace}/sync`,
                          payload: []
                        })
                        this.setState({ showDeleteHint: false })
                      }}
                    >确认</Button>
                  </div>
                </React.Fragment>
              )}
              visible={showDeleteHint}
            >
              <Switch
                loading={isFetchingShares}
                checked={!!currShare}
                onChange={checked => {
                  if (!checked && !canDelShares) {
                    message.warn('你没有删除分享权限')
                    return
                  }
                  if (!checked && !showDeleteHint) {
                    this.setState({
                      showDeleteHint: !checked
                    })
                    return
                  }
                  dispatch({
                    type: `${runtimeSagaModelNamespace}/sync`,
                    payload: [{ ...(currShare || {}), ...getFieldsValue() }]
                  })
                }}
              />
            </Popover>
          </FormItem>

          <Divider />

          <Form.Item
            label="分享链接"
            {...formItemLayout}
          >
            <Input
              readOnly
              addonAfter={(
                <CopyOutlined className="fpointer" onClick={doCopy} />
              )}
              value={sharingUrl || undefined}
              placeholder="未启用分享"
              onClick={doCopy}
            />
          </Form.Item>

          {
            shareType === SharingTypeEnum.LiveScreen || shareType ===  SharingTypeEnum.LiveScreenPub
            || shareType === SharingTypeEnum.Dashboard
              ?
              <Radio.Group
                value={accessRestrictions}
                onChange={ev => {this.setState({ accessRestrictions: ev.target.value })}}
              >
                <Radio.Button value>访问限制</Radio.Button>
                <Radio.Button value={false}>无限制</Radio.Button>
              </Radio.Group>
              : null
          }
          <div className="mg2t mg2b">
            {
              accessRestrictions
                ? <Card>
                  <div>验证方式</div>
                  <div>
                    <Radio.Group defaultValue={restrictionsContent.type === SharingRestrictionsTypeEnum.password ? 1 : 2}>
                      <Radio
                        style={radioStyle}
                        value={1}
                        onClick={() => this.setState({ restrictionsContent: { type: SharingRestrictionsTypeEnum.password } })}
                      >
                        <span>密码验证
                          <Input.Password
                            defaultValue={restrictionsContent.value}
                            className="mg1l"
                            disabled={restrictionsContent.type !== SharingRestrictionsTypeEnum.password}
                            onChange={(e) => this.setState({ restrictionsContent: { type: SharingRestrictionsTypeEnum.password, value: e.target.value } })}
                           />
                        </span>
                      </Radio>
                      {
                        shareType === SharingTypeEnum.LiveScreenPub
                          ? <Radio style={radioStyle} onClick={(e) => this.setState({ restrictionsContent: { type: SharingRestrictionsTypeEnum.institutions } })} value={2}>
                            <span>启用机构权限</span>
                          </Radio>
                          : null
                      }
                    </Radio.Group>
                  </div>
                </Card>
                : null
            }
          </div>
          <Form.Item
            label="有效期"
            {...formItemLayout}
          >
            {getFieldDecorator('max_age', { initialValue: currShare && currShare.max_age || 'unlimited' })(
              <MaxAge
                disabled={!sharingUrl}
                onChange={value => {
                  // dispatch({
                  //   type: `${runtimeSagaModelNamespace}/sync`,
                  //   payload: [{ ...(currShare || {}), ...getFieldsValue(), max_age: value }]
                  // })
                  this.setState({ maxAge: value })
                }}
              />
            )}
            {_.isNumber(remainAgeInSec) && remainAgeInSec <= 0
              ? (
                <div className="color-red font18">此分享已失效</div>
              )
              : null}
          </Form.Item>
          {
            isLiveScreenShare ? null : (
              <Form.Item
                label="权限控制"
                {...formItemLayout}
              >
                {getFieldDecorator('power', { initialValue: _.get(currShare, 'params.power', [])})(
                  <CheckboxGroup
                    disabled={!sharingUrl}
                    options={powerOption}
                    onChange={value => {
                      dispatch({
                        type: `${runtimeSagaModelNamespace}/sync`,
                        payload: [{...(currShare || {}), ...getFieldsValue(), power: value}]
                      })
                    }}
                  />
                )}
              </Form.Item>
            )
          }
          {!(showQRCode && sharingUrl) ? null : (
            <Form.Item
              label="扫码分享"
              {...formItemLayout}
            >
              <QrCode style={{ width: '225px', height: '225px' }} url={sharingUrl} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    );
  }

  renderLivescreenModal = () => {
    const {showModal } = this.state
    return (
      <EditorModal visible={showModal} onRefresh={() => {}}  />
    )
  }
  

  toggleModalVisible = () => {
    this.setState(prevState => ({
      showModal: !prevState.showModal,
      renderModal: true
    }))
  }

  render() {
    let { children } = this.props
    const isLiveScreenShare = window.location.pathname.startsWith('/console/livescreen')

    return (
      <React.Fragment>
        {/* {isLiveScreenShare? this.renderLivescreenModal(): this.renderModal()} */}
        {this.renderModal()}
        {_.isFunction(children)
          ? children({ toggleModalVisible: this.toggleModalVisible })
          : (
            <span style={{display:'flex',alignItems:'center'}} onClick={this.toggleModalVisible}>
              {children}
            </span>
          )}
      </React.Fragment>
    )
  }
}
