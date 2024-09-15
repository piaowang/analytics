import React from 'react'
import { Input, Button, Row, Col, Select } from 'antd';
import _ from 'lodash'
import Extractor from './etlComponent/extractor'
import Writer from './etlComponent/writer'
import Parser from './etlComponent/parser'
import Assembler from './etlComponent/assembler'
import Reader from './etlComponent/reader'

import '../../../Project/style.styl'
import './etl-task-edit.styl'
import TaskChain from './etlComponent/task-chain'


const ETLTaskComponent = {
  reader: '0',
  converter: '1',
  writer: '2',
  parser: '3',
  assembler: '4'
}

class ETLTaskEdit extends React.Component {

  state = {
    taskMap: {},
    editPanel: ''
  }

  componentDidMount() {
    const {taskMap, editPanel} = this.props
    this.setState({
      taskMap,
      editPanel
    })
  }

  componentDidUpdate (preProps) {
    const {taskMap, editPanel} = this.props
    let newEditPanel = ''
    if (_.isEmpty(this.state.editPanel)){
      newEditPanel = editPanel
    } else{
      newEditPanel = this.state.editPanel
    }
    if(!_.isEqual(taskMap, preProps.taskMap) ) {
      this.setState({
        taskMap,
        editPanel:newEditPanel
      })
    }
  }

  changeState = (state, callback) => {
    const {saveTaskMap} = this.props
    this.setState({
      ...state
    }, callback)
    saveTaskMap(state.taskMap, '')
  }

  converterEditPanel = () => {
    const {taskMap} = this.state
    const props = {
      changeState: this.changeState,
      taskMap,
      list: _.get(taskMap, 'cleaner.converterList', [])
    }
    return (<Extractor  {...props} />)
  }

  readerEditPanel = () => {
    const {taskMap} = this.state
    const props = {
      changeState: this.changeState,
      taskMap,
      reader: _.get(taskMap, 'reader', {})
    }
    return (<Reader {...props}/>)
  }

  parserEditPanel = () => {
    const {taskMap} = this.state
    const props = {
      changeState: this.changeState,
      taskMap,
      parser: _.get(taskMap, 'cleaner.parser', {})
    }
    return (<Parser  {...props} />)
  }

  assembleEditPanel = () => {
    const {taskMap} = this.state
    const props = {
      changeState: this.changeState,
      taskMap,
      assembler: _.get(taskMap, 'cleaner.assembler', {})
    }
    return (<Assembler  {...props} />)
  }


  writerEditPanel = () => {
    const {taskMap} = this.state
    const props = {
      changeState: this.changeState,
      taskMap,
      writer: _.get(taskMap, 'writer', {})
    }
    return (<Writer  {...props} />)
  }


  taskChainPanel = () => {
    const props = {
      editPanel: this.state.editPanel,
      ETLTaskComponent,
      taskChangeOnclick: this.taskChangeOnclick
    }
    return (<TaskChain {...props}/>)
  }

  taskChangeOnclick = (status) => {
    const {saveTaskMap} = this.props
    this.setState({
      editPanel: status
    }
    )
    saveTaskMap(this.state.taskMap, status)
  }


  activePanel = () => {
    const {editPanel} = this.state
    const {reader, converter, writer, parser, assembler} = ETLTaskComponent
    let panel = null
    switch (editPanel) {
      case reader:
        panel = this.readerEditPanel()
        break
      case converter:
        panel = this.converterEditPanel()
        break
      case writer:
        panel = this.writerEditPanel()
        break
      case parser:
        panel = this.parserEditPanel()
        break
      case assembler:
        panel = this.assembleEditPanel()
        break
      default :
        return <div/>

    }
    return panel
  }


  render() {
    return (
      <div>
        {
          this.taskChainPanel()
        }
        <div>
          {
            this.activePanel()
          }
        </div>
      </div>)
  }
}

export default ETLTaskEdit
