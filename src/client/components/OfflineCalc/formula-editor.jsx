import React from 'react'
import {Controlled as CodeMirror} from 'react-codemirror2'
import './formula-editor.styl'
import _ from 'lodash'
import ReactDOM from 'react-dom'
import {isDiffByPath, isEqualWithFunc} from '../../../common/sugo-utils'
import classNames from 'classnames'

require('codemirror/lib/codemirror.css')
require('codemirror/theme/xq-light.css')
require('codemirror/mode/javascript/javascript.js')

class Widget extends React.Component {
  render() {
    let {info, idx} = this.props
    return ReactDOM.createPortal(
      info.render(idx),
      info.mountToDom
    )
  }
}

export function getArgsFromWidgetInfo(widgetInfo) {
  let {text, widgetName} = widgetInfo
  let x = `((...args) => args)${text.replace(new RegExp(`^${widgetName}`), '')}`
  return eval(x)
}

export default class FormulaEditor extends React.Component {
  editor = null;
  
  state = {
    widgets: []
  }
  
  componentDidMount() {
    let {value, inlineWidgetOpts} = this.props
    this.replaceToWidget(this.editor, value, inlineWidgetOpts)
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    let {value, inlineWidgetOpts} = this.props
    if (prevProps.value !== value) {
      this.replaceToWidget(this.editor, value, inlineWidgetOpts)
    } else if (isDiffByPath(this.props, prevProps, 'inlineWidgetOpts', isEqualWithFunc)) {
      this.replaceToWidget(this.editor, value, inlineWidgetOpts)
    }
  }
  
  insertText = text => {
    let cursor = this.editor.getCursor()
    this.editor.replaceRange(text, cursor)
  };
  
  replaceToWidget = (editor, value, inlineWidgetOpts) => {
    editor.getAllMarks().forEach(m => m.clear())
    let posInfos = _.flatMap(_.keys(inlineWidgetOpts), widgetName => {
      let {regex, render} = inlineWidgetOpts[widgetName]
      let res = [], newRe = new RegExp(regex, 'g'), m
      do {
        m = newRe.exec(value)
        if (m) {
          const widget = {
            widgetName,
            text: m[0],
            startAt: m.index,
            endAt: m.index + m[0].length,
            render: idx => {
              let args = getArgsFromWidgetInfo(widget)
              return render(...args, idx)
            },
            mountToDom: document.createElement('span')
          }
          res.push(widget)
        }
      } while (m)
      return res
    })
    // const doc = editor.getDoc()
    posInfos.forEach(posInfo => {
      let from = {line: 0, ch: posInfo.startAt}
      let to = {line: 0, ch: posInfo.endAt}
      editor.markText(from, to, {
        replacedWith: posInfo.mountToDom,
        clearWhenEmpty: false
      })
      // console.log(from, to, mt.find())
    })
    this.setState({
      widgets: posInfos
    }, () => {
      editor.refresh()
      editor.focus()
    })
  }
  
  render() {
    let {onChange, options, inlineWidgetOpts, className, disabled, initPublicSelfDim, ...rest} = this.props
    let {widgets} = this.state
    return (
      <React.Fragment>
        <CodeMirror
          className={classNames(className, {disabled})}
          editorDidMount={editor => {
            this.editor = editor
          }}
          onBeforeChange={(editor, data, value) => {
            initPublicSelfDim()
            value = value.replace(/\r\n?/g, '') // 简单起见，暂不允许换行
            onChange(value)
          }}
          // onChange={(editor, data, value) => {
          //   console.log('controlled', {value});
          // }}
          options={{
            mode: 'javascript',
            theme: 'xq-light',
            lineNumbers: false,
            lineWrapping: true,
            readOnly: disabled ? 'nocursor' : false,
            ...options
          }}
          {...rest}
        />
        {widgets.map((w, i) => {
          return (
            <Widget key={i} info={w} idx={i} />
          )
        })}
      </React.Fragment>
    )
  }
}
