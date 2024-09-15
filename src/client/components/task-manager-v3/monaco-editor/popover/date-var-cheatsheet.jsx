import React from 'react'
import {Row, Col, Divider} from 'antd'
import classNames from 'classnames'
import moment from 'moment'

const data = {
  '年 Year': [
    {
      name: '今年',
      expr: '${_year}',
      val: moment().format('YYYY')
    },
    {
      name: '明年',
      expr: '${_year + 1}',
      val: moment().add(1, 'y').format('YYYY')
    }
  ],
  '日期 Date': [
    {
      name: '当前日期',
      expr: '${_date}',
      val: moment().format('YYYY-MM-DD')
    },
    {
      name: '后一天',
      expr: '${_date + 1}',
      val:  moment().add(1, 'd').format('YYYY-MM-DD')
    },
    {
      name: '前一天（格式化）',
      expr: '${_date - 1 % yyyyMMdd}',
      val:  moment().subtract(1, 'd').format('YYYYMMDD')
    }
  ],
  '小时 Hour': [
    {
      name: '小时',
      expr: '${_hour}',
      val: moment().format('YYYY-MM-DD HH')
    },
    {
      name: '上一小时',
      expr: '${_hour - 1 }',
      val: moment().subtract(1, 'h').format('YYYY-MM-DD HH')
    },
    {
      name: '下一小时（格式化）',
      expr: '${_hour +1  % yyyyMMdd-HH}',
      val: moment().add(1, 'h').format('YYYYMMDD-HH')
    }
  ],
  '分钟 Minute': [
    {
      name: '当前分钟',
      expr: '${_minute}',
      val: moment().format('YYYY-MM-DD HH:mm')
    },
    {
      name: '上一分钟',
      expr: '${_minute-1}',
      val: moment().subtract(1, 'm').format('YYYY-MM-DD HH:mm')
    },
    {
      name: '当前分钟（格式化）',
      expr: '${_minute % yyyyMMdd HH:mm}',
      val: moment().format('YYYYMMDD HH:mm')
    }
  ],
  '月 Month': [
    {
      name: '当前月',
      expr: '${_month}',
      val: moment().format('YYYY-MM')
    },
    {
      name: '上一个月',
      expr: '${_month - 1}',
      val: moment().subtract(1, 'M').format('YYYY-MM')
    },
    {
      name: '上一个月（格式化）',
      expr: '${_month - 1 %yyyyMM}',
      val: moment().subtract(1, 'M').format('YYYYMM')
    },
    {
      name: '当前月的第一天',
      expr: '${_month.start}',
      val: moment().startOf('month').format('YYYY-MM-DD')
    },
    {
      name: '上个月的最后一天',
      expr: '${_month.start - 1}',
      val: moment().subtract(1, 'M').endOf('month').format('YYYY-MM-DD')
    },
    {
      expr: '${_month.start% yyyyMMdd}',
      val: moment().startOf('month').format('YYYYMMDD')
    },
    {
      name: '当前月的最后一天',
      expr: '${_month.end}',
      val: moment().endOf('month').format('YYYY-MM-DD')
    },
    {
      name: '下个月的第一天',
      expr: '${_month.end+1}',
      val: moment().add(1, 'M').startOf('month').format('YYYY-MM-DD')
    },
    {
      name: '当前月的倒数第二天（格式化）',
      expr: '${_month.end - 1% yyyyMMdd}',
      val: moment().endOf('month').subtract(1, 'd').format('YYYYMMDD')
    }
  ],
  '周 Week': [
    {
      name: '当前周的开始日期',
      expr: '${_week.start}',
      val: moment().startOf('week').format('YYYY-MM-DD')
    },
    {
      name: '下一周的开始日期',
      expr: '${_week.start+7}',
      val: moment().add(1, 'w').startOf('week').format('YYYY-MM-DD')
    },
    {
      name: '当前周的最后一日',
      expr: '${_week.end}',
      val: moment().endOf('week').format('YYYY-MM-DD')
    },
    {
      name: '上一周的最后一日',
      expr: '${_week.end-7}',
      val: moment().subtract(1, 'w').endOf('week').format('YYYY-MM-DD')
    },
    {
      name: '下一周的最后一日（格式化）',
      expr: '${_week.end+7% yyyyMMdd}',
      val: moment().add(1, 'w').endOf('week').format('YYYYMMDD')
    }
  ]
}

export default class DateVarCheatSheet extends React.Component {
  render() {
    let seq = ['name', 'expr', 'val']
    return (
      <Row gutter={5} style={{ width: '600px', height: '550px', overflowY: 'auto'}}>
        {Object.keys(data).map((title, i) => {
          let arr = data[title]
          return (
            <Col span={24} key={i}>
              <Divider className="task-params-divider-padding">{title}</Divider>
              <Row style={{padding: '0 10px 10px 5px'}}>
                {arr.map((o, idx) => {
                  return seq.map((key, i) => {
                    return (
                      <Col
                        key={`${idx}-${key}`}
                        className={classNames('line-height25', {alignright: key === 'val'})}
                        span={i === 2 ? 6 : 9}
                      >{o[key]}</Col>
                    )
                  })
                })}
              </Row>
            </Col>
          )
        })}
      </Row>
    )
  }
}
