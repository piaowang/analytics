export const lifeCycleItems = [
  { name: '引入期', memo: '距今1个消费间隔周期内注册，且累计无订单成交' },
  { name: '发展期', memo: '距今1个消费间隔周期内有成交或有交互行为，且累计1-2个订单成交' },
  { name: '成熟期', memo: '距今1个消费间隔周期内有成交或有交互行为，且累计至少3个订单成交' },
  { name: '衰退期', memo: '距今1个消费间隔周期内没有成交或有交互行为，且累计至少1个订单成交' },
  { name: '流失期', memo: '距今2个消费间隔周期内没有成交或有交互行为，且累计至少1个订单成交' }
]
export const userValueItems = [
  { name: 'A', title: 'A类业绩占比', value: 0.5 },
  { name: 'B', title: 'B类业绩占比', value: 0.3 },
  { name: 'C', title: 'C类业绩占比', value: 0.2 }
]
export const rfmItems = [
  { title: '最近一次消费', key: 'R', value: 2 },
  { title: '消费频率', key: 'F', value: 2 },
  { title: '累计消费金额', key: 'M', value: 2 }
]

export const pickProps = [
  { key: 'id', defaultValue: '' },
  { key: 'type', defaultValue: 2 },
  { key: 'datasets.tag_filters', defaultValue: [] },
  { key: 'datasets.trade_filters', defaultValue: {} },
  { key: 'datasets.behavior_filters', defaultValue: {} },
  { key: 'timers.autoCalc', defaultValue: 0 },
  { key: 'timers.cronInfo', defaultValue: {} }
]

export const rfmProps = [...rfmItems.map(p => ({ key: `params.${p.key}`, defaultValue: p.value })), { key: 'params.type', defaultValue: '' }]
export const userValueProps = userValueItems.map((p, i) => ({ key: `params.tier.${i}`, defaultValue: { id: i + 1, name: `Tier${p.name}`, percent: p.value } }))
export const lifeCycleProps = []
