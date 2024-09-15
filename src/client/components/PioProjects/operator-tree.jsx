import React from 'react'
import _ from 'lodash'
import { Icon as LegacyIcon } from '@ant-design/compatible'
import { SwitcherOutlined } from '@ant-design/icons'
import { Tooltip, Input } from 'antd'
import classNames from 'classnames'
import {getIcon} from 'common/operator-icon-map'
import dragula from 'sugo-dragula'
import $ from 'jquery'
export default class OperatorTree extends React.Component {

  state = {
    search: '',
    expandedKeys: [],
    lastClickedItem: ''
  }

  componentDidMount() {
    setTimeout(this.initDnd, 300)
  }

  componentWillReceiveProps(nextProps) {
    let {operators} = nextProps
    let expandedKeys = _.uniq(operators.map(o => o.category))
    this.setState({
      expandedKeys: Array.from(new Set(expandedKeys.concat(this.state.expandedKeys)))
    },this.initDnd)
  }

  initDnd = () => {
    let from = document.querySelectorAll('.operator-children-drag')
    let to = document.querySelector('.canvas-wrapper')
    let opts = {
      accepts: function (el, target) {
        return target.className === 'canvas-wrapper'
      },
      invalid: function (el) {
        return $(el).parent().hasClass('canvas-wrapper')
      },
      direction: 'vertical',             // Y axis is considered when determining where an element would be dropped
      copy: true,                       // elements are moved by default, not copied
      copySortSource: false,             // elements in copy-source containers can be reordered
      revertOnSpill: true,              // spilling will put the element back where it was dragged from, if this is true
      removeOnSpill: false,              // spilling will `.remove` the element, if this is true
      mirrorContainer: document.body,    // set the element that gets mirror elements appended
      ignoreInputTextSelection: true     // allows users to select input text, see details below
    }
    let drake = dragula(Array.from(from).concat(to), opts)
    let dragStatX = 0
    drake
      .on('drop', (el, target, source, sibling, e) => {
        let rect = document.querySelector('#pio-canvas svg').getBoundingClientRect()
        let name = $(el).data('name')
        let child = _.find(this.props.operators, {name})
        this.props.addOperator(child, {
          x: e.clientX,
          y: e.clientY,
          dragStatX,
          offsetX: rect.left,
          offsetY: rect.top
        })
        el.remove()
      })
      .on('drag', (el, source, e) => {
        if(!el.classList.contains('operator-child')) return
        dragStatX = e.clientX
        $(el).addClass('on-op-drag')
      })
      .on('cancel', (el) => {
        $(el).removeClass('on-op-drag')
      })
      .on('shadow', (el) => {
        $(el).addClass('on-op-drag hide')
      })
    // .on('dragend', (el, source) => {
    //   let rect = el.getBoundingClientRect()
    //   console.log(rect, 'rect dragend')
    //   rectCache = rect
    // })
  }

  activeBlur() {
    document.activeElement.blur()
  }

  onChange = e => {
    let search = e.target.value
    this.setState({
      search
    })
  }

  onExpand = title => {
    let expandedKeys = this.state.expandedKeys.slice(0)
    expandedKeys = expandedKeys.includes(title)
      ? _.without(expandedKeys, title)
      : expandedKeys.concat(title)
    this.setState({
      expandedKeys
    })
  }

  addOperator = child => {
    let {addOperator} = this.props
    this.setState({
      lastClickedItem: child.name
    })
    addOperator(child)
  }

  collapseAll = () => {
    this.setState({
      expandedKeys: []
    })
  }

  renderItem = (tree, IC) => {
    let {children, title, iconCode} = tree
    let {expandedKeys, search, lastClickedItem} = this.state
    let expanded = search || expandedKeys.includes(title)
    let icon = expanded ? 'up' : 'down'
    let tooltip = expanded ? '收起' : '展开'
    let cls = classNames(
      'operator-item',
      {
        expanded,
        'has-clicked-child': !!_.find(children, child => {
          return lastClickedItem === child.name
        })
      }
    )
    this._count ++
    return (
      <div className={cls} key={title + '@opl'}>
        <h3
          className={'fix' + (' pio-op' + this._count % 2)}
          onClick={() => this.onExpand(title)}
        >
          <span className="fleft">
            <Tooltip
              title={tooltip}
            >
              <LegacyIcon type={icon} className="pointer operator-expand font12 mg1r"/>
            </Tooltip>
            <LegacyIcon type={IC || (expanded ? 'folder-open' : 'folder')} className="mg1r" />
            {title}
          </span>
        </h3>
        <div className="operator-children">
          {
            children.map((child) => {
              if(child.isGroup) {
                return this.renderItem(child, getIcon(iconCode))
              } else {
                return (
                  <div className="operator-children-drag" key={child.name}>
                    <Operator 
                      data={child} 
                      lastClickedItem={lastClickedItem}
                      iconCode={iconCode}
                      index={++this._count}
                    />
                  </div>
                )
              }//else结束
            })//map结束
          }
        </div>
      </div>
    )
  }

