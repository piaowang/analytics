import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Checkbox, Input, message, Modal, Select, Table, Tabs } from 'antd'
import { connect } from 'react-redux'
import { sagaSyncModel } from '../Fetcher/saga-sync'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import Fetch from '../../common/fetch-final'
import { immutateUpdate, immutateUpdates, toQueryParams } from '../../../common/sugo-utils'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import { isNumberDimension, isStringDimension, isTimeDimension } from '../../../common/druid-column-type'
import { browserHistory } from 'react-router'
import { checkPermission } from '../../common/permission-control'
import HoverHelp from '../Common/hover-help'
import JsCodeEditor from '../LiveScreen/js-code-editor/jsCodeEditor'
import { getDownloadLimit } from '../../common/constans'

const dataApiClientNamespace = 'publishSliceDataApiModal-dataApiClients'
const dataApiNamespace = 'publishSliceDataApiModal-dataApi'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}

const { Option: SelectOption } = Select
const { Item: FormItem } = Form
const { TabPane } = Tabs

const canManageDataAPI = checkPermission('get:/console/data-api')
const canCreateDataAPI = checkPermission('post:/app/data-apis')

let mapStateToProps = (state, ownProps) => {
  const runtimeDataApiClientNamespace = `${dataApiClientNamespace}-${ownProps.dataApiId || 'new'}`
  const runtimeDataApiNamespace = `${dataApiNamespace}-${ownProps.dataApiId || 'new'}`

  const dataApiClientModelState = state[runtimeDataApiClientNamespace] || {}
  const dataApiModelState = state[runtimeDataApiNamespace] || {}
  return {
    ...dataApiClientModelState,
    ...dataApiModelState,
    datasourceCurrent: _.get(state, 'sagaCommon.datasourceCurrent', {}),
    runtimeDataApiClientNamespace,
    runtimeDataApiNamespace
  }
}

const sagaSyncDataApiClientModelGen = props => {
  return sagaSyncModel({
    namespace: `${dataApiClientNamespace}-${props.dataApiId || 'new'}`,
    modelName: 'clients',
    getEffect: async () => {
      let res = await Fetch.get('/app/data-api-clients')
      return _.get(res, 'result', [])
    },
    postEffect: async model => {
      return await Fetch.post('/app/data-api-clients', model)
    },
    putEffect: async model => {
      return await Fetch.put(`/app/data-api-clients/${model.id}`, model)
    },
    deleteEffect: async model => {
      return await Fetch.delete(`/app/data-api-clients/${model.id}`)
    }
  })
}
const sagaSyncDataApiModelGen = props => {
  return sagaSyncModel({
    namespace: `${dataApiNamespace}-${props.dataApiId || 'new'}`,
    modelName: 'apis',
    getEffect: async () => {
      let res = await Fetch.get('/app/data-apis', { id: props.dataApiId || '' })
      return _.get(res, 'result', [])
    },
    postEffect: async model => {
      return await Fetch.post('/app/data-apis', model)
    },
    putEffect: async model => {
      return await Fetch.put(`/app/data-apis/${model.id}`, model)
    },
    deleteEffect: async model => {
      return await Fetch.delete(`/app/data-apis/${model.id}`)
    }
  })
}

