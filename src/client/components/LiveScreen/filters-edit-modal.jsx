import React from 'react'
import Icon from '../Common/sugo-icon'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Col, Input, Modal, Radio, Row, Select, Tooltip } from 'antd';
import _ from 'lodash'
import {immutateUpdate, immutateUpdates, interpose} from '../../../common/sugo-utils'
import {DruidNativeType} from '../../../common/druid-column-type'
import {FilterOpNameMap} from './filters-display-panel'

const RadioButton = Radio.Button
const RadioGroup = Radio.Group
const { Option } = Select
const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 18 }
}

export default class FiltersEditModal extends React.Component {
  state = {
    queryFilters: {}
  }

  componentDidMount() {
    let queryFilters = _.get(this.props, 'value') || []
  
    // 初始化时确保顶层必须是 and/or
    let currRootOp = _.get(queryFilters, [0, 'op'])
    if (!/(and|or)$/.test(currRootOp)) {
      queryFilters = [{
        op: 'and',
        eq: queryFilters
      }]
    }
    this.setState({
      queryFilters
    })
  }

  onChangeFilter = (fltIdxPath, updater) => {
    let { queryFilters } = this.state
    this.setState({
      // 0 -> 0
      // 0,1 -> 0, eq, 1
      queryFilters: immutateUpdate(queryFilters, interpose('eq', fltIdxPath), updater)
    })
  }

  renderFilter = (filter, fltIdxPath) => {
    let {dimensionList} = this.props
    let {col, op, eq} = filter
    eq = _.isArray(eq) ? eq : [eq].filter(_.identity)
    
    if (_.endsWith(op, 'and') || _.endsWith(op, 'or')) {
      return (
        <div
          className="mg1b pd1y pd2l"
          style={{ border: '1px dashed #aaa' }}
          key={_.last(fltIdxPath)}
        >
          <span
            className="pointer mg3r iblock"
            onClick={() => {
              this.onChangeFilter(fltIdxPath, flt => {
                let {eq} = flt
                let prevEq = _.isArray(eq) ? eq : [eq].filter(_.identity)
                return {
                  ...flt,
                  eq: [...prevEq, {col: null, op: 'equal', eq: []}]
                }
              })
            }}
          >
            <Icon type="plus-circle-o" className="mg1r" />
          添加条件
          </span>
          {
            eq.length <= 1
              ? null
              : <RadioGroup
                value={op}
                size="small"
                onChange={ev => {
                  let {value} = ev.target
                  this.onChangeFilter(fltIdxPath, flt => {
                    return {...flt, op: value}
                  })
                }}
              >
                <Radio value="and">并且</Radio>
                <Radio value="or">或者</Radio>
              </RadioGroup>
          }
  
          {_.map(eq, (flt, i) => this.renderFilter({...filter, ...flt}, [...fltIdxPath, i]))}
        </div>
      )
    }
    return (
      <div className="tag-group-filter pd1b " key={`${fltIdxPath}`}>
        <Row>
          <Col span={8} className="pd1x">
            <Select
              className="iblock"
              placeholder="请选择列"
              value={col}
              onChange={val => {
                this.onChangeFilter(fltIdxPath, flt => ({...flt, col: val}))
              }}
              getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
            >
              {dimensionList.map((dbDim, j) => {
                const title = `${dbDim.title || dbDim.name}:${(DruidNativeType[dbDim.type] || 'STRING')}`
                return (
                  <Option
                    title={title}
                    key={dbDim.name}
                  >{title}</Option>
                )
              })}
            </Select>
          </Col>
          <Col span={5} className="pd1x">
            <Select
              className="iblock"
              value={filter.op}
              placeholder="请选择"
              onChange={val => {
                this.onChangeFilter(fltIdxPath, flt => ({...flt, op: val}))
              }}
              getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
            >
              {_.keys(FilterOpNameMap).map((p, j) => {
                return <Option key={p}>{FilterOpNameMap[p]}</Option>
              })}
            </Select>
          </Col>
          <Col span={10} className="pd1x">
            <Input
              className="iblock"
              value={filter.eq}
              onChange={ev => {
                let {value} = ev.target
                this.onChangeFilter(fltIdxPath, flt => ({...flt, eq: [value]}))
              }}
            />
          </Col>
          <Col>
            <Tooltip title="移除">
              <Icon
                type="close-circle-o"
                className="iblock mg1l pointer"
                onClick={() => {
                  let [lastFltIdx, last2ndFltIdx, ...rest] = [...fltIdxPath].reverse()
                  this.onChangeFilter(rest.reverse(), parentParentFlt => {
                    const next = immutateUpdates(parentParentFlt,
                      ['eq', last2ndFltIdx], parentFlt => {
                        let {eq} = parentFlt
                        let prevEq = _.isArray(eq) ? eq : [eq].filter(_.identity)
                        return {
                          ...parentFlt,
                          eq: prevEq.filter((v, i) => i !== lastFltIdx)
                        }
                      },
                      ['eq'], flts => flts.filter(({eq}) => !_.isEmpty(eq)))
                    return next
                  })
                }}
              />
            </Tooltip>
          </Col>
        </Row>
      </div>
    )
  }
  
