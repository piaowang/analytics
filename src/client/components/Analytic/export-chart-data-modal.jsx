import React from 'react'
import {Button, Modal, Select} from 'antd'
import _ from 'lodash'
import {getDownloadLimit} from '../../common/constans'
import SliceChartFacade from '../Slice/slice-chart-facade'
import {vizTypeHintMap} from '../../constants/viz-component-map'
import {sliceTableChart} from '../Charts/TableChart/chart-data-table'
import PubSub from 'pubsub-js'
import {immutateUpdate} from '../../../common/sugo-utils'

export default class ExportChartDataModal extends React.Component {
  state = {
    isDownloading: false,
    firstDimensionLimit: undefined,
    chartDataFromDataDisplayPanel: {}
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!prevProps.modalVisible && this.props.modalVisible) {
      PubSub.publishSync('analytic.get-chart-data', chartDataFromDataDisplayPanel => {
        this.setState({chartDataFromDataDisplayPanel})
      })
    } else if (prevProps.modalVisible && !this.props.modalVisible) {
      this.setState({firstDimensionLimit: undefined, chartDataFromDataDisplayPanel: {}})
    }
  }
  
  render() {
    let { modalVisible, onModalVisibleChange } = this.props
    let {isDownloading, firstDimensionLimit, chartDataFromDataDisplayPanel} = this.state

    let chartSlice = chartDataFromDataDisplayPanel.chartSlice
    let dimensionExtraSettingDict = _.get(chartSlice, 'params.dimensionExtraSettingDict')
    let firstDimension = _.get(chartSlice, 'params.dimensions[0]')
    let originalLimit = _.get(dimensionExtraSettingDict, `['${firstDimension}'].limit`)

    let druidData, total, tempSlice

    if (_.isNumber(firstDimensionLimit) && firstDimensionLimit !== originalLimit) {
      tempSlice = firstDimension
        ? immutateUpdate(chartSlice, `params.dimensionExtraSettingDict['${firstDimension}'].limit`, () => firstDimensionLimit)
        : chartSlice
    } else {
      druidData = chartDataFromDataDisplayPanel.druidData
      total = chartDataFromDataDisplayPanel.total
      tempSlice = _.isEmpty(druidData) && _.isEmpty(total) ? null : chartSlice
    }

    return (
      <Modal
        title={_.isNumber(firstDimensionLimit) && firstDimensionLimit !== originalLimit
          ? `查看当前图表数据（第一维度显示数量变更为 ${firstDimensionLimit}）`
          : '查看当前图表数据'}
        width="90%"
        style={{top: 20}}
        visible={modalVisible}
        onCancel={() => onModalVisibleChange(false)}
        footer={[
          <Button
            key="back"
            type="ghost"
            size="large"
            onClick={() => onModalVisibleChange(false)}
          >关闭</Button>,
          <Button
            key="downloadBtn"
            type="primary"
            size="large"
            loading={isDownloading}
            onClick={() => PubSub.publish('analytic.chart-data-table-export')}
          >下载</Button>
        ]}
      >
        <div className="fix pd2b">
          <div className="fleft">
            <span className="iblock"> 第一维度显示数量:</span>
            <Select
              dropdownMatchSelectWidth={false}
              key="firstDimensionLimit"
              value={_.isNumber(firstDimensionLimit) ? `${firstDimensionLimit}` : originalLimit}
              className="mg1l width100 iblock"
              onChange={val => this.setState({firstDimensionLimit: val * 1})}
              placeholder="默认数量"
            >
              {getDownloadLimit().map(l => {
                return (
                  <Select.Option key={l} value={`${l}`}>{l}</Select.Option>
                )
              })}
            </Select>
          </div>
        </div>
        <div className="height500">
          <SliceChartFacade
            wrapperClassName="height-100"
            style={{height: '100%'}}
            slice={modalVisible ? tempSlice : null}
            isThumbnail={false}
            vizTypeHintMap={vizTypeHintMap}
            componentVizTypeMap={tempSlice && {[tempSlice.params.vizType]: sliceTableChart}}
            onLoadingStateChange={isFetching => {
              this.setState({isDownloading: isFetching})
            }}
            // 传入这两项的话，图表就不会加载数据，而使用这个数据
            druidData={druidData}
            total={total}
          />
        </div>
      </Modal>
    )
  }
}
