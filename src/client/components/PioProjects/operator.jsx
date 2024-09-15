/**
 * 算子组件
 */
import { Component } from 'react'
import {getIcon} from 'common/operator-icon-map'
import joint from 'sugo-jointjs'
import _ from 'lodash'

//计算数组元素差异
function diffArray(arr1, arr2) {
  let arr1Set = new Set(arr1.map(n => n.name))
  let arr2Set = new Set(arr2.map(n => n.name))
  return {
    add: arr1.filter(f => !arr2Set.has(f.name)),
    remove: arr2.filter(f => !arr1Set.has(f.name))
  }
}
const addPortMap = {
  in: 'addInPort',
  out: 'addOutPort'
}
export const statusMap = {
  success: 'SUCCESS',
  fail: 'FAILED',
  running: 'RUNNING'
}
const {icons} = window.sugo
const Width = 200
const Height = 34

const iconSize = 16

const buildIconAttr = function (icon = 'check-circle-o', color = '#5cb85c', show = true) {
  let iconObj = icons[icon]
  let {path, width, height, ascent} = iconObj
  let ratioX = iconSize / width
  let ratioY = iconSize / height
  let transform = `scale(${ratioX},${-ratioY})`
  let res = {
    width,
    height,
    d: path,
    ascent,
    transform,
    style: {
      fill: color,
      display: show ? 'block' : 'none'
    },
    'ref-x': 0.85,
    'ref-y': 0.65
  }
  return res
}
const buildTypeIconAttr = (operator) => {
  let {group} = operator
  let icon = getIcon(group)
  let iconObj = icons[icon] || {}
  let {path, width, height, ascent} = iconObj
  let ratioX = iconSize / width
  let ratioY = iconSize / height
  let transform = `scale(${ratioX},${-ratioY})`
  let res = {
    width,
    height,
    d: path,
    ascent,
    transform,
    style: {
      fill: '#555'
    },
    'ref-x': 0.07,
    'ref-y': 0.65
  }
  return res
}

function getPortName(opName, portName, suffix) {
  return `${opName}::${portName}::${suffix}`
}


function notImplemented(name) {
  throw new Error(`method: ${name} 未实现`)
}

/**
 * 获取不相等的属性，返回属性名数组
 * @param {object} obj0 
 * @param {object} obj1 
 */
function getDifferent(obj0, obj1) {
  let key0 = Object.keys(obj0)
  let key1 = Object.keys(obj1)
  let keys = new Set()

  const fun = key => obj0[key] !== obj1[key] ? keys.add(key) : null

  key0.forEach(fun)
  key1.forEach(fun)

  return Array.from(keys)
}

class cell extends Component {

  componentDidMount() {
    this.cell = this.draw()
  }

  shouldComponentUpdate(nextProps, nextState) {
    let next = this.getAttr(nextProps)
    let now = this.getAttr(this.props)
    return !_.isEqual(next, now) || !_.isEqual(nextState, this.state)
  }

  draw() {
    notImplemented('draw')
  }

  getAttr(props) {
    let attrList = this.needData()
    let data = props.data || {}
    return attrList.reduce((prev, k) => {
      prev[k] = data[k]
      return prev
    }, {})
  }

  needData() {
    return []
  }
  
  render() {
    return null
  }
}


class Operator extends cell {

  componentDidUpdate(prevProps) {
    //对比是什么属性发生改变，做对应变更
    let prev = this.getAttr(prevProps)
    let now = this.getAttr(this.props)
    let keys = getDifferent(now, prev)
    keys.forEach(this.updatePaperModel)
    if(keys.includes('xPos') || keys.includes('yPos')) {
      this.cell.position(now.xPos, now.yPos)
    }
    if (keys.includes('inputPorts') || keys.includes('outputPorts')) {
      this.updatePorts(prev, now)
    }
  }

  componentWillUnmount() {
    const { data, graph } = this.props
    let cell = graph.getCell(data.name)
    cell ? cell.remove() : null
  }

  needData() {
    return ['fullName', 'xPos', 'yPos', 'status', 'inputPorts', 'outputPorts', 'isHighlight']
  }

  updatePorts = (prev, now) => {
    const { data: {name} } = this.props
    let {inputPorts: inputPortsPrev} = prev
    let {outputPorts: outputPortsPrev} = prev
    let {inputPorts} = now
    let {outputPorts} = now
    let diffIn = diffArray(
      inputPorts.portList,
      inputPortsPrev.portList
    )
    if (diffIn.remove.length) {
      this.removePorts(diffIn.remove, name, 'in')
    }
    if (diffIn.add.length) {
      this.addPorts(this.cell, diffIn.add, 'in', name)
    }
    let diffOut = diffArray(
      outputPorts.portList,
      outputPortsPrev.portList
    )
    if (diffOut.remove.length) {
      this.removePorts(diffOut.remove, name, 'out')
    }
    if (diffOut.add.length) {
      this.addPorts(this.cell, diffOut.add, 'out', name)
    }
  }

