import React from 'react'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { InputNumber, Select } from 'antd';
import classnames from 'classnames'
import {immutateUpdate, immutateUpdates} from '../../../common/sugo-utils'
import _ from 'lodash'
import FixWidthHelperNoHidden from '../Common/fix-width-helper-no-hidden'
import {MetricRulesAlarmLevelEnum, MetricRulesAlarmLevelTranslation} from '../../../common/constants'

/**
 * 监控告警--设定告警目标--告警规则选择控件
 * @export
 * @class AlarmTimeInput
 * @extends {React.Component}
 */
export default class AlarmRuleInput extends React.Component {

  renderRuleUI(rule, idx) {
    let {operator, threshold, thresholdEnd, level} = rule
    const { size, onChange, value } = this.props
    let rangeVisible = operator === 'between' || operator === 'exclude'
    return (
      <div className="mg1b" key={idx}>
        <Select
          className="mg2r"
          value={operator}
          onChange={(v) => {
            if (v !== 'between' && v !== 'exclude') {
              onChange(immutateUpdates(value,
                ['rules', idx, 'operator'], () => v,
                ['rules', idx, 'thresholdEnd'], () => null))
            } else {
              onChange(immutateUpdate(value, ['rules', idx, 'operator'], () => v))
            }
          }}
          style={{ width: '90px' }}
        >
          <Select.Option key="greaterThan" value="greaterThan">&gt;</Select.Option>
          <Select.Option key="lessThan" value="lessThan">&lt;</Select.Option>
          <Select.Option key="between" value="between">介于</Select.Option>
          <Select.Option key="exclude" value="exclude">排除</Select.Option>
        </Select>
        <InputNumber
          className="iblock"
          type="text"
          size={size}
          value={threshold}
          onChange={(v) => {
            onChange(immutateUpdate(value, ['rules', idx, 'threshold'], () => v))
          }}
          style={{ width: '80px', marginRight: rangeVisible ? '0' : '16px'}}
        />
        <span className={classnames({'hide': !rangeVisible})}>
          <span> ~ </span>
          <InputNumber
            type="text"
            size={size}
            value={thresholdEnd}
            onChange={(v) => {
              onChange(immutateUpdate(value, ['rules', idx, 'thresholdEnd'], () => v))
            }}
            style={{ width: '80px'}}
          />
        </span>
        <Select
          className="iblock mg1r"
          value={level || 'warning'}
          onChange={(v) => {
            onChange(immutateUpdate(value, ['rules', idx, 'level'], () => v))
          }}
          style={{ width: '80px' }}
        >
          {_.keys(MetricRulesAlarmLevelEnum).map(level => {
            return (
              <Select.Option key={level} value={level}>{MetricRulesAlarmLevelTranslation[level]}</Select.Option>
            )
          })}
        </Select>
        <MinusCircleOutlined
          className={classnames('color-grey font16 pointer line-height32 hover-color-red width0', {hide: _.size(value.rules) === 1})}
          onClick={() => onChange(immutateUpdate(value, ['rules'], prev => prev.filter((r, idx0) => idx0 !== idx)))} />
      </div>
    );
  }

  render() {
    const { measures = [], value, onChange } = this.props
    const { metric, rules } = value
    return (
      <div className="pd2 bg-white border corner">
        <FixWidthHelperNoHidden
          toFix="first"
          toFixWidth="215px"
        >
          <span>
            <span className="mg2r">检测</span>
            <Select
              value={metric}
              className="mg2r width-70"
              onChange={val => {
                onChange({...value, metric: val})
              }}
            >
              <Select.Option key="none" value="">请选择指标</Select.Option>
              {measures.map(m => <Select.Option key={m.id} value={m.name}>{m.title}</Select.Option>)}
            </Select>
          </span>
          {(rules || []).map((rule, idx) => this.renderRuleUI(rule, idx))}
        </FixWidthHelperNoHidden>

        <FixWidthHelperNoHidden
          toFix="first"
          toFixWidth="215px"
          className={classnames({hide: 3 <= _.size(rules)})}
        >
          {'\u00a0'}
          <a
            className="pointer"
            onClick={() => {
              onChange(immutateUpdate(value, ['rules', _.size(rules)], () => ({operator: 'greaterThan', threshold: 0})))
            }}
          >
            <PlusCircleOutlined /> 增加告警级别
          </a>
        </FixWidthHelperNoHidden>
      </div>
    );
  }
}
