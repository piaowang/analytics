import React, { Component } from 'react'
import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Select, Tooltip } from 'antd'

const Option = Select.Option

export default class ClassAttributes extends Component {

  shouldComponentUpdate(nextProps, nextState) {
    const { editEventInfo = {}, classAttr } = this.props
    return !_.isEqual(editEventInfo. class_attr, nextProps.editEventInfo.class_attr) 
    || !_.isEqual(classAttr, nextProps.classAttr) 
  }

  addEventAttributes = () => {
    const { editEventInfo, changeState } = this.props
    const { class_attr = [] } = editEventInfo
    let maxIndex = _.maxBy(class_attr, p => p.index)
    changeState({ editEventInfo: { ...editEventInfo, class_attr: [...class_attr, { dim: '', cls: '', index: _.get(maxIndex, 'index', 0) + 1 }] } })
  }

  delEventAttributes = (index) => {
    const { editEventInfo, changeState } = this.props
    const { class_attr = [] } = editEventInfo
    changeState({ editEventInfo: { ...editEventInfo, class_attr: class_attr.filter(p => p.index !== index) } })
  }

  updateEventAttributes = (index, val, type) => {
    const { editEventInfo, changeState } = this.props
    const { class_attr = [] } = editEventInfo
    let newVal = _.cloneDeep(class_attr)
    let objIndex = _.findIndex(newVal, p => p.index === index)
    if (objIndex < 0) {
      objIndex = newVal.length
      newVal.push({ dim: '', cls: '', index: objIndex })
    }
    _.set(newVal, [objIndex, type], val)
    changeState({ editEventInfo: { ...editEventInfo, class_attr: newVal } })
  }

  render() {
    let { classAttr = [], dimensions, editEventInfo } = this.props
    let { class_attr = [] } = editEventInfo
    let eventAttr = class_attr ? _.cloneDeep(class_attr) : []
    if (!classAttr || !classAttr.length) {
      return <div className="aligncenter" >没有可选属性</div>
    }
    if (!eventAttr.length) {
      eventAttr = [{ dim: '', cls: '', index: 0 }]
    }
    return (
      <div>
        {
          eventAttr.map((p, i) => {
            return (
              <div key={`attrs-${i}`}>
                <Select value={p.dim} key={`attrs-dim-${i}`} style={{ width: 120 }} className="mg1r" onChange={(val) => this.updateEventAttributes(p.index, val, 'dim')}>
                  {
                    dimensions.map((dim, j) => <Option key={`cls-item-${j}`} value={dim.name}><Tooltip title={dim.title || dim.name}>{dim.title || dim.name}</Tooltip></Option>)
                  }
                </Select>
                :
                <Select value={p.cls} key={`attrs-cls-${i}`} style={{ width: 120 }} className="mg1x" onChange={(val) => this.updateEventAttributes(p.index, val, 'cls')}>
                  {
                    classAttr.map((v, j) => <Option key={`cls-item-${j}`}  value={v}><Tooltip title={v}>{v}</Tooltip></Option>)
                  }
                </Select>
                <a onClick={() => { this.delEventAttributes(p.index) }}>
                  <CloseOutlined />
                </a>
              </div>
            )
          })

        }
        <div className="alignright">
          <a
            className="pointer"
            onClick={() => this.addEventAttributes()}
            title="添加属性"
          >
            <PlusCircleOutlined className="mg1r" />
            添加一个属性
          </a>
        </div>
      </div>
    )
  }
}
