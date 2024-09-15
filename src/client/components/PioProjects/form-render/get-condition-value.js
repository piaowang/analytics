/**
 * 添加静态方法getConditionValue，返回一个有效值的数组
 */
export default function(target) {
  target.getConditionValue = function (condition) {
    const { fulfillingOptions, possibleOptions, conditionValue } = condition
    return fulfillingOptions ? fulfillingOptions.map(o => possibleOptions[o]) : [conditionValue]
  }
}
