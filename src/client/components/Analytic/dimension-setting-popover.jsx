import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import FixWidthHelper from '../../components/Common/fix-width-helper'
import { Select, Input, InputNumber, Button, Popover, Radio, message } from 'antd'
import SortButton from '../Common/sort-btn'
import { timeUnitsTree, timeUnits } from '../../components/Slice/time-granularity'
import DruidColumnType, { DruidColumnTypeInverted, isTimeDimension } from '../../../common/druid-column-type'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import { DimensionParamsTypes } from '../../../common/dimension-params-type'
import HoverHelp from '../Common/hover-help'
import classNames from 'classnames'
import { DIMENSION_TYPES, NumberSplitType, AccessDataType, EMPTY_TAG_NUMBER, TAG_NUMBER_EPSILON } from '../../../common/constants'
import Fetch from 'client/common/fetch-final'
import moment from 'moment'
import { EMPTY_TAG_TITLE } from '../../constants/string-constant'

let { Option } = Select
let { Group: RadioGroup, Button: RadioButton } = Radio

/**
 dimensionExtraSettings definition:
 {
    sortCol: '',
    sortDirect: 'desc',
    limit: 10,
    granularity: 'P1D' / 0.1
 }
*/
const possibleNumberGranularity = [1, 5, 10, 100, 1000]
export const possibleLimit = [5, 10, 25, 50, 100, 200, 500, 1000]

export default class DimensionSettingPopover extends React.Component {
  static propTypes = {
    children: PropTypes.object.isRequired,
    sortOptions: PropTypes.array.isRequired,
    value: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool,
    disabledSortColAndLimit: PropTypes.bool,
    onVisibleChange: PropTypes.func,
    maxLimit: PropTypes.number
  }

  static defaultProps = {
    maxLimit: 100
  }

  state = {
    settings: {},
    customLimit: null,
    tagInfos: []
  }

  componentDidMount() {
    this.loadSettingsFromProps(this.props)
    this.loadTagInfo(this.props)
  }

  componentDidUpdate(prevProps) {
    const { value, dimension = {} } = prevProps
    if (value && !_.isEqual(value, this.props.value)) {
      this.loadSettingsFromProps(this.props)
    }
    if (dimension && !_.isEqual(dimension, this.props.dimension)) {
      this.loadTagInfo(this.props)
    }
  }

  async loadTagInfo(props) {
    let { projectCurrent, dimension = {} } = props
    let tagInfos = []
    if (projectCurrent && projectCurrent.access_type === AccessDataType.Tag) {
      let dimensionTagInfo = await Fetch.get('/app/tag-dict/get-tag-info', {
        name: dimension.name,
        project_id: projectCurrent.id
      })
      tagInfos = _.get(dimensionTagInfo, 'result') || []
    }
    if (!_.isEqual(tagInfos, this.state.tagInfos)) {
      this.setState({ tagInfos })
    }
  }

  loadSettingsFromProps(props) {
    let dimExSettings = props.value
    let { settings } = this.state
    this.setState({
      settings: { ...dimExSettings },
      customGranularity: settings.granularity && possibleNumberGranularity.includes(settings.granularity) ? undefined : settings.granularity,
      customLimit: settings.limit && possibleLimit.includes(settings.limit) ? undefined : settings.limit
    })
  }

  renderTimeGranularitySettingPart(dbDim) {
    let { granularity = 'P1D' } = this.state.settings

    let ma = granularity.match(/(\D+)(\d+)(\w+)/)
    let [, prefix, num, suffix] = ma || []
    let timeUnit = timeUnitsTree[`${prefix}_${suffix}`]

    let isDateStringDim = dbDim.type === DruidColumnType.DateString
    return (
      <FixWidthHelper toFix='first' toFixWidth='50%'>
        <div className='mg1r'>
          <div className='color-grey'>粒度</div>
          <Select
            value={isDateStringDim ? '1' : `${num * 1}`}
            disabled={isDateStringDim}
            className='itblock width-100'
            showSearch
            onChange={val => {
              this.setState({
                settings: _.assign({}, this.state.settings, { granularity: `${prefix}${val}${suffix}` })
              })
            }}
          >
            {timeUnit.range.map(p => (
              <Option key={`${p}`} value={`${p}`}>
                {p}
              </Option>
            ))}
          </Select>
        </div>

        <div className='mg1l'>
          <div className='color-grey'>单位</div>
          <Select
            className='width-100'
            dropdownMatchSelectWidth={false}
            value={timeUnit.name}
            onChange={val => {
              this.setState({
                settings: _.assign({}, this.state.settings, { granularity: val.replace('_', 1) })
              })
            }}
          >
            {(isDateStringDim ? timeUnits.filter(tu => tu.title !== '周') : timeUnits).map(u => (
              <Option key={u.name} value={u.name}>
                {u.title}
              </Option>
            ))}
          </Select>
        </div>
      </FixWidthHelper>
    )
  }

