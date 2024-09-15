/**
 * 标签排序
 */
import React from 'react'
import PropTypes from 'prop-types'
import {
  Tooltip
} from 'antd'
import _ from 'lodash'
import { move } from '../../../common/sugo-utils'
import CustomOrderList from '../Common/custom-order-list'
import Icon from '../Common/sugo-icon'
import classnames from 'classnames'

export default class TagTypeListCustomOrder extends React.Component {
  static propTypes = {
    updateTempOrders: PropTypes.func.isRequired,
    types: PropTypes.array.isRequired,
    dimensions: PropTypes.array.isRequired,
    tempOrders: PropTypes.array.isRequired
  }

  constructor(props, context) {
    super(props, context)
    this.state = {
      selectOrderType: ''
    }
  }

  renderOrderType = () => {
    let { tempOrders, updateTempOrders, types } = this.props
    let { selectOrderType } = this.state
    let typesOrder = tempOrders.map(p => p.type)
    let items = _.orderBy(types, p => _.findIndex(typesOrder, t => t === p.type)).map((o) => {
      return (
        <div
          key={o.type}
          className="alignright elli relative"
          style={{ paddingLeft: '5px', border: 'none' }}
        >
          <Tooltip title={o.type}>
            <div
              className={classnames('order-label types-lable', {
                'border-dashed': !selectOrderType
              })}
            >
              <div
                className="elli absolute alignleft left1 ignore-mouse pd1l font14"
                title={o.type}
                style={{ maxWidth: 'calc(100% - 30px)' }}
              >
                <Icon
                  type="tag"
                  className="mg1r tag-icon pointer"
                />
                {o.type}
              </div>
              {
                selectOrderType
                  ? null
                  : <Tooltip
                    title="到顶部"
                    mouseEnterDelay={1.5}
                    >
                    <Icon
                      type="sugo-up"
                      className="pointer display-by-hover font16 mg1r grey-at-first"
                      data-type-name={o.type}
                      onClick={this.moveToTop}
                    />
                  </Tooltip>
              }

              {
                selectOrderType
                  ? null
                  : <Tooltip
                    title="到底部"
                    mouseEnterDelay={1.5}
                    >
                    <Icon
                      type="sugo-down"
                      className="pointer display-by-hover font16 mg1r grey-at-first"
                      data-type-name={o.type}
                      onClick={this.moveToBottom}
                    />
                  </Tooltip>
              }

              {
                !selectOrderType || selectOrderType === o.type
                  ? <Tooltip
                    placement="right"
                    title={`${selectOrderType === o.type ? '保存' : '设置'}标签顺序`}
                    >
                    <Icon
                      title={`${selectOrderType === o.type ? '保存' : '设置'}标签顺序`}
                      type="setting"
                      className="pointer font16 mg1r grey-at-first"
                      data-type-name={o.type}
                      onClick={() => {
                        this.setState({ selectOrderType: selectOrderType === o.type ? '' : o.type })
                      }}
                    />
                  </Tooltip>
                  : null
              }
            </div>
          </Tooltip>

          <div>
            {
              selectOrderType === o.type
                ? this.renderOrderTags(o.children, o.type, tempOrders)
                : null
            }
          </div>
        </div>
      )
    })
    if (selectOrderType) {
      return (
        <div
          className="tag-list-custom-order types-order-panel"
        >
          {items}
        </div>
      )
    } else {
      return (
        <CustomOrderList
          className="tag-list-custom-order types-order-panel"
          onChildrenMove={(from, to) => {
            let newOrder = move(typesOrder, from, to)
            updateTempOrders(_.orderBy(tempOrders, p => _.findIndex(newOrder, n => n === p.type)))
          }}
        >
          {items}
        </CustomOrderList>
      )
    }
  }

