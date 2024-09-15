import React, { Component } from 'react'
import { SearchOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Button } from 'antd';
const FormItem = Form.Item

class FilterForm extends Component {
  state = {
    val: ''
  }

  lockChange = async val => {
    const { getData } = this.props
    if(getData && typeof getData === 'function') {
      await getData()
    }
    await this.props.filter(val)
  }

  render(){
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
    return (
      <div className="filter-box">
        <Form layout="inline" onSubmit={this.handleSearch}>
          <FormItem {...formItemLayout} label={'任务名称'}>
            <Input 
              placeholder={'输入任务名称'} 
              value={this.state.val} 
              onChange={(e) => {
                this.setState({val: e.target.value})
              }} 
              className="mg1l"
            />
          </FormItem>
          <FormItem>
            <Button 
              icon={<SearchOutlined />} 
              type="primary" 
              htmlType="submit" 
              onClick={() =>{
                this.lockChange(this.state.val)
              }
              }
            >搜索</Button>
          </FormItem>
        </Form>
      </div>
    );
  }
}

export default FilterForm
