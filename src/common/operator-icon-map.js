
let iconGroupMap = {
  'bulb': ['default'],
  'database': ['数据源', 'dataSource'],
  'filter': ['数据处理', 'filtering', 'sampling', 'normalization', 'aggregation'],
  'appstore-o': ['算法建模', 'regression', 'clustering', 'deepLearning', 'modelApply'],
  //三级
  'exception': ['fieldSetting', '字段设置'],
  'tags': ['classification', '分类算法'],
  'link': ['association', '关联算法'],
  'smile-o': ['modelPerformance', '模型评估']
}

exports.operatorIconMap = Object.keys(iconGroupMap).reduce((prev, key) => {
  iconGroupMap[key].forEach(group => prev[group] = key)
  return prev
}, {})

exports.iconExtraMap = {
  'code-o': 'codesquareo',
  'file': 'file1',
  'file-text': 'filetext1',
  'bulb': 'bulb1',
  'exception': 'exception1',
  'appstore-o': 'appstore-o',
  'check-circle-o': 'checkcircleo'
}

//convert antd icon type to svg icon name
exports.convert = function(antdIconType) {
  if (exports.iconExtraMap[antdIconType]) return exports.iconExtraMap[antdIconType]
  return antdIconType.replace(/\-/g, '')
}

exports.getIcon = function(key) {
  return exports.operatorIconMap[key] || exports.operatorIconMap.default
}
