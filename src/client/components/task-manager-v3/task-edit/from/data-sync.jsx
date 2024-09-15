/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import { SaveOutlined } from '@ant-design/icons'
import { Tabs, Button, Select, message } from 'antd'
import _ from 'lodash'
import { namespace } from '../model'
import PubSub from 'pubsub-js'
import { connect } from 'react-redux'
import SMKit from 'common/jssm4'
import SetFrom from './set-form'
import BatchSetForm from './batch/batch-set-from'
import ExportSetFrom from './export-set-form'
import { validateFieldsAndScrollByForm } from '../../../../common/decorators'
import Fetch from '../../../../common/fetch-final'
import { FLOW_NODE_INFOS, TASK_EDIT_NODE_TYPE } from '../../constants'

const convertHiveProps = (type, key, value) => {
  const propsMap = {
    type: 'hiveJdbc',
    'cleaner.type': 'string',
    'converterList.type': 'dummy',
    'cleaner.assembler': { type: 'dummy' }
  }
  if (type === 'hive' && _.get(propsMap, [key])) {
    return _.get(propsMap, [key], value)
  }
  return value
}

const Option = Select.Option
const TabPane = Tabs.TabPane
const generatorScriptContent = (dbList, dataCollects = []) => {
  return dataCollects.map(p => {
    const {
      toDataBase,
      toDataSource,
      dirtyChart = '',
      replaceChart = '',
      filterSql,
      dbId,
      datasource,
      columnInfo,
      column = '',
      output_serial_number,
      output_sync_time,
      concatStr,
      output_sync_time_cf,
      output_serial_number_cf,
      hbase_output_serial_number,
      hbase_output_sync_time,
      isPartition = true
    } = p
    const dbInfo = dbList.find(p => p.id === dbId)
    const columns = columnInfo.map(p => p.sourceCol)
    const offsetType = columnInfo.find(p => p.sourceCol === column)
    const targetDbInfo = dbList.find(p => p.id === toDataBase)
    const targetDbType = _.get(targetDbInfo, 'dbType', '')
    const converterArr = columnInfo.map(p => {
      const obj = {
        ..._.omit(p, ['status']),
        finalComment: p.finalComment ? escape(p.finalComment) : '',
        sourceComment: p.sourceComment ? escape(p.sourceComment) : ''
      }
      if (concatStr && p.type === 'hbase_rowkey_map') {
        obj.concatStr = concatStr
      }
      return obj
    })
    const extraArr = []
    if (output_serial_number || hbase_output_serial_number || output_serial_number_cf) {
      if (targetDbType === 'hbase') {
        extraArr.push({
          finalCF: output_serial_number_cf,
          finalCol: hbase_output_serial_number,
          type: 'hbase_output_serial_number'
        })
      } else {
        extraArr.push({
          finalType: 'string',
          finalComment: '',
          finalCol: output_serial_number,
          type: 'output_serial_number'
        })
      }
    }
    if (output_sync_time || hbase_output_sync_time || output_sync_time_cf) {
      if (targetDbType === 'hbase') {
        extraArr.push({
          finalCF: output_sync_time_cf,
          finalCol: hbase_output_sync_time,
          type: 'hbase_output_sync_time'
        })
      } else {
        extraArr.push({
          finalType: 'string',
          finalComment: '',
          finalCol: output_sync_time,
          type: 'output_sync_time'
        })
      }
    }
    return {
      reader: {
        filterSql,
        dbId: _.get(dbInfo, 'id', ''),
        database: _.get(dbInfo, 'dbName', ''),
        datasource,
        dbType: _.get(dbInfo, 'dbType', ''),
        offsetSpec: {
          column,
          format: '',
          type: _.get(offsetType, 'sourceType', '')
        },
        password: _.get(dbInfo, 'dbPassword', ''),
        port: _.get(dbInfo, 'dbPort', ''),
        server: _.get(dbInfo, 'dbIp', ''),
        sql: ` select ${columns.join(',')} from ${datasource}`,
        type: 'offset_db',
        user: _.get(dbInfo, 'dbUser', '')
      },
      cleaner: {
        type: convertHiveProps(targetDbType, 'cleaner.type', 'map'),
        assembler:
          targetDbType === 'hive'
            ? {
                columns: columns,
                separator: '\u0001',
                dirtyChart: dirtyChart.replace(/space/g, ' '),
                replaceChart: replaceChart.replace(/space/g, ' '),
                type: 'csv'
              }
            : {
                type: 'dummy'
              },
        converterList: _.concat(converterArr, extraArr).map(p => {
          return {
            ...p,
            type: convertHiveProps(targetDbType, 'converterList.type', 'col_map')
          }
        })
      },
      writer: {
        dbId: _.get(targetDbInfo, 'id', ''),
        type: convertHiveProps(targetDbType, 'type', targetDbType),
        // 增加数据量名称 为了兼容原来的工作流
        toDataBase: _.get(targetDbInfo, 'dbAlais', ''),
        toDataSource,
        isPartition
      },
      type: 'collectV2'
    }
  })
}

