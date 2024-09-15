import React from 'react'
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Row, Col, Tabs, Collapse, Input, Select, Tooltip } from 'antd';
import classNames from 'classnames'

const Option = Select.Option
const TabPane = Tabs.TabPane
const InputGroup = Input.Group
const Panel = Collapse.Panel

/*{
  name: 'groupName', // 组名
  helpText: 'xxx',   // 组名后显示的问号帮助文本
  items: [
    name: '',
    value: any,

  ]
}*/
/**
 * 属性组的数据对象
 *
 */
// const groupData = {}

/**
 * name
 */
const EditorGroup = props => {
  const { title, helpText, extra, prefixCls = 'subGroup' } = props
  const header = [
    <span key="text">{title}</span>,
    helpText && helpText.length > 0
      ? <Tooltip key="help" title={helpText}>
        <QuestionCircleOutlined />
      </Tooltip>
      : false,
    // 下面这行如果放出来 表格的样式编辑器中 标题那里有两个 显示 的checkbox 对其他地方的影响未知
    extra ? <div key="extra" className="fright pd1r">{extra}</div> : false
  ]
  return prefixCls === 'subGroup'
    ?
    <div className="subGroup">
      <div className="subGroup-header">{header}</div>
      <div className="subGroup-content">{props.children}</div>
    </div>
    :
    <Panel 
      {...props} 
      extra={false}//避免与header的extra内容重复
      prefixCls={prefixCls} 
      header={header}
    >
      {props.children}
    </Panel>
}

export default EditorGroup
