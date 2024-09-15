import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Menu, Col, Row, Button } from 'antd';
import _ from 'lodash'
import SugoEditor from '../Common/editor'
import { isNumberDimension, DruidColumnTypeIcon } from '../../../common/druid-column-type'
import smartSearch from '../../../common/smart-search'
import Icon from '../Common/sugo-icon'
import Search from '../Common/search'

const FormItem = Form.Item

// 计算公式定义
/*
const functionGroup = {
  arithmetic: {
    title: '算术',
    funs: [{
      name: 'add',
      title: '相加',
      desc: '将参数加到表达式上， 格式 operand.add(...exs: any[])',
      example: [
        '$main.filter($age > 20).count().add($main.filter($age < 10).count())',
        '表示 年龄大于20的个数加上年龄小于10的个数'
      ],
      data: '.add'
    },{
      name: 'subtract',
      title: '相减',
      desc: '从表达式减去参数，格式 operand.subtract(...exs: any[]) ',
      example: [
        '$main.filter($age > 20).count().subtract($main.filter($age > 40))',
        '表示 年龄大于20的个数加上年龄大于40的个数'
      ],
      data: '.subtract'
    },{
      name: 'negate',
      title: '取反',
      desc: '对表达式取反，格式 operand.negate()',
      example: [
        '$main.count().negate()  //$main.count() =>10 $main.count().negate() => -10',
        '表示 总数取反'
      ],
      data: 'negate'
    },{
      name: 'multiply',
      title: '相乘',
      desc: '将参数与表达式相乘，格式 multiply(...exs: any[])',
      example: [
        '$main.count().multiply($main.count())',
        '表示 总数乘以总数'
      ],
      data: '.multiply'
    },{
      name: 'divide',
      title: '相除',
      desc: '表达式除以参数，格式 divide(...exs: any[])',
      example: [
        '$main.count().multiply(12)',
        '表示 总数除以12'
      ],
      data: '.divide'
    },{
      name: 'reciprocate',
      title: '取倒数',
      desc: '对表达式取倒数，格式 operand.reciprocate()',
      example: [
        '$main.count().reciprocate()',
        '表示 1/总数'
      ],
      data: '.reciprocate'
    }]
  },
  predicates:{
    title: '判断函数',
    funs: [{
      name: 'is',
      title: '等于',
      desc: '检查表达式和操作数是否相等，格式 operand.is(ex: any)',
      example: [
        '$main.filter($age.is(20)).count()',
        '表示 统计age是20的数量'
      ],
      data: '.is'
    },{
      name: 'isnt',
      title: '不等于',
      desc: '检查表达式和操作数是否不相等，格式 operand.isnt(ex: any)',
      example: [
        '$main.filter($age.isnt(20)).count()',
        '表示 统计age不是20的数量'
      ],
      data: '.isnt'
    },{
      name: 'lessThan',
      title: '小于',
      desc: '检查表达式是否小于操作数，格式 operand.lessThan(ex: any)',
      example: [
        '$main.filter($age.lessThan(20)).count()',
        '表示 统计20岁以下的数量'  
      ],
      data: '.lessThan'
    },{
      name: 'lessThanOrEqual',
      title: '小于或等于',
      desc: '检查表达式小于或等于操作数，格式 operand.lessThanOrEqual(ex: any)',
      example: [
        '$main.filter($age.lessThanOrEqual(20)).count()',
        '表示 统计20或20岁以下的数量'  
      ],
      data: '.lessThanOrEqual'
    },{
      name: 'greaterThan',
      title: '大于',
      desc: '检查表达式大于操作数，格式 operand.greaterThan(ex: any)',
      example: [
        '$main.filter($age.greaterThan(20)).count()',
        '表示 统计20岁以上的数量'  
      ],
      data: '.greaterThan'
    },{
      name: 'greaterThanOrEqual',
      title: '大于或等于',
      desc: '检查是否表达式大于或等于操作数，格式 operand.greaterThanOrEqual(ex: any)',
      example: [
        '$main.filter($age.greaterThanOrEqual(20)).count()',
        '表示 统计20或20岁以上的数量'
      ],
      data: '.greaterThanOrEqual'
    },{
      name: 'contains',
      title: '包含',
      desc: '检查是否表达式包含操作数，格式 operand.contains(ex: any, compare?: string)',
      example: [
        '$main.filter($name.contains(“数果”)).count()',
        '表示 统计name包含数果的数量'
      ],
      data: '.contains'
    },{
      name: 'in',
      title: '包含(多个)',
      desc: '检查是否表达式包含操作数，格式 operand.in(ex: any)',
      example: [
        '$main.filter($name.in([“数果”,"大数据"])).count()',
        '表示 统计name包含数果或大数据的数量'
      ],
      data: '.in'
    },{
      name: 'not',
      title: '非',
      desc: '非表达式，格式 operand.not()',
      example: [
        '$main.filter($name.is(“数果”).not()).count()',
        '表示 统计name不是数果的数量'
      ],
      data: '.not()'
    },{
      name: 'and',
      title: '并且',
      desc: '检查是否表达式包含操作数，格式 operand.and(...exs: any[])',
      example: [
        '$main.filter($name.is(“数果”).and($age > 20)).count()',
        '表示 统计name是数果并且age大于20的数量'
      ],
      data: '.and'
    },{
      name: 'or',
      title: '或者',
      desc: '检查是否表达式包含操作数，格式 operand.or(...exs: any[])',
      example: [
        '$main.filter($name.is(“数果”).or($name.is(“大数据”))).count()',
        '表示 统计name是数果或者name是大数据的数量'
      ],
      data: '.or'
    }]
  },
  transformations: {
    title: '转换函数',
    funs: [{
      name: 'filter',
      title: '过滤',
      desc: '对表达式过滤，格式 operand.filter(ex: any)',
      example: [
        '$main.filter($name.is(“数果”).or($name.is(“大数据”))).count()',
        '表示 统计name是数果或者name是大数据的数量'
      ],
      data: '.filter'
    },{
      name: 'split',
      title: '分割',
      desc: '对表达式分割，格式 operand.split(splits: any, name?: string, dataName?: string)',
      example: [
        '$main.split("$name", "title")',
        '表示 [{name: "数果", age: 18}]} => [{title: "数果", data: {name: "数果", age: 18}}]'
      ],
      data: '.split'
    },{
      name: 'limit',
      title: '限制',
      desc: '取N条表达式数据，格式 operand.limit(limit: int)',
      example: [
        '$main.filter($name="数果").limit(3)',
        '表示 取最多3条name是数果的数据'
      ],
      data: '.limit'
    },{
      name: 'transformUpperCase',
      title: '转大写',
      desc: '对表达式转换大小写，格式 operand.transformCase(\'upperCase\')',
      example: [
        '$main.filter($name="abc").transformCase(\'upperCase\')',
        '表示 abc转换为ABC'
      ],
      data: '.transformCase(\'upperCase\')'
    },{
      name: 'transformLowerCase',
      title: '转小写',
      desc: '对表达式转换大小写，格式 operand.transformCase(\'lowerCase\')',
      example: [
        '$main.filter($name="abc").transformCase(\'lowerCase\')',
        '表示 ABC转换为abc'
      ],
      data: '.transformCase(\'lowerCase\')'
    }]
  }
}
*/

