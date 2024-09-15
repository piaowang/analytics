/**
 * 模型编辑框
 */
import { Component } from 'react'
import getMetrics from './metrics-definition'
import { SaveOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Checkbox, Button, Tooltip, message } from 'antd';
import _ from 'lodash'
import {browserHistory} from 'react-router'
// import condition from './condition-definition'

const FormItem = Form.Item
// const Option = Select.Option
// const CheckboxGroup = Checkbox.Group

const formItemLayout = {
  labelCol: {
    span: 5
  },
  wrapperCol: {
    span: 19
  }
}

const tailFormItemLayout = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0
    },
    sm: {
      span: 14,
      offset: 6
    }
  }
}

class EditBox extends Component {
  state = {
    tempMetrics: []
  }

  componentDidMount() {
    const {model} = this.props
    let {metricalField} = model && model.params || {}
    let metricObjs = getMetrics(metricalField || this.getMetricalFieldFromDataSource())

    // 排除不存在的指标
    let metricNameSet = new Set(metricObjs.map(mo => mo.name))
    this.setState({
      tempMetrics: model.params.metrics.filter(mName => metricNameSet.has(mName))
    })
  }

  getMetricalFieldFromDataSource() {
    const {datasourceCurrent} = this.props
    let dsOfModel = datasourceCurrent
    let dimNames = _.get(dsOfModel, 'params.commonMetric') || []
    return dimNames[0]
  }

  renderMetrics(metricObjs) {
    let {tempMetrics} = this.state

    let metricsGroup = _.groupBy(metricObjs, mo => mo.group)

    let selectedMetricsSet = new Set(tempMetrics)
    let moMapper = ((mo, i) => {
      return (
        <Tooltip
          key={mo.name}
          overlay={mo.description}
        >
          <Checkbox
            onChange={ev => {
              if (ev.target.checked) {
                if (tempMetrics.length < 6) {
                  this.setState(prevState => {
                    return {
                      tempMetrics: [...prevState.tempMetrics, mo.name]
                    }
                  })
                } else {
                  message.error('最多可同时选择 6 个')
                }
              } else {
                this.setState(prevState => {
                  return {
                    tempMetrics: prevState.tempMetrics.filter(mName => mName !== mo.name)
                  }
                })
              }
            }}
            checked={selectedMetricsSet.has(mo.name)}
          >{mo.title}</Checkbox>
        </Tooltip>
      )
    })

    return _.flatMap(_.keys(metricsGroup), gKey => [...metricsGroup[gKey].map(moMapper), <br key={gKey}/>])
  }

  render() {
    let {tempMetrics} = this.state
    const {model} = this.props
    let {metricalField} = model && model.params || {}
    let metricObjs = getMetrics(metricalField || this.getMetricalFieldFromDataSource())

    return (
      <div className="pd2t borderb bordert pd2x pd1y">
        <div className="width600">
          <p className="font12 color-999 mg2l mg2b">提示：可同时选择6项</p>

          <FormItem
            {...formItemLayout}
            label="网站基础指标"
            hasFeedback
            required
          >
            {this.renderMetrics(metricObjs.filter(mo => mo.group === 0))}
          </FormItem>

          <FormItem
            {...formItemLayout}
            label="流量质量指标"
            hasFeedback
            required
          >
            {this.renderMetrics(metricObjs.filter(mo => mo.group !== 0))}
          </FormItem>

          <FormItem {...tailFormItemLayout}>
            <Button
              type="success"
              icon={<SaveOutlined />}
              size="large"
              onClick={() => {
                this.props.onChange('params.metrics', _.orderBy(tempMetrics, mName => _.findIndex(metricObjs, mo => mo.name === mName)))
                browserHistory.push(`/console/traffic-analytics/${this.props.model.id}`)
              }}
            >确定</Button>
          </FormItem>
        </div>
      </div>
    );
  }
}

export default EditBox
