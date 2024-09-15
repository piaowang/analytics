import {InputNumber, Select} from 'antd'
import _ from 'lodash'

const {Option} = Select

export const timeUnits = [
  {
    name: 'PT_M',
    title: '分钟',
    range: [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60],
    milli: 1000 * 60 //毫秒单位
  },
  {
    name: 'PT_H',
    title: '小时',
    range: [1, 2, 3, 4, 6, 8, 12, 24],
    milli: 1000 * 60 * 60
  },
  {
    name: 'P_D',
    title: '天',
    range: [1],
    milli: 1000 * 60 * 60 * 24
  },
  {
    name: 'P_W',
    title: '周',
    range: [1],
    milli: 1000 * 60 * 60 * 24 * 7
  },
  {
    name: 'P_M',
    title: '月',
    range: [1, 2, 3, 4, 6, 12],
    milli: 1000 * 60 * 60 * 24 * 30
  },
  {
    name: 'P_Y',
    title: '年',
    range: [1, 2, 4, 5],
    milli: 1000 * 60 * 60 * 24 * 365
  }
]

export const timeUnitsTree = timeUnits.reduce((prev, curr) => {
  prev[curr.name] = curr
  return prev
}, {})

export default function TimeGran (props) {

  let {slice, sliceUpdater} = props

  let granularity = _.get(slice, 'params.dimensionExtraSettingDict.__time.granularity') || 'P1D'
  let arr = granularity.match(/^(PT?)(\d+)([A-Z]+)$/)
  let prefix = arr[1]
  let count = arr[2]
  let unit = arr[3]
  let timeUnitName = prefix + '_' + unit
  let selectedItem = timeUnitsTree[timeUnitName] || timeUnits[0]
  //let range = computeRange(params, selectedItem)
  let range = selectedItem.range

  const onChangeCount = (count) => {
    sliceUpdater('params.dimensionExtraSettingDict', (oriDict = {}) => {
      let nextGranularity = prefix + count + unit
      return _.defaultsDeep({__time: {granularity: nextGranularity}}, oriDict)
    })
  }

  const onChangeUnit = (unit) => {
    let arr1 = unit.split('_')
    let item = timeUnitsTree[unit]
    //let range = computeRange(params, item)
    let range = item.range
    if (count > range[1] || count < range[0]) count = range[0]
    sliceUpdater('params.dimensionExtraSettingDict', (oriDict = {}) => {
      let nextGranularity = arr1[0] + count + arr1[1]
      return _.defaultsDeep({__time: {granularity: nextGranularity}}, oriDict)
    })
  }

  return (
    <div className="mg2t granularity-handler">
      <div className="color-grey">
        <span className="mg1r iblock">时间粒度</span>
      </div>
      <div>
        <div className="iblock width80 mg1r">
          <InputNumber
            value={count}
            min={range[0]}
            max={range[1]}
            className="iblock width-100"
            onChange={onChangeCount}
          />
        </div>
        <div className="iblock width60">
          <Select
            dropdownMatchSelectWidth={false}
            className="iblock width-100"
            value={selectedItem.name}
            onChange={onChangeUnit}
          >
            {
              timeUnits.map(tu => {
                return <Option key={tu.name} value={tu.name}>{tu.title}</Option>
              })
            }
          </Select>
        </div>
      </div>
    </div>
  )

}
