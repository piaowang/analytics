
import { Card, Popconfirm, Tooltip } from 'antd'
import Icon from '../Common/sugo-icon'
import React from 'react'
import './index.styl'
import _ from 'lodash'
import moment from 'moment'
import { Link } from 'react-router'
import arrowUp from '../../images/arrow-up.png'

export default class TagValueEnhanceList extends React.Component {
  constructor(props) {
    super(props)
  }

  renderItem = (item, i) => {
    const {
      deleteTagEnhance,
      editTagEnhance,
      recalculateTagEnhance,
      cardWidth,
      dimensions
    } = this.props
    const dimension = dimensions.find(d => d.name === item.tag)
    let contentText = ''
    let tagRecStatus = _.get(item, 'tagRecStatus.status', 3)
    let lastComputeTime = _.get(item, 'tagRecStatus.lastComputeTime', '')
    if (tagRecStatus === 0) {
      contentText = '未计算'
    }
    else if (tagRecStatus === 1) {
      contentText = '价值挖掘中...'
    }
    else if (tagRecStatus === 2) {
      contentText = (
        <Link to={'/console/tag-users?tagEnhanceId=' + item.id}>
          <div>潜在高档用户</div>
          <div>{item.topn}</div>
        </Link>
      )
    }
    else if (tagRecStatus === 3) {
      contentText = '价值挖掘失败'
    }
    return (
      <Card className="tag-enhance-item" key={'tagenhance' + i} style={{ width: cardWidth }}>
        <div className="tag-enhance-title">
          {item.name}
          <Popconfirm
            title={`确定删除 "${item.name}" 吗？`}
            placement="topLeft"
            onConfirm={() =>
              deleteTagEnhance(item.id)
            }
          >
            <Tooltip title="删除" placement="right">
              <Icon
                type="sugo-trash"
                className="mg2l font14 color-grey pointer hover-color-red fright"
              />
            </Tooltip>
          </Popconfirm>
          {
            tagRecStatus === 2 ?
              <Tooltip title="重新计算" placement="right">
                <Icon
                  type="sync"
                  className="mg2l font14 color-grey pointer hover-color-red fright"
                  onClick={() => recalculateTagEnhance(item.id)}
                />
              </Tooltip>
              : null
          }
          {
            tagRecStatus === 2 ?
              <Tooltip title="修改" placement="right">
                <Icon
                  type="sugo-edit"
                  className="mg2l font14 color-grey pointer hover-color-red fright"
                  onClick={() => editTagEnhance(item)}
                />
              </Tooltip>
              : null
          }
        </div>
        <div className="tag-enhance-name">
          {(dimension && dimension.title )|| (dimension && dimension.name)}
        </div>
        <div className="tag-enhance-content">
          <div className="tag-enhance-to">
            <div className="tag-enhance-content-title">
              高档位
            </div>
            <div className="tag-enhance-content-name">
              {item.tag_to}
            </div>
          </div>
          <div className="tag-enhance-arrows">
            <img src={arrowUp} className="tag-enhance-arrows-img" />
            <div className="tag-enhance-arrows-text">
              {contentText}
            </div>
          </div>
          <div className="tag-enhance-from">
            <div className="tag-enhance-content-title">
              低档位
            </div>
            <div className="tag-enhance-content-name">
              {item.tag_from}
            </div>
          </div>
          <div className="tag-enhance-content-date">
            {
              lastComputeTime
                ? '分析完成时间：' + moment.unix(lastComputeTime).format('YYYY-MM-DD hh:mm')
                : '-'
            }
          </div>
        </div>
      </Card>
    )
  }

  render() {
    const { dataSource } = this.props
    return (
      <div>
        {
          dataSource.map((p, i) => {
            return this.renderItem(p, i)
          })
        }
      </div>
    )
  }
}
