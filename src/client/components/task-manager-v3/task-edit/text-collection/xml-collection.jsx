import React, { useState } from 'react'
import { 
  Row, 
  Col, 
  Form, 
  Spin, 
  Input, 
  Select, 
  Button, 
  message,
  PageHeader
} from 'antd'
import _ from 'lodash'
import DynamicTable from './dynamic-table'
import { getPathOptionsBody, getContentStyle, getIdBuff, useList } from './utils'
import { 
  PREFIX,
  MESSAGE_INFO,
  XML_TABLE_ITEM_CONFIG, 
  XML_OUTPUT_TABLE_COLUMNS, 
  SELECTED_FILES_TABLE_COLUMNS
} from './const'
import Fetch from 'client/common/fetch-final'

const { Item } = Form
const { Option } = Select


const XmlCollection = (props) => {

  const { form, selTabRef, outTabRef, info } = props

  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [tableLoading, setTableLoading] = useState(false)
  const [path, setPath] = useState()
  const lists = useList(info)
  const editMode = !!info.scriptContent

  const getSelectOptions = async () => {
    const paramsPath = selTabRef.current.getData()?.[0]?.collectPath
    if(!paramsPath) return message.info(MESSAGE_INFO.PATH_INFO)
    if(options.length && path === paramsPath) return 
    try {
      setOptions([])
      setLoading(true)
      const res = await Fetch.post(
        '/app/task-schedule-v3/preview?action=getAllXpath', 
        null, 
        { 
          body: JSON.stringify({ 
            selectedFile: [getPathOptionsBody(selTabRef.current.getData())] 
          })
        }
      )
      if(res.status === 'success') {
        setOptions(res.xPathExpression)
        setPath(paramsPath)
      }
    } catch (err) {
      console.error(err)
      message.error(MESSAGE_INFO.PATH_ERROR)
    } finally {
      setLoading(false)
    }
  }

  const getOriginCol = async () => {
    if(!form.getFieldValue('xPathExpression')) return message.info(MESSAGE_INFO.ORIGIN_INFO)
    try {
      setTableLoading(true)
      const res = await Fetch.post(
        '/app/task-schedule-v3/preview?action=getXmlColumns', 
        null, 
        { 
          body: JSON.stringify({ 
            xPathExpression: form.getFieldValue('xPathExpression'),
            selectedFile: [getPathOptionsBody(selTabRef.current.getData())] 
          })
        }
      )
      if(res.status === 'success') {
        outTabRef.current.setData(getIdBuff(res.columnList))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTableLoading(false)
    }
  }
  
  return (
    <div className={`${PREFIX}-xml-content`} style={getContentStyle()}>
      <PageHeader title='输入配置' className='input-title'/>
      <div className='pd4x font14'>
        <Row className={`${PREFIX}-row`}>
          <Col 
            className='selected-label' 
            md={{ span: 3 }} 
            xl={{ span: 3 }} 
            xxl={{ span: 2 }}
          >选中的文件：</Col>
          <Col md={{ span: 21 }} xl={{ span: 19 }} xxl={{ span: 18 }}>
            <DynamicTable 
              ref={selTabRef}
              columns={SELECTED_FILES_TABLE_COLUMNS}
              originList={lists.selected}
              editMode={editMode}
            />
          </Col>
        </Row>
      </div>
      <Form 
        form={form} 
        layout='inline' 
        className={`${PREFIX}-form ${PREFIX}-xml-form pd4x`}
      >
        <Item 
          name='xPathExpression' 
          label='循环读取路径：' 
          rules={[{ required: true }]} 
          {...XML_TABLE_ITEM_CONFIG.xPathExpression}
        >
          <Select
            showSearch
            notFoundContent={loading ? <Spin size='small' /> : null}
            onFocus={getSelectOptions}
            filterOption={(input, option) => {
              return option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }}
          >
            {
              _.map(options, (option, index) => <Option key={index} value={option}>{option}</Option>)
            }
          </Select>
        </Item>
        <PageHeader title='输出配置' className='output-title'/>
        <Item 
          name='toDataBase' 
          label='目标数据库' 
          rules={[{ required: true }]} 
          {...XML_TABLE_ITEM_CONFIG.toDataBase}
        >
          <Input />
        </Item>
        <Item 
          name='toDataSource' 
          label='目标表名' 
          rules={[{ required: true }]} 
          {...XML_TABLE_ITEM_CONFIG.toDataSource}
        >
          <Input />
        </Item>
        <Item className='inline-style-1'>
          <Button type='primary' onClick={() => getOriginCol()}>获取源字段</Button>
        </Item>
      </Form>
      <div className='pd4x'>
        <Row className={`${PREFIX}-row`}>
          <Col md={{ offset: 3 }} xl={{ offset: 3 }} xxl={{ offset: 2 }} />
          <Col md={{ span: 21 }} xl={{ span: 21 }} xxl={{ span: 22 }}>
            <DynamicTable 
              ref={outTabRef}
              columns={XML_OUTPUT_TABLE_COLUMNS}
              originList={lists.output}
              editMode={editMode}
              loading={tableLoading}
            />
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default XmlCollection
