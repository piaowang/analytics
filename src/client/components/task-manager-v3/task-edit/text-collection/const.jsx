export const PREFIX = 'text-collection'

export const TEXT_COLLECTION_SELECT_ITENS = ['TXT', 'XML']

export const READER_TYPES = ['line_reader', 'xml_reader']

export const SELECTED_FILES_TABLE_COLUMNS = [{
  dataIndex: 'collectPath',
  title: '采集路径'
}, {
  dataIndex: 'collectFileRegex',
  title: '通配符',
  width: 150,
  componentConfig: {
    defaultValue: '.*'
  }
}]

export const TXT_OUTPUT_TABLE_COLUMNS = [{
  dataIndex: 'columnIndex',
  title: '位置',
  componentConfig: {
    defaultValue: 0
  }
}, {
  dataIndex: 'columnLength',
  title: '长度',
  componentConfig: {
    defaultValue: 0
  }
}, {
  dataIndex: 'finalCol',
  title: '目标字段名'
}, {
  dataIndex: 'finalType',
  title: '目标类型'
}, {
  dataIndex: 'finalComment',
  title: '目标描述',
  config: {
    rules: [{ required: false }]
  }
}]

export const XML_OUTPUT_TABLE_COLUMNS = [{
  dataIndex: 'sourceCol',
  title: '源字段名称'
}, {
  dataIndex: 'xmlPath',
  title: 'XML路径'
}, {
  dataIndex: 'xType',
  title: '节点',
  type: 'select',
  componentConfig: {
    defaultValue: 'node',
    options: [{ 
      value: 'node', 
      label: '节点'
    }, {
      value: 'attr', 
      label: '属性'
    }]
  }
}, {
  dataIndex: 'sourceType',
  title: '源字段类型'
}, {
  dataIndex: 'finalCol',
  title: '目标字段名'
}, {
  dataIndex: 'finalType',
  title: '目标类型'
}, {
  dataIndex: 'finalComment',
  title: '目标描述',
  itemConfig: {
    rules: [{ required: false }]
  }
}]

export const COMMON_OPERATION = [{
  dataIndex: 'operation',
  title: '操作',
  width: 100,
  align: 'center'
}]

export const CALA_TEXT = {
  add: 'add',
  subtract: 'subtract'
}

export const INLINE_STYLE = {
  labelCol: {
    md: 6,
    xl: 6,
    xxl: 4
  },
  wrapperCol: {
    md: 18,
    xl: 14,
    xxl: 12
  },
  className: 'inline-style'
}

export const COMMON_STYLE = {
  labelCol: {
    md: 3,
    xl: 3,
    xxl: 2
  },
  wrapperCol: {
    md: 21,
    xl: 21,
    xxl: 22
  },
  className: 'common-style'
}

export const TXT_TABLE_ITEM_CONFIG = {
  haveSeparator: COMMON_STYLE,
  separator: INLINE_STYLE,
  headLine: INLINE_STYLE,
  tailLine: {
    ...INLINE_STYLE,
    className: `${INLINE_STYLE.className} bottom-item`
  },
  toDataBase: INLINE_STYLE,
  toDataSource: INLINE_STYLE,
  selectData: {
    ...COMMON_STYLE,
    wrapperCol: {
      xl: 19,
      xxl: 18
    }
  }
}

export const XML_TABLE_ITEM_CONFIG = {
  xPathExpression: {
    ...COMMON_STYLE,
    wrapperCol: {
      md: 21,
      xl: 19,
      xxl: 18
    },
    className: `${COMMON_STYLE.className} bottom-item`
  },
  toDataBase: {
    ...INLINE_STYLE,
    className: 'inline-style-3'
  },
  toDataSource: {
    ...INLINE_STYLE,
    className: 'inline-style-3'
  }
}

export const TEXT_COLL_FORM_DEFAULT_VAL = {
  headLine: 0,
  tailLine: 0
}

export const MESSAGE_INFO = {
  PATH_INFO: '请先配置采集路径',
  SAVE_INFO: '请先保存表格中编辑状态的内容',
  ORIGIN_INFO: '请先选择 \'循环读取路径\'',
  PATH_ERROR: '请填写正确的采集路径'
}
