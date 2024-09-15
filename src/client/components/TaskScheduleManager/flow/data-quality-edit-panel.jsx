/**
 * Created by fengxj on 3/19/19.
 */
import React from 'react'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Collapse, Button, Popover, Input, Select, message } from 'antd'
import DataQualityMeasureItem from './data-quality-measure-item'
import {enableSelectSearch} from '../../../common/antd-freq-use-props'
import Fetch from '../../../common/fetch-final'
const Option = Select.Option
const FormItem = Form.Item
const Panel = Collapse.Panel


const formItemLayout = {
  labelCol: {span: 3},
  wrapperCol: {span: 19}
}
const relationTextMap = {
  or: '或者',
  and: '并且'
}
//字符统计类型
const statisticsTypeList = {
  string: ['count', 'countDistinct'],
  number: ['count', 'countDistinct', 'max', 'min', 'sum'],
  date: ['count', 'countDistinct', 'max', 'min'],
  datestring: ['count', 'countDistinct']
}

//数字指标过滤类型
const filterTypeTextMap = {
  is: '等于',
  isnt: '不等于',
  lessThan: '小于',
  lessThanOrEqual: '小于或等于',
  greaterThan: '大于',
  greaterThanOrEqual: '大于或等于',
  isEmpty: '值为空',
  notEmpty: '非空',
  between: '范围'
}

//string值的指标过滤类型
const strFilterTypeTextMap = {
  is: '等于',
  isnt: '不等于',
  in: '包含',
  notin: '不包含',
  isEmpty: '值为空',
  notEmpty: '值非空'
}

//指标统计结果类型
const statisticsTypeTextMap = {
  count: '数量',
  countDistinct: '去重数量',
  max: '最大',
  min: '最小',
  sum: '求和'
}
//构建name-value的map，方便查询
function buildNameTree(slices) {
  return slices.reduce((before, slice) => {
    before[slice.name] = slice
    return before
  }, {})
}

function getNewCondition(defaultDimName) {
  return {
    hideMeasumeDef: true,
    name: 'condition',
    title: '',
    formula: '',
    type: 1,
    params: {
      simple: {
        //过滤条件
        filters: [],
        //统计类型
        statistics: {
          type: 'count',
          dimensionName: defaultDimName
        },
        //or and
        relation: 'and'
      },
      composite: {
        items: [{}, {}],
        operator: 'divide'
      },
      //编辑模式
      formulaEditMode: 'simple'
    },
    pattern: 'none',
    tags: []
  }
}
class DataQualityEditPanel extends React.Component {
  constructor(props) {
    super(props)
    const dimensions = []
    const defaultDimName = dimensions[0]
      ? dimensions[0].name
      : ''
    this.state = {
      schema: null,
      databases: [],
      tables: [],
      defaultDimName,
      statisticsDimensions: dimensions,
      dimensions,
      dimensionTree: buildNameTree(dimensions),
      modalVisible: true,
      addMeasurePopoverVisible: false,
      addMeasureVal: ''
    }
  }

  async componentWillMount() {
    const res = await Fetch.get('/app/hive/databases')
    let {databases} = res.result
    let {currentDB, currentTable} = this.props
    let tables = []
    let dimensions = []
    if (currentDB != '') {
      tables = await this.getTables(currentDB)
    }
    if (currentTable != '') {
      dimensions = await this.getSchema(currentDB, currentTable)
    }

    const defaultDimName = dimensions[0]
      ? dimensions[0].name
      : ''

    this.setState({
      databases,
      tables,
      dimensions,
      defaultDimName,
      statisticsDimensions: dimensions,
      dimensionTree: buildNameTree(dimensions)
    })
  }
  componentWillUnmount(){
    this.setState = (state,callback)=>{
      return
    }
  }
  addMeasure = () => {
    let {defaultDimName, addMeasureVal} =  this.state
    let {measures, updateConf} = this.props
    let val = addMeasureVal.trim()
    if (val === '') {
      message.warning('值不能为空！')
      return
    }
    if (measures.hasOwnProperty(val)) {
      message.warning('重复指标名！')
      return
    }

    measures[val] = {
      name: val,
      title: '',
      formula: '',
      type: 1,
      params: {
        simple: {
          //过滤条件
          filters: [],
          //统计类型
          statistics: {
            type: 'count',
            dimensionName: defaultDimName
          },
          //or and
          relation: 'and'
        },
        composite: {
          items: [{}, {}],
          operator: 'divide'
        },
        //编辑模式
        formulaEditMode: 'simple'
      },
      pattern: 'none',
      tags: []
    }
    updateConf({measures})
    this.setState({addMeasurePopoverVisible: false, addMeasureVal: ''})
  }

