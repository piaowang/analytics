import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Select, Button, Popover, InputNumber, Menu, Input, Checkbox, Slider, Tooltip, Radio, message } from 'antd'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import { isNumberDimension, isTimeDimension } from '../../../common/druid-column-type'
import Loading from '../../components/Common/loading'
import HighLightString from '../Common/highlight-string'
import setStatePromise from '../../common/set-state-promise'
import withAutoFocus from '../Common/auto-focus'
import Search from '../Common/search'
import FixWidthHelper from '../../components/Common/fix-width-helper'
import { granularityToFormat, dateFormatterGenerator } from '../../common/date-format-util'
import { EMPTY_VALUE_OR_NULL } from '../../../common/constants'
import * as actions from '../../actions/institutions'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { getHasPromessinInstitutions } from '../../../common/slice-external-datasource-filter'


const { Option } = Select
const InputWithAutoFocus = withAutoFocus(Search)

/**
 filter definition
 {
    col: '',
    op: 'in, not in, startsWith, endsWith, contains, equal',
    eq: [from to] / [case0, case1, case2, ...],
    type: 'number/string'
 }
 */

let ModeEnum = {
  Normal: 1,
  Advanced: 2
}

let NormalFilterOpEnum = ['in', 'not in', 'equal']
let AdvancedFilterOpEnum = ['equal', 'nullOrEmpty', 'startsWith', 'endsWith', 'contains', 'matchRegex']

@connect(state => _.pick(state.common, ['institutionsList']), dispatch => bindActionCreators(actions, dispatch))
@setStatePromise
export default class FilterSettingPopover extends React.Component {
  static propTypes = {
    dbDimension: PropTypes.object.isRequired,
    children: PropTypes.object.isRequired,
    value: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool,
    onVisibleChange: PropTypes.func,
    uiStrategy: PropTypes.oneOf(['lite', 'normal'])
  }

  static defaultProps = {
    onVisibleChange: _.identity
  }

  state = {
    searchingText: '',
    searchingTextDebounced: '',
    mode: ModeEnum.Normal,
    settings: {}
  }

  componentDidMount() {
    this.loadSettingsFromProps(this.props)
    this.props.getInstitutions()
  }

  componentDidUpdate(prevProps, prevState) {
    let { value } = prevProps

    if (!_.isEqual(value, this.props.value)) {
      this.loadSettingsFromProps(this.props)
    }
  }

  onUpdateSearchingText = _.debounce(() => {
    if (this.state.searchingText !== this.state.searchingTextDebounced) {
      this.setState({ searchingTextDebounced: this.state.searchingText })
    }
  }, 1300)

  loadSettingsFromProps(props) {
    const { dbDimension, uiStrategy } = props
    let settings = {
      ...this.state.settings,
      ...props.value
    }
    const dimParamType = _.get(dbDimension, 'params.type')
    const isGroupOrBusinessDim = dimParamType === 'group' || dimParamType === 'business'
    let liteMode = uiStrategy === 'lite' && !isGroupOrBusinessDim
    if (liteMode && settings.op === 'in') {
      settings.op = 'equal'
    }
    return this.setStatePromise({
      settings: settings,
      mode: liteMode
        ? ModeEnum.Advanced
        : _.includes(NormalFilterOpEnum, settings.op) ? ModeEnum.Normal : ModeEnum.Advanced
    })
  }

  cleanSelections = () => {
    return this.setStatePromise({
      settings: { ...this.state.settings, eq: [], containsNull: false }
    })
  }

