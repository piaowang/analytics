import React, { Component } from 'react'
import PropTypes from 'prop-types'
import DatasourceSelect from './datasource-select'
import DimensionSetting from './dimension-setting'
import ModelParams from './model-params'
import ModelCalc from './model-calc'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Card, Modal } from 'antd';
import MarketingEditModel, { namespace } from './model'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import { connect } from 'react-redux'
import { AccessDataType } from '../../../common/constants'
import { validateFieldsAndScroll } from '../../common/decorators'
import _ from 'lodash'
import { pickProps, rfmProps, userValueProps, lifeCycleProps } from './constants'
import { immutateUpdate } from '~/src/common/sugo-utils'
import moment from 'moment'


@withRuntimeSagaModel(MarketingEditModel)
@connect(props => props[namespace])
@Form.create()
@validateFieldsAndScroll
export default class edit extends Component {

  changeState = (params) => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  getDimensions = ({ type, datasourceId }) => {
    const { projectList } = this.props
    const project = projectList.find(p => p.id === datasourceId) || {}

    this.props.dispatch({
      type: `${namespace}/getDimensions`,
      payload: { type, datasourceId: project.datasource_id }
    })
  }

  submit = async (projectId) => {
    const { content, projectList, hide } = this.props
    let info = await this.validateFieldsAndScroll()
    if (info && projectId) {
      let pickItems = []
      if (content.type === 0) {
        pickItems = _.concat(pickProps, rfmProps)
      } else if (content.type === 1) {
        pickItems = _.concat(pickProps, lifeCycleProps)
        const interval = _.get(info, 'params.interval', 30)
        const interval1 = moment().add(-(interval), 'd').startOf('d')
        const interval2 = moment().add(-(_.toNumber(interval) * 2), 'd').startOf('d')
        const now = moment().endOf('d')
        const intervalConfig = [
          { stageId: 1, name: '引入期', historyAccRange: { max: 0, min: 0 }, intervalStart: interval1, intervalEnd: now },
          { stageId: 2, name: '发展期', stageAccRange: { min: 1 }, historyAccRange: { max: 2, min: 1 }, intervalStart: interval1, intervalEnd: now },
          { stageId: 3, name: '成熟期', stageAccRange: { min: 1 }, historyAccRange: { min: 3 }, intervalStart: interval1, intervalEnd: now },
          { stageId: 4, name: '衰退期', stageAccRange: { max: 0, min: 0 }, historyAccRange: { min: 1 }, intervalStart: interval1, intervalEnd: now },
          { stageId: 5, name: '流失期', stageAccRange: { max: 0, min: 0 }, historyAccRange: { min: 1 }, intervalStart: interval2, intervalEnd: now }
        ]
        _.set(info, 'params.stages', intervalConfig.map((p, i) => ({ ...p, name: _.get(info, `params.stages.${i}`, p.name) })))
      } else {
        pickItems = _.concat(pickProps, userValueProps)
      }
      _.forEach(pickItems, p => {
        _.set(info, p.key, _.get(content, p.key, p.defaultValue))
      })

      if (info.datasets.tag_datasource_id) {
        info.datasets.tag_datasource_name = projectList.find(p => p.id === info.datasets.tag_datasource_id).datasource_name
      }
      if (info.datasets.trade_datasource_id) {
        info.datasets.trade_datasource_name = projectList.find(p => p.id === info.datasets.trade_datasource_id).datasource_name
      }
      if (info.datasets.behavior_datasource_id) {
        info.datasets.behavior_datasource_name = projectList.find(p => p.id === info.datasets.behavior_datasource_id).datasource_name
      }
      if (info.params.time_filter) {
        info = immutateUpdate(info, 'params', val => {
          const [start, end] = val.time_filter
          return {
            ..._.omit(val, ['time_filter']),
            historyStart: moment(start).startOf('d').format('YYYY-MM-DD'),
            historyEnd: moment(end).endOf('d').format('YYYY-MM-DD')
          }
        })
      }
      if (_.get(info, 'timers.autoCalc', 0) === 1 && _.isEmpty(_.get(info, 'timers.cronInfo'))) {
        info.timers.cronInfo = { 'unitType': '0', 'selectedPeriod': 'hour', 'cronExpression': '0 * * * *', 'hourValue': null, 'selectedHourOption': { 'minute': '0' }, 'selectedDayOption': { 'hour': '0', 'minute': '0' }, 'selectedWeekOption': { 'day': '1', 'hour': '0', 'minute': '0' }, 'selectedMonthOption': { 'day': '1', 'hour': '0', 'minute': '0' }, 'selectedYearOption': { 'month': '1', 'day': '1', 'hour': '0', 'minute': '0' }, 'selectedIntervalOption': { 'hour': '0', 'minute': 0, 'startHour': 0 }, 'taskStartTime': '2020-02-12 11:17:28', 'period': 'hour', 'option': { 'minute': '0', 'hour': '0', 'day': '1', 'month': '1' } }
      }

      this.props.dispatch({
        type: `${namespace}/save`,
        payload: { info: { ...info, projectId } },
        callback: hide
      })
    }
  }

  render() {
    const { visible, hide, datasourceCurrent, projectList, projectCurrent, content = {}, tagDimensions, transactionDimensions, actionDimensions, loading } = this.props
    const tagProjects = projectCurrent.access_type === AccessDataType.Tag ? [projectCurrent] : projectList.filter(p => p.datasource_name === projectCurrent.tag_datasource_name)
    const actionProjects = projectList.filter(p => p.tag_datasource_name === _.get(tagProjects, '0.datasource_name', '') && p.access_type !== AccessDataType.Tag)
    return (
      <Modal
        visible={visible}
        width={'70%'}
        onOk={() => this.submit(_.get(tagProjects, '0.id', ''))}
        onCancel={hide}
        title="模型设置"
      >
        <Form>
          <DatasourceSelect
            form={this.props.form}
            tagProjects={tagProjects}
            actionProjects={actionProjects}
            content={content || {}}
            tagDimensions={tagDimensions}
            transactionDimensions={transactionDimensions}
            actionDimensions={actionDimensions}
            getDimensions={this.getDimensions}
            changeState={this.changeState}
            datasourceCurrent={datasourceCurrent}
            projectList={projectList}
          />
          <DimensionSetting
            content={content || {}}
            form={this.props.form}
            tagDimensions={tagDimensions}
            transactionDimensions={transactionDimensions}
            actionDimensions={actionDimensions}
            changeState={this.changeState}
          />
          <ModelParams form={this.props.form} content={content || {}} changeState={this.changeState} />
          <ModelCalc form={this.props.form} content={content || {}} changeState={this.changeState} />
        </Form>
      </Modal>
    )
  }
}