  handleAddMeasurePopoverVisibleChange = (visible) => {
    this.setState({addMeasurePopoverVisible: visible})
  }
  onAddMeasureInputChange = (e) => {
    let value = e.target.value
    const pattern =/^[A-Za-z0-9_]+$/
    if(pattern.test(value)){
      this.setState({
        addMeasureVal: e.target.value
      })
    }
  }

  updateMeasures = (key, measure) => {
    let {measures, updateConf} = this.props
    if (key === 'condition') {
      updateConf({condition: measure})
      //this.setState({condition: measure})
      return
    } else {
      measures[key] = measure
    }
    //this.setState({measures})
    updateConf({measures})

  }

  getTables = async(db) => {
    const res = await Fetch.get('/app/hive/' + db + '/tables')
    let {tables} = res.result
    return tables
  }

  updateDatabase = async(value) => {
    let {updateConf} = this.props

    let tables = await this.getTables(value)

    updateConf({condition: {}, measures: {}, currentDB: value, currentTable: ''})
    this.setState({
      tables: tables,
      dimensions: [],
      defaultDimName: '',
      statisticsDimensions: [],
      dimensionTree: buildNameTree([])
    }
    )
  }

  getSchema = async(db, table) => {
    const res = await Fetch.get('/app/hive/' + db + '/' + table + '/schema')
    let {schema} = res.result
    let dimensions = schema.map((col) => {
      let type = 2
      switch (col.type.toUpperCase()) {
        case 'TINYINT':
        case 'SMALLINT':
        case 'INT':
        case 'BIGINT':
        case 'FLOAT':
        case 'DOUBLE':
        case 'DECIMAL':
        case 'NUMERIC':
          type = 5
          break

        case 'TIMESTAMP':
        case 'DATE':
        case 'INTERVAL':
          type = 4
          break
      }
      return {name: col.name, type}
    })

    return dimensions
  }
  updateTable = async(value) => {
    //let {currentDB} = this.state
    let {currentDB, updateConf} = this.props
    let dimensions = await this.getSchema(currentDB, value)
    const defaultDimName = dimensions[0]
      ? dimensions[0].name
      : ''

    let condition = getNewCondition(defaultDimName)
    let measures = {}
    let currentTable = value
    updateConf({condition, measures, currentTable})
    this.setState({
      dimensions,
      defaultDimName,
      statisticsDimensions: dimensions,
      dimensionTree: buildNameTree(dimensions)
    }
    )
  }


  removeMeasureBtnClick = (measure_name) => {
    return (event) => {
      let {measures, updateConf} = this.props
      event.stopPropagation()
      event.preventDefault()
      delete measures[measure_name]

      updateConf({measures})
    }
  }

  genPanelHeader = (measure_name) => (
    <div>
      {measure_name}
      <div className="fright width20">
        <CloseOutlined onClick={this.removeMeasureBtnClick(measure_name)} />
      </div>

    </div>

  )

