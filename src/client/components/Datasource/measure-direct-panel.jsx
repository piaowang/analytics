import React from 'react'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Popover, Input, Tooltip, Button, Menu } from 'antd'
import SugoEditor from '../Common/editor'
import { Link } from 'react-router'
import _ from 'lodash'
import Search from '../Common/search'

const SubMenu = Menu.SubMenu
const FormItem = Form.Item

//公式说明文案
const editFormulaDescription = (
  <div className="measure-formula-description" style={{height: '400px',overflowY: 'auto'}} >
    <p>公式分为单指标和复合指标两种</p>
    <p>一，单指标</p>
    <p>组成： 数据源 ($main [必填]固定不变) + 过滤条件 (.filter(...) [可选]) + 统计类型 (.count() [必填])</p>
    <p>注意: 过滤条件如果不需要，则需要把 .filter() 去掉，如 $main.count()</p>
    <p>1.数据源</p>
    <p>数据源为固定格式，每条指标必须要加入 $main</p>
    <p>2.过滤条件</p>
    <p>需要用.filter() 包装</p>
    <p>组成： $维度名 + 判断语句 (==/!=/&gt;/&lt;) + 数值，不同条件组合用or 或者 and 连接</p>
    <p>判断语句 (==/!=/&gt;/&lt;) 可用判断运算符 或者用函数(lessThan/is/not)包装</p>
    <p>判断语句与对应的函数</p>
    <p>  大于: &gt; or greaterThan()</p>
    <p>  小于: &lt; or lessThan()</p>
    <p>  等于: == or is()</p>
    <p>  不等于: != or not()</p>
    <p>  包含: in(['value1','value2'])</p>
    <p>  不包含: notin(['value1','value2'])</p>
    <p>example:</p>
    <p>$main.filter($country == '中国').sum($revenue)</p>
    <p>等价于 $main.filter($country.is('中国')).sum($revenue)</p>
    <p>$main.filter(($country == '中国').or(($country == '美国'))).sum($revenue)</p>
    <p>注： $country 表示 $ + 维度名 ,'$'为必填格式</p>
    <p>3.统计类型</p>
    <p>组成： 统计类型 (count/countDistinct/max/min/sum) +  $维度名</p>
    <p>统计类型</p>
    <p>count 统计数量，不需要要加维度 .count()</p>
    <p>countDistinct 去重统计，需要指定去除重复值的维度</p>
    <p>max 最大，需要指定维度</p>
    <p>min 最小，需要指定维度</p>
    <p>sum 求和，需要指定维度</p>
    <p>example:</p>
    <p>统计中国人资产总和 $main.filter($country == '中国').sum($wealth)</p>
    <p>二，复合指标</p>
    <p>定义： 对多条指标的组合计算</p>
    <p>组成 指标A + 运算符号(+,-,*,/) 或者对应函数式 + 指标B</p>
    <p>运算符号与对应的函数</p>
    <p>  加： + or add</p>
    <p>  减： - or subtract</p>
    <p>  乘： * or multiply</p>
    <p>  除： / or divide</p>
    <p>example:</p>
    <p>需要统计税收占全部资产的比重</p>
    <p>统计全部税收的指标 $main.sum($revenue)</p>
    <p>统计全部资产的指标 $main.sum($wealth)</p>
    <p>统计税收占全部资产的比重的复合指标为 $main.sum($revenue) / $main.sum($wealth)</p>
    <p>等价于 $main.sum($revenue).divide($main.sum($wealth))</p>
    <p>更复杂情况可参考 http://plywood.imply.io/expressions</p>
  </div>
)

