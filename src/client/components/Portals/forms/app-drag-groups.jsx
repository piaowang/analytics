import React, { Component } from 'react'
import {connect} from 'react-redux'

import _ from 'lodash'
import { immutateUpdate, insert } from '../../../../common/sugo-utils'
import { PlusOutlined } from '@ant-design/icons'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import AppDrgItems from './app-drag-items'


// 设置样式
const getItemStyle = (isDragging, draggableStyle) => ({
  background: 'rgba(249,249,249,1)',
  border: '1px dashed #d9d9d9',
  borderRadius: '4px',
  userSelect: 'none',
  ...draggableStyle
})

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)

  return result
}
@connect()
export default class AppDragGrpups extends Component {
  constructor(props) {
    super(props)
    this.onDragEnd = this.onDragEnd.bind(this)
  }
  componentDidMount(){
    this.props.dispatch({
      type: 'application-management/initApplications'
    })
  }

  onDragEnd({ type, source, destination }) {
    // dropped outside the list
    if (!destination) {
      return
    }
    if (type === 'groups') { // 拖拽模块分为两层，外层的type为grops，内层的type为每个分组的序列
      const appGroups = reorder(
        this.props.value,
        source.index,
        destination.index
      )
      this.props.onChange(appGroups)
    } else {
      const appGroups = this.props.value
      const apps = reorder(
        appGroups[type].apps, // 设置类型时，将分组模块的type设置为其数组序列
        source.index,
        destination.index
      )
      this.props.onChange(immutateUpdate(appGroups, [type, 'apps'], () => apps))
    }

  }

  render() {
    const { value: appGroups, onChange = _.noop, applications = [] } = this.props
    return (
      <DragDropContext onDragEnd={this.onDragEnd}>
        <Droppable droppableId="droppable" type="groups" key="groups">
          {(dropProvided, dropSnapshot) => (
            <div
              {...dropProvided.droppableProps}
              ref={dropProvided.innerRef}
            >
              {_.map(appGroups, (g, gi) => {
                return (
                  <Draggable
                    key={`draggableg${gi}`}
                    index={gi}
                    draggableId={`draggableg${gi}`}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div key={gi}
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className="pd2 mg2b relative hover-display-trigger"
                        style={getItemStyle(
                          dragSnapshot.isDragging,
                          dragProvided.draggableProps.style
                        )}
                      >
                        <AppDrgItems gi={gi} appGroups={appGroups} onChange={onChange} applications={applications} />
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {dropProvided.placeholder}
              <a
                href="#"
                onClick={(ev) => {
                  ev.preventDefault()
                  onChange([...(appGroups || []), { name: '', apps: [{}] }])
                }}
              >
                <PlusOutlined />
                新增应用分组
              </a>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    )
  }
}
