/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-03-27 14:59:58
 * @modify date 2019-03-27 14:59:58
 * @description 智能营销-效果指标关联项目设置
 */
import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { Modal, Select } from 'antd'

export default class EffectSettings extends PureComponent {

  static propTypes = {
    visible: PropTypes.bool,
    projectList: PropTypes.array,
    data: PropTypes.object.isRequired,
    onOk: PropTypes.func,
    onCancel: PropTypes.func
  }

  state = {
    project_id: null
  }

  onOk = () => {
    const { onOk, data } = this.props
    const { project_id } = this.state
    // 校验时间
    onOk(project_id, data)
    // 设置完后清空上次设置
    this.setState({
      project_id: null
    })
  }

  onChange = project_id => {
    this.setState({
      project_id
    })
  }

  render() {
    const { visible, projectList = [], data, onCancel} = this.props
    const { project_id } = this.state
    const moduleName = data.scene_id ? '事件' : '活动'
    const title = `${moduleName}ID：${data.id}，${moduleName}名称：${data.name}`
    return (
      <div>
        <Modal
          title={title}
          visible={visible}
          destroyOnClose
          onOk={this.onOk}
          onCancel={onCancel}
        >
          <span className="mg2r">效果数据所属项目：</span>
          <Select
            value={project_id || data.project_id}
            onChange={this.onChange}
            allowClear
            showSearch
            className="width-65"
            placeholder="请选择项目"
            optionFilterProp="children"
            filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          >
            {
              projectList.filter( i => i.access_type === 1).map(item => (
                <Select.Option key={item.id} value={item.id}>
                  {item.name}
                </Select.Option>
              ))
            }
          </Select>
        </Modal>
      </div>
    )
  }
}
