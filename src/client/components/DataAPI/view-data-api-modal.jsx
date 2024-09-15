import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Checkbox, Input, message, Modal, Select, Table } from 'antd'
import Fetch from '../../common/fetch-final'
import { immutateUpdate, toQueryParams } from '../../../common/sugo-utils'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import { isNumberDimension, isStringDimension, isTimeDimension } from '../../../common/druid-column-type'
import { getDownloadLimit } from '../../common/constans'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}

const { Option: SelectOption } = Select
const { Item: FormItem } = Form

export default class PublishDataApiSettingsModal extends React.Component {
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
    extraInfo: PropTypes.object
  }

  state = {
    renderModal: false,
    showModal: false,
    measures: [],
    measuresNameDict: {},
    dataSourceDimensions: [],
    dimNameDict: {}
  }

  componentDidMount() {
    this.fetchMetric()
    this.fetchDimension()
  }

  async fetchDimension() {
    const { apis } = this.props
    let dataSourceId = _.get(apis, 'params.slice.druid_datasource_id')
    if (!dataSourceId) return
    let res = await Fetch.get(`/app/dimension/get/${dataSourceId}`)
    this.setState({
      dataSourceDimensions: res.data || [],
      dimNameDict: _.keyBy(_.get(res, 'data', []), 'name')
    })
  }

  async fetchMetric() {
    const { apis } = this.props
    let datasourceCurrent = _.get(apis, 'params.slice.druid_datasource_id')
    if (!datasourceCurrent) return
    let res = await Fetch.get(`/app/measure/get/${datasourceCurrent}`)
    this.setState({
      measures: res.data || [],
      measuresNameDict: _.keyBy(_.get(res, 'data', []), 'name')
    })
  }

  renderExtraFiltersTableColumns = apiIdx => {
    const { dataSourceDimensions } = this.state
    return [
      {
        title: '参数名',
        dataIndex: 'queryKey',
        key: 'queryKey',
        render: (val, record, idx) => {
          return record.isEditing ? <Input value={val} data-index={idx} data-prop-name='queryKey' /> : val
        }
      },
      {
        title: '对应维度',
        dataIndex: 'col',
        key: 'col',
        render: (val, record, idx) => {
          return record.isEditing ? (
            <Select data-index={idx} data-prop-name='col' value={val} {...enableSelectSearch} placeholder='数据源维度' dropdownMatchSelectWidth={false}>
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
            <Select data-index={idx} data-prop-name='op' value={val} {...enableSelectSearch} dropdownMatchSelectWidth={false}>
              <SelectOption value='in'>包含</SelectOption>
              <SelectOption value='not in'>排除</SelectOption>
              <SelectOption value='contains'>含有</SelectOption>
              <SelectOption value='not contains'>不含有</SelectOption>
            </Select>
          ) : (
            val
          )
        }
      }
    ]
  }

  renderIndicesNameTableColumns = apiIdx => {
    let { dispatch, runtimeDataApiNamespace, apis } = this.props
    const { measuresNameDict } = this.state

    const metrics = _.get(_.get(apis, 'params.slice'), 'params.metrics') || []

    return [
      {
        title: '指标别名',
        dataIndex: 'indexName',
        key: 'indexName',
        width: '120px',
        render: (val, record, idx) => {
          return record.isEditing ? <Input value={val} data-index={idx} data-prop-name='indexName' /> : val
        }
      },
      {
        title: '对应指标',
        dataIndex: 'indexTitle',
        key: 'indexTitle',
        width: '240px',
        render: (val, record, idx) => {
          return record.isEditing ? (
            <Select data-index={idx} data-prop-name='col' value={val} className='width240' {...enableSelectSearch} placeholder='数据源指标' dropdownMatchSelectWidth={false}>
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
      }
    ]
  }

  onAppendIndicesNameClick = ev => {
    let apiIdx = ev.target.getAttribute('data-api-idx')
    let { dispatch, runtimeDataApiNamespace, apis } = this.props
    const { measuresNameDict } = this.state

    const metrics = _.get(_.get(apis, 'params.slice'), 'params.metrics') || []

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
    let { apis, clients } = this.props
    let { renderModal, showModal, dimNameDict } = this.state

    let extraInfo = {
      slice: _.get(apis, 'params.slice')
    }

    let location = window.location.origin

    // 延迟渲染 modal，节约内存
    if (!renderModal) {
      return null
    }
    const vizType = _.get(extraInfo, 'slice.params.vizType')
    const metrics = _.get(extraInfo, 'slice.params.metrics') || []
    const isSelectQuery = vizType === 'table_flat' && !metrics.length
    const dimensions = _.get(extraInfo, 'slice.params.dimensions') || []
    const firstDimLimit = _.get(extraInfo, `slice.params.dimensionExtraSettingDict[${dimensions[0]}].limit`) || 10

    const genForm = apiIdx => {
      const currApi = apis || {}
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
            <Input value={name} disabled placeholder='未输入数据 API 名称' />
          </FormItem>

          <Form.Item label='描述' {...formItemLayout}>
            <Input disabled value={description} />
          </Form.Item>

          <Form.Item label='调用路径' {...formItemLayout} required>
            <Input disabled addonBefore='/data-api/' value={call_path} placeholder='未设置数据 API 调用路径' />
          </Form.Item>

          {!extraInfo.slice ? null : (
            <Form.Item label='额外筛选参数' disabled {...formItemLayout}>
              <Table rowKey={(d, i) => i} size='small' dataSource={extraFilters} columns={this.renderExtraFiltersTableColumns(apiIdx)} pagination={false} />
            </Form.Item>
          )}

          <Form.Item label='客户端限制' {...formItemLayout}>
            <Select mode='multiple' disabled style={{ width: '100%' }} placeholder='允许访问此 API 的客户端' value={accessible_clients || ['*']}>
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

          {metrics.length && extraInfo.slice ? (
            <Form.Item label='指标名称配置' {...formItemLayout}>
              <Table
                rowKey={(d, i) => i}
                size='small'
                locale={{
                  emptyText: '暂无内容'
                }}
                dataSource={indicesName}
                columns={this.renderIndicesNameTableColumns(apiIdx)}
                pagination={false}
              />
            </Form.Item>
          ) : null}

          {extraInfo.slice && !isSelectQuery ? (
            <Form.Item label='包含全局统计' {...formItemLayout}>
              <Checkbox checked={_.get(params, 'slice.params.withGlobalMetrics', vizType === 'number')} disabled>
                是
              </Checkbox>
            </Form.Item>
          ) : null}

          <Form.Item label='请求格式例子' {...formItemLayout}>
            <Input.TextArea readOnly autosize disabled value={`${location}/data-api/${call_path || ''}?${decodeURIComponent(demoQueryStr)}`} />
            {extraInfo.slice ? (
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
            ) : (
              <div>
                <h4 className='mg0'>调用参数说明</h4>
                <dl className='line-height20 mg0 font12'>
                  <dt className='itblock bold mg2r width80 alignright'>access_token</dt>
                  <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                    客户端访问标识码（必填）
                  </dd>
                  <dt className='itblock bold mg2r width80 alignright'>meta</dt>
                  <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                    查询用户群信息，选项为 1 或 0，默认为 0
                  </dd>
                  <dt className='itblock bold mg2r width80 alignright'>pageIndex</dt>
                  <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                    分页索引，数值类型，从 0 开始，默认为 0
                  </dd>
                  <dt className='itblock bold mg2r width80 alignright'>pageSize</dt>
                  <dd className='itblock' style={{ width: 'calc(100% - 80px - 16px)' }}>
                    分页大小，数值类型，默认为 1000
                  </dd>
                </dl>
              </div>
            )}
          </Form.Item>

          <Form.Item label='返回格式例子' {...formItemLayout}>
            <Input.TextArea
              readOnly
              disabled
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
      <Modal visible={showModal} onCancel={this.toggleModalVisible} footer={null} title={'查看api信息'} closable width={600}>
        {genForm(0)}
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
