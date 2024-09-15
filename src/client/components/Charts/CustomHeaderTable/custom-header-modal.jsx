import React, { Component } from 'react'
import { CheckCircleOutlined } from '@ant-design/icons'
import { Modal, Table, Input, message, Button } from 'antd'
import { ContextMenuTrigger } from 'react-contextmenu'
import { generate } from 'shortid'
import showPopover from '../../Common/free-popover'

const defaultData = []
let isMouseDown = false

export function GetCellCount(columns) {
  const getColumnsCount = function (column, row = 1, cell = 0) {
    const children = _.get(column, 'children')
    if (children && children.length) {
      let res = children.map((p, i) => getColumnsCount(p, row + 1, cell))
      const rowCount = _.maxBy(res, p => p.row).row
      const cellCount = _.sumBy(res, p => p.cell)
      return {
        row: rowCount,
        cell: cellCount
      }
    }
    return {
      row,
      cell: 1
    }
  }

  const countRes = columns.map(p => getColumnsCount(p))
  const rowCount = _.get(
    _.maxBy(countRes, p => p.row),
    'row',
    0
  )
  const cellCount = _.sumBy(countRes, p => p.cell)

  return {
    rowCount,
    cellCount
  }
}

function findPathByValue(columns, val) {
  let keyPath = ''
  const findval = function (column, path) {
    if (keyPath) {
      return
    }
    const children = _.get(column, 'children')
    if (column.dataIndex === val) {
      keyPath = path
      return
    }
    if (children && children.length) {
      children.map((p, j) => findval(p, [path, j].filter(i => i !== '').join('.children.')))
    }
  }
  _.forEach(columns, (p, i) => findval(p, i))
  return keyPath
}

export function getAllDataColumnsPath(columns = []) {
  const getChlid = (cl, path = '') => {
    const children = _.get(cl, 'children', [])
    if (children.length === 0) {
      return path
    }
    return _.flatten(children.map((p, i) => getChlid(p, `${path}.children.${i}`)))
  }
  return _.flatten(columns.map((p, i) => getChlid(p, i.toString())))
}

