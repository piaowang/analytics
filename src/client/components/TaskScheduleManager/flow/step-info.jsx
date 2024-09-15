import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, message, Button, Popover, Popconfirm, Input } from 'antd'

import './css.styl'
import {Controlled as CodeMirror} from 'react-codemirror2'
import 'codemirror/mode/sql/sql'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/mode/shell/shell'
import 'codemirror/mode/python/python'
import _ from 'lodash'
import Fetch from 'client/common/fetch-final'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/eclipse.css'
import JobParamsEdit from './paramEdit/job-params-edit'
import ETLTaskEdit from './paramEdit/etl-task-edit'
import DateVarCheatSheet from './date-var-cheatsheet'
import {gobblin} from '../constants'

import {dqConfTemp, envConfTemp} from './data-quality-conf'
import DqEditPanel from './data-quality-edit-panel'
const FormItem = Form.Item

const {
  dataDevHiveScriptProxyUser = 'root'
} = window.sugo

const OFFLINEFILE = 'offline_file'
const REALTIMEFILE = 'realtime_file'
const OFFLINEDATABASE = 'offline_db'
const REALTIMEKAFKAREADER = 'realtime_kafka'
const LOGFILEREADER = 'log_file'
const TRIM = 'trim'
const REPLACE = 'replace'
const NUMBERFILTER = 'number_filter'
const STRINGFILTER = 'string_filter'
const SENSITIVEINFO = 'sensitive_info'
const DATEFORMAT = 'date_format'
const JOINCOLUMN = 'join_column'
const SPLITCOLUMN = 'split_column'
const JSONRESOLVE = 'json_resolve'
const JSONParser = 'json'
const CSVParser = 'csv'
const GROKParser = 'grok'

const GATEWAY = 'gateway'
const KAFKA = 'kafka'
const CONSOLE = 'console'
const HDFS = 'hdfs'
const FILE = 'file'
const ASSEMBLER = '输出转换器'
const READER = '读取器'
const PARSER = '输入转换器'
const WRITER = '写入器'
const CONVERTER = '过滤器'

const CONVERTERNAMED = {
  trim: '去空格过滤器',
  replace: '替换过滤器',
  number_filter: '数字过滤器',
  string_filter: '字符串过滤器',
  sensitive_info: '敏感信息过滤器',
  date_format: '日期过滤器',
  join_column: '字段合并过滤器',
  split_column: '字段分割过滤器',
  json_resolve: 'json打平过滤器'
}


