import React, { useEffect, useRef, useState } from 'react'
import { Tabs, Row, Col } from 'antd'
import _ from 'lodash'
import moment from 'moment'
// import { immutateUpdate } from "../../../../common/sugo-utils"
// import { generate } from "shortid"
// import { Icon, Input, message } from "antd"

export default function BaseInfo(props) {
  const { nodeName } = props
  const { title, flowName, created_at, created_by, approveState } = props.nodeInfo

  return (
    <React.Fragment>
      <div className="pd3l bg-white height-100 font14">
        <div>
          <Row className="mg2t">
            <Col span={4} className="alignright mg2r">所属项目:</Col>
            <Col span={8}>{title}</Col>
          </Row>
          <Row className="mg2t">
            <Col span={4} className="alignright mg2r">工作流名称:</Col>
            <Col span={8}>{flowName}</Col>
          </Row>
          {
            nodeName
              ?
              <Row className="mg2t">
                <Col span={4} className="alignright mg2r">节点名称:</Col>
                <Col span={8}>{nodeName}</Col>
              </Row>
              : null
          }
          <Row className="mg2t">
            <Col span={4} className="alignright mg2r">创建时间:</Col>
            <Col span={8}>{moment(created_at).format('YYYY-MM-DD HH:mm:ss')}</Col>
          </Row>
          <Row className="mg2t">
            <Col span={4} className="alignright mg2r">创建人:</Col>
            <Col span={8}>{_.get(props.usersDict[created_by], 'first_name') || _.get(props.usersDict[created_by], 'username')}</Col>
          </Row>
        </div>
      </div>
    </React.Fragment>
  )
}
