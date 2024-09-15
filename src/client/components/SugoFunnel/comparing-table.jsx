import React from 'react'
import _ from 'lodash'
import { LoadingOutlined } from '@ant-design/icons';
import { Button, Checkbox, message, Table, Tooltip } from 'antd';
import * as d3 from 'd3'
import {extractTotalData} from './data-transform'
import PubSub from 'pubsub-js'
//import {Auth} from '../../common/permission-control'
import {GetBuildInUgs} from '../../../common/constants'
import AsyncTaskRunner from '../Common/async-task-runner'

const percentFormatter = d3.format('.1%')

/**
 * 【漏斗分析】中的维度对比选项：用户选择到具体子目录时才查询数据、更新模版
 * @author coin 2016-12-12
 *
 * @TODO 重构时将 `secondDimensionSelected` 的值应写入到 `action`中
 * @TODO 作为组件的 `props` 存在,如果要改 `props` 就需要改动 `action`
 *`redux-react` 我还没有看文档,还不知道怎么用,所以把这个放在重构时去做
 */

let transferArrowColorInterpolate = d3.interpolateRgb('#d3d1ff', '#9799e9')

export default class ComparingTable extends React.Component {

  getUserGroupsComparingData() {
    let {
      currFunnel: {
        params: {
          funnelLayers2d = [],
          selectedUserGroupIds = []
        }
      },
      funnelTotalData,
      funnelDataAfterGroupBy,
      dataSourceCompareUserGroups
    } = this.props

    dataSourceCompareUserGroups = [...GetBuildInUgs(), ...dataSourceCompareUserGroups]

    let completeTransferDataFromParent = extractTotalData(funnelTotalData, funnelLayers2d.length)

    // 从父组件取得总体转化率
    let completeTransferPercentFromParent = 100 * completeTransferDataFromParent[funnelLayers2d.length - 1] / completeTransferDataFromParent[0]
    let parentRow = funnelLayers2d.reduce((prev, curr, i) => {
      prev[`第 ${i + 1} 步`] = completeTransferDataFromParent[i]
      return prev
    }, {
      title: '总体',
      completeTransferPercent: isNaN(completeTransferPercentFromParent) ? 0
        : completeTransferPercentFromParent
    })

    let validUgIdSet = new Set(dataSourceCompareUserGroups.map(ug => ug.id))
    selectedUserGroupIds = selectedUserGroupIds.filter(ugId => validUgIdSet.has(ugId))
    if (!selectedUserGroupIds.length) {
      return [parentRow]
    }

    let tableData = selectedUserGroupIds
      .map(ugId => {
        let ugName = _.get(_.find(dataSourceCompareUserGroups, {id: ugId}), 'title')
        return funnelDataAfterGroupBy[ugName]
      })
      .map(funnelRows => _.find(funnelRows, d => d.type === 'total'))
      .map((r, i) => {
        let userGroupById = _.find(dataSourceCompareUserGroups, g => g.id === selectedUserGroupIds[i])
        let title = userGroupById && userGroupById.title || selectedUserGroupIds[i]

        // 没有内容时显示全 0
        if (!r) {
          return _.range(funnelLayers2d.length)
            .map(i => `第 ${i + 1} 步`)
            .reduce((prev, curr) => {
              prev[curr] = 0
              return prev
            }, {
              title,
              completeTransferPercent: 0
            })
        }

        // 修正 druid 小数问题
        let roundEvent = _.mapValues(r.event, (val) => _.isNumber(val) ? Math.round(val) : val)

        let completeTransferPercent = 100 * roundEvent[`第 ${funnelLayers2d.length} 步`] / roundEvent['第 1 步']
        return _.assign({}, roundEvent, {
          title,
          completeTransferPercent: isNaN(completeTransferPercent)
            ? 0
            : !isFinite(completeTransferPercent) ? 100 : completeTransferPercent
        })
      })

    return [parentRow].concat(tableData)
  }

