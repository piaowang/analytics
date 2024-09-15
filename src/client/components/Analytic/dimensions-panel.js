import React from 'react'
import PropTypes from 'prop-types'
import FixWidthHelper from '../../components/Common/fix-width-helper-no-hidden'
import { Menu, Popover, Tooltip, message } from 'antd'
import _ from 'lodash'
import {
  isTimeDimension,
  isTextDimension,
  DruidColumnTypeIcon,
  isStringDimension,
  isFloatDimension,
  isUserTagGroupDimension,
  isCalcDimension,
  isGroupDimension,
  isCastDimension
} from '../../../common/druid-column-type'
import * as PubSub from 'pubsub-js'
import Fetch from '../../common/fetch-final'
import { isEqualWithFunc, groupBy, immutateUpdate, dictBy } from '../../../common/sugo-utils'
import CustomOrderList from './custom-order-list'
import classNames from 'classnames'
import HighLightString from '../Common/highlight-string'
import showPopover from '../../components/Common/free-popover'
import { withCommonFilterDec } from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import Alert from '../Common/alert'
import Icon, { Button2 } from '../Common/sugo-icon'
import withHoverProps from '../Common/with-hover-props'
import HoverHelp from '../Common/hover-help'
import helpLinkMap from 'common/help-link-map'
import DruidColumnType from '../../../common/druid-column-type'
import { DimensionParamsTypes } from '../../../common/dimension-params-type'
import setStatePromiseDec from '../../common/set-state-promise'
import { isBusinessDimension } from 'common/druid-column-type'
import moment from 'moment'
import Timer from 'client/components/Common/timer'
import { ContextNameEnum, withContextConsumer } from '../../common/context-helper'
import { AccessDataType } from '../../../common/constants'
import { Anchor } from '../Common/anchor-custom'
const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/analytic#dimension']
let Button = withHoverProps(Button2)

const DimensionPanelStateEnum = {
  Normal: 0,
  Searching: 1,
  Ordering: 2
}

let willCheckEqualsProps = ['dataSourceDimensions']

const valTypeTags = [
  { id: '_valTypeTag_string', name: 'String 类型维度', predicate: isStringDimension },
  { id: '_valTypeTag_text', name: 'Text 类型维度', predicate: isTextDimension },
  { id: '_valTypeTag_time', name: 'DateTime 类型维度', predicate: isTimeDimension },
  { id: '_valTypeTag_int', name: 'Int 类型维度', predicate: dbDim => dbDim.type === DruidColumnType.Int },
  { id: '_valTypeTag_long', name: 'Long 类型维度', predicate: dbDim => dbDim.type === DruidColumnType.Long },
  { id: '_valTypeTag_float', name: 'Float 类型维度', predicate: isFloatDimension }
]

const valTypeTagsPredDict = dictBy(
  valTypeTags,
  t => t.id,
  t => t.predicate
)

const dimTypeTags = [
  { id: '_dimTypeTag_calc', name: '计算维度', predicate: isCalcDimension },
  { id: '_dimTypeTag_group', name: '分组维度', predicate: isGroupDimension },
  { id: '_dimTypeTag_cast', name: '类型转换维度', predicate: isCastDimension }
]
const dimTypeTagsPredDict = dictBy(
  dimTypeTags,
  t => t.id,
  t => t.predicate
)

@withCommonFilterDec(true)
@setStatePromiseDec
export default class DimensionPanel extends React.Component {
  static propTypes = {
    dataSourceDimensions: PropTypes.array.isRequired,
    orders: PropTypes.array,
    tags: PropTypes.array,
    style: PropTypes.object
  }

  static defaultProps = {
    dataSourceDimensions: []
  }

  state = {
    panelState: DimensionPanelStateEnum.Normal,
    isSavingCustomOrders: false,
    singleSelectTagsMode: false
  }

  componentDidMount() {
    PubSub.subscribe('analytic.onMetricsPanelSettingOrder', async (msg, callback) => {
      if (this.state.panelState === DimensionPanelStateEnum.Ordering) {
        await this.toggleSettingDimOrder()
      }
      this.setState({ panelState: DimensionPanelStateEnum.Normal }, callback)
    })
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!isEqualWithFunc(_.pick(this.props, willCheckEqualsProps), _.pick(prevProps, willCheckEqualsProps))) {
      this.setState({
        panelState: DimensionPanelStateEnum.Searching,
        isSavingCustomOrders: false
      })
      this.props.setCommonFilterState({
        searching: '',
        selectedGroupKey: null
      })
    }

