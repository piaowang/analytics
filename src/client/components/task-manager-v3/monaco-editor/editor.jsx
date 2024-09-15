import React, { useImperativeHandle, forwardRef } from 'react'
import PropTypes from 'prop-types'

import { ClockCircleOutlined, PauseCircleOutlined, PlayCircleOutlined, SaveOutlined, SettingOutlined, AlignLeftOutlined } from '@ant-design/icons'

import { Button, Popover } from 'antd'
import PubSub from 'pubsub-js'
import _ from 'lodash'
import { ControlledEditor, monaco } from '@monaco-editor/react'
import { githubTheme } from './theme/github'
import DateVarCheatSheet from './popover/date-var-cheatsheet'
import Console from './console'
import JobParamsEdit from './popover/job-params-edit'
import { namespace } from '../task-edit/model'
import { FLOW_NODE_INFOS } from '../constants'
import VerticalSplitHelper from '../../Common/vertical-split-helper'
import SqlSnippets from './snippets'
import sqlFormatter from 'sql-formatter'

monaco.config({
  urls: {
    monacoLoader: '/_bc/monaco-editor/min/vs/loader.js',
    monacoBase: '/_bc/monaco-editor/min/vs'
  }
})

const { dataDevHiveScriptProxyUser = 'root' } = window.sugo

monaco
  .init()
  .then(monaco => {
    monaco.editor.defineTheme('github', githubTheme)
    let sqlSnippets = new SqlSnippets(monaco, ['${ }'], [], 'hive')
    monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', '$'],
      provideCompletionItems: (model, position) => sqlSnippets.provideCompletionItems(model, position)
    })
  })
  .catch(error => console.error('An error occurred during initialization of Monaco: ', error))

