import React from 'react'
import _ from 'lodash'
import { CloseCircleOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { Col, Button, message, Radio, Row, Tooltip, Popover } from 'antd';
import { Icon } from '@ant-design/compatible'
import SingleDistinct from '../Common/distinct-cascade'
import {convertDateType} from 'common/param-transform'
import {immutateUpdate, compressUrlQuery, insert} from '../../../common/sugo-utils'
import classNames from 'classnames'
import {withBoundaryTime} from '../Fetcher/boundary-time-fetcher'
import moment from 'moment'
import withHoverProps from '../Common/with-hover-props'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import * as d3 from 'd3'
import funnelArrowTall from '../../images/funnel-arrow-tall.png'
import {patchReplace, patchPush} from '../../common/patch-url'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'

const IconWithHoverProps = withHoverProps(Icon)
const ButtonWithHoverProps = withHoverProps(Button)
const z2dFormatter = d3.format('02d')

const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const maxFunnelStepCount = 8

function getScrollContainer() {
  return document.querySelector('.scroll-content')
}

@withBoundaryTime(({datasourceCurrent}) => ({
  dataSourceId: datasourceCurrent && datasourceCurrent.id || '',
  doFetch: !!_.get(datasourceCurrent, 'id'),
  doQueryMinTime: false
}))
export default class FunnelEditingPanel extends React.Component {
  state = {
    isQueryingUsergroup: false,
    visiblePopoverKey: ''
  }

  addOne = (i) => {
    const {isLoadingChartData, updateHashStateByPath} = this.props
    if (isLoadingChartData) return
    updateHashStateByPath(`currFunnel.params.funnelLayers2d[${i}]`, layer => {
      if (layer && /^and$|^or$/.test(layer[0])) {
        return [...layer, []]
      } else {
        return layer ? [['or'], layer, []] : [['or'], [], []]
      }
    })
  }

  deleteOne = (i) => {
    const {isLoadingChartData, updateHashStateByPath} = this.props
    if (isLoadingChartData) return
    updateHashStateByPath('currFunnel.params.funnelLayers2d', layers => (layers || []).filter((l, idx) => i !== idx))
  }

  deleteSubOne = (i, subIndex) => {
    const {isLoadingChartData, updateHashStateByPath} = this.props
    if (isLoadingChartData) return
    updateHashStateByPath(`currFunnel.params.funnelLayers2d[${i}]`, layers => {
      if (layers.length === 3) {
        // 剩下3个时： relation、剩余、待删除
        return layers.filter((l, idx) => subIndex !== idx)[1]
      } else {
        return (layers || []).filter((l, idx) => subIndex !== idx)
      }
    })
  }

  funnelMove = (isUp, i) => {
    const {
      currFunnel: {
        params: {
          funnelLayers2d = []
        }
      },
      isLoadingChartData,
      updateHashStateByPath
    } = this.props

    if (isLoadingChartData) return
    let moveIndex = i + (isUp ? -1 : 1)
    if (moveIndex < 0 || moveIndex >= funnelLayers2d.length) return
    updateHashStateByPath('currFunnel.params.funnelLayers2d', layers => {
      layers = layers || []
      let target = layers[i]
      let moveTo = layers[moveIndex]
      let tem = layers.map((l, index) => {
        if (index === i) return moveTo
        if (index === moveIndex) return target
        return l
      })
      return tem
    })
  }

  setRelation = (i, v) => {
    const {isLoadingChartData, updateHashStateByPath} = this.props
    if (isLoadingChartData) return
    updateHashStateByPath(`currFunnel.params.funnelLayers2d[${i}][0]`, () => [v], true)
  }

  renderLayerExtraFilter = (layerIdx) => {
    let {
      currFunnel,
      updateHashStateByPath,
      projectCurrent
    } = this.props

    let {
      druid_datasource_id,
      params: {
        extraLayerFilters
      } = {}
    } = currFunnel || {}

    let {visiblePopoverKey} = this.state

    let extraLayerFiltersForCurrLayer = _.get(extraLayerFilters, [layerIdx])
    return (
      <Popover
        title={
          [
            <span key="title" className="font16 mg2r">{`第 ${layerIdx + 1} 层漏斗额外筛选`}</span>,
            <CloseCircleOutlined
              key="close"
              className="fright fpointer font18 color-red"
              onClick={() => {
                this.setState({visiblePopoverKey: ''})
              }} />
          ]
        }
        getPopupContainer={null}
        placement="bottom"
        arrowPointAtCenter
        trigger="click"
        visible={visiblePopoverKey === `extraLayerFilters:${layerIdx}`}
        onVisibleChange={_.noop}
        content={(
          <CommonDruidFilterPanel
            key="filters"
            className={`mw460 layer-extra-filter-editor-${layerIdx}`}
            getPopupContainer={() => document.querySelector(`.layer-extra-filter-editor-${layerIdx}`)}
            projectId={projectCurrent && projectCurrent.id}
            timePickerProps={{}}
            dataSourceId={druid_datasource_id}
            headerDomMapper={_.noop}
            filters={extraLayerFiltersForCurrLayer || []}
            onFiltersChange={nextFilters => {
              updateHashStateByPath(`currFunnel.params.extraLayerFilters[${layerIdx}]`, () => nextFilters)
            }}
          />
        )}
      >
        <FilterOutlined
          className={classNames('iblock fpointer font22', {
            'color-blue': !_.isEmpty(extraLayerFiltersForCurrLayer),
            'color-gray': _.isEmpty(extraLayerFiltersForCurrLayer)
          })}
          onClick={() => {
            this.setState({
              visiblePopoverKey: _.startsWith(visiblePopoverKey, 'extraLayerFilters:') ? '' : `extraLayerFilters:${layerIdx}`
            })
          }} />
      </Popover>
    );
  }

  render() {
    let {
      dataSourceDimensions,
      currFunnel,
      style,
      isLoadingChartData,
      className,
      updateHashStateByPath,
      sugoFunnels,
      funnelIdInUrl,
      genInitFunnel,
      maxTime,
      datasourceCurrent
    } = this.props

    let {
      druid_datasource_id,
      params: {
        funnelLayers2d = [],
        commonDimensions = []
      } = {}
    } = currFunnel || {}

    // 按产品要求，始终使用最新的数据源环境配置
    commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || commonDimensions

    let dimDict = _.keyBy(dataSourceDimensions, dbD => dbD.name)

    // 编辑时下拉框的时间范围，按产品要求是要查全量的，但考虑到性能，先查最近 90 天先
    let relativeTime = maxTime ? 'custom' : '-90 days'
    let [finalSince, finalUntil] = maxTime
      ? [moment(maxTime).add(-90, 'days').format(), maxTime]
      : convertDateType(relativeTime)
    return (
      <div className={'pd3x comparableFunnelPanel ' + (className || '')} style={style}>

        {/* 总转化率 + 标题 */}
        <div style={{width: 730}}>
          <div className="alignright mg2b">
            <ButtonWithHoverProps
              type="primary"
              className="width80 mg2r"
              style={{backgroundColor: '#479cdf', border: 'none'}}
              hoverProps={{style: {backgroundColor: '#45a2ff', border: 'none'}}}
              onClick={() => {
                // 重新加载原漏斗，覆盖 hash
                let originalFunnel = funnelIdInUrl === 'new' || _.startsWith(funnelIdInUrl, 'temp_')
                  ? genInitFunnel()
                  : _.find(sugoFunnels, fu => fu.id === funnelIdInUrl)

                let hash = compressUrlQuery(JSON.stringify({
                  vizType: 'funnel',
                  hideLineChartSteps: [],
                  currFunnel: originalFunnel
                }))
                if (funnelIdInUrl === 'new') {
                  patchPush(`/console/funnel/${funnelIdInUrl}#${hash}`)
                } else {
                  patchPush(`/console/funnel/${funnelIdInUrl}/editing#${hash}`)
                }
              }}
            >重置</ButtonWithHoverProps>

            <Button
              className="width80"
              disabled={funnelIdInUrl === 'new' && !_.some(sugoFunnels, fu => fu.druid_datasource_id === datasourceCurrent.id)}
              onClick={() => {
                // 重新加载原漏斗，覆盖 hash
                if (funnelIdInUrl === 'new') {
                  patchPush('/console/funnel')
                  return
                }
                let originalFunnel = _.find(sugoFunnels, fu => fu.id === funnelIdInUrl)

                let hash = compressUrlQuery(JSON.stringify({
                  vizType: 'funnel',
                  hideLineChartSteps: [],
                  currFunnel: originalFunnel
                }))
                patchReplace(`/console/funnel/${funnelIdInUrl}#${hash}`)
              }}
            >取消</Button>
          </div>

          {/* 漏斗层级编辑项 */}
          {funnelLayers2d.map((funnelLayer, i, arr) => {
            const genLayerSubItem = (funnelLayer, subIndex) => {
              if (subIndex === 0) {
                return false
              } else {
                return (
                  <div key={subIndex || 0} className="elli borderr">
                    <div className="itblock" style={{width: 42}}>
                      {subIndex === 1 || _.isUndefined(subIndex) ? (
                        <div
                          className="iblock corner font16 aligncenter color-white line-height32"
                          style={{width: 32, height: 32, backgroundColor: '#6969d7'}}
                        >{z2dFormatter(i + 1)}</div>
                      ) : null}
                    </div>

                    <div
                      className="itblock"
                      style={{width: `calc(100% - ${42 + 36}px)`}}
                    >
                      <Row gutter={8} >
                        {commonDimensions.map((fd, j, arr) => {
                          let otherLayerValues = commonDimensions
                            .map((dimName, i) => i === j ? null : ({col: dimName, val: funnelLayer[i]}))
                            .filter(plv => plv && plv.val)
                          const onChange = val => {
                            if (isLoadingChartData) {
                              message.warning('漏斗数据正在加载，请稍候', 2)
                              return
                            }
                            updateHashStateByPath('currFunnel.params.funnelLayers2d', layers => {
                              if (!layers) {
                                layers = [[], []]
                              }
                              return immutateUpdate(layers, i, layerArr => {
                                if (!layerArr) {
                                  layerArr = []
                                }
                                if (_.isString(layerArr)) {
                                  layerArr = [layerArr]
                                }
                                if (subIndex !== undefined) {
                                  return immutateUpdate(layerArr, [subIndex, j], () => val)
                                }
                                return immutateUpdate(layerArr, j, () => val)
                              })
                            })
                          }
                          let value = _.isArray(funnelLayer) ? funnelLayer[j] || undefined : ''
                          let dbDim = dimDict[fd]
                          return (
                            <Col span={Math.floor(24 / arr.length)} key={j + fd}>
                              {dbDim
                                ? <SingleDistinct
                                  getPopupContainer={getScrollContainer}
                                  dbDim={dbDim}
                                  loadingClassName=" "
                                  doFetch={false}
                                  since={finalSince}
                                  until={finalUntil}
                                  relativeTime={relativeTime}
                                  dataSourceId={druid_datasource_id}
                                  prevLayerValues={otherLayerValues}
                                  value={value}
                                  onChange={onChange}
                                  showSelectAll
                                  showAllowClear={false}
                                  selectAllPrefix="任意"
                                  /> : null}
                            </Col>
                          )
                        })}
                      </Row>
                    </div>

                    <div className="aligncenter itblock" style={{width: 36}}>
                      {
                        0 < subIndex
                          ? (
                            <IconWithHoverProps
                              key="delete"
                              className="pointer font16 color-999"
                              type="close-circle-o"
                              onClick={() => this.deleteSubOne(i, subIndex)}
                              hoverProps={{type: 'close-circle', className: 'fpointer font16 color-red'}}
                            />
                          )
                          : false
                      }
                    </div>
                  </div>
                )
              }
            }
            const genLayerItem = (layerItems) => {
              let isAllSubLayerHasValue = layerItems
                ? _.every(_.drop(funnelLayer, 1), subLayer => !_.isEmpty(subLayer.filter(_.identity)))
                : !_.isEmpty(funnelLayer.filter(_.identity))
              return (
                <div key={i} className={'funnelLayerEditor' + (i === arr.length - 1 ? ' last' : '')}>
                  <FixWidthHelper className="funnel-bubble-box editing animate shadowb-eee until-hover" toFix="last" toFixWidth="150px">
                    {
                      layerItems
                        ? (
                          <Row className="elli">
                            {layerItems.map(genLayerSubItem)}
                            {/*style={{ width:'calc(100% - 14px)', display: 'inline-block' }}*/}
                          </Row>
                        )
                        : genLayerSubItem(funnelLayer)
                    }

                    <div className="elli aligncenter" >
                      {funnelLayerCtrlBtns({
                        onDelete: this.deleteOne,
                        onMove: this.funnelMove,
                        index: i,
                        length: arr.length
                      })}
                      <IconWithHoverProps
                        className={classNames('iblock fpointer font22 color-light-green mg1r', {disabled: !isAllSubLayerHasValue})}
                        type="plus-circle-o"
                        onClick={isAllSubLayerHasValue ? () => this.addOne(i) : undefined}
                        hoverProps={{type: 'plus-circle'}}
                      />
                      {this.renderLayerExtraFilter(i)}
                      {
                        layerItems ? <div>
                          <RadioGroup
                            value={layerItems[0][0]}
                            size="small"
                            onChange={e => this.setRelation(i, e.target.value)}
                          >
                            <RadioButton value="and">并且</RadioButton>
                            <RadioButton value="or">或者</RadioButton>
                          </RadioGroup>
                        </div> : false
                      }
                    </div>

                  </FixWidthHelper>
                  {i === arr.length - 1 ? null :
                    <div className="aligncenter pd1y mg1t">
                      <div className="iblock ignore-mouse relative" >
                        <img src={funnelArrowTall} alt=""/>
                        <span className="color-white center-of-relative">转化率</span>
                      </div>
                    </div>
                  }
                </div>
              )
            }

            // 复合条件
            if (Array.isArray(funnelLayer[0]) && /^and$|^or$/.test(funnelLayer[0][0])) {
              return genLayerItem(funnelLayer)
            } else {
              return genLayerItem()
            }
          })}

          <div className="mg2t">
            <Button
              type="success"
              icon={<PlusOutlined />}
              className="width160"
              disabled={maxFunnelStepCount <= funnelLayers2d.length}
              onClick={() => {
                updateHashStateByPath('currFunnel.params.funnelLayers2d', arr2d => [...arr2d, []])
              }}
            >添加漏斗层级</Button>
          </div>
        </div>
      </div>
    );
  }
}


function funnelLayerCtrlBtns(props) {
  let {onMove, onDelete, index, length} = props
  return [
    0 < index
      ? (
        <Tooltip title="上移" key="move-up">
          <IconWithHoverProps
            className="iblock mg1r fpointer color-blue font22"
            type="up-circle-o"
            onClick={() => onMove(true, index)}
            hoverProps={{type: 'up-circle'}}
          />
        </Tooltip>
      )
      : null,
    index < length - 1
      ? (
        <Tooltip title="下移" key="move-down">
          <IconWithHoverProps
            className="iblock mg1r fpointer color-blue font22"
            type="down-circle-o"
            onClick={() => onMove(false, index)}
            hoverProps={{type: 'down-circle'}}
          />
        </Tooltip>
      )
      : null,
    <Tooltip title="删除" key="delete">
      <IconWithHoverProps
        className="iblock mg1r fpointer font22 color-red"
        type="minus-circle-o"
        onClick={() => onDelete(index)}
        hoverProps={{type: 'minus-circle'}}
      />
    </Tooltip>
  ].filter(_.identity)
}