    // 强制分组单选
    if (prevState.singleSelectTagsMode && this.props.selectedGroupKey && 1 < this.props.selectedGroupKey.length) {
      this.props.setCurrentGroupKey(_.takeRight(this.props.selectedGroupKey, 1))
    }
  }

  getPanelName() {
    let { projectCurrent } = this.props
    return projectCurrent.access_type !== AccessDataType.Tag ? '维度' : '标签'
  }

  componentWillUnmount() {
    PubSub.unsubscribe('analytic.onMetricsPanelSettingOrder')
  }

  async updateCustomOrders(nextOrders) {
    let { dataSourceId } = this.props
    await Fetch.post(`/app/custom-orders/update/${dataSourceId}`, { dimensions_order: nextOrders })
    // TODO final fetch 报错后不应该执行下面这句？
    PubSub.publish('analytic.panels.customOrdersInvalid')
    this.setState({ isSavingCustomOrders: false })
  }

  displayShortcut(dom, dbDim) {
    let dimName = dbDim.name,
      cleanUp
    let dimensionClickShortcut = (
      <div className='width100'>
        <Button
          hoverProps={{ type: 'primary' }}
          className='width-100 mg1b'
          icon='sugo-filter'
          onClick={() => {
            PubSub.publish('analytic.onDropToFilter', dimName)
            cleanUp()
          }}
        >
          筛选
        </Button>
        <Button
          hoverProps={{ type: 'primary' }}
          className='width-100 mg1b'
          icon='sugo-dimension'
          onClick={() => {
            PubSub.publish('analytic.onDropToDimension', dimName)
            cleanUp()
          }}
        >
          维度
        </Button>
        <Button
          hoverProps={{ type: 'primary' }}
          className='width-100 mg1b'
          icon='sugo-nail'
          onClick={() => {
            PubSub.publish('analytic.onDropToDing', dimName)
            cleanUp()
          }}
        >
          钉
        </Button>
        <Button
          hoverProps={{ type: 'primary' }}
          disabled={isTimeDimension(dbDim)}
          className='width-100'
          icon='sugo-measure'
          onClick={() => {
            PubSub.publish('analytic.onDropToMetric', dimName)
            cleanUp()
          }}
        >
          指标
        </Button>
      </div>
    )
    cleanUp = showPopover(dom, dimensionClickShortcut, {
      placement: 'right',
      overlayClassName: 'dimension-popover-shortcut'
    })
  }

  renderTagsPopupContent = (options, type) => {
    let optionsHasTags = options.filter(op => op.tags && op.tags.length)

    let tagsExt = _.flatMap(optionsHasTags, op => op.tags || [])
    let opCountByTagId = groupBy(tagsExt, _.identity, arr => arr.length)
    let { checkableTag: CheckableTag, tags, tagsLayer, visiblePopoverKey } = this.props
    let { mode } = this.state
    let valTypeCountDict = options.reduce((acc, curr) => {
      let t = _.find(valTypeTags, t => t.predicate(curr))
      if (t) {
        acc[t.id] = (acc[t.id] || 0) + 1
      }
      return acc
    }, {})

    let dimTypeCountDict = options.reduce((acc, curr) => {
      let t = _.find(dimTypeTags, t => t.predicate(curr))
      if (t) {
        acc[t.id] = (acc[t.id] || 0) + 1
      }
      return acc
    }, {})

    if (!tags) {
      tags = []
    }

    if (!tagsLayer) {
      tagsLayer = []
    }
    tags = type === 'layer' ? tagsLayer : tags

    return (
      <div>
        {!tags[0] ? <div className='color-grey aligncenter pd2y'>未为此项目设置{this.getPanelName()}分组</div> : null}

        {tags.map(t => {
          return (
            <CheckableTag key={t.id} className='block elli' title={t.name} uncheckedClass='border' tagId={t.id} style={{ margin: '4px 0 4px' }}>
              {opCountByTagId[t.id] ? `${t.name}(${opCountByTagId[t.id]})` : t.name}
            </CheckableTag>
          )
        })}

        {visiblePopoverKey === 'dimension-tag-layer-popover' || mode === 'layer' ? null : (
          <React.Fragment>
            <div
              className={classNames('pd1l', {
                mg2y: tags[0],
                'mg1t mg2b': !tags[0],
                hide: _.isEmpty(valTypeCountDict) && _.isEmpty(dimTypeCountDict)
              })}
              style={{ borderLeft: '2px solid #6969d7' }}
            >
              类型分组
            </div>

            {valTypeTags
              .filter(t => 0 < valTypeCountDict[t.id])
              .map(t => {
                return (
                  <CheckableTag key={t.id} className='block elli' title={t.name} uncheckedClass='border' tagId={t.id} style={{ margin: '4px 0 4px' }}>{`${t.name}(${
                    valTypeCountDict[t.id]
                  })`}</CheckableTag>
                )
              })}

            {dimTypeTags
              .filter(t => 0 < dimTypeCountDict[t.id])
              .map(t => {
                return (
                  <CheckableTag key={t.id} className='block elli' title={t.name} uncheckedClass='border' tagId={t.id} style={{ margin: '4px 0 4px' }}>{`${t.name}(${
                    dimTypeCountDict[t.id]
                  })`}</CheckableTag>
                )
              })}
          </React.Fragment>
        )}
      </div>
    )
  }

  renderNoPermissionHint() {
    let { className, style } = this.props
    return (
      <div className={classNames('bg-white corner', className)} style={style}>
        <Alert msg='请检查该项目维度是否授权或隐藏，请到[数据管理->数据维度]授权维度,或[排查和隐藏]开放维度。' />
      </div>
    )
  }

  genFinalOption(dataSourceDimensions, orders, fixedAtTop) {
    let finalOptions = dataSourceDimensions
    if (!orders) {
      orders = []
    }

    // 使用自定义排序（正常的为 name, 隐藏的为 hide:name）不出现在排序里面的要显示出来
    let dimDict = _.keyBy(dataSourceDimensions, dim => dim.name)

    let fixedAtTopSet = new Set(fixedAtTop)
    let notInOrderNames = _.difference(
      _.keys(dimDict).filter(dimName => !fixedAtTopSet.has(dimName)),
      orders.map(o => (_.startsWith(o, 'hide:') ? o.substr(5) : o))
    )

    let visibleDimensionNames = notInOrderNames.concat(orders.filter(o => !_.startsWith(o, 'hide:')))
    finalOptions = fixedAtTop
      .concat(visibleDimensionNames)
      .map(name => dimDict[name])
      .filter(_.identity)
    return finalOptions
  }

  onDragStart = ev => {
    let dimName = ev.target.getAttribute('data-dim-name')
    ev.dataTransfer.setData('text', `维度:${dimName}`)
  }

  onDimensionItemClick = ev => {
    let { dataSourceDimensions } = this.props
    let dom = ev.currentTarget
    let dimName = dom.getAttribute('data-dim-name')
    let dbDim = _.find(dataSourceDimensions, dbDim => dbDim.name === dimName)
    this.displayShortcut(dom, dbDim)
  }

  toggleSettingDimOrder = async () => {
    let { orders } = this.props
    let { panelState } = this.state

    if (panelState !== DimensionPanelStateEnum.Ordering) {
      // 启用排序，通知指标的排序功能关闭，因为同时启用两个排序组件会报错
      PubSub.publishSync('analytic.onDimensionsPanelSettingOrder', () => {
        this.setState({ panelState: DimensionPanelStateEnum.Ordering })
        PubSub.publish('analytic.onVisiblePopoverKeyChange', null)
      })
      return
    }

    // 关闭排序，保存排序信息
    let nextOrder = this._customOrderList.generateNextOrders()
    if (_.isEqual(nextOrder, orders)) {
      await this.setStatePromise({
        panelState: DimensionPanelStateEnum.Searching
      })
    } else {
      await this.setStatePromise({
        panelState: DimensionPanelStateEnum.Searching,
        isSavingCustomOrders: true
      })
      await this.updateCustomOrders(nextOrder)
    }
  }

  render() {
    let {
      dataSourceDimensions,
      style,
      className, //isFetchingDataSourceCustomOrders,
      orders,
      isFetchingDataSourceDimensions,
      keywordInput: SearchingInput,
      searching,
      selectedGroupKey,
      setCurrentGroupKey,
      visiblePopoverKey,
      mainTimeDimName,
      dimensionLayer
    } = this.props
    let { panelState, singleSelectTagsMode, mode } = this.state
    if (!isFetchingDataSourceDimensions && !dataSourceDimensions.length) {
      return this.renderNoPermissionHint()
    }

    let finalOptions = dataSourceDimensions
    if (panelState === DimensionPanelStateEnum.Searching) {
      let ops = this.genFinalOption(dataSourceDimensions, orders, [mainTimeDimName])
      finalOptions = searching ? ops.filter(op => smartSearch(searching, op.title || op.name)) : ops
    } else if (panelState === DimensionPanelStateEnum.Normal) {
      finalOptions = this.genFinalOption(dataSourceDimensions, orders, [mainTimeDimName])
    }

    // 根据分组/分层进行筛选
    let finalOptionsBeforeFilterByTags = finalOptions
    if (panelState !== DimensionPanelStateEnum.Ordering && selectedGroupKey && selectedGroupKey.length) {
      let isBuildInTagPred = tId => _.startsWith(tId, '_valTypeTag_') || _.startsWith(tId, '_dimTypeTag_')
      let selectedTagsSet = new Set(selectedGroupKey.filter(_.negate(isBuildInTagPred)))
      let checker = _.overSome(...selectedGroupKey.filter(isBuildInTagPred).map(tId => valTypeTagsPredDict[tId] || dimTypeTagsPredDict[tId]), op =>
        _.some((visiblePopoverKey === 'dimension-tag-layer-popover' || mode === 'layer' ? op?.tags_layer : op?.tags) || [], tId => selectedTagsSet.has(tId))
      )
      finalOptions = finalOptions.filter(checker)
      //对单选的分层维度进行排序，多选不做考虑
      if ((!_.isEmpty(dimensionLayer) && visiblePopoverKey === 'dimension-tag-layer-popover') || mode === 'layer') {
        let filterDimensionLayer = _.find(dimensionLayer, { id: selectedGroupKey[0] })
        finalOptions = _.get(filterDimensionLayer, 'dimension_id', []).map(item => {
          return _.find(finalOptions, { id: item })
        })
      }
    }

    let notInEdit = panelState !== DimensionPanelStateEnum.Ordering

    return (
      <div className={classNames('bg-white corner', className)} style={style}>
        <FixWidthHelper
          className={classNames('elli', { 'shadowb-eee mg1b cornert': panelState !== DimensionPanelStateEnum.Searching })}
          style={{
            height: 40,
            lineHeight: '30px',
            padding: '5px',
            backgroundColor: 'white'
          }}
          toFix='first'
          wrapperClassLast='alignright line-height26'
          toFixWidth='65px'
        >
          <div className='analytic-search-title elli'>
            <HoverHelp
              content={
                <p>
                  拖动{this.getPanelName()}到筛选,维度或者钉板
                  <br />
                  <Anchor href={helpLink} target='_blank' className='pointer'>
                    <Icon type='export' /> 查看帮助文档
                  </Anchor>
                </p>
              }
              type='no'
              className='font14 mg1l color-grey'
              addonBefore={this.getPanelName()}
              placement='topRight'
              link={helpLink}
              arrowPointAtCenter
            />
          </div>
          <Tooltip title={notInEdit ? `编辑${this.getPanelName()}顺序` : `保存${this.getPanelName()}顺序`} placement='topLeft' arrowPointAtCenter>
            <Icon
              type={notInEdit ? 'sugo-setting' : 'sugo-save'}
              className={classNames('font16 mg1r iblock-force', {
                'grey-at-first': notInEdit,
                'color-blue': !notInEdit,
                pointer: panelState !== DimensionPanelStateEnum.Ordering
              })}
              onClick={this.toggleSettingDimOrder}
            />
          </Tooltip>
          <Tooltip title='搜索' placement='topLeft' arrowPointAtCenter>
            <Icon
              type='sugo-search'
              className={classNames('font16 mg1r iblock-force', {
                'grey-at-first': panelState !== DimensionPanelStateEnum.Searching,
                'color-blue': panelState === DimensionPanelStateEnum.Searching,
                pointer: panelState !== DimensionPanelStateEnum.Searching
              })}
              onClick={async () => {
                if (panelState === DimensionPanelStateEnum.Ordering) {
                  await this.toggleSettingDimOrder()
                }
                this.setState({
                  panelState: panelState === DimensionPanelStateEnum.Searching ? DimensionPanelStateEnum.Normal : DimensionPanelStateEnum.Searching
                })
              }}
            />
          </Tooltip>
          <Popover
            placement='rightTop'
            arrowPointAtCenter
            title={
              visiblePopoverKey === 'dimension-tag-popover' ? (
                <FixWidthHelper toFix='first' toFixWidth='80px'>
                  <div>按分组筛选</div>
                  <div className='alignright'>
                    <Tooltip title={singleSelectTagsMode ? '切换多选' : '切换单选'} placement='topLeft' arrowPointAtCenter>
                      <Icon
                        type={singleSelectTagsMode ? 'tags' : 'tag'}
                        className={classNames('pointer mg1r iblock-force', {
                          'grey-at-first font13': !singleSelectTagsMode,
                          'color-blue font16': singleSelectTagsMode
                        })}
                        onClick={() => {
                          this.setState({ singleSelectTagsMode: !singleSelectTagsMode }, () => {
                            if (this.state.singleSelectTagsMode && selectedGroupKey && selectedGroupKey[1]) {
                              setCurrentGroupKey(_.takeRight(selectedGroupKey, 1))
                            }
                          })
                        }}
                      />
                    </Tooltip>

                    <Tooltip title='清除选择' placement='topLeft' arrowPointAtCenter>
                      <Icon
                        type='tags-o'
                        className={classNames('font16 pointer grey-at-first mg1r iblock-force', { disabled: _.isEmpty(selectedGroupKey) })}
                        onClick={() => setCurrentGroupKey([])}
                      />
                    </Tooltip>
                  </div>
                </FixWidthHelper>
              ) : (
                '按分组筛选'
              )
            }
            trigger='click'
            content={visiblePopoverKey === 'dimension-tag-popover' ? this.renderTagsPopupContent(finalOptionsBeforeFilterByTags) : null}
            overlayClassName='width180'
            visible={visiblePopoverKey === 'dimension-tag-popover'}
            onVisibleChange={visible => {
              if (!visible) {
                PubSub.publish('analytic.onVisiblePopoverKeyChange', null)
              }
            }}
          >
            <Tooltip title='按分组筛选' placement='topLeft' arrowPointAtCenter>
              <Icon
                type='sugo-tag'
                className={classNames('font20 pointer iblock-force', {
                  'grey-at-first': !selectedGroupKey || !selectedGroupKey[0],
                  'color-blue': selectedGroupKey && selectedGroupKey[0]
                })}
                onClick={async () => {
                  if (panelState === DimensionPanelStateEnum.Ordering) {
                    await this.toggleSettingDimOrder()
                  }
                  this.props.setCurrentGroupKey([])
                  this.setState({ mode: 'tags' })
                  PubSub.publish('analytic.onVisiblePopoverKeyChange', 'dimension-tag-popover')
                }}
              />
            </Tooltip>
          </Popover>
          <Popover
            placement='rightTop'
            arrowPointAtCenter
            title={
              visiblePopoverKey === 'dimension-tag-layer-popover' ? (
                <FixWidthHelper toFix='first' toFixWidth='80px'>
                  <div>按分层筛选</div>
                  <div className='alignright'>
                    <Tooltip title='清除选择' placement='topLeft' arrowPointAtCenter>
                      <Icon
                        type='tags-o'
                        className={classNames('font16 pointer grey-at-first mg1r iblock-force', { disabled: _.isEmpty(selectedGroupKey) })}
                        onClick={() => setCurrentGroupKey([])}
                      />
                    </Tooltip>
                  </div>
                </FixWidthHelper>
              ) : (
                '按分层筛选'
              )
            }
            trigger='click'
            content={visiblePopoverKey === 'dimension-tag-layer-popover' ? this.renderTagsPopupContent(finalOptionsBeforeFilterByTags, 'layer') : null}
            overlayClassName='width180'
            visible={visiblePopoverKey === 'dimension-tag-layer-popover'}
            onVisibleChange={visible => {
              if (!visible) {
                PubSub.publish('analytic.onVisiblePopoverKeyChange', null)
              }
            }}
          >
            <Tooltip title='按分层筛选' placement='topLeft' arrowPointAtCenter>
              <Icon
                type='sugo-move-down'
                className={classNames('font20 pointer iblock-force', {
                  'grey-at-first': !selectedGroupKey || !selectedGroupKey[0],
                  'color-blue': selectedGroupKey && selectedGroupKey[0]
                })}
                onClick={async () => {
                  if (panelState === DimensionPanelStateEnum.Ordering) {
                    await this.toggleSettingDimOrder()
                  }
                  this.setState({ mode: 'layer', singleSelectTagsMode: true })
                  PubSub.publish('analytic.onVisiblePopoverKeyChange', 'dimension-tag-layer-popover')
                }}
              />
            </Tooltip>
          </Popover>
        </FixWidthHelper>
        {panelState !== DimensionPanelStateEnum.Searching ? null : <SearchingInput className='mg1 shadowb-eee' placeholder={`搜索${this.getPanelName()}`} />}
        {panelState !== DimensionPanelStateEnum.Ordering ? null : (
          <CustomOrderList instRef={ref => (this._customOrderList = ref)} idMapper={op => op.name} fixedAtTop={[mainTimeDimName]} options={dataSourceDimensions} orders={orders} />
        )}
        {panelState === DimensionPanelStateEnum.Ordering ? null : (
          <Menu
            prefixCls='ant-select-dropdown-menu'
            className='font12 filter-setting-popover'
            style={{
              width: '100%',
              overflow: 'auto',
              maxHeight: 'none',
              height: `calc(100% - 45px ${panelState === DimensionPanelStateEnum.Searching ? '- 37px' : ''})`
            }}
          >
            {finalOptions.map(dim => {
              let isTextDim = isTextDimension(dim)
              let isBusinessDim = isBusinessDimension(dim)

              // 业务维度需要等分群创建完才能使用
              let businessDimCreateFinishRemain
              if (isBusinessDim) {
                let maxDimEventTime = _.maxBy(_.compact([dim.createdAt, dim.updatedAt]), s => moment(s).valueOf())
                businessDimCreateFinishRemain = 30 - moment().diff(maxDimEventTime, 'second')
              }

              let disabled = isTextDim || (isBusinessDim && 0 < businessDimCreateFinishRemain)
              let menuItem = (
                <Menu.Item key={dim.name} className={DruidColumnTypeIcon[dim.type] === 'sugo-time' ? 'on' : ''}>
                  <div
                    draggable={!disabled}
                    data-dim-name={dim.name}
                    onDragStart={this.onDragStart}
                    onClick={disabled ? undefined : this.onDimensionItemClick}
                    className={classNames('height20', { 'disabled color-999': disabled })}
                  >
                    <Icon type={isUserTagGroupDimension(dim) ? 'tags-o' : DruidColumnTypeIcon[dim.type]} className='itblock width20 font20 color-blue-grey height20' />
                    <div className='itblock pd1l elli line-height20' style={{ width: 'calc(100% - 20px)' }}>
                      <HighLightString text={dim.title || dim.name} highlight={panelState === DimensionPanelStateEnum.Searching ? searching : null} />
                    </div>
                  </div>
                </Menu.Item>
              )
              if (isTextDim) {
                return immutateUpdate(menuItem, 'props.children', div => {
                  return (
                    <Tooltip title='暂不支持使用 Text 维度进行筛选和分组' placement='topLeft'>
                      {div}
                    </Tooltip>
                  )
                })
              } else if (isBusinessDim && 0 < businessDimCreateFinishRemain) {
                return immutateUpdate(menuItem, 'props.children', div => {
                  return (
                    <Timer interval={1000} onTick={() => this.forceUpdate()}>
                      {() => {
                        return (
                          <Tooltip title={`分群正在创建中，请在 ${businessDimCreateFinishRemain} 秒后再试`} placement='topLeft'>
                            {div}
                          </Tooltip>
                        )
                      }}
                    </Timer>
                  )
                })
              }
              return menuItem
            })}
          </Menu>
        )}
      </div>
    )
  }
}
