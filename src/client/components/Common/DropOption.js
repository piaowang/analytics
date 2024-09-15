
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { BarsOutlined, DownOutlined } from '@ant-design/icons'
import { Dropdown, Button, Menu } from 'antd'

export default class DropOption extends Component {
  render() {
    const { onMenuClick, menuOptions = [], buttonStyle, dropdownProps } = this.props
    const menu = menuOptions.map((item, i) => <Menu.Item onClick={() => item.click && item.click()} key={`list-btn-${i}`}>{item.label || item}</Menu.Item>)
    return (
      <Dropdown
        overlay={<Menu onClick={onMenuClick}>{menu}</Menu>}
        {...dropdownProps}
      >
        <Button style={{ border: 'none', ...buttonStyle }}>
          <BarsOutlined style={{ marginRight: 2 }} />
          <DownOutlined />
        </Button>
      </Dropdown>
    )
  }
}

DropOption.propTypes = {
  onMenuClick: PropTypes.func,
  menuOptions: PropTypes.array.isRequired,
  buttonStyle: PropTypes.object,
  dropdownProps: PropTypes.object
}

// const DropOption = ({
//   onMenuClick, menuOptions = [], buttonStyle, dropdownProps
// }) => {
//   const menu = menuOptions.map((item, i) => <Menu.Item onClick={item.click } key={`list-btn-${i}`}>{item.label}</Menu.Item>)
//   return (<Dropdown
//     overlay={<Menu onClick={onMenuClick}>{menu}</Menu>}
//     {...dropdownProps}
//   >
//     <Button style={{ border: 'none', ...buttonStyle }}>
//       <Icon style={{ marginRight: 2 }} type="bars" />
//       <Icon type="down" />
//     </Button>
//   </Dropdown>)
// }

// DropOption.propTypes = {
//   onMenuClick: PropTypes.func,
//   menuOptions: PropTypes.array.isRequired,
//   buttonStyle: PropTypes.object,
//   dropdownProps: PropTypes.object,
// }

// export default DropOption
