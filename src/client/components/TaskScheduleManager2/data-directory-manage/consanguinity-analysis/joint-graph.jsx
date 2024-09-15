import React from 'react'
import * as joint from 'jointjs'
import _ from 'lodash'
import {immutateUpdate, immutateUpdates, isDiffByPath, isDiffBySomePath} from '../../../../../common/sugo-utils'
import { AppstoreOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Input, Button, Tooltip } from 'antd';
import dagre from 'dagre'
import graphlib from 'graphlib'
import {format } from 'd3'

const percentFormat = format('.0%')

const HighLight = '#f3ba0d'
const fieldColor = '#0274db'
const tableColor = '#5A9BD5'
const etlColor = '#1c991a'
const HighLightSearch = 'rgba(90, 155, 213, 0.5)'
const PolygonWidth = 20
const PolygonHeight = 20

const [ tableWidth, tableHeight]  = [200, 150]

function genTableCell(tableInfo, selFieldId, highLightSearch, isShowFields, visible) {
  let x = _.get(tableInfo, 'position.x', 0)
  let y = _.get(tableInfo, 'position.y', 0)
  const attrs = {
    id: tableInfo.id,
    size: {width: tableWidth, height: 30 + Math.max(30, (isShowFields? tableInfo.fields.length + tableInfo.attrs.length: tableInfo.attrs.length) * 30)},
    position: {x, y},
    embeds: ([...tableInfo.fields, ...tableInfo.attrs] || []).map(f => `${tableInfo.id}/${f.field || f.value || ''}/${f.orig || ''}`),
    attrs: {
      root: { title: tableInfo.name, visibility: `${visible? 'visible': 'hidden'}`  },
      body: {stroke: 'transparent', visibility: `${visible? 'visible': 'hidden'}` },
      header: { fill: '#5A9BD5', stroke: 'transparent' },
      headerText: {
        text: tableInfo.name,
        fill: 'white',
        fontWeight: 'normal',
        fontSize: 12
      },
      bodyText: { text: '', fontSize: 12,  fill: '#5A9BD5', stroke: 'transparent'}
    }
  }
  let tableRect = new joint.shapes.standard.HeaderedRectangle(attrs)
  const attrCellList = (tableInfo.attrs || []).map((attr, i) => {
    return genTableAttr(tableInfo.id, attr, x, y + i * 30 + 30, !i, isShowFields, visible)
  })
  const fieldCellList = isShowFields? tableInfo.fields.map((field, i) => {
    const len = i + tableInfo.attrs.length
    return genTableField(tableInfo.id, field, x, y + len * 30 + 30, !len, selFieldId, highLightSearch, isShowFields, visible)
  }) : []

  return [
    tableRect,
    ...attrCellList,
    ...fieldCellList
  ]
}

const FieldCell = joint.shapes.devs.Model.define('FieldCell', { }, {
  markup: '<g class="rotatable"><rect class="body"/><path class="line"/><text class="label"/></g>'
})

const AttrCell = joint.shapes.devs.Model.define('AttrCell', { })


function genTableField(pid, field, x, y, isFirst, selFieldId, highLightSearch, isShowFields, visible) {
  let {field: fieldName = '', type = '', orig = '' } = field
  const fieldId = `${pid}/${fieldName}/${orig}`
  console.log('fieldId--', fieldId)
  let cellProps = {
    id: fieldId,
    parent: pid,
    position: {x, y},
    size: { width: tableWidth, height: 30 },
    inPorts: ['in'],
    outPorts: ['out'],
    ports: {
      groups: {
        'in': { 
          attrs: {
            '.port-body': { stroke: '#5A9BD5', 'stroke-dasharray': '2', pointerEvents: 'none', visibility: `${visible? 'visible': 'hidden'}`, r: 6},
            '.port-label': {fill: 'transparent'}
          }
        },
        'out': {
          attrs: {
            '.port-body': { stroke: '#5A9BD5', 'stroke-dasharray': '2', pointerEvents: 'none', visibility: `${visible? 'visible': 'hidden'}`, r: 6 },
            '.port-label': {fill: 'transparent'}
          }
        }
      }
    },
    attrs: {
      '.label': {
        text: `${fieldName}   ${type}`,
        fontSize: 12, fill: fieldColor,
        pointerEvents: 'none',
        visibility: `${visible? 'visible': 'hidden'}` 
      },
      '.body': {
        fill: `${selFieldId === orig ? HighLight : (highLightSearch !== '' && fieldName.includes(highLightSearch) ? HighLightSearch : '#f2f2f2')}`,
        stroke: 'transparent',
        event: 'element:fieldCell:pointerdown',
        visibility: `${visible? 'visible': 'hidden'}` 
      },
      '.line': {
        visibility: `${visible? 'visible': 'hidden'}` ,
        'stroke-dasharray': '5',
        'stroke-width': '1',
        'stroke': isFirst ? 'transparent':  '#5A9BD5',
        'd': `M 0 1 L ${tableWidth} 1`
      }
    }
  }

  let fieldCell = new FieldCell(cellProps)
  return fieldCell
}

