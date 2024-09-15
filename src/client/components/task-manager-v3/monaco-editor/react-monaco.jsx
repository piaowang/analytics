import React from 'react'
import PropTypes from 'prop-types'
import { ControlledEditor, monaco } from '@monaco-editor/react'
import { githubTheme } from './theme/github'

monaco.config({
  urls: {
    monacoLoader: '/_bc/monaco-editor/min/vs/loader.js',
    monacoBase: '/_bc/monaco-editor/min/vs'
  }
})

monaco
  .init()
  .then(monaco => {
    monaco.editor.defineTheme('github', githubTheme)
  })
  .catch(error => console.error('An error occurred during initialization of Monaco: ', error))

const ReactMonaco = (props) => {
  const {
    language='javascript',
    change=()=>{},
    didMount=()=>{},
    options={}
  } = props
  // const options = { readOnly: disabled }

  return (
    <ControlledEditor
      width="100%"
      height="100%"
      theme="github"
      language={language}
      onChange={change}
      editorDidMount={didMount}
      options={options}
    />
  )
}

ReactMonaco.propTypes = {
  language: PropTypes.string,
  change: PropTypes.func,
  didMount: PropTypes.func,
  options: PropTypes.object
}

export default ReactMonaco
