import React, { PureComponent } from 'react'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Select, Input, Button } from 'antd'
import { reviewStatus, reviewClass } from './store/constants'

const Option = Select.Option

export default class SearchComponent extends PureComponent {
  onStatusChange = val => {
    this.props.changeQuery({ data: { status: parseInt(val) } })
  };

  onStatusChange = (val) => {
    this.props.changeState({ data: { status: val } })
  }

  onTypeChange = (val) => {
    this.props.changeState({ data: { type: val } })
  }

  onKeyWordChange = (e) => {
    this.props.changeState({ data: { keyWord: e.target.value } })
  }

  goSearch = () => {
    this.props.getList()
  }

  cleanSearch = () => {
    this.props.changeQuery({ data: { status: undefined, type: undefined, keyWord: undefined } })
  }

  renderStatus = () => {
    return (
      <Select
        allowClear
        value={this.props.status || undefined}
        placeholder="请选择审核状态"
        className="itblock width200 mg1r"
        onChange={val => {
          this.onStatusChange(val)
        }}
      >
        {reviewStatus.map(item => (
          <Option key={item.value} value={item.value}>
            {item.text}
          </Option>
        ))}
      </Select>
    )
  }

  renderClass = () => {
    return (
      <Select
        allowClear
        value={this.props.type || undefined}
        placeholder="请选择类别"
        className="itblock width200 mg1r"
        onChange={val => {
          this.onTypeChange(val)
        }}
      >
        {reviewClass.map(item => (
          <Option key={item.value} value={item.value}>
            {item.text}
          </Option>
        ))}
      </Select>
    )
  };

  renderSearchInput = () => (
    <Input value={this.props.keyWord}
      onChange={(val) => { this.onKeyWordChange(val) }}
      placeholder="搜索"
      className="itblock width260"
    />
  )

  render () {
    return (
      <div className="pd2b alignleft">
        {this.renderStatus()}
        {this.renderClass()}
        {this.renderSearchInput()}
        <Button
          type="primary"
          icon={<SearchOutlined />}
          style={{ marginLeft: '5px' }}
          onClick={() => {
            this.goSearch()
          }}
        >
          搜索
        </Button>
        <Button
          icon={<DeleteOutlined />}
          style={{ marginLeft: '5px' }}
          onClick={() => {
            this.cleanSearch()
          }}
        >
          清空
        </Button>
      </div>
    )
  }
}
