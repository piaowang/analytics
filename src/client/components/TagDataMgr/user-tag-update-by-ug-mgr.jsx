import React from 'react'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import { CaretRightOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, message, Modal, Table } from 'antd';
import {Auth} from '../../common/permission-control'
import {synchronizer} from '../Fetcher/synchronizer'
import {withUserGroupsDec} from '../Fetcher/data-source-compare-user-group-fetcher'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import _ from 'lodash'
import {
  DimDatasourceType,
  UserGroupBuildInTagEnum,
  UserTagUpdateTaskUpdateStrategyEnum
} from '../../../common/constants'
import UserTagUpdateByUserGroupConfigModal from './user-tag-update-by-usergroup-config-modal'
import Fetch from '../../common/fetch-final'
import {untypedTitle, untypedTreeId} from '../TagManager/tag-type-list'
import {withCommonFilter} from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'

@withContextConsumer(ContextNameEnum.ProjectInfo)
@synchronizer(props => {
  let projId = _.get(props, 'projectCurrent.id') || ''
  return {
    url: '/app/user-tag-update-tasks',
    modelName: 'userTagUpdateTasks',
    doFetch: !!projId,
    query: { project_id: projId },
    doSync: true
  }
})
@withUserGroupsDec(({datasourceCurrent}) => {
  const dsId = datasourceCurrent && datasourceCurrent.id || ''
  return ({
    dataSourceId: dsId,
    doFetch: !!dsId,
    cleanDataWhenFetching: true,
    query: {
      where: {
        tags: { $contains: UserGroupBuildInTagEnum.UserGroupWithoutLookup }
      }
    }
  })
})
@withDbDims(({datasourceCurrent}) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    datasourceType: DimDatasourceType.tag
  }
})
@synchronizer(({datasourceCurrent}) => {
  const dsId = datasourceCurrent && datasourceCurrent.id || ''
  return {
    url: `/app/tag-type-tree/list/${dsId}`,
    modelName: 'userTagTypes',
    doFetch: !!dsId,
    query: { parentId: 'all' },
    resultExtractor: data => _.get(data, 'result.trees') || []
  }
})
@withCommonFilter
export default class UserTagUpdateByUserGroupMgr extends React.Component {

  state = {
    visiblePopoverKey: ''
  }

