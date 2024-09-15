import React, { useState, useEffect } from 'react'
import { DATASOURCE_TYPE } from '../../../TaskScheduleManager2/db-connect/db-connect-manager'
import { Select, Row, Col, Card, Form, Tooltip } from 'antd'
import { namespace } from './model'
import { connect } from 'react-redux'
import BreakPointSelect from './break-point-select'
import { InputTablesSelect, InputTablesSelectButton } from './input-tables-select'
import { Modal, Button } from 'antd'
import OutConfig from './output-config'
import { message } from 'antd'

function InputConfig(props) {
  const {
    dataDss = [],
    disabled = false,
    inputDsId = '',
    inputDbName = '',
    globalBreakPoint = {},
    tableList,
    outputConfig = [],
    outputEdit = {},
    curOutPutConfig,
    inputDsType
  } = props
  let { inputTables = [] } = props
  const [selectDs, setSelectDs] = useState('')

  const [opcShow, setOpcShow] = useState(outputEdit.show)

  useEffect(() => {
    setOpcShow(outputEdit.show)
  }, [outputEdit])

  useEffect(() => {
    if (inputDsId) {
      setSelectDs(inputDsId)
    }
  }, [inputDsId])

  // 转换数据拿到 源数据表配置 里的各输出配置对应关系
  let inputMap = {},
    outputMap = {}
  _.forEach(_.cloneDeep(inputTables), item => {
    inputMap[item.tableName] = item
  })
  _.forEach(_.cloneDeep(outputConfig), item => {
    outputMap[item.readerTable] = outputMap[item.readerTable] ? outputMap[item.readerTable] : []
    outputMap[item.readerTable].push(item)
  })
  let inputArr = []
  for (let i in inputMap) {
    let partOutPut = []
    if (outputMap[i]) {
      _.map(outputMap[i], opm => {
        const dbInfo = dataDss.find(p => p.id === opm.dbInfoId) || {}
        let obj = {
          opId: opm.id,
          tableName: inputMap[i].tableName,
          dbAlais: dbInfo.dbAlais,
          writerTable: opm.writerTable
        }
        partOutPut.push(obj)
      })
    }
    inputMap[i].partOutPut = partOutPut
    inputArr.push(inputMap[i])
  }
  inputTables = inputArr

  /**
   * 更改数据源获取数据库
   * @param {*} id
   */
  const handleSelectDs = id => {
    const info = dataDss.find(p => p.id === id)
    props.dispatch({
      type: `${namespace}_${props.id}/changeState`,
      payload: {
        inputDsType: info?.dbType,
        inputDsId: id,
        inputDbName: '',
        inputTables: [],
        outputConfig: [],
        curOutPutConfig: {}
      }
    })
    props.dispatch({
      type: `${namespace}_${props.id}/getDataTableList`,
      payload: { id, type: info?.dbType }
    })
    setSelectDs(id)
  }

  const handleChangeState = obj => {
    props.dispatch({
      type: `${namespace}_${props.id}/changeState`,
      payload: obj
    })
  }

  const handleOutputEdit = obj => {
    let target = { outputEdit: obj }
    if (obj.type === 'edit') {
      target.curOutPutConfig = _.find(outputConfig, opc => opc.id === obj.opId) || {}
    }
    if (obj.type === 'del') {
      target.outputConfig = _.filter(outputConfig, item => item.id !== obj.opId)
    }
    if (obj.type === 'add') {
      target.curOutPutConfig = {
        id: outputConfig.length + 1,
        inputDsId: inputDsId,
        namespace: inputDbName,
        readerTable: obj.tableName
      }
    }
    handleChangeState({ ...target })
  }

  const getInputConfig = () => {
    return (
      <>
        <Row key='ipt-clg-row'>
          <Col span={8}>
            <Form.Item label='源数据源' rules={[{ required: true, message: '源数据源必填！' }]}>
              <div>
                <Select
                  showSearch
                  value={inputDsId || undefined}
                  className='width200'
                  disabled={disabled}
                  onChange={handleSelectDs}
                  placeholder='请选择源数据源'
                  filterOption={(input, option) => {
                    return option.children.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }}
                  // getPopupContainer={() => document.querySelector('.real-time-collect-task-edit')}
                >
                  {dataDss
                    .filter(
                      p => p.dbType === DATASOURCE_TYPE.hana || p.dbType === DATASOURCE_TYPE.mysql || p.dbType === DATASOURCE_TYPE.oracle || p.dbType === DATASOURCE_TYPE.starrocks
                    )
                    .map(p => {
                      return (
                        <Option key={`${p.id}`} value={p.id}>
                          <Tooltip title={p.dbAlais}>{p.dbAlais}</Tooltip>
                        </Option>
                      )
                    })}
                </Select>
              </div>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label='全局配置' rules={[{ required: true, message: '全局配置必填！' }]}>
              <BreakPointSelect
                value={globalBreakPoint}
                isGlobal
                onChange={val => handleChangeState({ globalBreakPoint: val })}
                // getPopupContainer={() => document.querySelector('.real-time-collect-task-edit')}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label='源数据表' rules={[{ required: true, message: '源数据表必填！' }]}>
              <InputTablesSelectButton
                value={inputTables}
                tables={_.get(tableList, selectDs, [])}
                onChange={val => handleChangeState({ inputTables: val })}
                // getPopupContainer={() => document.querySelector('.real-time-collect-task-edit')}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item key='form-table-slt' label='源数据表配置' rules={[{ required: true, message: '源数据表必填！' }]}>
          <InputTablesSelect value={inputTables} onChange={val => handleChangeState({ inputTables: val })} inputDsId={inputDsId} onOutputEdit={val => handleOutputEdit(val)} />
        </Form.Item>
      </>
    )
  }

  const handleOk = () => {
    if (_.isNil(curOutPutConfig.dbInfoId)) {
      message.error('请选择目标数据源！')
      return
    }
    if (_.isNil(curOutPutConfig.writerTable)) {
      message.error('请选择目标数据表！')
      return
    }

    let index = _.findIndex(outputConfig, p => p.id === curOutPutConfig.id)
    index = index < 0 ? outputConfig.length : index
    let obj = _.cloneDeep(outputConfig)
    obj[index] = curOutPutConfig

    props.dispatch({
      type: `${namespace}_${props.id}/changeState`,
      payload: { outputEdit: { ...outputEdit, show: false }, outputConfig: obj }
    })
  }

  const handleCancel = () => {
    props.dispatch({
      type: `${namespace}_${props.id}/changeState`,
      payload: { outputEdit: { ...outputEdit, show: false } }
    })
  }

  return (
    <div>
      <Card title='输入配置' className='mg2t'>
        {getInputConfig()}
      </Card>

      <Modal title='输出配置' visible={opcShow} onOk={handleOk} onCancel={handleCancel} width='80%'>
        <OutConfig id={props.id} />
      </Modal>
    </div>
  )
}

export default connect((props, ownProps) => {
  return {
    ..._.pick(props[`${namespace}_${ownProps.id}`], [
      'dataDbs',
      'dataDss',
      'disabled',
      'dataTables',
      'inputDsType',
      'inputDsId',
      'inputDbName',
      'inputTables',
      'outputConfig',
      'tableList',
      'globalBreakPoint',
      'outputEdit',
      'curOutPutConfig'
    ])
  }
})(InputConfig)
