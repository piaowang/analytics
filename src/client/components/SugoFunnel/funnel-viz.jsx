/**
 * Created by heganjie on 16/9/1.
 */
import React from 'react'
import _ from 'lodash'
import { UserAddOutlined } from '@ant-design/icons';
import { Progress, Spin, Button, Popover } from 'antd';
import PubSub from 'pubsub-js'


export default class FunnelViz extends React.Component {

  state = {}

  render() {
    let {
      funnelLayers2d,
      funnelStatisticData,
      isLoadingChartData,
      showLeavingUserInspectBtn,
      onInspectLeavingUser
    } = this.props

    return (
      <Spin spinning={isLoadingChartData}>
        <div className="funnelViz">
          {funnelLayers2d.map((lArr, i) => {
            let maxPercent = i <= 1 ? 100 : 100 * _.get(funnelStatisticData, i - 1, 0) / _.get(funnelStatisticData, 0, 0)
            let percent = 0
            if (i === 0) {
              percent = Number(_.get(funnelStatisticData, i, 0)) !== 0 ? 100 : 0
            }
            let prevCount = _.get(funnelStatisticData, i - 1, 0)
            let transferPercent = 100 * _.get(funnelStatisticData, i, 0) / prevCount
            percent = isNaN(transferPercent) ? 0 : transferPercent
            percent = percent > 100 ? 100 : percent

            let progress = (
              <Progress
                strokeWidth={32}
                percent={percent}
                showInfo={false}
              />
            )

            const gapHeight = 52
            return (
              <div
                key={i}
                className="relative"
                style={{
                  width: `${isNaN(maxPercent) ? 0 : maxPercent}%`,
                  // 进度条需要居中显示，如果有多个二级条件的话，顶部边距为 (条件数 - 1) / 2 单位
                  paddingTop: `${_.isArray(lArr[0]) ? (lArr.length - 2) / 2 * 30 : 0}px`,
                  paddingBottom: i !== funnelLayers2d.length - 1
                    ? `${_.isArray(lArr[0]) ? (lArr.length - 2) / 2 * 30 + gapHeight : gapHeight}px`
                    : '10px' // last one
                }}
              >
                {progress}
                {!showLeavingUserInspectBtn || percent === 100 || prevCount === 0 ? null : (
                  <UserAddOutlined
                    className="absolute font24 color-main fpointer"
                    style={{top: '4px', right: '8px'}}
                    onClick={ev => onInspectLeavingUser && onInspectLeavingUser(i, ev)} />
                )}
              </div>
            );
          })}
        </div>
      </Spin>
    );
  }
}
