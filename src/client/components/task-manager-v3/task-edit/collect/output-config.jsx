import React, { useState, useEffect } from 'react'
import { Tabs, Form, Select, Row, Col, Card, Input, Button, Tooltip } from 'antd'
import { DATASOURCE_TYPE } from '../../../TaskScheduleManager2/db-connect/db-connect-manager'
import FieldSetList from './field-set-list'
import { immutateUpdate, immutateUpdates } from 'common/sugo-utils'

const TabPane = Tabs.TabPane
const FormItem = Form.Item
const Option = Select.Option
import { namespace } from './model'
import { connect } from 'react-redux'

/** 同步日期时间输出格式 */
const dateFormats = ['timestamp', 'yyyy-MM-dd HH:mm:ss', 'yyyyMMddHHmmss']
const delimiters = ['~|~', '*|*', '@|@', '#|#', '$|$', '%|%', '^|^', '&|&', '(|)', '[|]', '{|}', '-|-', '=|=', '<|>']

/**
 * @description
 * 输出配置组件
 * @param {any} props
 */
function OutputConfig(props) {
  const { curOutPutConfig = {}, inputTables = [], outputConfig = [], dataDss = [], disabled = false, dataFields = {}, inputDsType, inputDsId, inputDbName, tableList } = props

  const { dbInfoId, type, schema, database, namespace: name, writerTable, readerTable } = curOutPutConfig
  let sdn = schema || database || name
  const [mapping, setMapping] = useState('')
  // 针对编辑输出配置初始值
  if (dbInfoId && (sdn || sdn === '') && writerTable && _.isEmpty(dataFields[`${dbInfoId}_${sdn}_${writerTable}`])) {
    let params = {
      dbInfoId,
      type,
      schema,
      database,
      namespace: name,
      table: writerTable
    }
    props.dispatch({ type: `${namespace}_${props.id}/getDataFieldsList`, payload: params })
  }

  // 针对添加输出配置初始值
  if (inputDsId && (inputDbName || inputDbName === '') && readerTable && _.isEmpty(dataFields[`${inputDsId}_${inputDbName}_${readerTable}`])) {
    let params = {
      dbInfoId: inputDsId,
      type,
      schema,
      database,
      namespace: name,
      table: readerTable
    }
    props.dispatch({ type: `${namespace}_${props.id}/getDataFieldsList`, payload: params })
  }

  const setRowDelimiter = (info, val) => {
    const { columnSeparator } = curOutPutConfig
    if (columnSeparator) {
    }
    if (val) {
      info.rowDelimiter = val
    }
    return info
  }

  const setColumnSeparator = (info, val) => {
    if (val) {
      info.columnSeparator = val
    }
    return info
  }

  const setColumnMappings = (info, ttable, val) => {
    const { dbInfoId, schema, database, namespace: name, readerTable, writerTable } = curOutPutConfig
    let tt = ttable === 'writerTable' ? readerTable : writerTable
    let outputFields = _.get(dataFields, `${dbInfoId}_${schema || database || name}_${tt}`)

    info.columnMappings = _.map(info.columnMappings, item => {
      const opf = _.find(outputFields, o => _.lowerCase(o.name) === _.lowerCase(item.name)) || {}
      if (opf.type && opf.name) {
        item.targetType = opf.type
        item.targetName = opf.name
      }
      return item
    })
    if (val) {
      info.writerTable = val
    }
    return info
  }

  useEffect(() => {
    let df = dataFields[`${dbInfoId}_${sdn}_${writerTable}`]
    if (df) {
      let info = setColumnMappings(_.cloneDeep(curOutPutConfig))
      info = setRowDelimiter(info, delimiters[0])
      info = setColumnSeparator(info, delimiters[1])
      props.dispatch({ type: `${namespace}_${props.id}/changeState`, payload: { curOutPutConfig: info } })
    }
  }, [dataFields])

  const changeoOutputConfig = (path, val) => {
    let info = {}
    if (path.indexOf('schema') || path.indexOf('database')) {
      info = immutateUpdates(_.cloneDeep(curOutPutConfig), path, () => val)
    } else {
      info = immutateUpdate(_.cloneDeep(curOutPutConfig), `${path}`, () => val)
    }

    if (path === 'writerTable') {
      info = setColumnMappings(info, 'writerTable', val)
    }

    if (path === 'rowDelimiter') {
      info = setRowDelimiter(info, val)
    }
    if (path === 'columnSeparator') {
      info = setColumnSeparator(info, val)
    }

    props.dispatch({ type: `${namespace}_${props.id}/changeState`, payload: { curOutPutConfig: info } })
  }

  const handlehangeTargetTable = (index, val) => {
    changeoOutputConfig(`writerTable`, val)

    const { dbInfoId, type, schema, database, namespace: name } = curOutPutConfig
    let params = {
      dbInfoId,
      type,
      schema: schema || database || name,
      database: schema || database || name,
      namespace: schema || database || name,
      table: val
    }
    props.dispatch({ type: `${namespace}_${props.id}/getDataFieldsList`, payload: params })
  }

  const handlehangeTargetSource = (index, val) => {
    const dbInfo = dataDss.find(p => p.id === val)
    props.dispatch({
      type: `${namespace}_${props.id}/changeState`,
      payload: { curOutPutConfig: { ...curOutPutConfig, ...{ dbInfoId: val, type: dbInfo?.dbType } } }
    })
    props.dispatch({
      type: `${namespace}_${props.id}/getDataTableList`,
      payload: { id: val, type: dbInfo?.dbType, tableType: 'out' }
    })
  }

  const renderDatasourceSet = index => {
    const selectDsType = _.get([curOutPutConfig], [index, 'type'], 'mysql')
    const { dbInfoId, schema, database, name, writerTable, readerTable, listDelimiter } = curOutPutConfig
    let config = []
    switch (selectDsType) {
      case DATASOURCE_TYPE.mysql:
      case DATASOURCE_TYPE.oracle:
      case DATASOURCE_TYPE.hana:
      case DATASOURCE_TYPE.starrocks:
        let databaseFieldName = 'schema'
        if (selectDsType === DATASOURCE_TYPE.mysql) {
          databaseFieldName = 'database'
        }
        config = [
          <Form.Item name='ds' label='目标数据源' labelCol={{ span: 6 }} rules={[{ required: true, message: '目标数据源必填！' }]}>
            <div>
              <Select
                showSearch
                value={dbInfoId}
                className='width300'
                disabled={disabled}
                dropdownMatchSelectWidth={false}
                onChange={val => handlehangeTargetSource(index, val)}
                placeholder='请选择目标数据源'
                filterOption={(input, option) => {
                  return option.children.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }}
              >
                {dataDss.map(p => {
                  return (
                    <Option key={`${p.id}`} value={p.id}>
                      <Tooltip title={p.dbAlais}>{p.dbAlais}</Tooltip>
                    </Option>
                  )
                })}
              </Select>
            </div>
          </Form.Item>,
          <Form.Item name='dt' label='目标数据表' labelCol={{ span: 6 }} rules={[{ required: true, message: '目标数据表必填！' }]}>
            <div>
              <Select
                dropdownMatchSelectWidth={false}
                showSearch
                value={writerTable}
                className='width300'
                disabled={disabled}
                onChange={val => handlehangeTargetTable(index, val)}
                placeholder='请选择目标数据表'
              >
                {_.get(tableList, dbInfoId, []).map(p => {
                  return (
                    <Option key={`${p}`} value={p}>
                      <Tooltip title={p}>{p}</Tooltip>
                    </Option>
                  )
                })}
              </Select>
            </div>
          </Form.Item>
        ]
        break
      case DATASOURCE_TYPE.kudu:
      case DATASOURCE_TYPE.hbase:
        config = [
          <Form.Item name='ds' label='目标数据源' labelCol={{ span: 6 }} rules={[{ required: true, message: '目标数据源必填！' }]}>
            <div>
              <Select
                showSearch
                value={dbInfoId}
                className='width300'
                dropdownMatchSelectWidth={false}
                disabled={disabled}
                onChange={val => handlehangeTargetSource(index, val)}
                placeholder='请选择目标数据源'
                filterOption={(input, option) => {
                  return option.children.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }}
              >
                {dataDss.map(p => {
                  return (
                    <Option key={`${p.id}`} value={p.id}>
                      <Tooltip title={p.dbAlais}>{p.dbAlais}</Tooltip>
                    </Option>
                  )
                })}
              </Select>
            </div>
          </Form.Item>,
          <Form.Item name='dt' label='目标数据表' labelCol={{ span: 6 }} rules={[{ required: true, message: '目标数据表必填！' }]}>
            <div>
              <Select showSearch value={writerTable} className='width300' disabled={disabled} onChange={val => handlehangeTargetTable(index, val)} placeholder='请选择目标数据表'>
                {_.get(tableList, dbInfoId, []).map(p => {
                  return (
                    <Option key={`${p}`} value={p}>
                      <Tooltip title={p}>{p}</Tooltip>
                    </Option>
                  )
                })}
              </Select>
            </div>
          </Form.Item>,
          selectDsType === DATASOURCE_TYPE.hbase ? (
            <Form.Item name='dt' label='rowKey连接符' labelCol={{ span: 6 }}>
              <div>
                <Input
                  value={listDelimiter}
                  className='width150'
                  disabled={disabled}
                  onChange={val => changeoOutputConfig(`listDelimiter`, val.target.value)}
                  placeholder='请输入rowKey连接符'
                />
              </div>
            </Form.Item>
          ) : null
        ]
        break
      default:
        config = []
        break
    }
    return [...config]
  }

  const handlerReferenceFields = index => {
    const { dbInfoId, type, schema, database, namespace: name, writerTable, readerTable, id } = curOutPutConfig
    props.dispatch({
      type: `${namespace}_${props.id}/referenceFieldsList`,
      payload: {
        outputDsId: dbInfoId,
        outputDbName: schema || database || name,
        writerTable,
        readerTable,
        id,
        outputDsType: type
      }
    })
  }

  const renderFieldsetting = (index, obj) => {
    const { dbInfoId, schema, database, namespace: name, readerTable, writerTable } = curOutPutConfig
    let outputFields = _.get(dataFields, `${dbInfoId}_${schema || database || name}_${writerTable}`)
    let inputFields = _.get(curOutPutConfig, 'columnMappings', [])
    const isHbase = _.get(curOutPutConfig, 'type') === DATASOURCE_TYPE.hbase
    if (_.isEmpty(inputFields)) {
      if (_.isEmpty(outputFields)) {
        inputFields = _.get(dataFields, `${inputDsId}_${inputDbName}_${readerTable}`, [])
      } else {
        inputFields = _.get(dataFields, `${inputDsId}_${inputDbName}_${readerTable}`, []).map((p, index) => {
          const isFirst = index === 0
          if (isHbase) {
            return {
              ...p,
              targetFamily: isFirst ? 'rowKey' : _.first(outputFields)?.name,
              targetName: isFirst ? 'rowKey' : p.name
            }
          }
          const field = outputFields.find(o => _.upperCase(o.name) === _.upperCase(p.name)) || {}
          return {
            ...p,
            targetName: field?.name,
            targetType: field?.type
          }
        })
      }
      if (!_.isEmpty(inputFields)) {
        props.dispatch({
          type: `${namespace}_${props.id}/changeState`,
          payload: {
            curOutPutConfig: immutateUpdate(curOutPutConfig, `columnMappings`, () => inputFields)
          }
        })
      }
    }
    return (
      <FormItem label='&nbsp;' className='mg1b' name='columnInfo' labelCol={{ span: 24 }} labelAlign='left'>
        <div className='alignright mg2r'>
          <Button style={{ marginLeft: '-45px', marginTop: '-40px', position: 'absolute' }} onClick={() => handlerReferenceFields(index)}>
            刷新
          </Button>
        </div>
        <FieldSetList
          mapping={mapping}
          outputFields={outputFields}
          inputFields={inputFields}
          isHbase={isHbase}
          disabled={disabled}
          onChange={val => changeoOutputConfig(`columnMappings`, val)}
        />
      </FormItem>
    )
  }

  const handleChangeOtherField = (index, type, val, parentType) => {
    const { dbInfoId, schema, database, namespace: name, readerTable, writerTable } = curOutPutConfig
    let outputFields = _.get(dataFields, `${dbInfoId}_${schema || database || name}_${writerTable}`)
    let info = _.get(curOutPutConfig, `columnMappings`, [])
    let field = _.find(outputFields, p => p.name === val)
    let idx = _.findIndex(info, p => p.type === type)
    // 特殊处理同步日期时间输出格式需要放到
    // type为datetimeMapping的对象里，增加一个KV对，dateFormat是key
    if (type === 'timeMapping' && parentType) {
      idx = _.findIndex(info, p => p.type === parentType)
      if (idx > -1) {
        info = _.clone(info)
        _.set(info, idx, { ...info[idx], type: parentType, dateFormat: val })
      } else {
        info = [...info, { type: parentType, dateFormat: val }]
      }
    } else {
      if (idx > -1) {
        info = _.clone(info)
        _.set(info, idx, { ...info[idx], type, targetName: val, targetType: field?.type })
      } else {
        info = [...info, { type, targetName: val, targetType: field?.type }]
      }
    }
    changeoOutputConfig(`columnMappings`, info)

    props.dispatch({
      type: `${namespace}_${props.id}/changeState`,
      payload: { curOutPutConfig: { ...curOutPutConfig, columnMappings: info } }
    })
  }

  const renderOtherConfig = index => {
    const { dbInfoId, schema, database, namespace, writerTable, columnMappings = [], columnSeparator, rowDelimiter } = curOutPutConfig
    const fields = _.get(dataFields, `${dbInfoId}_${schema || database || namespace}_${writerTable}`) || []
    const timeMapping = _.find(columnMappings, p => p.type === 'timeMapping') || {}
    const uuidMapping = _.find(columnMappings, p => p.type === 'uuidMapping') || {}
    const datetimeMapping = _.find(columnMappings, p => p.type === 'datetimeMapping') || {}
    const selectDsType = _.get([curOutPutConfig], [index, 'type'], 'mysql')

    return (
      <>
        <Row className='mg1t'>
          <Col span={8}>
            <FormItem name='sdt' label='&nbsp;&nbsp;&nbsp;序列号输出字段' labelCol={{ span: 6 }}>
              <div>
                <Select
                  showSearch
                  value={uuidMapping?.targetName}
                  className='width300'
                  dropdownMatchSelectWidth={false}
                  disabled={disabled}
                  onChange={val => {
                    setMapping(val)
                    handleChangeOtherField(index, 'uuidMapping', val)
                  }}
                  placeholder='请选择序列号输出字段'
                  allowClear
                >
                  {fields.map(p => {
                    return (
                      <Option key={`${p.name}`} value={p.name}>
                        <Tooltip title={p.name}>
                          {p.name}: {p.type}
                        </Tooltip>
                      </Option>
                    )
                  })}
                </Select>
              </div>
            </FormItem>
          </Col>
          <Col span={8}>
            <FormItem name='sdt' label='同步时间输出字段' labelCol={{ span: 6 }}>
              <div>
                <Select
                  showSearch
                  value={timeMapping?.targetName}
                  className='width300'
                  disabled={disabled}
                  dropdownMatchSelectWidth={false}
                  onChange={val => {
                    setMapping(val)
                    if (timeMapping?.dateFormat) {
                      timeMapping.dateFormat = dateFormats[0]
                      handleChangeOtherField(index, 'timeMapping', dateFormats[0], 'timeMapping')
                    }
                    if (!val) {
                      let info = _.get(curOutPutConfig, `columnMappings`, [])
                      let idx = _.findIndex(info, p => p.type === 'timeMapping')
                      if (idx > -1) {
                        info = _.clone(info)
                        _.set(info, idx, { ...info[idx], type: 'timeMapping', targetName: undefined, targetType: undefined, dateFormat: undefined })
                      } else {
                        info = [...info, { type: timeMapping, targetName: undefined, targetType: undefined, dateFormat: undefined }]
                      }
                      changeoOutputConfig(`columnMappings`, info)
                      props.dispatch({
                        type: `${namespace}_${props.id}/changeState`,
                        payload: { curOutPutConfig: { ...curOutPutConfig, columnMappings: info } }
                      })
                    } else {
                      handleChangeOtherField(index, 'timeMapping', val)
                    }
                  }}
                  placeholder='请选择同步时间输出字段'
                  allowClear
                >
                  {fields.map(p => {
                    return (
                      <Option key={`${p.name}`} value={p.name}>
                        <Tooltip title={p.name}>
                          {p.name}: {p.type}
                        </Tooltip>
                      </Option>
                    )
                  })}
                </Select>
              </div>
              <div>
                <Select
                  showSearch
                  value={timeMapping?.dateFormat}
                  className='width300'
                  disabled={disabled}
                  dropdownMatchSelectWidth={false}
                  onChange={val => handleChangeOtherField(index, 'timeMapping', val, 'timeMapping')}
                  placeholder='请选择同步时间输出格式'
                  allowClear
                >
                  {dateFormats.map(p => {
                    return (
                      <Option key={`${p}`} value={p}>
                        {p}
                      </Option>
                    )
                  })}
                </Select>
              </div>
            </FormItem>
          </Col>
          {selectDsType === DATASOURCE_TYPE.starrocks && (
            <Col span={8}>
              <FormItem name='lfgf' label='Stream Load导入列分隔符' labelCol={{ span: 8 }}>
                <div>
                  <Select
                    value={rowDelimiter || delimiters[0]}
                    className='width200'
                    dropdownMatchSelectWidth={false}
                    disabled={disabled}
                    showSearch
                    onChange={val => changeoOutputConfig('rowDelimiter', val)}
                    placeholder='请选择列分隔符'
                  >
                    {delimiters
                      .filter(item => columnSeparator !== item)
                      .map(p => {
                        return (
                          <Option key={`${p}`} value={p}>
                            {p}
                          </Option>
                        )
                      })}
                  </Select>
                </div>
              </FormItem>
              <FormItem name='hfgf' label='Stream Load导入行分隔符' labelCol={{ span: 8 }}>
                <div>
                  <Select
                    value={columnSeparator || delimiters[1]}
                    className='width200'
                    dropdownMatchSelectWidth={false}
                    disabled={disabled}
                    showSearch
                    onChange={val => changeoOutputConfig('columnSeparator', val)}
                    placeholder='请选择行分隔符'
                  >
                    {delimiters
                      .filter(item => rowDelimiter !== item)
                      .map(p => {
                        return (
                          <Option key={`${p}`} value={p}>
                            {p}
                          </Option>
                        )
                      })}
                  </Select>
                </div>
              </FormItem>
            </Col>
          )}
        </Row>
      </>
    )
  }

  const renderHbaseOtherConfig = index => {
    const { dbInfoId, schema, database, namespace, writerTable, columnMappings = [] } = curOutPutConfig
    const fields = _.get(dataFields, `${dbInfoId}_${schema || database || namespace}_${writerTable}`) || []
    const timeMapping = _.find(columnMappings, p => p.type === 'timeMapping')?.targetName || ''
    const [targetFamily = '', name = ''] = timeMapping.split('.')
    const uuidMapping = _.find(columnMappings, p => p.type === 'uuidMapping')?.targetName || ''
    const [uuidTargetFamily = '', uuidName = ''] = uuidMapping.split('.')
    return (
      <>
        <Row className='mg2t'>
          <Col span={20}>
            <FormItem name='sdt' label='同步时间输出字段' labelCol={{ span: 3 }}>
              <div>
                <Select
                  showSearch
                  value={targetFamily}
                  className='width200'
                  dropdownMatchSelectWidth={false}
                  disabled={disabled}
                  onChange={val => handleChangeOtherField(index, 'timeMapping', `${val}.${name}`)}
                >
                  {fields.map(p => {
                    return (
                      <Option key={`${p.name}`} value={p.nam}>
                        <Tooltip title={p.name}>{p.name}</Tooltip>
                      </Option>
                    )
                  })}
                </Select>
                <Input className='width150 mg2l' value={timeName} onChange={e => handleChangeOtherField(index, 'timeMapping', `${targetFamily}.${e.target.value}`)} />
              </div>
            </FormItem>
          </Col>
        </Row>
        <Row>
          <Col span={20}>
            <FormItem name='sdt' label='&nbsp;&nbsp;&nbsp;序列号输出字段' labelCol={{ span: 3 }}>
              <div>
                <Select
                  value={uuidTargetFamily}
                  className='width200'
                  dropdownMatchSelectWidth={false}
                  disabled={disabled}
                  showSearch
                  onChange={val => handleChangeOtherField(index, 'uuidMapping', `${val}.${uuidName}`)}
                >
                  {fields.map(p => {
                    return (
                      <Option key={`${p.name}`} value={p.nam}>
                        <Tooltip title={p.name}>{p.name}</Tooltip>
                      </Option>
                    )
                  })}
                </Select>
                <Input className='width150 mg2l' value={uuidName} onChange={e => handleChangeOtherField(index, 'uuidMapping', `${uuidTargetFamily}.${e.target.value}`)} />
              </div>
            </FormItem>
          </Col>
        </Row>
      </>
    )
  }

  const renderTabPane = () => {
    return [curOutPutConfig].map((p, index) => {
      const item = renderDatasourceSet(index, p)

      return (
        <>
          <Row className='mg1t'>
            {item.map((p, idx) => (
              <Col key={`col-${idx}`} span={8}>
                {p}
              </Col>
            ))}
          </Row>
          {_.get(p, 'type') === DATASOURCE_TYPE.hbase ? renderHbaseOtherConfig(index, p) : renderOtherConfig(index, p)}
          {renderFieldsetting(index, p)}
        </>
      )
    })
  }

  return <Card className='mg2t'>{renderTabPane()}</Card>
}

export default connect((props, ownProps) => {
  return {
    ..._.pick(props[`${namespace}_${ownProps.id}`], [
      'curOutPutConfig',
      'inputTables',
      'outputConfig',
      'dataDss',
      'disabled',
      'dataFields',
      'inputDsType',
      'inputDsId',
      'inputDbName',
      'tableList',
      'outputEdit'
    ])
  }
})(OutputConfig)
