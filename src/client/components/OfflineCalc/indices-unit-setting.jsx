import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, message, Select } from 'antd';
import _ from 'lodash'
import HoverHelp from '../Common/hover-help'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {globalConfigSagaModelGenerator} from './saga-model-generators'
import {immutateUpdate} from '../../../common/sugo-utils'
import {GlobalConfigKeyEnum} from '../../../common/constants'

const {Option} = Select

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 }
}

const namespace = 'indices-valid-units'

let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  return {
    ...modelState
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel(globalConfigSagaModelGenerator(namespace, GlobalConfigKeyEnum.OfflineCalcIndicesUnit))
export default class IndicesUnitSetting extends React.Component {
  render() {
    let {globalConfigs, dispatch} = this.props
    let value = _.get(globalConfigs, '[0].value') || ''
    const allUnits = value.split('|').filter(_.identity)
    return (
      <Form
        onSubmit={this.onSubmit}
        className="width600 mg-auto mg3t"
      >
        <Form.Item
          label={<HoverHelp addonBefore="指标单位 " content="直接输入文字，回车分隔" />}
          {...formItemLayout}
        >
          <Select
            mode="tags"
            value={allUnits}
            onChange={vals => {
              dispatch({
                type: `${namespace}/updateState`,
                payload: prevState => {
                  return immutateUpdate(prevState, 'globalConfigs[0]', prev => {
                    return {
                      ...(prev || {}),
                      key: GlobalConfigKeyEnum.OfflineCalcIndicesUnit,
                      value: vals.join('|')
                    }
                  })
                }
              })
            }}
          >
            {allUnits.map( (unit, i) => {
              return (
                <Option key={i} value={unit}>{unit}</Option>
              )
            })}
          </Select>
        </Form.Item>
    
        
        <Form.Item
          label={'\u00a0'}
          colon={false}
          {...formItemLayout}
        >
          <Button
            type="primary"
            htmlType="submit"
            onClick={() => {
              dispatch({
                type: `${namespace}/sync`,
                callback: syncRes => {
                  let {resCreate, resUpdate, resDelete} = syncRes || {}
                  if (_.isEmpty(resCreate) && _.isEmpty(resUpdate) && _.isEmpty(resDelete)) {
                    message.warn('没有修改数据，无须保存')
                    return
                  }
                  if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate)) && _.isEmpty(_.compact(resDelete))) {
                    // 保存报错
                    return
                  }
                  message.success('保存指标单位成功')
                }
              })
            }}
          >保存修改</Button>
        </Form.Item>
      </Form>
    )
  }
}
