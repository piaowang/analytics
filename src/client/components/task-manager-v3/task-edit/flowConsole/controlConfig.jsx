import React, { useEffect, useRef, useState  } from 'react'
import { Tabs } from 'antd'
import _ from 'lodash'
import SetScheduleExecute from './set-schedule-execute-v3'

export default function ControlConfig(props) {

  const { cronInfo, changeState, disabled = false } = props
  return (
    <React.Fragment>
      <div className="bg-white height-100 overscroll-y always-display-scrollbar">
        <SetScheduleExecute cronInfo={cronInfo} changeState={changeState} disabled={disabled}/>
      </div>
    </React.Fragment>
  )
}
