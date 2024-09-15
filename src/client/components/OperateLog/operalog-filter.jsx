import React, { Component } from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { Input, Button, Select, Tooltip } from 'antd';
import { resultFilterArr } from './setting'
import TimePicker from '../Common/time-picker'
import Fetch from '../../common/fetch-final'
import { convertDateType, isRelative } from '../../../common/param-transform'
import moment from 'moment'

const FormItem = Form.Item
const Option = Select.Option


class FilterForm extends Component {

  state = {
    typeFilterArr: [],
    expand: false,
    timeRange: '-7 day'
  }

  componentWillMount() {
    this.getData()
  }

  getData = async () => {
    let res = await Fetch.get(`/app/logs/apiTitles`)
    if (res) {
      let typeFilterArr = _.get(res, 'result.apiTitles', [])
      typeFilterArr = typeFilterArr.map(i => ({
        name: i,
        value: i
      }))
      this.setState({
        typeFilterArr
      })
    }
  }

  handleSearch = (e) => {
    const { timeRange } = this.state
    e.preventDefault()
    this.props.form.validateFields((err, values) => {
      if (err) {
        return
      }
      const { doFetchList } = this.props
      let filter = {}
      filter.ip = values.IP
      filter.username = values.username
      filter.operaResult = values.operaResult
      filter.operaType = values.operaType
      filter.keyword = values.keyword,
      filter.timeRange = timeRange
      doFetchList(filter)
    })
  }

  handleReset = () => {
    this.props.form.resetFields()
  }

  handleExpand = () => {
    const { expand } = this.state
    this.setState({ expand: !expand })
  }

  renderFilter() {
    const { typeFilterArr, expand } = this.state
    const { getFieldDecorator } = this.props.form
    const { timeRange } = this.state
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    const filterBox = expand ?
      [<FormItem key={'username'} label={'账号'}>
        {getFieldDecorator('username', {
          initialValue: ''
        })(
          <Input style={{ width: '100px' }} placeholder={'请输入账号'} />
        )}
      </FormItem>,
      <FormItem key={'IP'} label={'IP'}>
        {getFieldDecorator('IP', {
          initialValue: ''
        })(
          <Input style={{ width: '100px' }} placeholder={'请输入IP'} />
        )}
      </FormItem>,
      <FormItem key={'对象'} label={'对象'}>
        {getFieldDecorator('keyword', {
          initialValue: ''
        })(
          <Input style={{ width: '100px' }} placeholder={'请输入对象'} />
        )}
      </FormItem>,
      <FormItem key={'operaType'} label={'类型'}>
        {getFieldDecorator('operaType', {
          initialValue: ''
        })(
          <Select
            className="width140"
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) => option.props.value.indexOf(input) >= 0}
          >
            {
              typeFilterArr.map((item, i) => {
                return (<Option key={i} value={item.name}>
                  <Tooltip
                    placement="right"
                    title={item.name}
                  >{item.name}</Tooltip>
                </Option>)
              })
            }
          </Select>
        )}
      </FormItem>,
      <FormItem key={'operaResult'} label={'结果'}>
        {getFieldDecorator('operaResult', {
          initialValue: ''
        })(
          <Select className="width80" allowClear>
            {
              resultFilterArr.map((item, i) => {
                return (<Option key={i} value={item.value}>
                  {item.name}
                </Option>)
              })
            }
          </Select>
        )}
      </FormItem>,
      <FormItem key={'timeRange'} label={'时间'}>
        {getFieldDecorator('timeRange', {
          initialValue: ''
        })(
          <TimePicker
            style={{marginTop: '-3px'}}
            className="width120"
            dateType={relativeTime}
            dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
            // getPopupContainer={getPopupContainer}
            onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
              this.setState({
                timeRange: relativeTime === 'custom' ? [since, until] : relativeTime
              })
            }}
          />
        )}
      </FormItem>]
      :
      [<FormItem key={'username'} label={'账号'}>
        {getFieldDecorator('username', {
          initialValue: ''
        })(
          <Input style={{ width: '100px' }} placeholder={'请输入账号'} />
        )}
      </FormItem>,
      <FormItem key={'operaType'} label={'类型'}>
        {getFieldDecorator('operaType', {
          initialValue: ''
        })(
          <Select
            className="width140"
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) => option.props.value.indexOf(input) >= 0}
          >
            {
              typeFilterArr.map((item, i) => {
                return (<Option key={i} value={item.name}>
                  <Tooltip
                    placement="right"
                    title={item.name}
                  >{item.name}</Tooltip>
                </Option>)
              })
            }
          </Select>
        )}
      </FormItem>,
      <FormItem key={'timeRange'} label={'时间'}>
        {getFieldDecorator('timeRange', {
          initialValue: ''
        })(
          <TimePicker
            className="width120"
            style={{marginTop: '-3px'}}
            dateType={relativeTime}
            style={{marginTop: '-4px'}}
            dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
            // getPopupContainer={getPopupContainer}
            onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
              this.setState({
                timeRange: relativeTime === 'custom' ? [since, until] : relativeTime
              })
            }}
          />
        )}
      </FormItem>
      ]
    return filterBox
  }

  render() {
    const { expand } = this.state
    return (
      <div className="filter-box">
        <Form layout="inline" onSubmit={this.handleSearch}>
          {this.renderFilter()}
          <Form.Item>
            <a style={{fontSize: 12 }} onClick={this.handleExpand}>
              { expand ? '收起' : '展开' } <LegacyIcon type={expand ? 'left' : 'right'} />
            </a>
          </Form.Item>
          <Form.Item>
            <Button icon={<SearchOutlined />} type="primary" htmlType="submit" >搜索</Button>
          </Form.Item>
          <Form.Item>
            <Button icon={<CloseCircleOutlined />}  onClick={this.handleReset}>
            清空
            </Button>
          </Form.Item>
        </Form>
      </div>
    );
  }
}

const HistoryFilterForm = Form.create()(FilterForm)

export default HistoryFilterForm
