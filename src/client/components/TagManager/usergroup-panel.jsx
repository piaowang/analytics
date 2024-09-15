/**
 * 分群信息和更新操作面板
 */
/**
 * 标签过滤UI
 */

import React from 'react'
import { SaveOutlined } from '@ant-design/icons';
import {
  Button, Popover, Tabs,
  Input, message
} from 'antd'
import _ from 'lodash'
import {getDiff} from './common'
import toUgFilters from 'common/slice-filter-to-ug-filter'
import deepCopy from 'common/deep-copy'
import withAutoFocus from '../Common/auto-focus'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import {addUsergroup, updateUsergroup} from '../../actions'

const {TabPane} = Tabs
const InputWithAutoFocus = withAutoFocus(Input)

const mapStateToProps = () => ({})
const mapDispatchToProps = dispatch => bindActionCreators({addUsergroup, updateUsergroup}, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class UsergroupPanel extends React.Component {

  state = {
    title: '',
    description: '',
    visible: false
  }

  componentWillReceiveProps(nextProps) {
    this.setState(
      _.pick(nextProps.usergroup, ['title', 'description'])
    )
  }

  saveAs = () => {
    this.submit(null, true)
  }

  submit = (e, isSave) => {
    let {filters, relation} = this.props
    let usergroup = deepCopy({
      ...this.props.usergroup,
      ...this.state
    })
    //TODO
    usergroup.composeInstruction[0].config.tagFilters = [{op: relation, eq: filters}]
    // usergroup.params.tagFilters = [{op: relation, eq: filters}]
    let {id} = usergroup
    let old = _.find(this.props.usergroups, u => u.id === id) || {}
    let diff = getDiff(old, usergroup)
    this.setState({
      visible: false
    })
    if (isSave) {
      return this.props.addUsergroup(usergroup, res => {
        if (res) {
          let link = `/console/tag-users?ugId1=${res.result.id}`
          message.success(
            <div>
              添加分群成功
              <a href={link} className="pointer mg1l">查看分群用户</a>
            </div>,
            15
          )
        }
      })
    }
    this.props.updateUsergroup(id, diff, res => {
      if (res) {
        message.success('更新分群成功')
      }
    })
  }

  onClick = () => {
    this.setState({
      visible: !this.setState.visible
    })
  }

  onChange = (e, type) => {
    this.setState({
      [type]: e.target.value
    })
  }

  renderForm = (type) => {
    let {
      title,
      description
    } = this.state
    let text = type === 'save-as'
      ? '保存'
      : '更新'
    let func = type === 'save-as'
      ? this.saveAs
      : this.submit
    return (
      <div>
        <div className="pd1b">
          <span className="block mg1b">分群名称:</span>
          <InputWithAutoFocus
            value={title}
            className="block width-100"
            onChange={e => this.onChange(e, 'title')}
          />
        </div>
        <div className="pd1b">
          <span className="block mg1b">分群备注:</span>
          <InputWithAutoFocus
            value={description}
            className="block width-100"
            onChange={e => this.onChange(e, 'description')}
          />
        </div>
        <Button
          type="primary"
          onClick={func}
          icon={<SaveOutlined />}
          className="width-100 mg2t"
        >{text}</Button>
      </div>
    );
  }

  renderUpdatePanel = () => {
    return (
      <div className="width300">
        <Tabs defaultActiveKey="update">
          <TabPane
            tab="另存为"
            key="save-as"
          >
            {this.renderForm('save-as')}
          </TabPane>
          <TabPane
            tab="更新"
            key="update"
          >
            {this.renderForm('update')}
          </TabPane>
        </Tabs>
      </div>
    )
  }

  render() {
    let {
      title,
      params
    } = this.props.usergroup
    let total = _.get(params, 'total')
    let {visible} = this.state
    if (!title) {
      return null
    }
    return (
      <div className="tag-ug-panel-wrap tag-setion-wrap">
        <div className="tag-ug-panel-inner tag-setion-inner">
          <div className="pd2">
            <div className="fix">
              <div className="fleft line-height30">
                <b className="iblock">分群</b>:
                <span
                  className="mw300 elli iblock mg1l"
                  title={title}
                >{title}</span>
                <span
                  className="mg1l iblock color-grey"
                >({total})</span>
              </div>
              <div className="fright">
                <Popover
                  content={this.renderUpdatePanel()}
                  trigger="click"
                  visible={visible}
                  placement="bottomRight"
                >
                  <Button
                    type="success"
                    icon={<SaveOutlined />}
                    onClick={this.onClick}
                  >
                    更新分群
                  </Button>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

}