  renderNumberGranularitySettingPart() {
    let { sortOptions } = this.props
    let { customGranularity, settings, tagInfos } = this.state
    let { granularity = 10, numberSplitType } = settings

    let dbDim = sortOptions[0]
    let dimParamsType = _.get(dbDim, 'params.type')
    let isDate = isTimeDimension(sortOptions[0])
    let isNumber = !isDate && DruidColumnTypeInverted[sortOptions[0].type] === 'number'
    if (!numberSplitType) {
      if (isNumber) numberSplitType = NumberSplitType.range
      else numberSplitType = NumberSplitType.value
    }
    return (
      <div>
        <div className='color-grey'>分组依据</div>

        <RadioGroup
          value={numberSplitType}
          onChange={ev => {
            let { value } = ev.target
            this.setState({
              settings: { ...settings, numberSplitType: value }
            })
          }}
        >
          <RadioButton disabled={!tagInfos.length} value='subTag'>
            按子标签
          </RadioButton>
          {isNumber ? <RadioButton value='range'>按范围</RadioButton> : null}
          {<RadioButton value='value'>按值</RadioButton>}
        </RadioGroup>
        {isDate && numberSplitType === NumberSplitType.value ? this.renderTimeGranularitySettingPart(sortOptions[0]) : null}
        {numberSplitType === NumberSplitType.value || numberSplitType === NumberSplitType.subTag ? null : (
          <div className={classNames('color-grey mg2t')}>
            <HoverHelp
              addonBefore='粒度 '
              content={
                <div>
                  <p>实际查得的数据的粒度不一定会按照这里设定的粒度，系统会根据实际情况进行调整。</p>
                  <p>如果需要严格的数值范围，请使用分组维度功能。</p>
                </div>
              }
            />
          </div>
        )}
        {numberSplitType === NumberSplitType.value || numberSplitType === NumberSplitType.subTag ? null : (
          <InputNumber
            className={classNames('width-100')}
            min={2}
            defaultValue={granularity}
            onChange={value => {
              // const value = e.target.value
              // const reg = /^[1-9]{1,}[\d]*$/
              // if (!reg.test(value)) return message.info('请输入非负整数')
              this.setState({
                settings: { ...settings, granularity: value }
              })
            }}
            disabled={dimParamsType === DimensionParamsTypes.calc || dimParamsType === DimensionParamsTypes.cast}
          />
        )}
      </div>
    )
  }

  getSubTagFormula = () => {
    let { settings } = this.state
    let { numberSplitType } = settings

    const { tagInfos = [] } = this.state
    const { dimension = {} } = this.props
    if (numberSplitType !== NumberSplitType.subTag) {
      return { name: dimension.name }
    }
    let itemType = _.get(dimension, 'type', -1)
    let isNumber =
      itemType === DIMENSION_TYPES.int ||
      itemType === DIMENSION_TYPES.long ||
      itemType === DIMENSION_TYPES.float ||
      itemType === DIMENSION_TYPES.double ||
      itemType === DIMENSION_TYPES.bigDecimal
    let isDate = itemType === DIMENSION_TYPES.date
    let unit = itemType === (DIMENSION_TYPES.int || itemType === DIMENSION_TYPES.long) ? 1 : TAG_NUMBER_EPSILON
    let customGroup = isNumber ? { [EMPTY_TAG_TITLE]: [EMPTY_TAG_NUMBER, EMPTY_TAG_NUMBER + unit] } : isDate ? { [EMPTY_TAG_TITLE]: [0, 1] } : {}
    _.forEach(tagInfos, p => {
      const { title, tag_value } = p
      if (isNumber) {
        const [begin, end] = tag_value.split('`')
        _.set(customGroup, title, [begin, end])
      } else if (isDate) {
        let [begin, end] = tag_value.split('`')
        begin = moment(begin).startOf('d') + 0
        end = moment(end).endOf('d') + 0
        _.set(customGroup, title, [begin, end])
      } else {
        _.set(customGroup, title, tag_value.split(','))
      }
    })
    return { name: dimension.name, customGroup, isSubTag: true }
  }

