import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Modal, message, Button, Popover } from 'antd'
import './css.styl'
import { Controlled as CodeMirror } from 'react-codemirror2'
import 'codemirror/mode/sql/sql'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/shell/shell'
import 'codemirror/mode/python/python'
import _ from 'lodash'
import Fetch from 'client/common/fetch-final'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/eclipse.css'
import JobParamsEdit from './job-params-edit'
import DateVarCheatSheet from './date-var-cheatsheet'
import { gobblin } from '../constants'
import { recvJSON } from '../../../common/fetch-utils'
import WaitNode from './wait-node'

const { dataDevHiveScriptProxyUser = 'root' } = window.sugo

const JobDefaultProps = {
  command: {
    codeMode: 'text/x-sh',
    scriptField: 'command'
  },
  python: {
    codeMode: 'text/x-python',
    scriptField: 'script'
  },
  hive: {
    codeMode: 'text/x-hive',
    scriptField: 'hive.script',
    prop: { 'user.to.proxy': { value: dataDevHiveScriptProxyUser } }
  },
  druidIndex: {
    prop: {
      datasourceId: { value: '' },
      segmentGranularity: { value: 'DAY' },
      datasourceName: { value: '' },
      intervalStart: { value: '${businessTime-1T00:00:00}' },
      intervalEnd: { value: '${businessTime-0T00:00:00}' },
      paths: { value: '' },
      numShards: { value: '1' },
      timestampColumn: { value: 'ts' },
      timestampFormat: { value: 'millis' }
    }
  },
  oraclesql: {
    codeMode: 'text/x-sql',
    scriptField: 'oraclesql.script',
    prop: {
      'oracle.url': { value: '' },
      'oracle.password': { value: '' },
      'save.type': { value: 'file' },
      'save.path': { value: '' },
      'save.file.name': { value: 'sql-result.csv' }
    }
  },
  mysql: {
    codeMode: 'text/x-mysql',
    scriptField: 'mysql.script',
    prop: {
      'node.mysql.url': { value: '' },
      'node.mysql.user': { value: '' },
      'node.mysql.password': { value: '' },
      'save.type': { value: 'file' },
      'save.path': { value: '' },
      'save.file.name': { value: 'sql-result.csv' }
    }
  },
  postgres: {
    codeMode: 'text/x-pgsql',
    scriptField: 'postgres.script',
    prop: {
      'node.postgres.url': { value: '' },
      'node.postgres.user': { value: '' },
      'node.postgres.password': { value: '' },
      'save.type': { value: 'file' },
      'save.path': { value: '' },
      'save.file.name': { value: 'sql-result.csv' }
    }
  },
  sqlserver: {
    codeMode: 'text/x-sql',
    scriptField: 'sqlserver.script',
    prop: {
      'node.sqlserver.url': { value: '' },
      'node.sqlserver.user': { value: '' },
      'node.sqlserver.password': { value: '' },
      'save.type': { value: 'file' },
      'save.path': { value: '' },
      'save.file.name': { value: 'sql-result.csv' }
    }
  },
  access: {
    codeMode: 'text/x-sh',
    scriptField: 'access.script',
    prop: {
      datasource: { value: '' },
      'file.path': { value: '' },
      'file.name': { value: 'sql-result.csv' },
      'column.name.map': { value: '' },
      'column.type.map': { value: '' },
      'hmaster.address': { value: '' }
    }
  },
  gobblin: {
    prop: {
      gobblin: {
        value: gobblin,
        type: 'textArea'
      }
    }
  },
  nodeWait: {
    prop: {},
    scriptField: 'nodeWait.script'
    // scriptField: 'showName'
  },
  //数据清洗
  dataClean: {
    codeMode: 'text/x-mysql',
    scriptField: 'dataClean.script',
    prop: { 'user.to.proxy': { value: dataDevHiveScriptProxyUser } }
  },
  //数据建模
  dataModel: {
    codeMode: 'text/x-mysql',
    scriptField: 'dataModel.script',
    prop: { 'user.to.proxy': { value: dataDevHiveScriptProxyUser } }
  },
  scala: {
    codeMode: 'text/x-sh',
    scriptField: 'scala.script'
  },
  impala: {
    codeMode: 'text/x-sql',
    scriptField: 'impala.script'
  },
  perl: {
    codeMode: 'text/x-sh',
    scriptField: 'perl.script'
  },
  mlsql: {
    codeMode: 'text/x-sh',
    scriptField: 'mlsql.script'
  },
  sybase: {
    codeMode: 'text/x-sql',
    scriptField: 'sybase.script',
    prop: {
      'node.sybase.url': { value: '' },
      'node.sybase.user': { value: '' },
      'node.sybase.password': { value: '' },
      'save.type': { value: 'file' },
      'save.path': { value: '' },
      'save.file.name': { value: 'sql-result.csv' }
    }
  }
}

class TaskStepInfo extends React.Component {
  state = {
    configData: [],
    backupConfigData: [],
    code: '',
    visibleParamsEdit: false,
    mirrorLoading: false
  }

