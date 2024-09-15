import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Divider, Select, Radio, Tooltip } from 'antd';
import _ from 'lodash'
import DimensionFilter from './dimension-filters'
import { dimsType } from './model'
import TagFilterEditor from '../Usergroup/tag-filter-editor'
import { immutateUpdate } from '~/src/common/sugo-utils'
import FilterItemDimension from '../Usergroup/filter-item-dimension'

const FormItem = Form.Item
const RadioButton = Radio.Button
const RadioGroup = Radio.Group
const { Option } = Select
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

export default class DatasourceSelect extends Component {

  state = {
    tagDsId: {},
    tradeDsId: {},
    behaviorDsId: {}
  }

  renderFilters = (filters = []) => {
    const { changeState, content } = this.props
    return (
      <div className="filters">
        {filters.map((filter, index) => {
          let props = {
            ...this.props,
            filter,
            index
          }
          return (<FilterItemDimension
            {...props}
            key={index + '@meaf'}
            modifier={({ usergroup }) => {
              changeState({ content: immutateUpdate(content, 'datasets.tag_filters', () => _.get(usergroup, 'params.dimension', {})) })
            }}
                  />)
        })}
      </div>
    )
  }

  addFilter = () => {
    let { changeState, content } = this.props
    let filter = {
      relation: 'and',
      filters: [{
        dimension: '',
        action: 'in',
        value: [],
        actionType: 'str'
      }]
    }
    changeState({ content: immutateUpdate(content, 'datasets.trade_filters', (arr = []) => [...arr, filter]) })
  }

  renderAddBtn = disabled => {
    return disabled
      ? null
      : <div className="add-button-wrap">
        <span
          className="pointer"
          onClick={this.addFilter}
          title="增加一个条件"
        >
          <PlusCircleOutlined className="mg1r" />
          增加一个条件
        </span>
      </div>;
  }

  render() {
    const { datasourceCurrent, content = {}, projectList = [], usergroup, tagProjects, actionProjects, getDimensions, changeState, tagDimensions, transactionDimensions, actionDimensions } = this.props
    const { getFieldDecorator, getFieldValue } = this.props.form
    const opts = {
      modifier: changeState,
      formItemLayout,
      content: _.isEmpty(content) ? { datasets: {} } : content
    }
    const behaviorProjectId = getFieldValue('datasets.behavior_datasource_id')
    const tradeProjectId = getFieldValue('datasets.trade_datasource_id')
    const behaviorDs = behaviorProjectId ? projectList.find(p => p.id === behaviorProjectId) : {}
    const tradeDs = tradeProjectId ? projectList.find(p => p.id === tradeProjectId) : {}
    return (
      <div>
        <Divider orientation="left">模型数据集</Divider>
        <div>
          <div className="width20 borderr iblock">用户</div>
          <div style={{ width: 'calc( 100% - 20px )' }} className="iblock">
            <FormItem
              label={<span>
                数据项目
                <Tooltip title="设置模型所需的用户数据集，必须，通常为标签数据项目">
                  <QuestionCircleOutlined />
                </Tooltip>
              </span>}
              className="mg1b"
              hasFeedback
              {...formItemLayout}
            >
              {getFieldDecorator('datasets.tag_datasource_id', {
                rules: [{
                  required: true, message: '数据项目必选!'
                }],
                initialValue: _.get(content, 'datasets.tag_datasource_id', '')
              })(
                <Select
                  className="width200"
                  onChange={v => {
                    getDimensions({ type: dimsType.tag, datasourceId: v })
                  }}
                >
                  {tagProjects.map(p => <Option key={`db-option2-${p.id}`} value={p.id}>{p.name}</Option>)}
                </Select>
              )}
            </FormItem>
            <FormItem label="筛选条件" className="mg1b"  {...formItemLayout}>
              <TagFilterEditor
                tagProject={_.first(tagProjects)}
                usergroup={{ params: { tagFilters: _.get(content, 'datasets.tag_filters') } }}
                onUsergroupChange={nextUg => {
                  let nextConfig = _.pick(nextUg.params, ['tagFilters'])
                  changeState({ content: immutateUpdate(content, 'datasets.tag_filters', () => nextConfig.tagFilters) })
                }}
              />
            </FormItem>
          </div>

        </div>
        <div>
          <div className="width20 borderr iblock">用户交易</div>
          <div style={{ width: 'calc( 100% - 20px )' }} className="iblock">
            <FormItem
              label={<span>
                数据项目
                <Tooltip title="设置模型所需的用户交易数据集，必须，通常为事件数据项目">
                  <QuestionCircleOutlined />
                </Tooltip>
              </span>}
              className="mg1b"
              hasFeedback
              {...formItemLayout}
            >
              {getFieldDecorator('datasets.trade_datasource_id', {
                rules: [{
                  required: true, message: '数据项目必选!'
                }],
                initialValue: _.get(content, 'datasets.trade_datasource_id', '')
              })(
                <Select className="width200" onChange={v => getDimensions({ type: dimsType.trade, datasourceId: v })}>
                  {actionProjects.map(p => <Option key={`db-option2-${p.id}`} value={p.id}>{p.name}</Option>)}
                </Select>
              )}
            </FormItem>
            <FormItem label="筛选条件" className="mg1b"  {...formItemLayout}>
              <DimensionFilter datasourceCurrent={{ id: _.get(tradeDs, 'datasource_id') }}  {...opts} basePath={'datasets.trade_filters'} dimensions={transactionDimensions} />
              {/* <div className="relation-set">
                  <RadioGroup
                    value={ _.get(content, 'datasets.trade_filters.relation', 'and')}
                    onChange={this.setRelation}
                  >
                    <RadioButton value="and">并且</RadioButton>
                    <RadioButton value="or">或者</RadioButton>
                  </RadioGroup>
                </div>
                {this.renderFilters(_.get(content, 'datasets.trade_filters'))}
                {this.renderAddBtn(false)} */}
            </FormItem>
          </div>
        </div>
        {
          _.get(content, 'type') === 1
            ? (<div>
              <div className="width20 borderr iblock">用户行为</div>
              <div style={{ width: 'calc( 100% - 20px )' }} className="iblock">
                <FormItem
                  label={<span>
                    数据项目
                    <Tooltip title="设置模型所需的用户行为数据集，非必须，通常为事件数据项目">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </span>}
                  className="mg1b"
                  hasFeedback
                  {...formItemLayout}
                >
                  {getFieldDecorator('datasets.behavior_datasource_id', {
                    initialValue: _.get(content, 'datasets.behavior_datasource_id', '')
                  })(
                    <Select className="width200" onChange={v => getDimensions({ type: dimsType.behavior, datasourceId: v })}>
                      {actionProjects.map(p => <Option key={`db-option2-${p.id}`} value={p.id}>{p.name}</Option>)}
                    </Select>
                  )}
                </FormItem>
                <FormItem label="筛选条件" className="mg1b"  {...formItemLayout}>
                  <DimensionFilter datasourceCurrent={{ id: _.get(behaviorDs, 'datasource_id') }} {...opts} basePath={'datasets.behavior_filters'} dimensions={actionDimensions} />
                </FormItem>
              </div>
            </div>)
            : null
        }
      </div>
    );
  }
}
