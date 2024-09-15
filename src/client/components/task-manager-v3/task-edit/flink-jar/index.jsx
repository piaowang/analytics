import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import _ from 'lodash'
import { Button, Form, Input, message, Radio, Select, Upload } from 'antd'
import { InboxOutlined, SaveOutlined } from '@ant-design/icons'
import { namespace } from 'client/components/task-manager-v3/task-edit/model'
import { FLOW_NODE_INFOS } from 'client/components/task-manager-v3/constants'
import Fetch from 'client/common/fetch-final'
import { tryJsonParse } from 'common/sugo-utils'

const FormItem = Form.Item
const { Option } = Select
const { TextArea } = Input

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

const { dataDevHiveScriptProxyUser = 'root' } = window.sugo

export function FlinkJar(props) {
  const { dispatch = window.store.dispatch, changeEditStatus, taskId, id, projectId, nodeType, disabled } = props
  const flowNode = FLOW_NODE_INFOS.find(p => p.nodeType === nodeType)
  const [nodeInfo, setNodeInfo] = useState({})
  const [jobParams, setJobParams] = useState(() => [{ name: 'user.to.proxy', value: dataDevHiveScriptProxyUser }])
  const [scriptContent, setScriptContent] = useState({
    programType: 'java',
    deployMode: 'cluster',
    slot: 1,
    jobManagerMemory: '1024',
    taskManagerMemory: '1024'
  })
  const [isSaving, setIsSaving] = useState(false)
  const formRef = useRef()

  const fields = Object.keys(scriptContent).map(k => ({ name: [k], value: scriptContent[k] }))

  const onFieldsChange = (__, allFields) => {
    const nextVersionInfo = _.reduce(
      allFields,
      (acc, curr) => {
        acc[`${curr.name}`] = curr.value
        return acc
      },
      { ...scriptContent }
    )
    setScriptContent(nextVersionInfo)
  }

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

  async function queryUploadedFileName() {
    const url = `/app/task-schedule-v3/manager?action=listDepFile&projectId=${taskId}`
    const resp = await Fetch.get(url)
    return _.last(resp?.fileNames || [])
  }

  useEffect(() => {
    dispatch({
      type: `${namespace}/getTaskNodeInfo`,
      payload: { taskId, jobName: _.last(_.split(id, '_')) },
      callback: info => {
        setNodeInfo(info)
        setDefaultParams(info)
        setScriptContent(tryJsonParse(info.scriptContent || ''))
      }
    })

    queryUploadedFileName()
      .then(fileName => setScriptContent(prev => (fileName ? { ...prev, mainJar: fileName } : _.omit(prev, 'mainJar'))))
      .catch(err => console.error(err))
  }, [taskId, setScriptContent])

  const importProps = {
    name: 'file',
    action: '/app/task-schedule-v3/manager?action=uploadfile',
    accept: '.jar',
    data: {
      projectId: taskId
    },
    onRemove: async () => {
      message.info('无法删除，请直接上传另外的 jar 文件')
      return false
    },
    onChange(info) {
      const { status } = info.file
      if (status === 'done') {
        message.success(`${info.file.name} 上传成功`)
      } else if (status === 'error') {
        message.error(`${info.file.name} 上传失败`)
      }
    }
  }

  const onSave = async callback => {
    const form = formRef.current
    try {
      const validRes = await form.validateFields()
      console.log(validRes)
    } catch (err) {
      message.warn('请先完善表单信息')
      return
    }
    setIsSaving(true)
    const paramResult = _.reduce(
      jobParams,
      (result, param) => {
        result[`jobOverride[${param.name}]`] = param.value
        return result
      },
      {}
    )

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
        'jobOverride[name]': _.get(nodeInfo, ['generalParams', 'name'], flowNode.name),
        'jobOverride[showName]': _.get(nodeInfo, ['generalParams', 'showName'], flowNode.showName),
        'jobOverride[type]': _.get(nodeInfo, ['generalParams', 'type'], nodeType),
        paramJson: {},
        scriptContent: JSON.stringify(scriptContent)
      },
      callback: () => {
        setIsSaving(false)
        callback && callback()
      }
    })
  }

  return (
    <div className='height-100'>
      <div className='pd1y pd2l borderb'>
        <Button icon={<SaveOutlined />} className='mg2l' onClick={() => onSave()} loading={isSaving} disabled={disabled}>
          保存
        </Button>
      </div>
      <Form
        className='font-14'
        name='data-model'
        labelAlign='right'
        fields={fields}
        onFieldsChange={onFieldsChange}
        style={{ height: 'calc(100% - 43px)', overflowY: 'auto' }}
        ref={formRef}
      >
        <FormItem {...formItemLayout} name='programType' label='程序类型' rules={[{ required: true, message: '请填写程序类型' }]}>
          <Radio.Group disabled={disabled}>
            <Radio value='java' key='java'>
              java
            </Radio>
            <Radio value='scala' key='scala'>
              scala
            </Radio>
          </Radio.Group>
        </FormItem>

        <FormItem {...formItemLayout} name='mainClass' label='主函数的class' rules={[{ required: true, message: '主函数的class' }]}>
          <Input placeholder='请自定义主函数的class' disabled={disabled} />
        </FormItem>

        <FormItem {...formItemLayout} name='mainJar' label='主jar包' getValueFromEvent={ev => ev?.file?.name} rules={[{ required: true, message: '请上传主jar包' }]}>
          <Upload.Dragger {...importProps} fileList={scriptContent.mainJar ? [{ uid: '1', name: scriptContent.mainJar, status: 'done' }] : []} disabled={disabled}>
            <p className='ant-upload-drag-icon pd3t'>
              <InboxOutlined />
            </p>
            <p className='ant-upload-text pd3b pd2t'>点击或者拖拽文件到这个区域上传</p>
          </Upload.Dragger>
        </FormItem>

        <FormItem {...formItemLayout} name='deployMode' label='部署方式' rules={[{ required: true, message: '部署方式' }]}>
          <Radio.Group disabled={disabled}>
            <Radio value='cluster' key='cluster'>
              cluster
            </Radio>
            <Radio value='local' key='local'>
              local
            </Radio>
          </Radio.Group>
        </FormItem>

        <FormItem
          {...formItemLayout}
          name='slot'
          label='slot数量'
          rules={[
            { required: true, message: 'slot数量' },
            { pattern: new RegExp(/^[1-9]\d*$/, 'g'), message: '请输入正整数' }
          ]}
        >
          <Input placeholder='请自定义主函数的slot数量' disabled={disabled} />
        </FormItem>

        <FormItem
          {...formItemLayout}
          name='jobManagerMemory'
          label='jobManager内存数'
          rules={[
            { required: true, message: 'jobManager内存数' },
            { pattern: new RegExp(/^[1-9]\d*$/, 'g'), message: '请输入正整数' }
          ]}
        >
          <Input placeholder='请输入jobManager内存数(Mb)' disabled={disabled} />
        </FormItem>

        <FormItem
          {...formItemLayout}
          name='taskManagerMemory'
          label='taskManager内存数'
          rules={[
            { required: true, message: 'taskManager内存数' },
            { pattern: new RegExp(/^[1-9]\d*$/, 'g'), message: '请输入正整数' }
          ]}
        >
          <Input placeholder='请输入jobManager内存数(Mb)' disabled={disabled} />
        </FormItem>
      </Form>
    </div>
  )
}
