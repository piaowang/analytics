import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import * as d3 from 'd3'
import { LoadingOutlined, TeamOutlined } from '@ant-design/icons';
import { Popover, Table } from 'antd';
import ScrollBar from './scroll-bar'
import {pathAnalysisToUsergroup, findOrCreateTempUsergroup, saveAndBrowserInInsight} from '../../common/usergroup-helper'
import deepCopy from '../../../common/deep-copy'

const blockProps = {
  width: 183,
  height: 60,
  marginBottom: 18
}
const lineWidth = 114
const formatter = d3.format('.2f')
const createId = (layer, index, pid) => {
  return `layer${layer}#${index}@${pid}`
}
const removeSameLayerId = (activeNodeIds, layer) => {
  return activeNodeIds.filter(id => {
    let count = parseInt(id.split('#')[0].replace('layer', ''), 10)
    return count < layer
  })
}
const sorter = (a, b) => {
  return b.type * b.weight - a.type * a.weight
}

const flatData = data => {
  let res = []
  if (!_.isPlainObject(data)) return data
  function rec (node, pid, index) {
    let {layer, pageName, weight, children = [], type, rate, userIds} = node
    let prop = layer - 1
    if (!res[prop]) {
      res[prop] = []
    }
    let id = createId(layer, index, pid)
    res[prop].push({
      layer, pageName, weight,
      id,
      type,
      rate: formatter((rate || 1) * 100) + '%',
      originalRate: rate,
      pid,
      userIds
    })
    if(children.length) children.sort(sorter).forEach((c, i) => rec(c, id, i))
  }
  rec(data, 'root', 0)
  return res
}

const lineFactory = d3.line().curve(d3.curveCatmullRom.alpha(0.90))

const computeHeight = (height, marginBottom, index) => {
  return (index + 0.5) * height + index * marginBottom
}

const getRealIndex = (ind, rightLength) => {
  if (rightLength < 9) return ind
  if( ind === rightLength - 1) {
    return 7
  } else if (ind >= 6) {
    return 6
  } else return ind
}

export default class PathTree extends React.Component {

  static propTypes = {
    data: PropTypes.any.isRequired,
    onNodeClick: PropTypes.func,
    direction: PropTypes.string
  }

  static defaultProps = {
    onNodeClick: function() {},
    direction: 'normal'
  }

  constructor(props) {
    super(props)
    this.state = {
      activeNodeIds: [],
      data: flatData(props.data),
      direction: props.direction,
      activeLayers: 2,
      loading: {}
    }
  }

  componentDidMount() {
    this.updateActive()
    // window.addEventListener('resize', this.onWindowResizeRef)
    // this.onWindowResizeRef()
    this.adjustScroll()
  }

  componentWillReceiveProps(nextProps) {
    let {shouldChange, data} = nextProps
    if (
      !_.isEqual(data, this.props.data) ||
      !_.isEqual(shouldChange, this.props.shouldChange)
    ) {
      this.setState({
        data: flatData(data),
        activeLayers: 2,
        direction: nextProps.direction,
        activeNodeIds: [createId(data.layer, 0, 'root')]
      })
    }
  }

  componentDidUpdate() {
    this.adjustScroll()
  }

  adjustScroll = () => {
    let {direction, activeLayers} = this.state
    const { enableNewMenu } = window.sugo
    if (_.isEqual({direction, activeLayers}, this.prevState)) {
      return
    }
    let dom = document.getElementById('path-tree-box')
    if (!dom) return
    let w = window.innerWidth
    let sideDom = enableNewMenu? document.querySelector('.left-menu-box') : document.querySelector('.contain-docs-nav')
    let ws = sideDom?.clientWidth
    let count = Math.floor((w - ws - 32 * 2) / (blockProps.width * 2))
    let hot = activeLayers > count
    if (direction === 'reverse') {
      dom.scrollLeft = hot ? 0: 100000000
    } else {
      dom.scrollLeft = hot ? 100000000 : 0
    }
    this.prevState = {direction, activeLayers}
  }

  // onWindowResizeRef = _.debounce(() => {
  //   let height = window.innerHeight - 99 - 156
  //   this.setState({height})
  // }, 100)

