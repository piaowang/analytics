import React, { PureComponent } from 'react'
import { Modal, Select } from 'antd'
import { Form } from '@ant-design/compatible';
import { fetchDimensions } from './fetcher'

export default class EffectSettings extends PureComponent {

  state = {
    project_id: null,
    spreadActiveFieldList: undefined,
    dealActiveFieldList: undefined
  }

  componentDidUpdate() {
    if (_.get(this.props.item,'params.spreadEffectProject') && !this.state.spreadActiveFieldList) {
      this.getDimensions(_.get(this.props.item,'params.spreadEffectProject'), 'spreadActiveFieldList')
    }
    if (_.get(this.props.item,'params.dealEffectProject')  && !this.state.dealActiveFieldList) {
      this.getDimensions(_.get(this.props.item,'params.dealEffectProject'), 'dealActiveFieldList')
    }
  }

  async getDimensions(datasource_id, key) {
    let dimensions = await fetchDimensions(datasource_id)
    this.setState({
      [key]: dimensions.data || []
    })
  }

  renderForm() {
    const { projectList = [], item = {}, form, formItemLayout } = this.props
    const { spreadActiveFieldList = [], dealActiveFieldList = [] } = this.state
    const projectListIdDict = _.keyBy(projectList,'datasource_id')

    const { getFieldDecorator, setFieldsValue } = form
    return (
      <React.Fragment>
        <Form.Item
          {...formItemLayout}
          label="传播效果数据集"
          
        >
          {getFieldDecorator('params.spreadEffectProject', {
            initialValue: _.get(item, 'params.spreadEffectProject')
            // rules: [{ required: true, message: '请选择用户群' }]
          }) (
            <Select
              allowClear
              showSearch
              className='width-100'
              optionFilterProp="children"
              getPopupContainer={node => node.parentNode}
              onChange={async (v) => {
                setFieldsValue({
                  'params.spreadLinkField': null,
                  'params.spreadStaffIdField': null
                })
                if (!projectListIdDict[v]) return this.setState({ spreadActiveFieldList: [] })
                await this.getDimensions(projectListIdDict[v].datasource_id, 'spreadActiveFieldList')
              }}
              filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
            >
              {
                projectList.map(item => (
                  <Select.Option key={item.id} value={item.datasource_id}>
                    {item.name}
                  </Select.Option>
                ))
              }
            </Select>
          )}
        </Form.Item>
        <Form.Item
          {...formItemLayout}
          label="链接字段"
          
        >
          {getFieldDecorator('params.spreadLinkField', {
            initialValue: _.get(item, 'params.spreadLinkField')
            // rules: [{ required: true, message: '请选择用户群' }]
          }) (
            <Select
              allowClear
              showSearch
              className='width-100'
              getPopupContainer={node => node.parentNode}
              optionFilterProp="children"
              filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
            >
              {
                (spreadActiveFieldList || []).map(item => (
                  <Select.Option key={item.id} value={item.name}>
                    {item.title || item.name}
                  </Select.Option>
                ))
              }
            </Select>
          )}
        </Form.Item>
        {/* <Form.Item
          {...formItemLayout}
          label="员工id字段"
          
        >
          {getFieldDecorator('params.spreadStaffIdField', {
            initialValue: _.get(item, 'params.spreadStaffIdField')
            // rules: [{ required: true, message: '请选择用户群' }]
          }) (
            <Select
              allowClear
              showSearch
              className='width-100'
              getPopupContainer={node => node.parentNode}
              optionFilterProp="children"
              filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
            >
              {
                (spreadActiveFieldList || []).map(item => (
                  <Select.Option key={item.id} value={item.name}>
                    {item.title || item.name}
                  </Select.Option>
                ))
              }
            </Select>
          )}
        </Form.Item> */}
        <Form.Item
          {...formItemLayout}
          label="成交效果数据集"
        >
          {getFieldDecorator('params.dealEffectProject', {
            initialValue: _.get(item, 'params.dealEffectProject')
            // rules: [{ required: true, message: '请选择用户群' }]
          }) (
            <Select
              allowClear
              showSearch
              className='width-100'
              getPopupContainer={node => node.parentNode}
              onChange={async (v) => {
                setFieldsValue({
                  'params.dealLinkField': null,
                  'params.dealStaffIdField': null
                })
                if (!projectListIdDict[v]) return this.setState({ dealActiveFieldList: [] })
                await this.getDimensions(projectListIdDict[v].datasource_id, 'dealActiveFieldList')
              }}
              optionFilterProp="children"
              filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
            >
              {
                projectList.map(item => (
                  <Select.Option key={item.id} value={item.datasource_id}>
                    {item.name}
                  </Select.Option>
                ))
              }
            </Select>
          )}
        </Form.Item>
        <Form.Item
          {...formItemLayout}
          label="链接字段"
          
        >
          {getFieldDecorator('params.dealLinkField', {
            initialValue: _.get(item, 'params.dealLinkField')
            // rules: [{ required: true, message: '请选择用户群' }]
          }) (
            <Select
              allowClear
              showSearch
              className='width-100'
              getPopupContainer={node => node.parentNode}
              optionFilterProp="children"
              filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
            >
              {
                dealActiveFieldList.map(item => (
                  <Select.Option key={item.id} value={item.name}>
                    {item.title || item.name}
                  </Select.Option>
                ))
              }
            </Select>
          )}
        </Form.Item>
        {/* <Form.Item
          {...formItemLayout}
          label="员工id字段"
          
        >
          {getFieldDecorator('params.dealStaffIdField', {
            initialValue: _.get(item, 'params.dealStaffIdField')
            // rules: [{ required: true, message: '请选择用户群' }]
          }) (
            <Select
              allowClear
              showSearch
              className='width-100'
              getPopupContainer={node => node.parentNode}
              optionFilterProp="children"
              filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
            >
              {
                dealActiveFieldList.map(item => (
                  <Select.Option key={item.id} value={item.name}>
                    {item.title || item.name}
                  </Select.Option>
                ))
              }
            </Select>
          )}
        </Form.Item> */}
      </React.Fragment>
    )
  }

  render() {
    const { visible, onCancel, onlyForm, onOk } = this.props
    if (onlyForm) return this.renderForm()

    return (
      <div>
        <Modal
          title={'效果设置'}
          visible={visible}
          destroyOnClose
          onOk={onOk}
          onCancel={onCancel}
        >
          {this.renderForm()}
        </Modal>
      </div>
    )
  }
}
