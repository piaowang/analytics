import React from 'react'
import {Input, Select, Radio, Modal, Button, Tooltip} from 'antd'
import HorizontalSplitHelper from '../../components/Common/horizontal-split-helper'
import SliceChartFacade from '../Slice/slice-chart-facade'
import _ from 'lodash'
import Alert from '../Common/alert'
import {vizTypeChartComponentMap, vizTypeNameMap} from '../../constants/viz-component-map'
import {withSlices} from '../Fetcher/slices-fetcher'
import {immutateUpdate} from '../../../common/sugo-utils'
import {withDataSources} from '../Fetcher/data-source-fetcher'

class SlicePicker extends React.Component {
  state = {
    sliceTypeFilter: null,
    selectedSliceId: null,
    autoReloadIntervalOverwrite: null,
    searching: null,
    selectedDataSourceId: null
  }

  componentWillMount() {
    this.loadValue(this.props.value)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.visible && !_.isEqual(nextProps.value, this.props.value)) {
      this.loadValue(nextProps.value)
    }
    if (!nextProps.visible) {
      this.setState({
        sliceTypeFilter: null,
        selectedSliceId: null,
        autoReloadIntervalOverwrite: null,
        searching: null
      })
    }
  }

  loadValue(value) {
    if (_.isObject(value)) {
      this.setState({
        selectedSliceId: value.sliceId,
        autoReloadIntervalOverwrite: value.autoReloadIntervalOverwrite
      })
    } else {
      this.setState({selectedSliceId: value})
    }
  }

  onIntervalSet = (val) => {
    this.setState({autoReloadIntervalOverwrite: val * 1})
  }

  onSelectDataSource = selectedDataSourceId => {
    this.setState({
      selectedDataSourceId
    })
  }

  render() {
    let {visible, onSliceSelected, onVisibleChange, slices, isFetchingSlices, dataSources} = this.props
    let {selectedSliceId, sliceTypeFilter, searching, autoReloadIntervalOverwrite, selectedDataSourceId} = this.state

    const radioStyle = {
      display: 'block',
      height: '30px',
      lineHeight: '30px',
      display: 'inline-block',
      width: '30px'
    }

    let selectedSlice = selectedSliceId && _.find(slices, sl => sl.id === selectedSliceId)
    if (_.isNumber(autoReloadIntervalOverwrite)) {
      selectedSlice = immutateUpdate(selectedSlice, 'params.autoReloadInterval', () => autoReloadIntervalOverwrite)
    }

    let modalFooter = [
      <Button
        key="back"
        type="ghost"
        size="large"
        onClick={() => onVisibleChange(false)}
      >取消</Button>,
      <Button
        key="submit"
        type="primary"
        size="large"
        disabled={!selectedSliceId}
        loading={isFetchingSlices}
        onClick={() => {
          if (_.isNumber(autoReloadIntervalOverwrite)) {
            onSliceSelected({
              sliceId: selectedSliceId,
              autoReloadIntervalOverwrite
            })
          } else {
            onSliceSelected(selectedSliceId)
          }
          onVisibleChange(false)
          PubSub.publishSync('livescreen.component.sliceHasSet')
        }}
      >确认</Button>
    ]

    const sliceTypeSelector = (
      <Select
        key="types"
        showSearch
        className="width100"
        placeholder="图表类型"
        optionFilterProp="children"
        onChange={val => this.setState({sliceTypeFilter: val})}
        allowClear
        value={sliceTypeFilter || undefined}
      >
        {Object.keys(vizTypeChartComponentMap).map(k => {
          return (
            <Select.Option key={`vc_${k}`} value={k}>{vizTypeNameMap[k]}</Select.Option>
          )
        })}
      </Select>
    )

    const sliceProjectSelector = (
      <Select
        key="projects"
        value={selectedDataSourceId || undefined}
        size="default"
        className="width100"
        notFoundContent="没有内容"
        placeholder="所属项目"
        dropdownMatchSelectWidth={false}
        onSelect={this.onSelectDataSource}
      >
        {dataSources.map(op => {
          return (
            <Select.Option
              key={`ds_${op.id}`}
              value={op.id}
            >
              {op.title || op.name}
            </Select.Option>
          )
        })}
      </Select>
    )

    const searchAfter = [
      sliceProjectSelector,
      sliceTypeSelector
    ]

    let filteredSlices = slices || []
    if (sliceTypeFilter) {
      filteredSlices = filteredSlices.filter(s => s.params.vizType === sliceTypeFilter)
    }
    if (selectedDataSourceId) {
      filteredSlices = filteredSlices.filter(s => s.druid_datasource_id === selectedDataSourceId)
    }
    if (searching) {
      let pa = new RegExp(searching)
      filteredSlices = filteredSlices.filter(s => pa.test(s.slice_name))
    }

    return (
      <Modal
        title="单图选择框"
        visible={visible}
        onCancel={() => onVisibleChange(false)}
        width="60%"
        className="live-screen-slice-pick"
        footer={modalFooter}
        getContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
      >
        <Input
          addonBefore="搜索："
          addonAfter={searchAfter}
          value={searching}
          onChange={ev => this.setState({searching: ev.target.value})}
        />
        <HorizontalSplitHelper
          style={{height: '300px'}}
          collapseWidth={50}
          isAdjustable={false}
        >
          <div
            defaultWeight={1}
            className="height-100"
          >
            {/*{isFetchingSlices || filteredSlices.length ? null : <div className="ant-radio-group height-100 overscroll-y">没有记录</div>}*/}
            <Radio.Group
              onChange={ev => {
                this.setState({
                  selectedSliceId: ev.target.value,
                  autoReloadIntervalOverwrite: null
                })
              }}
              value={selectedSliceId}
              className="height-100 width-100 overscroll-y"
            >
              {isFetchingSlices || filteredSlices.length ? filteredSlices.map((sl, idx) => {
                return (
                  <div key={idx}>
                    <Radio
                      style={radioStyle}
                      className="iblock"
                      key={`rd_${sl.id}`}
                      value={sl.id}
                    /> 
                    <Tooltip title={sl.slice_name}>
                      <div className=" iblock width100 elli">{sl.slice_name}</div>
                    </Tooltip>
                  </div>
                )
              }) : <div style={{ minWidth: 200 }}>无记录</div>}
            </Radio.Group>
          </div>

          <div
            defaultWeight={3}
            className="height-100 pd1"
          >
            {!selectedSlice
              ? <Alert msg="未选择单图"/>
              : (
                <SliceChartFacade
                  wrapperStyle={{height: '100%'}}
                  style={{height: '100%'}}
                  slice={selectedSlice}
                  enableAutoReload
                />
              )}
          </div>
        </HorizontalSplitHelper>
      </Modal>
    )
  }
}

let Wrapped = (() => {
  let WithDataSources = withDataSources(SlicePicker, () => ({ includeChild: true }))
  let WithSlices = withSlices(WithDataSources, props => ({doFetch: props.visible}))
  return WithSlices
})()

export default Wrapped
