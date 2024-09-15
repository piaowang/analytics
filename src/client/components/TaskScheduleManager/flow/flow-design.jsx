import React from 'react'
// const  jQuery  = require('./lib/goo-flow')
import _jQuery from './lib/goo-flow'
import './lib/goo-func'
import './lib/goo-flow.css'
import { message } from 'antd'
import TaskStepInfo from './step-info'
import _ from 'lodash'
import Fetch from 'client/common/fetch-final'
import { FLOW_REMARK } from '../constants'
import UploadModal from '../upload-modal'
import SetFiledModald from './set-Flied'

class TaskScheduleDesign extends React.Component {
  state = {
    showStepInfo: false,
    defaultStepInfo: {},
    showModal: false,
    setFliedVisable: false
  }
  loading = false

  demo = {}

  async componentDidMount() {
    const property = {
      width: 1200,
      height: 700,
      // todo add python 脚本

      toolBtns: [
        'command',
        'python',
        'hive',
        'nodeWait',
        'oraclesql',
        'mysql',
        'gobblin',
        'postgres',
        'sqlserver',
        'access',
        'sqlWait',
        'checkResult',
        'dataCollect',
        'end round',
        'dataQuality',
        'scala',
        'impala',
        'perl',
        'mlsql',
        'sybase',
        'sparkSql'
      ], //"druidIndex",

      haveHead: true,
      headBtns: ['save', 'file', 'flied'], //如果haveHead=true，则定义HEAD区的按钮
      haveTool: true,
      haveGroup: false,
      useOperStack: true,
      customItemDblClick: this.showStepInfoPanel,
      initLabelText: '操作：'
    }

    this.demo = _jQuery.createGooFlow(_jQuery('#demo'), property)
    this.demo.setNodeRemarks(FLOW_REMARK)
    this.demo.onItemAdd = function (id, type, json) {
      if (json.type === 'end round') {
        var nodes = this.$nodeData
        var node = _.values(nodes).find(p => p.type === 'end round' || p.type === 'end')
        if (node) {
          message.error('结束节点只能有一个')
          return false
        }
      }
      return true
    }
    this.demo.onBtnSaveClick = this.saveFlowDesign
    this.demo.onBtnOpenFile = this.toggleUploadModal // custom function
    this.demo.onBtnSetFlied = this.setFliedValue

    // todo resize gooflow......
    // window.onresize = () => console.log(`${window.innerHeight}:${window.innerWidth}`)
    await this.getData()
    let customBtnNameDict = {
      ico_flied: '设置公共属性',
      ico_file: '上传依赖文件',
      ico_save: '保存流程'
    }
    _.keys(customBtnNameDict).forEach(k => {
      let btn = document.querySelector(`.${k}`)
      if (btn) {
        btn.setAttribute('title', customBtnNameDict[k])
      }
    })
  }

  getData = async (props = this.props) => {
    let { projectId, taskName } = props
    const res = await Fetch.get(`/app/task-schedule/manager?project=${taskName}&graph&refProjectId=${projectId}`)
    if (res.error) {
      message.error(res.error)
      return
    }
    this.demo.clearData()
    this.demo.loadData({
      title: taskName,
      nodes: JSON.parse(res.gnode) || {},
      lines: JSON.parse(res.gline) || {}
    })
  }

  componentWillReceiveProps(nextProps) {
    let { projectId, taskName } = this.props
    if (projectId !== nextProps.projectId || taskName !== nextProps.taskName) {
      this.getData(nextProps)
    }
  }
  showStepInfoPanel = (id, data) => {
    this.demo.blurItem()
    this.setState({ defaultStepInfo: { id, name: data.name, type: data.type, showName: data.name }, showStepInfo: true })
  }

  closeStepInfoPanel = (id, rename) => {
    if (id && rename && _.get(this.demo.$nodeData, `${id}.name`) !== rename) {
      this.demo.setName(id, rename, 'node')
    }
    this.setState({ showStepInfo: false })
  }

  saveFlowDesign = async () => {
    let { projectId, taskName } = this.props
    if (this.loading) {
      return message.info('请勿重复点击保存')
    }

    this.loading = true
    let data = this.demo.exportData()
    data.nodes = _.mapValues(data.nodes, p => {
      return {
        ...p,
        top: Math.floor(p.top),
        left: Math.floor(p.left),
        width: Math.floor(p.width),
        height: Math.floor(p.height)
      }
    })
    let params = ['ajax=saveProjectGraph', `project=${taskName}`, `data=${JSON.stringify(data)}`, `refProjectId=${projectId}`].join('&')

    const res = await Fetch.post(
      '/app/task-schedule/manager',
      {},
      {
        body: params,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: 'application/json'
        }
      }
    )

    if (res.error) {
      this.loading = false
      return message.error(res.error)
    } else {
      message.success('保存成功')
      await this.getData()
      this.loading = false
    }
  }

  toggleUploadModal = () => {
    this.setState({
      showModal: !this.state.showModal
    })
  }

  setFliedValue = () => {
    this.setState({
      setFliedVisable: !this.state.setFliedVisable
    })
  }

  render() {
    const { showStepInfo, defaultStepInfo, showModal, setFliedVisable } = this.state
    const { projectId, taskName, value } = this.props
    const { name } = value

    return (
      <div className='flow-design'>
        <div className='flow-design-panel pd1'>
          <div id='demo' />
        </div>
        <TaskStepInfo taskName={taskName} projectId={projectId} defaultStepInfo={defaultStepInfo} showStepInfo={showStepInfo} closeStepInfoPanel={this.closeStepInfoPanel} />
        <UploadModal showModal={showModal} toggleUploadModal={this.toggleUploadModal} {...value} />
        {
          // 为了触发组件生命周期
          setFliedVisable && <SetFiledModald taskId={name} projectId={projectId} showSetFlied={setFliedVisable} setFliedValue={this.setFliedValue} />
        }
      </div>
    )
  }
}

export default TaskScheduleDesign