const keyBoards = [
  [{
    title: '+', data: '+', col: 1
  },{
    title: '<', data: '.lessThan(', col: 1
  },{
    title: '>', data: '.greaterThan(', col: 1
  },{
    title: '7', data: '7', col: 1
  },{
    title: '8', data: '8', col: 1
  },{
    title: '9', data: '9', col: 1

  }],[{
    title: '-', data: '-', col: 1
  },{
    title: '<=', data: '.lessThanOrEqual(', col: 1
  },{
    title: '=>', data: '.greaterThanOrEqual(', col: 1
  },{
    title: '4', data: '4', col: 1
  },{
    title: '5', data: '5', col: 1
  },{
    title: '6', data: '6', col: 1

  }],[{
    title: '*', data: '*', col: 1
  },{
    title: '==', data: '.is(', col: 1
  },{
    title: '!=', data: '.isnt(', col: 1
  },{
    title: '1', data: '1', col: 1
  },{
    title: '2', data: '2', col: 1
  },{
    title: '3', data: '3', col: 1

  }],[{
    title: '/', data: '/', col: 1
  },{
    title: 'in', data: '.in(', col: 1
  },{
    title: 'not', data: '.not(', col: 1
  },{
    title: '0', data: '0', col: 2
  },{
    title: '.', data: '.', col: 1

  }],[{
    title: '(', data: '(', col: 1
  },{
    title: ')', data: ')', col: 1
  },{
    title: 'and', data: '.and(', col: 1
  },{
    title: 'or', data: '.or(', col: 1
  },{
    title: 'filter', data: '.filter(', col: 1
  },{
    title: 'main', data: '$main', col: 1
  }]
]

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
        '表示 年龄大于20的个数减去年龄大于40的个数'
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
      data: '.split'
    }]
  },
  aggregate: {
    title: '聚合函数',
    funs: [{
      name: 'count',
      title: '统计',
      desc: '对表达式数量统计，格式 operand.count()',
      example: [
        '$main.count()',
        '表示 获取总数'
      ],
      data: '.count'
    },{
      name: 'countDistinct',
      title: '去重统计',
      desc: '表达式的操作数去重统计，格式 operand.countDistinct(ex: any)',
      example: [
        '$main.countDistinct($name)',
        '表示 统计去重name之后的数据量'
      ],
      data: '.countDistinct'
    },{
      name: 'sum',
      title: '求和',
      desc: '对表达式的操作数求和，格式 operand.sum(ex: any)',
      example: [
        '$main.sum($income)',
        '表示 获取收入总数'
      ],
      data: '.sum'
    },{
      name: 'min',
      title: '最小',
      desc: '表达式的操作数最小值，格式 operand.min(ex: any)',
      example: [
        '$main.min($price)',
        '表示 取最低价格'
      ],
      data: '.min'
    },{
      name: 'max',
      title: '最大',
      desc: '表达式的操作数最大值，格式 operand.max(ex: any)',
      example: [
        '$main.max($price)',
        '表示 取最高价格'
      ],
      data: '.max'
    }]
  }
}

class MeasureDirectModal extends React.Component {

  state = {
    search: '',
    selectFunGroups: []
  }

  onChangeSearch = (e) => {
    this.setState({
      search: e.target.value
    })
  }

  onFunGroupClick = (key) => {
    let {selectFunGroups} = this.state
    //若存在key，则删除
    if(selectFunGroups.includes(key)) {
      _.remove(selectFunGroups, function(name) {
        return name === key
      })
    } else {
      selectFunGroups.push(key)
    }
    this.setState({
      selectFunGroups
    })
  }

  onFunClick = (funObj) => {
    this.setState({
      selectFun: funObj
    })
  }

  onFunClick = (funObj) => {
    this.sugoEditor.insertParedContent(funObj.data, '')
  }

  onDimensionClick = (name) => {
    this.sugoEditor.insertParedContent('$' + name, '')
  }

  onKeyboardClick = (keyboardObj) => {
    this.sugoEditor.insertParedContent(keyboardObj.data, '')
  }

  onFormulaChange = (data) => {
    let {updateMeasure, form} = this.props
    form.setFields({
      formula: {}
    })
    updateMeasure('update_meaures_formula' ,data)
  }
  