function genTableAttr(pid, attr, x, y, isFirst, isShowFields, visible ) {
  let {label = '', value = ''} = attr
  const attrId = `${pid}/${value}/`
  // console.log('attrId--', attrId)
  const inOut = {
    inPorts: ['in'],
    outPorts: ['out'],
    ports: {
      visibility: `${visible? 'visible': 'hidden'}`,
      groups: {
        'in': {
          attrs: {
            '.port-body': { stroke: 'transparent',fill: 'transparent', refX: 0, refY: 0, pointerEvents: 'none' },
            '.port-label': {fill: 'transparent'}
          }
        },
        'out': {
          attrs: {
            '.port-body': { stroke: 'transparent',fill: 'transparent', pointerEvents: 'none'},
            '.port-label': {fill: 'transparent'}
          }
        }
      }
    }
  }

  let cellProps = { 
    id: attrId,
    parent: pid,
    position: {x, y},
    size: { width: tableWidth, height: 30 },
    draggable: false,
    attrs: {
      '.label': { text: `${label}: ${value}`, fontSize: 12, fill: '#5A9BD5', pointerEvents: 'none',visibility: `${visible? 'visible': 'hidden'}` /*'ref-x': .5, 'ref-y': .2*/ },
      '.body': {
        fill: '#f2f2f2',
        stroke: 'transparent',
        event: 'element:fieldCell:pointerdown',
        visibility: `${visible? 'visible': 'hidden'}`
      },
      '.line': {
        // 'stroke-dasharray': '5',
        // 'stroke-width': '1',
        // 'stroke': isFirst ? 'transparent':  '#5A9BD5',
        'd': `M 0 1 L ${tableWidth} 1`,
        visibility: `${visible? 'visible': 'hidden'}`
      } 
    },
    ...inOut
  }

  let attrCell = new AttrCell(cellProps)
  return attrCell
}


let TableLink = joint.dia.Link.define('TableLink', {},
  {
    markup: [
      {
        tagName: 'path',
        selector: 'line',
        attributes: {
          'fill': 'none',
          'pointer-events': 'none'
        }
      }
    ]
  }
)

function genLinkCell(linkInfo, tables, selFieldId, isShowFields ) {
  let {source, target, type} = linkInfo
  let [sTableId, sField, sOrig] = source.split('/')
  let [tTableId, tField, tOrig] = target.split('/')
  let sTable = _.find(tables, t => t.id === sTableId)
  let tTable = _.find(tables, t => t.id === tTableId)
  if(!sTable || !tTable ) return 
  const sId = `${sTable.id}/${sField}/${sOrig || ''}`
  const tId = `${tTable.id}/${tField}/${tOrig || ''}`
  console.log('linkId---', sId, tId)
  let link  = new TableLink({
    id: `${sId}-${tId}`,
    source: {
      id: linkInfo.source,
      port: 'out'
    },
    target: {
      id: linkInfo.target,
      port: 'in'
    },
    attrs: {
      line: {
        connection: true,
        stroke: `${(sOrig === 'APP_NUM' || tOrig === 'APP_NUM') ? HighLight : (isShowFields? fieldColor : tableColor)}`,
        strokeWidth: 2,
        strokeLinejoin: 'round',
        targetMarker: {
          'type': 'path',
          'd': 'M 10 -5 0 0 10 5 z'
        }
      }
    },
    labels: [{
      markup: [{
        tagName: 'rect',
        selector: 'labelBody'
      }],
      attrs: (type === 'none') ? null : {
        labelBody: {
          cursor: 'pointer',
          ref: 'labelBody',
          refX: -8,
          refY: -8,
          refWidth: 16,
          refHeight: 16,
          stroke: '#5A9BD5',
          fill: `${type === 'deal' ? etlColor : 'white'}`,
          strokeWidth: 2,
          event: 'element:linkCell:pointerdown'
        }
      },
      position: 0.5
    }]
  })
 
  link.connector('smooth')
  return link
}

