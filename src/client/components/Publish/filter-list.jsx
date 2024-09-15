import React from 'react'
import {Input,  Select} from 'antd'

const { Search, Group} = Input
const { Option } = Select

export default class filterList extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      key: 'content_datasource_id'
    }
  }

  onSearch = (value)=> {
    const {onsearch} = this.props
    const {key} = this.state
    onsearch([key, value])
  }

  onChange = (selctKye) => {
    this.setState({key: selctKye})
  }

  render() {
    const {searchOpts} = this.props
    const [key, value] = searchOpts
    const {key:defaultKey} = this.state
    return (<Group compact>
      <Select defaultValue={key || defaultKey} onChange={this.onChange}>
        <Option value="content_datasource_id">所属数据源</Option>
        {/* <Option value="content_type">分享类别</Option> */}
        <Option value="params.shareContentName">分享内容名称</Option>
      </Select>
      <Search
        defaultValue={value || ''}
        placeholder="请输入内容"
        onSearch={this.onSearch}
        style={{ width: 250}}
        enterButton
      />
    </Group>)
  }
}
