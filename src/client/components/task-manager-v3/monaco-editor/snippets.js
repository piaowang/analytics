import keywords from './keyword'
import _ from 'lodash'

export default class Snippets {
  SORT_TEXT
  customKeywords
  dbKeywords
  monaco
  dbCatalog
  getDatabaseHandeler
  getTableHandeler
  dbType

  constructor(monaco, customKeywords = [], dbCatalog = {}, dbType) {
    this.SORT_TEXT = {
      Catalog: '0',
      Database: '1',
      Table: '2',
      Column: '3',
      Keyword: '4'
    }
    this.customKeywords = customKeywords
    this.dbKeywords = [..._.get(keywords, [dbType], []), ...customKeywords]
    this.dbCatalog = dbCatalog
    this.monaco = monaco
    this.getKeywordSuggest = this.getKeywordSuggest.bind(this)
    this.dbType = dbType
  }

  /**
   * 别名映射记录
   */
  asNameMap = {}

  /**
   * 动态设置数据目录
   * @param catalog
   */
  setCatalog(dbCatalog) {
    this.dbCatalog = dbCatalog
  }

  /**
   * 获取以逗号或空白符分隔的数组
   * @param str
   */
  getArrayBySplit(str) {
    return str
      .trim()
      .replace(/[\"\'\;]/gi, '')
      .split(/[,\s+]/)
  }

  /**
   * monaco提示方法
   * @param {*} model
   * @param {*} position
   */
  async provideCompletionItems(model, position) {
    const { lineNumber, column } = position
    // 获取当前焦点前面的SQL内容
    let textBeforePointer = model.getValueInRange({
      // startLineNumber: lineNumber,
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: lineNumber,
      endColumn: column
    })
    // 获取所有SQL内容
    let textAllContent = model.getValue()
    const tokens = this.getArrayBySplit(textAllContent)
    // 清空别名映射
    this.asNameMap = {}
    _.map(tokens, (a, i) => {
      if (_.toLower(a) === 'as') {
        const last = tokens[i - 1] && _.toLower(tokens[i - 1])
        const next = tokens[i + 1] && _.toLower(tokens[i + 1])
        if (next) {
          this.asNameMap[next] = last
        }
      }
    })
    // const tokensBeforePointer = this.getArrayBySplit(textBeforePointer)
    // let lastToken = tokensBeforePointer[tokensBeforePointer.length - 1].toLowerCase()
    return {
      suggestions: [...this.getKeywordSuggest()]
    }
    // if (lastToken === 'from' || lastToken === 'join') {
    //   return {
    //     suggestions: await this.getTableSuggest('', '')
    //   }
    // }

    // if (lastToken === 'where' || lastToken === 'on') {
    //   const field = await this.getFieldSuggest('', '', '')
    //   return {
    //     suggestions: [...this.getKeywordSuggest(), ...field, ...this.getTableSuggest('', '')]
    //   }
    // }
    // const val = _.endsWith(lastToken, '.') ? lastToken.split('.') : ''
    // let [tableName, fieldName] = val
    // if (lastToken === 'as') {
    //   return {
    //     suggestions: []
    //   }
    // } else if (tableName) {
    //   const mapName = this.asNameMap[_.toLower(tableName)]
    //   if (mapName && _.keys(_.get(this.dbCatalog, ['tables', mapName], {})).length) {
    //     tableName = mapName
    //   }
    //   let database = _.get(this.dbCatalog, ['tables', tableName], {})
    //   if (fieldName) {
    //     return {
    //       suggestions: [...this.getKeywordSuggest()]
    //     }
    //   }
    //   if (_.isEmpty(database.fields) && database.id) {
    //     const { result } = await getColumnData({ params: { tableId: database.id } })
    //     if (result.length) {
    //       const data = result.map((p: any) => ({
    //         id: p.column_ID,
    //         key: 'cl_' + p.column_ID,
    //         name: p.column_NAME,
    //         alias: p.column_NAME_CH,
    //         version: p.column_VERSON,
    //         type: 'column'
    //       }))
    //       this.dbCatalog = _.set(this.dbCatalog, ['tables', tableName, 'fields'], data)
    //       return {
    //         suggestions: await this.getFieldSuggest('', '', tableName)
    //       }
    //     }
    //   }
    //   return {
    //     suggestions: await this.getFieldSuggest('', '', tableName)
    //   }
    //   // 表名联想
    // } else {
    //   return {
    //     suggestions: [...this.getKeywordSuggest(), ...this.getTableSuggest('', '')]
    //   }
    // }
  }

  /**
   * 获取自定义联想建议
   */
  getCustomSuggest() {
    return this.customKeywords.map(this.getKeywordSuggest)
  }

  /**
   * 获取目录联想联想建议
   */
  getCatalogSuggest() {
    return _.values(this.dbCatalog).map(cl => {
      return {
        id: cl.id,
        label: cl.name,
        kind: this.monaco.languages.CompletionItemKind.Keyword,
        detail: `<catalog>`,
        sortText: this.SORT_TEXT.Catalog,
        insertText: cl.name
      }
    })
  }

  /**
   * 获取数据库库名联想建议
   */
  async getDataBaseSuggest(selectCatalog) {
    const data = _.values(_.get(this.dbCatalog, [selectCatalog, 'database'], {})).map(db => {
      return {
        id: db.id,
        label: db.name,
        kind: this.monaco.languages.CompletionItemKind.Keyword,
        detail: `<database>`,
        sortText: this.SORT_TEXT.Database,
        insertText: db.name
      }
    })
    return data
  }

  /**
   * 获取关键字联想建议
   * @param {*} keyword
   */
  getKeywordSuggest() {
    return this.dbKeywords.map(keyword => ({
      label: keyword,
      kind: this.monaco.languages.CompletionItemKind.Keyword,
      detail: '',
      sortText: this.SORT_TEXT.Keyword,
      // Fix插入两个$符号
      insertText: keyword.startsWith('$') ? keyword.slice(1) : keyword
    }))
  }

  /**
   * 获取数据库表名建议
   */
  getTableSuggest(selectCatalog, selectDatabase) {
    let path = []
    if (this.dbType === 'standard') {
      path = [selectCatalog, selectDatabase, 'tables'].filter(_.identity)
    } else {
      path = [selectCatalog, 'database', selectDatabase, 'tables'].filter(_.identity)
    }
    return _.values(_.get(this.dbCatalog, path, {})).map(table => ({
      id: table.id,
      label: table.name,
      kind: this.monaco.languages.CompletionItemKind.Module,
      detail: '<table>',
      sortText: this.SORT_TEXT.Table,
      insertText: table.name
    }))
  }

  getFieldSuggest(selectCatalog = '', selectDatabase = '', selectTable = '') {
    let data = []
    if (selectTable === '') {
      const path = [selectCatalog, 'database', selectDatabase, 'tables'].filter(_.identity)
      data = _.flatten(_.values(_.get(this.dbCatalog, path, {})).map(p => p.fields))
    } else {
      const path =
        this.dbType === 'standard'
          ? [selectCatalog, selectDatabase, 'tables', selectTable, 'fields'].filter(_.identity)
          : [selectCatalog, 'database', selectDatabase, 'tables', selectTable, 'fields'].filter(_.identity)
      data = _.values(_.get(this.dbCatalog, path))
    }
    return data.map(filed => ({
      id: filed.id,
      label: filed.name,
      kind: this.monaco.languages.CompletionItemKind.Module,
      detail: '<field>',
      sortText: this.SORT_TEXT.Column,
      insertText: filed.name
    }))
  }
  /**
   * 获取所有表字段
   * @param {*} table
   * @param {*} column
   */
  async getTableColumnSuggest() {
    const defaultFields = []
    this.dbCatalog.forEach(db => {
      db.tables.forEach(table => {
        table.tableColumns.forEach(field => {
          defaultFields.push({
            label: field.fieldName,
            kind: this.monaco.languages.CompletionItemKind.Module,
            detail: '<field>',
            sortText: this.SORT_TEXT.Column,
            insertText: field.fieldName
          })
        })
      })
    })
    const asyncFields = []
    return [...defaultFields, ...asyncFields]
  }
}
