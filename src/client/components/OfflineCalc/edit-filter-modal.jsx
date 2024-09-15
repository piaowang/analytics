import React from 'react'
import Icon from '../Common/sugo-icon'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, Button, Radio, Select, Tooltip, Row, Col } from 'antd';
import _ from 'lodash'
import { immutateUpdate, interpose } from '../../../common/sugo-utils'
import { bindActionCreators } from 'redux'
import * as roleActions from '../../actions/roles'
import { connect } from 'react-redux'
import { FilterOpNameMap } from './display-filter-panel'

const RadioButton = Radio.Button
const RadioGroup = Radio.Group
const { Option } = Select
const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 18 }
}
let mapStateToProps = state => _.pick(state.common, 'roles')
let mapDispatchToProps = dispatch => bindActionCreators(roleActions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class ModelFilterPanel extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      queryFilters: {},
      fields: []
    }
  }

  componentDidMount() {
    let queryFilters = _.get(this.props, 'filters') || []
    if (_.isEmpty(queryFilters) || !_.get(queryFilters, 'filters.length', 0)) {
      queryFilters = { relation: 'and', filters: [{ relation: 'and', filters: [{ table: '', col: '', op: 'equal', eq: '' }] }] }
    }
    this.setState({ queryFilters })
  }

  addFilter = () => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    queryFilters.filters.push({ relation: 'and', filters: [{ table: '', col: '', op: 'equal', eq: '' }] })
    this.setState({ queryFilters })
  }

  onChangeRelation = e => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    queryFilters.relation = e.target.value
    this.setState({ queryFilters })
  }

  onChangeFilterCol = (idx, i, val) => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    _.set(queryFilters, ['filters', idx, 'filters', i, 'col'], val)
    this.setState({ queryFilters })
  }

  onChangeFilterTable = (idx, i, val) => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    _.set(queryFilters, ['filters', idx, 'filters', i, 'table'], val)
    this.setState({ queryFilters })
  }

  onChangeFilterOp = (idx, i, val) => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    _.set(queryFilters, ['filters', idx, 'filters', i, 'op'], val)
    this.setState({ queryFilters })
  }

  onChangeFilterEq = (idx, i, val) => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    _.set(queryFilters, ['filters', idx, 'filters', i, 'eq'], val)
    this.setState({ queryFilters })
  }

  onDeleteSubFilter = (idx, i) => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    let filters = _.get(queryFilters, ['filters', idx, 'filters'], [])
    if (filters.length === 1) {
      _.pullAt(queryFilters.filters, [idx])
    } else {
      _.pullAt(filters, [i])
      _.remove(queryFilters, ['filters', idx, 'filters'], filters)
    }
    this.setState({ queryFilters })
  }

  renderFilter = (idx, i, filter) => {
    let { tables } = this.props
    const tableInfo = tables.find(p => p.id === filter.table)
    const fields = _.get(tableInfo, 'fields', [])
    return (
      <div className="tag-group-filter pd1b " key={`${idx}_${i}_tgf`}>
        <Row>
          <Col span={6} className="pd1x">
            <Select
              className="iblock"
              placeholder="请选择表"
              value={filter.table}
              onChange={(val) => this.onChangeFilterTable(idx, i, val)}
            >
              {
                tables.map((p, j) => {
                  return <Option title={p.title || p.name} key={`filed_${idx}_${i}_${j}`} value={p.id}>{p.title || p.name}</Option>
                })
              }
            </Select>
          </Col>
          <Col span={6} className="pd1x">
            <Select
              className="iblock"
              placeholder="请选择列"
              value={filter.col}
              onChange={(val) => this.onChangeFilterCol(idx, i, val)}
            >
              {
                fields.map((p, j) => {
                  return <Option title={`${p.field}:${p.type}`} key={`filed_${idx}_${i}_${j}`} value={p.field}>{p.field}:{p.type}</Option>
                })
              }
            </Select>
          </Col>
          <Col span={5} className="pd1x">

            <Select
              className="iblock"
              value={filter.op}
              placeholder="请选择"
              onChange={val => this.onChangeFilterOp(idx, i, val)}
            >
              {
                _.keys(FilterOpNameMap).map((p, j) => {
                  return <Option key={`op_${idx}_${i}_${j}`} value={p}>{FilterOpNameMap[p]}</Option>
                })
              }
            </Select>
          </Col>
          <Col span={6} className="pd1x">
            <Input className="iblock" value={filter.eq} onChange={ev => this.onChangeFilterEq(idx, i, ev.target.value)} />
          </Col>
          <Col>
            <Tooltip
              title="移除"
            >
              <Icon
                type="close-circle-o"
                className="iblock mg1l pointer"
                onClick={() => {
                  this.onDeleteSubFilter(idx, i)
                }}
              />
            </Tooltip>
          </Col>
        </Row>
      </div>
    )
  }

  addSubFilter = (idx) => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    const val = _.get(queryFilters, ['filters', idx, 'filters'], [])
    if (val.length === 0) {
      _.set(queryFilters, ['filters', idx, 'relation'], 'and')
    }
    val.push({ col: '', op: '', eq: '' })
    _.set(queryFilters, ['filters', idx, 'filters'], val)
    this.setState({ queryFilters })
  }

  onChangeSubRelation = (idx, val) => {
    let { queryFilters } = this.state
    queryFilters = _.cloneDeep(queryFilters)
    _.set(queryFilters, ['filters', idx, 'relation'], val)
    this.setState({ queryFilters })
  }

  renderSubFilterGroup = (filter, idx) => {
    let { relation, filters = [] } = filter
    return (
      <div className="mg1b pd1y pd2l" style={{ border: '1px dashed #aaa' }} key={idx}>
        <span
          className="pointer mg3r iblock"
          onClick={() => this.addSubFilter(idx)}
        >
          <Icon type="plus-circle-o" className="mg1r" />
          添加条件
        </span>
        {
          filters.length <= 1
            ? null
            : <RadioGroup
              value={relation}
              size="small"
              onChange={ev => this.onChangeSubRelation(idx, ev.target.value)}
              >
              <Radio value="and">并且</Radio>
              <Radio value="or">或者</Radio>
            </RadioGroup>
        }

        {filters.map((flt, i) => this.renderFilter(idx, i, flt))}
      </div>
    )
  }

  renderParams() {
    let { relation = 'and', filters = [] } = this.state.queryFilters
    return (
      <div className="tag-group-filters">
        <div className="pd1b">
          <div className="pd1y iblock mg2r font14">
            <span
              className="pointer"
              onClick={this.addFilter}
            >
              <Icon type="plus-circle-o" className="mg1r" />
              添加条件组合
            </span>
          </div>
          {
            filters.length <= 1
              ? null
              : <RadioGroup
                value={relation}
                onChange={this.onChangeRelation}
                >
                <RadioButton value="and">并且</RadioButton>
                <RadioButton value="or">或者</RadioButton>
              </RadioGroup>
          }
          {
            filters.length <= 1
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
          (d, idx) => <div className="color-green" key={`sep${idx}`}>{relation === 'or' ? '或者' : '并且'}</div>,
          filters.map((flt, idx) => this.renderSubFilterGroup(flt, idx)))}
      </div>
    )
  }

  render() {
    const { hideModal, onChange } = this.props
    const { queryFilters } = this.state
    return (
      <Modal onCancel={hideModal} onOk={() => onChange(queryFilters)} className="width-50" visible>
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