  render () {
    let {params, formItemLayout, getFieldDecorator, measure, formulaEditModeTextMap, savedFormulaMode, dimensions, validateFormula } = this.props
    let {search, selectFunGroups} = this.state
    let funGroupKeys = _.keys(functionGroup)

    dimensions = search
      ? dimensions.filter(dimension => {
        let name = dimension.title || dimension.name
        return name.includes(search)
      })
      : dimensions
    //插入维度
    let content0 = (
      <div className="width200 measure-direct-modal dim-content">
        <div className="search-box pd2">
          <Search
            onChange={this.onChangeSearch}
            value={search}
            placeholder="搜索"
          />
        </div>
        <div className="dimension-list-wrapper">
          {
            dimensions.length
              ? dimensions.map((dimension, index) => {
                let name = dimension.title || dimension.name
                return (
                  <div key={index} className="usergroup-unit"
                    onClick={() => {
                      this.onDimensionClick(dimension.name)
                    }}
                  >
                    <Tooltip placement="right" title={name}>     
                      <Link className="elli block" >
                        {name}
                      </Link>
                    </Tooltip>
                  </div>
                )
              })
              : <p className="ug-empty pd2 aligncenter">
                还没有维度
              </p>
          }
        </div>
      </div>
    )

    //模拟键盘输入
    let content1 = (
      <div className="measure-direct-modal keyboard-content">
        {
          keyBoards.map((columns, index) => {
            return (
              <div className="aligncenter" key={index}>
                {
                  columns.map((keyBoard, i) => {
                    let style
                    if( keyBoard.col === 2) {
                      style = {width:'100px'}
                    }
                    return (
                      <span className="keyboard" style={style} onClick={() => {
                        this.onKeyboardClick(keyBoard)
                      }}
                      key={i}
                      >
                        {keyBoard.title}
                      </span>)
                  })
                }
              </div>
            )
          })
        }
      </div>
    )
    
    //插入函数
    let content2 = (
      <Menu
        mode="vertical"
        style={{width: '150px'}}
        theme="light"
        className="measure-direct-modal"
      >
        {
          funGroupKeys.map((d) => {
            let item = functionGroup[d]
            return (
              <SubMenu key={d} title={item.title} >
                {
                  item.funs.map((fun, index) => 
                  {
                    let desc = (<div key={index}>
                      <p>{fun.desc}</p>
                      <p>例子:</p>
                      {
                        fun.example.map((d, i) => <p key={i}>{d}</p>)
                      }
                    </div>)

                    return (<Menu.Item key={fun.name}>
                      <Popover content={desc} title="函数说明" placement="right">
                        <div onClick={() => {
                          this.onFunClick(fun)
                        }} className="mw300 elli"
                        > {fun.title}</div>
                      </Popover>
                    </Menu.Item>)
                  }
                  )
                }
              </SubMenu>
            )
          })
        }
      </Menu>
    )

    dimensions = search
      ? dimensions.filter(measure => {
        let name = measure.title || measure.name
        return name.includes(search)
      })
      : dimensions
    
    let funs = []
    selectFunGroups.forEach((groupKey) => {
      funs = funs.concat(functionGroup[groupKey].funs)
    })

    return (
      <div className="measure-direct-modal">
        {
          params.formulaEditMode !== 'simple' && params.formulaEditMode !== 'composite' &&
        <FormItem {...formItemLayout} label="公式">
          {
            getFieldDecorator(
              'formula',
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
                initialValue: measure.formula
              })(
              <Input className="hide" />
            )
          }
          {
            <div>
              <Popover placement="top" content={content0}>
                <Button type="ghost" className="mg1r">插入维度</Button>
              </Popover>
              <Popover placement="top" content={content1}>
                <Button type="ghost" className="mg1r">模拟键盘输入</Button>
              </Popover>
              <Popover placement="top" content={content2}>
                <Button type="ghost" className="mg1r">插入函数</Button>
              </Popover>
            </div>
          }
          <SugoEditor ref={ref => this.sugoEditor = ref} 
            rows={2} 
            cols={19} 
            onChange={this.onFormulaChange}
            style={{
              fontSize: '14px'
            }}
            className="width-90"
            value={measure.formula}
          />
          
          {
            <Popover content={editFormulaDescription} title="公式说明">
              <QuestionCircleOutlined className="mg1l" />
            </Popover>
          }
          {
            measure.id && (
              <div className="formula-tips">* 此公式是由{formulaEditModeTextMap[savedFormulaMode]}模式生成</div>
            )
          }
        </FormItem>
        }
      </div>
    )
  }
}

export default MeasureDirectModal
