import { Table } from 'antd'
import { DndProvider, DragSource, DropTarget, DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import React from 'react'
import _ from 'lodash'
import './drag-table.styl'

let dragingIndex = -1

class BodyRow extends React.Component {
  render() {
    const { isOver, connectDragSource, connectDropTarget, moveRow, ...restProps } = this.props;
    const style = { ...restProps.style, cursor: 'move' };

    let { className } = restProps;
    if (isOver) {
      if (restProps.index > dragingIndex) {
        className += ' drop-over-downward';
      }
      if (restProps.index < dragingIndex) {
        className += ' drop-over-upward';
      }
    }

    return connectDragSource(
      connectDropTarget(<tr {...restProps} className={className} style={style} />),
    );
  }
}

const rowSource = {
  beginDrag(props) {
    dragingIndex = props.index;
    return {
      index: props.index,
    };
  },

  // 如果当前在操作输入框就禁止拖动
  canDrag(props){
    return props.index !== props.curedit
  }
};

const rowTarget = {
  drop(props, monitor) {
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
      return;
    }

    // Time to actually perform the action
    props.moveRow(dragIndex, hoverIndex);

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    monitor.getItem().index = hoverIndex;
  },
};

const DragableBodyRow = DropTarget('row', rowTarget, (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
}))(
  DragSource('row', rowSource, connect => ({
    connectDragSource: connect.dragSource(),
  }))(BodyRow),
);

@DragDropContext(HTML5Backend)
class DragSortingTable extends React.Component {

  components = {
    body: {
      row: DragableBodyRow,
    },
  };

  moveRow = (dragIndex, hoverIndex) => {
    const { dataSource } = this.props
    const dragRow = dataSource[dragIndex]
    const arr = _.cloneDeep(dataSource)

    // this.props.changeDataSource(
    //   update(this.props, {
    //     dataSource: {
    //       $splice: [[dragIndex, 1], [hoverIndex, 0, dragRow]]
    //     }
    //   }),
    // )
    arr.splice(dragIndex, 1)
    arr.splice(hoverIndex, 0, dragRow)
    this.props.changeDataSource(arr)
  };

  render() {
    const {dataSource, startSort = false, columns,curEdit, ...rest } = this.props
    return (
      <Table
        columns={columns}
        dataSource={dataSource}
        getPopupContainer={triggerNode => triggerNode.parentNode}
        components={this.components}
        onRow={(record, index) => ({
          index,
          moveRow: this.moveRow,
          curedit:this.props.curEdit
        })}
        {...rest}
      />
    )
  }
}

export default DragSortingTable
