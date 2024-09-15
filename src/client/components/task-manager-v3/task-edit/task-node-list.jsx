import React from 'react'
import { Menu } from 'antd'
import DraggableBtn from './draggable-btn'
import _ from 'lodash'
import PropTypes from 'prop-types'

const { SubMenu } = Menu

const TaskNodeList = function (props) {
  const { canEdit, categoryInfo } = props
  return (
    <Menu mode="inline" className="height-100" defaultOpenKeys={['node_category_0', 'node_category_1', 'node_category_2', 'node_category_3']}>
      {
        categoryInfo.map((p, i) => {
          return (
            <SubMenu key={`node_category_${i}`} title={p.title}>
              {
                p.children.map((n, j) => {
                  return (<DraggableBtn
                    className="mg1l mg1b"
                    key={`flow_node_${j}`}
                    nodeType={n.nodeType || n.taskId}
                    options={{ disabled: !canEdit }}
                  >
                    {n.showName || n.name}
                  </DraggableBtn>)
                })
              }
            </SubMenu>)
        })
      }
    </Menu>)
}

TaskNodeList.propTypes = {
  canEdit: PropTypes.bool,
  categoryInfo: PropTypes.any,
  nodeInfo: PropTypes.any
}

export default TaskNodeList