const DQ_JSON_KEY = 'dq.json'
const DQ_ENV_JSON_KEY = 'env.json'
const DQ_PANEL_CONF = 'panelConf'
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
    prop: {'user.to.proxy': {value: dataDevHiveScriptProxyUser}}
  },
  druidIndex: {
    prop: {
      'datasourceId': {value: ''},
      'segmentGranularity': {value: 'DAY'},
      'datasourceName': {value: ''},
      'intervalStart': {value: '${businessTime-1T00:00:00}'},
      'intervalEnd': {value: '${businessTime-0T00:00:00}'},
      'paths': {value: ''},
      'numShards': {value: '1'},
      'timestampColumn': {value: 'ts'},
      'timestampFormat': {value: 'millis'}
    }
  },
  oraclesql: {
    codeMode: 'text/x-sql',
    scriptField: 'oraclesql.script',
    prop: {
      'oracle.url': {value: ''},
      'oracle.password': {value: ''},
      'save.type': {value: 'file'},
      'save.path': {value: ''},
      'save.file.name': {value: 'sql-result.csv'}
    }
  },
  mysql: {
    codeMode: 'text/x-mysql',
    scriptField: 'mysql.script',
    prop: {
      'node.mysql.url': {value: ''},
      'node.mysql.user': {value: ''},
      'node.mysql.password': {value: ''},
      'save.type': {value: 'file'},
      'save.path': {value: ''},
      'save.file.name': {value: 'sql-result.csv'}
    }
  },
  postgres: {
    codeMode: 'text/x-pgsql',
    scriptField: 'postgres.script',
    prop: {
      'node.postgres.url': {value: ''},
      'node.postgres.user': {value: ''},
      'node.postgres.password': {value: ''},
      'save.type': {value: 'file'},
      'save.path': {value: ''},
      'save.file.name': {value: 'sql-result.csv'}
    }
  },
  sqlserver: {
    codeMode: 'text/x-sql',
    scriptField: 'sqlserver.script',
    prop: {
      'node.sqlserver.url': {value: ''},
      'node.sqlserver.user': {value: ''},
      'node.sqlserver.password': {value: ''},
      'save.type': {value: 'file'},
      'save.path': {value: ''},
      'save.file.name': {value: 'sql-result.csv'}
    }
  },
  access: {
    // codeMode: 'text/x-sh',
    // scriptField: 'access.script',
    prop: {
      datasource: {value: ''},
      'file.path': {value: ''},
      'file.name': {value: 'sql-result.csv'},
      'column.name.map': {value: ''},
      'column.type.map': {value: ''},
      'hmaster.address': {value: ''}

    }
  },
  sqlWait: {
    // codeMode: 'text/x-sh',
    // scriptField: 'sqlWait.script',
    prop: {
      'db.type': {value: ''},
      'url': {value: ''},
      'user': {value: ''},
      'password': {value: ''},
      'query.string': {value: ''},
      'expect.result': {value: ''},
      'per.wait.second.count': {value: '60'},
      'overtime.second.count': {value: '7200'}
    }
  },
  checkResult: {
    // codeMode: 'text/x-sh',
    // scriptField: 'checkResult.script',
    prop: {
      'source.db.type': {value: ''},
      'source.url': {value: ''},
      'source.user': {value: ''},
      'source.password': {value: ''},
      'source.sql': {value: ''},

      'hive.url': {value: ''},
      'hive.user': {value: ''},
      'hive.password': {value: ''},
      'hive.sql': {value: ''},

      'astro.ip': {value: ''},
      'query.engine': {value: ''},
      'druid.sql': {value: ''}
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
  dataQuality: {
    showAddButton: true,
    panelType: 1,
    prop: {
      'metricTime': '${_date - 1 % ts_yyyyMMdd}',
      'hive.table': {value: ''},
      'hive.condition': {value: ''},
      'panelConf': {value: {panelType: 1}}
    }
  },
  nodeWait: {
    prop: {
      'projectId': {value: '', type: 'selectTask'},
      'nodeId': {value: '', type: 'selectJob'},
      'executeTime': {
        value: '1,day',
        type: 'selectUnit'
      },
      'timeout': {value: '7200'}
    }
    // scriptField: 'showName'
  },
  dataCollect: {
    scriptField: 'dataCollect.script'
  }
}

// {
//   "reader": {
//     "type": "file",
//     "fileDir": "log/test",
//     "isSeparate": true
// },
//   "parser": {
//   "type": "csv",
//     "columnNames": "id,name,job"
// },
//   "writer": {
//   "type": "console"
// },
//   "assembler": {
//   "type": "json"
// },
//   "converters": [{
//   "type": "trim",
//   "configs": [{
//     "name": "id"
//   }, {
//     "name": "name"
//   }]
// }, {
//   "type": "split_column",
//   "configs": [{
//     "name": "name",
//     "separator": "_",
//     "newColumns": "name1,name2"
//   }]
// }]
// }

class TaskStepInfo extends React.Component {

  state = {
    etlTaskEditMap: {},
    configData: [],
    backupConfigData: [],
    code: '',
    visibleParamsEdit: false,
    mirrorLoading: false
  }

  componentWillReceiveProps = (nextProps) => {
    const {defaultStepInfo} = this.props
    if (nextProps.defaultStepInfo.id !== defaultStepInfo.id || nextProps.showStepInfo) {
      this.getData(nextProps.projectId, nextProps.taskName, nextProps.defaultStepInfo)
    }
  }


  saveTaskMap = (taskMap, status) => {
    this.setState({
      etlTaskEditMap: taskMap
    })
  }

  saveEtlTaskEdit = async () => {
    let {defaultStepInfo, projectId, taskName} = this.props


    let {etlTaskEditMap} = this.state

    let newReader = this.checkReader(etlTaskEditMap.reader)
    if (newReader === '') return
    _.set(etlTaskEditMap, 'reader', newReader)


    let converter = _.get(etlTaskEditMap, 'cleaner.converterList')
    //when converter is not null ,parser and assembler must not null
    if (!_.isEmpty(converter)) {
      let newConverter = this.checkConverter(_.get(etlTaskEditMap, 'cleaner.converterList'))
      if (newConverter === '') return
      _.set(etlTaskEditMap, 'cleaner.converterList', newConverter)

      if (!this.checkParser(_.get(etlTaskEditMap, 'cleaner.parser'))) return
      if (!this.checkAssembler(_.get(etlTaskEditMap, 'cleaner.assembler'))) return
    }


    let newWriter = this.checkWriter(_.get(etlTaskEditMap, 'writer'))


    if (newWriter === '') return
    _.set(etlTaskEditMap, 'writer', newWriter)

    const jobName = defaultStepInfo.id.indexOf('_node_') >= 0
      ? defaultStepInfo.id.substr(defaultStepInfo.id.indexOf('_node_') + 6)
      : defaultStepInfo.id
    let postData = JSON.stringify(etlTaskEditMap)
    console.log('save data ******** :'+postData)
    // let data = `jobOverride[name]=${defaultStepInfo['name']}&jobOverride[type]=${defaultStepInfo['type']}&jobOverride[showName]=${defaultStepInfo['showName']}&jobOverride[collect.flow.config]=${encodeURIComponent(postData)}`
    let data = `jobOverride[name]=${defaultStepInfo['name']}&jobOverride[type]=${defaultStepInfo['type']}&jobOverride[showName]=${defaultStepInfo['showName']}`
    let params = `project=${taskName}&ajax=setJobOverrideProperty2&jobName=${jobName}&scriptContent=${encodeURIComponent(postData)}&refProjectId=${projectId}&${data}`
    const res = await Fetch.post('/app/task-schedule/manager', {}, {
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Accept': 'application/json'
      }
    })
    if (res.error) {
      message.error(res.error)
      return
    }

    this.setState({isChange: false, visibleParamsEdit: false}, () => {
      this.props.closeStepInfoPanel(defaultStepInfo.id, defaultStepInfo['showName'])
    })

  }


  checkReader = reader => {
    if (_.isEmpty(reader)) {
      message.warn('请选择读取器')
      return ''
    }
    let isSuccess = false
    switch (_.get(reader, 'type')) {

      case REALTIMEFILE:
        if (_.isEmpty(_.get(reader, 'fileName')))
          message.warn('请输入' + READER + '的要读取的文件名')
        else isSuccess = true
        break
      case OFFLINEFILE:
        if (_.isEmpty(_.get(reader, 'fileDir')))
          message.warn('请输入' + READER + '的目录名称')
        else isSuccess = true
        break
      case LOGFILEREADER:
        if (_.isEmpty(_.get(reader, 'fileDir')))
          message.warn('请输入' + READER + '的要读取的文件夹名')
        else isSuccess = true
        break
      case OFFLINEDATABASE:
        if (_.isEmpty(_.get(reader, 'server')))
          message.warn('请输入' + READER + '的数据库ip地址')
        else if (_.get(reader, 'port') === '' || _.get(reader, 'port') <= 0)
          message.warn('请输入' + READER + '的数据库端口号')
        else if (_.isEmpty(_.get(reader, 'user')))
          message.warn('请输入' + READER + '的数据库用户名')
        else if (_.isEmpty(_.get(reader, 'password')))
          message.warn('请输入' + READER + '的数据库密码')
        else if (_.isEmpty(_.get(reader, 'dbType')))
          message.warn('请输入' + READER + '的数据库ip地址')
        else if (_.isEmpty(_.get(reader, 'database')))
          message.warn('请输入' + READER + '的使用的数据库名称')
        else if (_.isEmpty(_.get(reader, 'sql')))
          message.warn('请输入' + READER + '的执行sql语句')
        else if (_.isEmpty(_.get(reader, 'separator')))
          message.warn('请输入' + READER + '的合成记录的字段分隔符')
        else isSuccess = true
        break
      case REALTIMEKAFKAREADER:
        if (_.isEmpty(_.get(reader, 'topic')))
          message.warn('请输入' + READER + '的读取的文件名')
        else if (_.isEmpty(_.get(reader, 'consumerProperties.bootstrapServers')))
          message.warn('请输入' + READER + '的bootstrap.servers')
        else if (_.isEmpty(_.get(reader, 'consumerProperties.autoOffsetReset')))
          message.warn('请输入' + READER + '的auto.offset.reset')
        else isSuccess = true
        if (!isSuccess) break
        let newConsumerProperties = {}
        newConsumerProperties['bootstrap.servers'] = _.get(reader, 'consumerProperties.bootstrapServers')
        newConsumerProperties['auto.offset.reset'] = _.get(reader, 'consumerProperties.autoOffsetReset')
        if (!_.isEmpty(_.get(reader, 'consumerProperties.propertiesList'))) {
          for (let i = 0; i < reader.consumerProperties.propertiesList.length; i++) {
            let item = reader.consumerProperties.propertiesList[i]
            newConsumerProperties[item['key']] = item['value']
          }
        }
        // let propertiesStr = JSON.stringify(newConsumerProperties)
        _.set(reader, 'consumerProperties', newConsumerProperties)
        break
      default:
        message.warn('请选择读取器')
        break
    }
    let newExtraMessage = {}
    if (!_.isEmpty(_.get(reader, 'extraMessages'))) {
      for (let i = 0; i < reader.extraMessages.length; i++) {
        let item = reader.extraMessages[i]
        newExtraMessage[item['key']] = item['value']
      }
    }
    _.set(reader, 'extraMessages', newExtraMessage)
    if (isSuccess) {
      return reader
    }
    return ''
  }

  checkWriter = writer => {
    if (_.isEmpty(writer)) {
      message.warn('请选择' + WRITER)
      return ''
    }
    let isSuccess = false
    switch (writer.type) {

      case GATEWAY:
        if (_.isEmpty(_.get(writer, 'api')))
          message.warn('请输入' + WRITER + '的网关上的路径')
        else isSuccess = true
      case FILE:
        isSuccess = true
        break
      case KAFKA:
        if (_.isEmpty(_.get(writer, 'topic')))
          message.warn('请输入' + WRITER + '的kafka topic名称')
        else if (_.isEmpty(_.get(writer, 'zkHosts')))
          message.warn('请输入' + WRITER + '的kafka在zk上的路径')
        else if (_.isEmpty(_.get(writer, 'properties.bootstrapServers')))
          message.warn('请输入' + WRITER + '的bootstrap.servers')
        else isSuccess = true
        if (!isSuccess) break

        let newConsumerProperties = {}
        newConsumerProperties['bootstrap.servers'] = _.get(writer, 'properties.bootstrapServers')
        if (!_.isEmpty(_.get(writer, 'properties.propertiesList'))) {
          for (let i = 0; i < writer.properties.propertiesList.length; i++) {
            let item = writer.properties.propertiesList[i]
            newConsumerProperties[item['key']] = item['value']
          }
        }
        // const propertiesStr = JSON.stringify(newConsumerProperties)
        _.set(writer, 'producerProperties', newConsumerProperties)
        break
      case CONSOLE:
        isSuccess = true
        break
      case HDFS:
        if (_.isEmpty(_.get(writer, 'nameNodes')))
          message.warn('请输入' + WRITER + 'hdfs namenode节点')
        else isSuccess = true
        break
      default:
        message.warn('请选择' + WRITER)
    }
    if (isSuccess) return writer
    return ''
  }

  checkParser = parser => {
    if (_.isEmpty(parser)) {
      message.warn('请选择' + PARSER)
      return false
    }
    let isSuccess = false
    switch (parser.type) {
      case JSONParser:
        isSuccess = true
        break
      case CSVParser:
        if (_.isEmpty(_.get(parser, 'columnNames')))
          message.warn('请输入' + PARSER + '的字段名')
        else isSuccess = true
        break
      case GROKParser:
        if (_.isEmpty(_.get(parser, 'expr')))
          message.warn('请输入' + PARSER + '的用于匹配数据的grok表达式')
        else isSuccess = true
        break
      default :
        message.warn('请选择' + PARSER)
    }
    return isSuccess
  }

  checkConverter = converter => {
    let isSuccess = false
    if (_.isEmpty(converter)) {
      message.warn('请选择' + CONVERTER)
      return ''
    }
    for (let i = 0; i < converter.length; i++) {
      let item = converter[i]
      if (item.type !== TRIM) {
        for (let y = 0; y < item.configs.length; y++) {
          let config = item.configs[y]
          switch (item.type) {
            case REPLACE:
              if (_.isEmpty(_.get(config, 'pattern')))
                message.warn('请输入' + CONVERTERNAMED[REPLACE] + '字符串的正则表达式')
              else if (_.isEmpty(_.get(config, 'target')))
                message.warn('请输入' + CONVERTERNAMED[REPLACE] + '中要替换的字符串')
              else if (_.isEmpty(_.get(config, 'name')))
                message.warn('请输入' + CONVERTERNAMED[REPLACE] + '中字段名')
              else isSuccess = true
              break
            case NUMBERFILTER:
              if (_.isEmpty(_.get(config, 'name')))
                message.warn('请输入' + CONVERTERNAMED[NUMBERFILTER] + '中字段名')
              else if (_.get(config, 'minValue') >= _.get(config, 'maxValue'))
                message.warn(CONVERTERNAMED[NUMBERFILTER] + '中最小值比最大值大')
              else isSuccess = true
              break

            case STRINGFILTER:
              if (_.isEmpty(_.get(config, 'regex')))
                message.warn('请输入' + CONVERTERNAMED[STRINGFILTER] + '中匹配的正则表达式')
              else if (_.isEmpty(_.get(config, 'name')))
                message.warn('请输入' + CONVERTERNAMED[STRINGFILTER] + '中字段名')
              else isSuccess = true
              break
            case SENSITIVEINFO:
              if (_.isEmpty(_.get(config, 'name')))
                message.warn('请输入' + CONVERTERNAMED[SENSITIVEINFO] + '中字段名')
              else isSuccess = true
              break
            case DATEFORMAT:
              if (_.isEmpty(_.get(config, 'name')))
                message.warn('请输入' + CONVERTERNAMED[SENSITIVEINFO] + '中字段名')
              else isSuccess = true
              break
            case JOINCOLUMN:
              if (_.isEmpty(_.get(config, 'newColumnName')))
                message.warn('请输入' + CONVERTERNAMED[JOINCOLUMN] + '中合并完的新字段名')
              else if (_.isEmpty(_.get(config, 'expression')))
                message.warn('请输入' + CONVERTERNAMED[JOINCOLUMN] + '中合并字段的表达式')
              else isSuccess = true
              break
            case SPLITCOLUMN:
              if (_.isEmpty(_.get(config, 'separator')))
                message.warn('请输入' + CONVERTERNAMED[SPLITCOLUMN] + '中字段的分割符')
              else if (_.isEmpty(_.get(config, 'newColumnNames')))
                message.warn('请输入' + CONVERTERNAMED[SPLITCOLUMN] + '中分割后的字段名')
              else if (_.isEmpty(_.get(config, 'name')))
                message.warn('请输入' + CONVERTERNAMED[SPLITCOLUMN] + '中字段名')
              else isSuccess = true
              break
            case JSONRESOLVE:
              if (_.isEmpty(_.get(config, 'name')))
                message.warn('请输入' + CONVERTERNAMED[JSONRESOLVE] + '中字段名')
              else isSuccess = true
              break
            default:
              message.warn('请输入' + CONVERTER)
          }
          if (!isSuccess) break
        }
      } else {
        if (_.isEmpty(_.get(item, 'configs'))) {
          message.warn('请输入' + CONVERTERNAMED[TRIM] + '中的字段名')
        } else isSuccess = true
        if (isSuccess) {
          let list = []
          const strList = _.split(_.get(item, 'configs'), ',')
          for (let y = 0; y < strList.length; y++) {
            list[y] = {
              'name': strList[y]
            }
          }
          _.set(converter, `${i}.configs`, list)
        }
      }
      if (!isSuccess) break
    }
    if (isSuccess) return converter
    return ''

  }

  checkAssembler = assembler => {
    if (_.isEmpty(assembler)) {
      message.warn('请选择' + ASSEMBLER)
      return ''
    }
    return true
  }


  editInstance = null

  saveStepInfo = async() => {
    let {defaultStepInfo, projectId, taskName} = this.props
    let {configData, code} = this.state

    const jobName = defaultStepInfo.id.indexOf('_node_') >= 0
      ? defaultStepInfo.id.substr(defaultStepInfo.id.indexOf('_node_') + 6)
      : defaultStepInfo.id

    let postData
    if (defaultStepInfo.type === 'gobblin') {
      let gobblinParam = {}
      try {
        configData.map(item => {
          if (item.name === 'gobblin') {
            gobblinParam = (typeof item.value === 'string')
              ? JSON.parse('{' + item.value.trim().replace(/(\s*\n\s*)\"/g, ',"') + '}')
              : item.value
          }
        })
        gobblinParam.type = 'gobblin'
        postData = `paramJson=${encodeURIComponent(JSON.stringify(gobblinParam))}`
      } catch (error) {
        return message.error('gobblin配置有误，请确认引号逗号是否正确')
      }
    } else if (defaultStepInfo.type === 'dataQuality') {
      postData = configData.filter(
        p => p.name !== '' &&
        p.name !== DQ_ENV_JSON_KEY &&
        p.name !== DQ_JSON_KEY &&
        p.name !== DQ_PANEL_CONF).map(
        p => `jobOverride[${encodeURIComponent(p.name)}]=${encodeURIComponent(p.value)}`
      ).join('&')

      const dqConf = JSON.parse(JSON.stringify(dqConfTemp))
      dqConf.name = taskName + '\x01' + jobName

      let panelConf = configData.find(p => p.name === DQ_PANEL_CONF)
      if (panelConf && typeof panelConf.value === 'string')
        panelConf.value = JSON.parse(LZString.decompressFromEncodedURIComponent(panelConf.value))
      let panelType = panelConf ? panelConf.value.panelType : 1
      if (panelType === 2) {
        // hive table info
        let dsConf = {}
        const tbl = configData.find(p => p.name === 'hive.table')
        let dbAndTbl = tbl.value.split('.')
        dsConf['database'] = dbAndTbl[0]
        dsConf['table.name'] = dbAndTbl[1]
        dsConf['where'] = configData.find(p => p.name === 'hive.condition').value
        dqConf['data.sources'][0]['connectors'][0]['config'] = dsConf

        //rules
        const rulePrefix = 'rule.'
        const rules = configData.filter(p => p.name.startsWith(rulePrefix)).map(p => ({
          'rule': p.value,
          'dsl.type': 'griffin-dsl',
          'dq.type': 'PROFILING',
          'out.dataframe.name': p.name.substr(rulePrefix.length)
        }))
        if (rules.length == 0){
          message.error('指标不能为空!')
          return
        }
        dqConf['evaluate.rule']['rules'] = rules

        //businessTime
        const bustime = configData.find(p => p.name === 'metricTime')
        if(bustime.value.trim() !== ''){
          dqConf['timestamp'] = bustime.value
        }

        postData = postData + '&' + DQ_ENV_JSON_KEY + '=' + encodeURI(JSON.stringify(envConfTemp)) +
          '&' + DQ_JSON_KEY + '=' + encodeURI(JSON.stringify(dqConf)) +
          '&jobOverride[' + DQ_PANEL_CONF + ']=' + LZString.compressToEncodedURIComponent(JSON.stringify(panelConf.value))

      } else if (panelType === 1) {
        let panelConf = configData.find(p => p.name === DQ_PANEL_CONF)
        if (!panelConf || !panelConf.value) {
          message.warning('指标信息不完整！')
          return
        }

        let {currentDB, currentTable, condition, measures} = panelConf.value

        if (!measures || measures.length === 0){
          message.error('指标不能为空!')
          return
        }
        let measureKeys = Object.keys(measures)
        if (measureKeys.length === 0) {
          message.warning('指标信息不完整！')
          return
        }
        let dsConf = {}
        dsConf['database'] = currentDB
        dsConf['table.name'] = currentTable
        let maf = getMeasureAndFilter(condition)
        dsConf['where'] = maf.condition
        dqConf['data.sources'][0]['connectors'][0]['config'] = dsConf
        const rules = measureKeys.map((key) => {
          let maf = getMeasureAndFilter(measures[key])
          let ruleStr = maf.condition === '' ? maf.measure : ( maf.measure + ' where ' + maf.condition)
          return {
            'rule': ruleStr,
            'dsl.type': 'griffin-dsl',
            'dq.type': 'PROFILING',
            'out.dataframe.name': key
          }
        })
        dqConf['evaluate.rule']['rules'] = rules

        //businessTime
        const bustime = configData.find(p => p.name === 'metricTime')
        if(bustime.value.trim() !== ''){
          dqConf['timestamp'] = bustime.value
        }
        postData = postData + '&' + DQ_ENV_JSON_KEY + '=' + encodeURI(JSON.stringify(envConfTemp)) +
          '&' + DQ_JSON_KEY + '=' + encodeURI(JSON.stringify(dqConf)) +
          '&jobOverride[' + DQ_PANEL_CONF + ']=' + LZString.compressToEncodedURIComponent(JSON.stringify(panelConf.value))

      }

    } else {
      postData = configData.filter(p => p.name !== '').map(p => `jobOverride[${encodeURIComponent(p.name)}]=${encodeURIComponent(p.value)}`).join('&')
    }

    let params = `project=${taskName}&ajax=setJobOverrideProperty2&jobName=${jobName}&scriptContent=${encodeURIComponent(code)}&${postData}&refProjectId=${projectId}`
    const res = await Fetch.post('/app/task-schedule/manager', {}, {
      body: params,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Accept': 'application/json'
      }
    })

    if (res.error) {
      message.error(res.error)
      return
    }
    this.setState({isChange: false, visibleParamsEdit: false}, () => {
      const showName = configData.find(p => p.name === 'showName') || {}
      this.props.closeStepInfoPanel(defaultStepInfo.id, showName.value)
    })
  }

  cancelSave = () => {
    this.setState({visibleParamsEdit: false}, () => this.props.closeStepInfoPanel())
  }

  getData = async(projectId, taskName, stepInfo) => {
    if (!stepInfo.name) {
      message.error('节点信息错误')
    }
    let data = stepInfo
    const jobConfig = _.get(JobDefaultProps, stepInfo.type)
    const jobName = stepInfo.id.indexOf('_node_') >= 0 ? stepInfo.id.substr(stepInfo.id.indexOf('_node_') + 6) : stepInfo.id
    const res = await Fetch.post(`/app/task-schedule/manager?project=${taskName}&ajax=fetchJobInfo2&jobName=${jobName}&refProjectId=${projectId}`)
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
      data = {...data, ...jobConfig.prop}
    }

    data = _.mapValues(data, (p, k) => {
      let colType = {}
      let jobColType = _.get(jobConfig, ['prop', k, 'type'], '')
      if (jobColType) {
        colType.type = jobColType
      }
      if (typeof (p) === 'string' && p.indexOf('\n') >= 0) {
        return {value: JSON.stringify(p).replace(/^.(.+?).$/, '$1'), ...colType}
      } else if (typeof (p.value) === 'string' && p.value.indexOf('\n') >= 0) {
        return {value: JSON.stringify(p.value).replace(/^.(.+?).$/, '$1'), ...colType}
      }
      return typeof (p) === 'string' ? {value: p, ...colType} : {...p, ...colType}
    })

    let code = ''
    if (jobConfig.scriptField && data[jobConfig.scriptField]) {
      let scriptName = data[jobConfig.scriptField].value
      const startIndex = scriptName.indexOf('scripts/')
      if (startIndex > -1) scriptName = scriptName.substr(startIndex + 8)
      code = await Fetch.post(`/app/task-schedule/manager?project=${taskName}&ajax=downloadScript&fileName=${scriptName}&refProjectId=${projectId}`)
    }

    const params = _.omit(data, ['top', 'height', 'width', 'dependencies', 'left', 'id'])
    const infoArray = _.map(_.keys(params), (p, i) => ({name: p, ...data[p], index: i}))

    if(stepInfo.type === 'dataCollect') {
      let taskMap = {}
      if (!_.isEmpty(code)) {
        taskMap = JSON.parse(code)
        taskMap = this.etlTaskConversion(taskMap)
        this.setState({etlTaskEditMap:taskMap})
      }
    }

    this.setState({
      configData: infoArray,
      backupConfigData: _.cloneDeep(infoArray),
      code
    }, () => setTimeout(() => this.editInstance && this.editInstance.refresh(), 200))
  }

  onAppendParams = () => {
    const {configData} = this.state
    const info = configData.find(p => p.name === '')
    if (!info) {
      const maxIndex = (_.maxBy(configData, p => p.index) || {index: 0}).index
      this.setState({
        configData: [...configData, {name: '', value: '', type: 'new', index: maxIndex + 1}]
      })
    }
  }

  onChangeParams = (obj) => {
    const {configData} = this.state
    let newConfigData = _.cloneDeep(configData)
    let index = newConfigData.findIndex(p => p.index === obj.index)
    newConfigData[index] = obj
    if (obj.name === 'projectId') {
      let index = newConfigData.findIndex(p => p.name === 'nodeId')
      if (index >= 0) newConfigData[index].value = ''
    }

    this.setState({configData: newConfigData})
  }

  onRemoveParams = (idx) => {
    const {configData} = this.state
    this.setState({
      configData: [...configData.filter(p => p.index !== idx)]
    })
  }

  resetConfig = () => {
    const {backupConfigData} = this.state
    this.setState({
      configData: _.cloneDeep(backupConfigData)
    })
  }

  updateDqConf = (conf) => {
    const {configData} = this.state
    let newConfigData = _.cloneDeep(configData)
    let panelConf = newConfigData.find(p => p.name === DQ_PANEL_CONF)
    let index
    if (!panelConf) {
      const maxIndex = (_.maxBy(newConfigData, p => p.index) || {index: 0}).index
      index = maxIndex + 1
      panelConf = {name: DQ_PANEL_CONF, value: {}, index: index}
    } else {
      index = newConfigData.findIndex(p => p.index === panelConf.index)
    }
    if (typeof panelConf.value === 'string')
      panelConf.value = JSON.parse(LZString.decompressFromEncodedURIComponent(panelConf.value))
    panelConf.value.condition = conf.condition ? conf.condition : panelConf.value.condition
    panelConf.value.measures = conf.measures ? conf.measures : panelConf.value.measures
    panelConf.value.currentDB = conf.currentDB ? conf.currentDB : panelConf.value.currentDB
    panelConf.value.currentTable = conf.currentTable ? conf.currentTable : panelConf.value.currentTable
    panelConf.value.panelType = conf.panelType ? conf.panelType : panelConf.value.panelType
    newConfigData[index] = panelConf
    this.setState({configData: newConfigData})

  }

  renderDataQualityPanel() {
    let {configData} = this.state
    let panelConf = configData.find(p => p.name === DQ_PANEL_CONF)

    if (!panelConf || !panelConf.value.currentDB || panelConf.value.currentDB === '') {
      let baseProps = {
        condition: getNewCondition(''),
        measures: {},
        currentDB: '',
        currentTable: '',
        updateConf: this.updateDqConf
      }
      return <DqEditPanel {...baseProps}/>
    } else {
      if (typeof panelConf.value === 'string')
        panelConf.value = JSON.parse(LZString.decompressFromEncodedURIComponent(panelConf.value))
      let baseProps = {
        condition: panelConf.value.condition,
        measures: panelConf.value.measures,
        currentDB: panelConf.value.currentDB,
        currentTable: panelConf.value.currentTable,
        updateConf: this.updateDqConf
      }
      return <DqEditPanel {...baseProps}/>
    }

  }
  etlTaskConversion = (taskMap) => {
    let {reader, writer} = taskMap
    let cleaner = _.get(taskMap, 'cleaner')
    let converterList = null
    if (!_.isEmpty(cleaner)) {
      converterList = _.get(cleaner, 'converterList')
    }
    if (!_.isEmpty(converterList)) {
      for (let i = 0; i < converterList.length; i++) {
        let item = converterList[i]
        if (item.type === TRIM) {
          let list = []
          for (let y = 0; y < item.configs.length; y++) {
            const value = item.configs[y]
            list.push(value.name)
          }
          let listStr = list.join(',')
          _.set(converterList, `${i}.configs`, listStr)
        }
      }
      _.set(taskMap, 'cleaner.converterList', converterList)
    }

    if (reader.type === REALTIMEKAFKAREADER) {
      const consumerProperties = reader.consumerProperties
      let newConsumerProperties = {propertiesList: []}
      for (const key in consumerProperties) {
        if (key === 'bootstrap.servers') newConsumerProperties.bootstrapServers = consumerProperties[key]
        else if (key === 'auto.offset.reset') newConsumerProperties.autoOffsetReset = consumerProperties[key]
        else {
          newConsumerProperties.propertiesList.push({
            key: key,
            value: consumerProperties[key]
          })
        }
      }
      _.set(taskMap, 'reader.consumerProperties', newConsumerProperties)
    }

    let extraMessages = _.get(reader, 'extraMessages')
    if (!_.isEmpty(extraMessages)) {
      let newExtraMessages = []

      for(let key  in extraMessages){
        newExtraMessages.push({key: key, value: extraMessages[key]})
      }

      _.set(reader, 'extraMessages', newExtraMessages)
    }

    if (writer.type === KAFKA) {
      const producerProperties = writer.producerProperties
      let properties = {propertiesList: []}
      for (const key in producerProperties) {
        if (key === 'bootstrap.servers') properties.bootstrapServers = producerProperties[key]
        else {
          properties.propertiesList.push({
            key: key,
            value: producerProperties[key]
          })
        }
      }
      taskMap.properties = properties
    }

    return taskMap
  }
  render() {
    const {showStepInfo, defaultStepInfo, projectId} = this.props
    if (!showStepInfo) return null

    let useSpecialPanel = false
    let specialPanel = ''

    const {configData, code, visibleParamsEdit, fetchNode} = this.state
    const hasCodePanle = _.get(JobDefaultProps, [defaultStepInfo.type, 'codeMode'], '')
    const omitKey = ['name', 'type', _.get(JobDefaultProps, [defaultStepInfo.type, 'scriptField'])]
    // 这段代码只是为了调整视图

    const omitShowNameList = ['nodeWait', 'gobblin', 'dataCollect']
    if (omitShowNameList.includes(defaultStepInfo.type)) {
      omitKey.push('showName')
    }

    const configDataMap = _.keyBy(configData, 'name')
    let defaultParamsKey = _.keys(_.get(JobDefaultProps, [defaultStepInfo.type, 'prop'], {}))

    let showConfigData = configData
    if (defaultStepInfo.type === 'dataQuality') {
      let panelConf = configData.find(p => p.name === DQ_PANEL_CONF)
      if (panelConf && typeof panelConf.value === 'string')
        panelConf.value = JSON.parse(LZString.decompressFromEncodedURIComponent(panelConf.value))
      let panelType = panelConf ? panelConf.value.panelType : 1
      if (panelType === 1) {
        useSpecialPanel = true
        const formItemLayout = {
          labelCol: {span: 3},
          wrapperCol: {span: 19}
        }
        const showName = configData.find(p => p.name === 'showName') || {}
        const metricTime = configData.find(p => p.name === 'metricTime') || {}
        specialPanel = (
          <div>

            <FormItem {...formItemLayout} label="名称">
              <div className="itblock mg1l">

                <Input value={showName.value} className="width100"
                  onChange={(e)=>{
                    showName.value = e.target.value
                    this.onChangeParams(showName)
                  }
                  }
                />

                <Popconfirm title="切换到“高级编辑模式”后无法恢复回正常模式，确认切换？" onConfirm={(event) =>{
                  this.updateDqConf({panelType: 2})
                }} okText="是" cancelText="否"
                >
                  <a href="#" style={{marginLeft: '100px'}}>高级编辑模式</a>
                </Popconfirm>
              </div>
            </FormItem>
            <FormItem {...formItemLayout} label="指标时间">
              <div className="itblock mg1l">
                <Input value={metricTime.value} className="width100"
                  onChange={(e)=>{
                    metricTime.value = e.target.value
                    this.onChangeParams(metricTime)
                  }
                  }
                />
              </div>
            </FormItem>
            {this.renderDataQualityPanel()}
          </div>
        )
      } else if (panelType === 2) {
        defaultParamsKey = defaultParamsKey.filter(p => p.name !== DQ_ENV_JSON_KEY && p.name !== DQ_JSON_KEY && p.name !== DQ_PANEL_CONF)
        showConfigData = configData.filter(p => p.name !== DQ_ENV_JSON_KEY && p.name !== DQ_JSON_KEY && p.name !== DQ_PANEL_CONF)
      }

    }
    defaultParamsKey = ['showName', ...defaultParamsKey]
    const content = (<JobParamsEdit
      defaultParamsKey={defaultParamsKey}
      params={showConfigData}
      onAppendParams={this.onAppendParams}
      onChangeParams={this.onChangeParams}
      onRemoveParams={this.onRemoveParams}
      resetConfig={this.resetConfig}
      omitKey={omitKey}
      projectId={projectId}
                     />)

    let showAddButton = _.get(JobDefaultProps, [defaultStepInfo.type, 'showAddButton'], false)

    const jobParamsEdit = () => {
      return (
        <JobParamsEdit
          showAddButton={showAddButton}
          defaultParamsKey={defaultParamsKey}
          params={showConfigData}
          onAppendParams={this.onAppendParams}
          onChangeParams={this.onChangeParams}
          onRemoveParams={this.onRemoveParams}
          omitKey={omitKey}
          projectId={projectId}
        />
      )
    }

    const etlTaskEdit = () => {
      const {configData, etlTaskEditMap} = this.state
      let editPanel = '0'
      const props = {
        saveTaskMap: this.saveTaskMap,
        taskMap: etlTaskEditMap,
        editPanel: editPanel
      }
      return (
        <ETLTaskEdit {...props}/>
      )
    }




    const codePanel = () => {
      return (
        <div>
          <Popover
            content={<DateVarCheatSheet/>}
            placement="rightTop"
            arrowPointAtCenter
            trigger="click"
            onClick={() => {
              this.setState({visibleParamsEdit: false})
            }}
          >
            <Button className="mg1b mg1r">日期变量</Button>
          </Popover>
          <Popover overlayStyle={{width: '600px'}}
            content={content}
            placement="rightTop"
            arrowPointAtCenter
            trigger="click"
            visible={visibleParamsEdit}
            title={[
              <span key="title" className="font16 mg2r">设置自定义参数</span>,
              <CloseCircleOutlined
                key="close"
                className="fright fpointer font18 color-red"
                onClick={() => {
                  this.setState({visibleParamsEdit: false})
                }}
              />
            ]}
            onClick={() => {
              this.setState({visibleParamsEdit: true})
            }}
          >
            <Button className="mg1b">设置参数</Button>
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
              this.setState({code: value, isChange: true})
            }}
            onFocus={(editor, data) => {
              editor.refresh()
            }}
          />
        </div>
      )
    }

    const activePanel = () => {
      if(useSpecialPanel) {
     	return specialPanel
      }
      if (hasCodePanle) {
        return codePanel()
      } else if (defaultStepInfo.type === 'dataCollect') {
        return etlTaskEdit()
      } else {
        return jobParamsEdit()
      }
    }


    return (<Modal
      title={`节点信息-${_.get(configDataMap, 'name.value')}`}
      visible={showStepInfo}
      onCancel={this.cancelSave}
      onOk={_.get(configDataMap, 'name.value') === '数据采集脚本' ? this.saveEtlTaskEdit : this.saveStepInfo}
      width={1000}
      maskClosable={false}
            >
      <div className="setp_info">
        {

          activePanel()

        }
      </div>
    </Modal>)
  }
}

