/**
 * 标签过滤UI
 */

import React from 'react'
import PropTypes from 'prop-types'
import { CaretDownOutlined } from '@ant-design/icons';

export default class TagEnhanceFilter extends React.Component {

  static propTypes = {
    tagFrom: PropTypes.string,
    tagTo: PropTypes.string,
    title: PropTypes.string,
    tagName: PropTypes.string
  }

  static defaultProps = {
    filters: [],
    title: '用户筛选器'
  }

  renderTitle() {
    let { title } = this.props
    return (
      <div className="tag-filter-title tag-filter-section">
        <div className="fix">
          <div className="fleft">
            <span className="tag-filter-title-big bold inline minw100 alignright">{title}</span>
          </div>
        </div>
      </div>
    )
  }


  renderFilters() {
    let { tagTo, tagFrom, tagName } = this.props
    return (
      <div className="tag-filters-wrap">
        <div className="tag-filter-setion tag-enhance-child-section">
          <div className="tag-filter-name elli bold" title="低档位标签">低档位标签</div>
          <div className="tag-filter-content iblock">
            <span className="mg1r">{tagName}</span>
            <div className="tag-filter-item inline">
              <div className="tag-filter-item-name elli iblock mg1r">
                {tagFrom}
              </div>
            </div>
          </div>
        </div>
        <div className="tag-filter-setion tag-enhance-child-section">
          <div className="tag-filter-content iblock">
            <CaretDownOutlined className="font16" />潜力升档为高档
          </div>
        </div>
        <div className="tag-filter-setion tag-enhance-child-section">
          <div className="tag-filter-name elli bold" title="高档位标签">高档位标签</div>
          <div className="tag-filter-content iblock">
            <span className="mg1r">{tagName}</span>
            <div className="tag-filter-item inline">
              <div className="tag-filter-item-name elli iblock mg1r">
                {tagTo}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="tag-filter-wrap tag-setion-wrap">
        <div className="tag-filter-inner tag-setion-inner">
          {this.renderTitle()}
          {this.renderFilters()}
        </div>
      </div>
    )
  }
}