// @withSizeProvider
export default class JointGraph extends React.Component {
  componentDidMount() {
    let {disabled} = this.props
    let transform = _.get(this.props, 'value.transform') || {}
    let scale = _.get(this.props, 'value.scale')
    let graph = this.genGraph()
    let paper = new joint.dia.Paper({
      el: this.chartDom,
      model: graph,
      width: '100%',
      height: '100%',
      // gridSize: 1,
      // drawGrid: true,
      background: {
        color: '#fff'
      },
      interactive: !disabled,
      gridSize: 10,
      drawGrid: true
    })
    let smallPaper = new joint.dia.Paper({
      el: this.smallChartDom,
      model: graph,
      width: '15%',
      height: '15%',
      background: {color: '#ddd'}
      // interactive: 
    })
    paper.translate(transform.x || 0, transform.y || 0)
    paper.scale(scale || 1)
    smallPaper.translate(transform.x*0.15 || 0, transform.y*0.15 || 0)
    smallPaper.scale(scale*0.15 || 0.15)
    this.graph = graph
    this.paper = paper
    this.smallPaper = smallPaper
    this.bindEvents()
  }

  
  componentDidUpdate(prevProps, prevState) {
    if (isDiffBySomePath(this.props, prevProps, 'value', 'selectedKey', 'isShowFields', 'highLightSearch')) {
      let transform = _.get(this.props, 'value.transform') || {}
      let scale = _.get(this.props, 'value.scale')
      this.genGraph()
      
      this.paper.translate(transform.x || 0, transform.y || 0)
      this.paper.scale(scale || 1)
      this.smallPaper.translate(transform.x*0.15 || 0, transform.y*0.15 || 0)
      this.smallPaper.scale(scale*0.15 || 1*0.15)
    }
    if (isDiffByPath(this.props, prevProps, 'disabled')) {
      this.paper.setInteractivity(!this.props.disabled)
    }
  }

  graph = null
  paper = null
  smallPaper = null
  smallChartDom = null
  dragCanvasAt = []
  chartDom = null
  isMoving = false
  fieldPosiBeforeMove = ''
  
  bindEvents = () => {
    this.paper
      .on('element:linkCell:pointerdown', this.onLinkCellClick)
      .on('element:fieldCell:pointerdown', this.onFieldCellClick)
      .on('blank:pointerdown', (ev, x, y) => {
        // x, y 为绝对位置
        this.dragCanvasAt = [x, y]
      })
      .on('blank:pointermove', (ev, x, y) => {
        if (this.dragCanvasAt) {
          // x, y 为绝对位置
          let [sx, sy] = this.dragCanvasAt
          let translate = this.paper.translate()
          const deltaX = x - sx
          const deltaY = y - sy
          this.paper.translate(translate.tx + deltaX, translate.ty + deltaY)
        }
      })
      .on('blank:pointerup', () => {
        let { onChange, value} = this.props
        if (this.dragCanvasAt) {
          let translate = this.paper.translate()
          onChange(immutateUpdate(value, 'transform', () => ({x: translate.tx, y: translate.ty})))
          delete this.dragCanvasAt
        }
      })
  }
  
  genGraph = (props = this.props) => {
    const isShowFields = _.get(props, 'isShowFields', false)
    let tables = _.get(props, 'value.tables') || []
    let joinLinks = _.get(props, `value.joinLinks.${props.isShowFields? 'field': 'table'}`) || []
    let selectedFields = _.get(props, 'selectedFields') || []
    const selFieldId = _.get(props, 'selFieldId', '')
    const highLightSearch = _.get(props, 'highLightSearch', '')
    const linkList = joinLinks.map((jl )=> genLinkCell(jl, tables, selFieldId, isShowFields))
    const cellList = _.flatMap(tables,t => genTableCell(t, selFieldId, highLightSearch, isShowFields, !(t.id === 'standard' && !isShowFields) ))
    let cells = [
      ...cellList,
      ...linkList
    ]
    // console.log(res)
    let graph = this.graph || new joint.dia.Graph()
    graph.fromJSON({cells})
    return graph
  }

