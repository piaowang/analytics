import { Component } from 'react'
import PropTypes from 'prop-types'
import {Popover, Menu, Button, Tooltip, Checkbox, Radio} from 'antd'
const MenuItem = Menu.Item
import HighLightString from '../Common/highlight-string'
import setStatePromise from '../../common/set-state-promise'
import withAutoFocus from '../Common/auto-focus'
import {withDebouncedOnChange} from '../Common/with-debounce-on-change'
import smartSearch from '../../../common/smart-search'
import Search from '../Common/search'
import _ from 'lodash'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 1300)

const InputWithAutoFocus = withAutoFocus(InputWithDebouncedOnChange)

@setStatePromise
class EditorPanelDataPopover extends Component {

  static propTypes = {
    sourceLayer: PropTypes.array.isRequired,
    popoverVisible: PropTypes.bool,
    onOk: PropTypes.func.isRequired,
    onPopoverVisibleChange: PropTypes.func,
    selectedValue: PropTypes.array

  }

  //数组，主要原因是［预设指标］跟［自定义指标］
  state = {
    layerList: [{
      keyword: null,
      selectingValue: []
    }],
    currentLayer: 0, //default first layer
    _popoverVisible: false 
  }

  componentWillMount() {
    let layerList =[]
    layerList = this.props.sourceLayer.map(() => {
      return {
        keyword: null,
        selectingValue: []
      }
    })
    this.setState({
      layerList
    })
  }
  
  componentWillReceiveProps (nextProps) {
    if (this.props.popoverVisible === false && nextProps.popoverVisible === true) {
      //当重新把窗口打开时，把之前选好的数据默认赋值到selectingValue, 目的是为了默认有打钩
      let layerList = []
      layerList = this.props.sourceLayer.map(sl => {
        return {
          keyword: null,
          selectingValue: sl.selectedValue.map( (sv) => sv.name)
        }
      })
      this.setState({
        layerList: layerList
      })
    }
  }

  cleanSelections = () => {
    //Leon
    let {layerList, currentLayer} = this.state
    layerList[currentLayer]['selectingValue'] = []
    this.setState({
      layerList
    })
  }

  renderContent() {
    
    let { 
      sourceLayer, 
      onPopoverVisibleChange = visible => this.setState({_popoverVisible: visible}) 
    } = this.props

    const {layerList, currentLayer} = this.state

    //把相应的层数拿出来
    const {keyword, selectingValue} = layerList[currentLayer]
    let {selectedValue, /*keyField, valueField,*/ options} = sourceLayer[currentLayer]
    if (keyword) {
      options = options.filter(op => smartSearch(keyword, (op.title || op.name)))
    }

    // 将已经选择了的项排到前面
    let savedEq = selectedValue || []

    if (selectedValue.length) {
      options = savedEq.concat(
        options.filter(op => {
          let flag = true
          selectedValue.forEach(s => {
            if (s.name === op.name) {
              flag = false
            }
          })
          return flag
        })
      )
    }

    let showCleanSelectionBtn = (selectedValue || []).length && (selectingValue || []).length
    return (
      <div className="pd2x">
        <div style={{ height: _.isEmpty(sourceLayer) ? 320 : 345, width: 300 }}>
          <div className="filter-setting-popover">
            {this.renderRadioGroupByLayer()}
            <InputWithAutoFocus
              className="mg1y"
              style={{width: 'calc(100% - 10px)'}}
              placeholder="搜索"
              value={keyword}
              onChange={val => {
                //Leon
                let layerList = this.state.layerList
                layerList[currentLayer]['keyword'] = val
                this.setState({
                  layerList
                })
              }}
            />
            {
              showCleanSelectionBtn ? (
                <a 
                  onClick={this.cleanSelections}
                  className="itblock pd1 pd2l"
                >清除选择的内容</a>
              ) : null
            }
            <div>
              <Menu
                prefixCls="ant-select-dropdown-menu"
                className="anlytic-filter-menu"
                style={{
                  overflow: 'auto',
                  maxHeight: 'none',
                  height: `calc(248px ${showCleanSelectionBtn ? '- 28px' : ''})`
                }}
              >
                {options.map(op => {
                  if (!op) {
                    return null
                  }
                  return (
                    <MenuItem key={`op_${op.name}`}>
                      <Tooltip title={op.name} placement="topRight">
                        <Checkbox
                          checked={selectingValue.includes(op.name)}
                          onChange={ev => {
                            let newEq
                            if (ev.target.checked) {
                              newEq = selectingValue.concat([op.name])
                            } else {
                              newEq = selectingValue.filter(prev => prev !== op.name)
                            }
                            //Leon                          
                            let layerList = this.state.layerList
                            layerList[currentLayer]['selectingValue'] = newEq
                            this.setState({
                              layerList
                            })
                          }}
                        >
                          <HighLightString
                            className="iblock elli tile-filter-item"
                            text={op.title || op.name}
                            highlight={this.state.keyword}
                          />
                        </Checkbox>
                      </Tooltip>
                    </MenuItem>
                  )
                })}
              </Menu>
            </div>
          </div>
        </div>
        <div className="aligncenter pd2b">
          <Button
            type="ghost"
            className="mg3r"
            onClick={() => {
              onPopoverVisibleChange(false)
            }}
          >取消</Button>
          <Button
            type="primary"
            onClick={() => {
              this.props.onOk(this.state.layerList.map(ll => ll.selectingValue))
              onPopoverVisibleChange(false)
            }}
          >确认</Button>
        </div>
      </div>
    )
  }

  renderRadioGroupByLayer() {
    const {sourceLayer} = this.props
    return (
      sourceLayer.length > 1
        ? (
          <RadioGroup
            className="mg1y"
            defaultValue={0}
            onChange={e => {
              this.setState({
                currentLayer: e.target.value
              })
            }}
          >
            {
              sourceLayer.map( (slo, index) => {
                return (
                  <RadioButton 
                    key={`data_${index}`}
                    value={index}
                  >
                    {slo.title}
                  </RadioButton>
                )
              })
            }
          </RadioGroup>
        )
        : null
    )
  }

  render() {

    const { 
      popoverVisible = this.state._popoverVisible,
      title
    } = this.props
    return (
      <Popover
        overlayClassName="custom-filter-popover"
        title={title}
        content={this.renderContent()}
        trigger="click"
        visible={popoverVisible}
        placement="left"
        getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
      />
    )
  }
}

export default EditorPanelDataPopover
