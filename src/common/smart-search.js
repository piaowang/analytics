const CapitalLettersPattern = /[A-Z]/

export default function smartSearch(keyword, toSearch = '') {
  // 如果 keyword 带有大写，则进行精确匹配，只有小写字母则进行模糊匹配
  if (!keyword) {
    return true
  }
  if (!toSearch) {
    return false
  }
  if (CapitalLettersPattern.test(keyword)) {
    return toSearch.indexOf(keyword) !== -1
  }
  return toSearch.toString().toLowerCase().includes(keyword)
}
