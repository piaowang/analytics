/**
 * Created on 27/04/2017.
 */

import _ from 'lodash'
import { Select, Tooltip, Popconfirm, Input, InputNumber, DatePicker } from 'antd'
import Ot  from './object-tool'
import { create, dateFormatTipsWrapper } from './gen-conf'
import Timezone from './timezone'
import { TIME_FORMAT_LIST } from '../constants'
import moment from 'moment'

const Configurations = create([
  {
    label: '接入类型',
    key: 'type',
    path: Ot.createPath(['type'])
  },

  {
    label: '数据文件格式',
    key: 'format',
    path: Ot.createPath('spec.dataSchema.parser.parseSpec.format'.split('.'))
  },
  {
    label: '数据源的名称',
    key: 'dataSource',
    path: Ot.createPath('spec.dataSchema.dataSource'.split('.'))
  },
  {
    label: '解析器类型',
    key: 'parser_type',
    path: Ot.createPath('spec.dataSchema.parser.type'.split('.'))
  },
  {
    label: '分隔符',
    key: 'listDelimiter',
    visible: true,
    path: Ot.createPath('spec.dataSchema.parser.parseSpec.listDelimiter'.split('.'))
  },
  {
    label: '数据文件路径',
    key: 'paths',
    path: Ot.createPath('spec.ioConfig.inputSpec.paths'.split('.'))
  },
  {
    label: '时间列',
    key: 'timestampSpec_column',
    path: Ot.createPath('spec.dataSchema.parser.parseSpec.timestampSpec.column'.split('.')),
    visible: true,
    element(record, parent, props, state){

      const { ot, advance, base } = state
      const { form: { getFieldDecorator, getFieldValue } } = props
      const path = record.path
      const dimensionRecord = advance.concat(base).find(r => r.key === 'dimensions')
      const dimension = ot.get(dimensionRecord.path)
      const list = advance.concat(base)

      // 如果column已选中，那么可以设置format
      const column = getFieldValue('timestampSpec_column')
      let def = ot.get(path), dim

      if (column) {
        dim = dimension.find(d => d.name === column)
        def = dim ? dim.format : def
        let format = list.find(r => r.key === 'timestampSpec_format')
        if (format) ot.set(format.path, def)
      }

      return getFieldDecorator(
        record.key,
        record.getFieldOptions(record.get(ot.get(path)))
      )(
        <Select>
          {dimension.filter(d => d.type === 'date').map((d, i) => (
            <Select.Option
              key={i}
              value={d.name}
            >{d.name}</Select.Option>
          ))}
        </Select>
      )
    }
  },
  {
    label: '时间格式',
    key: 'timestampSpec_format',
    path: Ot.createPath('spec.dataSchema.parser.parseSpec.timestampSpec.format'.split('.')),
    visible: false,
    element(record, parent, props, state){

      const { ot, advance, base } = state
      const { form: { getFieldDecorator, getFieldValue } } = props
      const key = record.key
      const path = record.path
      const list = advance.concat(base)

      // 如果column已选中，那么可以设置format
      const column = getFieldValue('timestampSpec_column')
      let def = ot.get(path), dim

      if (column) {
        const dimensionRecord = list.find(r => r.key === 'dimensions')
        const dimensions = ot.get(dimensionRecord.path)
        dim = dimensions.find(d => d.name === column)
        def = dim ? dim.format : def
      }

      return dateFormatTipsWrapper(
        getFieldDecorator(
          key,
          record.getFieldOptions(record.get(def))
        )(
          <Select>
            {
              TIME_FORMAT_LIST.map(r => (
                <Select.Option
                  key={r.value}
                  value={r.value}
                >
                  {r.name}
                </Select.Option>
              ))
            }
          </Select>
        )
      )
    }
  },
  {
    label: '时区',
    key: 'timestampSpec_timeZone',
    path: Ot.createPath('spec.dataSchema.parser.parseSpec.timestampSpec.timeZone'.split('.')),
    visible: true,
    element(record, parent, props, state){

      const { ot } = state
      const { form: { getFieldDecorator } } = props
      const key = record.key
      const path = record.path
      return getFieldDecorator(
        key,
        record.getFieldOptions(record.get(ot.get(path)))
      )(
        <Select className="width-100">
          {
            Timezone.map(t => (
              <Select.Option key={t.name} value={t.value}>
                <Tooltip
                  title={(
                    <p style={{ wordBreak: 'break-all' }}>
                      {t.locations.join(', ')}
                    </p>
                  )}
                  placement="left"
                >
                  <span>{t.name}</span>
                </Tooltip>
              </Select.Option>
            ))
          }
        </Select>
      )
    }
  },
  {
    label: '维度',
    key: 'dimensions',
    path: Ot.createPath('spec.dataSchema.parser.parseSpec.dimensionsSpec.dimensions'.split('.'))
  },
  {
    label: '列名',
    key: 'columns',
    path: Ot.createPath('spec.dataSchema.parser.parseSpec.columns'.split('.'))
  },

  // === granularity start ====
  // 粒度
  {
    label: '时间戳范围',
    key: 'intervals',
    visible: true,
    path: Ot.createPath('spec.dataSchema.granularitySpec.intervals'.split('.')),
    set(record, list, value, ot){
      // format: [moment, moment]
      const FORMAT = 'YYYY-MM-DD'
      return record.get(value[0].format(FORMAT).concat('/').concat(value[1].format(FORMAT)))
    },
    get(value){
      // format: '2017-01-1/2017-02-02'
      // to: ['2017-01-1/2017-02-02']
      return [value]
    },
    /**
     * @param {Array<String>} value
     * @return {Array<moment>}
     */
    parse(value){
      return value[0] ? value[0].split('/').map(t => moment(t)) : []
    },
    element(record, parent, props, state){
      const { ot } = state
      const { form: { getFieldDecorator } } = props
      const value = record.parse(ot.get(record.path))
      return getFieldDecorator(
        record.key,
        record.getFieldOptions(value)
      )(
        <DatePicker.RangePicker style={{width: '100%'}} />
      )
    },
    getFieldOptions(initialValue){
      return {
        rules: [
          { required: true, message: '必填项' }
        ],
        initialValue
      }
    }
  },
  {
    label: '粒度类型',
    key: 'granularity.type',
    path: Ot.createPath('spec.dataSchema.granularitySpec.type'.split('.'))
  },
  {
    label: '段粒度',
    key: 'segmentGranularity',
    path: Ot.createPath('spec.dataSchema.granularitySpec.segmentGranularity'.split('.')),
    visible: true,
    element(record, parent, props, state){
      const values = 'SECOND|MINUTE|FIVE_MINUTE|TEN_MINUTE|FIFTEEN_MINUTE|HOUR|SIX_HOUR|DAY|MONTH|YEAR'.split('|')
      const { ot } = state
      const { form: { getFieldDecorator } } = props
      // 根据每天的数据量进行设置。 小数据量建议DAY，大数据量（每天百亿）可以选择HOUR

      return (
        <Popconfirm
          placement="right"
          title={(
            <div>
              <p>根据每天的数据量进行设置</p>
              <p>小数据量建议DAY</p>
              <p>大数据量（每天百亿）可以选择HOUR</p>
            </div>
          )}
        >
          <div>
            {getFieldDecorator(
              record.key,
              record.getFieldOptions(record.get(ot.get(record.path)))
            )(
              <Select>
                {values.map((d, i) => (
                  <Select.Option
                    key={i}
                    value={d}
                  >{d}</Select.Option>
                ))}
              </Select>
            )}
          </div>
        </Popconfirm>
      )
    }
  },
  // === granularity end ====

  // === tuningConfig start ====
  {
    label: '源数据类型',
    key: 'tuningConfig_type',
    path: Ot.createPath('spec.tuningConfig.type'.split('.'))
  },
  {
    label: '段落分片数',
    key: 'numShards',
    visible: true,
    path: Ot.createPath('spec.tuningConfig.partitionsSpec.numShards'.split('.')),
    element(record, parent, props, state){
      const { ot } = state
      const { form: { getFieldDecorator } } = props

      return (
        <Popconfirm
          placement="right"
          title={(
            <div>
              <p>如果按粒度分片之后数据量依然较大</p>
              <p>可以在此指定每个粒度下的数据分片数量</p>
            </div>
          )}
        >
          <div>
            {getFieldDecorator(
              record.key,
              record.getFieldOptions(record.get(ot.get(record.path)))
            )(<InputNumber min={1} step={1} />)}
          </div>
        </Popconfirm>
      )
    },
    getFieldOptions(initialValue){
      return {
        rules: [
          { type: 'integer', message: '该字段数据为整数型' },
          { required: true, message: '必填项' }
        ],
        initialValue
      }
    }
  },
  {
    label: 'jobProperties',
    key: 'jobProperties',
    path: Ot.createPath('spec.tuningConfig.jobProperties'.split('.'))
  }
  // === tuningConfig end ====
])

/**
 * @param keys
 * @return {Array.<ConfItem>}
 */
function getConf (keys) {
  keys = _.uniq(keys)
  return Configurations.filter(conf => keys.includes(conf.key))
}

const BaseConfKeys = [
  'type',
  'dataSource',
  'paths',
  'timestampSpec_column',
  'timestampSpec_format',
  'dimensions',
  'intervals',
  'tuningConfig_type',
  'segmentGranularity',
  'numShards'
]

const AdvanceConfKeys = [
  'parser_type'
]

/**
 * @param {String} key
 * @param {Ot} ot
 * @return {*}
 */
function get (key, ot) {
  const record = getRecord(key)
  if (!record) return null
  return ot.get(record.path)
}

function getRecord (key) {
  return Configurations.find(r => r.key === key)
}

export {
  getConf,
  get,
  getRecord,
  BaseConfKeys,
  AdvanceConfKeys
}
