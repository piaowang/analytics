import React from 'react'
import * as joint from 'jointjs'
import 'jointjs/dist/joint.css'
import _ from 'lodash'
import {immutateUpdate, immutateUpdates, isDiffByPath, isDiffBySomePath} from '../../../common/sugo-utils'
import {OfflineCalcModelJoinTypeEnum} from '../../../common/constants'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Modal, Select, message } from 'antd';
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {Button2} from '../Common/sugo-icon'
import {format} from 'd3'
import {withSizeProvider} from '../Common/size-provider'
import {guessDruidStrTypeByDbDataType} from '../../../common/offline-calc-model-helper'

const {Option} = Select
const percentFormat = format('.0%')

const diagramDataDemo = {
  transform: {x: 0, y: 0},
  scale: 1,
  tables: [
    {
      id: 'ordersTableId',
      name: 'orders',
      position: {x: 0, y: 0},
      fields: [
        {field: 'id', type: 'string'},
        {field: 'customer_id', type: 'string'},
        {field: 'product_id', type: 'string'},
        {field: 'amount', type: 'number'}
      ]
    },
    {
      id: 'usersTableId',
      name: 'users',
      fields: [
        {field: 'id', type: 'string'},
        {field: 'name', type: 'string'}
      ]
    },
    {
      id: 'productsTableId',
      name: 'products',
      fields: [
        {field: 'id', type: 'string'},
        {field: 'name', type: 'string'}
      ]
    }
  ],
  joinLinks: [
    {
      source: 'ordersTableId/customer_id',
      target: 'usersTableId/id',
      type: 'innerJoin'
    },
    {
      source: 'ordersTableId/product_id',
      target: 'productsTableId/id',
      type: 'innerJoin'
    }
  ]
}
let tempHeaderRect = new joint.shapes.standard.HeaderedRectangle()
const TableRect = joint.shapes.standard.HeaderedRectangle.define('TableRect', {
  attrs: {
    ...tempHeaderRect.attr(),
    removeBtn: {
      cursor: 'pointer',
      refX: '100%',
      refY: 0,
      
      event: 'element:removeBtn:pointerdown',
      fill: 'red',
      strokeWidth: 0,
      r: 11
    },
    removeBtnLabel: {
      pointerEvents: 'none',
      ref: 'removeBtn',
      refX: -2,
      refY: -2,
  
      fill: 'white',
      transform: 'scale(.8)'
    }
  }
}, {
  markup: [...tempHeaderRect.markup, {
    tagName: 'circle',
    selector: 'removeBtn'
  }, {
    tagName: 'path',
    selector: 'removeBtnLabel',
    attributes: {
      d: 'M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z'
    }
  }]
})

const [ tableWidth, tableHeight]  = [200, 150]

function genTableCell(tableInfo, selectedCellId, selectedFieldsSet) {
  let x = _.get(tableInfo, 'position.x', 0)
  let y = _.get(tableInfo, 'position.y', 0)
  const attrs = {
    id: tableInfo.id,
    size: {width: tableWidth, height: 30 + Math.max(30, _.size(tableInfo.fields) * 30)},
    position: {x, y},
    embeds: (tableInfo.fields || []).map(f => `${tableInfo.id}/${f.field}`),
    attrs: {
      root: { title: tableInfo.name },
      body: {stroke: 'transparent'},
      header: { fill: '#5A9BD5', stroke: 'transparent' },
      headerText: {
        text: tableInfo.title || tableInfo.name,
        fill: 'white',
        fontWeight: 'normal',
        fontSize: 12
      },
      bodyText: { text: _.isEmpty(tableInfo.fields) ? '(未添加维度)' : '', fontSize: 12,  fill: '#5A9BD5', stroke: 'transparent'}
    }
  }
  let tableRect = selectedCellId === tableInfo.id
    ? new TableRect(attrs)
    : new joint.shapes.standard.HeaderedRectangle(attrs)
  return [
    tableRect,
    ...tableInfo.fields.map((field, i) => {
      return genTableField(tableInfo.id, field, x, y + i * 30 + 30, !i, selectedFieldsSet)
    })
  ]
}

