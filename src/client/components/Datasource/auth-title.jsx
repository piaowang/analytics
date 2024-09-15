import { QuestionCircleOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import React from 'react'

export default class AuthTitle extends React.Component {

  shouldComponentUpdate() {
    return false
  }

  render() {
    let {title} = this.props
    const content = (
      <div className="pd1">只有授权的<b>角色</b>可以在数据分析中查看对应的<b>{title}</b></div>
    )
    return (
      <p>授权访问  
        <Popover
          placement="topLeft"
          content={content}
        >
          <QuestionCircleOutlined className="font14 mg1l" />
        </Popover>
      </p>
    );
  }
}