  renderTableSelector = () => {
    let {databases, tables} = this.state
    let {currentDB, currentTable} = this.props
    return ( <FormItem {...formItemLayout} label="表">
      {
        <div className="mg1b mg1r">
          <div className="iblock">
            <div className="iblock" />
            <Select
              {...enableSelectSearch}
              className="width140 mg1r mg1l iblock-force"
              value={currentDB}
              onChange={(value) => {
                this.updateDatabase(value)
              }}
              showSearch
            >
              {
                databases.map((db) => {
                  return (
                    <Option key={db} value={db}>
                      {db}
                    </Option>
                  )
                })
              }
            </Select>
          </div>
            的
          <div className="iblock mg1l">
            <Select
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
              className="iblock width100 mg1r"
              value={currentTable}
              defaultValue={'count'}
              onChange={(value) => {
                this.updateTable(value)
              }}
            >
              {
                tables.map((table) => {
                  return (
                    <Option key={table} value={table}>
                      {table}
                    </Option>
                  )
                })
              }
            </Select>
          </div>
        </div>
      }
    </FormItem>
    )
  }

  renderFilter = () => {
    let {dimensions, dimensionTree, statisticsDimensions} = this.state
    let {condition} = this.props
    let baseProps = {
      dimensions,
      relationTextMap,
      filterTypeTextMap,
      strFilterTypeTextMap
    }

    let simpleProps = {
      statisticsTypeTextMap,
      dimensions,
      dimensionTree,
      statisticsDimensions,
      statisticsTypeList,
      updateMeasures: this.updateMeasures
    }
    return (
      <DataQualityMeasureItem baseProps={baseProps} {...simpleProps} measure={condition}
        formItemLayout={formItemLayout}
      />
    )
  }
  renderMeasure = () => {
    let {dimensions, dimensionTree, statisticsDimensions, addMeasureVal} = this.state
    let {measures} = this.props
    if(dimensions.length == 0)
      return null
    let baseProps = {
      dimensions,
      relationTextMap,
      filterTypeTextMap,
      strFilterTypeTextMap
    }

    let simpleProps = {
      statisticsTypeTextMap,
      dimensions,
      dimensionTree,
      statisticsDimensions,
      statisticsTypeList,
      updateMeasures: this.updateMeasures
    }
    let measureKeys = Object.keys(measures)

    return (
      <div style={{width: '80%', margin: 'auto'}}>
        {measureKeys.length > 0 ?
          <Collapse defaultActiveKey={[measureKeys[0]]}>
            {
              measureKeys.map((key) => {
                let measure = measures[key]
                //measure.name = key
                return (
                  <Panel header={this.genPanelHeader(measure.name)} key={measure.name}>
                    <DataQualityMeasureItem baseProps={baseProps} {...simpleProps} measure={measure}
                      formItemLayout={formItemLayout}
                    />

                  </Panel>
                )
              })
            }
          </Collapse> : ''
        }
        <br/>
        <Popover
          content={
            <div>
              <Input className="width-100" placeholder="名称(数字，字母，下划线)" value={addMeasureVal} onChange={this.onAddMeasureInputChange} />
              <br/>
              <div className="width-100" style={{margin: 'auto', marginTop: '10px'}} >
                <Button className="width-100" type="success" onClick={this.addMeasure}>确定</Button>
              </div>
            </div>
          }
          title="增加指标"
          trigger="click"
          visible={this.state.addMeasurePopoverVisible}
          onVisibleChange={this.handleAddMeasurePopoverVisibleChange}
        >
          <Button type="primary"><PlusOutlined />增加指标</Button>
        </Popover>
      </div>
    )

  }

  renderFilterAndMeasure = () => {
    return (
      <div>
        {this.renderFilter()}
        {this.renderMeasure()}
      </div>
    )
  }

  render() {
    let {currentTable} = this.props
    return (
      <div className="ug-form" style={{paddingTop: 0}}>
        {this.renderTableSelector()}
        {currentTable === '' ? '' : this.renderFilterAndMeasure()}

      </div>

    )
  }

}


export default DataQualityEditPanel