@connect(props => props[namespace])
export default class DataSync extends Component {
  state = {
    dbInfo: [],
    hiveDbInfo: [],
    info: { scriptContent: [], batchContent: [] },
    activeKey: 'dataSetPane_1',
    activeBatchKey: 'batchContent_1',
    validForms: [],
    validBatchForms: [],
    selectTab: 'one',
    hasDataFlag: false
  }

  componentDidMount() {
    const { id, taskId, projectId, isExport = false } = this.props
    PubSub.subscribe(`taskEditV3.saveTaskInfo.${id}`, (msg, callback) => {
      this.saveData(callback)
    })
    this.props.dispatch({
      type: `${namespace}/getPermitDB`,
      payload: { projectId },
      callback: obj => this.setState({ dbInfo: obj })
    })
    if (isExport) {
      this.props.dispatch({
        type: `${namespace}/getHiveDataSource`,
        payload: { projectId },
        callback: obj => this.setState({ hiveDbInfo: obj })
      })
    }
    if (taskId) {
      this.props.dispatch({
        type: `${namespace}/getTaskNodeInfo`,
        payload: { taskId, jobName: _.last(_.split(id, '_')) },
        callback: obj => {
          if (_.isEmpty(obj)) {
            this.setState({
              info: {
                scriptContent: [{ id: 1 }],
                batchContent: [{ id: 1 }]
              }
            })
            return
          }
          let scriptContent = [{}],
            batchContent = [{}],
            hasDataFlag = false

          if (isExport) {
            scriptContent = JSON.parse(_.get(obj, 'overrideParams.nodeType', '[{}]'))
          } else {
            if (obj.scriptContent) {
              hasDataFlag = true
              let json = JSON.parse(obj.scriptContent)
              if (json[0].type === 'batchCollect') {
                batchContent = json
                scriptContent = [{}]
                this.setState({ selectTab: 'batch' })
              } else {
                batchContent = [{}]
                scriptContent = json
                this.setState({ selectTab: 'one' })
              }
            } else {
              scriptContent = [{}]
              batchContent = [{}]
            }
          }
          scriptContent = scriptContent.map((p, i) => ({ ...p, id: i + 1 }))
          batchContent = batchContent.map((p, i) => ({ ...p, id: i + 1 }))
          this.setState({
            info: { ...obj, scriptContent, batchContent },
            hasDataFlag
          })
        }
      })
      return
    }
    this.setState({
      info: {
        scriptContent: [{ id: 1 }],
        batchContent: [{ id: 1 }]
      }
    })
  }

  componentWillUnmount() {
    PubSub.unsubscribe(`taskEditV3.saveTaskInfo.${this.props.id}`)
  }

  // 绑定子组件
  setChild = ref => {
    this.child = ref
  }

