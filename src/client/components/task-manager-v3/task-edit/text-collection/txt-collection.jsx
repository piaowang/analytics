import React, { useState, useEffect } from 'react'
import { Form, Input, Checkbox, Row, Col, InputNumber, PageHeader } from 'antd'
import _ from 'lodash'
import DynamicTable from './dynamic-table'
import { getContentStyle, useList } from './utils'
import { 
  PREFIX, 
  TXT_TABLE_ITEM_CONFIG, 
  TXT_OUTPUT_TABLE_COLUMNS,
  SELECTED_FILES_TABLE_COLUMNS,
  TEXT_COLL_FORM_DEFAULT_VAL
} from './const'

const { Item } = Form

const TxtCollection = (props) => {

  const { form, selTabRef, outTabRef, info } = props
  const editMode = !!info.scriptContent

  const [tableItems, setTableItems] = useState([])
  const lists = useList(info)
  useEffect(() => {
    const flag = editMode && _.get(info, 'scriptContent[0].cleaner.parser.separator')
    renderCurCols(flag)
  }, [])

  const onValuesChange = (changedValues, allValues) => {
    if(!_.has(changedValues, 'haveSeparator')) {
      return
    }
    renderCurCols(changedValues.haveSeparator)
  }

  const renderCurCols = (haveSeparator) => {
    const tempItems = _.cloneDeep(TXT_OUTPUT_TABLE_COLUMNS)
    if(haveSeparator) {
      tempItems.splice(0, 2)
    }
    setTableItems(tempItems)
  }

  const shouldRenderSeparator = (prevValues, currentValues) => {
    return prevValues.haveSeparator !== currentValues.haveSeparator
  }

  return (
    <div className={`${PREFIX}-txt-content`} style={getContentStyle()}>
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
              editMode={editMode}
              columns={SELECTED_FILES_TABLE_COLUMNS}
              originList={lists.selected}
            />
          </Col>
        </Row>
      </div>
      <Form 
        form={form} 
        layout='inline' 
        className={`${PREFIX}-form ${PREFIX}-txt-form pd4x`}
        onValuesChange={onValuesChange}
        initialValues={TEXT_COLL_FORM_DEFAULT_VAL}
      >
        <Item noStyle shouldUpdate={shouldRenderSeparator}>
          {
            ({ getFieldValue }) => {
              return (
                <Item 
                  name='haveSeparator' 
                  label='分隔格式' 
                  valuePropName='checked'  
                  {...(getFieldValue('haveSeparator') ? 
                    TXT_TABLE_ITEM_CONFIG.separator : TXT_TABLE_ITEM_CONFIG.haveSeparator
                  )}
                >
                  <Checkbox />
                </Item>
              )
            }
          }
        </Item>
        <Item shouldUpdate={shouldRenderSeparator} noStyle>
          {
            ({ getFieldValue }) => {
              return getFieldValue('haveSeparator') ? (
                <Item 
                  name='separator' 
                  label='分隔符'
                  rules={[{ required: true }]}
                  {...TXT_TABLE_ITEM_CONFIG.separator}
                >
                  <Input />
                </Item>
              ) : null
            }
          }
        </Item>
        <Item name='headLine' label='头部行数量' {...TXT_TABLE_ITEM_CONFIG.headLine}>
          <InputNumber />
        </Item>
        <Item 
          name='tailLine'
          label='尾部行数量'
          {...TXT_TABLE_ITEM_CONFIG.tailLine}
        >
          <InputNumber />
        </Item>
        <PageHeader title='输出配置' className='output-title'/>
        <Item 
          name='toDataBase' 
          label='目标数据库' 
          rules={[{ required: true }]} 
          {...TXT_TABLE_ITEM_CONFIG.toDataBase}
        >
          <Input />
        </Item>
        <Item 
          name='toDataSource' 
          label='目标表名' 
          rules={[{ required: true }]} 
          {...TXT_TABLE_ITEM_CONFIG.toDataSource}
        >
          <Input />
        </Item>
      </Form>
      <div className='pd4x'>
        <Row className={`${PREFIX}-row`}>
          <Col md={{ offset: 3 }} xl={{ offset: 3 }} xxl={{ offset: 2 }} />
          <Col md={{ span: 21 }} xl={{ span: 21 }} xxl={{ span: 22 }}>
            <DynamicTable 
              ref={outTabRef}
              columns={tableItems}
              editMode={editMode}
              originList={lists.output}
            />
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default TxtCollection
