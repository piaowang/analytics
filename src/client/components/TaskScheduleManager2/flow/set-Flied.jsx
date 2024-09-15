import React from 'react'
import { Modal, message } from 'antd'
import JobParamsEdit from './job-params-edit'
import Fetch from '../../../common/fetch-final'

const defaultFlied = {
  name: '',
  value: ''
}

class SetFliedComponent extends React.Component{
  state={
    customFlied: [defaultFlied],
    confirmLoading: false
  }

  componentDidMount() {
    this.getData()
  }

  componentWillUnmount() {
    this.setState({
      customFlied: []
    })
  }

  getData = async () => {
    const { taskId, projectId } = this.props
    const url = `/app/new-task-schedule/manager?ajax=fetchProjectProps&project=${taskId}`
    const result = await Fetch.post(url)
    
    if(result.param) {
      const { param } = result
      let arr = []
      for(let x in param) {
        arr.push({name:x, value: param[x]})
      }
      this.setState({
        customFlied: arr
      })
    }
  }

  submit = async () => {
    if(this.isEmptyList()) return message.info('填写正确属性')
    this.setState({
      confirmLoading: true
    })

    const { setFliedValue, projectId, taskId } = this.props
    const { customFlied } = this.state
    let params={}
    customFlied.map(item => params[item.name]= item.value)

    const url = `/app/new-task-schedule/manager?ajax=setProjectProps&project=${taskId}&param=${JSON.stringify(params)}`
    const result = await Fetch.post(url)

    if(result) {
      // message.info('保存成功')
      this.setState({
        confirmLoading: false
      })
      setFliedValue()
    }
  }

  onAppendParams = () => {
    const { customFlied } = this.state
    if(this.isEmptyList()) return message.info('请先填写属性')

    customFlied.push(defaultFlied)
    this.setState({
      customFlied
    })
  }

  isEmptyList = () => {
    const { customFlied } = this.state
    let result = customFlied.filter(item => (!item.name || !item.value))
    return !!result.length
  }

  onRemoveParams = () => {
    const { customFlied } = this.state
    let arr = customFlied.slice(0, customFlied.length-1)
    this.setState({
      customFlied: arr
    })
  }

  onChangeParams = (param, key) => {
    const { customFlied } = this.state
    const { name, value } = param
    customFlied[key] = {name, value}
    this.setState({
      customFlied
    })
  }

  render(){
    const { showSetFlied, setFliedValue } = this.props
    const { customFlied, confirmLoading } = this.state

    return (
      <Modal 
        title="设置公共属性"
        visible={showSetFlied}
        confirmLoading={confirmLoading}
        onOk={this.submit}
        onCancel={setFliedValue}
      >
        {
          <JobParamsEdit 
            defaultParamsKey={[]}
            omitKey={[]}

            onAppendParams={this.onAppendParams}
            onChangeParams={this.onChangeParams}
            onRemoveParams={this.onRemoveParams}
            params={customFlied}
            resetConfig={() => {}}
          />
        }
      </Modal>
    )
  }
}

export default SetFliedComponent
