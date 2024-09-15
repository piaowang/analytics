/**
 * create by xujun at 2020/07/10
 * 高级圈选关联控件值上报
 */

import _ from 'lodash'
import { CloseOutlined } from '@ant-design/icons'
import { Select, Button, Switch, message, Card } from 'antd'
import { immutateUpdate } from '~/src/common/sugo-utils'
import PropTypes from 'prop-types'

let Option = Select.Option
export default function SettingReportedData(props) {
  const {
    editEventDimBinding = [],
    setEventDimBinding,
    dimensions,
    isH5Event,
    closeSetEventBinding,
    cancelSetEventBinding
  } = props

  const deleteData = (index) => {
    setEventDimBinding(editEventDimBinding.filter((p, i) => i !== index))
  }

  const onCancel = () => {
    cancelSetEventBinding()
  }

  const onClose = () => {
    let checkEvent = _.some(editEventDimBinding, p => p.dimension === '')
    if (checkEvent) {
      return message.error('上报维度必选', 2)
    }
    closeSetEventBinding()
  }

  const changeDimensions = (index, value) => {
    const newDimBinding = immutateUpdate(editEventDimBinding, `[${index}].dimension`, () => value)
    setEventDimBinding(newDimBinding)
  }

  const changeSimilar = (index, check) => {
    const newDimBinding = immutateUpdate(editEventDimBinding, `[${index}].similar`, () => check)
    setEventDimBinding(newDimBinding)
  }

  return (
    <div className="setting-reported-data">
      <div className="setting-reported-data-content">
        {
          editEventDimBinding.map((v, i) => {
            let dim = v.dimension
            return (
              <Card
                key={`reporteddataitem${i}`}
                className="setting-reported-data-item mg1t"
                bodyStyle={{ padding: '0px' }}
              >
                <div className="setting-reported-data-itemtitle iblock pd1">
                  <div className="pd1l">
                    <p><b>元素：</b></p>{v.path || v.sugo_autotrack_path}
                  </div>
                  <div className="pd1l mg1t">
                    <b>维度：</b>
                    <Select
                      showSearch
                      value={dim}
                      className="width150"
                      onChange={(val) => changeDimensions(i, val)}
                      filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                    >
                      <Option key="d" value={''}>请选择</Option>
                      {
                        dimensions.map(d => {
                          return <Option key={`d${d.name}`} value={d.name}>{d.title ? d.title : d.name}</Option>
                        })
                      }
                    </Select>
                  </div>
                  {

                    isH5Event && (
                      <div className="pd1l mg1t">
                        <span>同类：</span>
                        <Switch
                          checked={v.similar}
                          onChange={(check) => changeSimilar(i, check)}
                        />
                      </div>
                    )
                  }
                </div>
                <div className="setting-reported-data-itemdel iblock pd1">
                  <a onClick={() => deleteData(i)}>
                    <CloseOutlined />
                  </a>
                </div>
              </Card>
            )
          })
        }
      </div>
      <div className="setting-reported-data-footer fright pd1">
        <Button onClick={onClose} className="mg2r">保存</Button>
        <Button onClick={onCancel}>取消</Button>
      </div>
    </div>
  )
}

SettingReportedData.prototype = {
  editEventDimBinding: PropTypes.array.isRequired, // 已设置的圈选属性
  setEventDimBinding: PropTypes.func.isRequired, // 设置控件隐藏属性上报
  dimensions: PropTypes.array.isRequired, // 维度信息集合
  isH5Event: PropTypes.bool.isRequired, // 是否是h5 组件
  closeSetEventBinding: PropTypes.func.isRequired,
  cancelSetEventBinding: PropTypes.func.isRequired
}