  renderStringNormalFilterContent(height = 252) {
    let {
      dbDimension,
      value,
      mainTimeDimName,
      institutionsList
    } = this.props
    let {
      settings: {
        op,
        eq
      },
      searchingText
    } = this.state

    let eqSet = new Set(eq)
    let Checker = Checkbox
    let institutions_id = _.get(sugo, 'user.role_institutions', [])
    institutions_id = institutions_id.length ? institutions_id : _.get(sugo, 'user.institutions_id', '')  
    let data = getHasPromessinInstitutions(institutionsList, institutions_id)
    data = searchingText ? data.filter(p => _.includes(p, searchingText)) : data

    // 默认第一项增加空值查询选项（fix #152)
    let showCleanSelectionBtn = true//(value.eq || []).length && (eq || []).length
    let dbDimParamType = _.get(dbDimension, 'params.type')
    let dbDimGroupFor = _.get(dbDimension, 'params.dimension.name')
    return (
      <div className="filter-setting-popover itblock">
        <FixWidthHelper
          className="shadowb-eee"
          style={{ padding: '5px' }}
          toFix="first"
          toFixWidth="80px"
        >
          <div>
            <Select
              dropdownMatchSelectWidth={false}
              className="width-100"
              value={op}
              disabled={op === 'in-ranges'}
              onChange={nextOp => {
                this.setState({
                  settings: {
                    ...this.state.settings,
                    op: nextOp,
                    eq: _.includes(AdvancedFilterOpEnum, nextOp) ? _.take(eq.filter(v => v !== EMPTY_VALUE_OR_NULL), 1) : eq
                    // containsNull: _.includes(AdvancedFilterOpEnum, nextOp) ? false : this.state.settings.containsNull
                  }
                })
              }}
            >
              {[
                <Option value="in" key="in">包含</Option>,
                <Option
                  key="notIn"
                  value="not in"
                  disabled={dbDimParamType === 'group' && dbDimGroupFor === mainTimeDimName}
                >排除</Option>
              ]}
            </Select>
          </div>
          <div className="pd1l">
            <InputWithAutoFocus
              className="width-100"
              placeholder="搜索更多..."
              disabled={_.endsWith(op, 'in-ranges')}
              value={searchingText}
              onChange={ev => {
                this.setState({ searchingText: ev.target.value })
                this.onUpdateSearchingText()
              }}
            />
          </div>
        </FixWidthHelper>
        {showCleanSelectionBtn ?
          (
            <a
              className="pointer"
              onClick={this.cleanSelections}
              className="itblock pd1 pd2l"
            >清除选择的内容</a>
          ) : null}
        <Menu
          prefixCls="ant-select-dropdown-menu"
          className="anlytic-filter-menu"
          style={{ overflow: 'auto', maxHeight: 'none', height: `calc(${height}px - 44px ${showCleanSelectionBtn ? '- 28px' : ''})` }}
        >
          {data.map(p => {
            const { serialNumber: val, name: title } = p
            return (
              <Menu.Item key={'m-i-' + val}>
                <Tooltip title={val} placement="topRight">
                  <Checker
                    className="width-100"
                    checked={eqSet.has(val)}
                    onChange={ev => {
                      let newEq
                      if (ev.target.checked) {
                        newEq = eq.concat([val])
                      } else {
                        newEq = eq.filter(prev => prev !== val)
                      }
                      this.setState({
                        settings: _.assign({}, this.state.settings, { eq: newEq })
                      })
                    }}
                  >
                    {<HighLightString
                      className="iblock elli tile-filter-item"
                      text={title}
                      highlight={searchingText}
                    />
                    }
                  </Checker>
                </Tooltip>
              </Menu.Item>
            )
          })}
        </Menu>
      </div>
    )
  }

  getRangesFormatter() {
    let { dbDimension, value: { granularity } } = this.props

    return dbDimension && isTimeDimension(dbDimension)
      ? dateFormatterGenerator(granularityToFormat(granularity || 'P1D'))
      : null
  }

  renderStringFilterContent() {
    let { mode, searchingText } = this.state
    const { dbDimension, uiStrategy, value: settings } = this.props
    const isGroupOrBusinessDim = dbDimension?.params?.type === 'group'
    if (uiStrategy === 'lite' && !isGroupOrBusinessDim) {
      return this.renderStringAdvancedFilterContent()
    }
    // 分组的只能有普通过滤
    if (isGroupOrBusinessDim) {
      mode = ModeEnum.Normal
    }
    return (
      <div>
        <Radio.Group
          value={mode}
          className="block pd1"
        >
          <Radio.Button
            value={1}
            className="width-50 aligncenter"
          >普通</Radio.Button>
          <Radio.Button
            value={2}
            className="width-50 aligncenter"
            disabled
          >高级</Radio.Button>
        </Radio.Group>
        {
          mode === ModeEnum.Normal
            ? this.renderStringNormalFilterContent()
            : null
        }
      </div>
    )
  }

  render() {
    let {
      visible,
      onVisibleChange,
      value: { op },
      onChange
    } = this.props

    let content = visible ? (
      <div>
        {this.renderStringFilterContent()}

        <div className="aligncenter pd2y">
          <Button
            type="ghost"
            className="mg3r"
            onClick={() => {
              onVisibleChange(false)
              this.loadSettingsFromProps(this.props).then(() => {
                onChange(_.clone(this.state.settings))
              })
            }}
          >取消</Button>
          <Button
            type="primary"
            onClick={() => {
              onVisibleChange(false)
              onChange(_.clone(this.state.settings))
            }}
          >确认</Button>
        </div>
      </div>
    ) : null
    return (
      <Popover
        overlayClassName="custom-filter-popover"
        placement="bottom"
        trigger="click"
        arrowPointAtCenter
        content={content}
        visible={visible}
        onVisibleChange={visible => {
          if (visible) {
            onVisibleChange(true)
          } else {
            // 点击下拉框不关闭 popover，点击外面才关闭
            if (document.activeElement.tagName === 'BODY') {
              onVisibleChange(false)
              this.loadSettingsFromProps(this.props).then(() => {
                onChange(_.clone(this.state.settings))
              })
            }
          }
        }}
        children={this.props.children}
      />
    )
  }
}

