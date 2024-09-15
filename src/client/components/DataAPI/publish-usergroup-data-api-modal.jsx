/**
 * 用户群发布数据 API 对话框
 * 表单内容：
 * 名称，描述，调用路径（展示查询元数据路径），分页参数，客户端限制，请求格式例子，返回格式例子
 */
import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, message, Modal, Select, Tabs } from 'antd';
import {connect} from 'react-redux'
import {sagaSyncModel} from '../Fetcher/saga-sync'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import Fetch from '../../common/fetch-final'
import {immutateUpdate, immutateUpdates, toQueryParams} from '../../../common/sugo-utils'
import {isNumberDimension, isStringDimension, isTimeDimension} from '../../../common/druid-column-type'
import {checkPermission} from '../../common/permission-control'
import {DataApiTypeEnum} from '../../../common/constants'
import {ContextNameEnum, getContextByName} from '../../common/context-helper'

const dataApiClientNamespace = 'publishUserGroupDataApiModal-dataApiClients'
const dataApiNamespace = 'publishUserGroupDataApiModal-dataApi'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}

const {Option: SelectOption} = Select
const {Item: FormItem} = Form
const {TabPane} = Tabs

const canManageDataAPI = checkPermission('get:/console/data-api')
const canCreateDataAPI = checkPermission('post:/app/data-apis')

let mapStateToProps = (state, ownProps) => {
  const dataApiClientModelState = state[dataApiClientNamespace] || {}
  const dataApiModelState = state[dataApiNamespace] || {}
  return {
    ...dataApiClientModelState,
    ...dataApiModelState,
    datasourceCurrent: _.get(state, 'sagaCommon.datasourceCurrent', {}),
    runtimeDataApiClientNamespace: dataApiClientNamespace,
    runtimeDataApiNamespace: dataApiNamespace
  }
}

const sagaSyncDataApiClientModelGen = props => {
  return sagaSyncModel(
    {
      namespace: dataApiClientNamespace,
      reusable: true,
      modelName: 'clients',
      getEffect: async () => {
        let res = await Fetch.get('/app/data-api-clients')
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/data-api-clients', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/data-api-clients/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/data-api-clients/${model.id}`)
      }
    }
  )
}
const sagaSyncDataApiModelGen = props => {
  return sagaSyncModel(
    {
      namespace: dataApiNamespace,
      reusable: true,
      modelName: 'apis',
      getEffect: async () => {
        let res = await Fetch.get('/app/data-apis', {type: DataApiTypeEnum.UserGroup})
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/data-apis', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/data-apis/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/data-apis/${model.id}`)
      }
    }
  )
}


@connect(mapStateToProps)
@withRuntimeSagaModel([sagaSyncDataApiClientModelGen, sagaSyncDataApiModelGen])
export default class PublishUserGroupDataApiSettingsModal extends React.Component {
  
