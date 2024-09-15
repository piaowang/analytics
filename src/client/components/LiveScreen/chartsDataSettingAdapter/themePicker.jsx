import _ from 'lodash'
import React from 'react'
import {immutateUpdate} from '../../../../common/sugo-utils'
import JsCodeEditor from '../js-code-editor/jsCodeEditor'


const defaultThemeDefine = {
  default: {
    blue: '#00A7FF',
    red: '#FF6B66',
    gray: '#BAC3C6',
    green: '#38DB6D',
    screenCss: {
      background: '#373d43'
    }
  },
  lightTheme: {
    blue: '#0088cc',
    red: '#cc5452',
    gray: '#898f91',
    green: '#2ba652',
    screenCss: {
      background: '#0E4380'
    }
  }
}

const defVal = JSON.stringify(defaultThemeDefine, null, 2)

export const ThemePickerDataSettingsPanel = props => {
  const {value: comp, onChange} = props
  const themeDefine = _.get(comp, 'params.themeDefine')
  
  return (
    <div className="data-access-panel">
      <div className="access-title pd2l">内容</div>
      
      <JsCodeEditor
        className="mg2"
        style={{width: 'calc(100% - 32px)'}}
        value={themeDefine}
        onChange={value => {
          onChange(immutateUpdate(comp, 'params.themeDefine', () => value))
        }}
        defaultValue={defVal}
      />
    </div>
  )
}