  moveToTop = ev => {
    let { tempOrders, updateTempOrders } = this.props
    let { selectOrderType } = this.state
    if (selectOrderType) {
      let metricName = ev.target.getAttribute('data-tag-name')
      let typeIndex = _.findIndex(tempOrders, p => p.type === selectOrderType)
      let tagsOrder = _.get(tempOrders, `${typeIndex}.children`)
      let from = _.findIndex(tagsOrder, m => m === metricName)
      let newOrder = move(tagsOrder, from, 0)
      let newTempOrders = _.cloneDeep(tempOrders)
      _.set(newTempOrders, `[${typeIndex}]`, { type: selectOrderType, children: newOrder })
      updateTempOrders(newTempOrders)
    } else {
      let metricName = ev.target.getAttribute('data-type-name')
      let types = tempOrders.map(p => p.type)
      let from = _.findIndex(types, m => m === metricName)
      let newOrder = move(types, from, 0)
      updateTempOrders(_.orderBy(_.cloneDeep(tempOrders), p => _.findIndex(newOrder, n => n === p.type)))
    }
  }

  moveToBottom = ev => {
    let { tempOrders, updateTempOrders } = this.props
    let { selectOrderType } = this.state
    if (selectOrderType) {
      let metricName = ev.target.getAttribute('data-tag-name')
      let typeIndex = _.findIndex(tempOrders, p => p.type === selectOrderType)
      let tagsOrder = _.get(tempOrders, `${typeIndex}.children`)
      let from = _.findIndex(tagsOrder, m => m === metricName)
      let newOrder = move(tagsOrder, from, tagsOrder.length)
      let newTempOrders = _.cloneDeep(tempOrders)
      _.set(newTempOrders, `[${typeIndex}]`, { type: selectOrderType, children: newOrder })
      updateTempOrders(newTempOrders)
    } else {
      let metricName = ev.target.getAttribute('data-type-name')
      let types = tempOrders.map(p => p.type)
      let from = _.findIndex(types, m => m === metricName)
      let newOrder = move(types, from, types.length)
      updateTempOrders(_.orderBy(_.cloneDeep(tempOrders), p => _.findIndex(newOrder, n => n === p.type)))
    }
  }

  renderOrderTags = (tags, type, OrderData) => {
    let { updateTempOrders, dimensions } = this.props
    let typeIndex = _.findIndex(OrderData, p => p.type === type)
    let tagsOrder = _.get(OrderData, `[${typeIndex}].children`)
    let items = _.orderBy(tags, p => _.findIndex(tagsOrder, t => t === p.name)).map((o) => {
      let dimension = _.find(dimensions, p => p.name === o.name)
      let tt = dimension.title || dimension.name
      return (
        <div
          key={o.name}
          className="alignright elli relative order-label tags-lable"
          style={{ paddingLeft: '5px' }}
          title={tt}
        >
          <div
            className="elli absolute alignleft left1 ignore-mouse pd1l"
            style={{ maxWidth: 'calc(100% - 30px)' }}
          >
            <Icon
              type="tag-o"
              className="mg1r tag-icon pointer"
            />
            {tt}
          </div>
          <Tooltip
            title="到顶部"
            mouseEnterDelay={1.5}
          >
            <Icon
              type="sugo-up"
              className="pointer display-by-hover font16 mg1r grey-at-first"
              data-tag-name={o.name}
              onClick={this.moveToTop}
            />
          </Tooltip>

          <Tooltip
            title="到底部"
            mouseEnterDelay={1.5}
          >
            <Icon
              type="sugo-down"
              className="pointer display-by-hover font16 mg1r grey-at-first"
              data-tag-name={o.name}
              onClick={this.moveToBottom}
            />
          </Tooltip>
        </div>
      )
    })
    return (
      <CustomOrderList
        className="tag-list-custom-order tags-order-panel"
        onChildrenMove={(from, to) => {
          let newOrder = move(tagsOrder, from, to)
          let newTempOrders = _.cloneDeep(OrderData)
          _.set(newTempOrders, `[${typeIndex}]`, { type, children: newOrder })
          updateTempOrders(newTempOrders)
        }}
      >
        {
          items
        }
      </CustomOrderList>
    )
  }

  render() {
    return this.renderOrderType()
  }
}