  saveData = async callback => {
    const { id, changeEditStatus, taskId, isExport = false, nodeType } = this.props
    const { dbInfo, info, validForms, validBatchForms, selectTab } = this.state
    const { dataDevHiveScriptProxyUser = 'root', dataDevHiveScriptProxyPassword, keyComp1: k1 = '', kitPrefix: p1 = '' } = window.sugo

    // 国密解密
    const params = k1 + p1
    const smKit = new SMKit(params)
    const devHivePassword = smKit.decryptData_ECB(dataDevHiveScriptProxyPassword)

    let dataCollects = []
    for (let i in validForms) {
      const val = await validateFieldsAndScrollByForm(validForms[i])
      if (!val) {
        this.setState({ activeKey: 'dataSetPane_' + i })
        return
      }
      dataCollects.push(val)
    }
    const name = _.get(info, 'overrideParams.name', FLOW_NODE_INFOS.find(p => p.nodeType === nodeType).name)
    let data = {
      projectId: taskId,
      jobName: _.last(_.split(id, '_')),
      'jobOverride[name]': name,
      'jobOverride[showName]': name,
      'jobOverride[type]': TASK_EDIT_NODE_TYPE[nodeType] || nodeType,
      'jobOverride[user.to.proxy]': dataDevHiveScriptProxyUser
    }
    // 选择批量采集配置时
    if (selectTab === 'batch') {
      let scriptContent = [],
        flag = false,
        datasourceFlag = false,
        toDataFlag = false,
        offsetFlag = false
      // 循环获取每个 Tab 的数据
      _.get(info, 'batchContent', []).map((pane, i) => {
        this.refs[`batchSetForm` + pane.id].validateFields((err, values) => {
          if (!err) {
            let obj = {}
            // 以下封装后端需要的数据格式
            obj.type = 'batchCollect'
            let global = {
              type: 'hive',
              extraInfo: values.extraInfo,
              partitionColumn: values.partitionColumn,
              partitionType: values.partitionType,
              engine: values.engine,
              dirtyChart: values.dirtyChart,
              replaceChart: values.replaceChart,
              dbId: values.dbId,
              targetDbId: values.targetDbId
            }
            obj.global = global

            let tableMappingInfo = []
            values.dataSource?.map(item => {
              // 校验源表名是否填写
              if (!item.datasource) {
                datasourceFlag = true
                item['datasourceFlag'] = true
                this.refs[`batchSetForm` + pane.id].setState({ dataSource: values.dataSource })
                this.setState({
                  activeBatchKey: 'batchContent_' + pane.id
                })
              }
              // 校验目标表名是否填写
              if (!item.toDataSource) {
                toDataFlag = true
                item['toDataFlag'] = true
                this.refs[`batchSetForm` + pane.id].setState({ dataSource: values.dataSource })
                this.setState({
                  activeBatchKey: 'batchContent_' + pane.id
                })
              }
              // 校验增量字段
              if (item.collectType === 'incremental' && _.isEmpty(item.offsetSpec)) {
                offsetFlag = true
                item['offsetFlag'] = true
                this.refs[`batchSetForm` + pane.id].setState({ dataSource: values.dataSource })
                this.setState({
                  activeBatchKey: 'batchContent_' + pane.id
                })
              }
              let tableObj = {}
              tableObj.reader = {
                type: 'offset_db',
                filterSql: item.filterSql,
                datasource: item.datasource,
                collectType: item.collectType,
                offsetSpec: {
                  column: item.offsetSpec,
                  format: '',
                  type: ''
                },
                dbId: values.dbId
              }

              let converterList = []
              item.columnList?.map(p => {
                converterList.push({
                  finalCol: p.finalCol,
                  finalType: p.finalType,
                  finalComment: p.finalComment,
                  sourceCol: p.sourceCol,
                  sourceType: p.sourceType,
                  sourceComment: p.sourceComment,
                  type: 'dummy'
                })
              })
              tableObj.cleaner = {
                assembler: {
                  separator: '\u0001',
                  type: 'csv',
                  dirtyChart: '',
                  replaceChart: values.replaceChart
                },
                converterList: converterList
              }
              tableObj.writer = {
                type: 'hive_batch',
                primaryKeys: item.primaryKeys || [],
                toDataSource: item.toDataSource,
                targetDbId: values.targetDbId
              }

              tableMappingInfo.push(tableObj)
            })
            obj.tableMappingInfo = tableMappingInfo

            scriptContent.push(obj)
          } else {
            this.setState({
              activeBatchKey: 'batchContent_' + pane.id
            })
            flag = true
          }
        })
      })
      // 有 Tab 必填属性没填时不提交
      if (flag || datasourceFlag || toDataFlag || offsetFlag) return

      data.scriptContent = JSON.stringify(scriptContent)

      this.props.dispatch({
        type: `${namespace}/saveTaskNodeInfo`,
        payload: data,
        callback: () => {
          changeEditStatus(id, false)
          callback && callback()
        }
      })
      return
    }

    if (isExport) {
      let hiveHostInfo = await Fetch.get('/app/hive/host')
      if (!hiveHostInfo) {
        throw new Error('无效的 hive 服务配置')
      }
      let { host: hiveHost, port: hivePort } = hiveHostInfo.result
      const code = dataCollects
        .map(p => {
          const columns = p.columnInfo.map(d => d.sourceCol).join(',')
          let modelSql = ` select ${columns} from ${p.hiveTableName} `
          const dbType = 'mysql'
          const { dbUser, dbPassword, schema, connectUrl } = dbInfo.find(d => d.id === p.dbId) || {}
          // connectUrl eg: jdbc:mysql://192.168.0.198:3306/test
          // eg: 192.168.0.198:3306/test
          const targetUrlInfo = _.get(_.split(connectUrl, '://'), '[1]', '')
          // eg: 192.168.0.198
          const host = _.get(_.split(targetUrlInfo, ':'), '[0]', '')
          // eg: 3306/test
          const restInfo = _.get(_.split(targetUrlInfo, ':'), '[1]', '')
          // eg: 3306
          const port = _.get(_.split(restInfo, '/'), '[0]', '')
          // eg: test
          const database = _.get(_.split(restInfo, '/'), '[1]', '')
          return `
        java -Dhive.host=${hiveHost} -Dhive.port=${hivePort} -Dhive.database=${
            p.hiveDbName
          } -Dhive.user=${dataDevHiveScriptProxyUser} -Dhive.password=${devHivePassword} "-Dhive.sql=${modelSql}" -Dtaget.db.type=MySQL -Dtaget.db.host=${host} -Dtaget.db.port=${port} -Dtaget.db.database=${database} -Dtaget.db.user=${dbUser} -Dtaget.db.password=${dbPassword} -Dtaget.db.table=${
            p.tableName
          } -Dtaget.db.columns=${columns} ${
            dbType === 'Db2' ? `-Dtarget.db.schema=${schema || dbUser.toUpperCase()}` : ''
          } -cp '/opt/apps/sugo-etl-1.0/lib/*'  io.sugo.service.HiveExporter
      `
        })
        .join('')
      data.scriptContent = code
      data['jobOverride[nodeType]'] = JSON.stringify(dataCollects)
    } else {
      const r = generatorScriptContent(dbInfo, dataCollects)
      data.scriptContent = JSON.stringify(r)
    }

    this.props.dispatch({
      type: `${namespace}/saveTaskNodeInfo`,
      payload: data,
      callback: () => {
        changeEditStatus(id, false)
        callback && callback()
      }
    })
  }

