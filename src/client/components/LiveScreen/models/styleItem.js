import {CloseCircleOutlined, PlusOutlined, UploadOutlined} from '@ant-design/icons'
import '@ant-design/compatible/assets/index.css'
import {Button, Checkbox, Col, Input, InputNumber, message, Row, Select, Slider, Upload} from 'antd'
// import {generate} from 'shortid'
import ColorPicker from '../../Common/color-picker'
import AdvanceColorPicker from '../../Common/advance-color-picker'
import EditorGroup from '../editor-group'
import _ from 'lodash'
import {withDebouncedOnChange} from '../../Common/with-debounce-on-change'
import React from 'react'
import PubSub from 'pubsub-js'
import OptionalWrapper from '../../OfflineCalc/optional-wrapper'
import JsCodeEditor from '../js-code-editor/jsCodeEditor'
import {immutateUpdate} from '../../../../common/sugo-utils'
import ReduxSelector from '../../Common/redux-selector'
import {NewVizTypeNameMap} from '../constants'
import {enableSelectSearch} from '../../../common/antd-freq-use-props'
import BraftEditorAdapter from '../../Common/braft-editor-adapter'
import {genTranslationDict} from '../../../common/slice-data-transform'
import {defaultStepInfo} from '../chartStyle/step_progress'
import {BorderImageSliceEditor} from '../chartStyle/frame'
import SmallImagePicker from '../small-img-picker'

function MetricPicker({value, onChange}) {
  return (
    <ReduxSelector
      selector={state => {
        const {screenComponents, activedId} = _.get(state, 'livescreen_workbench') || {}
        const currentComponent = activedId && _.find(screenComponents, c => c.id === activedId)
        const params = _.get(currentComponent, 'params')
        const {metrics, druid_datasource_id, translationDict} = params || {}
        return druid_datasource_id
          ? {metrics, translationDict: genTranslationDict({druid_datasource_id, params})}
          : {metrics, translationDict}
      }}
    >
      {({metrics, translationDict}) => {
        return (
          <Select
            className="width-100"
            value={value}
            onChange={onChange}
            {...enableSelectSearch}
            dropdownMatchSelectWidth={false}
            placeholder="(请选择控件)"
          >
            {_.map(metrics, metricName => {
              return (
                <Option key={metricName}>{_.get(translationDict, metricName) || metricName}</Option>
              )
            })}
          </Select>
        )
      }}
    </ReduxSelector>
  )
}

const InputNumberDebouncedOnChange = withDebouncedOnChange(InputNumber, value => value, 1000)

const {Option} = Select

class StyleItem {
  title;
  name;       // 每个组的组建用name来作为react的key，所以要注意给
  type;       // ['group', 'editorGroup', 'color', 'number', 'select', 'slider']
  deletable;  // 可以添加和删除的分组 eg. 颜色分组
  hidable;    // 可以显示隐藏的分组 eg. 标签
  checked;    // 传入的显示隐藏
  onAdd;      // function for add item
  options;    // select类型必须提供
  items = []; // @StyleItem
  span;       // group类型分割点

  constructor(kvs, ...rest) {
    if (kvs && typeof kvs === 'object') {
      const keys = Object.keys(kvs)
      keys.forEach(key => this[key] = kvs[key])
    }
    rest.forEach(kvs => {
      const keys = Object.keys(kvs)
      keys.forEach(key => this[key] = kvs[key])
    })
    if (this.onChange && this.onChangeDebounce) {
      this.onChange = _.debounce(this.onChange, this.onChangeDebounce)
    }
    if (this.onChangeVisible && this.onChangeVisibleDebounce) {
      this.onChangeVisible = _.debounce(this.onChangeVisible, this.onChangeVisibleDebounce)
    }
  }

  extractAppendProps() {
    return _.omit(this, ['title', 'name', 'type', 'deletable', 'hidable', 'items', 'path', 'editers'])
  }

