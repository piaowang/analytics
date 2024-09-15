import React, { useState, useEffect } from 'react'
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons'
import Icon2 from '../Common/sugo-icon'
import { Input, Tooltip, message } from 'antd'
import Link from '../Common/link-nojam'
import _ from 'lodash'

export default function EditTitle(props) {
  const { title, link, isShowEditIcon, onOk, isList } = props

  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(title)

  useEffect(() => {
    setName(title)
  }, [title])

  if (isEditing) {
    return (
      <React.Fragment>
        <Input
          value={name}
          style={{ width: 200 }}
          onChange={(e) => setName(e.target.value)} autoFocus

        />
        <Tooltip title="取消">
          <CloseOutlined className="pd1 color-ccc pointer" onMouseDown={() => setIsEditing(false)} />
        </Tooltip>
        <Tooltip title="保存">
          <CheckOutlined
            className="pd1 color-ccc pointer"
            onMouseDown={() => {
              if (!_.trim(name)) {
                return message.error('分群名称不能为空')
              }
              if (name.length > 50 ) {
                return message.error('分群名称不能超过50个字符')
              }
              onOk(name, setIsEditing(false))
            }}
          />
        </Tooltip>
      </React.Fragment>
    )
  }
  if (isList) {
    return (
      <React.Fragment>
        <Link to={link} >
          <Icon2 type="sugo-user" />{title}
        </Link>
        <EditOutlined
          hidden={!isShowEditIcon}
          className="mg1l color-ccc ug-edit-icon"
          onClick={() => setIsEditing(true)}
        />
      </React.Fragment>
    )
  }

  return (
    <React.Fragment>
      <div className="width-80 iblock elli">
        <Link to={link}>
          <Icon2 type="sugo-user" /> {title}
        </Link>
      </div>
      <EditOutlined
        hidden={!isShowEditIcon}
        className="mg1l color-ccc ug-edit-icon"
        onClick={() => setIsEditing(true)}
      />
    </React.Fragment>
  )
}
