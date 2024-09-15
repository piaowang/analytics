/**
 * 算子画布组件，传递算子和连线数组，自动渲染界面
 */
import { Component } from 'react'
import joint from 'sugo-jointjs'
import Operator, { Line, statusMap } from './operator'
import _ from 'lodash'
import Tip from './tooltip'
import ContextMenu from './context-menu'

import {
  AreaChartOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  CloseCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  EditOutlined,
  EyeOutlined,
  FileOutlined,
  MinusCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'

import { Popconfirm, Modal, Input, Button } from 'antd'

const portTypeMap = {
  in: '输入',
  out: '输出',
  undefined: '未知'
}

let disabled = { color: '#ccc' }

class OperatorCanvas extends Component {
  constructor(props, context) {
    super(props, context)
    this.state = {
      tooltip: {},
      context: {},
      mainHeight: 800,
      allowDelete: typeof props.deleteOperator === 'function',
      unitDataName: props.settingOperator,
      rename: '', //重命名的算子
      logs: [],
      logName: ''
    }
    this.mouseOutTimer = null
    this._copyId = null
    this._pastePos = null
    this._pos = null
  }

  componentDidMount() {
    this.renderJoints()
    document.body.addEventListener('keyup', this.keyUp)
  }

  componentWillReceiveProps(nextProps) {
    this.hideContextMenu()
    this.setState({
      allowDelete: typeof nextProps.deleteOperator === 'function',
      unitDataName: nextProps.settingOperator
    })
  }

  componentDidUpdate(prevProps) {
    if (this.props.zoom !== prevProps.zoom) this.zoom(this.props.zoom)
  }

  componentWillUnmount() {
    this.willUnmount = true
    clearTimeout(this.mouseOutTimer)
    document.body.removeEventListener('keyup', this.keyUp)
  }

  renderJoints = () => {
    let graph = new joint.dia.Graph()
    let paper = new joint.dia.Paper({
      el: this.main,
      width: 2000,
      height: 2000,
      gridSize: 1,
      perpendicularLinks: true,
      model: graph,
      validateConnection: (cellViewS, magnetS, cellViewT, magnetT) => {
        let res = true
        if (
          (magnetS && magnetS.getAttribute('port-group') === 'in') ||
          cellViewS === cellViewT ||
          !magnetT ||
          (magnetT && magnetT.getAttribute('port-group') === 'out') ||
          this.isFull(magnetS) ||
          this.isFull(magnetT)
        )
          res = false

        return res
      },
      snapLinks: { radius: 20 },
      markAvailable: true,
      validateMagnet: function (cellView, magnet) {
        return magnet.getAttribute('magnet') !== 'passive'
      }
    })

    this.graph = graph
    this.paper = paper

    this.graph
      .on('add', this.setLink)
      .on('remove', (cell) => {
        if (this.willUnmount) return //如果是画布要卸载了就不处理
        //只处理线的移除事件，算子的移除通过用户触发deleteOperator
        cell.isLink() ? this.updateConnections() : null
      })
      .on('change:position', this.updateCellPos)

    this.paper
      .on('cell:mouseover', this.onMouseOver)
      .on('cell:mouseout', this.onMouseOut)
      .on('blank:pointerdown', this.hideContextMenu)
      .on('blank:pointerdblclick', this.resetZoom)
      .on('cell:pointerdblclick', this.resetZoom)
      .on('cell:pointerdown', this.onMouseDown)
      .on('blank:contextmenu', this.blankContextMenu)
      .on('cell:pointerup', this.pointerUp)
      .on('link:connect link:disconnect', this.updateConnections)

    if (this.state.allowDelete)
      this.paper.on('cell:contextmenu', this.cellContextMenu)
  }

  isFull = () => {
    return false
  }

  setLink = (cell) => {
    //设置新添加的线的样式，使之与其他线一样
    if (!cell.isLink()) return
    cell.set('connector', { name: 'smooth' })
    cell.attr({
      '.marker-source': { fill: '#31d0c6', stroke: 'none', d: '' },
      '.marker-target': {
        fill: '#777777',
        stroke: '#aaaaaa',
        d: 'M 10 0 L 0 5 L 10 10 z'
      }
    })
  }

  validateLink = (link) => {
    return link.fromOperator && link.fromPort && link.toOperator && link.toPort
  }

  validateLink = (link) => {
    return link.fromOperator && link.fromPort && link.toOperator && link.toPort
  }

  updateConnections = async () => {
    const { connections, updateConnections } = this.props
    if (!updateConnections) return
    let links = this.graph.getLinks()
    let cons = []
    links.forEach((link) => {
      let data = link.toJSON()
      if (
        !data.source ||
        !data.target ||
        !data.source.port ||
        !data.target.port
      ) {
        return
      }
      let srcId = data.source.port.split('::')
      let tarId = data.target.port.split('::')
      let con = {
        fromOperator: srcId[0],
        fromPort: srcId[1],
        toOperator: tarId[0],
        toPort: tarId[1]
      }
      if (!this.validateLink(con)) {
        return
      }
      cons.push(con)
    })
    await updateConnections(connections, cons)
  }

  updateCellPos = (child, pos, target) => {
    let name = target.translateBy
    let data = {
      xPos: pos.x,
      yPos: pos.y
    }
    this._pos = { name, data }
  }

  pointerUp = () => {
    if (!this._pos) return
    const { updateOperator } = this.props
    const { name, data } = this._pos
    this._pos = null
    updateOperator ? updateOperator(name, data) : null
  }

  onMouseOver = (cellView, evt) => {
    let { target } = evt
    if (target.classList.contains('v-line')) {
      target = target.parentElement.previousElementSibling
    } else if (target.classList.contains('type-icon')) {
      target = target.parentElement.querySelector('.body')
    }
    let port = target.getAttribute('port')
    let cellId = target.getAttribute('cell-id')

    if (!port && !cellId) {
      return
    }

    let rect0 = target.getBoundingClientRect()
    let rect1 = this.main.getBoundingClientRect()
    let rect = {
      top: rect0.top - rect1.top,
      bottom: rect0.bottom - rect1.top + 60,
      left: rect0.left - rect1.left,
      right: rect0.right - rect1.left
    }

    let tooltip = {
      rect,
      content: port ? this.getPortInfo(port) : this.getOperatorInfo(cellId),
      visible: true
    }

    this.setState({
      tooltip
    })

    clearTimeout(this.mouseOutTimer)
  }

  onMouseOut = () => {
    this.mouseOutTimer = setTimeout(this.hideTooltip, 1000)
  }
  onTooltipMouseOver = () => {
    clearTimeout(this.mouseOutTimer)
  }

  hideTooltip = () => {
    let tooltip = _.cloneDeep(this.state.tooltip)
    tooltip.visible = false
    this.setState({
      tooltip
    })
  }

  onMouseDown = (cellView, evt) => {
    if (evt.originalEvent.button === 2) return
    this.hideContextMenu()
    this.hideTooltip()
    let cell = cellView.model
    if (cell.isLink()) return
    this.setState({ unitDataName: cell.id })
    //让表单项失去焦点触发更新
    document.activeElement.blur()
    this.props.editOperator ? this.props.editOperator(cell.id) : null
  }

  resetZoom = () => {
    if (this.props.onChangeZoom) this.props.onChangeZoom('1.0')
    else this.zoom(1)
  }
  zoom(zoom) {
    let scale = parseFloat(zoom)
    this.paper.scale(scale, scale)
  }

  hideContextMenu = () => {
    let context = _.cloneDeep(this.state.context)
    context.visible = false
    this.setState({
      context
    })
  }

  deleteOperator = (cellId) => {
    this.props.deleteOperator(cellId)
  }

  paste = () => {
    let { x, y } = this._pastePos
    this.props.cloneOperator(this._copyId, { xPos: x, yPos: y })
  }

  rename = () => {
    this.setState({
      rename: '',
      fullName: ''
    })
    const { rename, fullName } = this.state
    this.props.updateOperator(rename, { fullName })
  }

  async showLog(cellId) {
    const { operators, getLog } = this.props
    const op = operators.find((op) => op.name === cellId)
    this.setState({ logName: op.fullName })
    let res = await getLog(cellId)
    if (res && res.result) {
      this.setState({ logs: res.result })
    }
  }

  removeAll = () => {
    let operators = this.props.operators
    for (let op of operators) {
      this.props.deleteOperator(op.name)
    }
  }

  keyUp = (e) => {
    switch (e.code) {
      case 'Delete':
        if (this.state.unitDataName)
          this.deleteOperator(this.state.unitDataName)
        break

      default:
        break
    }
  }

  allowRun(op) {
    const input = _.get(op, 'inputPorts.portList')
    const { operators, connections } = this.props
    let isLast = false
    if (input.length) {
      //该算子的所有输入算子
      const ops = connections
        .filter((c) => c.toOperator === op.name)
        .map((c) => operators.find((o) => o.name === c.fromOperator))
      if (!ops.some((op) => op.status !== statusMap.success)) isLast = true
    } else isLast = true

    return op.status === statusMap.success || isLast
  }

  cellContextMenu = (cellView, evt, x, y) => {
    let { operators } = this.props
    let zoom = parseFloat(this.props.zoom)
    let pos = {
      left: x * zoom,
      top: y * zoom
    }
    let { target } = evt
    if (target.classList.contains('v-line')) {
      target = target.parentElement.previousElementSibling
    }

    //let port = target.getAttribute('port')
    let cellId = target.getAttribute('cell-id')

    if (!cellId) {
      return
    }

    const operator = operators.find((o) => o.name === cellId)
    const success = operator.status === statusMap.success
    const allowRun = this.allowRun(operator)
    const showLog =
      operator.status === statusMap.success ||
      operator.status === statusMap.fail

    let content = (
      <div onClick={this.hideContextMenu}>
        <div
          className="pio-menu-item pointer pd1y pd2x"
          key="del-op"
          onClick={() => this.deleteOperator(cellId)}
        >
          <CloseCircleOutlined className="mg1r" />
          移除这个算子
        </div>
        <div
          className="pio-menu-item pointer pd1y pd2x"
          key="run-to"
          onClick={() => this.props.run(cellId, 'to')}
        >
          <CaretRightOutlined className="mg1r" />
          运行到此处
        </div>
        <div
          className="pio-menu-item pointer pd1y pd2x"
          key="run-from"
          style={allowRun ? null : disabled}
          onClick={allowRun ? () => this.props.run(cellId, 'from') : null}
        >
          <CaretDownOutlined className="mg1r" />
          从此处开始运行
        </div>
        <div
          className="pio-menu-item pointer pd1y pd2x"
          key="run-single"
          style={allowRun ? null : disabled}
          onClick={allowRun ? () => this.props.run(cellId, 'single') : null}
        >
          <PlayCircleOutlined className="mg1r" />
          运行该节点
        </div>
        <div
          className="pio-menu-item pointer pd1y pd2x"
          style={success ? null : disabled}
          key="get-result"
          onClick={success ? () => this.props.showResult(cellId) : null}
        >
          <AreaChartOutlined className="mg1r" />
          查看结果
        </div>
        <div
          className="pio-menu-item pointer pd1y pd2x"
          style={showLog ? null : disabled}
          key="get-log"
          onClick={showLog ? () => this.showLog(cellId) : null}
        >
          <CodeOutlined className="mg1r" />
          查看日志
        </div>
        <hr className="mg1" />
        <div
          className="pio-menu-item pointer pd1y pd2x"
          key="copy"
          onClick={() => (this._copyId = cellId)}
        >
          <CopyOutlined className="mg1r" />
          复制
        </div>
        <div
          className="pio-menu-item pointer pd1y pd2x"
          key="rename"
          onClick={() => this.setState({ rename: cellId })}
        >
          <EditOutlined className="mg1r" />
          重命名
        </div>
      </div>
    )

    let context = {
      visible: true,
      pos,
      content
    }

    this.setState({
      context
    })
  }

  blankContextMenu = (evt, x, y) => {
    this._pastePos = { x, y }
    let zoom = parseFloat(this.props.zoom)
    let pos = {
      left: x * zoom,
      top: y * zoom
    }
    let content = (
      <div onClick={this.hideContextMenu}>
        {this.state.allowDelete ? (
          <Popconfirm
            title="确定移除所有算子么，也将移除所有的连接"
            onConfirm={this.removeAll}
          >
            <div className="pio-menu-item pointer pd1y pd2x" key="del-all">
              <MinusCircleOutlined /> 移除所有所有算子
            </div>
          </Popconfirm>
        ) : null}
        <div
          className="pio-menu-item pointer pd1y pd2x"
          key="reset-zoom"
          onClick={this.resetZoom}
        >
          <EyeOutlined /> 恢复到100%缩放
        </div>
        <div
          className="pio-menu-item pointer pd1y pd2x"
          key="paste"
          style={this._copyId ? null : disabled}
          onClick={this._copyId ? this.paste : null}
        >
          <FileOutlined /> 粘贴
        </div>
      </div>
    )

    let context = {
      visible: true,
      pos,
      content
    }

    this.setState({
      context
    })
  }

  getOperatorInfo = (name) => {
    let { operators } = this.props
    let unitData = _.find(operators, { name })
    let { fullName, description } = unitData
    let content = [
      {
        name: '节点名称',
        value: fullName
      },
      {
        name: '算法名称',
        value: description
      }
    ]
    return (
      <div>
        {content.map((c) => (
          <p className="wordbreak pd1b font14 bold" key={c.name}>
            <span className="color-green">{c.name + ': '}</span>
            <span className={'color-' + (c.color || 'darkgray')}>
              {c.value}
            </span>
          </p>
        ))}
      </div>
    )
  }

  getPortInfo = (port) => {
    let { operators } = this.props
    let [name = '', portName = '', portType = 'undefined'] = port.split('::')
    let portListName = portType + 'putPorts'
    let operator = _.find(operators, { name }) || {}
    let portObj =
      _.find((operator[portListName] || {}).portList, { name: portName }) || {}
    let { description, outputType } = portObj
    let typeText = portTypeMap[portType]
    return (
      <div>
        <div>
          <b>端口名称:</b> {description} ({typeText})
        </div>
        <div>
          <b>端口类型:</b> {outputType}
        </div>
        <div>
          <b>算子:</b> {operator.fullName}
        </div>
      </div>
    )
  }

  render() {
    let { operators, connections, id, style } = this.props
    const {
      tooltip,
      context,
      unitDataName,
      rename,
      logName,
      logs
    } = this.state
    return (
      <div ref={(div) => (this.main = div)} id={id} style={style}>
        <Tip
          {...tooltip}
          onTooltipMouseOver={this.onTooltipMouseOver}
          onMouseOut={this.onMouseOut}
        />
        <ContextMenu {...context} />
        {operators.map((o) => {
          let data = Object.assign({}, o)
          data.isHighlight = unitDataName === o.name
          return <Operator data={data} key={o.name} graph={this.graph} />
        })}
        {connections.map((o) => {
          return (
            <Line
              data={o}
              key={o.fromOperator + o.toOperator}
              graph={this.graph}
            />
          )
        })}
        <Modal
          title="重命名"
          visible={!!rename}
          onOk={this.rename}
          onCancel={() => this.setState({ rename: '' })}
        >
          <Input
            onChange={(e) => this.setState({ fullName: e.target.value })}
          />
        </Modal>
        <Modal
          title={`${logName}算子运行日志`}
          visible={!!logName}
          onCancel={() => this.setState({ logName: '' })}
          footer={
            <Button
              type="primary"
              onClick={() => this.setState({ logName: '' })}
            >
              确定
            </Button>
          }
        >
          {logs.map((log) => {
            const levelClassMap = {
              INFO: '',
              ERROR: 'color-red'
            }
            const color = levelClassMap[log.level]
            return <div className={color}>{log.message}</div>
          })}
        </Modal>
      </div>
    )
  }
}

export default OperatorCanvas
