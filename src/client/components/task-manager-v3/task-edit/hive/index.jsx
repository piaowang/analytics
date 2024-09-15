import React, { useRef, useEffect, useState } from 'react'
import Editor from '../../monaco-editor/editor'
import { namespace } from '../../task-edit/model'
import HorizontalSplitHelper from '../../../Common/horizontal-split-helper'
import HiveTree from './hive-catalog-tree'

export default function HiveNode(props) {
  const editorRef = useRef()
  const [dateInfo, setDateInfo] = useState([])
  useEffect(() => {
    props.dispatch({
      type: `${namespace}/getPermitDB`,
      payload: { projectId: props.projectId },
      callback: obj => {
        setDateInfo(_.filter(obj, el => el.dbType === 'hive'))
      }
    })
  }, [props.projectId])

  const handleSelectItem = val => {
    // editor 插入文本方法
    editorRef.current && editorRef.current.insertContent(val)
  }

  return (
    <div className='width-100 height-100'>
      <HorizontalSplitHelper className='width-100 height-100' collapseWidth={100}>
        <div className='height-100 task-left-panel pd1t pd1l bg-white borderr bordert overscroll-y always-display-scrollbar' defaultWeight={25} collapseTitle='任务选择'>
          <HiveTree projectId={props.projectId} id={props.id} dateInfo={dateInfo} onSelectItem={handleSelectItem} />
        </div>
        <div className='height-100 task-right-panel pd1' defaultWeight={75}>
          <Editor {...props} ref={editorRef} />
        </div>
      </HorizontalSplitHelper>
    </div>
  )
}
