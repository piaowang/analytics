import React, { useState } from 'react'
import Icon2 from '../../Common/sugo-icon'
import { Dropdown, Menu, Modal } from 'antd'
import _ from 'lodash'
import { ClassNames } from '@emotion/core'
import { Anchor } from '../../Common/anchor-custom'

export const DropDownPopover = props => {
  const { params, styleConfig = {}, className } = props
  const { color, size, fontWeight, rotate, iconType, iconSrc, popovers, fontSize, modalWidth, modalHeight, modelCloseColor, modelCloseSize } = styleConfig || {}
  const [popoverLink, setPopoverLink] = useState(null)

  const menu = (
    <Menu theme='dark'>
      {_.map(popovers, (popInfo, idx) => {
        if (popInfo.target === '_blank') {
          return (
            <Menu.Item key={idx}>
              <Anchor target='_blank' rel='noopener noreferrer' href={popInfo.url} style={{ fontSize }}>
                {popInfo.iconSrc ? <img src={popInfo.iconSrc} alt='' className='mg1r' /> : null}
                {popInfo.title}
              </Anchor>
            </Menu.Item>
          )
        }
        return (
          <Menu.Item>
            <a
              rel='noopener noreferrer'
              href='#'
              onClick={ev => {
                ev.preventDefault()
                setPopoverLink(popInfo.url)
              }}
              style={{ fontSize }}
            >
              {popInfo.title}
            </a>
          </Menu.Item>
        )
      })}
    </Menu>
  )
  return (
    <div className={`height-100 relative ${className}`}>
      <Dropdown overlay={menu}>
        {iconType === 'antd' ? (
          <Icon2
            type={iconSrc}
            className='center-of-relative pointer'
            style={{
              color,
              transform: `translate(-50%, -50%) rotate(${rotate || 0}deg)`,
              fontSize: size,
              fontWeight
            }}
          />
        ) : (
          <img
            className='center-of-relative pointer'
            style={{
              transform: `translate(-50%, -50%) rotate(${rotate || 0}deg)`,
              width: size,
              height: size
            }}
            src={iconSrc}
            alt=''
          />
        )}
      </Dropdown>
      <ClassNames>
        {({ css, cx }) => {
          return (
            <Modal
              visible={!!popoverLink}
              footer={null}
              width={modalWidth || (window.innerWidth * 1172) / 1920}
              onCancel={() => setPopoverLink(null)}
              bodyStyle={{
                padding: 0,
                height: modalHeight || `${(window.innerWidth * 660) / 1920}px`
              }}
              wrapClassName={css({
                '.ant-modal-close span': {
                  color: modelCloseColor,
                  fontSize: `${modelCloseSize}px`
                }
              })}
            >
              {popoverLink ? <iframe src={popoverLink} frameBorder='0' width='100%' height='100%' className='block' /> : null}
            </Modal>
          )
        }}
      </ClassNames>
    </div>
  )
}