  render() {
    let { onChange, visible, onVisibleChange, sortOptions, maxLimit, disabledSortColAndLimit, dimension = {} } = this.props
    let { limit = 10, sortDirect, sortCol } = this.state.settings
    let { customLimit } = this.state

    let possibleLimit0 = 1000 < maxLimit ? [...possibleLimit, maxLimit] : possibleLimit
    let content = visible ? (
      <div className='width220'>
        {/* {!isTimeDimension(sortOptions[0]) && DruidColumnTypeInverted[sortOptions[0].type] === 'number' */}
        {this.renderNumberGranularitySettingPart()}
        {/* : null} */}

        {/* {isTimeDimension(sortOptions[0]) ? this.renderTimeGranularitySettingPart(sortOptions[0]) : null} */}

        <div className='color-grey mg2t'>排序列</div>
        <FixWidthHelper toFix='last' toFixWidth='40px'>
          <Select
            {...enableSelectSearch}
            className='width-100 pd1r'
            dropdownMatchSelectWidth={false}
            placeholder='默认'
            value={sortCol || undefined}
            onChange={val =>
              this.setState({
                settings: _.assign({}, this.state.settings, { sortCol: val })
              })
            }
            disabled={disabledSortColAndLimit}
          >
            {sortOptions.map((op, i) => {
              if (op.name === 'separator') {
                return <Option className='ant-dropdown-menu-item-divider pd0 ignore-mouse' disabled key='divider' />
              }
              return (
                <Option key={i} value={op.name}>
                  {op.title || op.name}
                </Option>
              )
            })}
          </Select>

          <SortButton
            className='width-100'
            value={sortDirect}
            onChange={val =>
              this.setState({
                settings: _.assign({}, this.state.settings, { sortDirect: val })
              })
            }
            disabled={disabledSortColAndLimit}
          />
        </FixWidthHelper>

        <div className='color-grey mg2t'>显示数量</div>

        <Select
          showSearch
          dropdownMatchSelectWidth={false}
          className='width-100'
          value={'' + limit}
          onSearch={val => this.setState({ customLimit: Math.max(1, Math.min(val * 1, maxLimit)) })}
          notFoundContent='超出限制'
          onChange={val => {
            if (val === '自定义') {
              message.info('请直接在下拉框的搜索框内输入自定义数值')
              return
            }
            this.setState({
              settings: { ...this.state.settings, limit: val * 1 }
            })
          }}
          disabled={disabledSortColAndLimit}
        >
          {_.uniq([customLimit || '自定义', ...possibleLimit0])
            .filter(pl => !isFinite(pl) || pl <= maxLimit)
            .map((pl, idx) => {
              return (
                <Option value={`${pl}`} key={pl}>
                  {pl}
                </Option>
              )
            })}
        </Select>

        <div className='mg2t aligncenter'>
          <Button
            type='ghost'
            className='mg3r'
            onClick={() => {
              onVisibleChange(false)
              this.loadSettingsFromProps(this.props)
            }}
          >
            取消
          </Button>
          <Button
            type='primary'
            onClick={() => {
              onVisibleChange(false)
              onChange(_.clone(this.state.settings), this.getSubTagFormula())
            }}
          >
            确认
          </Button>
        </div>
      </div>
    ) : (
      <div className='width200 height200' />
    )
    return (
      <Popover
        placement='bottom'
        trigger='click'
        arrowPointAtCenter
        content={content}
        visible={visible}
        onVisibleChange={
          onVisibleChange &&
          (visible => {
            if (visible) {
              onVisibleChange(true)
            } else {
              // 点击下拉框不关闭 popover，点击外面才关闭
              if (document.activeElement.tagName === 'BODY') {
                onVisibleChange(false)
                this.loadSettingsFromProps(this.props)
              }
            }
          })
        }
        children={this.props.children}
      />
    )
  }
}
