import React, { Component } from 'react'
import _ from 'lodash'
import { immutateUpdate, insert } from '../../../../common/sugo-utils'
import { enableSelectSearch } from '../../../common/antd-freq-use-props'

import { Button, Col, Input, Row, Select } from 'antd'
import { Icon } from '@ant-design/compatible'
import { CloseCircleOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import FixWidthHelper from '../../Common/fix-width-helper-no-hidden'
import SmallImagePicker from '../../LiveScreen/small-img-picker'

// 设置样式
const getItemStyle = (isDragging, draggableStyle) => ({
  userSelect: 'none',
  ...draggableStyle
})

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)

  return result
};

export default class AppDragItems extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { appGroups, onChange = _.noop, applications = [], gi } = this.props
    const g = appGroups[gi]
    console.log(g)
    return (
      <Droppable droppableId={`drop-item-${gi}`} type={gi} key={`group-${gi}`}>
        {(dropProvided, dropSnapshot) => (
          <div
            {...dropProvided.droppableProps}
            ref={dropProvided.innerRef}
          >
            <CloseCircleOutlined
              className="absolute pointer color-red hover-display-iblock"
              style={{
                top: '0px',
                right: '0px',
                transform: 'translate(50%, -50%)',
                fontSize: '18px'
              }}
              onClick={() => {
                onChange(appGroups.filter((a, j) => j !== gi))
              }}
            />
            <FixWidthHelper toFix="first"
              toFixWidth={null}
              className="mg2b"
            >
              <div className="line-height32" >应用分组名称：</div>
              <Input
                value={g.name}
                onChange={(ev) => {
                  const { value } = ev.target
                  onChange(
                    immutateUpdate(appGroups, [gi, 'name'], () => value)
                  )
                }}
              />
            </FixWidthHelper>

            <Row gutter={8} className="mg1b">
              <Col span={7}>选择应用</Col>
              <Col span={7}>显示名称</Col>
              <Col span={4}>logo</Col>
              <Col span={4}>悬浮logo</Col>
              <Col span={2} />
            </Row>
            <div>
              {_.map(g.apps, (app, ai) => {
                return (
                  <Draggable
                    key={`draggableg-item-${gi}-${ai}`}
                    index={ai}
                    draggableId={`draggableg-item-${gi}-${ai}`}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div key={ai}
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={getItemStyle(
                          dragSnapshot.isDragging,
                          dragProvided.draggableProps.style
                        )}
                      >
                        <Row gutter={8} className="mg1b">
                          <Col span={7}>
                            <Select
                              {...enableSelectSearch}
                              value={app.id}
                              onChange={(value) => {
                                onChange(
                                  immutateUpdate(
                                    appGroups,
                                    [gi, 'apps', ai, 'id'],
                                    () => value
                                  )
                                )
                              }}
                            >
                              {_.map(applications, (app) => {
                                return (
                                  <Select.Option key={app.id}>
                                    {app.name}
                                  </Select.Option>
                                )
                              })}
                            </Select>
                          </Col>
                          <Col span={7}>
                            <Input
                              placeholder="使用原名称"
                              value={app.title}
                              onChange={(ev) => {
                                const { value } = ev.target
                                onChange(
                                  immutateUpdate(
                                    appGroups,
                                    [gi, 'apps', ai, 'title'],
                                    () => value
                                  )
                                )
                              }}
                            />
                          </Col>
                          <Col span={4}>
                            <SmallImagePicker
                              className="itblock"
                              imgStyle={{ maxHeight: '32px' }}
                              value={app.logo}
                              onChange={(imgUrl) => {
                                onChange(
                                  immutateUpdate(
                                    appGroups,
                                    [gi, 'apps', ai, 'logo'],
                                    () => imgUrl
                                  )
                                )
                              }}
                            >
                              <Button>
                                <Icon type="upload" /> 上传
                                    </Button>
                            </SmallImagePicker>
                          </Col>
                          <Col span={4}>
                            <SmallImagePicker
                              imgStyle={{ maxHeight: '32px' }}
                              value={app.hoverLogo}
                              onChange={(imgUrl) => {
                                onChange(
                                  immutateUpdate(
                                    appGroups,
                                    [gi, 'apps', ai, 'hoverLogo'],
                                    () => imgUrl
                                  )
                                )
                              }}
                            >
                              <Button>
                                <Icon type="upload" /> 上传
                                    </Button>
                            </SmallImagePicker>
                          </Col>
                          <Col span={2} style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                            <PlusOutlined
                              className="pointer color-main"
                              onClick={() => {
                                onChange(
                                  immutateUpdate(appGroups, [gi, 'apps'], (apps) =>
                                    insert(apps, ai, {})
                                  )
                                )
                              }}
                            />
                            <CloseOutlined
                              className="pointer color-red"
                              onClick={() => {
                                onChange(
                                  immutateUpdate(appGroups, [gi, 'apps'], (apps) =>
                                    apps.filter((a, j) => j !== ai)
                                  )
                                )
                              }}
                            />
                          </Col>
                          <Col span={24} className="pd1t" />
                        </Row>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {dropProvided.placeholder}
            </div>
            <a
              href="#"
              onClick={(ev) => {
                ev.preventDefault()
                onChange(
                  immutateUpdate(appGroups, [gi, 'apps'], (apps) => [
                    ...(apps || []),
                    {}
                  ])
                )
              }}
            >
              <PlusOutlined />
              新增一个应用
            </a>
          </div>
        )}
      </Droppable>
    )
  }
}