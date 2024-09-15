import React, { useEffect, useRef, useState } from 'react'
import * as joint from 'jointjs'
import 'jointjs/dist/joint.css'
import _ from 'lodash'
import { immutateUpdates, immutateUpdate } from '../../../../common/sugo-utils'
import { AppstoreOutlined, DeleteOutlined, MinusOutlined, PlusOutlined, FormOutlined, CopyOutlined } from '@ant-design/icons'
import { Input, Tooltip, message, Modal } from 'antd'
import PropTypes from 'prop-types'
import './iconfont'
import { FLOW_INCON_MAP, autoTypography, TASK_EDIT_NODE_TYPE } from '../constants.js'
import dagre from 'dagre'
import graphlib from 'graphlib'

const percentFormat = v => _.round(v * 100) + '%'
const cellWidth = 160

function GetCharLength(str) {
  let iLength = 0 //记录字符的字节数
  for (let i = 0; i < str.length; i++) {
    //遍历字符串中的每个字符
    if (str.charCodeAt(i) > 255) {
      //如果当前字符的编码大于255
      iLength += 2 //所占字节数加2
    } else {
      iLength += 1 //否则所占字节数加1
    }
  }
  return iLength //返回字符所占字节数
}

/**
 * 连线节点渲染
 * @param {*} startAngle 起点位置
 * @param {*} step 节点index
 * @param {*} type 是输入还是输出
 */
const generatePortAttrr = (startAngle, step, type) => {
  return {
    position: {
      name: 'ellipseSpread',
      args: {
        startAngle,
        step,
        compensateRotation: false
      }
    },
    attrs: {
      '.port-body': {
        stroke: type === 'in' ? '#68CDBD' : '#5A9BD5',
        r: '6'
      },
      '.port-label': { fill: 'transparent' },
      '.body': { rx: 6, ry: 6 }
    }
  }
}

function genCell(node, selected) {
  if (!node) {
    return null
  }
  let { id, type, pos, title } = node
  const length = GetCharLength(title)
  const cellHeight = Math.ceil(length / 14) * 20
  let typeName = _.truncate(title || _.get('NodeEnumDict', [type, 'title'], ''), { length: 10 })

  // 设置标签有没有被选中时候的样式
  const markup = selected
    ? [
        // ...shadow,
        '<g >',
        `<rect class="body ${selected ? 'select-cell' : ''}"  rx="7" ry="7"></rect>`, //${selected ? 'style="filter:url(#dropshadow)"' : ''}
        `<foreignObject x="45" y="5" width="90" height="${cellHeight}">`,
        `<p xmlns="http://www.w3.org/1999/xhtml" style="word-break:break-all;text-align:${cellHeight === 20 ? 'center' : 'left'}">${title}</p>`,
        '</foreignObject>',
        `<use x="15" y="${(10 + cellHeight) / 2 - 10}" width="20" height="20" fill="#2D8CF0" xlink:href="#${FLOW_INCON_MAP[type] || FLOW_INCON_MAP['task']}"></use>`,
        '<rect class="body cell-mask"  rx="7" ry="7" ></rect>',
        '</g>'
      ].join('')
    : [
        '<g >',
        '<rect class="body"  rx="7" ry="7"></rect>', //${selected ? 'style="filter:url(#dropshadow)"' : ''}
        `<foreignObject x="45" y="5" width="90" height="${cellHeight}">`,
        `<p xmlns="http://www.w3.org/1999/xhtml" style="word-break:break-all;text-align:${cellHeight === 20 ? 'center' : 'left'}">${title}</p>`,
        '</foreignObject>',
        `<use x="15" y="${(10 + cellHeight) / 2 - 10}" width="20" height="20" fill="#2D8CF0" xlink:href="#${FLOW_INCON_MAP[type] || FLOW_INCON_MAP['task']}"></use>`,
        '<rect class="body cell-mask"  rx="7" ry="7"></rect>',
        '</g>'
      ].join('')
  // 预定义的输入和输出端口组和简化API的现成形状
  const element = new joint.shapes.devs.Model({
    id: id,
    position: { x: pos[0], y: pos[1] },
    size: {
      width: cellWidth,
      height: 10 + cellHeight
    },
    markup,
    inPorts: ['in', 'in2'],
    outPorts: type === 'end' ? [] : ['out', 'out2'],
    ports: {
      groups: {
        in: generatePortAttrr(270, 90),
        in2: generatePortAttrr(0, 90),
        out: generatePortAttrr(90, 90),
        out2: generatePortAttrr(180, 90)
      }
    },
    attrs: {
      // '.label tspan:first': _.isNil(value) ? {dy: '5px'} : {dy: colIdx === 0 ? '0.2em' : colIdx === 1 ? '0.2em' : '-0.3em'},
      // '.label tspan:last': _.isNil(value) ? undefined : {dy: '1.2em'},
      '.label': {
        text: typeName,
        fontSize: 14,
        pointerEvents: 'none',
        fill: '#5A9BD5'
        /*'ref-x': .5, 'ref-y': .2*/
      },
      '.body': { fill: '#fff', stroke: selected ? '#2D8CF0' : '#CED6DA', rx: 7, ry: 7 },
      '.line': {
        'stroke-dasharray': '5',
        'stroke-width': '1',
        stroke: '#5A9BD5',
        d: `M 0 1 L ${cellWidth} 1`
      }
    }
  })
  return element
}

