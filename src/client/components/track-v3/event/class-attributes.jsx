/**
 * create by xujun at 2020/07/10
 * 原生控件附加属性设置
 */

import { CloseOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Select, Tooltip } from 'antd'
import _ from 'lodash'
import PropTypes from 'prop-types'
import { useState } from 'react'

const Option = Select.Option

export default function ClassAttributes(props) {

  const { editEventClassAttr = [], setEventClassAttr, dimensions, classAttr } = props
  const [state, setState] = useState({
    isLoading: false,
    searchDimKey: '',
    searchAttrKey: ''
  })

  if (!classAttr || !classAttr.length) {
    return <div className="aligncenter" >没有可选属性</div>
  }

  const addEventAttributes = () => {
    setEventClassAttr([...editEventClassAttr, { dim: '', cls: '' }])
  }

  const delEventAttributes = (index) => {
    setEventClassAttr(editEventClassAttr.filter((p, i) => i !== index))
  }

  const updateEventAttributes = (index, val, type) => {
    let newEventClassAttr = _.cloneDeep(editEventClassAttr)
    _.set(newEventClassAttr, [index, type], val)
    setEventClassAttr(newEventClassAttr)
  }

  const data = editEventClassAttr.length ? editEventClassAttr : [{ dim: '', cls: '' }]

  const onSearchAttr = _.debounce(val => {
    setState({
      ...setState,
      searchAttrKey: val
    })
  }, 800)

  const onSearchDim = _.debounce(val => {
    setState({
      ...setState,
      searchDimKey: val
    })
  }, 800)

  return (
    <div>
      {
        data.map((p, i) => {
          return (
            <div key={`attrs-${i}`} className="mg1b">
              <Select
                value={p.dim}
                key={`attrs-dim-${i}`}
                className="width120 mg1r itblock"
                showSearch
                onChange={(val) => updateEventAttributes(i, val, 'dim')}
                filterOption={(input, option) =>
                  option?.children?.props?.title?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {
                  (state.searchDimKey
                    ? dimensions.filter(p => _.includes(p.title, state.searchDimKey) || _.includes(p.name, state.searchDimKey))
                    : dimensions)
                    .map((dim, j) => (
                      <Option
                        key={`cls-item-${j}`}
                        value={dim.name}
                      >
                        <Tooltip title={dim.title || dim.name}>{dim.title || dim.name}</Tooltip>
                      </Option>
                    ))
                }
              </Select>
              :
              <Select
                value={p.cls}
                className="width120 mg1x itblock"
                key={`attrs-cls-${i}`}
                showSearch
                onChange={(val) => updateEventAttributes(i, val, 'cls')}
                filterOption={(input, option) =>
                  option?.children?.props?.title?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {
                  (state.searchAttrKey
                    ? classAttr.filter(p => _.includes(p, state.searchAttrKey))
                    : classAttr)
                    .map((v, j) => (
                      <Option
                        key={`cls-item-${j}`}
                        value={v}
                      >
                        <Tooltip title={v}>{v}</Tooltip>
                      </Option>
                    ))
                }
              </Select>
              <a onClick={() => { delEventAttributes(i) }}>
                <CloseOutlined className="font16 color-red mg1t pd1t" />
              </a>
            </div>
          )
        })

      }
      <div className="alignright">
        <a
          className="pointer"
          onClick={() => addEventAttributes()}
          title="添加属性"
        >
          <PlusCircleOutlined className="mg1r" />
          添加一个属性
        </a>
      </div>
    </div>
  )
}

ClassAttributes.prototype = {
  editEventClassAttr: PropTypes.array.isRequired, // 已设置的属性
  setEventClassAttr: PropTypes.func.isRequired, // 设置控件隐藏属性上报
  dimensions: PropTypes.array.isRequired, // 维度信息集合
  classAttr: PropTypes.array.isRequired // 原生控件额外属性
}
