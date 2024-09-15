import React, { Component } from 'react'
import { AppstoreOutlined, TagOutlined } from '@ant-design/icons';
import { Tree, Card, Tooltip, Row, Col, Tag } from 'antd';
import _ from 'lodash'
import * as ls from '../../../common/localstorage'
import { recurFindDeep } from '../../../../common/sugo-utils'

const TreeNode = Tree.TreeNode
const typeIcon = <AppstoreOutlined className="font16 mg1r " style={{ marginTop: '5px' }} />
const tagIcon = <TagOutlined className="font14 color-main tree-icon-customize" />

export default class TagDetails extends Component {

  state = {
    treeData: [],
    baseInfoHeight: 0
  }

  componentWillUpdate(nextProps, nextState) {
    const { tagCategory = [], customOrder, tagsInfo } = nextProps
    if ((this.props.customOrder === undefined && customOrder !== undefined)) {
      this.getTreeData(tagCategory, customOrder)
    }
    if (this.props.tagsInfo !== tagsInfo) {
      _.forEach(tagCategory, p => {
        this.loadTreeData(p.id, tagsInfo)
      })
    }
  }

  componentWillMount() {
    const { tagCategory = [], customOrder } = this.props
    this.getTreeData(tagCategory, customOrder)
  }

  getTreeData = (tagCategory = [], customOrder) => {
    if (customOrder !== undefined) {
      const treeData = _.orderBy(tagCategory.filter(p => p.parent_id === '-1'), p => {
        const obj = _.get(customOrder, '-1')
        return _.findIndex(obj, i => i === p.id)
      }).map(p => {
        return { title: p.name, key: p.id, type: 'category' }
      })
      this.setState({
        treeData
      })
    }
  }

  loadTreeData = (eventKey, tagsInfo) => {
    const { tagCategory = [], tagCategoryMap, dimensions, customOrder } = this.props
    const dataSourceDimensionsMap = _.keyBy(dimensions, 'id')
    const orderInfo = _.get(customOrder, eventKey) || []
    const category = _.orderBy(tagCategory.filter(p => p.parent_id === eventKey), p => {
      return _.findIndex(orderInfo, i => i === p.id)
    }).map(p => {
      return { title: p.name, key: p.id, type: 'category' }
    })

    let tags = _.orderBy(tagCategoryMap.filter(p => p.tag_tree_id === eventKey), p => {
      return _.findIndex(orderInfo, i => i === p.dimension_id)
    }).map(p => {
      const dim = dataSourceDimensionsMap[p.dimension_id]
      if (_.isEmpty(dim)) {
        return null
      }
      const val = _.get(tagsInfo, dim.name, '')
      const text = dim.title || dim.name
      return { title: text, key: p.id, type: 'tag', val: val }
    }).filter(_.identity)

    if (eventKey === 'not-typed') {
      const dif = _.difference(_.keys(dataSourceDimensionsMap), tagCategoryMap.map(p => p.dimension_id))
      let notTypeTags = dif.map(p => {
        const dim = dataSourceDimensionsMap[p]
        if (dim.name && (dim.name === '__time' || dim.name === 'distinct_id')) {
          return null
        }
        const val = _.get(tagsInfo, dim.name, '')
        const text = dim.title || dim.name
        return { title: text, key: p, type: 'tag', val: val }
      }).filter(_.identity)
      notTypeTags = _.orderBy(notTypeTags, p => _.findIndex(orderInfo, i => i === p.key))
      tags = tags.concat(notTypeTags)
    }
    setTimeout(() => {
      const { treeData } = this.state
      const newData = _.cloneDeep(treeData)
      let treeItem = recurFindDeep(newData, p => p.children, p => p.key === eventKey)
      treeItem.children = [...category, ...tags]
      this.setState({
        treeData: newData
      })
    })
  }

  onLoadData = (treeNode) => {
    const { tagsInfo } = this.props
    return new Promise((resolve) => {
      if (treeNode.props.dataRef.children) {
        resolve()
        return
      }
      const eventKey = treeNode.props.eventKey
      this.loadTreeData(eventKey, tagsInfo)
      setTimeout(() => {
        resolve()
      }, 200)
    })
  }

  renderTreeNodes = (data) => {
    return data.map((item) => {
      if (item.type === 'category') {
        const content = <div className="iblock tag-item-type">{item.title}</div>
        return (
          <TreeNode className="font14 color-black" icon={() => typeIcon} title={content} key={item.key} dataRef={item}>
            {this.renderTreeNodes(item.children || [])}
          </TreeNode>
        )
      }
      const content = (
        <div className="iblock color-main tree-text-customize">
          <div className="iblock tag-item-panel"><div className="tag-item-title pd1r">{item.title}</div></div>
          <Tooltip title={_.isArray(item.val) ? item.val.join(',') : item.val}>
            <div className="width200 elli iblock pd1l">
              {!_.isArray(item.val) ? item.val : item.val.join(',')}
            </div>
          </Tooltip>
        </div>
      )
      return <TreeNode className="font13" icon={() => tagIcon} title={content} dataRef={item} key={item.key} isLeaf />
    })
  }

  render() {
    const { microcosmicData, baseDimensions, projectCurrent, baseInfoFilelds } = this.props
    const { treeData } = this.state
    let expandedKey = ls.get('microcosmicPortraitExpandedKey')
    expandedKey = _.get(expandedKey, `${projectCurrent.id}.${window.sugo.user.id}`, [])
    const basTag = baseDimensions.filter(p => !baseInfoFilelds.includes(p.name)).map((p, i) => {
      const span = ((p.title || p.name) + microcosmicData[p.name]).length > 13 ? 24 : 12
      return (
        <Col span={span} className="mg2b" key={'basinfo' + i}>
          <span className="font-14 bold"> {p.title || p.name}：</span>
          {
            _.isArray(microcosmicData[p.name])
              ? microcosmicData[p.name].map(v => {
                if(!v) return null
                const maxLen = 35
                const isLongTag = v.length > maxLen
                const tagElem = (
                  <Tag key={v} className="mg1b">
                    {isLongTag ? `${v.slice(0, maxLen)}...` : v}
                  </Tag>
                )
                return isLongTag ? (
                  <Tooltip title={v} key={v}>
                    {tagElem}
                  </Tooltip>
                ) : (
                  tagElem
                )
              })
              : microcosmicData[p.name]
          }
        </Col>
      )
    })
    console.log('treeData: ', treeData)
    return (
      <div className="height-100">
        <Card
          title="用户信息详情"
          className="itblock"
          style={{ width: 442, marginRight: '10px', minHeight: 'calc( 100vh - 480px)' }}
        >
          {
            basTag.length
              ? <Row>{basTag}</Row>
              : <div className="aligncenter pd3t font13">
                <span className="color-grey">该项目暂无用户基础信息</span>
              </div>
          }
        </Card>
        <Card
          title="标签树"
          className="itblock height-100"
          style={{ width: 'calc(100% - 452px)', minHeight: 'calc( 100vh - 480px)' }}
        >
          <Tree
            showIcon
            defaultExpandedKeys={!_.isEmpty(expandedKey) ? expandedKey : [_.get(treeData, '0.key', '')]}
            loadData={this.onLoadData}
            onExpand={(v) => {
              let expandedKey = ls.get('microcosmicPortraitExpandedKey') || {}
              _.set(expandedKey, `${projectCurrent.id}.${window.sugo.user.id}`, v)
              ls.set('microcosmicPortraitExpandedKey', expandedKey)
            }}
          >
            {this.renderTreeNodes(treeData)}
          </Tree>
        </Card>
      </div>
    )
  }
}
