import React from 'react'
import {findDOMNode} from 'react-dom'
import {Tooltip} from 'antd'
import {DragSource, DropTarget, DragDropContext} from 'react-dnd'
import {remove, insert} from '../../../common/sugo-utils'
import HTML5Backend from 'react-dnd-html5-backend'
import _ from 'lodash'
import {DruidColumnTypeIcon} from '../../../common/druid-column-type'
import {isEqualWithFunc} from '../../../common/sugo-utils'
import classNames from 'classnames'
import Icon from '../Common/sugo-icon'

// http://gaearon.github.io/react-dnd/examples-sortable-simple.html
const dragSource = {
  beginDrag(props) {
    return {
      id: props.option.id,
      index: props.index
    }
  }
}

const dragTarget = {
  hover(props, monitor, component) {
    const dragIndex = monitor.getItem().index
    const hoverIndex = props.index

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
      return
    }

    // Determine rectangle on screen
    const hoverBoundingRect = findDOMNode(component).getBoundingClientRect()

    // Get vertical middle
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

    // Determine mouse position
    const clientOffset = monitor.getClientOffset()

    // Get pixels to the top
    const hoverClientY = clientOffset.y - hoverBoundingRect.top

    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%

    // Dragging downwards
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return
    }

    // Dragging upwards
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return
    }

    // Time to actually perform the action
    props.move(dragIndex, hoverIndex)

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    monitor.getItem().index = hoverIndex
  }
}

@DropTarget('sortableListItem', dragTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))
@DragSource('sortableListItem', dragSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
}))
class SortableListItem extends React.Component {

  renderVisibleBtn = (visible, onVisibleChange, option) => {
    if (option.name === '__time') {
      return null
    }
    return (
      <Tooltip
        placement="right"
        title="切换是否可见"
      >
        <Icon
          type={visible ? 'eye' : 'eye-o'}
          title="切换是否可见"
          className="pointer fright font16 mg1r"
          style={{marginTop: 3}}
          onClick={() => onVisibleChange(!visible)}
        />
      </Tooltip>
    )
  }

  render() {
    let {option, style, connectDragSource, connectDropTarget, isDragging, visible, onVisibleChange,
      move, index, onMoveToBottom, type} = this.props

    const opacity = isDragging ? 0 : 1
    let item
    if(type === 'dimension') {
      item = <Icon type={DruidColumnTypeIcon[option.type]} className="font20 color-blue-grey height20" />
    }


    let dom = (
      <div className={classNames('sorting-item elli', {invisible: !visible})} style={{...style, opacity}}>
        {item}
        <div className="itblock pd1l" style={{width: `calc(100% - 20px - 24px ${visible ? '- 48px' : ''})`}}>
          {option.title || option.name}
        </div>
        {!visible ? null :
          <Tooltip
            title="到顶部"
          >
            <Icon
              type="up-square"
              className="pointer display-by-hover font16 mg1r"
              onClick={() => move(index, 0)}
            />
          </Tooltip>}
        {!visible ? null :
          <Tooltip
            title="到底部"
          >
            <Icon
              type="down-square"
              className="pointer display-by-hover font16 mg1r"
              onClick={onMoveToBottom}
            />
          </Tooltip>}
        {this.renderVisibleBtn(visible, onVisibleChange, option)}
      </div>
    )
    return connectDragSource(connectDropTarget(dom))
  }
}

@DragDropContext(HTML5Backend)
export default class SortableList extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      pendingOrder: this.genPendingOrder(props)
    }
  }

  genPendingOrder(props) {
    let {options, idMapper, orders, fixedAtTop = []} = props

    // pendingOrder: [{id, visible}], 有排序的排在前面，没有排序的在后面

    // 需要固定某些列在顶部，则它们不参与到 orders，直接在 render 输出
    if (_.isArray(fixedAtTop) && fixedAtTop.length) {
      let fixedAtTopSet = new Set(fixedAtTop)
      options = options.filter(op => !fixedAtTopSet.has(idMapper(op)))
    }

    let opDict = _.keyBy(options, idMapper)

    let pendingOptions = orders.map(o => {
      let visible = !_.startsWith(o, 'hide:')
      return {
        id: visible ? o : o.substr(5),
        visible
      }
    }).filter(po => opDict[po.id])

    // 不存在于顺序列表里面的 option，可能是新建的 option，也要加入列表
    let notInOrderOptions = _.difference(_.keys(opDict), pendingOptions.map(po => po.id))

    let unsorted = notInOrderOptions.map(id => ({id, visible: true})).concat(pendingOptions)
    return _.sortBy(unsorted, po => po.visible ? 0 : 1)
  }

  componentDidMount() {
    let {instRef} = this.props
    if (instRef) {
      instRef(this)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.instRef !== this.props.instRef && nextProps.instRef) {
      nextProps.instRef(this)
    }
    if (!isEqualWithFunc(nextProps, this.props)) {
      this.setState({
        pendingOrder: this.genPendingOrder(nextProps)
      })
    }
  }

  generateNextOrders = () => {
    let {pendingOrder} = this.state

    return pendingOrder.map(po => `${po.visible ? '' : 'hide:'}${po.id}`)
  }

  render() {
    let {options, idMapper} = this.props
    let {pendingOrder} = this.state

    let dict = _.keyBy(options, idMapper)
    // 总是显示全部选项、orders 排前面，取消
    return (
      <div
        style={{
          width: '100%',
          overflow: 'auto',
          minHeight: '200px',
          maxHeight: '400px',
          paddingLeft: '8px'
        }}
      >
        
        {pendingOrder.map((po, i) => {
          let move = (from, to) => {
            let fromPo = pendingOrder[from]
            let removed = remove(pendingOrder, from)
            this.setState({
              pendingOrder: insert(removed, to, fromPo)
            })
          }
          return (
            <SortableListItem
              key={po.id}
              option={dict[po.id]}
              index={i}
              visible={po.visible}
              onVisibleChange={visible => {
                this.setState({
                  pendingOrder: pendingOrder.map(p => p.id === po.id ? {id: p.id, visible: visible} : p)
                })
              }}
              move={move}
              onMoveToBottom={() => move(i, pendingOrder.length - 1)}
            />
          )
        })}
      </div>
    )
  }
}
