import React, { useRef, useState, useEffect } from 'react'
import { SaveOutlined } from '@ant-design/icons'
import { Button, Divider, Form, message, Select, Skeleton } from 'antd'
import _ from 'lodash'
import { connect } from 'react-redux'
import { namespace } from '../model'
import TxtCollection from './txt-collection'
import XmlCollection from './xml-collection'
import { PREFIX, TEXT_COLLECTION_SELECT_ITENS, MESSAGE_INFO } from './const'
import { getSaveBody, getParsedData, getEditModeInitData } from './utils'
import './index.styl'

const { Option } = Select


function TextCollection(props) {

  const { id, taskId, onTextSave, onDidMount } = props
  
  const [form] = Form.useForm()
  const selectedTableRef = useRef()
  const outputTableRef = useRef()
  const [states, setStates] = useState({ 
    type: 'TXT',
    loading: false,
    info: {}
  })
  useEffect(() => {
    const getInitData = () => {
      setStates({ ...states, loading: true })
      onDidMount({ 
        payload: {
          taskId, 
          jobName: _.last(_.split(id, '_'))
        },
        callback: (data) => {
          const paresdObj = getParsedData(data)
          const [type, editModeInitData] = getEditModeInitData(paresdObj)
          form.setFieldsValue(editModeInitData)
          setStates({ ...states, type, loading: false, info: paresdObj })
        }
      })
    }
    getInitData()
  }, [taskId, id])

  const { type, loading, info } = states

  const onSave = async () => {
    try {
      const res = await form.validateFields()
      const selTabVal = selectedTableRef.current.getData()
      const outTabVal = outputTableRef.current.getData()
      if(_.some(selTabVal, record => !!record.edit) || _.some(outTabVal, record => !!record.edit)) {
        return message.info(MESSAGE_INFO.SAVE_INFO)
      }
      const body = getSaveBody({
        projectId: taskId,
        type: type,
        form: res, 
        tableSelected: selTabVal, 
        tableOutput: outTabVal,
        info: info
      })
      onTextSave(body)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ height: 'calc(100vh - 147px)'}} className={`${PREFIX}-content`}>
      <Skeleton 
        paragraph={{ rows: 14 }} 
        loading={loading} 
        className='pd4'
        active 
        avatar
      >
        <Button 
          icon={<SaveOutlined />} 
          className='mg2l' 
          onClick={() => onSave()}
          loading={loading}
        >保存</Button>
        <span className='mg4l font14'>文件类型：</span>
        <Select 
          style={{ width:'120px' }}
          onChange={val => setStates({ ...states, type: val })}
          disabled={!!info.scriptContent}
          value={type}
        >
          {
            TEXT_COLLECTION_SELECT_ITENS.map(val => {
              return <Option value={val} key={val}>{val}</Option>
            })
          }
        </Select>
        <Divider />
        {
          type === TEXT_COLLECTION_SELECT_ITENS[0] ? (
            <TxtCollection 
              form={form} 
              info={info}
              selTabRef={selectedTableRef}
              outTabRef={outputTableRef}  
            />
          ) : (
            <XmlCollection
              form={form}
              info={info}
              selTabRef={selectedTableRef}
              outTabRef={outputTableRef}  
            />
          )
        }
      </Skeleton>
    </div>
  )
}

const mapDispatchToProps = dispatch => {
  return {
    onTextSave: (body) => dispatch({
      type: `${namespace}/saveTaskNodeInfo`,
      payload: body
    }),
    onDidMount: (opts) => dispatch({
      type: `${namespace}/getTaskNodeInfo`,
      ...opts
    })
  }
}

export default connect(undefined, mapDispatchToProps)(TextCollection)