  changeForm = params => {
    this.setState({ validForms: params })
  }

  changeBatchForm = params => {
    this.setState({ validBatchForms: params })
  }

  changeParentStatus = () => {
    const { id } = this.props
    this.props.changeEditStatus(id, true)
  }

  onEdit = (targetKey, action) => {
    const { disabled } = this.props
    const { info, activeKey } = this.state
    if (disabled) return
    this.changeParentStatus()
    if (action === 'add') {
      const newId = _.maxBy(info.scriptContent, p => p.id).id + 1

      this.setState({ activeKey: 'dataSetPane_' + newId, info: { ...info, scriptContent: _.concat(info.scriptContent, { id: newId }) } })
      return
    }
    const removeKey = targetKey.replace('dataSetPane_', '')
    if (activeKey === targetKey) {
      this.setState({
        activeKey:
          'dataSetPane_' +
          _.maxBy(
            info.scriptContent.filter(p => p.id.toString() !== removeKey),
            p => p.id
          ).id
      })
    }
    this.setState({ info: { ...info, scriptContent: info.scriptContent.filter(p => p.id.toString() !== removeKey) } })
  }

  onBatchEdit = (targetKey, action) => {
    const { info, activeBatchKey } = this.state
    const { disabled } = this.props

    if (disabled) return
    if (action === 'add') {
      const newId = _.maxBy(info.batchContent, p => p.id).id + 1
      this.setState({
        activeBatchKey: 'batchContent_' + newId,
        info: {
          ...info,
          batchContent: _.concat(info.batchContent, { id: newId })
        }
      })
      return
    }

    const removeKey = targetKey.replace('batchContent_', '')
    if (activeBatchKey === targetKey) {
      this.setState({
        activeBatchKey:
          'batchContent_' +
          _.maxBy(
            info.batchContent.filter(p => p.id.toString() !== removeKey),
            p => p.id
          ).id
      })
    }
    this.setState({
      info: {
        ...info,
        batchContent: info.batchContent.filter(p => p.id.toString() !== removeKey)
      }
    })
  }

