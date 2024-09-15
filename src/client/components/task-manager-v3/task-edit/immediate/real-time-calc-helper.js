import _ from 'lodash'
import { namespace as taskV3NS, namespace } from 'client/components/task-manager-v3/task-edit/model'
import PubSub from 'pubsub-js'
import { DEFAULT_CRONINFO } from 'client/components/TaskScheduleManager2/constants'
import moment from 'moment'
import Fetch from 'client/common/fetch-final'
import { DISPLAY_TASK_MODEL } from 'client/components/task-manager-v3/constants'

export function isRealTimeCalcProject(taskId) {
  const projectId = +taskId
  const realTimeCalcTaskList = window.store.getState().taskV3EditModel.realTimeCalcTaskList
  return _.some(realTimeCalcTaskList, d => +d.id === projectId)
}

export async function getRealTimeCalcTaskGraph(taskId) {
  return new Promise(resolve => {
    window.store.dispatch({
      type: `${taskV3NS}/getTaskGraph`,
      payload: { id: taskId },
      callback: obj => {
        console.log(obj)
        resolve(obj)
      }
    })
  })
}

export async function saveRealTimeCalcProject({ taskInfo, nodeData, graphInfo, lineData, callback }) {
  const queryExecutorRes = await Fetch.get('/app/task-schedule-v3/executors?action=getAllExecutors')
  const taskProjectInfo = window.store.getState().taskV3EditModel.taskProjectInfo

  const payload = {
    task_id: taskInfo.projectId,
    name: taskInfo.data.title,
    task_project_id: taskProjectInfo?.id,
    showName: taskInfo.showName,
    graphInfo,
    params: {
      cronInfo: {
        ...DEFAULT_CRONINFO,
        taskEndTime: moment().add(10, 'y')
      },
      notifyWarnObj: { successEmails: '', emailAlertType: 'on_all' },
      executeParamsObj: {
        flowPriority: 5,
        retries: window.sugo.taskReRun.retries,
        backoff: window.sugo.taskReRun.backoff,
        executeType: 1,
        idealExecutorIds: '',
        executors: queryExecutorRes?.executors || []
      },
      apiAlertInfos: []
    },
    isTaskGroup: false,
    jobParams: {},
    typeName: DISPLAY_TASK_MODEL.realTimeCalc,
    projectType: DISPLAY_TASK_MODEL.realTimeCalc,
    category_id: null // TODO
  }

  window.store.dispatch({
    type: `${namespace}/saveTaskInfo`,
    payload,
    callback
  })
}

export function initNodes() {
  // TODO add flink jar params
  return {
    paramsMap: {
      kafkaSource: [
        { necessary: '1', label: '数据源', type: 'api', value: 'source', tips: '请选择对应的数据源' },
        { necessary: '1', label: 'group.id', type: 'input', value: 'groupId', tips: '请输入group_id' },
        { necessary: '1', label: 'topic', type: 'input', value: 'topic', tips: '请输入topic,多个请以逗号隔开' },
        {
          necessary: '1',
          name: 'offset',
          label: 'offset过期处理方式',
          type: 'radio',
          value: 'offset',
          option: [
            { default: 'checked', name: 'GroupOffsets', value: 'GroupOffsets' },
            { name: 'Earliest', value: 'Earliest' },
            { name: 'Latest', value: 'Latest' }
          ]
        },
        {
          necessary: '1',
          label: '数据输入类型',
          type: 'select',
          value: 'format',
          option: [{ label: 'JSON格式', value: 'json' }]
        },
        {
          necessary: '1',
          remark: '如果选择Flinksql清洗节点时，可以作为表名称；如果选择groovy清洗节点时，key作为输入标识.',
          label: 'key',
          type: 'input',
          value: 'key',
          tips: '请自定义输入key名称'
        },
        {
          scriptConf: {
            help: '系统默认按照识别路径、字段名称、字段类型、按“,”分隔字段属性；按“;”分隔字段。示例：path,id,INT;path,name,STRING',
            isOpen: true,
            tips: 'path,id,INT;path,name,STRING'
          },
          remark: '如果选择Flinksql清洗节点时，需要添加字段；如果选择groovy清洗节点时，不需要添加字段。',
          label: '添加字段',
          type: 'flinkSqlAddField',
          value: 'fields',
          items: [
            { label: '路径', type: 'input', value: 'path' },
            { label: '字段名称', type: 'input', value: 'name' },
            {
              label: '字段类型',
              type: 'select',
              value: 'type',
              option: [
                { label: 'STRING', value: 'STRING' },
                { label: 'INT', value: 'INT' },
                { label: 'LONG', value: 'LONG' },
                { label: 'DOUBLE', value: 'DOUBLE' }
              ]
            }
          ]
        }
      ],
      flinkSql: {
        title: 'FlinkSql脚本',
        type: 'flinkSql',
        content: { type: 'textarea', tips: '请输入清洗节点flinkSql脚本' }
      },
      flinkJarSource: [
        {
          necessary: '1',
          name: 'programType',
          label: '程序类型',
          type: 'radio',
          value: 'programType',
          option: [
            { default: 'checked', name: 'java', value: 'java' },
            { name: 'scala', value: 'scala' }
          ]
        },
        {
          necessary: '1',
          remark: '',
          label: '主函数的class',
          type: 'input',
          value: 'mainClass',
          tips: '请自定义主函数的class'
        },
        {
          label: '主jar包',
          type: 'upload',
          value: 'mainJar',
          tips: '点击或拖拽文件到这个区域'
        },
        {
          necessary: '1',
          name: 'deployMode',
          label: '部署方式',
          type: 'radio',
          value: 'deployMode',
          option: [
            { default: 'checked', name: 'cluster', value: 'cluster' },
            { name: 'local', value: 'local' }
          ]
        },
        {
          necessary: '1',
          remark: '',
          label: 'slot数量',
          type: 'input',
          value: 'slot',
          tips: '请自定义主函数的class'
        },
        {
          necessary: '1',
          remark: '',
          label: 'jobManager内存数',
          type: 'input', // TODO 支持数据空间输入方式
          value: 'jobManagerMemory',
          tips: '请输入jobManager内存数(Mb)'
        },
        {
          necessary: '1',
          remark: '',
          label: 'taskManager内存数',
          type: 'input', // TODO 支持数据空间输入方式
          value: 'taskManagerMemory',
          tips: '请输入jobManager内存数(Mb)'
        }
      ]
    },
    taskNodeList: [
      // { name: 'kafka 输入配置', nodeType: 'kafkaSource' },
      { name: 'FlinkSql 脚本', nodeType: 'flinkSql' },
      { name: 'FlinkJar 输入配置', nodeType: 'flinkJarSource' },
      // { name: '等待', nodeType: 'nodeWait' },
      { name: '结束节点', nodeType: 'end' }
    ],
    typeData: [
      {
        type: 'upload',
        common: [
          { label: '类型', type: 'select', value: 'dbType', tips: '请选择对应的数据源类型' },
          { label: '别名', type: 'input', value: 'dbAlais', tips: '请输入数据源别名' },
          { label: '存放路径', type: 'input', value: 'uri', tips: '请输入hdfs存放地址' },
          { type: 'upload', value: 'file', tips: '点击或拖拽文件到这个区域' }
        ]
      }
    ],
    classMap: {
      kafkaSource: 'io.sugo.etl.flink.source.stringSource.stream.KafkaSource'
    }
  }
}