  componentWillReceiveProps = nextProps => {
    const { defaultStepInfo } = this.props
    if (nextProps.defaultStepInfo.id !== defaultStepInfo.id || nextProps.showStepInfo) {
      this.setState({ code: '' })
      this.getData(nextProps.taskName, nextProps.defaultStepInfo)
    }
  }

  editInstance = null

  saveStepInfo = async () => {
    let { defaultStepInfo, taskName } = this.props
    let { configData, code } = this.state
    let paramJson = {}
    let jobOverride = {}
    if (defaultStepInfo.type === 'gobblin') {
      let gobblinParam = {}
      try {
        configData.map(item => {
          if (item.name === 'gobblin') {
            gobblinParam = typeof item.value === 'string' ? JSON.parse('{' + item.value.trim().replace(/(\s*\n\s*)\"/g, ',"') + '}') : item.value
          }
        })
        gobblinParam.type = 'gobblin'
        paramJson = JSON.stringify(gobblinParam)
      } catch (error) {
        return message.error('gobblin配置有误，请确认引号逗号是否正确')
      }
    } else {
      jobOverride = _.reduce(
        configData.filter(p => p.name !== ''),
        (r, v) => {
          _.set(r, [`jobOverride[${v.name}]`], v.value)
          return r
        },
        {}
      )
    }
    const jobName = defaultStepInfo.id.indexOf('_node_') >= 0 ? defaultStepInfo.id.substr(defaultStepInfo.id.indexOf('_node_') + 6) : defaultStepInfo.id
    const res = await Fetch.post(`/app/new-task-schedule/manager?project=${taskName}&ajax=setJobOverrideProperty2`, null, {
      ...recvJSON,
      body: JSON.stringify({
        jobName,
        scriptContent: defaultStepInfo.type === 'nodeWait' && !_.isString(code) ? JSON.stringify(code.filter(p => p.projectId && p.nodeId)) : code,
        ...jobOverride,
        paramJson
      })
    })

    if (res.error) {
      message.error(res.error)
      return
    }
    this.setState({ isChange: false, visibleParamsEdit: false }, () => {
      const showName = configData.find(p => p.name === 'showName') || {}
      this.props.closeStepInfoPanel(defaultStepInfo.id, showName.value)
    })
  }

  cancelSave = () => {
    this.setState({ visibleParamsEdit: false }, () => this.props.closeStepInfoPanel())
  }
  getData = async (taskName, stepInfo) => {
    if (!stepInfo.name) {
      message.error('节点信息错误')
    }
    let data = stepInfo
    const jobConfig = _.get(JobDefaultProps, stepInfo.type)
    const jobName = stepInfo.id.indexOf('_node_') >= 0 ? stepInfo.id.substr(stepInfo.id.indexOf('_node_') + 6) : stepInfo.id
    const res = await Fetch.post(`/app/new-task-schedule/manager?project=${taskName}&ajax=fetchJobInfo2&jobName=${jobName}`)
    if (res.error) {
      message.error(res.error)
      return
    }
    if (res.overrideParams) {
      if (res.jobType === 'gobblin') {
        data = {
          ...data,
          gobblin: {
            value: res.overrideParams,
            type: 'textArea'
          }
        }
      } else {
        data = res.overrideParams
        data.id = res.jobName
      }
    } else {
      data = { ...data, ...jobConfig.prop }
    }

    data = _.mapValues(data, (p, k) => {
      let colType = {}
      let jobColType = _.get(jobConfig, ['prop', k, 'type'], '')
      if (jobColType) {
        colType.type = jobColType
      }
      if (typeof p === 'string' && p.indexOf('\n') >= 0) {
        return { value: JSON.stringify(p).replace(/^.(.+?).$/, '$1'), ...colType }
      } else if (typeof p.value === 'string' && p.value.indexOf('\n') >= 0) {
        return { value: JSON.stringify(p.value).replace(/^.(.+?).$/, '$1'), ...colType }
      }
      return typeof p === 'string' ? { value: p, ...colType } : { ...p, ...colType }
    })

    let code = ''
    if (jobConfig.scriptField && data[jobConfig.scriptField]) {
      let scriptName = data[jobConfig.scriptField].value
      const startIndex = scriptName.indexOf('scripts/')
      if (startIndex > -1) scriptName = scriptName.substr(startIndex + 8)
      code = await Fetch.post(`/app/new-task-schedule/manager?project=${taskName}&ajax=downloadScript&fileName=${scriptName}`)
    }

    const params = _.omit(data, ['top', 'height', 'width', 'dependencies', 'left', 'id'])
    const infoArray = _.map(_.keys(params), (p, i) => ({ name: p, ...data[p], index: i }))
    this.setState(
      {
        configData: infoArray,
        backupConfigData: _.cloneDeep(infoArray),
        code
      },
      () => setTimeout(() => this.editInstance && this.editInstance.refresh(), 200)
    )
  }

  onAppendParams = () => {
    const { configData } = this.state
    const info = configData.find(p => p.name === '')
    if (!info) {
      const maxIndex = (_.maxBy(configData, p => p.index) || { index: 0 }).index
      this.setState({
        configData: [...configData, { name: '', value: '', index: maxIndex + 1 }]
      })
    }
  }

  onChangeParams = obj => {
    const { configData } = this.state
    let newConfigData = _.cloneDeep(configData)
    let index = newConfigData.findIndex(p => p.index === obj.index)
    newConfigData[index] = obj
    if (obj.name === 'projectId') {
      let index = newConfigData.findIndex(p => p.name === 'nodeId')
      if (index >= 0) newConfigData[index].value = ''
    }

    this.setState({ configData: newConfigData })
  }

  onchangeCode = code => {
    this.setState({ code })
  }

  onRemoveParams = idx => {
    const { configData } = this.state
    this.setState({
      configData: [...configData.filter(p => p.index !== idx)]
    })
  }

  resetConfig = () => {
    const { backupConfigData } = this.state
    this.setState({
      configData: _.cloneDeep(backupConfigData)
    })
  }

  render() {
    const { showStepInfo, defaultStepInfo, projectId } = this.props
    if (!showStepInfo) return null
    const { configData, code, visibleParamsEdit } = this.state
    const hasCodePanle = _.get(JobDefaultProps, [defaultStepInfo.type, 'codeMode'], '')
    const omitKey = ['name', 'type', _.get(JobDefaultProps, [defaultStepInfo.type, 'scriptField'], '')]
    const configDataMap = _.keyBy(configData, 'name')
    // 这段代码只是为了调整视图
    if (defaultStepInfo.type === 'nodeWait' || defaultStepInfo.type === 'gobblin') {
      omitKey.push('showName')
    }

    if (defaultStepInfo.type === 'nodeWait') {
      return (
        <Modal
          maskClosable={false}
          title={`节点信息-${_.get(configDataMap, 'name.value')}`}
          visible={showStepInfo}
          onCancel={this.cancelSave}
          onOk={this.saveStepInfo}
          width={1000}
        >
          <WaitNode
            params={configData}
            onchangeCode={this.onchangeCode}
            resetConfig={this.resetConfig}
            omitKey={omitKey}
            projectId={projectId}
            code={_.isString(code) ? JSON.parse(code || '[]') : code}
          />
        </Modal>
      )
    }
    let defaultParamsKey = _.keys(_.get(JobDefaultProps, [defaultStepInfo.type, 'prop'], {}))
    defaultParamsKey = ['showName', ...defaultParamsKey]
    const content = (
      <JobParamsEdit
        defaultParamsKey={defaultParamsKey}
        params={configData}
        onAppendParams={this.onAppendParams}
        onChangeParams={this.onChangeParams}
        onRemoveParams={this.onRemoveParams}
        resetConfig={this.resetConfig}
        omitKey={omitKey}
        projectId={projectId}
      />
    )

    let showAddButton = _.get(JobDefaultProps, [defaultStepInfo.type, 'showAddButton'], false)

    return (
      <Modal maskClosable={false} title={`节点信息-${_.get(configDataMap, 'name.value')}`} visible={showStepInfo} onCancel={this.cancelSave} onOk={this.saveStepInfo} width={1000}>
        <div className='setp_info'>
          {hasCodePanle ? (
            <div>
              <Popover
                content={<DateVarCheatSheet />}
                placement='rightTop'
                arrowPointAtCenter
                trigger='click'
                onClick={() => {
                  this.setState({ visibleParamsEdit: false })
                }}
              >
                <Button className='mg1b mg1r'>日期变量</Button>
              </Popover>
              <Popover
                content={content}
                placement='rightTop'
                arrowPointAtCenter
                trigger='click'
                visible={visibleParamsEdit}
                title={[
                  <span key='title' className='font16 mg2r'>
                    设置自定义参数
                  </span>,
                  <CloseCircleOutlined
                    key='close'
                    className='fright fpointer font18 color-red'
                    onClick={() => {
                      this.setState({ visibleParamsEdit: false })
                    }}
                  />
                ]}
                onClick={() => {
                  this.setState({ visibleParamsEdit: true })
                }}
              >
                <Button className='mg1b'>设置参数</Button>
              </Popover>
              <CodeMirror
                value={code}
                options={{
                  mode: JobDefaultProps[defaultStepInfo.type].codeMode,
                  lineNumbers: true,
                  readOnly: false,
                  theme: 'eclipse'
                }}
                editorDidMount={editor => {
                  this.editInstance = editor
                }}
                onBeforeChange={(editor, data, value) => {
                  this.setState({ code: value, isChange: true })
                }}
                onFocus={editor => {
                  editor.refresh()
                }}
              />
            </div>
          ) : (
            <JobParamsEdit
              showAddButton={showAddButton}
              defaultParamsKey={defaultParamsKey}
              params={configData}
              onAppendParams={this.onAppendParams}
              onChangeParams={this.onChangeParams}
              onRemoveParams={this.onRemoveParams}
              omitKey={omitKey}
              projectId={projectId}
            />
          )}
        </div>
      </Modal>
    )
  }
}
export default TaskStepInfo