  renderParams() {
    let {queryFilters} = this.state
    let currRootOp = _.get(queryFilters, [0, 'op'])
    if (!/(and|or)$/.test(currRootOp)) {
      return null
    }
    // 初始化时确保顶层必须是 and/or
    let {op: rootOp, eq: subFilters} = queryFilters[0]
  
    return (
      <div className="tag-group-filters">
        <div className="pd1b">
          <div className="pd1y iblock mg2r font14">
            <span
              className="pointer"
              onClick={() => {
                this.onChangeFilter([0], rootFlt => {
                  let {eq} = rootFlt
                  let prevEq = _.isArray(eq) ? eq : [eq].filter(_.identity)
                  return {
                    ...rootFlt,
                    eq: [...prevEq, {op: 'and', eq: [{col: null, op: 'equal', eq: []}]}]
                  }
                })
              }}
            >
              <Icon type="plus-circle-o" className="mg1r" />
              添加条件组合
            </span>
          </div>
          {
            subFilters.length <= 1
              ? null
              : <RadioGroup
                value={rootOp}
                onChange={ev => {
                  let {value} = ev.target
                  this.onChangeFilter([0], flt => {
                    return {...flt, op: value}
                  })
                }}
              >
                <RadioButton value="and">并且</RadioButton>
                <RadioButton value="or">或者</RadioButton>
              </RadioGroup>
          }
          {
            subFilters.length <= 1
              ? null
              : <span className="mg1l">
                筛选关系
                <Tooltip
                  title={
                    <div>
                      <b>并且</b>表示必须同时满足当前所有筛选条件<br />
                      <b>或者</b>表示满足当前任意一个筛选条件
                    </div>
                  }
                >
                  <Icon
                    type="question-circle-o"
                    className="mg1l"
                  />
                </Tooltip>
              </span>
          }
        </div>
        {interpose(
          (d, idx) => <div className="color-green" key={`sep${idx}`}>{currRootOp === 'or' ? '或者' : '并且'}</div>,
          subFilters.map((flt, idx) => this.renderFilter({...flt, ...flt}, [0, idx]))
        )}
      </div>
    )
  }
  
  render() {
    const { hideModal, onChange, visible } = this.props
    const { queryFilters } = this.state
    return (
      <Modal
        onCancel={hideModal}
        onOk={() => onChange(queryFilters)}
        className="width-50"
        visible={visible}
        getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
      >
        <Form onSubmit={this.onSubmit}>
          <FormItem
            {...formItemLayout}
            label="筛选条件"
          >
            {this.renderParams()}
          </FormItem>
        </Form>
      </Modal>
    )
  }
}
