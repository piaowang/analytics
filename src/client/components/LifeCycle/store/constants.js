/** 默认生命周期阶段 */
export const defaultStages = [
  {
    stage: '引入期',
    description: '最近30天有浏览但历史无购'
  },
  {
    stage: '发展期',
    description: '最近30天有浏览且历史购买1-2单'
  },
  {
    stage: '成熟期',
    description: '最近30天有浏览且历史购买大于2单'
  },
  {
    stage: '衰退期',
    description: '最近30天内未浏览，最近30-60天有浏览'
  },
  {
    stage: '流失期',
    description: '超过60天没有浏览'
  }
]

export const defaultMeasure = {
  relation: 'and',
  filters: []
}

export const UNTILTYPE = {
  preDay: 'preDay',
  preWeek: 'preWeek',
  DIY: 'DIY'
}
