import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import { LoadingOutlined } from '@ant-design/icons'
import { Button, Modal, Select, message, Checkbox, Tooltip } from 'antd'
import _ from 'lodash'
import { compressUrlQuery } from '../../../common/sugo-utils'
import { getDownloadLimit } from '../../common/constans'
// import { withDataSourceDimensions } from '../Fetcher/data-source-dimensions-fetcher'
import Fetch from '../../common/fetch-final'
import { toQueryParams } from '../../../common/sugo-utils'
import { remoteUrl } from '../../constants/interface'
import { Anchor } from '../Common/anchor-custom'

/*  let withDim = withDataSourceDimensions(BatchDownloadModal, props => ({
    dataSourceId: props.dataSourceId,
    doFetch: !!props.dataSourceId && props.modalVisible
  }), true)*/
/**
 * 批量下载源数据
 * @class BatchDownloadModal
 * @extends {React.Component}
 */
export default class BatchDownloadModal extends React.Component {
  static propTypes = {
    dataSourceId: PropTypes.string.isRequired
  }

  constructor(props, context) {
    super(props, context)
    this.cache = {}
    this.state = {
      isDownloading: false,
      downloadLimit: getDownloadLimit('batchDownloadLimit')[0] || 100,
      current: 1,
      extraFilters: null,
      batchDownloadLimit: -1,
      dimensions: [],
      selectedDimensions: [],
      loading: false
    }
  }

