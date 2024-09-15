import {Controlled as CodeMirror} from 'react-codemirror2'
import {Button} from 'antd'
import React from 'react'
import './style.styl'

require('codemirror/lib/codemirror.css')
require('codemirror/theme/xq-dark.css')
require('codemirror/mode/javascript/javascript.js')


export default function JsCodeEditor({value, onChange, defaultValue, className, btnStyle, ...rest}) {
  return (
    <React.Fragment>
      <CodeMirror
        value={value}
        options={{
          mode: 'javascript',
          theme: 'xq-dark',
          lineNumbers: true,
          lineWrapping: true
        }}
        className={`js-code-editor ${className || ''}`}
        onBeforeChange={(editor, data, nextVal) => {
          onChange(nextVal)
        }}
        // onChange={(editor, data, value) => {}}
        {...rest}
      />
  
      <Button
        className="mg2"
        style={btnStyle}
        onClick={() => onChange(defaultValue)}
      >重置默认</Button>
    </React.Fragment>
  )
}
