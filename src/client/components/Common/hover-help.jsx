import {Popover, Tooltip} from 'antd'
import { Icon } from '@ant-design/compatible'
import classNames from 'classnames'
import React from 'react'
import {Anchor} from './anchor-custom'

export default function HoverHelp({
  content, addonBefore, addonAfter,
  type = 'dark', placement, className,
  arrowPointAtCenter,
  icon = 'question-circle',
  link,
  ...rest
}) {
  let iconDom = (
    <Icon
      {...rest}
      type={icon}
      className={classNames('color-blue-grey', className)}
      theme="filled"
    />
  )
  let linkDom = link
    ? (
      <Anchor
        href={link}
        target="_blank"
        className="color-grey pointer"
      >
        {iconDom}
      </Anchor>
    )
    : iconDom
  if (type === 'dark') {
    return (
      <Tooltip
        overlay={content}
        placement={placement}
        arrowPointAtCenter={arrowPointAtCenter}
      >
        {addonBefore}
        {linkDom}
        {addonAfter}
      </Tooltip>
    )
  }
  return (
    <Popover
      content={content}
      placement={placement}
      arrowPointAtCenter={arrowPointAtCenter}
    >
      {addonBefore}
      {linkDom}
      {addonAfter}
    </Popover>
  )
}

export function HoverHelpWithBox({content, addonBefore, addonAfter, type = 'dark', placement, wrapperProps, className,
  arrowPointAtCenter, ...rest}) {
  if (type === 'dark') {
    return (
      <Tooltip
        overlay={content}
        placement={placement}
        arrowPointAtCenter={arrowPointAtCenter}
      >
        <div {...wrapperProps} >
          {addonBefore}
          <Icon
            {...rest}
            type="question-circle"
            className={classNames('color-blue-grey', className)}
          />
          {addonAfter}
        </div>
      </Tooltip>
    )
  }
  return (
    <Popover
      content={content}
      placement={placement}
      arrowPointAtCenter={arrowPointAtCenter}
    >
      <div {...wrapperProps} >
        {addonBefore}
        <Icon
          {...rest}
          type="question-circle"
          className={classNames('color-blue-grey', className)}
        />
        {addonAfter}
      </div>
    </Popover>
  )
}
