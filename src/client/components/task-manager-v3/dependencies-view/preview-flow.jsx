import React, { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import 'jointjs/dist/joint.css'
import * as joint from 'jointjs'
import dagre from 'dagre'
import graphlib from 'graphlib'
import { Input } from 'antd'
import { DeleteOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'

import '../task-edit/iconfont'
import { FLOW_INCON_MAP } from '../constants.js'
import { immutateUpdate } from '../../../../common/sugo-utils'

const percentFormat = v => _.round(v * 100) + '%'
const cellWidth = 160

/**
 * 根据文本内容获取字字符串字节长度
 * @param {*} str
 */
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
 *  获取cell渲染的内容 （图标及文字信息）
 * @param {*} type 节点类型
 * @param {*} title 文本内容
 * @param {*} cellHeight cell高度
 * @param {*} selected 选中状态
 */
const getCellContent = function (type, title, cellHeight, selected) {
  // 节点图标
  const icon = FLOW_INCON_MAP[type] || FLOW_INCON_MAP['task']
  // 更具文本内容获计算cell高度
  const align = cellHeight === 20 ? 'center' : 'left'
  if (selected) {
    return [
      '<g >',
      '<rect class="body select-cell"  rx="7" ry="7"></rect>',
      `<foreignObject x="45" y="5" width="90" height="${cellHeight}">`,
      `<p xmlns="http://www.w3.org/1999/xhtml" style="word-break:break-all;text-align:${align}">${title}</p>`,
      '</foreignObject>',
      `<use x="15" y="${(10 + cellHeight) / 2 - 10}" width="20" height="20" fill="#999" xlink:href="#${icon}"></use>`,
      '<rect class="body cell-mask"  rx="7" ry="7" ></rect>',
      '</g>'
    ].join('')
  }
  return [
    '<g >',
    '<rect class="body"  rx="7" ry="7"></rect>',
    `<foreignObject x="45" y="5" width="90" height="${cellHeight}">`,
    `<p xmlns="http://www.w3.org/1999/xhtml" style="word-break:break-all;text-align:${align}">${title}</p>`,
    '</foreignObject>',
    `<use x="15" y="${(10 + cellHeight) / 2 - 10}" width="20" height="20" fill="#999" xlink:href="#${icon}"></use>`,
    '<rect class="body cell-mask"  rx="7" ry="7"></rect>',
    '</g>'
  ].join('')
}

/**
 * 获取cell节点
 * @param {*} node 节点信息
 * @param {*} selected 是否选中
 */
function genCell(node, selected) {
  if (!node) {
    return null
  }

  const { id, type, pos, title } = node

  // 更具文本内容获计算cell高度
  const length = GetCharLength(title)
  const cellHeight = Math.ceil(length / 14) * 20
  // 获取cell显示的内容
  const markup = getCellContent(type, title, cellHeight, selected)
  const typeName = _.truncate(title || _.get('NodeEnumDict', [type, 'title'], ''), { length: 10 })

  const [x, y] = pos
  // 预定义的输入和输出端口组和简化API的现成形状
  const element = new joint.shapes.devs.Model({
    id: id,
    position: { x, y },
    size: {
      width: cellWidth,
      height: 10 + cellHeight
    },
    markup,
    inPorts: ['in'],
    outPorts: type === 'end' ? [] : ['out'],
    ports: {
      groups: {
        in: {
          position: {
            name: 'ellipseSpread',
            args: {
              startAngle: 270,
              step: 90,
              compensateRotation: false
            }
          },
          attrs: {
            '.port-body': {
              stroke: '#5A9BD5',
              'stroke-dasharray': '2',
              r: '2'
            },
            '.port-label': { fill: 'transparent' }
          }
        },
        out: {
          position: {
            name: 'ellipseSpread',
            args: {
              startAngle: 90,
              step: 90,
              compensateRotation: false
            }
          },
          attrs: {
            '.port-body': {
              stroke: '#5A9BD5',
              'stroke-dasharray': '2',
              r: '2'
            },
            '.port-label': { fill: 'transparent' }
          }
        }
      }
    },
    attrs: {
      '.label': {
        text: typeName,
        fontSize: 14,
        pointerEvents: 'none',
        fill: '#5A9BD5'
      },
      '.body': { fill: '#fff', stroke: selected ? '#5A9BD5' : '#CED6DA', rx: 7, ry: 7 },
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

/**
 * 生成连线节点信息
 * @param {*} linkInfo 连线节点
 */
function genLinkCell(linkInfo) {
  const { source, target, sourcePort, targetPort } = linkInfo
  const link = new joint.shapes.devs.Link({
    id: `${source}-${target}`,
    source: { id: source, port: sourcePort || 'out' },
    target: { id: target, port: targetPort || 'in' },
    attrs: {
      line: { stroke: '#CED6DA' },
      '.connection': {
        stroke: '#CED6DA',
        fill: 'none',
        'stroke-linejoin': 'round',
        'stroke-width': '2',
        targetMarker: { d: 'M 5 -5 L -5 0 L 5 5 Z' },
        sourceMarker: { d: 'M 0 -1 L -5 0 L 0 1 Z' }
      }
    }
  })
  return link
}

// 生成graph
function genCellAndLink(value, selectedKey) {
  const objs = _.get(value, 'graph') || []
  const links = _.flatMap(objs, r =>
    _.map(r.inputs, sourceNodeId => {
      const [sourcePort, targetPort] = _.get(r.ports, [sourceNodeId], ['', ''])
      return { source: sourceNodeId, sourcePort, target: r.id, targetPort }
    })
  )

  const cells = [..._.map(objs, t => genCell(t, selectedKey === t.id)), ...links.map(genLinkCell)]
  return cells
}

/**
 * 生成画布信息
 * @param {*} value 画布数据
 * @param {*} selectedKey 当前选中的组件
 * @param {*} chartDom
 * @param {*} disabled 禁用流程图编辑
 */
function generatePaper(value, selectedKey, chartDom, disabled) {
  // 初始化画布，并且定义参数
  const scale = _.get(value, 'scale', 1)
  const transform = _.get(value, 'transform') || [0, 0]

  let graph = new joint.dia.Graph()
  const cells = genCellAndLink(value, selectedKey)
  graph.fromJSON({ cells })

  const paper = new joint.dia.Paper({
    el: chartDom,
    model: graph,
    width: '100%',
    height: '100%',
    background: { color: '#fff' },
    restrictTranslate: true,
    interactive: !disabled,
    gridSize: 10,
    drawGrid: true
  })

  paper.translate(transform[0], transform[1])
  paper.scale(scale)

  return { graph, paper }
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
  onDbClick: PropTypes.func,
  isPreview: PropTypes.bool
}

export default function FlowDesignPanel(props) {
  const chartDomRef = useRef()
  const paperRef = useRef()
  const graphRef = useRef()

  const [contentMenuConfig, setContentMenuConfig] = useState({ display: false, top: 0, left: 0 })

  const { onAddNodeJob, disabled, value, onChange, onSelect, selectedKey, spWidth, spHeight, onDbClick } = props

  const transform = _.get(value, 'transform') || [0, 0]
  let timer = null
  useEffect(() => {
    const { paper, graph } = generatePaper(value, selectedKey, chartDomRef.current, disabled)
    if (!graph || !paper) {
      return
    }
    paper.on('element:pointerclick', handleClick).on('element:pointerdblclick', handleDoubleClick)
    // .on('blank:pointerdown', onBlankPointerDown)
    // .on('blank:pointermove', onBlankPointerMove)
    // .on('blank:pointerup', onBlankPointerUp)
    paper.setInteractivity(false)
    graphRef.current = graph
    paperRef.current = paper
    return () => {
      paper.off('element:pointerclick', handleClick).off('element:pointerdblclick', handleDoubleClick)
      // .off('blank:pointerdown', onBlankPointerDown)
      // .off('blank:pointermove', onBlankPointerMove)
      // .off('blank:pointerup', onBlankPointerUp)
    }
  }, [])

  // 设置画布的初始化大小
  useEffect(() => {
    paperRef.current && paperRef.current.setDimensions(spWidth, spHeight)
  }, [spHeight, spWidth])

  useEffect(() => {
    if (!paperRef.current || !value?.graph?.length) {
      return
    }
    let scale = _.get(props, 'value.scale', 1)
    let graph = graphRef.current || new joint.dia.Graph()

    let cells = genCellAndLink(value, selectedKey)
    graph.fromJSON({ cells })

    const [marginX, marginY] = _.get(value, 'transform', [0, 0])
    joint.layout.DirectedGraph.layout(graphRef.current, {
      nodeSep: 50,
      edgeSep: 50,
      rankDir: 'LR',
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

    const newValue = immutateUpdate(value, 'graph', p => {
      return p.map(g => ({ ...g, pos: [_.get(eleMap, [g.id, 'x'], 0), _.get(eleMap, [g.id, 'y'], 0)] }))
    })

    cells = genCellAndLink(newValue, selectedKey)
    graph.fromJSON({ cells })

    paperRef.current.translate(transform[0], transform[1])
    paperRef.current.scale(scale)
  }, [value, selectedKey])

  useEffect(() => {
    if (!paperRef.current) {
      return
    }
    paperRef.current.setInteractivity(!disabled)
  }, [disabled])

  let isDbClick = false
  /**
   * cell双击打开节点编辑界面
   * @param {*} cellView
   */
  function handleDoubleClick(cellView) {
    isDbClick = true
    if (onDbClick) {
      onDbClick(cellView.model.id, cellView.model.type)
    }
  }

  // 鼠标单击事件
  const handleClick = cellView => {
    isDbClick = false
    timer = setTimeout(() => {
      if (!isDbClick) {
        onSelect(cellView.model.id)
      }
    }, 200)
  }

  const deleteCellHandler = () => {
    const newInfo = immutateUpdate(value, 'graph', arr => {
      return arr
        .filter(p => p.id !== contentMenuConfig.id)
        .map(p => {
          return { ...p, inputs: _.pull(p.inputs, contentMenuConfig.id), outputs: _.pull(p.inputs, contentMenuConfig.id) }
        })
    })
    onChange(newInfo, value)
    setContentMenuConfig({ display: false, left: 0, top: 0, id: '' })
  }

  const dropNodeInpaper = ev => {
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
  }

  return (
    <div className='task-v3-flow-edit height-100'>
      <div className='content-menu' style={{ display: contentMenuConfig.display ? 'block' : 'none', top: contentMenuConfig.top, left: contentMenuConfig.left }}>
        <div className='content-menu-item' onClick={deleteCellHandler}>
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
        onDrop={dropNodeInpaper}
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
          {/* <Tooltip title='自动排版1'>
              <AppstoreOutlined className='mg1r pd1 font18 border' onClick={() => autoLayout(1)} />
            </Tooltip>
            <Tooltip title='自动排版2'>
              <AppstoreOutlined className='mg1r pd1 font18 border' onClick={() => autoLayout(2)} />
            </Tooltip> */}
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
    </div>
  )
}