const checkedSvg = '<svg t="1561866146062" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1101" width="20" height="20"><path d="M897.940444 896.76927c6.258541-6.27696 10.256598-14.833847 10.256598-24.530696L908.197042 147.672294c0-9.118682-3.998057-18.235316-10.256598-24.533766l0 0c-6.27696-6.257517-14.815427-9.695826-24.511253-9.695826l0 0-723.784474 0 0 0c-9.68764 0-18.235316 3.437286-24.503067 9.695826l0 0c-6.26775 6.297426-9.686616 15.414061-9.686616 24.533766L115.455033 872.238574c0 9.69685 3.419889 18.253736 9.686616 24.530696 6.26775 6.277984 14.815427 10.276041 24.503067 10.276041l0 0 723.784474 0 0 0C883.126041 907.045311 891.663484 903.047254 897.940444 896.76927L897.940444 896.76927zM149.644717 61.521169l723.784474 0 0 0c23.933085 0 45.586245 9.69685 60.97984 25.110911 15.396665 15.97381 25.073048 37.665855 25.073048 61.039191L959.482079 872.238574c0 23.969924-9.676383 45.64355-25.073048 61.056588l0 0c-15.393595 15.395642-37.046754 25.092491-60.97984 25.092491l0 0-723.784474 0 0 0c-23.364127 0-45.016263-9.69685-60.971653-25.092491l0 0c-15.395642-15.414061-25.082258-37.086663-25.082258-61.056588L63.590805 147.672294c0-23.37436 9.686616-45.065382 25.082258-61.039191l0 0C104.628454 71.218018 126.28059 61.521169 149.644717 61.521169L149.644717 61.521169z" p-id="1102" fill="#2c2c2c"></path><path d="M417.41939 698.269357c-6.025227 0-12.047384-2.301416-16.667611-6.89913L259.500731 550.119179c-9.172917-9.148357-9.172917-24.093744 0-33.290197 9.169847-9.147334 24.115234-9.147334 33.288151 0l124.583436 124.606972 312.89429-312.916802c9.194406-9.171893 24.139793-9.171893 33.288151 0 9.196453 9.171893 9.196453 24.116257 0 33.289174L433.991834 691.370227c-4.618181 4.644787-10.642384 6.89913-16.665565 6.89913L417.41939 698.269357z" p-id="1103" fill="#2c2c2c"></path></svg>'
const uncheckedSvg = '<svg t="1561866146062" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1101" width="20" height="20"><path d="M897.940444 896.76927c6.258541-6.27696 10.256598-14.833847 10.256598-24.530696L908.197042 147.672294c0-9.118682-3.998057-18.235316-10.256598-24.533766l0 0c-6.27696-6.257517-14.815427-9.695826-24.511253-9.695826l0 0-723.784474 0 0 0c-9.68764 0-18.235316 3.437286-24.503067 9.695826l0 0c-6.26775 6.297426-9.686616 15.414061-9.686616 24.533766L115.455033 872.238574c0 9.69685 3.419889 18.253736 9.686616 24.530696 6.26775 6.277984 14.815427 10.276041 24.503067 10.276041l0 0 723.784474 0 0 0C883.126041 907.045311 891.663484 903.047254 897.940444 896.76927L897.940444 896.76927zM149.644717 61.521169l723.784474 0 0 0c23.933085 0 45.586245 9.69685 60.97984 25.110911 15.396665 15.97381 25.073048 37.665855 25.073048 61.039191L959.482079 872.238574c0 23.969924-9.676383 45.64355-25.073048 61.056588l0 0c-15.393595 15.395642-37.046754 25.092491-60.97984 25.092491l0 0-723.784474 0 0 0c-23.364127 0-45.016263-9.69685-60.971653-25.092491l0 0c-15.395642-15.414061-25.082258-37.086663-25.082258-61.056588L63.590805 147.672294c0-23.37436 9.686616-45.065382 25.082258-61.039191l0 0C104.628454 71.218018 126.28059 61.521169 149.644717 61.521169L149.644717 61.521169z" p-id="1102" fill="#2c2c2c"></path></svg>'

const FieldCellChecked = joint.shapes.devs.Model.define('FieldCellChecked', { }, {
  markup: `<g class="rotatable"><rect class="body"/><path class="line"/><text class="label"/><g transform="translate(10 5)" event="element:fieldCheckBox:pointerdown"><rect x="0" y="0" width="20" height="20" fill="#ffffff" />${checkedSvg}</g></g>`
})
const FieldCellUnchecked = joint.shapes.devs.Model.define('FieldCellUnchecked', { }, {
  markup: `<g class="rotatable"><rect class="body"/><path class="line"/><text class="label"/><g transform="translate(10 5)" event="element:fieldCheckBox:pointerdown"><rect x="0" y="0" width="20" height="20" fill="#ffffff" />${uncheckedSvg}</g></g>`
})

