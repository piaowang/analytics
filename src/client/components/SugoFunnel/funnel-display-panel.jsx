import React from 'react'
import _ from 'lodash'
import { CloseOutlined, FilterOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Col, Row, Tooltip } from 'antd';
import FunnelViz from './funnel-viz'
import LineViz from './line-viz'
import {extractTotalData} from './data-transform'
import funnelArrowShort from '../../images/funnel-arrow-short.png'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import * as d3 from 'd3'
import {interpose} from '../../../common/sugo-utils'
import classNames from 'classnames'
import fillParentHeight from '../Common/fill-parent-height'
import {convertDateType, defaultFormat, isRelative} from '../../../common/param-transform'
import moment from 'moment/moment'
import {DruidColumnTypeInverted} from '../../../common/druid-column-type'
import PubSub from 'pubsub-js'
import AsyncTaskRunner from '../Common/async-task-runner'
import PropTypes from 'prop-types'

const ColAutoFillParentHeight = fillParentHeight(Col)

const z2dFormatter = d3.format('02d')

let truncateOption = {length: 10}
const truncate = str => _.truncate(str, truncateOption)

export default class FunnelDisplayPanel extends React.Component {
  static propTypes = {
  }
  
  static defaultProps = {
  }
  
  genFilterPreviewStr = filters => {
    let {dimNameDict} = this.props

    return (filters || []).map(flt => {
      let {col, op, eq} = flt
      let dbDim = _.get(dimNameDict, col)

      if (!dbDim) {
        return null
      }
      let dimTitle = dbDim.title || col
      let not = _.startsWith(op, 'not ') ? '不' : ''
      if (_.endsWith(op, 'nullOrEmpty')) {
        return `${dimTitle} ${not}为空`
      } else if (op === 'lookupin') {
        throw new Error('Not support lookup usergroup here')
      } else if (DruidColumnTypeInverted[dbDim.type] === 'number') {
        if (_.isEmpty(eq)) {
          return null
        }
        let [from, to] = eq.map(v => isFinite(v) && v !== null ? +v : '不限')
        return `${dimTitle} ${not}介于 ${from} 至 ${to}`
      } else if (DruidColumnTypeInverted[dbDim.type] === 'date') {
        let relativeTime = isRelative(eq) ? eq : 'custom'
        let [since, until] = relativeTime === 'custom'
          ? eq.map(dateStr => moment(dateStr).format(defaultFormat()))
          : convertDateType(relativeTime, undefined, 'tool')

        return `${dimTitle} ${not}介于 ${since} 至 ${until}`
        //fix:选择含有和不含有的情况下报错，因为 _.endsWith(op, 'in') 条件包含不了 含有和不含有的情况
      } else if (_.endsWith(op, 'in') || _.endsWith(op, 'equal') ||_.endsWith(op, 'ins')) {
        if (!_.isArray(eq)) {
          eq = [eq]
        }
        return `${dimTitle} ${not}包含 ${eq.join('，')}`
      } else {
        throw new Error(`Unknown op: ${op}`)
      }
    }).filter(_.identity).join(' 且 ')
  }