  insert(arr, child) {
    let index = arr.findIndex(g => g.sequence > child.sequence)
    index !== -1 ? arr.splice(index, 0, child) : arr.push(child)    
  }

  getOperaorTree(operators) {
    let tree = operators.reduce((prev, op) => {
      let {category, group, groupSequence, groupCode} = op
      if (!prev[category]) prev[category] = {
        title: category,
        iconCode: category,
        children: []
      }
      let opGroup = prev[category].children
      let cTree = opGroup.find(c => c.title === group) 
      if(!cTree) {
        cTree = {
          title: group,
          iconCode: groupCode,
          children: [],
          sequence: groupSequence,
          isGroup: true
        }
        this.insert(opGroup, cTree)     
      }

      this.insert(cTree.children, op)      
      return prev
    }, {})

    for(let key in tree) {
      if(tree[key].children.length === 1) {
        tree[key].children = tree[key].children[0].children
      } else {
        tree[key].children.forEach((c, i, arr) => {
          if(c.children.length === 1) arr[i] = c.children[0]
        })
      }
    }
    return tree
  }

  byOrder(keywordSeq) {
    return x => _.findIndex(keywordSeq, keyword => x.indexOf(keyword) !== -1)
  }

  sort = (arr) => {
    let keywordSeq = ['数据源', '数据处理', '算法建模']
    let comparator = this.byOrder(keywordSeq)
    return _.sortBy(arr, comparator)
  }

  hide = () => {
    this.props.hide()
  }

  render() {
    this._count = 0
    let {search} = this.state
    let {operators, isHidden} = this.props
    let operators0 = search
      ? operators.filter(op => {
        return (op.fullName || '').indexOf(search) > -1
      })
      : operators

    let tree = this.getOperaorTree(operators0)

    let titles = this.sort(Object.keys(tree))

    const hideStyle = isHidden ? { left: '-186px' } : {}
    let iconProps = {
      type: 'caret-left',
      style: {
        position: 'absolute',
        right: '0px',
        top: '5px',
        color: '#aaa',
        fontSize: '11px'
      }
    }
    let hiddenTitle = '隐藏侧边栏'
    if(isHidden) {
      iconProps.type = 'caret-right'
      iconProps.style.right = '-13px'
      iconProps.style.color = '#1bb39c'
      iconProps.style.textShadow = '1px 1px 5px'
      hiddenTitle = '显示侧边栏'
    }

    return (
      <div className="pio-aside" style={hideStyle}>
        <div className="pd2t pd2x pd1b fix">
          <b className="fleft">算子列表</b>
          <span className="fright">
            <Tooltip
              title="全部收起"
            >
              <SwitcherOutlined className="pointer" onClick={this.collapseAll} />
            </Tooltip>
          </span>
        </div>
        <Tooltip
          title={hiddenTitle}
          placement="right"
        >
          <LegacyIcon 
            className="pointer"
            onClick={this.props.hide}
            {...iconProps}
          />
        </Tooltip>
        <div className="pd2x pd1b">
          <Input
            placeholder="搜索算子"
            value={search}
            onChange={this.onChange}
          />
        </div>

        <div className="operator-list">
          {
            titles.map(title => {
              return this.renderItem(tree[title])
            })
          }
        </div>
      </div>
    )
  }
}

class Operator extends React.Component {
  render() {
    let { lastClickedItem, data, iconCode, index } = this.props
    let {description, fullName, name } = data
    let leftIcon = getIcon(iconCode)
    let tip = `拖拽到中间空白处添加算子"${fullName}"(${description})`
    let clsName = classNames(
      'operator-child',
      {'last-clicked': lastClickedItem === name},
      'pio-op' + index % 2
    )
    return (
      <Tooltip
        title={tip}
        placement="right"
      >
        <div
          className={clsName}
          data-name={name}
          onClick={this.activeBlur}
        >
          <span className="iblock mw100 elli">
            <LegacyIcon type={leftIcon} className="mg1r" />
            {fullName}
          </span>
        </div>
      </Tooltip>
    )
  }
}
