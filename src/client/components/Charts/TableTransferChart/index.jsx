import React, {Component} from 'react'
// import './index.styl'
import { Transfer, Button } from 'antd';
import difference from 'lodash/difference';
import {withSizeProvider} from '../../Common/size-provider'
import { enablePropsOverwriter } from '../TableChart/flat-table'
import TableExpandAllRows from '../TableChart/table-expand-all-row'
import { withTableData } from '../TableChart/withTableData'
import {doChangeRuntimeState} from '../../LiveScreen/actions/workbench'
import classNames from 'classnames'
import downloadTableData from '~/src/client/common/download-table-data-to-csv';

const TableExpandAllRowsEnablePropsOverwriter = enablePropsOverwriter(TableExpandAllRows)

withSizeProvider
@withTableData('flat-table')
export default class TableTransfer extends Component {

  state = {
    targetKeys: [],
  };

  componentDidMount() {
    const { className } = this.props
    const currRuntimeState = _.get(window.store.getState(), 'livescreen_workbench.runtimeState', {})
    const targetKeys = _.get(currRuntimeState, `tableTransfer.${className}.targetKeys`, '')
    if (targetKeys) this.setState({ targetKeys })
  }

  onChange = nextTargetKeys => {
    const {dataSource, applyInteractionCode, paramsData, className } = this.props

    const currRuntimeState = _.get(window.store.getState(), 'livescreen_workbench.runtimeState', {})
    const nextRuntimeState = {
      ...currRuntimeState,
      tableTransfer: {
        ..._.get(currRuntimeState,'tableTransfer',{}),
        [className]: {
          targetKeys: nextTargetKeys
        }
      }
    }
    applyInteractionCode({...paramsData, transferData: dataSource.filter( (i,idx) => nextTargetKeys.includes(idx)), transferKey: nextTargetKeys}, nextRuntimeState)
    this.setState({ targetKeys: nextTargetKeys });
  };

  render() {
    let {columns, dataSource, spWidth, spHeight, isCustomHeader, isThumbnail, className, styleConfig, componentStyle, modalStyle = {}, ...rest} = this.props
    const { targetKeys } = this.state

    let myColumns = columns.map((col, i) => {
      delete col.width
      let result =  Object.assign({}, col, {
        title: (
          <div
            className="elli"
            // style={{width: col.width - 17}}
          >{col.title}</div>
        )
      })
      return result
    })

    // 修正无法翻页的问题（可能是 antd 的 bug）
    const pagination = isThumbnail ? false : {
      showQuickJumper: false,
      showSizeChanger: false,
      total: dataSource.length,
      defaultPageSize: 10,
      pageSizeOptions: ['6', '11', '26', '51', '101'],
      showTotal: total => {
        if (0 === rest.dimensions.length) {
          return ''
        }
        let isFirstRowIsTotalRow = dataSource && dataSource[0] && dataSource[0].isTotalRow
        // 加载了 0 条时不显示提示语
        if (isFirstRowIsTotalRow && total - 1 === 0 || total === 0) {
          return ''
        }
        return `加载了数据 ${isFirstRowIsTotalRow ? total - 1 : total} 条，需加载更多请点击第一维度并调整“显示条数”`
      }
    }

    const { width: modalWidth } = modalStyle
    const tableWidth = modalWidth 
    ? (_.isNumber(modalWidth) ? modalWidth / 2 - 100 : `calc(${modalWidth.replace('vw', '') / 2}vw - 100px)`)
    : componentStyle.width / 2 - 100
    return (
      <div
        id='table-transfer-chart'
        className={classNames(className)}
        // className={`inputNumberChart aligncenter hide-all-scrollbar-y overscroll-y relative ${className}`}
        // style={style}
      >
        <Transfer 
          // titles={['testA','testB']}
          style={{
            ..._.get(styleConfig,'transferStyle', {}),
          }}
          listStyle={{
            ..._.get(styleConfig,'transferListStyle', {}),
            width: tableWidth,
            padding: 0,
            overflowX: 'scroll'
          }}
          onChange={this.onChange} 
          dataSource={dataSource.map( (i,idx) => ({...i, key:idx}))} 
          targetKeys={targetKeys}
          showSelectAll={false}
          filterOption={(inputValue, item) =>
            item.title.indexOf(inputValue) !== -1 || item.tag.indexOf(inputValue) !== -1
          }
        >
        {({
            direction,
            filteredItems,
            onItemSelectAll,
            onItemSelect,
            selectedKeys: listSelectedKeys,
            disabled: listDisabled,
          }) => {
            // const columns = direction === 'left' ? leftColumns : rightColumns;

            const rowSelection = {
              getCheckboxProps: item => ({ disabled: listDisabled || item.disabled }),
              onSelectAll(selected, selectedRows) {
                const treeSelectedKeys = selectedRows
                  .filter(item => !item.disabled)
                  .map(({ key }) => key);
                const diffKeys = selected
                  ? difference(treeSelectedKeys, listSelectedKeys)
                  : difference(listSelectedKeys, treeSelectedKeys);
                onItemSelectAll(diffKeys, selected);
              },
              onSelect({ key }, selected) {
                onItemSelect(key, selected);
              },
              fixed: true,
              // columnWidth: '500px',
              selectedRowKeys: listSelectedKeys,
            };
            const _table = {
              props: {
                columns: myColumns,
                dataSource: filteredItems
              }
            }
            return (
              <div id='table-transfer'>
                <Button onClick={() => downloadTableData(_table, moment().format('YYYY-MM-DD HH:mm:ss'), 'flat-table')}>下载表格</Button>
                <TableExpandAllRowsEnablePropsOverwriter 
                  rowKey={(i) => i.key}   //本来在下层的rowkeyname是key值 但是此处没生效
                  rowSelection={rowSelection}
                  dataSource={_table.props.dataSource}
                  indentSize={5}
                  size="small"
                  bordered
                  columns={myColumns}
                  defaultExpandAllRows
                  {...rest}
                  // className={classNames({'hide-pagination': dataSource.length <= 101})}
                  scroll={{
                    x: 2000
                  }}
                  pagination={_.get(styleConfig, 'pagination.show', true) ? { pageSize: 10 } : false}
                />
              </div>
            );
          }}
        </Transfer>
      </div>
    )
  }
}
