/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-03-18 21:08:52
 * @modify date 2019-03-18 21:08:52
 * @description Empty Component from antd Empty
 */
import React from 'react'
import classNames from 'classnames'
import defaultEmptyImg from '../../../images/empty.svg'
import simpleEmptyImg from '../../../images/empty-simple.svg'
import './css.styl'
import PropTypes from 'prop-types'

export class Empty extends React.PureComponent {

  static propTypes = {
    className: PropTypes.string,
    image: PropTypes.any,
    description: PropTypes.string,
    children: PropTypes.any,
    /**
     * @since 3.16.0
     */
    imageStyle: PropTypes.object
  }

  render() {
    const {
      className,
      image = defaultEmptyImg,
      description = '暂无数据',
      children,
      imageStyle,
      ...restProps
    } = this.props

    const des = description
    const alt = typeof des === 'string' ? des : 'empty'
  
    let imageNode = null
    if (typeof image === 'string') {
      imageNode = <img alt={alt} src={image} />
    } else {
      imageNode = image
    }
    const prefixCls = 'sugo-empty'
    return (
      <div
        className={classNames(`${prefixCls}`, {
          [`${prefixCls}-normal`]: image === simpleEmptyImg
        }, className)}
        {...restProps}
      >
        <div className={`${prefixCls}-image`} style={imageStyle}>{imageNode}</div>
        <p className={`${prefixCls}-description`}>{des}</p>
        {children && <div className={`${prefixCls}-footer`}>{children}</div>}
      </div>
    )
  }
}

Empty.PRESENTED_IMAGE_DEFAULT = defaultEmptyImg

Empty.PRESENTED_IMAGE_SIMPLE = simpleEmptyImg

export default Empty