export default class CustomHeaderModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      columns: [],
      selectCell: [],
      rowCount: 0,
      cellCount: 0,
      titleVal: '',
      isEdit: false,
      hoverCell: ''
    }
  }

  componentDidMount() {
    const { columns = defaultData } = this.props
    const { rowCount, cellCount } = GetCellCount(columns)
    const hasEventColumns = this.getColumns(columns)
    this.setState({ columns: hasEventColumns, rowCount, cellCount })
    setTimeout(() => {
      var table = document.querySelector('div.ant-modal-body table')
      if (table) {
        table.addEventListener('mouseenter', this.onMouseEnter, false)
        table.addEventListener('mouseleave', this.onMouseLeave, false)
      }
    }, 1000)
  }

  componentDidUpdate(prevProps) {
    const { columns = defaultData } = this.props
    if (_.differenceBy(columns, prevProps.columns, 'dataIndex').length || _.differenceBy(prevProps.columns, columns, 'dataIndex').length) {
      const { rowCount, cellCount } = GetCellCount(columns)
      const hasEventColumns = this.getColumns(columns)
      this.setState({ columns: hasEventColumns, rowCount, cellCount })
    }
  }

  columnsHeaderCellEvent = () => {
    const editTitle = this.editTitle
    const onMouseDown = this.onMouseDown
    const onMouseOver = this.onMouseOver
    const onMouseUp = this.onMouseUp
    return obj => {
      return {
        onDoubleClick: () => {
          editTitle(obj.dataIndex)
        }, // 点击表头行
        onMouseDown: event => {
          onMouseDown(event, obj.dataIndex)
        },
        onMouseOver: event => {
          onMouseOver(event, obj.dataIndex)
        },
        onMouseUp: event => {
          onMouseUp(event, obj.dataIndex)
        }
      }
    }
  }

  getColumns = columns => {
    let hasEventColumns = _.cloneDeep(columns)
    const columnsHeaderCellEvent = this.columnsHeaderCellEvent
    const bindEvents = function (column) {
      const children = _.get(column, 'children')
      if (children && children.length) {
        _.forEach(children, p => bindEvents(p))
      }
      const dataIndex = `Columns#${generate()}`
      if (!column.dataIndex) {
        column.dataIndex = dataIndex
      }
      if (!column.key) {
        column.key = dataIndex
      }
      column.title = _.get(column, 'title.props.title', _.get(column, 'title', ''))
      column.onHeaderCell = columnsHeaderCellEvent()
      column.onCellClick = () => {}
    }
    _.forEach(hasEventColumns, bindEvents)
    return hasEventColumns
  }

  clearColumns = columns => {
    let hasEventColumns = _.cloneDeep(columns)
    const clearEvents = function (column) {
      const children = _.get(column, 'children')
      if (children && children.length) {
        const newChildren = _.map(children, p => clearEvents(p))
        return {
          ...column,
          children: newChildren
        }
      }
      return _.omit(column, ['onHeaderCell', 'onCellClick'])
    }
    hasEventColumns = _.map(hasEventColumns, clearEvents)
    return hasEventColumns
  }

  editTitle = value => {
    let { columns, isEdit } = this.state
    if (isEdit) return
    columns = _.cloneDeep(columns)
    const path = findPathByValue(columns, value).toString()
    const val = _.get(columns, `${path}.title`, '')
    _.set(
      columns,
      `${path}.title`,
      <Input.Search
        className='minw200'
        defaultValue={val}
        enterButton={<CheckCircleOutlined />}
        onChange={e => this.setState({ titleVal: e.target.value })}
        onSearch={() => this.onChangeTitle(path)}
      />
    )
    this.setState({ columns, isEdit: true, titleVal: val })
  }

  onChangeTitle = path => {
    let { columns, titleVal } = this.state
    columns = _.cloneDeep(columns)
    _.set(columns, `${path}.title`, titleVal)
    this.setState({ columns, titleVal: '', isEdit: false })
  }

  componentWillUnmount() {
    var table = document.querySelector('div.ant-modal-body table')
    if (table) {
      table.removeEventListener('mouseenter', this.onMouseEnter, false)
      table.removeEventListener('mouseleave', this.onMouseLeave, false)
    }
  }

  deselectAll() {
    let ths = document.querySelectorAll('div.ant-modal-body table th')
    _.forEach(ths, p => {
      p.classList.remove('custom-select')
      p.classList.add('un-select')
    })
  }

  getElement(elem) {
    return _.toUpper(elem.tagName) === 'TH' ? elem : null
  }

  onMouseDown = (e, value) => {
    let { columns } = this.state
    const btnNum = event.button
    if (btnNum === 2) {
      const path = findPathByValue(columns, value)
      columns = _.cloneDeep(columns)
      let clearUp = null
      const content = (
        <div>
          <Button
            className='mg1r'
            data-select-type='include'
            onClick={() => {
              clearUp()
              this.addRow()
            }}
          >
            顶部添加一行
          </Button>
          <Button
            className='mg1r'
            data-select-type='include'
            onClick={() => {
              clearUp()
              this.deleteRow()
            }}
          >
            删除当前单元格
          </Button>
          <Button
            className='mg1r'
            data-select-type='include'
            onClick={() => {
              clearUp()
              this.mergeCell()
            }}
          >
            合并单元格
          </Button>
          <Button
            className='mg1r'
            data-select-type='include'
            onClick={() => {
              clearUp()
              this.breakCell()
            }}
          >
            拆分单元格
          </Button>
        </div>
      )
      clearUp = showPopover(e.target, content, undefined, { backgroundColor: 'rgba(0, 0, 0, 0.25)' })
      this.setState({ hoverCell: value })
      return
    }
    this.deselectAll()
    const cell = this.getElement(e.target)
    if (!cell) return
    isMouseDown = true
    e.target.classList.add('custom-select')
    this.setState({ selectCell: [value] })
  }

  onMouseOver = (e, value) => {
    const { selectCell } = this.state
    if (!isMouseDown || selectCell.length >= 2) return
    const cell = this.getElement(e.target)
    if (cell && !_.includes(e.target.classList, 'custom-select')) {
      e.target.classList.add('custom-select')
      this.setState({ selectCell: [...selectCell, value] })
    }
  }

  onMouseUp = (e, value) => {
    const { selectCell } = this.state
    if (!isMouseDown) return
    isMouseDown = false
    if (!isMouseDown || selectCell.length >= 2) return
    const cell = this.getElement(e.target)
    if (!cell) return
    if (!_.includes(e.classList, 'custom-select')) {
      e.target.classList.add('custom-select')
      this.setState({ selectCell: [...selectCell, value] })
    }
  }

  onMouseEnter(e) {
    isMouseDown = false
  }

  onMouseLeave(e) {
    isMouseDown = false
  }

  editCloumns = () => {
    let { columns } = this.state
    columns = _.cloneDeep(columns)
  }

  addRow = () => {
    let { columns } = this.state
    columns = _.cloneDeep(columns)
    columns = columns.map((p, i) => {
      let dataIndex = `Columns#${generate()}`
      const newItem = {
        dataIndex,
        key: dataIndex,
        title: '-',
        children: [p],
        onHeaderCell: this.columnsHeaderCellEvent()
      }
      return newItem
    })
    this.setState({ columns })
  }

  deleteRow = () => {
    let { columns, hoverCell } = this.state
    if (!hoverCell) return

    if (!_.startsWith(hoverCell, 'Columns#')) {
      message.error('数据列不允许删除')
      return
    }
    const path = findPathByValue(columns, hoverCell).toString()
    let parentPath = path.substring(0, _.lastIndexOf(path, '.'))
    columns = _.cloneDeep(columns)
    if (parentPath) {
      let parentChildren = _.get(columns, parentPath, [])
      const cellIdnex = _.toNumber(path.substring(_.lastIndexOf(path, '.') + 1))
      const befor = _.slice(parentChildren, 0, cellIdnex)
      const after = _.slice(parentChildren, cellIdnex + 1)
      _.set(columns, parentPath, [...befor, ..._.get(columns, `${path}.children`, []), ...after])
    } else {
      const cellIdnex = _.toNumber(path)
      const befor = _.slice(columns, 0, cellIdnex)
      const after = _.slice(columns, cellIdnex + 1)
      columns = _.concat(befor, _.get(columns, `${path}.children`, []), after)
    }
    this.setState({ columns })
  }

  mergeCell = () => {
    let { columns, selectCell } = this.state
    columns = _.cloneDeep(columns)
    if (selectCell.length < 2) return
    const [path1, path2] = _.sortBy(selectCell.map(p => findPathByValue(columns, p).toString()))
    let parentPath = path1.substring(0, _.lastIndexOf(path1, '.'))
    //父子合并
    if (_.startsWith(path2, path1)) {
      const childrenCount = _.get(columns, `${path1}.children.length`, 0)
      if (childrenCount > 1) {
        message.error('请先合并子项')
        return
      }
      const parentTitle = _.get(columns, `${path1}.title`, '')
      const childrenObj = _.get(columns, `${path2}`, '')
      _.set(columns, path1, { ...childrenObj, title: parentTitle + childrenObj.title })
    } else if (_.startsWith(path2, parentPath)) {
      //兄弟合并
      if (_.some(selectCell, p => !_.startsWith(p, 'Columns#'))) {
        message.error('数据列不允许横向合并')
        return
      }
      const obj1 = _.get(columns, `${path1}`, '')
      const obj2 = _.get(columns, `${path2}`, '')
      const index1 = path1.substring(_.lastIndexOf(path1, '.') + 1)
      const index2 = path2.substring(_.lastIndexOf(path2, '.') + 1)
      let childrenObj = parentPath ? _.get(columns, parentPath, []) : columns
      _.set(childrenObj, index1, {
        ..._.omit(obj2, ['children', 'title']),
        title: obj1.title + obj2.title,
        children: _.concat(_.get(obj1, 'children', []), _.get(obj2, 'children', []))
      })
      _.remove(childrenObj, (p, i) => i.toString() === index2)
      _.set(columns, parentPath, childrenObj)
    } else {
      message.error('数据列不允许跨父级合并')
      return
    }
    this.setState({ columns })
  }

  breakCell = () => {
    let { columns, hoverCell } = this.state
    if (!hoverCell) return
    columns = _.cloneDeep(columns)
    const path = findPathByValue(columns, hoverCell).toString()
    const cellCount = _.get(columns, `${path}.children.length`, 1)
    const parentPath = path.substring(0, _.lastIndexOf(path, '.'))

    const childrens = parentPath === '' ? columns : _.get(columns, parentPath, [])
    let maxRowCount = _.maxBy(
      childrens.map(p => GetCellCount(_.get(p, 'children', []))),
      p => p.rowCount
    )
    maxRowCount = _.get(maxRowCount, 'rowCount', 0)
    let currentRowCount = GetCellCount(_.get(columns, `${path}.children`, [])).rowCount + 1
    let rowCount = maxRowCount - currentRowCount <= 0 ? 1 : maxRowCount - currentRowCount
    if (rowCount < 1 && cellCount < 1) return
    const newItems = []
    for (let i = 0; i < cellCount; i++) {
      for (let j = 0; j < rowCount; j++) {
        let children = []
        if (j === rowCount - 1) {
          if (parentPath) {
            children = [_.get(columns, `${path}.children.${i}`, {})]
          } else {
            children = _.get(columns, `${path}.children.length`, 0) > 0 ? [_.get(columns, `${path}.children.${i}`, {})] : [_.get(columns, path, {})]
          }
        }
        const dataIndex = `Columns#${generate()}`
        let item = {
          dataIndex,
          key: dataIndex,
          title: '-',
          children,
          onHeaderCell: this.columnsHeaderCellEvent()
        }
        _.set(newItems, `${i}${_.repeat('.children.0', j)}`, item)
      }
    }
    const cellIdnex = _.toNumber(path.substring(_.lastIndexOf(path, '.') + 1))
    const befor = _.slice(childrens, 0, cellIdnex)
    const after = _.slice(childrens, cellIdnex + 1)
    if (parentPath) {
      _.set(columns, parentPath, _.concat(befor, newItems, after))
    } else {
      columns = _.concat(befor, newItems, after)
    }
    this.setState({ columns })
  }

  resetState = () => {
    this.setState({ isEdit: false, selectCell: [], titleVal: '', hoverCell: '' })
  }

  render() {
    const { columns, isEdit } = this.state
    const { visible, change, width, hide, ...res } = this.props
    return (
      <Modal
        visible={visible}
        width={1000}
        title='表头设置'
        onCancel={() => {
          this.resetState()
          hide()
        }}
        onOk={() => {
          if (isEdit) {
            message.error('请保存表头内容')
            return
          }
          this.resetState()
          const newData = this.clearColumns(columns)
          change(newData)
        }}
      >
        <div className='table-custom-header width-100'>
          <ContextMenuTrigger id='some_unique_identifier'>
            <Table
              {...res}
              bordered
              pagination={false}
              rowSelection={false}
              columns={columns}
              rowKey={_.get(columns, '0.key', 'id')}
              scroll={{ x: true }}
              className='always-display-scrollbar-horizontal-all'
            />
          </ContextMenuTrigger>
        </div>
      </Modal>
    )
  }
}
