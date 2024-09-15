class Component {
  id;
  screen_id;
  title;          // 组件标题
  type;       // 组件类型[table, bar, line, pie ....]
  style_config;   // 组件样式配置

  /**
   *  dataSourceId;                 // 组件数据源配置
      since;                        // 数据范围起点
      until;                        // 数据范围结束
      timezone = 'Asia/Shanghai';   // 时区
      metrics;                      // 指标
      tempMetrics;                  // 维度形成的临时指标
      granularity = 'P1D';          // 时间间隔
      groupByAlgorithm = 'groupBy'; // 分布方法
      interval;                     // 刷新间隔
   *
   *
   * @memberOf Component
   */
  data_source_config;

  // == 以下为定位属性 == //

  left;
  top;
  width;
  height;
  zIndex;
  offset; // 移动偏移

  constructor(screenComp) {
    if (screenComp && typeof screenComp === 'object') {
      const keys = Object.keys(screenComp)
      keys.forEach(key => this[key] = screenComp[key])
    }
  }
}

export default Component