  /**
   * ## 维度对比
   * 每一个维度值都有一个子集 List
   * 在 List 被选中时,再去查询对应子集的数据
   * 此后再渲染 View
   */
  getDimensionsComparingData() {
    let {
      currFunnel: {
        params: {
          compareByDimension,
          funnelLayers2d = [],
          compareByDimensionDistinctValues = []
        }
      },
      funnelTotalData = [],
      funnelDataAfterGroupBy = {}
    } = this.props

    let completeTransferDataFromParent = extractTotalData(funnelTotalData, funnelLayers2d.length)

    // 从父组件取得总体转化率
    let completeTransferPercentFromParent = 100 * completeTransferDataFromParent[funnelLayers2d.length - 1] / completeTransferDataFromParent[0]
    let parentRow = funnelLayers2d.reduce((prev, curr, i) => {
      prev[`第 ${i + 1} 步`] = completeTransferDataFromParent[i]
      return prev
    }, {
      title: '总体',
      completeTransferPercent: isNaN(completeTransferPercentFromParent) ? 0 : completeTransferPercentFromParent
    })

    // 没有选择维度
    if (!compareByDimension || !_.isString(compareByDimension)) {
      return [parentRow]
    }

    // 查询选中的维度
    // 如果没有选中,则不更新 `tableData`
    // TODO 已经查询的值应该在 `store` 里缓存起来
    // 每次都查没必要,浪费服务器资源,也减慢了渲染速度

    if (compareByDimensionDistinctValues.length) {
      let tableData = compareByDimensionDistinctValues.map(dVal => {
        let totalDataByDistVal = _.findLast(funnelDataAfterGroupBy[dVal], g => g.type === 'total')
          || this.genFakeTotalData(compareByDimension, dVal, funnelLayers2d.length)

        // 修正 druid 小数问题
        let roundEvent = _.mapValues(totalDataByDistVal.event, (val) => _.isNumber(val) ? Math.round(val) : val)

        let completeTransferPercent = 100 * roundEvent[`第 ${funnelLayers2d.length} 步`] / roundEvent['第 1 步']
        return {
          ...roundEvent,
          title: dVal,
          completeTransferPercent: isNaN(completeTransferPercent)
            ? 0
            : isFinite(completeTransferPercent) ? completeTransferPercent : 100
        }
      })

      return [parentRow, ...tableData]
    } else {
      return [parentRow]
    }
  }

  genFakeTotalData(compareByDimension, dVal, stepCount) {
    return {
      version: 'FunnelResultRow',
      timestamp: 'fake',
      event: {
        [compareByDimension]: dVal,
        ..._.fromPairs(_.range(stepCount).map(sIdx => [`第 ${sIdx + 1} 步`, 0]))
      },
      type: 'total'
    }
  }

  onInsight = async ({step, group}) => {
    let stepNumber = step * 1
    await new Promise(resolve => {
      PubSub.publishSync('sugoFunnel.onShowLostUser', {
        lossBeforeStepIdx: stepNumber,
        tabActiveKey: group,
        done: resolve
      })
    })
  }