  render() {
    const { isExport = false, disabled } = this.props
    const { dbInfo, info, activeKey, activeBatchKey, hiveDbInfo, validForms, validBatchForms, selectTab, hasDataFlag } = this.state
    return (
      <div style={{ height: 'calc(100vh - 146px)' }}>
        <div className='pd1b borderb'>
          {
            <div>
              <Button icon={<SaveOutlined />} className='mg1l' onClick={() => this.saveData()}>
                保存
              </Button>
              {!isExport ? (
                <>
                  <span className='mg3l'>采集类型：</span>
                  <Select
                    className='width120'
                    value={selectTab}
                    disabled={hasDataFlag}
                    onChange={value => {
                      this.setState({
                        selectTab: value
                      })
                    }}
                  >
                    <Option key={'one'} value={'one'}>
                      单个采集配置
                    </Option>
                    <Option key={'batch'} value={'batch'}>
                      批量采集配置
                    </Option>
                  </Select>
                </>
              ) : null}
            </div>
          }
        </div>
        {selectTab == 'one' ? (
          <Tabs className='mg2t' onChange={key => this.setState({ activeKey: key })} activeKey={activeKey} type='editable-card' onEdit={this.onEdit}>
            {_.get(info, 'scriptContent', []).map((pane, i) => {
              const key = `dataSetPane_${pane.id}`
              return (
                <TabPane tab={`配置${i + 1}`} key={key} closable={i !== 0} forceRender>
                  {isExport ? (
                    <ExportSetFrom
                      changeForm={this.changeForm}
                      taskId={info.taskId}
                      dataDbs={dbInfo}
                      hiveDbInfo={hiveDbInfo}
                      content={pane}
                      disabled={disabled}
                      isExport
                      changeParentStatus={this.changeParentStatus}
                      validForm={validForms}
                    />
                  ) : (
                    <SetFrom
                      changeForm={this.changeForm}
                      taskId={info.taskId}
                      dataDbs={dbInfo}
                      content={pane}
                      disabled={disabled}
                      changeParentStatus={this.changeParentStatus}
                      validForm={validForms}
                    />
                  )}
                </TabPane>
              )
            })}
          </Tabs>
        ) : (
          <Tabs
            className='mg2t'
            onChange={key => this.setState({ activeBatchKey: key })}
            type='editable-card'
            hideAdd={hasDataFlag}
            activeKey={activeBatchKey}
            onEdit={this.onBatchEdit}
          >
            {/* <span>批量采集配置</span> */}
            {_.get(info, 'batchContent', []).map((pane, i) => {
              const key = `batchContent_${pane.id}`
              return (
                <TabPane
                  tab={`配置${pane.id}`}
                  style={{ height: 'calc(100vh - 200px)', overflow: 'auto', display: key === activeBatchKey ? 'block' : 'none' }}
                  key={key}
                  closable={i !== 0}
                  forceRender
                >
                  <BatchSetForm
                    ref={'batchSetForm' + pane.id}
                    dataDbs={dbInfo}
                    disabled={disabled}
                    content={pane}
                    changeBatchForm={this.changeBatchForm}
                    validBatchForms={validBatchForms}
                  />
                </TabPane>
              )
            })}
          </Tabs>
        )}
      </div>
    )
  }
}
