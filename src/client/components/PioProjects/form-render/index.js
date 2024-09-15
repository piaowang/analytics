
import Default from './default'
import {inputTypeMap} from './contants'
import BasicInput from './basic-input'
import Textarea from './textarea'
import CatSelectDom from './cat-select-dom'
import DynamicCategory from './dynamic-category'
import Category from './category'
import BoolDom from './bool-dom'
import ParameterTypeCompare from './parameter-type-compare'
import SelectInput from './select-input'
import FileUpload from './file-upload'
import ListDom from './list'
import CharInput from './char-input'
import AttributerSelecter from './attribute-selecter'
import CsvUpload from './csv-upload'

/**
 * 过滤掉不需要显示的表单项
 * @param {param[]} params 
 * @param {Object} data  unitData
 * @returns {param[]}
 */
export function itemFilter(params, data) {
  return params.map(param => {
    const { conditions = [] } = param
    let newParam = Object.assign({},param)
    if(!newParam.isHidden)
      conditions.forEach(con => {
        let key = con.conditionParameter
        if(!key) return
        let type = (params.find(p => p.key === key) || {}).paramType || 'default'

        //后台存储和传输过来的value都是string类型，所以全部转成string来比较，除了null和undefined        
        let values = map[type].getConditionValue(con).map(toString)
        let value = data.parameters.keyToValueMap[key]
        let altValue = typeof value === 'undefined'
          ? false
          : value
        value = toString(value)
        altValue = toString(altValue)
        if(
          !values.includes(value) &&
          !values.includes(altValue)
        ) {
          newParam.isHidden = true
        }
      })
    return newParam
  })
}

const toString = v => (typeof v === 'undefined' || v === null) ? v : v.toString()

const basicInputMap = Object.keys(inputTypeMap).reduce((prev, curr) => {
  prev[curr] = BasicInput
  return prev
}, {})

const map = {
  default: Default,
  ...basicInputMap,
  param_type_text: Textarea,
  param_type_attributes: AttributerSelecter,
  param_type_attribute: AttributerSelecter,
  param_type_dynamic_category: DynamicCategory,
  param_type_category: Category,
  param_type_string_category: CatSelectDom,
  param_type_boolean: BoolDom,
  ParameterTypeCompare: ParameterTypeCompare,
  param_type_date_format: SelectInput,
  param_type_file: FileUpload,
  param_type_list: ListDom,
  ParameterTypeChar: CharInput,
  param_type_csv_file: CsvUpload
}

export default (type) => {
  return map[type] || map.default
}