  render() {
    let {
      //dataSourceDimensions,
      //isFetchingDataSourceDimensions,
      isLoadingFunnelStatisticData,
      onComparingFunnelDataChange,
      currFunnel: {
        //id: currentFunnelId,
        params: {
          compareByDimension,
          compareByDimensionDistinctValues = [],
          //funnelMetric,
          funnelLayers2d = [],
          compareType = 'dimensions',
          selectedUserGroupIds,
          comparingFunnelGroupName = ['总体']
        }
      }
    } = this.props

    // 兼容旧版漏斗 comparingDimension 是数组的而导致提示不正确的情况
    if (_.isArray(compareByDimension)) {
      compareByDimension = compareByDimension.join('')
    }

    if (compareByDimension === '' || compareByDimension === void 0) {
      compareByDimension = null
    }

    if (!compareType) {
      compareType = 'dimensions'
    }

    let tableData = compareType === 'dimensions' ? this.getDimensionsComparingData() : this.getUserGroupsComparingData()

    const compareTableColumns = [
      {
        title: '选择对比',
        dataIndex: 'isComparing',
        key: 'isComparing',
        width: 65,
        className: 'aligncenter-force',
        render: (text, record) => {
          let isChecked = _.includes(comparingFunnelGroupName, record['title'])
          return (
            <Checkbox
              checked={isChecked}
              disabled={2 <= comparingFunnelGroupName.length && !isChecked}
              onChange={ev => {
                if (ev.target.checked) {
                  comparingFunnelGroupName = _.orderBy([...comparingFunnelGroupName, record['title']],
                    title0 => _.findIndex(tableData, d => d.title === title0))
                } else {
                  if (comparingFunnelGroupName.length === 1) {
                    message.error('需要保留一个选项')
                    return
                  } else {
                    comparingFunnelGroupName = comparingFunnelGroupName.filter(g => g !== record['title'])
                  }
                }
                onComparingFunnelDataChange(comparingFunnelGroupName)
              }}
            />
          )
        }
      }, {
        title: '总转化率',
        dataIndex: 'completeTransferPercent',
        key: 'completeTransferPercent',
        className: 'aligncenter-force',
        width: 80,
        sorter: (a, b) => a.completeTransferPercent > b.completeTransferPercent
          ? 1 : -1,
        render: (val) => isFinite(val) ? percentFormatter(val / 100) : '--'
      }, {
        title: compareType === 'dimensions' ? '维度' : '用户组',
        dataIndex: 'title',
        className: 'aligncenter-force',
        sorter: (a, b) => a.title > b.title ? 1 : -1,
        key: 'title',
        width: 4 < funnelLayers2d.length ? 150 : 300
      }
    ].concat(funnelLayers2d.map((fl, fli) => {
      let title = `第 ${fli + 1} 步`
      return {
        title: (<Tooltip title={fl.filter(_.identity).join(' -> ')}>
          <span>{title}</span>
        </Tooltip>
        ),
        dataIndex: title,
        key: title,
        className: 'aligncenter-force',
        width: 150,
        render: (val, record) => {
          if (fli === funnelLayers2d.length - 1) {
            return val
          }
          let nextLayerVal = record[`第 ${fli + 2} 步`]
          let transferPercent = nextLayerVal / val

          let finalPercent = isNaN(transferPercent) ? 0 : !isFinite(transferPercent) ? 1 : transferPercent
          let arrowColor = transferArrowColorInterpolate(finalPercent)
          return (
            <div className="relative">
              {val}
              <div
                className="absolute iblock right0"
                style={{right: '-45px', width: 70, zIndex: 9}}
              >
                <span
                  style={{
                    float: 'right',
                    width: '0', height: '0',
                    borderTop: '9px solid transparent',
                    borderBottom: '9px solid transparent',
                    borderLeft: `9px solid ${arrowColor}`
                  }}
                />
                <AsyncTaskRunner
                  args={[]}
                  doRun={false}
                  task={async () => {
                    await this.onInsight({
                      step: fli + 1,
                      group: record.title
                    })
                  }}
                >
                  {({isRunning, run}) => {
                    return (
                      <a
                        className="color-white pointer"
                        onClick={() => run()}
                        style={{
                          float: 'right', width: '60px', textAlign: 'center',
                          backgroundColor: arrowColor
                        }}
                      >
                        {isRunning ? <LoadingOutlined /> : null}
                        {percentFormatter(finalPercent)}
                      </a>
                    );
                  }}
                </AsyncTaskRunner>
              </div>
            </div>
          );
        }
      };
    }))

    const tips = (
      <div
        className={
          (
            compareType === 'dimensions' && compareByDimension
            || compareType === 'userGroups' && selectedUserGroupIds && selectedUserGroupIds.length
          )
          && compareByDimensionDistinctValues.length
          && (tableData || []).length <= 1 && !isLoadingFunnelStatisticData
            ? 'user-guide-tip top-tip mg1t width300'
            : 'user-guide-tip top-tip hide'
        }
      >没有找到可对比的项，请尝试扩大时间范围</div>
    )

    return (
      <div className="funnelPanel pd2 corner shadowb-eee until-hover" style={this.props.style}>
        <div className="panelHeader alignright">
          <Button
            type="ghost"
            onClick={() => {
              PubSub.publishSync('sugoFunnel.showDailyTransferModal')
            }}
          >流失分析</Button>
          {tips}
        </div>
        <Table
          loading={isLoadingFunnelStatisticData}
          columns={compareTableColumns}
          dataSource={tableData.map((d, idx) => ({...d, idx}))}
          rowKey="idx"
          pagination={false}
        />
      </div>
    )
  }
}

