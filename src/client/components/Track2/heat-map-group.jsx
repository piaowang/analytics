/**
 * Created by xj on 17/10/31.
 */
import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Spin, Button, message } from 'antd';
import _ from 'lodash'
import DruidQuery from '../../models/druid-query/resource'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 18 }
}


class HeatMapEventGroup extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      eventNames: [],
      loading: false
    }
  }

  componentWillMount() {
    this.resetComponent()
    this.getEventName()
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.selectEventPath !== nextProps.selectEventPath) {
      this.resetComponent()
    }
  }

  resetComponent = () => {
    this.props.form.resetFields()
  }

  save = () => {
    const { form } = this.props
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        let { changeState, eventGroups, selectEventPath } = this.props
        eventGroups = _.cloneDeep(eventGroups)
        const index = _.findIndex(eventGroups, p => p.event_path === selectEventPath)
        const val = _.get(values, 'event_names', [])
        if (index >= 0) {
          _.set(eventGroups, [index, 'event_names'], val)
        } else {
          eventGroups.push({ event_path: selectEventPath, event_names: val })
        }
        changeState({ eventGroups, selectEventPath: '' })
      }
    })
  }

  delete = () => {
    let { changeState, eventGroups, selectEventPath } = this.props
    changeState({ eventGroups: eventGroups.filter(p => p.event_path !== selectEventPath), selectEventPath: '' })
  }

  getEventName = async (val) => {
    this.setState({ loading: true })
    let { datasourceId } = this.props
    const params = {
      druid_datasource_id: datasourceId,
      timezone: 'Asia/Shanghai',
      dimensions: ['event_name'],
      granularity: 'P1D',
      filters: val ? [{ 'col': 'event_name', 'op': 'startsWith', 'eq': [val] }] : [],
      dimensionExtraSettings: [{ 'sortCol': 'count', 'sortDirect': 'desc', 'limit': 10 }],
      customMetrics: [{ 'name': 'count', 'formula': '1' }],
      groupByAlgorithm: 'topN',
      queryEngine: 'tindex'
    }
    const res = await DruidQuery.query(params)
    this.setState({ eventNames: _.get(res, 'result.0.resultSet', []), loading: false })
  }

  renderEventGroups = () => {
    let { eventGroups, selectEventPath, displayList, setHideList, form } = this.props
    const canDisplayEvent = _.includes(displayList, selectEventPath)
    const { getFieldDecorator } = form
    const { loading, eventNames } = this.state
    let defaultVal = _.find(eventGroups, p => p.event_path === selectEventPath) || {}
    return (
      <div>
        <div style={{ width: '100%', overflow: 'auto' }} className="borderb heat-content">
          <Form layout="horizontal" >
            <FormItem
              className="mg2b"
              {...formItemLayout}
              label="关联事件"
              hasFeedback
            >
              {
                getFieldDecorator('event_names', {
                  key: 'event_names',
                  rules: [{
                    required: true, message: '请选择事件名称'
                  }],
                  initialValue: defaultVal.event_names
                })(<Select
                  mode="multiple"
                  disabled={!selectEventPath}
                  placeholder="选择事件"
                  notFoundContent={loading ? <Spin size="small" /> : null}
                  onSearch={this.getEventName}
                  style={{ width: '100%' }}
                   >
                  {eventNames.map((d, i) => <Select.Option key={`event-names-${i}`} value={d.event_name}>{d.event_name}</Select.Option>)}
                </Select>)
              }
            </FormItem>
          </Form>
        </div>

        <div className="alignright mg1t">
          <Button
            className="mg1b mg1r"
            onClick={this.delete}
            size="small"
            disabled={!selectEventPath}
          >
            删除
          </Button>
          <Button
            className="mg1b mg2r"
            onClick={this.save}
            type="primary"
            size="small"
            disabled={!selectEventPath}
          >
            保存
          </Button>
          {/* <Button
            className="mg1b mg1l"
            onClick={() => setHideList()}
            size="small"
            disabled={!selectEventPath}
          >
            {canDisplayEvent ? '显示' : "隐藏"}
          </Button> */}
        </div>
      </div >
    )
  }
  
  render() {
    return this.renderEventGroups()
  }
}

export default Form.create()(HeatMapEventGroup)
