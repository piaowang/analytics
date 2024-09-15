import React from 'react'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Button, Tooltip } from 'antd';
import classNames from 'classnames'

const SortButton = ({value, onChange, disabled, type = 'button', title = '切换排序', className, placement}) => {
  if (type === 'icon') {
    return (
      <Tooltip
        title={title}
        placement={placement}
        arrowPointAtCenter
      >
        <LegacyIcon
          className={classNames('pointer', className, {disabeld: disabled})}
          type={value === 'asc' ? 'arrow-up' : 'arrow-down'}
          onClick={() => {
            let nextSort = value === 'asc' ? 'desc' : 'asc'
            onChange(nextSort)
          }}
        />
      </Tooltip>
    );
  }
  return (
    <Tooltip
      title="切换排序"
      placement={placement}
      arrowPointAtCenter
    >
      <Button
        className={className}
        type="ghost"
        disabled={disabled}
        onClick={() => {
          let nextSort = value === 'asc' ? 'desc' : 'asc'
          onChange(nextSort)
        }}
      >
        {value === 'asc' ? '↑' : '↓'}
      </Button>
    </Tooltip>
  )
}
export default SortButton
