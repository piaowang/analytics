
import smartSearch from '../../common/smart-search'
import _ from 'lodash'

export const enableSelectSearch = {
  showSearch: true,
  optionFilterProp: 'children',
  notFoundContent: '没有内容',
  filterOption: (input, option) => {
    return smartSearch(input, option.children || _.get(option, 'option.options[0].children', ''))
  }
}

