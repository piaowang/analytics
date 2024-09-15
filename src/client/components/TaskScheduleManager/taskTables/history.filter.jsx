import React, { Component } from 'react'
import { CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Button, Select } from 'antd';
import { filterArr } from './setting'
import DateRangePicker from '../../Common/time-picker'
import { convertDateType } from 'common/param-transform'
import moment from 'moment'

const FormItem = Form.Item
const Option = Select.Option
const defaultDateType = '-1 days'
const formatTemplate = 'MM/DD/YYYY HH:mm'
const defaultBegin = convertDateType(defaultDateType, formatTemplate)[0]
const defaultEnd = convertDateType(defaultDateType, formatTemplate)[1]

class FilterForm extends Component {
  state = {
    dateType: defaultDateType,
    begin: defaultBegin,
    end: defaultEnd
  }

  handleSearch = (e) => {
    e.preventDefault()
    this.props.form.validateFields((err, values) => {
      if(err) {
        return
      }
      const { doFetchList } = this.props 
      const { begin, end } = this.state
      let filter={}
      filter.flowcontain = values.flow
      filter.status = values.status
      filter.begin = begin
      filter.end = end
      filter.page = 1 // 点击查询，置为第一页
      doFetchList(filter)
    })
  }

  handleReset = () => {
    this.props.form.resetFields()
    this.setState({
      dateType: defaultDateType,
      begin: defaultBegin,
      end: defaultEnd
    })
  }

  renderFilter() {
    const { getFieldDecorator } = this.props.form
    const { dateType } = this.state
    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 6 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 18 }
      }
    }

    return(
      [<FormItem key={'name'} {...formItemLayout} label={'任务名称'}>
        {getFieldDecorator('flow', {
          initialValue: ''
        })(
          <Input className="mg1l" placeholder={'输入任务名称'} />
        )}
      </FormItem>,
      <FormItem key={'status'} {...formItemLayout} label={'状态'}>
        {getFieldDecorator('status',{
          initialValue: ''
        })(
          <Select className="mg1l width100" allowClear>
            {
              filterArr.map((item, i) => {
                return (<Option key={i} value={item.value}>
                  {item.name}
                </Option>)
              })
            }
          </Select>
        )}
      </FormItem>,
      <FormItem key={'date'} label={'日期'} >
        {getFieldDecorator('date', {
        })(
          <div style={{width: '192px',
            height: '28px',
            lineHeight: '24px',
            margin: '4px 8px 4px 0px'}}
          >
            <DateRangePicker
              className="height-100 line-height14"
              prefix={''}
              alwaysShowRange
              hideCustomSelection
              style={{width: '100%'}}
              dateType={dateType}
              onChange={({dateType, dateRange}) => {
                // console.log(`dateType: ${dateType}, dateRange: ${dateRange}`)
                this.setState({
                  dateType,
                  begin: moment(dateRange[0]).format(this.props.formatTemplate),
                  end: moment(dateRange[1]).format(this.props.formatTemplate)
                })
              }}
            />
          </div>
        )}
      </FormItem>]
    )
  }

  render() {
    return (
      <div className="filter-box">
        <Form layout="inline" onSubmit={this.handleSearch}>
          {this.renderFilter()}
          <FormItem>
            <Button icon={<SearchOutlined />} type="primary" htmlType="submit">搜索</Button>
            <Button icon={<CloseCircleOutlined />} style={{ marginLeft: 8 }} onClick={this.handleReset}>
              清空
            </Button>
          </FormItem>
        </Form>
      </div>
    );
  }
}

const HistoryFilterForm = Form.create()(FilterForm)

export default HistoryFilterForm