  render() {
    let {
      funnelCompareGroupName,
      currFunnel: {
        params: {
          funnelLayers2d = [],
          compareType,
          compareByDimension,
          extraLayerFilters
        }
      },
      vizType,
      isComparing,
      hideLineChartSteps,
      onLineChartStepToggle,
      style,
      onCancelComparing,
      isLoadingChartData,
      className,
      funnelTotalData,
      funnelDataAfterGroupBy,
      currFunnel,
      showLeavingUserInspectBtn
    } = this.props

    if (!compareType) {
      compareType = 'dimensions'
    }
    let funnelStatisticData = funnelCompareGroupName === '总体'
      ? extractTotalData(funnelTotalData, funnelLayers2d.length)
      : extractTotalData(funnelDataAfterGroupBy[funnelCompareGroupName], funnelLayers2d.length)

    let isFunnel = vizType === 'funnel'

    // 总转化率百分比字符串
    const transferPercent = _.get(funnelStatisticData, funnelStatisticData.length - 1, 0) / _.get(funnelStatisticData, 0, 0)
    const totalTranserPercent = isNaN(transferPercent) ? '0%' : (100 * transferPercent).toFixed(1) + '%'
    return (
      <div
        className={classNames('comparableFunnelPanel border corner shadowb-eee until-hover pd2x bg-white', className, {mg3x: !isComparing})}
        style={style}
      >
        <Row gutter={28}>
          <Col span={isComparing ? 12 : 8} className="aligncenter">
            {/* 总转化率 + 标题 */}
            <Tooltip title={`${funnelCompareGroupName}总转化率: ${totalTranserPercent}`}>
              <div className="font12 elli">
                <span className="pd1b iblock mw160 elli font14 color-grey" >
                  {funnelCompareGroupName}
                </span>
                <span className="pd1b iblock font14 color-grey">总转化率</span>
                <p className="height24">{totalTranserPercent}</p>
                <b className="mg1l font13 absolute right0 top0">
                  {onCancelComparing
                    ? <CloseOutlined title="删除" className="cancelComparing" onClick={onCancelComparing} />
                    : null}
                </b>
              </div>
            </Tooltip>
  
            {funnelLayers2d.map((funnelLayer, i, arr) => {
              //记录数量
              let countRec = _.get(funnelStatisticData, i, '--')
    
              //比例
              let transferPercent = _.get(funnelStatisticData, i + 1, 0) / _.get(funnelStatisticData, i, 0)
              transferPercent = isNaN(transferPercent) ? '0%' : (100 * transferPercent).toFixed(1) + '%'
    
              let layerFilters0 = _.get(extraLayerFilters, [i])
              let extraFilterPreviewStr = this.genFilterPreviewStr(layerFilters0)
              let tagDoms = [
                <div
                  key="layerNum"
                  className="iblock corner font14 aligncenter color-white line-height25"
                  style={{width: 24, height: 24, backgroundColor: '#6969d7'}}
                >{z2dFormatter(i + 1)}</div>,
                _.isArray(funnelLayer[0]) ? (
                  <div
                    key="subLayerRelation"
                    className="iblock corner font14 aligncenter color-white mg1l line-height25"
                    style={{width: 24, height: 24, backgroundColor: '#96cafd'}}
                  >{funnelLayer[0][0] === 'and' ? '且' : '或'}</div>
                ) : null,
                extraFilterPreviewStr ? (
                  <Tooltip
                    key="extraFilters"
                    title={extraFilterPreviewStr}
                  >
                    <div
                      className="iblock corner font14 aligncenter color-white mg1l line-height25"
                      style={{width: 24, height: 24, backgroundColor: '#96cafd'}}
                    >
                      <FilterOutlined />
                    </div>
                  </Tooltip>
                ) : null
              ].filter(_.identity)
    
              const genLayerSubItem = (subLayer, subIndex) => {
                return (
                  <FixWidthHelper
                    key={subIndex || 0}
                    className="elli"
                    toFix="first"
                    toFixWidth={`${_.size(tagDoms) * 30}px`}
                  >
                    <div className="line-height26 alignleft" style={{marginTop: '3px'}}>
                      {subIndex === 0 ? tagDoms : null}
                    </div>
          
                    {_.isEmpty(subLayer.filter(_.identity))
                      ? (
                        <div
                          style={{ borderTop: 1 < subIndex ? '#aaa 1px solid' : undefined }}
                          className="borderr aligncenter bold elli font14"
                        >
                          <span>任意行为</span>
                        </div>
                      ) : (
                        <div className="aligncenter bold elli borderr font14">
                          {
                            interpose((v, idx) => <span key={idx} className="mg1x">/</span>, subLayer.filter(_.identity)
                              .map((f, k, arr) => {
                                if (arr.length === 1) {
                                  return (
                                    <Tooltip title={f} key={'too' + k}>{f}</Tooltip>
                                  )
                                }
                                return (
                                  <Tooltip title={f} key={'too' + k}>{truncate(f)}</Tooltip>
                                )
                              }))
                          }
                        </div>
                      )}
                  </FixWidthHelper>
                )
              }
    
              const genLayerItem = (layerItems) => (
                <div key={i} className={'funnelLayerEditor' + (i === arr.length - 1 ? ' last' : '')}>
                  <FixWidthHelper
                    className="funnel-bubble-box relative bg-white"
                    toFix="last"
                    toFixWidth="100px"
                  >
                    { layerItems ? _.drop(layerItems, 1).map(genLayerSubItem) : genLayerSubItem(funnelLayer, 0) }
          
                    <AsyncTaskRunner
                      args={[]}
                      doRun={false}
                      task={async (ev) => {
                        ev.stopPropagation()
                        ev.preventDefault()
                        await new Promise(resolve => {
                          PubSub.publish('sugoFunnel.onShowFunnelUser', {
                            layerIdx: i,
                            funnelCompareGroupName: funnelCompareGroupName,
                            dom: ev.target,
                            done: resolve
                          })
                        })
                      }}
                    >
                      {({isRunning, run}) => {
                        return (
                          <div
                            className="elli aligncenter vertical-center-of-relative width100 color-main pointer"
                            onClick={ev => run([ev])}
                            data-layer={i}
                          >
                            <Tooltip title={'用户数：' + countRec}>
                              <LegacyIcon type={isRunning ? 'loading' : 'user'}/>
                              {countRec}
                            </Tooltip>
                          </div>
                        );
                      }}
                    </AsyncTaskRunner>
                  </FixWidthHelper>
        
                  {i === arr.length - 1 ? null :
                    <div className="aligncenter">
                      <div className="relative pd1y mg1t">
                        <img src={funnelArrowShort} alt=""/>
                        <div className="pd1b center-of-relative font14">
                          转化率 {transferPercent}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              )
    
              // 复合条件
              if (Array.isArray(funnelLayer[0]) && /^and$|^or$/.test(funnelLayer[0][0])) {
                return genLayerItem(funnelLayer)
              } else {
                return genLayerItem()
              }
            })}
          </Col>

          {/* 图表 */}
          <ColAutoFillParentHeight
            span={isComparing ? 12 : 16}
            style={{paddingTop: '62px'}}
            doMeasure={!isLoadingChartData}
          >
            {
              isFunnel
                ? (
                  <FunnelViz
                    {...{
                      funnelStatisticData, isLoadingChartData, currFunnel, funnelLayers2d, showLeavingUserInspectBtn
                    }}
                    onInspectLeavingUser={(step, ev) => {
                      // 目前只在场景分析里用到
                      let stepNumber = step * 1
                      PubSub.publishSync('sugoFunnel.onShowLostUser', {
                        lossBeforeStepIdx: stepNumber,
                        tabActiveKey: funnelCompareGroupName,
                        dom: ev.target
                      })
                    }}
                  />
                )
                : (
                  <LineViz
                    hideSteps={hideLineChartSteps || []}
                    {...{
                      currFunnel, funnelTotalData, funnelDataAfterGroupBy, funnelCompareGroupName, isLoadingChartData,
                      onLineChartStepToggle, isComparing
                    }}
                  />
                )
            }
          </ColAutoFillParentHeight>
        </Row>
      </div>
    );
  }
}