// 检测闭环
function checkCloseLoop(graph, sourceId, targetId) {
  let links = _.flatMap(graph, r =>
    _.map(r.inputs, sourceNodeId => {
      return { source: sourceNodeId, target: r.id }
    })
  )
  let connectNode = []
  const currConnect = links.find(p => p.source === sourceId && p.target === targetId)
  if (!_.isEmpty(currConnect)) {
    return {
      status: false,
      message: '不能重复连接两个节点'
    }
  }
  const getConnectNode = id => {
    const items = links.filter(p => p.target === id) || {}
    _.forEach(items, p => {
      if (!_.isEmpty(p)) {
        connectNode.push(p.source)
        connectNode.push(p.target)
        getConnectNode(p.source)
      }
    })
  }
  getConnectNode(sourceId)
  const hsaCloseLoop = _.some(connectNode, p => p === targetId)
  return {
    status: !hsaCloseLoop,
    message: hsaCloseLoop ? '不能形成闭环' : ''
  }
}
// 定义连线
function genLinkCell(linkInfo) {
  let { source, target, sourcePort, targetPort } = linkInfo
  let link = new joint.shapes.devs.Link({
    id: `${source}-${target}`,
    source: {
      id: source,
      port: sourcePort || 'out'
    },
    target: {
      id: target,
      port: targetPort || 'in'
    },
    connector: { name: 'smooth' },
    attrs: {
      line: {
        stroke: '#2D8CF0'
      },
      '.connection': {
        stroke: '#2D8CF0',
        fill: 'none',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        targetMarker: {
          d: 'M 5 -5 L -5 0 L 5 5 Z'
          // 'd': 'M 10 -5 L 0 0 L 10 5 z'
        },
        sourceMarker: {
          d: 'M 0 -1 L -5 0 L 0 1 Z'
        }
      }
    }
  })
  return link
}