  removePorts = (ports, optName, type) => {
    ports.forEach(port => {
      let {name} = port
      let id = getPortName(optName, name, type)
      this.cell.removePort(id)
    })
  }

  updatePaperModel = key => {
    let cell = this.cell
    let layout = this.getDefaultLayout(this.props.data)
    switch (key) {
      case 'fullName':
        cell.attr({'.label': layout.attrs['.label']})
        break
      case 'status':
        cell.attr({
          '.status-icon': layout.attrs['.status-icon']
        })
        break
      case 'isHighlight':
        cell.attr({
          '.body': layout.attrs['.body']
        })
        break
      default:
        break
    }
  }

  getDefaultLayout(data) {
    let { fullName, name, xPos, yPos, status, isHighlight } = data
    let statusIcon = {}
    if (status === statusMap.success) {
      statusIcon = buildIconAttr()
    } else if (status === statusMap.fail) {
      statusIcon = buildIconAttr('close-circle-o', '#d9534f')
    } else {
      statusIcon = buildIconAttr('check-circle-o','#5cb85c',false)
    }
    let typeIcon = buildTypeIconAttr(data)
    let bodyColor = isHighlight ? '#9937b2' : '#777777'
    return {
      id: name,
      markup: (
        `<g class="rotatable pio-g-card">
          <rect class="body"/>
          <text class="label"/>
          <path class="status-icon"/>
          <path class="type-icon"/>
        </g>`
      ),
      position: {
        x: xPos,
        y: yPos
      },
      size: {
        width: Width,
        height: Height
      },
      attrs: {
        '.label': {
          'cell-id': name,
          text: fullName,
          'ref-x': .5,
          'ref-y': .33,
          'font-size': 14
        },
        '.body': {
          fill: '#ffffff',
          stroke: bodyColor,
          rx: Height/2,
          ry: Height/2,
          'cell-id': name
        },
        '.status-icon': statusIcon,
        '.type-icon': typeIcon
      },
      ports: {
        groups: {
          in: {
            position: {
              name: 'top'
            },
            attrs: {
              '.port-label': {
                fill: '#1bb39c'
              },
              text: {
                text: ''
              },
              '.port-body': {
                fill: '#fff',
                stroke: '#1bb39c',
                r: 5,
                magnet: true
              }
            }
          },
          out: {
            position: {
              name: 'bottom'
            },
            attrs: {
              '.port-label': {
                fill: '#642284'
              },
              text: {
                text: ''
              },
              '.port-body': {
                fill: '#fff',
                stroke: '#642284',
                r: 5,
                magnet: true
              }
            }
          }
        }
      }
    }
  }

  addPorts(shape, ports, type, optName) {
    _.each(ports, pt => {
      let {name} = pt
      let id = getPortName(optName, name, type)
      shape[addPortMap[type]](id)
    })
  }

  draw() {
    const { data, graph } = this.props
    let { name, inputPorts, outputPorts } = data
    let optName = name
    
    let layout = this.getDefaultLayout(data)

    let shape = new joint.shapes.devs.Model(layout)
    inputPorts = inputPorts || this.defaultPort()
    if (inputPorts.portList.length) {
      this.addPorts(shape, inputPorts.portList, 'in', optName)
    }
    outputPorts = outputPorts || this.defaultPort()
    if (outputPorts.portList.length) {
      this.addPorts(shape, outputPorts.portList, 'out', optName)
    }

    graph.addCell(shape)
    return shape
  }
}


export class Line extends cell {
  draw() {
    const { graph, data } = this.props 
    let {fromOperator, fromPort, toOperator, toPort} = data
    let source = {id: fromOperator, port: getPortName(fromOperator, fromPort, 'out')}
    let target = {id: toOperator, port: getPortName(toOperator, toPort, 'in')}

    let link = graph.getLinks().find(link => {
      let data = link.toJSON()
      return data.source.port === source.port && data.target.port === target.port
    })
    
    if(!link) {
      link = new joint.dia.Link({
        source,
        target,
        connector: { name: 'smooth' },
        attrs: {
          '.marker-source': { fill: '#31d0c6', stroke: 'none', d: '' },
          '.marker-target': { fill: '#777777', stroke: '#aaaaaa', d: 'M 10 0 L 0 5 L 10 10 z' }
        }
      })
      link.addTo(graph)
    }
    
    return link
  }
}

export default Operator
