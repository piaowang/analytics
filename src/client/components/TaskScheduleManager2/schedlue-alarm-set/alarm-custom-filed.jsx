import React, { Component } from 'react'
import { DeleteOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Row, Col, Input } from 'antd'
import _ from 'lodash'

export default class AlarmCustomFiled extends Component {

  onChangeKey = (oldKey, key) => {
    const { value = {}, onChange } = this.props
    const val = _.get(value, oldKey, '')
    onChange({ ..._.omit(value, [oldKey]), [key]: val })
  }

  onChangeVal = (key, val) => {
    const { value = {}, onChange } = this.props
    onChange({ ...value, [key]: val })
  }

  addParams = () => {
    const { value = {}, onChange } = this.props
    if (_.get(value, 'param1') !== undefined) {
      return
    }
    onChange({ ...value, param1: 'value' })
  }

  deleteParams = (key) => {
    const { value = {}, onChange } = this.props
    onChange({ ..._.omit(value, [key]) })
  }

  render() {
    const { value = {} } = this.props
    return (
      <div>
        {
          _.keys(value).map((p, i) => {
            return (
              <Row key={`custom-field-${i}`}>
                <Col offset={1} span={3} className="pd1r"><Input defaultValue={p} onChange={e => this.onChangeKey(p, e.target.value)} /></Col>
                <Col span={17}><Input defaultValue={_.get(value, p, '')} onChange={e => this.onChangeVal(p, e.target.value)} /></Col>
                <Col span={3}><DeleteOutlined className="pointer mg2l" onClick={() => this.deleteParams(p)} /></Col>
              </Row>
            )
          })
        }
        <div className="alignright add-api-custom-parms" >
          <a
            className="pointer"
            onClick={() => this.addParams()}
            title="添加一个参数"
          >
            <PlusCircleOutlined className="mg1r" />
            添加一个参数
          </a>
        </div>
      </div>
    )
  }
}
