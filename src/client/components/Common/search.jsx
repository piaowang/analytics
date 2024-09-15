/**
 * 通用搜索组件，在antd.Input.Search基础上加入清除按钮
 */
import React from 'react'
import {Icon as LegacyIcon} from '@ant-design/compatible'
import {SearchOutlined} from '@ant-design/icons'
import {Input} from 'antd'
import {withDebouncedOnChange} from './with-debounce-on-change'

export default class CommonSearch extends React.Component {

  clear = () => {
    let {onChange} = this.props
    onChange && onChange({
      target: {
        value: ''
      }
    })
  }

  render() {
    let {noWrap, className, style, ...rest} = this.props
    if (!rest.suffix && rest.value) {
      rest.suffix = (
        <LegacyIcon
          type="close-circle"
          className="pointer color-000-25"
          onClick={this.clear}
          title="清除"
          style={{height:'100%',display:'flex',justifyContent:'center',alignItems:'center'}}
        />
        // <CloseCircleOutlined className="pointer color-000-25" onClick={this.clear} title="清除" />
      )
    } else if (!rest.suffix) {
      rest.suffix = (
        <SearchOutlined className="pointer color-000-25" style={{height:'100%',display:'flex',justifyContent:'center',alignItems:'center'}} onClick={this.clear} />
      )
    }
    let dom = (
      <Input
        {...rest}
        className={noWrap ? className : undefined}
        style={noWrap ? style : undefined}
      />
    )
    if (noWrap) {
      return dom
    }
    return (
      <div {...{className, style}}>
        {dom}
      </div>
    )
  }
}

export const CommonSearchWithDebouncedOnChange = withDebouncedOnChange(CommonSearch, ev => ev.target.value, 500)