const Editor = (props, ref) => {
  const { dispatch, changeEditStatus, taskId, id, disabled, nodeType } = props

  const flowNode = FLOW_NODE_INFOS.find(p => p.nodeType === nodeType)

  const editorRef = React.useRef()
  const infoRef = React.useRef({})
  const paramsRef = React.useRef([])
  const codeRef = React.useRef(null)
  const [nodeInfo, setNodeInfo] = React.useState({})
  const [consolePanelHeight, setConsolePanelHeight] = React.useState(0)
  const [jobParams, setJobParams] = React.useState([{ name: 'user.to.proxy', value: dataDevHiveScriptProxyUser }])
  const [runing, setRuning] = React.useState(false)

  const setDefaultParams = data => {
    const info = data || nodeInfo
    if (info.generalParams) {
      const exclude = ['top', 'left', 'width', 'height', 'command', 'showName', 'hive.script', 'script', 'name', 'type', 'dependencies', 'ports']
      const params = []
      _.keys(info.generalParams).reduce((item, key) => {
        if (!exclude.includes(key)) {
          item.push({ name: key, value: info.generalParams[key] })
        }
        return item
      }, params)
      if (!_.find(params, p => p.name === 'user.to.proxy')) {
        params.push({ name: 'user.to.proxy', value: dataDevHiveScriptProxyUser })
      }
      setJobParams(params)
    }
  }

  const saveScript = callback => {
    const info = infoRef.current
    const code = editorRef.current.getValue()
    const paramResult = paramsRef.current.reduce((result, param) => {
      result[`jobOverride[${param.name}]`] = param.value
      return result
    }, {})

    const oldParam = _.reduce(
      _.get(nodeInfo, 'generalParams', {}),
      (result, v, k) => {
        result[`jobOverride[${k}]`] = v || _.get(flowNode, [k], '')
        return result
      },
      {}
    )

    dispatch({
      type: `${namespace}/saveTaskNodeInfo`,
      payload: {
        projectId: taskId,
        jobName: _.last(_.split(id, '_')),
        ...oldParam,
        ...paramResult,
        'jobOverride[name]': _.get(info, ['generalParams', 'name'], flowNode.name),
        'jobOverride[showName]': _.get(info, ['generalParams', 'showName'], flowNode.showName),
        'jobOverride[type]': _.get(info, ['generalParams', 'type'], nodeType),
        paramJson: {},
        scriptContent: code
      },
      callback: () => {
        changeEditStatus(id, false)
        nodeInfo.scriptContent = code
        callback && callback()
      }
    })
  }

  useImperativeHandle(ref, () => ({
    //插入文本内容 并设置光标
    insertContent: text => {
      // 获取内容
      let val = editorRef.current.getValue()
      // 获取光标位置
      let position = editorRef.current.getSelection()
      // 设置新的文本内容和修改内容后光标的位置
      const positionColumn = position.positionColumn - 1
      const newPosition = position.positionColumn + text.length + 2
      val = `${val.substr(0, positionColumn)} ${text} ${val.substr(positionColumn)}`
      editorRef.current.setValue(val)
      // 更新光标位置并设置焦点
      editorRef.current.setSelection({
        ...position,
        endColumn: newPosition,
        positionColumn: newPosition,
        selectionStartColumn: newPosition,
        startColumn: newPosition
      })
      editorRef.current.focus()
    }
  }))

  React.useEffect(() => {
    dispatch({
      type: `${namespace}/getTaskNodeInfo`,
      payload: { taskId, jobName: _.last(_.split(id, '_')) },
      callback: info => {
        setNodeInfo(info)
        setDefaultParams(info)
        codeRef.current = info.scriptContent || ''
      }
    })
  }, [taskId])

  React.useEffect(() => {
    infoRef.current = nodeInfo
  }, [nodeInfo])

  React.useEffect(() => {
    paramsRef.current = jobParams
  }, [jobParams])

  React.useEffect(() => {
    PubSub.subscribe(`taskEditV3.saveTaskInfo.${id}`, (msg, callback) => {
      saveScript(callback)
    })
    PubSub.subscribe(`hive.changeDbId.${id}`, (msg, dbid) => {
      let res = []
      if (_.some(jobParams, ['name', 'db.id'])) {
        res = jobParams.map(obj => {
          if (obj.name === 'db.id') obj.value = dbid
          return obj
        })
      } else {
        res = [...jobParams, { name: 'db.id', value: dbid }]
      }
      setJobParams(res)
    })
    return () => {
      PubSub.unsubscribe(`taskEditV3.saveTaskInfo.${id}`)
      PubSub.unsubscribe(`hive.changeDbId.${id}`)
    }
  }, [])

  React.useEffect(() => {
    editorRef.current && editorRef.current.setValue(nodeInfo.scriptContent || '')
  }, [nodeInfo.scriptContent])

  const handleEditorChange = code => {
    if (codeRef.current !== null && codeRef.current !== code) {
      changeEditStatus(id, true)
    } else {
      changeEditStatus(id, false)
    }
  }

  const handleEditorDidMount = (_, editor) => {
    editorRef.current = editor
  }

  /**
   * 格式化sql语句
   */
  const handleFormmatSql = () => {
    const code = editorRef.current.getValue()
    editorRef.current.setValue(sqlFormatter.format(code, { language: 'n1ql' }))
  }

  return (
    <div className='height-100' style={{ overflow: 'hidden' }}>
      <div className='pd1b' style={{ height: '38px' }}>
        <Button
          className='mg1l'
          icon={<PlayCircleOutlined />}
          onClick={() => {
            setConsolePanelHeight(230)
            const range = editorRef.current.getSelection()
            const script = editorRef.current.getModel().getValueInRange(range) || editorRef.current.getValue()
            PubSub.publish(`taskEditV3.runTaskInfo.${id}`, script)
          }}
          disabled={disabled || !flowNode.debug || runing}
        >
          运行
        </Button>
        <Button
          className='mg1l'
          icon={<PauseCircleOutlined />}
          onClick={() => {
            setConsolePanelHeight(0)
            setRuning(false)
          }}
          disabled={disabled || !flowNode.debug}
        >
          停止
        </Button>
        <Button className='mg1l' icon={<AlignLeftOutlined />} onClick={handleFormmatSql}>
          数据格式化
        </Button>
        <Button className='mg1l' icon={<SaveOutlined />} disabled={disabled} onClick={() => saveScript()}>
          保存
        </Button>
        <Popover content={<DateVarCheatSheet />} placement='rightTop' arrowPointAtCenter trigger='click'>
          <Button className='mg1l' icon={<ClockCircleOutlined />} disabled={disabled}>
            日期变量
          </Button>
        </Popover>

        <Popover
          overlayStyle={{ width: '350px' }}
          content={
            <JobParamsEdit
              key={jobParams[1]?.value}
              params={jobParams}
              setParams={params => {
                changeEditStatus(id, true)
                setJobParams(params)
              }}
              changeEditStatus={() => {
                changeEditStatus(id, true)
              }}
              reduction={setDefaultParams}
            />
          }
          placement='rightTop'
          arrowPointAtCenter
          trigger='click'
          title={[
            <span key='title' className='font16 mg2r'>
              设置自定义参数
            </span>
          ]}
        >
          <Button disabled={disabled} className='mg1l' icon={<SettingOutlined />}>
            设置参数
          </Button>
        </Popover>
      </div>

      <VerticalSplitHelper {..._.pick(props, ['style', 'className'])} style={{ height: 'calc(100% - 42px)' }}>
        <div className='panel dimension-panel' defaultWeight={65}>
          <div
            style={{
              width: '100%',
              transition: 'height .3s cubic-bezier(0.9, 0, 0.3, 0.7)',
              height: '100%'
            }}
          >
            <ControlledEditor
              width='100%'
              height='100%'
              language={flowNode.language || 'javascript'}
              theme='github'
              onChange={(obj, text) => handleEditorChange(text)}
              editorDidMount={handleEditorDidMount}
              options={{ readOnly: disabled }}
            />
          </div>
        </div>
        <div className='panel dimension-panel' defaultWeight={consolePanelHeight > 0 ? 65 : 0}>
          <Console id={id} close={() => setConsolePanelHeight(0)} setRuning={setRuning} />
        </div>
      </VerticalSplitHelper>
    </div>
  )
}

Editor.propTypes = {
  dispatch: PropTypes.func,
  changeEditStatus: PropTypes.func,
  taskId: PropTypes.string,
  id: PropTypes.string,
  nodeType: PropTypes.string,
  disabled: PropTypes.bool
}

export default forwardRef(Editor)
