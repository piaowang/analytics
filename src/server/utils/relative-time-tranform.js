import moment from 'moment'
import {convertDateType} from '../../common/param-transform'
import _ from 'lodash'

const formulaReg = /\"@@[^@]+@@\"/g

//把指标公式相对时间转换成成绝对时间
//从
//$main.filter($ds.greaterThanOrEqual("@@startOf year,endOf year#0@@").and($ds.lessThanOrEqual("@@startOf year,endOf year#1@@"))).count()
//到
//$main.filter($ds.greaterThanOrEqual(1483200000000).and($ds.lessThanOrEqual(1514735999000))).count()
export const translateFormula = (formula) => {
  if (!formula) return formula
  if (!_.isString(formula)) {
    formula = `${formula}`
  }
  let arr = formula.match(formulaReg)
  if (!arr) return formula
  const relativeTimeToInt = formula.replace(formulaReg, match => {
    let [relative, index] = match.replace(/^\"@@|@@\"/g, '').split('#')
    relative = relative.includes(',')
      ? relative.split(',')
      : relative
    index = parseInt(index, 10)
    return moment(convertDateType(relative, 'iso')[index]).valueOf()
  })
  // $main.filter($ds.cast("NUMBER").greaterThanOrEqual(1483200000000).and($ds.cast("NUMBER").lessThanOrEqual(1514735999000))).count()
  return relativeTimeToInt.replace(/(\$[^.]+)(\.(?:greater|less)Than\w*\(\d+\))/g, '$1.cast("NUMBER")$2')
}