  componentWillMount() {
    // 延迟加载维度数据，否则打开自助分析后 datasource_id 为空，无法查询维度信息
    // this.fetchData(this.props.dataSourceId)
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!prevProps.modalVisible && this.props.modalVisible) {
      this.fetchData(this.props.dataSourceId)
    }
  }

  fetchData(datasource_id) {
    this.setState({ loading: true })
    const clean = () => this.setState({ loading: false })
    this._fetchData(datasource_id).then(clean, clean)
  }

  async _fetchData(datasource_id) {
    // 从Fetcher中不好拿数据，所以此处多发一次请求
    // 垂构的时候再说吧
    // 请求的维度已经排序并过滤掉了隐藏维度
    let dimensions = []
    if (this.cache[datasource_id]) {
      dimensions = this.cache[datasource_id]
    } else {
      const query = { noSort: '', useUserCustomOrder: 1, datasource_type: 'all' }
      const url = `${remoteUrl.GET_DIMENSIONS}/${datasource_id}?${toQueryParams(query)}`
      const res = await Fetch.get(url)
      this.cache[datasource_id] = dimensions = (res.data || []).filter(dbDim => !_.get(dbDim, 'params.type'))
    }

    let druidDims = dimensions.filter(dbDim => dbDim.is_druid_dimension)
    this.setState({
      dimensions,
      selectedDimensions: druidDims.map(dim => dim.id)
    })
  }

  generateDownLoadUrl = () => {
    const { downloadLimit, selectedDimensions, dimensions } = this.state
    const { dataSourceId, timezone, filters } = this.props
    let dbDimIdDict = _.keyBy(dimensions, 'id')
    const queryParams = {
      druid_datasource_id: dataSourceId,
      params: {
        filters: filters,
        select: selectedDimensions.map(id => dbDimIdDict[id] && dbDimIdDict[id].name).filter(_.identity),
        selectLimit: downloadLimit,
        timezone,
        scanQuery: true // 批量下载采用scanQuery下载
      }
    }

    const list = getDownloadLimit('batchDownloadLimit')
    const max = list[list.length - 1]

    if (downloadLimit < 0) {
      message.destroy()
      message.error('请设置下载条数')
      return ''
    }

    if (downloadLimit > max) {
      message.destroy()
      message.error(`超过最大限制${max}`)
      return ''
    }

    return `/app/download/batch?q=${compressUrlQuery(JSON.stringify(queryParams))}`
  }

  close = () => {
    this.setState({
      current: 1,
      extraFilters: null,
      shouldDoFetch: false
    })
    this.props.onModalVisibleChange()
  }

  renderDimensionsSelector() {
    const { dimensions, selectedDimensions } = this.state
    let druidDims = dimensions.filter(dbDim => dbDim.is_druid_dimension)
    if (druidDims.length === 0) {
      return (
        <div className='analytic-batch-item'>
          <span className='pd1r'>没有维度可下载，请进入</span>
          <Link to={`/console/dimension?id=${this.props.dataSourceId}`}>
            <span className='color-lighten'>维度管理</span>
          </Link>
          <span className='pd1l'>尝试</span>
          <strong className='pd1x'>同步维度</strong>
          操作
        </div>
      )
    }
    return (
      <div className='analytic-batch-item'>
        <div className='item-label'>
          <div>下载维度：</div>
          <div className='pd1t'>
            <Checkbox
              checked={druidDims.length === selectedDimensions.length}
              onChange={e => this.setState({ selectedDimensions: e.target.checked ? druidDims.map(d => d.id) : [] })}
            >
              全选
            </Checkbox>
          </div>
        </div>
        <div className='item-content-wrapper'>
          <div className='item-content'>
            <Select
              mode='multiple'
              showSearch
              optionFilterProp='children'
              filterOption={(input, option) => {
                return option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }}
              style={{ maxHeight: 100 }}
              className='width-100'
              value={selectedDimensions}
              onChange={selectedDimensions => this.setState({ selectedDimensions })}
            >
              {druidDims.map(dim => (
                <Select.Option value={dim.id} key={dim.id}>
                  {dim.title || dim.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>

        {druidDims.length === dimensions.length ? null : (
          <p className='color-red pd1x pd2t'>
            <span>注意，以下维度不存在于 Druid，所以不能下载；如果有误，请尝试同步维度：</span>
            <br />
            <span>
              {dimensions
                .filter(dbDim => !dbDim.is_druid_dimension)
                .map(dbDim => dbDim.title || dbDim.name)
                .join('，')}
            </span>
          </p>
        )}
      </div>
    )
  }

  renderDownloadLimitSelector() {
    const { downloadLimit, inputDownloadLimit } = this.state
    const batchDownloadLimit = getDownloadLimit('batchDownloadLimit')
    const limits = _.uniq(inputDownloadLimit !== -1 ? [inputDownloadLimit].concat(batchDownloadLimit) : batchDownloadLimit).filter(item => item !== undefined && item !== null)

    return (
      <div className='analytic-batch-item'>
        <div className='item-label'>下载数据量（条）：</div>
        <div className='item-content-wrapper'>
          <Tooltip placement='top' title='也可以输入下载数量'>
            <div className='iblock'>
              <Select
                showSearch
                dropdownMatchSelectWidth={false}
                value={`${downloadLimit}`}
                className='width120'
                onSearch={input => {
                  input = (input || inputDownloadLimit) * 1 || -1
                  this.setState({
                    inputDownloadLimit: input,
                    downloadLimit: input
                  })
                }}
                onChange={val => this.setState({ downloadLimit: val * 1 })}
              >
                {limits.map((l, i) => (
                  <Select.Option key={i} value={'' + l}>
                    {l}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </Tooltip>
        </div>
      </div>
    )
  }

  renderModalFooter() {
    const { loading, isDownloading, selectedDimensions } = this.state
    const downloadUrl = selectedDimensions.length > 0 ? this.generateDownLoadUrl() : ''
    const disabled = loading || !downloadUrl || isDownloading

    return (
      <div>
        <Button key='back' type='default' size='large' onClick={this.close}>
          关闭
        </Button>
        <Anchor key='downloadBtn' disabled={disabled} href={downloadUrl} target='_blank'>
          <Button disabled={disabled} className='mg2l' type='primary' size='large'>
            下载
          </Button>
        </Anchor>
      </div>
    )
  }

  render() {
    if (!this.props.modalVisible) return null

    const { filters } = this.props
    const { extraFilters, loading } = this.state

    let finalFilters = filters
    if (extraFilters) {
      finalFilters = [
        ...filters.filter(flt => {
          return !new Set((extraFilters && extraFilters.map(f => f.col)) || []).has(flt.col)
        }),
        ...extraFilters
      ]
    }

    debug(finalFilters, 'finalFilters=')

    return (
      <Modal title='批量下载数据' visible onCancel={this.close} footer={this.renderModalFooter()}>
        {loading ? (
          <LoadingOutlined />
        ) : (
          <div>
            <div className='pd1b'>{this.renderDownloadLimitSelector()}</div>
            <div>{this.renderDimensionsSelector()}</div>
          </div>
        )}
      </Modal>
    )
  }
}
