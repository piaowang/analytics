import React from 'react'
import {Table} from 'antd'
import {DragDropContext, DragSource, DropTarget} from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
// import update from 'immutability-helper';
import './dndTable.styl'

let dragingIndex = -1

class BodyRow extends React.Component {
  render() {
    const {isOver, connectDragSource, connectDropTarget, moveRow, ...restProps} = this.props
    const style = {...restProps.style, cursor: 'move'}

    let {className} = restProps
    if (isOver) {
      if (restProps.index > dragingIndex) {
        className += ' dndTable drop-over-downward '
      }
      if (restProps.index < dragingIndex) {
        className += ' dndTable drop-over-upward '
      }
    }

    return connectDragSource(
      connectDropTarget(<tr {...restProps} className={className} style={style}/>),
    )
  }
}

const rowSource = {
  beginDrag(props) {
    dragingIndex = props.index
    return {
      index: props.index
    }
  }
}

const rowTarget = {
  drop(props, monitor) {
    const dragIndex = monitor.getItem().index
    const hoverIndex = props.index

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
      return
    }

    // Time to actually perform the action
    props.moveRow(dragIndex, hoverIndex)

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    monitor.getItem().index = hoverIndex
  }
}

const DragableBodyRow = DropTarget('row', rowTarget, (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver()
}))(
  DragSource('row', rowSource, connect => ({
    connectDragSource: connect.dragSource()
  }))(BodyRow),
)
@DragDropContext(HTML5Backend)
export default class DragSortingTable extends React.Component {
  components = {
    body: {
      row: DragableBodyRow
    }
  };

  moveRow = (dragIndex, hoverIndex) => {
    console.log('dragIndex===', dragIndex, hoverIndex)
    const cb = () => {
      console.log(dragIndex, hoverIndex)
    }
    const {onIndexChanged = cb} = this.props
    onIndexChanged(dragIndex, hoverIndex)
  };

  render() {
    const {columns = [], dataSource = []} = this.props
    return (
      <Table
        className="dndTable"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        components={this.components}
        onRow={(record, index) => ({
          index,
          moveRow: this.moveRow
        })}
      />
    )
  }
}