  updateActive = () => {
    let {data} = this.state
    if (!_.isArray(data)) return
    let id = _.get(data, '[0][0].id')
    let activeNodeIds = [id]
    this.setState({activeNodeIds})
  }

  renderSvgDom = left => {
    let {data, activeNodeIds, direction} = this.state
    if (!_.isArray(data)) {
      return []
    }
    if (_.isEmpty(activeNodeIds)) {
      return []
    }
    let right = left + 1
    let leftId = _.find(activeNodeIds, d => _.startsWith(d, `layer${left}`))
    let itemLeft = _.find(data[left - 1], {id: leftId}) || {}
    let poolLeft = data[left - 1].filter(it => it.pid === itemLeft.pid)
    let indexLeft = _.findIndex(
      poolLeft,
      a => a.id === leftId
    )
    indexLeft = getRealIndex(indexLeft, poolLeft)
    let rightId = _.find(activeNodeIds, d => _.startsWith(d, `layer${right}`))
    let itemRight = _.find(data[right - 1], {pid: leftId}) || {}
    let poolRight = (data[right - 1] || []).filter(it => it.pid === itemRight.pid)
    if (!poolRight.length) return
    let indexRight = _.findIndex(
      poolRight,
      a => a.id === rightId
    )
    indexRight = getRealIndex(indexRight, poolRight)
    let {height, marginBottom} = blockProps
    let width = lineWidth
    let startLeft = direction === 'normal'
      ? 0
      : width
    let startRight = direction === 'normal'
      ? width
      : 0
    let startPoint = [startLeft, computeHeight(height, marginBottom, indexLeft)]
    let rightLength = poolRight.length
    let hasLeave = _.find(poolRight, {type: 0})
    let maxLen = hasLeave ? 8 : 7
    rightLength = rightLength > maxLen ? maxLen : rightLength
    let dataArray = new Array(rightLength).fill(0).map((n, i) => {
      let target = [startRight, computeHeight(height, marginBottom, i)]
      let middle = direction === 'normal'
        ? [target[0] - 2, target[1]]
        : [target[0] + 2, target[1]]
      return [
        startPoint,
        middle,
        target
      ]
    })
  
  
    return dataArray.map((points, ind) => {
      let stoke = ind === indexRight
        ? '#a4a4ec'
        : '#c4c7d0'
      if (hasLeave && ind === rightLength - 1) {
        stoke = '#fff2e5'
      }
      let stokeWidth = ind !== indexRight
        ? 2
        : 1
    
      return {
        fill: 'rgba(0,0,0,0)',
        stroke: stoke,
        strokeWidth: stokeWidth,
        d: lineFactory(points)
      }
    })
  
  }

  renderSvg = i => {
    let pathProps = this.renderSvgDom(i + 1) || []
    return (
      <div className="pt-svg-wrapper" >
        <svg className="pt-svg" >
          {pathProps.map((pp, idx) => {
            return (
              <path key={idx} {...pp} />
            )
          })}
        </svg>
      </div>
    )
  }

  onClickNode = node => {
    return () => {
      let {layer, id, type} = node
      if (!type) return
      let {activeNodeIds} = this.state
      let update = {}
      update.activeLayers = layer + 1
      update.activeNodeIds = removeSameLayerId(activeNodeIds, layer)
      update.activeNodeIds.push(id)
      this.setState(update)
    }
  }

  renderNode = (node, i) => {
    if (!node) return null
    let {activeNodeIds, direction} = this.state
    let {rate, pageName, weight, id, userIds} = node
    let active = this.state.activeNodeIds.includes(id)
    let key = i + '@' + id
    let leaveTitle = direction === 'normal' ? '离开' : '首次访问'
    let title = i === 'leave'
      ? leaveTitle
      : pageName
    let cls = `pt-node pt-node-${i} ${active ? 'active' : 'not-active'}`
    let onClick = activeNodeIds.includes(id)
      ? _.noop
      : this.onClickNode(node)

    if (!userIds || !userIds.length) {
      return this.renderNodeDom(key, cls, title, rate, weight, onClick)
    }

    return (
      <Popover
        content={this.renderUserLink(userIds, node, title, true)}
        key={key}
      >
        {this.renderNodeDom('', cls, title, rate, weight, onClick)}
      </Popover>
    )

  }