  onFieldCellClick = (e, evt ) => {
    evt.stopPropagation() // stop any further actions with the element view (e.g. dragging)
    const {value, changeAttrPanel } = this.props
    const {attributes: {type, position}, id} = e.model
    this.fieldPosiBeforeMove = position
    const [tableId, field] = id.split('/')
    const table = value.tables.find((o )=> o.id === tableId)
    let info = []
    if(type === 'AttrCell') {
      info = table.info || []
    } else {
      info = _.get((_.get(table, 'fields', []).find((o )=> o.field === field) || {}), 'info', [])
    }
    changeAttrPanel(info)
  }

  onLinkCellClick = (e, evt) => {
    evt.stopPropagation()
    const {value, changeAttrPanel } = this.props
    const [source, target ] = e.options.model.id.split('-')
    const info = (value.joinLinks.field.find((o) => o.source === source && o.target === target) || {}).info || []
    changeAttrPanel(info)
  }

  
  zoomIn = () => {
    let {value, onChange} = this.props
    onChange(immutateUpdate(value, 'scale', prev => Math.min((prev || 1) + 0.1, 2)))
  }
  
  zoomOut = () => {
    let {value, onChange} = this.props
    onChange(immutateUpdate(value, 'scale', prev => Math.max((prev || 1) - 0.1, 0.5)))
  }
  
  autoFit = () => {
    let {value, onChange, spWidth, spHeight} = this.props
    // 水平缩放，垂直方向显示滚动条
    let {width: contentWidth} = this.paper.getContentArea()
    let viewportUsage = contentWidth / (spWidth - 60 * 2)
    let sx = 1 < viewportUsage ? 1/viewportUsage : 1
    let sxInRange = _.clamp(sx, 0.5, 2)
    this.paper.scale(sxInRange)
  
    this.paper.fitToContent({
      padding: 60,
      allowNewOrigin: 'any',
      minWidth: this.chartDom.clientWidth,
      maxWidth: this.chartDom.clientWidth + 1,
      minHeight: spHeight
    })
    let currTranslate = this.paper.translate()
    
    const next = immutateUpdates(value,
      'transform', (prev) => ({...prev, x: currTranslate.tx, y: currTranslate.ty}),
      'scale', () => sxInRange)
    onChange(next)
  }

  autoLayout = () => {
    // const [marginX, marginY] = _.get(value, 'transform', [0, 0])
    let {value, onChange} = this.props
    joint.layout.DirectedGraph.layout(this.graph, {
      nodeSep: 50,
      edgeSep: 50,
      rankDir: 'TB',
      dagre: dagre,
      marginX: 50,
      marginY: 50,
      graphlib: graphlib
    })
    const ele = this.graph.getElements()
    const eleMap = _.reduce(ele, (r, v) => {
      r[v.id] = _.get(v, 'attributes.position')
      return r
    }, {})
    onChange(immutateUpdate(value, 'graph', p => {
      return p.map(p => ({ ...p, pos: [_.get(eleMap, [p.id, 'x'], 0), _.get(eleMap, [p.id, 'y'], 0)] }))
    }))
  }
  
  render() {
    let {disabled } = this.props
    let scale = _.get(this.props, 'value.scale') || 1
    return (
      <React.Fragment>
        <div
          className="height-100"
          style={{
            overflowX: 'hidden',
            overflowY: 'scroll',
            cursor: disabled ? 'not-allowed' : undefined
          }}
        >
          <div
            style={{
              height: '100%',
              pointerEvents: disabled ? 'none' : undefined,
              position: 'relative'
            }}
            ref={ref => this.chartDom = ref}
          />
          <div style={{position: 'absolute', bottom: '50px', right: '20px'}} ref={ref => this.smallChartDom = ref} />
        </div>
        {disabled ? null : (
          <div className="absolute top0 pd1" style={{right: '18px'}}>
            {/* <Tooltip title="自动排版1">
              <Icon type="appstore-o" className="mg1r pd1 font18 border" onClick={() => this.autoLayout()} />
            </Tooltip> */}
            <Input
              size="small"
              addonBefore={(
                <PlusOutlined className="pointer" onClick={this.zoomIn} title="放大" />
              )}
              addonAfter={(
                <MinusOutlined className="pointer" onClick={this.zoomOut} title="缩小" />
              )}
              value={percentFormat(scale)}
              readOnly
              style={{
                width: '120px',
                display: 'inline-block',
                verticalAlign: 'top',
                marginRight: '5px'
              }}
            />
            <Button
              size="small"
              icon={<AppstoreOutlined />}
              onClick={this.autoFit}
              title="自动适配"
            />
          </div>
        )}
      </React.Fragment>
    );
  }
}
