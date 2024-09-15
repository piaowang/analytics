import React, { useState } from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { ClockCircleOutlined } from '@ant-design/icons'
import { Modal, Timeline, Table } from 'antd'
import moment from 'moment'

export default function PageEditPanel(props) {
  let { testMessage, testTrackVisible, sendStopTestRequest } = props
  const [state, setState] = useState(0)
  if (!testTrackVisible) {
    return null
  }

  const colors = ['red', 'green', 'blue']
  let message = []
  const eventTableData = testMessage.map((event, idx) => {
    let time = moment.unix(event.properties.event_time / 1000).format('YYYY-MM-DD HH:mm:ss')
    let eventKeys = Object.keys(event.properties)
    const propertiesItems = eventKeys.map(key => {
      return { name: key, value: _.get(event, `properties.${key}`) }
    })
    message.push([{ name: 'event_id', vaule: event.event_id }, ...propertiesItems])
    return (
      <Timeline.Item
        dot={<ClockCircleOutlined className="font16" />}
        color={colors[(testMessage.length - idx) % colors.length]}
        key={'tl-' + idx}
      >
        <div className="test-message-background" onClick={() => setState(idx)}>
          <div className="width-40 alignright iblock">{event.event_name}</div>
          <div className="width-60 alignright iblock">{time}</div>
        </div>
      </Timeline.Item>
    )
  })

  const columns = [
    { key: 'name', dataIndex: 'name', title: '维度' },
    { key: 'value', dataIndex: 'value', title: '值', ellipsis: true }
  ]

  return (
    <Modal
      title="测试事件"
      width={'80%'}
      visible={testTrackVisible}
      maskClosable={false}
      onCancel={sendStopTestRequest}
      footer={null}
    >
      <div style={{ height: '70vh' }}>
        <div className="width-40 pd1 itblock always-display-scrollbar scroll-content-100">
          <Timeline>
            {eventTableData}
          </Timeline>
        </div>
        <div className="width-60 pd1 itblock always-display-scrollbar scroll-content-100" >
          <Table size="small" columns={columns} pagination={false} dataSource={message[state]} />
        </div>
      </div>
    </Modal>
  )
}

PageEditPanel.propTypes = {
  testMessage: PropTypes.array.isRequired,  // message集合
  testTrackVisible: PropTypes.bool.isRequired,  //是否显示
  sendStopTestRequest: PropTypes.func.isRequired // 关闭测试
}
