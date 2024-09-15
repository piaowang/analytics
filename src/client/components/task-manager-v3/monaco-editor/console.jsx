import React from 'react'
import _ from 'lodash'
import PropTypes from 'prop-types'
import { generate } from 'shortid'
import PubSub from 'pubsub-js'
import { Card } from 'antd';
// import io from 'socket.io-client'

const { token } = window.sugo.taskManagerV3Ws 
const { protocol, host } = window.location
let { ws_url } = window.sugo
if (!ws_url) {
  ws_url = `${protocol.indexOf('https') > -1 ? 'wss' : 'ws'}://${host}`
}

const Console = (props) => {
  const {
    id,
    close,
    setRuning
  } = props

  const ref = React.useRef(null)
  const logInfoRef = React.useRef([])
  const [logsInfo, setLogInfo] = React.useState([])

  const open = (script) => {
    return () => {
      const data = {
        type: 'hive',
        cmd: 'run',
        debugId: `${Date.now()}`,
        script
      }
      logInfoRef.current = ''
      ref.current.send(JSON.stringify(data))
    }
  }

  const message =  evt => {
    const logs = _.get(evt, ['data'], '').replace(/\\n/g, '<br/>').replace(/\\t/g, '    ')
    if (logs[0].includes('debug finished') || logs[0].includes('debug failed')) {
      setRuning(false)
    }
    logInfoRef.current = `${logInfoRef.current}\n${logs}`
    setLogInfo(logInfoRef.current)
  }

  React.useEffect(() => {
    PubSub.subscribe(`taskEditV3.runTaskInfo.${id}`, (_, script) => {
      // 保证每次点击都是新的连接
      if (ref.current) {
        ref.current.close()
      }
      setRuning(true)
      const ws = new WebSocket(`${ws_url}/taskConn?token=${token}`)
      // const ws = io(`${ws_url}/taskConn?token=${token}`, { transports: ['websocket', 'polling'] })
      ref.current = ws
      // ws.on('connect', open(script))
      // ws.on('event', message)
      // ws.on('disconnect', () => console.log('连接已关闭...'))
      ws.onopen = open(script)
      ws.onmessage = message
      ws.onclose = () => console.log('连接已关闭...')
    })
    
    return () => {
      try{
        PubSub.unsubscribe(`taskEditV3.saveTaskInfo.${id}`)
        ref.current.close()
      } catch(e){
        // console.error(e)
      }
    }
  }, [])

  
  return (
    <Card 
      size="small" 
      title="执行日志" 
      // extra={<a href="#" onClick={()=>close()}><Icon type="close" /></a>}
      className="width-100 height-100"
      bodyStyle={{
        width: '100%',
        height: '100%',
        overflow: 'auto'
      }}
    >
      {
        logsInfo.length
          ? <div dangerouslySetInnerHTML={{ __html: logInfoRef.current }}/>
          :(<p>nothing</p>)
      }
    </Card>
  )
}

Console.propTypes = {
  id: PropTypes.string,
  close: PropTypes.func,
  setRuning: PropTypes.func
}

export default Console

