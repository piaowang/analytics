import React from 'react'
import {Row, Col, Select} from 'antd'
import _ from 'lodash'
import {immutateUpdate} from '../../../common/sugo-utils'
import {connect} from 'react-redux'
import { BusinessDimensionTypeEnum } from '../../../common/constants'

let mapStateToProps = (state, ownProps) => {
  const tableSyncState = state['offline-calc-tables-for-dim-picker'] || {}
  const dsList = state['offline-calc-data-sources-for-dim-picker'] || {}
  return {
    offlineCalcTables: tableSyncState.offlineCalcTables,
    offlineCalcDataSources: dsList.offlineCalcDataSources
  }
}

const {Option} = Select

@connect(mapStateToProps)
export default class FiltersEditorForOfflineCalc extends React.Component {
  
  render() {
    let {value: tablesSet = [], onChange, visiblePopoverKey, onVisiblePopoverKeyChange, disabled = false, offlineCalcTables, offlineCalcDataSources, dimNameInfo = {} } = this.props
    if (_.isNil(visiblePopoverKey)) {
      visiblePopoverKey = ''
    }
    let texts = BusinessDimensionTypeEnum
    return (
      <React.Fragment>
        <Row>
          <Col span={12}>数据源名/表名</Col>  
          <Col span={12}>字段名</Col>
        </Row>
        {(tablesSet).map((table, idx) => {
          const [ dsId, tableId, field ] = table.split('/')
          let tableObj = _.find(offlineCalcTables, t => t.id === tableId && t.data_source_id === dsId ) || {}
          let dsObj = _.find(offlineCalcDataSources, d => d.id === dsId) || {}
          let tName = tableObj.title || tableObj.name || '(表已删除)'
          let dName = dsObj.name || '(数据源已删除)'
          //该属性通过Object.defineProperty定义 读取则直接触发函数
          let fields = _.get(tableObj, 'params.fieldInfos') || []
          return (
            <Row style={{borderBottom: '1px solid #ccc'}} key={idx}>
              <Col span={12}>{dName} / {tName}</Col>  
              <Col span={12}>
                <Select
                  showSearch
                  allowClear
                  value={field}
                  filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                  onChange={(val) => {
                    if (!val) {
                      return  onChange(immutateUpdate(tablesSet, idx, (pre) => {
                        let temp = pre.split('/')
                        if (temp.length === 3) {
                          temp.pop()
                        }
                        return temp.join('/')
                      }))
                    }
                    onChange(immutateUpdate(tablesSet, idx, (pre) => `${pre}/${val}`))
                  }}
                >
                  {
                    fields.filter(field => field.type === texts[dimNameInfo.type]).map( field => (
                      <Option title={field.field} key={field.field} value={field.field}>{field.field}</Option>
                    ))
                  }
                </Select>
              </Col>
            </Row>
          )
        })}
      </React.Fragment>
    )
  }
}