  static contextType = getContextByName(ContextNameEnum.ProjectInfo)
  
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired
  }
  
  state = {
    renderModal: false,
    showModal: false
  }
  
  save = async () => {
    let {userGroupId, userGroupOpenWith, dispatch, apis, runtimeDataApiNamespace} = this.props
    let {projectCurrent} = this.context
    // 为新建项设置默认值
    let nextApis = _.map(apis, api => {
      if (api.id) {
        return api
      }
      return immutateUpdates(api,
        'type', () => DataApiTypeEnum.UserGroup,
        'params.druid_datasource_id', () => projectCurrent.datasource_id,
        'params.userGroupId', () => userGroupId,
        'params.userGroupOpenWith', () => userGroupOpenWith)
    })
    if (_.some(nextApis, api => !api.name || !api.call_path)) {
      message.warn('名称和路径不能为空')
      return
    }
    if (_.some(nextApis, api => !/^[\w-/]+$/.test(api.call_path) || /\/\//.test(`/data-api/${api.call_path}`))) {
      message.warn('路径存在非法字符')
      return
    }
    await dispatch({
      type: `${runtimeDataApiNamespace}/sync`,
      payload: nextApis,
      callback: syncRes => {
        let {resCreate, resUpdate} = syncRes || {}
        if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
          message.warn('没有修改数据，无须保存')
          return
        }
        if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
          // 保存报错
          return
        }
        const isCreated = _.isEmpty(resUpdate)
        message.success((
          <span>{isCreated ? '创建' : '修改'}数据 API 成功{canManageDataAPI ? <a href="/console/data-api?tab=2">，管理数据 API</a> : null}</span>
        ))
        this.toggleModalVisible()
      }
    })
  }
  
  renderModal() {
    let { clients, dispatch, runtimeDataApiNamespace, dimNameDict, apis, userGroupId } = this.props
    let {renderModal, showModal} = this.state
    // 延迟渲染 modal，节约内存
    if (!renderModal) {
      return null
    }
    let {projectCurrent} = this.context
  
    let targetApiIdx = _.findIndex(apis, api => {
      return _.get(api, 'params.userGroupId') === userGroupId && _.get(api, 'params.druid_datasource_id') === projectCurrent.datasource_id
    })
    const dataApiId = targetApiIdx === -1 ? null : apis[targetApiIdx].id
  
    // TODO ui
    const genForm = (apiIdx) => {
      const currApi = _.get(apis, [apiIdx]) || {}
      let {id, name, description, call_path, accessible_clients, params} = currApi
  
      const extraFilters = _.get(params, 'extraFilters') || []
  
      let demoQueryStr = toQueryParams({
        access_token: 'xxx', // clients[0].access_token,
        ..._.zipObject(extraFilters.map(f => f.queryKey), extraFilters.map(f => {
          let dbDim = dimNameDict[f.col]
          if (!dbDim || isStringDimension(dbDim)) {
            return 'value1,value2'
          }
          if (isNumberDimension(dbDim)) {
            return '0,100'
          }
          if (isTimeDimension(dbDim)) {
            return '2019-04-12,2019-04-13'
          }
          return '值1,值2'
        }))
      })
      return (
        <Form>
          <FormItem
            label="名称"
            {...formItemLayout}
            required
          >
            <Input
              value={name}
              onChange={e => {
                let {value} = e.target
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => {
                    return immutateUpdate(prevState, `apis[${apiIdx}].name`, () => value)
                  }
                })
              }}
              placeholder="未输入数据 API 名称"
            />
          </FormItem>
    
          <Form.Item
            label="描述"
            {...formItemLayout}
          >
            <Input
              value={description}
              onChange={e => {
                let {value} = e.target
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => immutateUpdate(prevState, `apis[${apiIdx}].description`, () => value)
                })
              }}
            />
          </Form.Item>
    
          <Form.Item
            label="调用路径"
            {...formItemLayout}
            required
          >
            <Input
              disabled={!!id}
              addonBefore="/data-api/"
              value={call_path}
              onChange={e => {
                let {value} = e.target
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => immutateUpdate(prevState, `apis[${apiIdx}].call_path`, () => value)
                })
              }}
              placeholder="未设置数据 API 调用路径"
            />
          </Form.Item>
    
          <Form.Item
            label="客户端限制"
            {...formItemLayout}
          >
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="允许访问此 API 的客户端"
              value={accessible_clients || ['*']}
              onChange={vals => {
                let prev = accessible_clients || ['*']
                let [added] = _.difference(vals, prev)
                let nextVals = added === '*' || _.isEmpty(vals)
                  ? ['*']
                  : vals.filter(v => v !== '*')
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => {
                    return immutateUpdate(prevState, `apis[${apiIdx}].accessible_clients`, () => nextVals)
                  }
                })
              }}
            >
              <SelectOption key="unlimited" value="*">不限</SelectOption>
              {(clients || []).map(c => {
                return (
                  <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>
                )
              })}
            </Select>
          </Form.Item>
          
          <Form.Item
            label="请求格式例子"
            {...formItemLayout}
          >
            <Input.TextArea
              readOnly
              autosize
              value={`${(window.location.origin)}/data-api/${call_path || ''}?${decodeURIComponent(demoQueryStr)}`}
            />
            <div>
              <h4 className="mg0">调用参数说明</h4>
              <dl className="line-height20 mg0 font12">
                <dt className="itblock bold mg2r width80 alignright">access_token</dt>
                <dd className="itblock" style={{width: 'calc(100% - 80px - 16px)'}}>客户端访问标识码（必填）</dd>
                <dt className="itblock bold mg2r width80 alignright">meta</dt>
                <dd className="itblock" style={{width: 'calc(100% - 80px - 16px)'}}>查询用户群信息，选项为 1 或 0，默认为 0</dd>
                <dt className="itblock bold mg2r width80 alignright">pageIndex</dt>
                <dd className="itblock" style={{width: 'calc(100% - 80px - 16px)'}}>分页索引，数值类型，从 0 开始，默认为 0</dd>
                <dt className="itblock bold mg2r width80 alignright">pageSize</dt>
                <dd className="itblock" style={{width: 'calc(100% - 80px - 16px)'}}>分页大小，数值类型，默认为 1000</dd>
              </dl>
            </div>
          </Form.Item>
    
          <Form.Item
            label="返回格式例子"
            {...formItemLayout}
          >
            <Input.TextArea
              readOnly
              autosize
              value={JSON.stringify({
                code: 200,
                description: 'OK',
                response: ['a0000000001']
              }, null, 2)}
            />
          </Form.Item>
        </Form>
      )
    }
    return (
      <Modal
        visible={showModal}
        onOk={this.save}
        onCancel={this.toggleModalVisible}
        title={null}
        closable
        width={600}
      >
        <Tabs
          onChange={tabKey => {
            dispatch({
              type: `${runtimeDataApiNamespace}/updateState`,
              payload: prevState => {
                return immutateUpdate(prevState, 'apis', () => prevState.apisBak)
              }
            })
          }}
        >
          {!dataApiId ? null : (
            <TabPane
              tab="修改已发布的查询当前用户群数据的 API"
              key="update"
            >
              {genForm(targetApiIdx)}
            </TabPane>
          )}
          {!canCreateDataAPI || dataApiId ? null : (
            <TabPane
              tab="发布查询当前用户群数据的 API"
              key="create"
            >
              {genForm(_.findIndex(apis, api => !api.id) === -1 ? apis.length : _.findIndex(apis, api => !api.id))}
            </TabPane>
          )}
        </Tabs>
      </Modal>
    )
  }
  
  toggleModalVisible = () => {
    let {userGroupId} = this.props
    if (userGroupId === 'all' && !this.state.showModal) {
      message.warn('全部用户暂不支持发布数据 API')
      return
    }
    this.setState(prevState => ({
      showModal: !prevState.showModal,
      renderModal: true
    }))
  }
  
  render() {
    let {children} = this.props
    return (
      <React.Fragment>
        {this.renderModal()}
        {_.isFunction(children)
          ? children({toggleModalVisible: this.toggleModalVisible})
          : (
            <span onClick={this.toggleModalVisible}>
              {children}
            </span>
          )}
      </React.Fragment>
    )
  }
}
