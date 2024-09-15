import React, { Component } from 'react'
const cwd = process.cwd()
// const joint = cwd + ''
import * as joint from 'jointjs/dist/joint'
import 'jointjs/dist/joint.css'
import SugoIcon from '../../Common/sugo-icon'
import './css.styl'
import { Tooltip } from 'antd'

const NodeInfo = [
  { name: 'sugo-shell', title: 'shell脚本' },
  { name: 'sugo-language-python', title: 'python脚本' },
  { name: 'sugo-flow-hive', title: 'hive脚本' },
  { name: 'sugo-new-wait', title: '等待' },
  { name: 'sugo-oraclesql', title: 'oracle脚本' },
  { name: 'sugo-mysql1', title: 'mysql脚本' },
  { name: 'sugo-new-gobblin', title: 'gobblin脚本' },
  { name: 'sugo-flow-postgres', title: 'postgres脚本' },
  { name: 'sugo-sugo-flow-sqlserver', title: 'sqlserver脚本' },
  { name: 'sugo-api-access', title: '接入' },
  { name: 'sugo-data-clean', title: '数据清洗' },
  { name: 'sugo-data-model', title: '数据建模' },
  { name: 'sugo-end', title: '结束' }
]

const OperationInfo = [

]

export default class FlowDesign extends Component {

  componentDidMount() {
    var graph = new joint.dia.Graph()
    graph.fromJSON({
      cells: [{
        id: '1',
        type: 'standard.Rectangle',
        position: {
          x: 100,
          y: 100
        },
        size: {
          width: 100,
          height: 50
        },
        attrs: {
          text: {
            fill: '#ffffff',
            text: 'Name',
            letterSpacing: 0,
            style: { textShadow: '1px 0 1px #333333' }
          },
          '.inner': {
            fill: '#fe8550',
            stroke: 'none',
            rx: 43,
            ry: 21

          },
          '.outer': {
            fill: '#464a65',
            stroke: '#fe8550',
            filter: { name: 'dropShadow',  args: { dx: 0, dy: 2, blur: 2, color: '#222138' }}
          }
        },
        markup: [{
          tagName: 'rect',
          selector: 'body'
        }, {
          tagName: 'text',
          selector: 'label'
        }],
        z: '1'
      }, {
        id: '2',
        type: 'standard.Rectangle',
        position: {
          x: 200,
          y: 200
        },
        size: {
          width: 100,
          height: 50
        },
        attrs: {
          body: {
            refWidth: '100%',
            refHeight: '100%',
            strokeWidth: 2,
            stroke: '#000000',
            fill: '#FFFFFF'
          },
          label: {
            textVerticalAnchor: 'middle',
            textAnchor: 'middle',
            refX: '50%',
            refY: '50%',
            fontSize: 14,
            fill: '#333333',
            text: 'step2'
          }
        },
        markup: [{
          tagName: 'rect',
          selector: 'body'
        }, {
          tagName: 'text',
          selector: 'label'
        }],
        z: '1'
      },
      {
        type: 'standard.Link',
        source: {
          id: '1'
        },
        target: {
          id: '2'
        },
        id: '3',
        z: 2,
        attrs: {
          line: {
            connection: true,
            stroke: '#333333',
            strokeWidth: 2,
            strokeLinejoin: 'round',
            targetMarker: {
              'type': 'path',
              'd': 'M 10 -5 0 0 10 5 z'
            }
          },
          wrapper: {
            connection: true,
            strokeWidth: 10,
            strokeLinejoin: 'round'
          }
        },
        markup: [{
          tagName: 'path',
          selector: 'wrapper',
          attributes: {
            'fill': 'none',
            'cursor': 'pointer',
            'stroke': 'transparent',
            'stroke-linecap': 'round'
          }
        }, {
          tagName: 'path',
          selector: 'line',
          attributes: {
            'fill': 'none',
            'pointer-events': 'none'
          }
        }]
      }]
    })
    var paper = new joint.dia.Paper({
      el: this.designDiv,
      model: graph,
      width: '100%',
      height: '100%',
      // use a custom element view
      // (to ensure that opening the link is not prevented on touch devices)
      elementView: joint.dia.ElementView.extend({
        events: {
          'touchstart a': 'onAnchorTouchStart'
        },
        onAnchorTouchStart: function (evt) {
          evt.stopPropagation()
        }
      })
    })

    // console.log(rect2.get('type'), '-----------------')
    // console.log(joint.shapes.examples.HyperlinkRectangle === rect2, '-----------------')
    console.log(JSON.stringify(graph.toJSON()), '-----------------')
    // graph.fromJSON(graph.toJSON())
  }

  render() {
    return (
      <div className="width-100 height-100 flow-design">
        <div className="node-panel pd1">
          {
            NodeInfo.map(p => <div key={`icon-${p.name}`} className="mg2t pointer"><Tooltip title={p.title}><SugoIcon type={p.name} className="font30" /></Tooltip></div>)
          }
        </div>
        <div className="design-panel width-100 height-100" >
          <div />
          <div ref={ref => this.designDiv = ref} />
        </div>
      </div>
    )
  }
}
