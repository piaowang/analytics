import { Button } from 'antd'
import React, { useEffect, useState } from 'react'
import _ from 'lodash'
import { ControlledEditor, monaco } from '@monaco-editor/react'
import { connect } from 'react-redux'
import { AlignLeftOutlined, SaveOutlined } from '@ant-design/icons'
import sqlFormatter from 'sql-formatter'
import { namespace } from './immediate-model'
import { REALTIME_TASK_SCRIPT_MAP } from '../../constants'

monaco.config({
  urls: {
    monacoLoader: '/public/vs/loader.js',
    monacoBase: '/public/vs'
  }
})

function Editor(props) {
  const { dispatch, language = 'groovy', height = '100%', options, isCleanEdit = false, id = '', taskId, onChange, value, editNodeScript, taskInfo, nodeType } = props
  const [state, setState] = useState({ value: value || editNodeScript })
  const fileName = `clean_${id.substring(id.indexOf('_') + 1)}.${_.get(REALTIME_TASK_SCRIPT_MAP, nodeType, '')}`
  const handleGroovyScriptClick = () => {
    dispatch({
      type: `${namespace}_${taskId}/saveProjectCleanFile`,
      payload: {
        parentJobName: _.get(taskInfo, 'jobName', ''),
        projectId: taskId,
        jobName: fileName,
        fileContent: state.value
      }
    })
  }

  useEffect(() => {
    if (isCleanEdit) {
      dispatch({
        type: `${namespace}_${taskId}/downloadFlinkScript`,
        payload: {
          projectId: taskId,
          parentJobName: _.get(taskInfo, 'jobName', ''),
          fileName: fileName,
          isEditScript: true
        }
      })
    }
  }, [id])
  useEffect(() => {
    if (isCleanEdit) {
      setState({ ...state, value: editNodeScript })
    }
  }, [editNodeScript])

  return (
    <div>
      <div style={{ lineHeight: '40px', padding: ' 0 20px', borderBottom: '1px solid #ddd', marginBottom: '10px' }}>
        编辑脚本
        <div className='fright alignright'>
          {_.get(REALTIME_TASK_SCRIPT_MAP, nodeType, '') !== 'sql' ? null : (
            <Button
              className='mg1r'
              icon={<AlignLeftOutlined />}
              onClick={() => {
                const formatCode = sqlFormatter.format(state.value, { language: 'n1ql' })
                setState({ ...state, value: formatCode })
              }}
            >
              代码格式化
            </Button>
          )}
          {isCleanEdit ? (
            <Button type='primary' onClick={handleGroovyScriptClick} icon={<SaveOutlined />}>
              保存
            </Button>
          ) : null}
        </div>
      </div>
      <ControlledEditor
        height={height}
        language={_.get(REALTIME_TASK_SCRIPT_MAP, nodeType, '')}
        value={state.value}
        onChange={(ev, value) => {
          if (!isCleanEdit) {
            onChange && onChange(value)
          }
          setState({ ...state, value })
        }}
        options={options}
      />
    </div>
  )
}

export default connect((props, props2) => {
  const str = `${namespace}_${_.get(props2, 'taskId', '')}`
  return _.pick(props[str], ['taskInfo', 'editNodeScript'])
})(Editor)