  genTableColumns(typeNameIdDict) {
    let {dataSourceCompareUserGroups: dbUgs, modifyUserTagUpdateTasks, dimNameDict} = this.props
    let ugIdDict = _.keyBy(dbUgs, 'id')
    return [
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title'
      },
      {
        title: '描述',
        dataIndex: 'params.description',
        key: 'description',
        render: (v, record) => _.get(record, 'params.description', '--')
      },
      {
        title: '用户群组',
        key: 'userGroupTagId',
        render: () => {
          return '标签计算群'
        }
      },
      {
        title: '用户群名称',
        key: 'userGroupName',
        render: (val, record) => {
          const ugId = _.get(record, 'params.userGroupId')
          return ugId && _.get(ugIdDict, [ugId, 'title']) || ''
        }
      },
      // userTagUpdates: [{typeId, tagName, targetValue}]
      {
        title: '标签类别',
        key: 'userTagTypeIds',
        render: (v, record) => {
          const typeId = _.get(record, 'params.userTagUpdates[0].typeId')
          return typeId === untypedTreeId ? untypedTitle : _.get(typeNameIdDict, typeId)
        }
      },
      {
        title: '标签',
        key: 'userTagIds',
        render: (v, record) => {
          const tagName = _.get(record, 'params.userTagUpdates[0].tagName')
          return _.get(dimNameDict, [tagName, 'title']) || tagName
        }
      },
      {
        title: '标签值',
        key: 'userTagTargetValue',
        render: (v, record) => {
          return _.get(record, 'params.userTagUpdates[0].targetValue') + ''
        }
      },
      {
        title: '周期',
        dataIndex: 'params.cronInfo.cronExpression',
        key: 'cronExpression',
        render: (v, record) => {
          if (_.get(record, 'params.updateStrategy') === UserTagUpdateTaskUpdateStrategyEnum.Interval) {
            return _.get(record, 'params.cronInfo.cronExpression')
          }
          return '手动执行'
        }
      },
      {
        title: '设置操作',
        key: 'actions',
        render: (v, record) => {
          return (
            <React.Fragment>
              <CaretRightOutlined
                className="mg2r pointer"
                onClick={() => {
                  Modal.confirm({
                    title: `确认执行任务 ${record.title} ？`,
                    okText: '确认',
                    cancelText: '取消',
                    async onOk() {
                      let res = await Fetch.post(`/app/user-tag-update-tasks/${record.id}/run`)
                      if (_.get(res, 'result.failed') === 0 ) {
                        message.success('执行成功')
                      } else {
                        const errs = _.get(res, 'result.errors') || []
                        message.error('执行失败：' + errs.join(', '))
                      }
                    }
                  })
                }} />
              <EditOutlined
                className="mg2r pointer"
                onClick={() => {
                  this.setState({
                    visiblePopoverKey: `configHowUserTagUpdateByUserGroup:${record.id}`
                  })
                }} />
              <DeleteOutlined
                className="pointer"
                onClick={() => {
                  Modal.confirm({
                    title: `确认删除任务 ${record.title} ？`,
                    okText: '确认',
                    okType: 'danger',
                    cancelText: '取消',
                    async onOk() {
                      await modifyUserTagUpdateTasks('', arr => arr.filter(task => task.id !== record.id))
                    }
                  })
                }} />
            </React.Fragment>
          );
        }
      }
    ];
  }

  render() {
    let {
      userTagUpdateTasks, modifyUserTagUpdateTasks, isSyncingUserTagUpdateTasks, dataSourceDimensions: dbTags,
      dataSourceCompareUserGroups: dbUgs, userTagTypes, keywordInput: Search, keyword, dimNameDict
    } = this.props
    let {visiblePopoverKey} = this.state
    let typeNameIdDict = _(userTagTypes).keyBy('id').mapValues(t => t.name).value()

    return (
      <React.Fragment>
        <div className="pd2b">
          <div className="itblock width200 mg1l">
            <Search placeholder="用户群名称或标签名称" />
          </div>

          <div className="fright">
            <Auth auth="app/tag-hql/create">
              <Button
                type="primary"
                className="width100"
                icon={<PlusOutlined />}
                onClick={() => {
                  this.setState({
                    visiblePopoverKey: 'configHowUserTagUpdateByUserGroup:new'
                  })
                }}
              >创建</Button>
            </Auth>
          </div>
        </div>

        <div>
          <Table
            rowKey="id"
            columns={this.genTableColumns(typeNameIdDict)}
            dataSource={!keyword
              ? userTagUpdateTasks
              : userTagUpdateTasks.filter(t => {
                if (smartSearch(keyword, t.title)) {
                  return true
                }
                let tagName = _.get(t.params, 'userTagUpdates[0].tagName')
                let tagTitle = _.get(dimNameDict, [tagName, 'title']) || tagName
                return smartSearch(keyword, tagTitle)
              })}
          />
        </div>

        <UserTagUpdateByUserGroupConfigModal
          dbTags={dbTags}
          dbUgs={dbUgs}
          value={!_.startsWith(visiblePopoverKey, 'configHowUserTagUpdateByUserGroup:')
            ? null
            : _.find(userTagUpdateTasks, {id: visiblePopoverKey.split(':')[1]})}
          onChange={async nextTask => {
            let isCreating = _.endsWith(visiblePopoverKey, ':new')
            const res = await modifyUserTagUpdateTasks('', arr => {
              if (isCreating) {
                return [...(arr || []), nextTask]
              }
              let taskId = visiblePopoverKey.split(':')[1]
              return arr.map(t => t.id === taskId ? nextTask : t)
            })
            return res
          }}
          saving={isSyncingUserTagUpdateTasks}
          visible={_.startsWith(visiblePopoverKey, 'configHowUserTagUpdateByUserGroup:')}
          onVisibleChange={visible => {
            if (!visible) {
              this.setState({visiblePopoverKey: ''})
            }
          }}
        />
      </React.Fragment>
    );
  }
}
