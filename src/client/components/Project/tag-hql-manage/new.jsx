import { PureComponent } from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Button, Input, Transfer, Radio, notification } from 'antd';
import _ from 'lodash'
import { validateFieldsAndScroll } from 'client/common/decorators'
import CronPicker from '../../Common/cron-picker'
import { WhiteSpace } from 'antd-mobile';

const FormItem = Form.Item
const RadioGroup = Radio.Group

const getPopupContainer = () => document.querySelector('.createHQLModal div.ant-modal-body')

/**
 * @description 创建标签计算任务
 * @export
 * @class CreateHQL
 * @extends {PureComponent}
 */
@Form.create()
@validateFieldsAndScroll
export default class CreateHQL extends PureComponent {

  constructor() {
    super()
    this.state = {
      tags: [],
      targetKeys: []
    }
  }

  componentDidMount() {
    const { data = {}, tagDimenions } = this.props
    const targetKeys = data.tags || []
    const tags = tagDimenions.filter(dim => dim.name !== '__time').map(dim => {
      return {
        key: dim.id,
        title: dim.title || dim.name,
        chosen: targetKeys.includes(dim.id) // 是否已选择
      }
    })
    this.setState({targetKeys, tags})
  }

  handleSubmit = async () => {
    const { save, data } = this.props
    const { targetKeys } = this.state
    let newData = await this.validateFieldsAndScroll()
    if (!targetKeys.length) {
      notification.warn({
        message: '提示',
        description: '请选择关联标签'
      })
      return
    }
    if (!newData) {
      return
    }
    // 编辑操作合并数据
    if (data && data.id) {
      newData = _.assign(data, newData)
    }
    newData.tags = targetKeys
    save(newData)
  }

  onTransferChange = (targetKeys) => {
    this.setState({ targetKeys })
  }

  checkRules = (rule, value, callback) => {
    const { cronExpression } = value
    if (!cronExpression || cronExpression === '* * * * *') {
      callback('请设置调度频率!')
      return
    }
    callback()
  }

  render() {
    let { data = {}, visible, saveing, hideModal } = this.props
    let title = data.id ? '编辑标签计算任务' : '创建标签计算任务'
    const { getFieldDecorator } = this.props.form
    const { targetKeys, tags } = this.state
    const status = data.status === 1
    const footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={saveing ? 'loading' : 'check'} />}
          loading={saveing}
          className="mg1r iblock"
          onClick={this.handleSubmit}
        >{saveing ? '提交中...' : '提交'}</Button>
      </div>
    )
    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleSubmit}
        onCancel={hideModal}
        width={700}
        className="createHQLModal"
        footer={status ? null : footer}
      >
        <Form>
          <FormItem {...formItemLayout} label="标题">
            {getFieldDecorator('title', {
              initialValue: data.title,
              rules: [{ required: true, message: '请输入标签计算任务标题', whitespace:true }]
            }) (
              <Input />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="HQL语句">
            {getFieldDecorator('hql', {
              initialValue: data.hql,
              rules: [{ required: true, message: '请输入HQL', whitespace:true }]
            }) (
              <Input.TextArea className="line-height22" placeholder="insert into tag_table_name(distinct_id, age) select distinct_id, age from hive_table_name" rows={4} />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="关联标签">
            {getFieldDecorator('tags', {
              initialValue: tags
            }) (
              <Transfer
                dataSource={tags}
                showSearch
                listStyle={{
                  width: 200,
                  height: 300
                }}
                operations={[(<i className="anticon anticon-right" />), (<i className="anticon anticon-left" />)]}
                targetKeys={targetKeys}
                onChange={this.onTransferChange}
                render={item => `${item.title}`}
              />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="频率">
            {getFieldDecorator('rules', {
              initialValue: _.get(data, 'rules', { unitType: '0', period: 'day', cronExpression: '0 0 * * *' }),
              rules: [{ validator: this.checkRules }]
            }) (
              <CronPicker getPopupContainer={getPopupContainer} />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="优先级">
            {getFieldDecorator('weight', {
              initialValue: data.weight || 0
            }) (
              <RadioGroup >
                <Radio value={0}>普通</Radio>
                <Radio value={1}>中等</Radio>
                <Radio value={2}>优先</Radio>
              </RadioGroup>
            )}
          </FormItem>
        </Form>
      </Modal>
    )
  }
}

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}