@connect(mapStateToProps)
@withRuntimeSagaModel([sagaSyncDataApiClientModelGen, sagaSyncDataApiModelGen])
export default class PublishSliceDataApiSettingsModal extends React.Component {
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
    extraInfo: PropTypes.object
  }

  state = {
    renderModal: false,
    showModal: false,
    showExtraInfoEditModal: false,
    pendingExtraResponse: null,
    apiLimit: null,
    measures: [],
    measuresNameDict: {}
  }

  componentDidMount() {
    this.fetchMetric()
  }

  async fetchMetric() {
    const { datasourceCurrent } = this.props
    if (!datasourceCurrent) return
    let res = await Fetch.get(`/app/measure/get/${datasourceCurrent.id}`)
    this.setState({
      measures: res.data || [],
      measuresNameDict: _.keyBy(_.get(res, 'data', []), 'name')
    })
  }

  save = async () => {
    let { extraInfo, dispatch, apis, runtimeDataApiNamespace } = this.props
    const { apiLimit } = this.state
    let vizType = _.get(extraInfo, 'slice.params.vizType')

    let nextApis = _.map(apis, (apiObj, idx) => {
      if (idx !== apis.length - 1) {
        // 总是修改最后一个就行，因为修改/创建的时候数组只会有一个对象、重新发布的时候只需要上传最后一个对象
        return apiObj
      }
      return immutateUpdates(
        apiObj,
        'params.extraFilters',
        flts => (flts || []).map(f => _.omit(f, 'isEditing')),
        'params.slice',
        pre => {
          let defaultParams = {
            params: {
              apiLimit: vizType === 'table_flat' ? apiLimit : null,
              withGlobalMetrics: _.get(pre, 'params.withGlobalMetrics', vizType === 'number')
            }
          }
          return _.merge(defaultParams, extraInfo.slice)
        }
      )
    })
    if (_.some(apis, api => !api.name || !api.call_path)) {
      message.warn('名称和路径不能为空')
      return
    }
    if (_.some(apis, api => !/^[\w-/]+$/.test(api.call_path) || /\/\//.test(`/data-api/${api.call_path}`))) {
      message.warn('路径存在非法字符')
      return
    }
    let nameConflict = _.some(apis, api => {
      const flts = _.get(api, 'params.extraFilters') || []
      const queryKeys = flts.map(f => f.queryKey)
      return _.uniq(queryKeys).length < queryKeys.length
    })
    if (nameConflict) {
      message.warn('参数名不能重复')
      return
    }
    await dispatch({
      type: `${runtimeDataApiNamespace}/sync`,
      payload: nextApis,
      callback: syncRes => {
        let { resCreate, resUpdate } = syncRes || {}
        if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
          message.warn('没有修改数据，无须保存')
          return
        }
        if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
          // 保存报错
          return
        }
        const isCreated = _.isEmpty(resUpdate)
        message.success(
          <span>
            {isCreated ? '创建' : '修改'}数据 API 成功{canManageDataAPI ? <a href='/console/data-api?tab=2'>，管理数据 API</a> : null}
          </span>
        )
        this.toggleModalVisible()
        if (isCreated) {
          let createdAPIId = _.get(resCreate, [0, 'result', 'id'])
          const nextHis = immutateUpdate(browserHistory.getCurrentLocation(), 'query.dataApiId', () => createdAPIId)
          browserHistory.push(nextHis)
        }
      }
    })
  }

  renderExtraFiltersTableColumns = apiIdx => {
    let { dataSourceDimensions, dispatch, runtimeDataApiNamespace } = this.props
    const toggleEdit = ev => {
      let idx = +(ev.target.getAttribute('data-index') || ev.target.parentElement.getAttribute('data-index') || ev.target.parentElement.parentElement.getAttribute('data-index'))
      dispatch({
        type: `${runtimeDataApiNamespace}/updateState`,
        payload: prevState => {
          return immutateUpdate(prevState, `apis[${apiIdx}].params.extraFilters[${idx}]`, flt => {
            return { ...flt, isEditing: !flt.isEditing }
          })
        }
      })
    }

    const removeRow = ev => {
      let idx = +(ev.target.getAttribute('data-index') || ev.target.parentElement.getAttribute('data-index') || ev.target.parentElement.parentElement.getAttribute('data-index'))
      dispatch({
        type: `${runtimeDataApiNamespace}/updateState`,
        payload: prevState => {
          return immutateUpdate(prevState, `apis[${apiIdx}].params.extraFilters`, flts => {
            return flts.filter((f, i) => i !== idx)
          })
        }
      })
    }

    const saveVal = (idx, propName, nextValue) => {
      dispatch({
        type: `${runtimeDataApiNamespace}/updateState`,
        payload: prevState => {
          return immutateUpdate(prevState, `apis[${apiIdx}].params.extraFilters[${idx}]`, flt => {
            return { ...flt, [propName]: nextValue }
          })
        }
      })
    }

    const save = ev => {
      let idx = +(ev.target.getAttribute('data-index') || ev.target.parentElement.getAttribute('data-index') || ev.target.parentElement.parentElement.getAttribute('data-index'))
      let propName =
        ev.target.getAttribute('data-prop-name') || ev.target.parentElement.getAttribute('data-prop-name') || ev.target.parentElement.parentElement.getAttribute('data-prop-name')
      let { value: nextValue } = ev.target

      saveVal(idx, propName, nextValue)
    }
    return [
      {
        title: '参数名',
        dataIndex: 'queryKey',
        key: 'queryKey',
        render: (val, record, idx) => {
          return record.isEditing ? <Input value={val} data-index={idx} data-prop-name='queryKey' onChange={save} /> : val
        }
      },
      {
        title: '对应维度',
        dataIndex: 'col',
        key: 'col',
        render: (val, record, idx) => {
          return record.isEditing ? (
            <Select
              data-index={idx}
              data-prop-name='col'
              value={val}
              onChange={val => {
                saveVal(idx, 'queryKey', val)
                saveVal(idx, 'col', val)
              }}
              {...enableSelectSearch}
              placeholder='数据源维度'
              dropdownMatchSelectWidth={false}
            >
              {(dataSourceDimensions || []).map(dbDim => {
                return (
                  <SelectOption key={dbDim.id} value={dbDim.name}>
                    {dbDim.title || dbDim.name}
                  </SelectOption>
                )
              })}
            </Select>
          ) : (
            val
          )
        }
      },
      {
        title: '筛选方式',
        dataIndex: 'op',
        key: 'op',
        render: (val, record, idx) => {
          return record.isEditing ? (
            <Select
              data-index={idx}
              data-prop-name='op'
              value={val}
              onChange={val => {
                saveVal(idx, 'op', val)
              }}
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
            >
              <SelectOption value='in'>包含</SelectOption>
              <SelectOption value='not in'>排除</SelectOption>
              <SelectOption value='contains'>含有</SelectOption>
              <SelectOption value='not contains'>不含有</SelectOption>
              <SelectOption value='equal'>等于</SelectOption>
              <SelectOption value='not equal'>不等于</SelectOption>
            </Select>
          ) : (
            val
          )
        }
      },
      {
        title: '操作',
        dataIndex: 'queryKey',
        key: 'ops',
        render: (val, record, idx) => {
          if (record.isEditing) {
            return <CheckCircleOutlined className='pointer' data-index={idx} onClick={toggleEdit} />
          }
          return (
            <React.Fragment>
              <EditOutlined className='pointer' data-index={idx} onClick={toggleEdit} />
              <DeleteOutlined className='pointer mg2l' data-index={idx} onClick={removeRow} />
            </React.Fragment>
          )
        }
      }
    ]
  }

  renderIndicesNameTableColumns = apiIdx => {
    let { dispatch, runtimeDataApiNamespace, extraInfo } = this.props
    const { measuresNameDict } = this.state

    const metrics = _.get(extraInfo, 'slice.params.metrics') || []

    const toggleEdit = ev => {
      let idx = +(ev.target.getAttribute('data-index') || ev.target.parentElement.getAttribute('data-index') || ev.target.parentElement.parentElement.getAttribute('data-index'))
      if (this.props.apis[apiIdx].params.indicesName[idx].indexName && this.props.apis[apiIdx].params.indicesName[idx].indexTitle)
        dispatch({
          type: `${runtimeDataApiNamespace}/updateState`,
          payload: prevState => {
            return immutateUpdate(prevState, `apis[${apiIdx}].params.indicesName[${idx}]`, flt => {
              return { ...flt, isEditing: !flt.isEditing }
            })
          }
        })
    }

    const removeRow = ev => {
      let idx = +(ev.target.getAttribute('data-index') || ev.target.parentElement.getAttribute('data-index') || ev.target.parentElement.parentElement.getAttribute('data-index'))
      dispatch({
        type: `${runtimeDataApiNamespace}/updateState`,
        payload: prevState => {
          return immutateUpdate(prevState, `apis[${apiIdx}].params.indicesName`, flts => {
            return flts.filter((f, i) => i !== idx)
          })
        }
      })
    }

    const saveVal = (idx, propName, nextValue) => {
      let reg = /^[a-zA-Z][a-zA-Z0-9_]*$/
      if (propName === 'indexName') if (!reg.test(nextValue)) return message.error('别名只允许英文开头，英文，数字，下划线组成')
      dispatch({
        type: `${runtimeDataApiNamespace}/updateState`,
        payload: prevState => {
          return immutateUpdate(prevState, `apis[${apiIdx}].params.indicesName[${idx}]`, flt => {
            return { ...flt, [propName]: nextValue }
          })
        }
      })
    }

    const save = ev => {
      let idx = +(ev.target.getAttribute('data-index') || ev.target.parentElement.getAttribute('data-index') || ev.target.parentElement.parentElement.getAttribute('data-index'))
      let propName =
        ev.target.getAttribute('data-prop-name') || ev.target.parentElement.getAttribute('data-prop-name') || ev.target.parentElement.parentElement.getAttribute('data-prop-name')
      let { value: nextValue } = ev.target
      saveVal(idx, propName, nextValue)
    }
    return [
      {
        title: '指标别名',
        dataIndex: 'indexName',
        key: 'indexName',
        width: '120px',
        render: (val, record, idx) => {
          return record.isEditing ? <Input value={val} data-index={idx} data-prop-name='indexName' onChange={save} /> : val
        }
      },
      {
        title: '对应指标',
        dataIndex: 'indexTitle',
        key: 'indexTitle',
        width: '240px',
        render: (val, record, idx) => {
          return record.isEditing ? (
            <Select
              data-index={idx}
              data-prop-name='col'
              value={val}
              className='width240'
              onChange={val => {
                saveVal(idx, 'indexTitle', val)
              }}
              {...enableSelectSearch}
              placeholder='数据源指标'
              dropdownMatchSelectWidth={false}
            >
              {(metrics || []).map(measure => {
                return (
                  <SelectOption key={measure} value={measure} title={measuresNameDict[measure].title || measure}>
                    {measuresNameDict[measure].title || measure}
                  </SelectOption>
                )
              })}
            </Select>
          ) : (
            _.get(measuresNameDict, `${val}.title`, val)
          )
        }
      },
      {
        title: '操作',
        dataIndex: 'indexName',
        key: 'ops',
        render: (val, record, idx) => {
          if (record.isEditing) {
            return <CheckCircleOutlined className='pointer' data-index={idx} onClick={toggleEdit} />
          }
          return (
            <React.Fragment>
              <EditOutlined className='pointer' data-index={idx} onClick={toggleEdit} />
              <DeleteOutlined className='pointer mg2l' data-index={idx} onClick={removeRow} />
            </React.Fragment>
          )
        }
      }
    ]
  }

  onAppendExtraFilterClick = ev => {
    let apiIdx = +(
      ev.target.getAttribute('data-api-idx') ||
      ev.target.parentElement.getAttribute('data-api-idx') ||
      ev.target.parentElement.parentElement.getAttribute('data-api-idx')
    )
    let { dataSourceDimensions, dispatch, runtimeDataApiNamespace } = this.props
    let defaultFilterDim = _.find(dataSourceDimensions, isStringDimension)
    dispatch({
      type: `${runtimeDataApiNamespace}/updateState`,
      payload: prevState => {
        return immutateUpdate(prevState, `apis[${apiIdx}].params.extraFilters`, flts => {
          return [
            ...(flts || []),
            {
              isEditing: true,
              op: 'in',
              col: _.get(defaultFilterDim, 'name'),
              queryKey: _.get(defaultFilterDim, 'name')
            }
          ]
        })
      }
    })
  }

  onAppendIndicesNameClick = ev => {
    let apiIdx = +(
      ev.target.getAttribute('data-api-idx') ||
      ev.target.parentElement.getAttribute('data-api-idx') ||
      ev.target.parentElement.parentElement.getAttribute('data-api-idx')
    )
    let { dispatch, runtimeDataApiNamespace, extraInfo } = this.props
    const { measuresNameDict } = this.state

    const metrics = _.get(extraInfo, 'slice.params.metrics') || []

    if (_.get(this.props, `apis[${apiIdx}].params.indicesName`, []).length === metrics.length) {
      return message.error('已选指标均配置了别名')
    }

    dispatch({
      type: `${runtimeDataApiNamespace}/updateState`,
      payload: prevState => {
        return immutateUpdate(prevState, `apis[${apiIdx}].params.indicesName`, flts => {
          return [
            ...(flts || []),
            {
              isEditing: true,
              indexTitle: measuresNameDict[metrics[_.get(flts, 'length', 0)]].name,
              indexName: metrics[_.get(flts, 'length', 0)]
            }
          ]
        })
      }
    })
  }

  renderModal() {
    let { clients, dispatch, runtimeDataApiNamespace, dimNameDict, apis, extraInfo } = this.props
    let { renderModal, showModal, apiLimit, showExtraInfoEditModal, pendingExtraResponse } = this.state

    // 延迟渲染 modal，节约内存
    if (!renderModal) {
      return null
    }
    const vizType = _.get(extraInfo, 'slice.params.vizType')
    const metrics = _.get(extraInfo, 'slice.params.metrics') || []
    const dataApiId = _.get(apis, [0, 'id'])
    const dimensions = _.get(extraInfo, 'slice.params.dimensions') || []
    const firstDimLimit = _.get(extraInfo, `slice.params.dimensionExtraSettingDict[${dimensions[0]}].limit`) || 10

    const isSelectQuery = vizType === 'table_flat' && !metrics.length
    const genForm = apiIdx => {
      const currApi = _.get(apis, [apiIdx]) || {}
      let { id, name, description, call_path, accessible_clients, params } = currApi

      const extraFilters = _.get(params, 'extraFilters') || []
      const indicesName = _.get(params, 'indicesName') || []

      let demoQueryStr = toQueryParams({
        access_token: 'xxx', // clients[0].access_token,
        ..._.zipObject(
          extraFilters.map(f => f.queryKey),
          extraFilters.map(f => {
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
          })
        )
      })
      return (
        <Form>
          <FormItem label='名称' {...formItemLayout} required>
            <Input
              value={name}
              onChange={e => {
                let { value } = e.target
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => {
                    return immutateUpdate(prevState, `apis[${apiIdx}].name`, () => value)
                  }
                })
              }}
              placeholder='未输入数据 API 名称'
            />
          </FormItem>

          <Form.Item label='描述' {...formItemLayout}>
            <Input
              value={description}
              onChange={e => {
                let { value } = e.target
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => immutateUpdate(prevState, `apis[${apiIdx}].description`, () => value)
                })
              }}
            />
          </Form.Item>

          <Form.Item label='调用路径' {...formItemLayout} required>
            <Input
              disabled={!!id}
              addonBefore='/data-api/'
              value={call_path}
              onChange={e => {
                let { value } = e.target
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => immutateUpdate(prevState, `apis[${apiIdx}].call_path`, () => value)
                })
              }}
              placeholder='未设置数据 API 调用路径'
            />
          </Form.Item>

          <Form.Item label='额外筛选参数' {...formItemLayout}>
            <Table
              rowKey={(d, i) => i}
              size='small'
              locale={{
                emptyText: (
                  <span>
                    暂无内容，
                    <a className='pointer' data-api-idx={apiIdx} onClick={this.onAppendExtraFilterClick}>
                      点此添加
                    </a>
                  </span>
                )
              }}
              dataSource={extraFilters}
              columns={this.renderExtraFiltersTableColumns(apiIdx)}
              pagination={false}
            />
            {_.isEmpty(extraFilters) ? null : (
              <a className='pointer' data-api-idx={apiIdx} onClick={this.onAppendExtraFilterClick}>
                <PlusOutlined /> 添加额外筛选参数
              </a>
            )}
          </Form.Item>

          <Form.Item label='客户端限制' {...formItemLayout}>
            <Select
              mode='multiple'
              style={{ width: '100%' }}
              placeholder='允许访问此 API 的客户端'
              value={accessible_clients || ['*']}
              onChange={vals => {
                let prev = accessible_clients || ['*']
                let [added] = _.difference(vals, prev)
                let nextVals = added === '*' || _.isEmpty(vals) ? ['*'] : vals.filter(v => v !== '*')
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => {
                    return immutateUpdate(prevState, `apis[${apiIdx}].accessible_clients`, () => nextVals)
                  }
                })
              }}
            >
              <SelectOption key='unlimited' value='*'>
                不限
              </SelectOption>
              {(clients || []).map(c => {
                return (
                  <SelectOption key={c.id} value={c.id}>
                    {c.name}
                  </SelectOption>
                )
              })}
            </Select>
          </Form.Item>

          {isSelectQuery ? null : (
            <Form.Item label='指标名称配置' {...formItemLayout}>
              <Table
                rowKey={(d, i) => i}
                size='small'
                locale={{
                  emptyText: (
                    <span>
                      暂无内容，
                      <a className='pointer' data-api-idx={apiIdx} onClick={this.onAppendIndicesNameClick}>
                        点此添加
                      </a>
                    </span>
                  )
                }}
                dataSource={indicesName}
                columns={this.renderIndicesNameTableColumns(apiIdx)}
                pagination={false}
              />
              {_.isEmpty(indicesName) ? null : (
                <a className='pointer' data-api-idx={apiIdx} onClick={this.onAppendIndicesNameClick}>
                  <PlusOutlined /> 添加指标名称映射
                </a>
              )}
            </Form.Item>
          )}

          {isSelectQuery ? null : (
            <Form.Item label='包含全局统计' {...formItemLayout}>
              <Checkbox
                checked={_.get(params, 'slice.params.withGlobalMetrics', vizType === 'number')}
                onChange={ev => {
                  let { checked } = ev.target
                  dispatch({
                    type: `${runtimeDataApiNamespace}/updateState`,
                    payload: prevState => {
                      return immutateUpdate(prevState, `apis[${apiIdx}].params.slice.params.withGlobalMetrics`, () => checked)
                    }
                  })
                }}
              >
                是
              </Checkbox>
            </Form.Item>
          )}

          <Form.Item
            label={
              <HoverHelp addonBefore='额外响应 ' content='返回给客户端的额外信息，一般用于描述对数据的额外处理，不会在服务器端执行，需要预先与客户端定好协议，由客户端来执行' />
            }
            {...formItemLayout}
          >
            <Button
              size='small'
              type={showExtraInfoEditModal ? 'primary' : 'default'}
              onClick={() => {
                this.setState({
                  showExtraInfoEditModal: true,
                  pendingExtraResponse: params?.extraResponse
                })
              }}
            >
              编辑
            </Button>

            <Modal
              title='编辑额外响应信息'
              width='60vw'
              visible={showExtraInfoEditModal}
              onOk={() => {
                dispatch({
                  type: `${runtimeDataApiNamespace}/updateState`,
                  payload: prevState => immutateUpdate(prevState, `apis[${apiIdx}].params.extraResponse`, () => pendingExtraResponse)
                })
                this.setState({ showExtraInfoEditModal: false, pendingExtraResponse: null })
              }}
              onCancel={() => this.setState({ showExtraInfoEditModal: false })}
              bodyStyle={{ position: 'relative' }}
            >
              <JsCodeEditor
                className='height550 full-height'
                btnStyle={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: '10'
                }}
                value={pendingExtraResponse}
                onChange={val => this.setState({ pendingExtraResponse: val })}
                defaultValue={`({
  preProcess(response, params, utils) {
    /* 客户端执行逻辑，注意浏览器兼容问题 */
    return params
  },
  afterProcess(response, params, utils) {
    /* 客户端执行逻辑，注意浏览器兼容问题 */
    return utils.copyOnUpdate(response, '[0].text', function() {
      return utils.moment().format('YYYY/MM/DD')
    })
  }
})`}
              />
            </Modal>
          </Form.Item>

          <Form.Item label='请求格式例子' {...formItemLayout}>
            <Input.TextArea readOnly autosize value={`${window.location.origin}/data-api/${call_path || ''}?${decodeURIComponent(demoQueryStr)}`} />
            <div>
              <h4 className='mg0'>调用参数说明</h4>
              <dl className='line-height20 mg0 font12'>
                <dt className='itblock bold mg2r width80 alignright'>access_token</dt>
                <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                  客户端访问标识码（必填）
                </dd>
                {isSelectQuery ? (
                  <React.Fragment>
                    <dt className='itblock bold mg2r width80 alignright'>pageIndex</dt>
                    <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                      页码从 0 开始，默认为 0
                    </dd>
                    <dt className='itblock bold mg2r width80 alignright'>queryTotal</dt>
                    <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                      查询数据总量，默认为 0， 传 1 则会返回数据总数据量
                    </dd>
                  </React.Fragment>
                ) : null}
                <dt className='itblock bold mg2r width80 alignright'>pageSize</dt>
                <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                  每页数据条数默认为 {firstDimLimit}（第一维度显示数量），不能大于 {_.last(getDownloadLimit('batchDownloadLimit'))}
                </dd>
                <dt className='itblock bold mg2r width80 alignright'>extraOnly</dt>
                <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                  传 1 则会只查询额外响应信息，默认为 0
                </dd>
              </dl>
            </div>
          </Form.Item>

          <Form.Item label='返回格式例子' {...formItemLayout}>
            <Input.TextArea
              readOnly
              autosize
              value={JSON.stringify(
                {
                  code: 200,
                  description: 'OK',
                  response: [
                    _.get(params, 'slice.params.withGlobalMetrics', vizType === 'number')
                      ? {
                          total: 100,
                          resultSet: [{ city: 'gz', count: 100 }]
                        }
                      : { city: 'gz', count: 100 }
                  ]
                },
                null,
                2
              )}
            />
          </Form.Item>
        </Form>
      )
    }
    return (
      <Modal visible={showModal} onOk={this.save} onCancel={this.toggleModalVisible} title={null} closable width={600}>
        <Tabs
          onChange={tabKey => {
            if (tabKey === 'update') {
              // 清除 apis[1]
              dispatch({
                type: `${runtimeDataApiNamespace}/updateState`,
                payload: prevState => {
                  return immutateUpdate(prevState, 'apis', prevApis => _.take(prevApis, 1))
                }
              })
            } else if (tabKey === 'create') {
              // 还原 apis[0]
              dispatch({
                type: `${runtimeDataApiNamespace}/updateState`,
                payload: prevState => {
                  return immutateUpdate(prevState, 'apis[0]', () => prevState.apisBak[0])
                }
              })
            }
          }}
        >
          {!dataApiId ? null : (
            <TabPane tab='更新当前 API' key='update'>
              {genForm(0)}
            </TabPane>
          )}
          {!canCreateDataAPI ? null : (
            <TabPane tab='另存为新 API' key='create'>
              {genForm(dataApiId ? 1 : 0)}
            </TabPane>
          )}
        </Tabs>
      </Modal>
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
    return (
      <React.Fragment>
        {this.renderModal()}
        {_.isFunction(children) ? children({ toggleModalVisible: this.toggleModalVisible }) : <span onClick={this.toggleModalVisible}>{children}</span>}
      </React.Fragment>
    )
  }
}
