import React from 'react'
import { CheckCircleOutlined } from '@ant-design/icons';
import {Checkbox, Modal, Button} from 'antd'
import _ from 'lodash'
import deepCopy from '../../../common/deep-copy'
import {typeMap} from './constants'

export default class AuthModal extends React.Component {

  close = () => {
    this.props.stateUpdater({
      modalVisible: false
    })
  }

  renderFooter = () => {
    return (
      <div className="alignright">
        <Button
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={this.close}
        >确定</Button>
      </div>
    );
  }

  onToggle = item => {
    return e => {
      let value = e.target.checked
      let {modifier, modalType} = this.props
      let role = deepCopy(this.props.role)
      let prop = typeMap[modalType].replace(/s$/, '') + 'Ids'
      let ids = role.dataPermissions[prop]
      let {id} = item
      if (value) {
        role.dataPermissions[prop] = [...ids, id]
      } else {
        role.dataPermissions[prop] = _.without(ids, id)
      }
      modifier({role})
    };
  }

  checkValue = d => {
    let {role, modalType} = this.props
    let prop = typeMap[modalType].replace(/s$/, '') + 'Ids'
    let ids = role.dataPermissions[prop]
    return ids.includes(d.id)
  }

  renderItem = (d, i) => {
    let txt = d.title || d.name
    return (
      <div
        className="iblock mg1r mg1b"
        key={d.id + '@d' + i}
        title={txt}
      >
        <Checkbox
          onChange={this.onToggle(d)}
          checked={this.checkValue(d)}
        >
          <span className="elli iblock width100">{txt}</span>
        </Checkbox>
      </div>
    )
  }

  // renderSelectAllBtn = () => {

  // }

  // renderSelectNoneBtn = () => {

  // }

  // renderSelectReverseBtn = () => {

  // }

  renderButtons = () => {
    //todo
    return null
    // return (
    //   <div className="pd1y">
    //     {this.renderSelectAllBtn()}
    //     {this.renderSelectNoneBtn()}
    //     {this.renderSelectReverseBtn()}
    //   </div>
    // )
  }

  render () {
    let {modalType, modalData, modalVisible} = this.props
    if (!modalType) return null
    // proj => datasource
    let proj = modalData.project
    let parentId = _.get(proj, 'id')
    let dataPool = this.props[typeMap[modalType]]
    let title = `设置项目【${proj.title || proj.name}的】${modalType}权限`
    let all = dataPool.filter(d => {
      return d.parentId === parentId
    })
    return (
      <Modal
        title={title}
        width={800}
        visible={modalVisible}
        onCancel={this.close}
        footer={this.renderFooter()}
      >
        {this.renderButtons()}
        {
          all.map(this.renderItem)
        }
      </Modal>
    )

  }
}
