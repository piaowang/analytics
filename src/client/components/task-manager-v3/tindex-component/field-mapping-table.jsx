import React from 'react'
import PropTypes from 'prop-types'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Table, Input, Select, message } from 'antd'
import './style.styl'
import _ from 'lodash'

const { Option } = Select

const EditableContext = React.createContext()

const EditableRow = ({ form, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
)

const EditableFormRow = Form.create()(EditableRow)

class EditableCell extends React.Component {
  state = {
    editing: false
  }

  toggleEdit = () => {
    const editing = !this.state.editing
    this.setState({ editing }, () => {
      if (editing) {
        this.input && this.input.focus()
      }
    })
  }

  save = e => {
    const { record, handleSave } = this.props
    const { form: { validateFields } } = this
    validateFields((error, values) => {
      if (error && error[e.currentTarget.id]) {
        return
      }
      this.setState({ editing: false })
      handleSave({ ...record, ...values })
    })
  }

  renderCell = form => {
    this.form = form
    const { children, dataIndex = '', record, title } = this.props
    const { editing } = this.state
    const initialValue = record[dataIndex]
    const component = dataIndex === '_type'
      ? (
        <Select
          onBlur={() => this.save()}
        >
          <Option value="string">string</Option>
          <Option value="int">int</Option>
          <Option value="float">float</Option>
          <Option value="long">long</Option>
          <Option value="date">date</Option>
        </Select>)
      : (<Input ref={node => (this.input = node)} onPressEnter={this.save} onBlur={this.save} />)
    return editing ? (
      <Form.Item style={{ margin: 0 }}>
        {form.getFieldDecorator(dataIndex, {
          rules: [dataIndex === '_format' ? {} : {
            required: true,
            message: `${title} 不能为空`
          }, {
            pattern: /^[a-zA-Z0-9_-]+$/g,
            message: '只能是数字、字母、下划线、中划线和组成!'
          }],
          initialValue
        })(component)}
      </Form.Item>
    ) : (
      <div
        className="editable-cell-value-wrap"
        style={{ paddingRight: 24 }}
        onClick={this.toggleEdit}
      >
        {children}
      </div>
    )
  }
  render() {
    const {
      editable,
      children,
      ...restProps
    } = this.props
    return (
      <td {...restProps}>
        {editable ? (
          <EditableContext.Consumer>{this.renderCell}</EditableContext.Consumer>
        ) : (
          children
        )}
      </td>
    )
  }
}

const FieldMapping = (props) => {
  const { dataFields = [], value, onChange, mapping } = props
  const [selectRow, setSelectRow] = React.useState([])
  const [dataSource, setDataSource] = React.useState(dataFields.map(item => ({ ...item })))

  React.useEffect(() => {
    const data = dataFields.map(item => ({ ...item }))
    if (!value) {
      setSelectRow([...data])
    } else {
      let selectRows = []
      const updata = data.map(item => {
        const findSelect = value.find(({ name }) => {
          const mappingField = _.findKey(mapping, p => p === name)
          if (mappingField) {
            return mappingField === item.name
          } else {
            return name === item.name
          }
        })
        if (findSelect) {
          const rows = {
            ...item,
            _name: findSelect._name || findSelect.name,
            _type: findSelect._type || findSelect.type,
            _format: findSelect._format || findSelect.format
          }
          selectRows.push(rows)
          return rows
        } else {
          return {
            ...item
          }
        }

      })
      setSelectRow(selectRows)
      setDataSource(updata)
    }
  }, [value, dataFields, mapping])

  const getColumns = () => [{
    title: '源字段名称',
    dataIndex: 'name'
  }, {
    title: '源数据类型',
    dataIndex: 'type'
  }, {
    title: '字段描述',
    dataIndex: 'comment'
  }, {
    title: '目标字段名称',
    dataIndex: '_name',
    editable: true,
    render: (_, row) => row._name || row.name
  }, {
    title: '目标字段数据类型',
    dataIndex: '_type',
    editable: true,
    render: (_, row) => row._type || row.type
  }, {
    title: 'format',
    dataIndex: '_format',
    editable: true
  }]

  const components = {
    body: {
      row: EditableFormRow,
      cell: EditableCell
    }
  }

  const handleSave = row => {
    const newData = [...dataSource]
    const index = newData.findIndex(item => row.name === item.name)
    const hasName = newData.findIndex(item => {
      const name = item._name || item.name
      return row._name === name
    })
    if (hasName !== -1 && hasName !== index) {
      message.error('字段名重复啦')
      return
    }
    const item = newData[index]
    newData.splice(index, 1, {
      ...item,
      ...row
    })
    setDataSource(newData)
    const nweSelect = [...selectRow]
    const selectIndex = selectRow.findIndex(item => row.name === item.name)
    if (selectIndex !== -1) {
      const temp = nweSelect[selectIndex]
      nweSelect.splice(index, 1, {
        ...temp,
        ...row
      })
      onChange([...nweSelect])
      setSelectRow([...nweSelect])
    }


  }

  const columns = getColumns().map(col => {
    if (!col.editable) {
      return col
    }
    return {
      ...col,
      onCell: record => ({
        record,
        editable: col.editable,
        dataIndex: col.dataIndex,
        title: col.title,
        handleSave
      })
    }
  })

  const rowSelection = {
    onChange: (selectedRowKeys, selectedRow) => {
      setSelectRow([...selectedRow])
      onChange([...selectedRow])
    },
    selectedRowKeys: selectRow.map(({ name }) => name)
  }

  return (
    <Table
      rowKey="name"
      components={components}
      rowClassName={() => 'editable-row'}
      columns={columns}
      dataSource={dataSource}
      rowSelection={rowSelection}
      pagination={false}
      bordered
    />
  )
}

FieldMapping.propTypes = {
  dataFields: PropTypes.array,
  value: PropTypes.array,
  onChange: PropTypes.func
}

export default FieldMapping