function genTableField(pid, field, x, y, isFirst, selectedFieldsSet) {
  let {field: fieldName} = field
  const fieldId = `${pid}/${fieldName}`
  let selected = selectedFieldsSet.has(fieldId)
  
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
            '.port-body': { stroke: '#5A9BD5', 'stroke-dasharray': '2' },
            '.port-label': {fill: 'transparent'}
          }
        },
        'out': {
          attrs: {
            '.port-body': { stroke: '#5A9BD5', 'stroke-dasharray': '2' },
            '.port-label': {fill: 'transparent'}
          }
        }
      }
    },
    attrs: {
      '.label': { text: fieldName, fontSize: 12, pointerEvents: 'none', fill: '#5A9BD5' /*'ref-x': .5, 'ref-y': .2*/ },
      '.body': {
        fill: '#f2f2f2',
        pointerEvents: 'none',
        stroke: 'transparent'
      },
      '.line': {
        'stroke-dasharray': '5',
        'stroke-width': '1',
        'stroke': isFirst ? 'transparent':  '#5A9BD5',
        'd': `M 0 1 L ${tableWidth} 1`
      }
    }
  }
  let fieldCell = selected
    ? new FieldCellChecked(cellProps)
    : new FieldCellUnchecked(cellProps)
  
  return fieldCell
}

function genLinkCell(linkInfo, tables) {
  let {source, target, type} = linkInfo
  let [sTableId, sField] = source.split('/')
  let [tTableId, tField] = target.split('/')
  let sTable = _.find(tables, t => t.id === sTableId)
  let tTable = _.find(tables, t => t.id === tTableId)
  
  const sId = `${sTable.id}/${sField}`
  const tId = `${tTable.id}/${tField}`
  let link = new joint.shapes.devs.Link({
    id: `${sId}-${tId}`,
    source: {
      id: sId,
      port: 'out'
    },
    target: {
      id: tId,
      port: 'in'
    },
    attrs: {
      '.connection': {
        stroke: '#5A9BD5'
      }
    },
    labels: [{
      markup: [{
        tagName: 'rect',
        selector: 'labelBody'
      }, {
        tagName: 'text',
        selector: 'labelText'
      }],
      attrs: {
        labelText: {
          text: OfflineCalcModelJoinTypeEnum[type],
          fill: '#5A9BD5',
          fontFamily: 'sans-serif',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 12,
          pointerEvents: 'none'
        },
        labelBody: {
          event: 'element:changeLinkType:pointerdown',
          draggable: false,
          cursor: 'pointer',
          ref: 'labelText',
          refX: -5,
          refY: -5,
          refWidth: '100%',
          refHeight: '100%',
          refWidth2: 10,
          refHeight2: 10,
          stroke: '#5A9BD5',
          fill: 'white',
          strokeWidth: 2,
          rx: 5,
          ry: 5
        }
      },
      position: 0.5
    }]
  })
  
  return link
}

@withSizeProvider
export default class JoinConfigDiagram extends React.Component {
  
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
    
    paper.translate(transform.x || 0, transform.y || 0)
    paper.scale(scale || 1)
    
