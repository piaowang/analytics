import BraftEditor from 'braft-editor'
import React, {useState} from 'react'
import 'braft-editor/dist/index.css'
import _ from 'lodash'

export default function BraftEditorAdapter({value, onChange = _.noop}) {
  const [editorState, setEditorState] = useState(() =>  BraftEditor.createEditorState(value))
  return (
    <BraftEditor
      value={editorState}
      onChange={(editorState) => {
        setEditorState(editorState)
        onChange(editorState.toHTML())
      }}
    />
  )
}
