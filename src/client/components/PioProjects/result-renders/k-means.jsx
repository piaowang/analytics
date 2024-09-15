import React from 'react'
import {Table, Tree} from 'antd'
import renderTabType from './render-tab-type'
import pagination from './tablePagination'

const TreeNode = Tree.TreeNode

@renderTabType
export default class Kmeans extends React.Component {
  constructor(props, context) {
    super(props, context)

    this.init(['类别', '中心点'])
  }

  renderTree() {
    const { data } = this.props
    let clusters =data.clusters
    return (
      <Tree
        showIcon
        showLine
        defaultExpandedKeys={['root']}
      >
        <TreeNode title="root" key="root">
          {
            clusters.map(c => {
              let {clusterId, exampleIds} = c
              let key = 'Clster_' + clusterId
              return (
                <TreeNode title={key} key={key}>
                  {exampleIds.map(id => <TreeNode title={'id_' + id} key={id}/>)}
                </TreeNode>
              )
            })
          }
        </TreeNode>
      </Tree>
    )
  }

  renderCentroids() {
    const { data } = this.props
    let { centroids, attributeNames } = data
    let th = ['Attribute'].concat(centroids.map((c, i) => 'cluster_' + i))
    const columns = th.map(t => ({
      title: t,
      dataIndex: t,
      key: t,
      width: 40
    }))

    let datasource = attributeNames.map((a, i) => {
      let data = { Attribute: a }
      centroids.forEach((c, j) => data[th[j + 1]] = c[i])
      return data
    })

    return (
      <Table
        dataSource={datasource}
        rowKey="clusterId"
        size="small"
        bordered
        columns={columns}
        pagination={pagination}
      />
    )
  }

  render() {
    let tabs = this.state.tabs
    let body = [this.renderTree(), this.renderCentroids()]
    return (
      <div id="pio-kmeans-result-tree">
        {this.renderTabType()}
        {body.map((c, i) => this.resultBody(c, tabs[i]))}
      </div>
    )
  }
}
