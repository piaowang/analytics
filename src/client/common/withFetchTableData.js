import React, {useState, useEffect } from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'

const PSIZE = 10
const SHOWTOTAL = (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`

const withFetchTableData = (Component, {namespace, effect = 'getTableData', payload = {}, state = 'tableData'}, options) =>
  connect(props => ({ ...props[namespace] }))(
    class WrapComponent extends React.Component {
      state = {
        page: 1,
        pSize: PSIZE
      }

      componentDidMount() {
        this.fetchData()
      }
    
      onChangePage = (page, pSize ) => {
        this.setState({page, pSize }, () => this.fetchData())
      }

      onShowSizeChange = (page, pSize) => {
        this.setState({page, pSize }, () => this.fetchData())
      }

      fetchData = (params = {} ) => {
        const {page, pSize } = this.state
        this.props.dispatch({
          type: `${namespace}/${effect}`,
          payload: { pSize: pSize, page, ...payload, ...params}
        })
      }

      render() {
        const tableData = _.get(this.props[state], 'rows', [])
        const total = _.get(this.props[state], 'count', 0)
        return (
          <Component
            data={tableData}
            onRefresh={this.fetchData}
            pagination={{
              showTotal: SHOWTOTAL,
              total: total,
              showSizeChanger: true,
              defaultPageSize: PSIZE,
              onChange: this.onChangePage,
              onShowSizeChange: this.onShowSizeChange,
              ...options
            }}
            {...this.props}
          />
        )
      }
    }
  )


export default withFetchTableData