export default function FlowDesignPanel(props) {
  let chartDomRef = useRef()
  let paperRef = useRef()
  let graphRef = useRef()
  let draggingCanvasAtRef = useRef()
  let isMoving = false
  const [contentMenuConfig, setContentMenuConfig] = useState({ display: false, top: 0, left: 0 })
  let { onAddNodeJob, disabled, value, onChange, onSelect, selectedKey, spWidth, spHeight, canEditNodeType = [], onCopyNode } = props
  function genGraph() {
    let objs = _.get(value, 'graph') || []
    let links = _.flatMap(objs, r =>
      _.map(r.inputs, sourceNodeId => {
        const [sourcePort, targetPort] = _.get(r.ports, [sourceNodeId], ['', ''])
        return { source: sourceNodeId, sourcePort, target: r.id, targetPort }
      })
    )

    let cells = [..._.map(objs, t => genCell(t, selectedKey === t.id)), ...links.map(genLinkCell)]
    let graph = graphRef.current || new joint.dia.Graph()
    graph.fromJSON({ cells })
    return graph
  }

  let transform = _.get(value, 'transform') || [0, 0]
  useEffect(() => {
    // 初始化画布，并且定义参数
    let scale = _.get(value, 'scale')
    let graph = genGraph()

    let paper = new joint.dia.Paper({
      el: chartDomRef.current,
      model: graph,
      width: '100%',
      height: '100%',
      background: { color: '#fff' },
      restrictTranslate: true,
      interactive: !disabled,
      gridSize: 10,
      drawGrid: false,
      snapLinks: true,
      linkPinning: true,
      highlighting: {
        default: {
          name: 'stroke',
          options: {
            padding: 6
          }
        },
        embedding: {
          name: 'addClass',
          options: {
            className: 'highlighted-parent'
          }
        }
      }
    })

    paper.translate(transform[0] || 0, transform[1] || 0)
    paper.scale(scale || 1)
    graphRef.current = graph
    paperRef.current = paper
  }, [])
  // 设置画布的初始化大小
  useEffect(() => {
    paperRef.current && paperRef.current.setDimensions(spWidth, spHeight)
  }, [spHeight, spWidth])

  useEffect(() => {
    const graph = graphRef.current
    const paper = paperRef.current
    if (!graph || !paper) {
      return
    }
    const onBlankPointerDown = (ev, x, y) => {
      // x, y 为绝对位置
      draggingCanvasAtRef.current = [x, y]
      hideContentMenu()
    }
    const onBlankPointerMove = (ev, x, y) => {
      // let translate = paperRef.current ? paperRef.current.translate() : null
      // if(!translate || !_.difference(transform, [translate.tx, translate.ty]).length) {
      //   return
      // }
      isMoving = true
      if (draggingCanvasAtRef.current && paperRef.current) {
        // x, y 为绝对位置
        let [sx, sy] = draggingCanvasAtRef.current
        let translate = paperRef.current.translate()
        const deltaX = x - sx
        const deltaY = y - sy
        paperRef.current.translate(translate.tx + deltaX, translate.ty + deltaY)
      }
    }
    const onBlankPointerUp = () => {
      let translate = paperRef.current ? paperRef.current.translate() : null
      //优化判断 检测translate是否发生变化
      if (draggingCanvasAtRef.current && translate) {
        onChange && onChange(immutateUpdate(value, 'transform', () => [translate.tx, translate.ty]))
        draggingCanvasAtRef.current = null
      }
      if (!isMoving && onSelect) {
        onSelect(null)
      }
      isMoving = false
    }
    graph.on('remove', syncRemove)
    paper
      .on('cell:pointerup', onMouseUp)
      .on('cell:pointerdown', hideContentMenu)
      .on('cell:contextmenu', onContentMenu)
      .on('blank:pointerdown', onBlankPointerDown)
      .on('blank:pointermove', onBlankPointerMove)
      .on('blank:pointerup', onBlankPointerUp)
      .on('link:connect', updateConnections)
    return () => {
      graph.off('remove', syncRemove)
      paper
        .off('cell:pointerup', onMouseUp)
        .off('cell:pointerdown', hideContentMenu)
        .off('cell:contextmenu', onContentMenu)
        .off('blank:pointerdown', onBlankPointerDown)
        .off('blank:pointermove', onBlankPointerMove)
        .off('blank:pointerup', onBlankPointerUp)
        .off('link:connect', updateConnections)
    }
  })

  useEffect(() => {
    if (!paperRef.current) {
      return
    }
    let scale = _.get(props, 'value.scale')
    genGraph()

    paperRef.current.translate(transform[0] || 0, transform[1] || 0)
    paperRef.current.scale(scale || 1)
  }, [value, selectedKey])

  useEffect(() => {
    if (!paperRef.current) {
      return
    }
    paperRef.current.setInteractivity(!disabled)
  }, [disabled])

  /**
   * 编辑节点方法
   * @param {*} id 节点id
   */
  function handleEditNodeInfo(id) {
    hideContentMenu()
    let { onEditNodeInfo } = props
    if (onEditNodeInfo) {
      onEditNodeInfo(id)
    }
  }

  function handleCopyNode(id) {
    hideContentMenu()
    onCopyNode(id)
  }

  function onContentMenu(cellView, ev) {
    setContentMenuConfig({ display: true, left: ev.offsetX, top: ev.offsetY, id: cellView.model.id })
  }

  function hideContentMenu() {
    setContentMenuConfig({ display: false, left: 0, top: 0, id: '' })
  }

  function onMouseUp(cellView) {
    const type = _.get(cellView.model, 'attributes.type')
    if (type === 'devs.Model') {
      let { onSelect, spWidth, spHeight } = props
      // 更新坐标
      syncPosition(cellView.model)
      if (onSelect) {
        onSelect(cellView.model.id)
      }
      // 如果需要则扩大画布
      let currTranslate = paperRef.current.translate()
      let { y, height } = paperRef.current.getContentArea()
      const padding = 30
      paperRef.current.setDimensions(spWidth, Math.max(spHeight, currTranslate.ty + y + height + padding * 2))
    } else if (cellView.model.isLink()) {
      // 没有连到端点，则取消
      const linkAttrs = cellView.model.attributes
      if (!('id' in linkAttrs.target) || !('id' in linkAttrs.source)) {
        cellView.model.remove()
      }
    }
  }

  function syncPosition(cell) {
    const pos = cell.position()
    const res = immutateUpdate(value, 'graph', objs => {
      let table = _.find(objs, t => t.id === cell.id)
      if (!table) {
        return objs
      }
      return objs.map(t => (t === table ? { ...t, pos: [pos.x, pos.y] } : t))
    })
    if (res === value) {
      return
    }
    onChange(res, true)
  }

  function updateConnections(link) {
    // TODO link valid check

    let { source, target } = link.model.attributes
    let sId = source && source.id
    let tId = target && target.id
    if (sId === tId) {
      link.model.remove()
      return
    }
    const { status, message: msg } = checkCloseLoop(_.get(value, 'graph', []), source.id, target.id)
    if (!status) {
      message.error(msg)
      link.model.remove()
      return
    }
    let res = immutateUpdates(value, 'graph', objs => {
      return _.map(objs, r => {
        if (r.id !== tId && r.id !== sId) {
          return r
        }
        if (r.id === tId) {
          let ports = r.ports || {}
          let inputs = r.inputs || []
          _.set(ports, [sId], [source.port, target.port])
          return {
            ...r,
            inputs: _.uniq([...inputs, sId]),
            ports
          }
        }
        if (r.id === sId) {
          let ports = r.ports || {}
          let outputs = r.outputs || []
          _.set(ports, [tId], [source.port, target.port])
          return {
            ...r,
            outputs: _.uniq([...outputs, tId]),
            ports
          }
        }
      })
    })
    onChange(res, true)
  }

  function syncRemove(cell, ev) {
    if (cell.isLink()) {
      const { source, target } = cell.attributes
      let sId = source && source.id,
        tId = target && target.id
      let res = immutateUpdate(value, 'graph', objs => {
        return _.map(objs, r => {
          if (r.id === tId) {
            const [sourcePort, targetPort] = _.get(r.ports, [sId], ['out', 'in'])
            if (sourcePort === source.port && targetPort === target.port) {
              return { ...r, inputs: r.inputs.filter(s => s !== sId) }
            }
            return r
          }
          if (r.id === sId) {
            const [sourcePort, targetPort] = _.get(r.ports, [tId], ['out', 'in'])
            if (sourcePort === source.port && targetPort === target.port) {
              return { ...r, outputs: (r.outputs || []).filter(t => t !== tId) }
            }
            return r
          }
          return r
        })
      })

      if (res === value) {
        return
      }
      onChange(res, true)
    }
  }

  function autoLayout(type) {
    const [marginX, marginY] = _.get(value, 'transform', [0, 0])
    joint.layout.DirectedGraph.layout(graphRef.current, {
      nodeSep: 50,
      edgeSep: 50,
      rankDir: type === 1 ? 'TB' : 'LR',
      dagre: dagre,
      marginX: -marginX + 50,
      marginY: -marginY + 50,
      graphlib: graphlib
    })
    const ele = graphRef.current.getElements()
    const eleMap = _.reduce(
      ele,
      (r, v) => {
        r[v.id] = _.get(v, 'attributes.position')
        return r
      },
      {}
    )
    onChange(
      immutateUpdate(value, 'graph', p => {
        return p.map(p => ({ ...p, pos: [_.get(eleMap, [p.id, 'x'], 0), _.get(eleMap, [p.id, 'y'], 0)] }))
      })
    )
  }

  const graph = _.get(props, 'value.graph', [])
  return (
    <div className='task-v3-flow-edit'>
      <div className='content-menu' style={{ display: contentMenuConfig.display ? 'block' : 'none', top: contentMenuConfig.top, left: contentMenuConfig.left }}>
        {
          // 等待节点 和非工作流节点 可以编辑
          _.some(graph, p => p.id === contentMenuConfig.id && canEditNodeType.includes(p.type)) ? (
            <>
              <div className='content-menu-item' onClick={() => handleEditNodeInfo(contentMenuConfig.id)}>
                <FormOutlined className='mg1r' />
                编辑组件
              </div>
              <div className='content-menu-item' onClick={() => handleCopyNode(contentMenuConfig.id)}>
                <CopyOutlined className='mg1r' />
                复制组件
              </div>
            </>
          ) : null
        }
        <div
          className='content-menu-item'
          onClick={() => {
            const newInfo = immutateUpdate(value, 'graph', arr => {
              return arr
                .filter(p => p.id !== contentMenuConfig.id)
                .map(p => {
                  return { ...p, inputs: _.pull(p.inputs, contentMenuConfig.id), outputs: _.pull(p.inputs, contentMenuConfig.id) }
                })
            })
            onChange(newInfo, value)
            setContentMenuConfig({ display: false, left: 0, top: 0, id: '' })
          }}
        >
          <DeleteOutlined className='mg1r' />
          删除
        </div>
      </div>
      <div
        className='height-100 bg-grey-f7 always-display-scrollbar'
        style={{
          overflowX: 'hidden',
          overflowY: 'scroll',
          cursor: disabled ? 'not-allowed' : undefined
        }}
        onDragOver={ev => ev.preventDefault()}
        onDrop={ev => {
          if (disabled) {
            return
          }
          ev.preventDefault()
          ev.stopPropagation()
          let payload = ev.dataTransfer.getData('text')
          if (!_.startsWith(payload, 'computationNode-')) {
            return
          }
          let domRect = ev.target.getBoundingClientRect()
          let x = ev.clientX - domRect.left,
            y = ev.clientY - domRect.top
          let [tx, ty] = (value && value.transform) || [0, 0]
          const nodeType = payload.split('computationNode-')[1]
          onAddNodeJob && onAddNodeJob(nodeType, [x - cellWidth / 2 - tx, y - 30 / 2 - ty])
        }}
      >
        <div
          style={{
            height: '100%',
            pointerEvents: disabled ? 'none' : undefined
          }}
          ref={chartDomRef}
        />
      </div>
      {disabled ? null : (
        <div className='absolute top0 pd1' style={{ right: '18px' }}>
          <Tooltip title='自动排版1'>
            <AppstoreOutlined className='mg1r pd1 font18 border' onClick={() => autoLayout(1)} />
          </Tooltip>
          <Tooltip title='自动排版2'>
            <AppstoreOutlined className='mg1r pd1 font18 border' onClick={() => autoLayout(2)} />
          </Tooltip>
          <Input
            addonBefore={
              <PlusOutlined
                className='pointer'
                onClick={() => {
                  onChange(immutateUpdate(value, 'scale', prev => Math.min((prev || 1) + 0.1, 2)))
                }}
                title='放大'
              />
            }
            addonAfter={
              <MinusOutlined
                className='pointer'
                onClick={() => {
                  onChange(immutateUpdate(value, 'scale', prev => Math.max((prev || 1) - 0.1, 0.5)))
                }}
                title='缩小'
              />
            }
            value={percentFormat(_.get(value, 'scale') || 1)}
            readOnly
            style={{
              width: '130px',
              display: 'inline-block',
              verticalAlign: 'top',
              marginRight: '5px'
            }}
          />
        </div>
      )}
      {/* <EditJobShowNameModal hideModal={() => setVisibleEditModel(false)} visible={visibleEditModel} /> */}
    </div>
  )
}

FlowDesignPanel.propTypes = {
  onAddNodeJob: PropTypes.func,
  disabled: PropTypes.bool,
  value: PropTypes.any,
  onChange: PropTypes.func,
  onSelect: PropTypes.func,
  selectedKey: PropTypes.string,
  spWidth: PropTypes.number,
  spHeight: PropTypes.number,
  onDbClick: PropTypes.func
}
