import React from 'react'
import FixWidthHelperNoHidden from '../../components/Common/fix-width-helper-no-hidden'
import _ from 'lodash'
import cursorSVG from '../../images/drag-arrow.svg'
import classNames from 'classnames'

export const tileWidth = 192, tileGap = 8, tileHeight = 36


function getXFromEvent(ev) {
  return ev.clientX || ev.pageX
}

function getYFromEvent(ev) {
  return ev.clientY || ev.pageY
}

function calculateFromOffset(offsetX, offsetY, tileCount, maxTileCountInSingleRow) {
  let yPos = Math.floor(offsetY / tileHeight)

  let isHoverLastRow = Math.floor(tileCount / maxTileCountInSingleRow) === yPos
  let tilesInThisRow = isHoverLastRow ? tileCount % maxTileCountInSingleRow : maxTileCountInSingleRow

  if (!tilesInThisRow || offsetX < 0) {
    return {
      action: 'insert',
      index: 0 + yPos * maxTileCountInSingleRow
    }
  }

  let sectionWidth = tileWidth + tileGap
  let xPos = Math.floor(offsetX / sectionWidth)
  if (tilesInThisRow <= xPos) {
    // 拖动到行尾
    return {
      action: 'insert',
      index: tilesInThisRow + yPos * maxTileCountInSingleRow
    }
  }

  let offsetWithinSection = offsetX - sectionWidth * xPos

  if (offsetWithinSection < tileWidth && xPos !== maxTileCountInSingleRow) {
    // 拖动到块上
    return {
      action: 'replace',
      index: xPos + yPos * maxTileCountInSingleRow
    }
  } else {
    // 拖动到间隔处
    return {
      action: 'insert',
      index: xPos + 1 + yPos * maxTileCountInSingleRow
    }
  }
}

function FancyDragIndicator(props) {
  const {dragPosition, maxTileCountInSingleRow} = props
  if (!dragPosition) return null

  let {action, index} = dragPosition

  const sectionWidth = tileWidth + tileGap

  let xPos = index % maxTileCountInSingleRow
  let yPos = Math.floor(index / maxTileCountInSingleRow)

  let ghostArrowLeft
  let ghostArrowTop = tileHeight * yPos
  let dragGhostElement = null
  if (action === 'insert') {
    ghostArrowLeft = xPos * sectionWidth - tileGap / 2
  } else {
    // replace mode
    ghostArrowLeft = xPos * sectionWidth + tileWidth / 2
    let left = xPos * sectionWidth
    dragGhostElement = (
      <div
        className="drag-ghost-element"
        style={{
          left: left,
          top: ghostArrowTop,
          height: tileHeight - 8,
          margin: '4px 0'
        }}
      />
    )
  }

  return (
    <div className="fancy-drag-indicator">
      {dragGhostElement}
      <img
        className="drag-ghost-arrow"
        src={cursorSVG}
        style={{
          left: ghostArrowLeft,
          top: ghostArrowTop - 12
        }}
      />
    </div>
  )
}

export default class SplitTile extends React.Component {
  state = {
    dragPosition: null,
    maxTileCountInSingleRow: 2
  }

  componentDidMount() {
    let {maxTileCountInSingleRow} = this.state

    let width = this._dropArea.offsetWidth
    let tileCapacity = Math.floor(width / (tileWidth + tileGap))
    if (tileCapacity !== maxTileCountInSingleRow) {
      this.setState({maxTileCountInSingleRow: tileCapacity})
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.width !== prevProps.width) {
      let {maxTileCountInSingleRow} = prevState
    
      let width = this._dropArea.offsetWidth
      let tileCapacity = Math.floor(width / (tileWidth + tileGap))
      if (tileCapacity !== maxTileCountInSingleRow) {
        this.setState({maxTileCountInSingleRow: tileCapacity})
      }
    }
  }
  
  calculateDragPosition(e) {
    const {options} = this.props
    let {maxTileCountInSingleRow} = this.state

    let rect = this._dropArea.getBoundingClientRect()
    let offsetX = getXFromEvent(e) - rect.left
    let offsetY = getYFromEvent(e) - rect.top
    return calculateFromOffset(offsetX, offsetY, options.length, maxTileCountInSingleRow)
  }

  onDrop = ev => {
    let {onDropToPosition} = this.props
    let {dragPosition} = this.state

    ev.preventDefault()
    ev.stopPropagation()
    let payload = ev.dataTransfer.getData('text')
    onDropToPosition(payload, dragPosition)
    this.setState({dragPosition: null})
  }

  onDragOver = ev => {
    let {dragPosition} = this.state

    ev.preventDefault()
    ev.stopPropagation()
    let dropToPos = this.calculateDragPosition(ev)
    if (!_.isEqual(dropToPos, dragPosition)) {
      this.setState({dragPosition: dropToPos})
    }
  }

  onDragLeave = () => {
    this.setState({dragPosition: null})
  }

  render() {
    let {tileDomGenerator, options, title, style, hint, className} = this.props
    let {dragPosition, maxTileCountInSingleRow} = this.state

    return (
      <FixWidthHelperNoHidden
        toFix="first"
        toFixWidth="64px"
        className={classNames('condition-bar', className)}
        style={{...style, position: 'relative'}}
        onDrop={this.onDrop}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
      >
        <div className="aligncenter">{title}</div>
        <div
          className="drop-area"
          ref={divRef => this._dropArea = divRef}
        >
          {options.length === 0 ? '\u00a0' : options.map(tileDomGenerator)}
          {hint ? <div className="itblock color-grey mg2l noselect">{hint}</div> : null}
        </div>
        {dragPosition
          ? (
            <FancyDragIndicator
              key="_indicator"
              {...{maxTileCountInSingleRow, dragPosition}}
            />
          )
          : null}
      </FixWidthHelperNoHidden>
    )
  }
}