  onClickRow = record => {
    this.onClickNode(record)()
  }

  getRowClassName = record => {
    let {activeNodeIds} = this.state
    return activeNodeIds.includes(record.id)
      ? 'pa-row-active'
      : ''
  }

  loading = (id, value = true) => {
    let loading = deepCopy(this.state.loading)
    loading[id] = value
    this.setState({loading})
  }

  getCompletePath(record) {
    let {pid, pageName, type} = record
    if (type === 0) {
      pageName = '离开'
    }
    let m = pid.match(/^layer(\d+)#(\d+)/)
    if (m) {
      let {data} = this.state
      let [, layerNum] = m
      let parentRecord = _.find(data[layerNum-1], rec => rec.id === pid)
      return `${this.getCompletePath(parentRecord)} -> ${pageName}`
    } else {
      return pageName
    }
  }

  createQuery = (userIds, record) => {
    let {
      inst: {
        params: {
          relativeTime,
          since,
          until,
          groupby: metricalField
        },
        id = ''
      },
      datasourceCurrent: {
        id: dataSourceId,
        name
      }
    } = this.props
    let pageName = record.type === 0
      ? '离开'
      : `页面:${record.pageName}`
    let title = `路径分析-${pageName}-用户群`
    let refererLink = id
      ? `/console/path-analysis?id=${id}`
      : `/console/path-analysis?datasource_id=${dataSourceId}`
    let q = {
      usergroupIds: userIds,
      relativeTime,
      since,
      until,
      title,
      dataSourceId,
      metricalField,
      dataSourceName: name,
      refererLink,
      pathInfo: `路径分析 -> ${this.getCompletePath(record)}`
    }
    return pathAnalysisToUsergroup(q)
  }

  checkUser = (userIds, record) => {
    return async () => {
      let q = this.createQuery(userIds, record)
      this.loading(record.id)
      let userGroupWithTotal = await findOrCreateTempUsergroup(q)
      this.loading(record.id, false)
      if (userGroupWithTotal) saveAndBrowserInInsight(userGroupWithTotal)
    }
  }

  renderUserLink = (userIds = [], record, title, showTitle = false) => {
    if (!userIds.length) return 0
    let {id, pageName} = record
    let loading = this.state.loading[id]

    let compactUserIds = _.compact(userIds)
    return (
      <div>
        {
          showTitle
            ? <div className="pd1b">
              {title || pageName}
            </div>
            : null
        }
        <span className="mg1r">{compactUserIds.length}</span>
        <span
          className="pointer"
          onClick={this.checkUser(compactUserIds, record)}
        >
        (查看用户详情)
          {
            loading
              ? <LoadingOutlined />
              : <TeamOutlined />
          }
        </span>
      </div>
    );
  }

  renderPopContent = rest => {
    const { pathAnalysisWebPage = false } = window.sugo
    let pager = {
      total: rest.length,
      pageSize: 10
    }
    let columns = [{
      title: '页面',
      dataIndex: 'pageName',
      key: 'pageName',
      width: 200,
      sorter: (a, b) => a.pageName > b.pageName ? 1 : -1,
      render (text) {
        return (
          <div className="width200 elli" title={text}>{text}</div>
        )
      }
    }]
    // 原路径分析模式渲染
    const col2 = [
      {
        title: '比例',
        dataIndex: 'rate',
        width: 100,
        key: 'rate',
        sorter: (a, b) => a.rate > b.rate ? 1 : -1,
        render (text) {
          return (
            <div className="width100 elli" title={text}>{text}</div>
          )
        }
      }, {
        title: '用户',
        dataIndex: 'userIds',
        width: 160,
        key: 'userIds',
        render: (userIds, record) => this.renderUserLink(userIds, record)
      }
    ]
    // for gzmetro-log 只有一级路径分析数据结构渲染
    const col3 = [
      {
        title: '浏览次数',
        dataIndex: 'weight',
        width: 100,
        key: 'weight',
        sorter: (a, b) => a.weight > b.weight ? 1 : -1,
        render (text) {
          return (
            <div className="width100 elli" title={text}>{text}</div>
          )
        }
      }
    ]
    columns = columns.concat(pathAnalysisWebPage === true ? col3 : col2)
    let style = {}
    if (rest.length <= 10) {
      style.height = 33 * (rest.length + 2)
    }
    return (
      <div className="pa-table-wrap" style={style}>
        <Table
          columns={columns}
          dataSource={rest}
          rowKey="id"
          bordered
          size="small"
          pagination={pager}
          rowClassName={this.getRowClassName}
          onRow={(rec) => {
            return {
              onClick: () => this.onClickRow(rec)
            }
          }}
        />
      </div>
    )
  }

  renderOther = (rest) => {
    if (!rest.length) return null
    let rate = rest.reduce((prev, curr) => {
      return prev + curr.originalRate
    }, 0)
    rate = formatter(rate * 100) + '%'
    // 其他的浏览次数总和
    const otherWeight = _.sum(rest.map(s => s.weight))
    return (
      <Popover
        content={this.renderPopContent(rest)}
        placement="right"
      >
        {
          this.renderNodeDom(
            'pt-node-other',
            'pt-node',
            '其他',
            rate,
            otherWeight,
            _.noop
          )
        }
      </Popover>
    )
  }

  renderNodeDom = (key, cls, pageName, rate, weight, onClick) => {
    const { pathAnalysisWebPage = false } = window.sugo
    return (
      <div
        className={cls}
        key={key}
        onClick={onClick}
        title={pageName}
      >
        <h3 className="elli">{pageName}</h3>
        <p className="elli">{pathAnalysisWebPage ? weight : rate}</p>
        <div className="pt-node-output" />
        <div className="pt-node-input" />
      </div>
    )
  }

  nodeRender = (arr, i) => {
    let shouldRender = this.state.activeLayers >= i + 1
    if (!shouldRender) return null
    let {activeNodeIds, direction} = this.state
    let pid = i
      ? _.find(activeNodeIds, d => {
        return _.startsWith(d, `layer${i}`)
      })
      : 'root'
    if (!pid) return null
    let leave = _.find(arr, {type: 0, pid})
    let filtered = _.filter(arr, {type: 1, pid})
    let len = filtered.length
    let top6 = filtered.slice(0, 6)
    let rest = filtered.slice(6, len)
    let totalWeight = _.sum(arr.map(s => s.weight))
    let prop = direction === 'normal'
      ? 'left'
      : 'right'
    let style = {
      [prop]: (blockProps.width + lineWidth) * i
    }
    return (
      <div
        className="pt-layer"
        key={`pt-layer${i}`}
        style={style}
      >
        <div className="pt-nodes">
          {top6.map(this.renderNode)}
          {this.renderOther(rest, totalWeight)}
          {this.renderNode(leave, 'leave')}
        </div>
        {this.renderSvg(i)}
      </div>
    )
  }

  renderInitState = () => {
    return (
      <div
        className="path-tree-box pd3x pd2y aligncenter font16 bg-fb"
        id="path-tree-box"
      >
       请执行<b>查询</b>
      </div>
    )
  }

  renderNoData = (page = this.props.page) => {
    return (
      <div
        className="path-tree-box pd3x pd2y aligncenter font16 bg-fb"
        id="path-tree-box"
      >
      页面 <b>{page}</b> 在当前查询条件下无数据
      </div>
    )
  }

  render () {
    let {data, activeLayers, direction} = this.state
    if (_.isString(data)) return this.renderInitState()
    else if (_.isArray(data) && !data.length) {
      return this.renderNoData()
    }
    let count = activeLayers < 4 ? 4 : activeLayers
    let style1 = {
      width: count * (blockProps.width + lineWidth)
    }
    return (
      <div
        className="path-tree-box pd3x pd2y bg-fb"
        id="path-tree-box"
      >
        <ScrollBar />
        <div
          className={`path-tree-wrapper ${direction}`}
          style={style1}
          id="path-tree-wrapper"
        >
          {data.map(this.nodeRender)}
        </div>
      </div>
    )
  }

}
