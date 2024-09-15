import React, {useState, useEffect} from 'react'
import { Modal, Radio } from 'antd';
import _ from 'lodash'
import {immutateUpdate, isEqualWithFunc, tryJsonParse} from '../../../../common/sugo-utils'
import {doChangeRuntimeState} from '../actions/workbench'
import Icon2 from '../../Common/sugo-icon'


export const ThemePickerForm = (props) => {
  let {onChange, value, options} = props
  const [currVal, setCurrVal] = useState(value)
  
  const radioStyle = {
    display: 'block',
    height: '30px',
    lineHeight: '30px'
  }
  return (
    <Radio.Group
      onChange={ev => {
        const val = ev.target.value
        setCurrVal(val)
        onChange(val)
      }}
      value={currVal}
    >
      {_.keys(options).map(optName => {
        return (
          <Radio
            style={radioStyle}
            key={optName}
            value={optName}
          >{optName}</Radio>
        )
      })}
    </Radio.Group>
  )
}


export const ThemePicker = props => {
  const { params, styleConfig = {}, className } = props
  const {iconType = 'antd', iconSrc = 'skin', color, rotate, fontSize, fontWeight, textContent = '主题切换'} = styleConfig || {}
  
  useEffect(() => {
    const currRuntimeState = _.get(window.store.getState(), 'livescreen_workbench.runtimeState', {})
    const themeDict = tryJsonParse(params && params.themeDefine)
    const defaultTheme = themeDict && themeDict.default
    if (isEqualWithFunc(defaultTheme, currRuntimeState.theme)) {
      return
    }
    const nextRuntimeState = immutateUpdate(currRuntimeState, 'theme', () => defaultTheme)
    doChangeRuntimeState(nextRuntimeState)(window.store.dispatch)
  }, [params && params.themeDefine])
  
  return (
    <div
      className={`height-100 pointer ${className}`}
      onClick={() => {
        const themeDict = tryJsonParse(params && params.themeDefine)
        let currRuntimeState = _.get(window.store.getState(), 'livescreen_workbench.runtimeState', {})
        let currThemeName = _.findKey(themeDict, v => isEqualWithFunc(v, currRuntimeState.theme))
        Modal.info({
          title: '切换主题',
          content: (
            <ThemePickerForm
              options={themeDict}
              value={currThemeName}
              onChange={o => {
                if (!o) {
                  return
                }
                const nextRuntimeState = immutateUpdate(currRuntimeState, 'theme', () => themeDict[o])
                doChangeRuntimeState(nextRuntimeState)(window.store.dispatch)
              }}
            />
          ),
          okText: '确认'
        })
      }}
    >
      <span
        className="center-of-relative"
        style={{
          transform: `translate(-50%, -50%) rotate(${rotate || 0}deg)`,
          ...(styleConfig || {})
        }}
      >
        {iconType === 'antd'
          ? (
            <Icon2
              type={iconSrc}
              className="pointer"
            />
          ) : (
            <img
              className="pointer"
              style={{
                width: fontSize,
                height: fontSize
              }}
              src={iconSrc}
              alt=""
            />
          )}
        {textContent}
      </span>
    </div>
  )
}
