import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Input, Button, Modal } from 'antd'

function FieldsSettingModal(props) {
  const { config = {}, value, onOk, onCancel, visible } = props
  const { scriptConf } = config
  const [code, setCode] = useState('')

  useEffect(() => {
    return () => {
      setCode('')
    }
  }, [])

  useEffect(() => {
    setCode(value)
  }, [value])

  const handleTextAreatChange = val => {
    setCode(val)
  }

  return (
    <Modal title='批量修改' onCancel={onCancel} onOk={() => onOk(code)} visible={visible}>
      <Input.TextArea placeholder={scriptConf?.tips} rows={8} value={code} onChange={e => handleTextAreatChange(e.target.value)} />
      {<div className='mg1t'>{scriptConf?.help}</div>}
    </Modal>
  )
}

FieldsSettingModal.propTypes = {
  config: PropTypes.object.isRequired, // 控件配置信息
  value: PropTypes.string.isRequired, // 控件值
  onOk: PropTypes.func.isRequired, // 确定方法
  onCancel: PropTypes.func.isRequired, // 取消方法
  visible: PropTypes.bool.isRequired // 是否可见
}

export default FieldsSettingModal