/**
 * 计算维度类型的表单域视图
 * 
 * @export
 * @class DimensionCalcItem
 * @extends {React.PureComponent}
 */
export default class DimensionCalcItem extends React.PureComponent {

  static defaultProps = {
    dimension: {
      params: {}
    }
  }

  state = {
    currentFunctionGroup: 'all',
    currentDimensionSearching: null
  }

  setCurrentDimensionSearching = val => {
    if (val === this.state.currentDimensionSearching) {
      return
    }
    this.setState({currentDimensionSearching: val})
  }

  onFormulaChange = (data) => {
    const { updateDimensionParams, onChange, form } = this.props
    form.setFields({
      'params.formula': {}
    })
    updateDimensionParams({
      type: 'calc',
      formula: data
    })
    if (onChange) {
      onChange(data)
    }
  }

  onFuncionFilterChange = (value) => {
    this.setState({
      currentFunctionGroup: value
    })
  }

  onFunClick(funObj) {
    this.sugoEditor.insertParedContent(funObj.data, '')
  }

  onDimensionClick = (name) => {
    this.sugoEditor.insertParedContent('$' + name, '')
  }

  onKeyboardClick = (keyboardObj) => {
    this.sugoEditor.insertParedContent(keyboardObj.data, '')
  }

  render() {
    const { formItemLayout, getFieldDecorator, dimensions, dimension: { params }, validateFormula, disabled } = this.props
    const { currentDimensionSearching } = this.state

    // 这里也先过滤掉复合维度，不确定druid是否支持用复合维度来组成复合维度
    let finalOptions = dimensions.filter((dimension) => {
      return !_.get(dimension.params, 'type') && !!dimension.id
    })
    if (currentDimensionSearching) {
      finalOptions = finalOptions.filter(
        op => smartSearch(currentDimensionSearching, op.title || op.name)
      )
    }
    return (
      <div className="formula">
        <FormItem {...formItemLayout} label="计算公式">
          {
            getFieldDecorator(
              'params.formula',
              {
                rules: [
                  {
                    required: true,
                    message: '请输入公式'
                  },
                  {
                    validator: validateFormula,
                    validateTrigger: 'onBlur'
                  }
                ],
                initialValue: params.formula
              })(
              <Input className="hide" />
            )
          }
          <Row>
            <Col span={16} className="pd1r">
              <SugoEditor ref={ref => this.sugoEditor = ref}
                value={params.formula}
                rows={5}
                autosize={false}
                onChange={this.onFormulaChange}
                disabled={disabled}
                style={{
                  fontSize: '14px'
                }}
              />
              <Row>
                <Col span={6} className="pd1y pd1r">
                  <Button
                    className="iblock width-100"
                    onClick={() => !disabled && this.sugoEditor.insertParedContent('+', '')}
                  >
                  +
                  </Button>
                </Col>
                <Col span={6} className="pd1">
                  <Button
                    className="iblock width-100"
                    onClick={() => !disabled && this.sugoEditor.insertParedContent('-', '')}
                  >
                  -
                  </Button>
                </Col>
                <Col span={6} className="pd1">
                  <Button
                    className="iblock width-100"
                    onClick={() => !disabled && this.sugoEditor.insertParedContent('*', '')}
                  >
                  ×
                  </Button>
                </Col>
                <Col span={6} className="pd1y pd1l">
                  <Button
                    className="iblock width-100"
                    onClick={() => !disabled && this.sugoEditor.insertParedContent('/', '')}
                  >
                  ÷
                  </Button>
                </Col>
              </Row>
            </Col>
            <Col span={8}>
              <div key="dimension" className="iblock choose-panel">
                <div className="search-box">
                  <Search
                    onChange={(e) => this.setCurrentDimensionSearching(e.target.value)}
                    placeholder="搜索维度"
                  />
                </div>
                <div className="list-wrapper">
                  {
                    finalOptions.length
                      ? (<Menu prefixCls="ant-select-dropdown-menu" onClick={({key}) => this.onDimensionClick(finalOptions[key].name)}>
                        {
                          finalOptions.map((dim, index) => {
                            let name = dim.title || dim.name
                            return (
                              <Menu.Item key={index}>
                                <div
                                  className="itblock"
                                  style={{width: '20px'}}
                                >
                                  <Icon type={DruidColumnTypeIcon[dim.type]} className="font20 color-blue-grey height20" />
                                </div>
                                <div
                                  className="itblock pd1l elli"
                                  style={{width: 'calc(100% - 20px)'}}
                                >
                                  {name}
                                </div>
                              </Menu.Item>
                            )
                          })
                        }
                      </Menu>
                      )
                      : <p className="ug-empty pd2 aligncenter">
                        还没有维度
                      </p>
                  }
                </div>
              </div>
            </Col>
          </Row>
          <div className="color-red">说明： 计算维度目前只支持1个数值维度计算(注意计算公式结果需和所选类型一致！)</div>
        </FormItem>
      </div>
    )
  }

}
