import { DatePicker, Radio, Dropdown, Button, Menu } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { DownOutlined } from '@ant-design/icons'
import moment from 'moment'

const breakPointMap = {
  null: { text: '未指定', key: 'null' },
  timestamp: { text: '指定时间', key: 'timestamp' },
  current: { text: '从现在开始', key: 'current' },
  persistence: { text: '断点续传', key: 'current' }
  // offline: { text: '离线初始化', key: 'offline' }
}

export default function BreakPointSelect(props) {
  const { value = [], onChange, isGlobal, getPopupContainer } = props
  const [selectValue, setSelectValue] = useState({ type: 'null', timestamp: 0 })
  const [showSetPanel, setShowSetPanel] = useState(false)

  useEffect(() => {
    let val = _.get(value, 'breakPoint')
    val = _.isNull(val) || _.isUndefined(val) ? { type: 'null' } : val
    setSelectValue(val)
  }, [props.value])

  const handelChangeDate = date => {
    const newValue = { ...value, breakPoint: { type: breakPointMap.timestamp.key, timestamp: moment(date).valueOf() } }
    setSelectValue({ type: breakPointMap.timestamp.key, timestamp: moment(date).valueOf() })
    onChange(newValue)
    _.debounce(() => setShowSetPanel(false), 200)()
  }

  const handelChangeType = key => {
    if (key === breakPointMap.null.key) {
      setSelectValue({ type: null })
      onChange({ ...value, breakPoint: null })
      setShowSetPanel(false)
      return
    }
    let newValue = { ...value, breakPoint: { type: key } }
    if (key === breakPointMap.timestamp.key) {
      newValue.breakPoint.timestamp = moment().valueOf()
      setSelectValue({ type: key })
      onChange(newValue)
      return
    }
    setSelectValue({ type: key })
    onChange(newValue)
    setShowSetPanel(false)
  }

  const handleVisibleChange = flag => {
    setShowSetPanel(flag)
  }

  const menu = (
    <Menu className='width270'>
      {_.keys(breakPointMap).map(p => {
        if (isGlobal && p === breakPointMap.null.key) {
          return null
        }

        if (p === breakPointMap.timestamp.key) {
          return (
            <Menu.Item key={p}>
              <span onClick={() => handelChangeType(p)} className='pd2r'>
                <Radio checked={selectValue.type === p} /> 指定时间{' '}
              </span>
              <DatePicker onOk={() => setShowSetPanel(false)} showTime value={moment(selectValue.timestamp)} onChange={handelChangeDate} />
            </Menu.Item>
          )
        }
        return (
          <Menu.Item onClick={() => handelChangeType(p)} key={p}>
            <Radio checked={selectValue.type === p} /> {_.get(breakPointMap, [p, 'text'], '')}
          </Menu.Item>
        )
      })}
    </Menu>
  )

  return (
    <Dropdown overlay={menu} visible={showSetPanel} onVisibleChange={handleVisibleChange} trigger={['click']} getPopupContainer={getPopupContainer}>
      <Button className='minw200' onClick={e => e.preventDefault()} style={{ textAlign: 'left' }}>
        {_.get(breakPointMap, [selectValue.type, 'text'], isGlobal ? breakPointMap.persistence.text : breakPointMap.null.text)}
        {selectValue.type === breakPointMap.timestamp.key ? `  [${moment(selectValue.timestamp || '').format('YYYY-MM-DD HH:mm:ss')}]` : ''} <DownOutlined />
      </Button>
    </Dropdown>
  )
}