    this.graph = graph
    this.paper = paper
    this.bindEvents()
  }
  
  componentDidUpdate(prevProps, prevState) {
    if (isDiffBySomePath(this.props, prevProps, 'value', 'selectedKey', 'selectedFields')) {
      let transform = _.get(this.props, 'value.transform') || {}
      let scale = _.get(this.props, 'value.scale')
      this.genGraph()
      
      this.paper.translate(transform.x || 0, transform.y || 0)
      this.paper.scale(scale || 1)
    }
    if (isDiffByPath(this.props, prevProps, 'disabled')) {
      this.paper.setInteractivity(!this.props.disabled)
    }
  }
  
  bindEvents = () => {
    this.graph
      // .on('change:position', posChangeCb)
      .on('remove', this.syncRemove)
    this.paper
      .on('element:removeBtn:pointerdown', this.onModelRemove)
      .on('element:changeLinkType:pointerdown', this.onLinkTypeChange)
      .on('element:fieldCheckBox:pointerdown', this.onFieldSelectToggle)
      .on('cell:pointerup', this.onMouseUp)
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
        let {onSelect, onChange, value} = this.props
        if (this.dragCanvasAt) {
          let translate = this.paper.translate()
          onChange(immutateUpdate(value, 'transform', () => ({x: translate.tx, y: translate.ty})))
          delete this.dragCanvasAt
        }
        if (onSelect) {
          onSelect(null)
        }
      })
      .on('link:connect', this.updateConnections)
  }
  
  syncPosition = (cell) => {
    let {value, onChange} = this.props
    const pos = cell.position()
    const res = immutateUpdate(value, 'tables', tables => {
      let table = _.find(tables, t => t.id === cell.id)
      if (!table) {
        return tables
      }
      return tables.map(t => t === table ? {...t, position: {x: pos.x, y: pos.y}} : t)
    })
    if (res === value) {
      return
    }
    onChange(res, value)
  }
  
  onMouseUp = (cellView, ev) => {
    const type = _.get(cellView.model, 'attributes.type')
    if (type === 'standard.HeaderedRectangle' || type === 'TableRect') {
      let {onSelect, spWidth, spHeight} = this.props
      // 更新坐标
      this.syncPosition(cellView.model)
      if (onSelect) {
        onSelect(cellView.model.id)
      }
      // 如果需要则扩大画布
      let currTranslate = this.paper.translate()
      let {y, height} = this.paper.getContentArea()
      const padding = 30
      this.paper.setDimensions(spWidth, Math.max(spHeight, currTranslate.ty + y + height + padding * 2))
    } else if (cellView.model.isLink()) {
      // 没有连到端点，则取消
      const linkAttrs = cellView.model.attributes
      if (!('id' in linkAttrs.target) || !('id' in linkAttrs.source)) {
        cellView.model.remove()
      }
    }
  }
  
  syncRemove = (cell, ev) => {
    let {value, onChange} = this.props
    if (cell.isLink()) {
      const {source, target} = cell.attributes
      let sId = source && source.id, tId = target && target.id
      const res = immutateUpdate(value, 'joinLinks', joinLinks => {
        let preRemoveLink = _.find(joinLinks, jl => jl.source === sId && jl.target === tId)
        return preRemoveLink ? joinLinks.filter(jl => jl !== preRemoveLink) : joinLinks
      })
      if (res === value) {
        return
      }
      onChange(res, value)
    }
  }
  
  isLinkFieldTypeNotMatching = (link) => {
    // 字段类型不匹配，不允许连接
    let {source, target} = link.model.attributes
    let {tableIdDict, outputCols} = this.props
    let [sTableId, sFieldName] = source.id.split('/')
    let [tTableId, tFieldName] = target.id.split('/')
    // 因为表的列的类型信息可能时延迟加载的，所以类型从表里实时读取
    let sourceType = _(tableIdDict)
      .chain()
      .get([sTableId, 'params', 'fieldInfos'])
      .find({field: sFieldName})
      .thru(fieldInfo => {
        let originalType = _.capitalize(guessDruidStrTypeByDbDataType(_.get(fieldInfo, 'type')))
        let srcOutputCol = _.find(outputCols, {dimId: source.id})
        return _.get(srcOutputCol, 'castTo') || originalType
      })
      .value()
    let targetType = _(tableIdDict)
      .chain()
      .get([tTableId, 'params', 'fieldInfos'])
      .find({field: tFieldName})
      .thru(fieldInfo => {
        let originalType = _.capitalize(guessDruidStrTypeByDbDataType(_.get(fieldInfo, 'type')))
        let targetOutputCol = _.find(outputCols, {dimId: target.id})
        return _.get(targetOutputCol, 'castTo') || originalType
      })
      .value()
    if (sourceType !== targetType) {
      link.model.remove()
      message.warn('这两个字段的数据类型不同，不能连接查询')
      return true
    }
    return false
  }
  
  hasLoopLink = (link) => {
    let {source, target} = link.model.attributes
    let {tableIdDict} = this.props
    let [sTableId, sFieldName] = source.id.split('/')
    let [tTableId, tFieldName] = target.id.split('/')
    if (sTableId === tTableId) {
      link.model.remove()
      message.warn('不能连接同一个表的字段')
      return true
    }
    // 检测全局闭环 在sql翻译时处理
    return false
  }
  
  updateConnections = (link) => {
    let {value, onChange} = this.props
    console.log('link connect: ', link)
    
    if (this.isLinkFieldTypeNotMatching(link)) {
      return
    }
    if (this.hasLoopLink(link)) {
      return
    }
  
    let {source, target} = link.model.attributes
    let joinLink = {
      source: source.port === 'out' ? source.id : target.id,
      target: target.port === 'in' ? target.id : source.id,
      type: 'innerJoin'
    }
    let res = immutateUpdate(value, 'joinLinks', jls => {
      return _.uniqBy([...(jls || []), joinLink], jl => `${jl.source}-${jl.target}`)
    })
    if (res === value) {
      return
    }
    onChange(res, value)
  }
  
  onFieldSelectToggle = (elementView, evt) => {
    evt.preventDefault()
    evt.stopPropagation()
    let fieldId = elementView.model.id
    let {selectedFields, onSelectedFieldsChange} = this.props
    
    let next = _.includes(selectedFields, fieldId)
      ? _.filter(selectedFields, fId => fId !== fieldId)
      : [...(selectedFields || []), fieldId]
    onSelectedFieldsChange(next)
  }
  
  onModelRemove = (elementView, evt) => {
    evt.stopPropagation() // stop any further actions with the element view (e.g. dragging)
    let cell = elementView.model
    let {value, onChange, selectedFields, onSelectedFieldsChange} = this.props
    const tableId = cell.id
    const res = immutateUpdates(value,
      'joinLinks', joinLinks => {
        return (joinLinks || []).filter(jl => {
          return !(_.startsWith(jl.source, tableId) || _.startsWith(jl.target, tableId))
        })
      },
      'tables', tables => {
        let preRemoveTable = _.find(tables, t => t.id === tableId)
        return preRemoveTable ? tables.filter(t => t !== preRemoveTable) : tables
      })
    if (res === value) {
      return
    }
    onChange(res, value)
    onSelectedFieldsChange(_.filter(selectedFields, f => !_.startsWith(f, tableId)))
  }
  
  
  onLinkTypeChange = (linkView, evt) => {
    evt.preventDefault()
    evt.stopPropagation()
    let {value, onChange} = this.props
    let link = linkView.model
    let source = link.attributes.source.id
    let target = link.attributes.target.id
    let typeTranslated = link.attributes.labels[0].attrs.labelText.text
    let nextType = _.findKey(OfflineCalcModelJoinTypeEnum, v => v === typeTranslated)
    
    let [sTableId, sFieldName] = source.split('/')
    let [tTableId, tFieldName] = target.split('/')
    let sTableModel = _.find(value.tables, t => t.id === sTableId)
    let tTableModel = _.find(value.tables, t => t.id === tTableId)
    const formItemLayout = {
      labelCol: { span: 5 },
      wrapperCol: { span: 19 }
    }
    
    Modal.confirm({
      title: '请选择连接类型',
      content: (
        <Form>
          <Form.Item
            label="字段A"
            {...formItemLayout}
            style={{marginBottom: '8px'}}
          >{`${sTableModel.title || sTableModel.name}/${sFieldName}`}</Form.Item>
          <Form.Item
            label="字段B"
            {...formItemLayout}
            style={{marginBottom: '8px'}}
          >{`${tTableModel.title || tTableModel.name}/${tFieldName}`}</Form.Item>
          <Form.Item
            label="连接方式"
            {...formItemLayout}
            style={{marginBottom: '8px'}}
          >
            <Select
              defaultValue={nextType}
              onChange={val => {
                nextType = val
              }}
              {...enableSelectSearch}
            >
              {_.keys(OfflineCalcModelJoinTypeEnum).map(jt => {
                return (
                  <Option key={jt} value={jt}>{OfflineCalcModelJoinTypeEnum[jt]}</Option>
                )
              })}
            </Select>
          </Form.Item>
        </Form>
      ),
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        let linkPos = _.findIndex(value.joinLinks, jl => jl.source === source && jl.target === target)
        onChange(immutateUpdate(value, ['joinLinks', linkPos, 'type'], () => nextType))
      }
    })
  }
  
  genGraph = (props = this.props) => {
    let tables = _.get(props, 'value.tables') || []
    let joinLinks = _.get(props, 'value.joinLinks') || []
    let selectedFields = _.get(props, 'selectedFields') || []
    let selectedFieldsSet = new Set(selectedFields)
    
    let cells = [
      ..._.flatMap(tables, t => genTableCell(t, props.selectedKey, selectedFieldsSet)),
      ...joinLinks.map(jl => genLinkCell(jl, tables))
    ]
    // console.log(res)
    let graph = this.graph || new joint.dia.Graph()
    graph.fromJSON({cells})
    return graph
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
      'transform', prev => ({...prev, x: currTranslate.tx, y: currTranslate.ty}),
      'scale', () => sxInRange)
    onChange(next)
  }
  
  render() {
    let {disabled} = this.props
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
              pointerEvents: disabled ? 'none' : undefined
            }}
            ref={ref => this.chartDom = ref}
          />
        </div>
        {disabled ? null : (
          <div className="absolute top0 pd1" style={{right: '18px'}}>
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
            <Button2
              size="small"
              icon="sugo-selection"
              onClick={this.autoFit}
              title="自动适配"
            />
          </div>
        )}
      </React.Fragment>
    );
  }
}