function getNewCondition(defaultDimName) {
  return {
    hideMeasumeDef: true,
    name: 'condition',
    title: '',
    formula: '',
    type: 1,
    params: {
      simple: {
        //过滤条件
        filters: [],
        //统计类型
        statistics: {
          type: 'count',
          dimensionName: defaultDimName
        },
        //or and
        relation: 'and'
      },
      composite: {
        items: [{}, {}],
        operator: 'divide'
      },
      //编辑模式
      formulaEditMode: 'simple'
    },
    pattern: 'none',
    tags: []
  }
}

const filterTypeOptMap = {
  is: '=',
  isnt: '!=',
  lessThan: '<',
  lessThanOrEqual: '<=',
  greaterThan: '>',
  greaterThanOrEqual: '>=',
  isEmpty: ' is null ',
  notEmpty: ' is not null '
}

function getMeasureAndFilter(measure) {
  let {filters, statistics, relation} = measure.params.simple
  const parentRelation = relation
  const conditions = filters.map((filter) => {
    let {filters, relation} = filter
    const sub_conditions = filters.map((subfilter) => {
      let {dimensionName, value, type} = subfilter
      switch (type) {
        case 'between':
          return dimensionName + ' between \'' + value.join('\' and \'') + '\''
        case 'in':
          value = value[0].split(',')
          return dimensionName + ' in(\'' + value.join('\',\'') + '\')'
        case 'notin':
          value = value[0].split(',')
          return dimensionName + ' not in(\'' + value.join('\',\'') + '\')'
        default:
          return dimensionName + filterTypeOptMap[type] + (typeof value === 'string' ? ('\'' + value + '\'') : value)
      }
    })
    return sub_conditions.join(' ' + relation + ' ')
  })

  let conditionStr = conditions.join(' ' + parentRelation + ' ')
  let {type, dimensionName} = statistics
  let measureStr = `${type}('${dimensionName}') as ${measure.name}`
  let res = {condition: conditionStr, measure: measureStr}
  console.log(res)
  return res
}

export default TaskStepInfo
