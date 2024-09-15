import React from 'react'
import _ from 'lodash'
import { CloseOutlined } from '@ant-design/icons';
import { Select, Button, Switch, message, Card } from 'antd';
import { APP_TYPE } from './constants'

let Option = Select.Option
export default class SettingReportedData extends React.Component {
  constructor(props) {
    super(props)
  }

  deleteData = (index) => {
    const { editEventInfo, changeState } = this.props
    let newEditEventInfo = _.cloneDeep(editEventInfo)
    _.remove(newEditEventInfo.dim_binding, (v, i) => i === index)
    changeState({ editEventInfo: newEditEventInfo })
  }

  onCancel = () => {
    let { editEventInfo, changeState } = this.props
    let newEditEventInfo = _.cloneDeep(editEventInfo)
    newEditEventInfo.dim_binding = _.filter(editEventInfo.dim_binding, p => p.dimension !== '')
    newEditEventInfo.dim_mode = false
    changeState({ editEventInfo: newEditEventInfo })
  }

  onClose = () => {
    let { editEventInfo, changeState } = this.props
    let newEditEventInfo = _.cloneDeep(editEventInfo)
    let checkEvent = _.filter(editEventInfo.dim_binding, p => p.dimension === '')
    if (checkEvent.length) {
      message.error('上报维度必选', 2)
      return false
    } else {
      newEditEventInfo.dim_mode = false
      changeState({ editEventInfo: newEditEventInfo })
    }
  }

  changeDimensions = (index, value) => {
    let { editEventInfo, changeState } = this.props
    let newEditEventInfo = _.cloneDeep(editEventInfo)
    newEditEventInfo.dim_binding[index].dimension = value
    changeState({ editEventInfo: newEditEventInfo })
  }

  changeSimilar = (index, check) => {
    let { editEventInfo, changeState } = this.props
    let newEditEventInfo = _.cloneDeep(editEventInfo)
    newEditEventInfo.dim_binding[index].similar = check
    changeState({ editEventInfo: newEditEventInfo })
  }

  render() {
    let { editEventInfo, dimensions = [] } = this.props
    let bind = _.get(editEventInfo, 'dim_binding', [])
    let dimensionsOptions = dimensions.map(d => {
      return <Option key={`d${d.name}`} value={d.name}>{d.title ? d.title : d.name}</Option>
    })
    return (
      <div className="setting-reported-data">
        <div className="setting-reported-data-content">
          {
            bind.map((v, i) => {
              let dim = v.dimension
              return (
                <Card
                  key={`reporteddataitem${i}`}
                  className="setting-reported-data-item mg1t"
                  bodyStyle={{ padding: '0px' }}
                >
                  <div className="setting-reported-data-itemtitle iblock pd1">
                    <div className="pd1l">
                      <p><b>元素：</b></p>
                      {v.path}
                    </div>
                    <div className="pd1l mg1t">
                      <b>维度：</b>
                      <Select
                        showSearch
                        value={dim}
                        className="width150"
                        onChange={(val) => this.changeDimensions(i, val)}
                        filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                      >
                        <Option key="d" value={''}>请选择</Option>
                        {dimensionsOptions}
                      </Select>
                    </div>
                    {
                      editEventInfo.event_path_type === APP_TYPE.h5 ? (
                        <div className="pd1l mg1t">
                          <span>同类：</span>
                          <Switch
                            checked={v.similar}
                            onChange={(check) => { this.changeSimilar(i, check) }}
                          />
                        </div>
                      )
                        : null
                    }
                  </div>
                  <div className="setting-reported-data-itemdel iblock pd1">
                    <a onClick={() => { this.deleteData(i) }}>
                      <CloseOutlined />
                    </a>
                  </div>
                </Card>
              );
            })
          }
        </div>
        <div className="setting-reported-data-footer fright pd1">
          <Button
            onClick={this.onClose}
            className="mg2r"
          >保存</Button>
          <Button
            onClick={this.onCancel}
          >取消</Button>
        </div>
      </div>
    );
  }
}