  typeToComp() {
    const {
      name,
      type = 'unknown',
      items,
      options = [],
      deletable,
      addable,
      hidable,
      checked,
      onAdd = _.noop,           // 配合add的回调
      onChangeVisible = _.noop, // 配合checked的回调
      onDelete = _.noop         // 配合delete的回调
    } = this
    if (!name) {
      return null
    }
    let title = this.title
    const itemSpan = Math.ceil(24 / items.length)
    let extra = addable ? <div key="add" className="inline pointer" onClick={onAdd}><PlusOutlined />添加</div> : false
    extra = hidable ? <Checkbox key="hide" onChange={onChangeVisible} onClick={e => e.stopPropagation()} checked={checked}>显示</Checkbox> : extra
    title = deletable
      ? (<span><CloseCircleOutlined onClick={onDelete} />{title}</span>)
      : title
    let selectObj = _.find(options, {key: this.value})

    switch (type) {
      case 'editorGroup':
        return (
          <EditorGroup key={name} title={title} className="bottom-line" extra={extra}>
            {items.map(item => item && item.editor)}
          </EditorGroup>
        )
      case 'group':
        return (
          <Row key={name} gutter={6}>
            {
              title
                ? <Col span={24}>{title}:</Col>
                : false
            }
            {items.map(item => item ? <Col key={item.name} span={item.span || itemSpan}>{item.editor}</Col> : false)}
          </Row>
        )
      case 'input':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <Input key={`${name}-input`} className="width-80" {...this.extractAppendProps()} />
            </div>
          </div>
        )
      case 'number':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <InputNumber key={`${name}-input`} className="width-70" {...this.extractAppendProps()} />
            </div>
          </div>
        )
      case 'numberStep10':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <InputNumber key={`${name}-input`} step={10} className="width-70" {...this.extractAppendProps()} />
            </div>
          </div>
        )
      case 'numberDebounced':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <InputNumberDebouncedOnChange key={`${name}-input`} className="width-70" {...this.extractAppendProps()} />
            </div>
          </div>
        )
      case 'checkbox':
        return <Checkbox className="mg2y" key={name} {...this.extractAppendProps()}>{title}</Checkbox>
      case 'checkboxWithLabel':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <Checkbox key={name} {...this.extractAppendProps()} />
            </div>
          </div>
        )
      case 'select':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <Select
                key={`${name}-select`}
                className="width-70"
                getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
                {...this.extractAppendProps()}
                onChange={(v, option) => {
                  this.onChange(option.key)
                }}
                value={selectObj && selectObj.value}
              >
                {options.map(option => <Option key={option.key} title={option.value}>{option.value}</Option>)}
              </Select>
            </div>
          </div>
        )
      case 'color':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <ColorPicker className="inline width-70" {...this.extractAppendProps()} />
            </div>
          </div>
        )
      case 'advanceColor':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <AdvanceColorPicker
                className="inline width-70"
                {...this.extractAppendProps()}
                getPopupContainer={() => _.get(document.getElementsByClassName('screen-workbench'), '0', document.body)}
              />
            </div>
          </div>
        )
      case 'slider':
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <Slider {...this.extractAppendProps()} />
            </div>
          </div>
        )
      case 'optionsOverWriter': {
        let {value, onChange, defaultValue} = this.extractAppendProps()
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="">{title}:</div>
            <JsCodeEditor
              value={value}
              onChange={onChange}
              defaultValue={defaultValue}
              className="mg2t"
            />
  
            <Button
              onClick={() => {
                PubSub.publish('liveScreenCharts.debugCurrentStyleOptionsOverWriter')
              }}
            >在控制台调试</Button>
          </div>
        )
      }
      case 'borderConfigPanel': {
        let {value, onChange, defaultValue, ...rest} = this.extractAppendProps()
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="itblock width80">{title}:</div>
            <div className="iblock width160">
              <OptionalWrapper
                value={value === 'none' ? null : value}
                onChange={onChange}
                ctrlComponent={({value, onChange}) => {
                  // match:
                  // 1px solid #fff
                  // 1px solid rgba(10%, 20%, 30%, 0.5)
                  let m = (value || '').match(/^(\w+?)\s+(\w+?)\s+(.+)$/) || ['1px solid #fff', '1px', 'solid', '#fff']
                  return (
                    <React.Fragment>
                      <div className="mg1y">线宽：</div>
                      <Input
                        className="width-100"
                        value={m[1]}
                        onChange={ev => {
                          onChange(`${ev.target.value} ${m[2]} ${m[3]}`)
                        }}
                      />
                      <div className="mg1y">类别：</div>
                      <Select
                        className="width-100"
                        value={m[2]}
                        onChange={val => {
                          onChange(`${m[1]} ${val} ${m[3]}`)
                        }}
                      >
                        {['solid', 'dotted', 'dashed', 'double', 'hidden'].map(option => {
                          return (
                            <Option key={option}>{option}</Option>
                          )
                        })}
                      </Select>
                      <div className="mg1y">颜色：</div>
                      <ColorPicker
                        className="width-1000"
                        value={m[3]}
                        onChange={val => {
                          onChange(`${m[1]} ${m[2]} ${val}`)
                        }}
                      />
                    </React.Fragment>
                  )
                }}
                initialValue={defaultValue}
                {...rest}
              />
            </div>
          </div>
        )
      }
      // case 'fileToDataUrl': {
      //   let {value, onChange, defaultValue} = this.extractAppendProps()
  
      //   return (
      //     <div key={name}>
      //       <div key={`${name}-lable`} className="itblock width80">{title}:</div>
      //       <div className="itblock width160">
      //         {value ? <img src={value} alt=""/> : null}
      //         <Upload
      //           accept="image/svg+xml,image/png"
      //           fileList={[]}
      //           beforeUpload={file => {
      //             if (1024 * 100 < file.size) { // 100 kb
      //               message.warn('小图标不能大于 100 kb')
      //               return false
      //             }
      //             const reader = new FileReader()
      //             reader.onload = e => onChange(e.target.result)
      //             reader.readAsDataURL(file)
      //             return false
      //           }}
      //         >
      //           <Button><UploadOutlined /> 选择图片文件</Button>
      //         </Upload>
      //       </div>
      //     </div>
      //   )
      // }
      case 'fileToDataUrlScope': {
        let {value, onChange} = this.extractAppendProps()
        let { iconSrc, scope, iconType='antd', iconColor } = value || {}
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="itblock width80">{title}:</div>
            <div>
              <span className="iblock width80">
              图片类型
              </span>
              <Select
                className="iblock width160"
                value={iconType}
                onChange={val => {
                  onChange(immutateUpdate(value, 'iconType', () => val))
                }}
              >
                <Option key="dataUrl">自定义小图标</Option>
                <Option key="antd">antd图标</Option>
              </Select>
            </div>
            <div>
              {iconType === 'dataUrl' && iconSrc ? <img src={iconSrc} alt="" className="width50"/> : null}
              {iconType === 'dataUrl'
                ? (
                  <Upload
                    accept="image/svg+xml,image/png"
                    fileList={[]}
                    beforeUpload={file => {
                      if (1024 * 100 < file.size) { // 100 kb
                        message.warn('小图标不能大于 100 kb')
                        return false
                      }
                      const reader = new FileReader()
                      reader.onload = e => onChange(immutateUpdate(value, 'iconSrc', () => e.target.result))
                      reader.readAsDataURL(file)
                      return false
                    }}
                  >
                    <Button><UploadOutlined /> 选择图片文件</Button>
                  </Upload>
                )
                : <div>
                  <span className="iblock width80">图标名称</span>
                  <Input
                    className="iblock width160"
                    value={iconSrc}
                    onChange={ev => {
                      onChange(immutateUpdate(value, 'iconSrc', () => ev.target.value))
                    }}
                  />
                  <div>
                    <div className="iblock width80">图标颜色</div>
                    <div className="iblock width160">
                      <ColorPicker className="inline width-70"
                        value={iconColor}
                        onChange={val => {
                          onChange(immutateUpdate(value, 'iconColor', () => val))
                        }} 
                      />
                    </div>
                  </div>
                </div>
              }
              <div>
                <span className="iblock width80">图标作用范围（小于等于）</span>    
                <InputNumber
                  className="iblock width160"
                  value={scope}
                  onChange={val => {
                    onChange(immutateUpdate(value, 'scope', () => val))
                  }}
                />
              </div>
            </div>
          </div>
        )
      }
      case 'setColorScope': {
        let {value, onChange} = this.extractAppendProps()
        let { scope, colorStart, colorEnd } = value || {}
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="itblock width80">{title}:</div>
            <div>
              <div>
                <div className="iblock width80">渐变颜色（开始）</div>
                <div className="iblock width160">
                  <ColorPicker className="inline width-70"
                    value={colorStart}
                    onChange={val => {
                      onChange(immutateUpdate(value, 'colorStart', () => val))
                    }} 
                  />
                </div>
              </div>
              <div>
                <div className="iblock width80">渐变颜色（结束）</div>
                <div className="iblock width160">
                  <ColorPicker className="inline width-70"
                    value={colorEnd}
                    onChange={val => {
                      onChange(immutateUpdate(value, 'colorEnd', () => val))
                    }} 
                  />
                </div>
              </div>
              <div>
                <span className="iblock width80">作用范围（小于等于）</span>    
                <InputNumber
                  className="iblock width160"
                  value={scope}
                  onChange={val => {
                    onChange(immutateUpdate(value, 'scope', () => val))
                  }}
                />%
              </div>
            </div>
          </div>
        )
      }
      case 'link': {
        let {value, onChange, onRemove, ...rest} = this.extractAppendProps()
        let {iconSrc, title, url, target} = value || {}
  
        return (
          <div key={name} {...rest}>
            <div key={`${name}-lable`} className="itblock width80">{this.title}:</div>
            <div className="itblock width160">
              <div className="mg1y">上传左侧小图标：</div>
              {iconSrc ? <img src={iconSrc} alt=""/> : null}
              <Upload
                accept="image/svg+xml,image/png"
                fileList={[]}
                beforeUpload={file => {
                  if (1024 * 100 < file.size) { // 100 kb
                    message.warn('小图标不能大于 100 kb')
                    return false
                  }
                  const reader = new FileReader()
                  reader.onload = e => onChange(immutateUpdate(value, 'iconSrc', () => e.target.result))
                  reader.readAsDataURL(file)
                  return false
                }}
              >
                <Button><UploadOutlined /> 选择图片文件</Button>
              </Upload>
  
              <div className="mg1y">超链接标题：</div>
              <Input
                className="width-100"
                value={title}
                onChange={ev => {
                  onChange(immutateUpdate(value, 'title', () => ev.target.value))
                }}
              />
  
              <div className="mg1y">超链接地址：</div>
              <Input
                className="width-100"
                value={url}
                onChange={ev => {
                  onChange(immutateUpdate(value, 'url', () => ev.target.value))
                }}
              />
  
              <div className="mg1y">超链接目标：</div>
              <Select
                className="width-100"
                value={target}
                onChange={val => {
                  onChange(immutateUpdate(value, 'target', () => val))
                }}
              >
                <Option key="_blank">新窗口</Option>
                <Option key="modal">弹窗</Option>
              </Select>
  
              <div className="mg1y">
                <Button onClick={onRemove}>移除选项</Button>
              </div>
            </div>
          </div>
        )
      }
      case 'button': {
        return (
          <Button {...this.extractAppendProps()} />
        )
      }
      case 'componentPicker': {
        let {value, onChange, ...rest} = this.extractAppendProps()
  
        return (
          <div key={name} {...rest}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <ReduxSelector
                selector={state => {
                  return {
                    components: _.get(state, 'livescreen_workbench.screenComponents') || []
                  }
                }}
              >
                {({components}) => {
                  return (
                    <Select
                      className="width-100"
                      value={value}
                      onChange={onChange}
                      {...enableSelectSearch}
                      dropdownMatchSelectWidth={false}
                      placeholder="(请选择控件)"
                    >
                      {_.map(components, comp => {
                        return (
                          <Option key={comp.id}>{_.get(comp.style_config, 'componentName') || NewVizTypeNameMap[comp.type] || comp.type}</Option>
                        )
                      })}
                    </Select>
                  )
                }}
              </ReduxSelector>
            </div>
          </div>
        )
      }
      case 'braftEditor': {
        let {value, onChange, ...rest} = this.extractAppendProps()
  
        return (
          <div key={name} {...rest}>
            <div key={`${name}-lable`} className="">{title}:</div>
            <div className="corner mg2t" style={{border: '1px solid #777'}}>
              <BraftEditorAdapter
                value={value}
                onChange={onChange}
              />
            </div>
          </div>
        )
      }
      case 'metric_picker': {
        let {value, onChange, ...rest} = this.extractAppendProps()
  
        return (
          <div key={name} {...rest}>
            <div key={`${name}-lable`} className="iblock width80">{title}:</div>
            <div className="iblock width160">
              <MetricPicker
                value={value}
                onChange={onChange}
              />
            </div>
          </div>
        )
      }
      case 'step_progress': {
        let {value, onChange, onRemove, ...rest} = this.extractAppendProps()
        let {
          metricName, title, titleColor, titleFontSize, compareTemplate, compareColor, compareFontSize,
          compareLineHeight, pinLineColor, compareLineColor, notFullDotColor, fullDotColor, dotSize
        } = _.defaults({}, value || {}, defaultStepInfo)
  
        return (
          <div key={name} {...rest}>
            <div key={`${name}-lable`} className="itblock width80">{this.title}:</div>
            <div className="itblock width160">
              <div className="mg1y">绑定指标：</div>
              <MetricPicker
                value={metricName}
                onChange={mName => onChange(immutateUpdate(value, 'metricName', () => mName))}
              />
  
              <div className="mg1y">阶梯标题：</div>
              <Input
                className="width-100"
                value={title}
                onChange={ev => {
                  onChange(immutateUpdate(value, 'title', () => ev.target.value))
                }}
              />
  
              <div className="mg1y">标题颜色：</div>
              <ColorPicker
                value={titleColor}
                onChange={val=> onChange(immutateUpdate(value, 'titleColor', () => val))}
              />
  
              <div className="mg1y">标题字体大小(px)：</div>
              <InputNumber
                value={titleFontSize}
                onChange={val => onChange(immutateUpdate(value, 'titleFontSize', () => val))}
              />
  
              <div className="mg1y">对比字体格式化模板：</div>
              <Input
                className="width-100"
                value={compareTemplate}
                onChange={ev => {
                  onChange(immutateUpdate(value, 'compareTemplate', () => ev.target.value))
                }}
              />
  
              <div className="mg1y">对比字体颜色：</div>
              <ColorPicker
                value={compareColor}
                onChange={val=> onChange(immutateUpdate(value, 'compareColor', () => val))}
              />
  
              <div className="mg1y">对比字体大小(px)：</div>
              <InputNumber
                value={compareFontSize}
                onChange={val => onChange(immutateUpdate(value, 'compareFontSize', () => val))}
              />
  
              <div className="mg1y">对比字体行高(px)：</div>
              <InputNumber
                value={compareLineHeight}
                onChange={val => onChange(immutateUpdate(value, 'compareLineHeight', () => val))}
              />
  
              <div className="mg1y">指针线颜色：</div>
              <ColorPicker
                value={pinLineColor}
                onChange={val => onChange(immutateUpdate(value, 'pinLineColor', () => val))}
              />
              
              <div className="mg1y">对比线颜色：</div>
              <ColorPicker
                value={compareLineColor}
                onChange={val => onChange(immutateUpdate(value, 'compareLineColor', () => val))}
              />
  
              <div className="mg1y">未完成颜色：</div>
              <ColorPicker
                value={notFullDotColor}
                onChange={val => onChange(immutateUpdate(value, 'notFullDotColor', () => val))}
              />
  
              <div className="mg1y">已完成颜色：</div>
              <ColorPicker
                value={fullDotColor}
                onChange={val => onChange(immutateUpdate(value, 'fullDotColor', () => val))}
              />
  
              <div className="mg1y">点的大小：</div>
              <InputNumber
                value={dotSize}
                onChange={val => onChange(immutateUpdate(value, 'dotSize', () => val))}
              />
  
              <div className="mg1y">
                <Button onClick={onRemove}>移除阶梯</Button>
              </div>
            </div>
          </div>
        )
      }
      case 'fileToDataUrl': {
        let {value, onChange} = this.extractAppendProps()
  
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="itblock font14 mg1b">{title}:</div>
            <SmallImagePicker
              value={value}
              onChange={onChange}
            />
          </div>
        )
      }
      case 'borderImageSliceEditor': {
        let {value, onChange, imgUrl} = this.extractAppendProps()
  
        return (
          <div key={name}>
            <div key={`${name}-lable`} className="itblock font14 mg1b">{title}:</div>
            <BorderImageSliceEditor
              imgUrl={imgUrl}
              value={value}
              onChange={onChange}
            />
          </div>
        )
      }
      default:
        return <label key={name}>{name}-{type}</label>
    }
  }

  get editor() {
    var editers = this.editers
    if (editers && editers.length > 0) {
      return editers.map(e => this.typeToComp(e.type))
    }
    return this.typeToComp()
  }

}

export default StyleItem
