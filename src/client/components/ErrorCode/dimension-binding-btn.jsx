/**
 * 将错误码绑定到 druid 维度上
 * 数据记录在 dimension 表的 params 里的 bindToErrorCode，值枚举见 ErrorCodeBindingTypeEnum
 * 例如南航的 sys_id， params: { bindToErrorCode: 'systemCode' }
 */
import React from 'react'
import {synchronizer} from '../Fetcher/synchronizer'
import _ from 'lodash'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Button, Popover, Select, message } from 'antd';
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import {ErrorCodeBindingTypeEnum} from '../../../common/constants'
import {immutateUpdate} from '../../../common/sugo-utils'
import {isCharDimension} from '../../../common/druid-column-type'
import {enableSelectSearch} from '../../common/antd-freq-use-props'

const {Option} = Select

export default class DimensionBindingBtn extends React.Component {
  state = {
    visiblePopoverKey: ''
  }

  renderDimensionBinder = synchronizer(_.identity)(syncer => {
    let {visiblePopoverKey} = this.state
    let {dims, modifyDims, syncDims, isSyncingDims} = syncer

    let systemCodeDim = _.find(dims, dbDim => dbDim.params && dbDim.params.bindToErrorCode === ErrorCodeBindingTypeEnum.SystemCode)
    let moduleCodeDim = _.find(dims, dbDim => dbDim.params && dbDim.params.bindToErrorCode === ErrorCodeBindingTypeEnum.ModuleCode)
    let interfaceCodeDim = _.find(dims, dbDim => dbDim.params && dbDim.params.bindToErrorCode === ErrorCodeBindingTypeEnum.InterfaceCode)
    let errorCodeDim = _.find(dims, dbDim => dbDim.params && dbDim.params.bindToErrorCode === ErrorCodeBindingTypeEnum.ErrorCode)

    let domDefs = [
      {label: '系统码：', value: _.get(systemCodeDim, 'name'), type: ErrorCodeBindingTypeEnum.SystemCode},
      {label: '模块码：', value: _.get(moduleCodeDim, 'name'), type: ErrorCodeBindingTypeEnum.ModuleCode},
      {label: '接口码：', value: _.get(interfaceCodeDim, 'name'), type: ErrorCodeBindingTypeEnum.InterfaceCode},
      {label: '错误码：', value: _.get(errorCodeDim, 'name'), type: ErrorCodeBindingTypeEnum.ErrorCode}
    ]
    return (
      <Popover
        title={
          [
            <span key="title" className="font14 mg2r">关联维度</span>,
            <CloseCircleOutlined
              key="close"
              className="fright fpointer font14 color-red"
              onClick={() => {
                this.setState({visiblePopoverKey: ''})
              }} />
          ]
        }
        placement="bottom"
        arrowPointAtCenter
        trigger="click"
        visible={visiblePopoverKey === 'monitorCondFilter'}
        onVisibleChange={_.noop}
        content={(
          <div>
            <div className="font12 mg2b">关联维度后，维度的筛选选项会使用对应的错误码字段</div>
            {domDefs.map((def, idx) => {
              let {label, value, type} = def

              let dimsToExcludeSet = new Set(domDefs.filter((v, i) => i !== idx).map(d => d.value).filter(_.identity))
              return (
                <FixWidthHelper
                  toFix="first"
                  toFixWidth="80px"
                  className="mg1b"
                  wrapperClassFirst="font12"
                >
                  <div className="line-height32">{label}</div>
                  <Select
                    {...enableSelectSearch}
                    allowClear
                    className="width-100"
                    value={value}
                    placeholder="关联至..."
                    onChange={dimName => {
                      modifyDims('', arr => {
                        if (value) {
                          let prevIdx = _.findIndex(arr, {name: value})
                          arr = immutateUpdate(arr, [prevIdx, 'params'], params => _.omit(params, 'bindToErrorCode'))
                        }
                        if (!dimName) {
                          return arr
                        }
                        let currIdx = _.findIndex(arr, {name: dimName})
                        return immutateUpdate(arr, [currIdx, 'params', 'bindToErrorCode'], () => type)
                      })
                    }}
                  >
                    {dims.filter(d => !dimsToExcludeSet.has(d.name)).map(dbDim => {
                      return (
                        <Option key={dbDim.id} value={dbDim.name}>{dbDim.title || dbDim.name}</Option>
                      )
                    })}
                  </Select>
                </FixWidthHelper>
              )
            })}

            <div className="aligncenter">
              <Button
                type="primary"
                className="mg2t"
                onClick={async () => {
                  let {resUpdate} = await syncDims()
                  if (_.get(resUpdate, '[0].result')) {
                    message.success('保存成功')
                  }
                }}
              >保存</Button>
            </div>
          </div>
        )}
      >
        <Button
          className="mg2l"
          loading={isSyncingDims}
          onClick={() => {
            this.setState({
              visiblePopoverKey: visiblePopoverKey === 'monitorCondFilter' ? '' : 'monitorCondFilter'
            })
          }}
        >关联维度</Button>
      </Popover>
    );
  })

  render() {
    let {projectCurrent} = this.props

    return this.renderDimensionBinder({
      url: method => {
        let dict = {
          GET: `get/${projectCurrent && projectCurrent.datasource_id}`,
          PUT: 'update'
        }
        return `/app/dimension/${dict[method]}`
      },
      modelName: 'dims',
      doFetch: !!projectCurrent,
      resultExtractor: data => data && data.data.filter(isCharDimension) || []
    })
  }
}
