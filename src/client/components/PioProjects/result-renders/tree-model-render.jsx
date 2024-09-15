import React from 'react'
import _ from 'lodash'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Tooltip } from 'antd';
const conditionMap = {
  greater: '>',
  less_equals: '≤'
}

export default class ResultTreeModel extends React.Component {

  state = {
    showChildrenMap: {}
  }

  onChange = e => {
    this.setState({
      tab: e.target.value
    })
  }

  renderDesc = () => {
    let {modelData} = this.props
    let {
      data: {
        ioObjects: [{
          description = ''
        }]
      }
    } = modelData
    return (
      <div
        dangerouslySetInnerHTML={{
          __html: description.replace(/\|/g, '<span class="mg2r">|</span>')
        }}
      />
    );
  }

  renderCondition = (condition) => {

    let {splitType, value} = condition
    let cls = 'd-tree-condition iblock color-grey elli'
    return (
      <span>
        <span className="d-tree-condition-line" />
        <span className={cls}>{conditionMap[splitType]} {value}</span>
      </span>
    )

  }

  toggleChildrenVisible = id => {
    let showChildrenMap = _.cloneDeep(this.state.showChildrenMap)
    showChildrenMap[id] = !showChildrenMap[id]
    this.setState({
      showChildrenMap
    })
  }

  renderCaret = (side, hasChildren, id) => {
    if (side === 1 || !hasChildren) return null
    let visible = this.state.showChildrenMap[id]
    let title = visible ? '收起' : '展开'
    let type = visible ? 'caret-up' : 'caret-down'
    return (
      <Tooltip title={title}>
        <LegacyIcon
          type={type}
          className="mg1r pointer color-grey iblock"
          onClick={() => this.toggleChildrenVisible(id)}
        />
      </Tooltip>
    );
  }

  renderCounterMap = root => {
    if (!root.counterMap) return null
    let {Y, N} = root.counterMap
    return (
      <sup className="counter-label">
        <span className="counter-map counter-map-y">{Y}</span>
        <span className="counter-map counter-map-n">{N}</span>
      </sup>
    )
  }

  renderLabel = (label, labelText, root) => {
    let labelDom
    let counter = this.renderCounterMap(root)
    if (label === 'Y') {
      labelDom = (
        <span className="color-green">
          {label}
          {counter}
        </span>
      )
    } else if (label === 'N') {
      labelDom = (
        <span className="color-red">
          {label}
          {counter}
        </span>
      )
    } else {
      labelDom = labelText
    }
    return (
      <Tooltip title={labelText}>
        <b>{labelDom}</b>
      </Tooltip>
    )
  }

  recDicisionTree = (root, level = 0, className = '', condition, side = '', parentId = '') => {
    let {showChildrenMap} = this.state
    let id = parentId + '-' + level + '_' + side
    let {children, label} = root
    let labelText = label || _.get(children, '[0].condition.attributeName') || '没有有意义的结果'
    let hasChildren = children.length
    let childrenVisible = showChildrenMap[id]
    let cls = 'd-tree-cell ' +
      `d-tree-lv${level}` +
      ` ${className} ${hasChildren ? 'has-children' : 'no-children'}` +
      `${childrenVisible ? ' d-tree-children-visible' : ''}`

    return (
      <div className={cls}>
        <div>
          <span className="d-tree-label">
            {condition && this.renderCondition(condition)}
            <span className="d-tree-label-text iblock elli">
              {this.renderCaret(side, hasChildren, id)}
              {this.renderLabel(label, labelText, root)}
            </span>
          </span>
        </div>
        {
          hasChildren ? this.recDicisionTree(
            children[0].child,
            level + 1,
            'd-tree-child d-tree-cell-0',
            children[0].condition,
            0,
            id
          ) : null
        }
        {
          hasChildren ? this.recDicisionTree(
            children[1].child,
            level + 1,
            'd-tree-child d-tree-cell-1',
            children[1].condition,
            1,
            id
          ) : null
        }
      </div>
    )
  }

  render () {
    let {data} = this.props
    return (
      <div className="tree-wrapper">
        {this.recDicisionTree(data.root)}
      </div>
    )
  }
}
