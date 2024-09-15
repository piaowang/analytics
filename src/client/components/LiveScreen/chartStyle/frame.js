import StyleItem from '../models/styleItem'
import _ from 'lodash'
import React, {useEffect, useRef, useState} from 'react'
import {immutateUpdate} from '../../../../common/sugo-utils'

export function BorderImageSliceEditor({value, onChange, imgUrl, ...rest}) {
  const [imgSize, setImgSize] = useState({scale: 1, naturalWidth: 100, naturalHeight: 100, width: 100, height: 100})
  
  const values = (value || '').split(/\s+/g)
  let [top, right, bottom, left, fill] = values
  top = top || '15'
  right = right || '15'
  bottom = bottom || '15'
  left = left || '15'
  fill = fill || 'fill'
  
  const commonStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    border: '1px solid rgba(0, 0, 0, 0.3)'
  }
  return (
    <div className="relative">
      <img
        className="width-100 border ignore-mouse"
        src={imgUrl}
        onLoad={ev => {
          let {naturalWidth, naturalHeight, width, height} = ev.target
          setImgSize({
            naturalWidth,
            naturalHeight,
            width,
            height,
            scale: width / naturalWidth
          })
        }}
        alt=""
        style={{
          userSelect: 'none'
        }}
      />
      <DragToMove
        className="width-100"
        style={{
          ...commonStyle,
          top: `${parseInt(top) * imgSize.scale}px`,
          height: 3,
          left: '-1px',
          cursor: 'row-resize'
        }}
        value={{x: 0, y: parseInt(top) * imgSize.scale}}
        valueToStyle={pos => ({top: `${pos.y}px`})}
        onChange={({x, y}) => {
          onChange([_.round(y / imgSize.scale), right, bottom, left, fill].join(' '))
        }}
      />

      <DragToMove
        className="height-100"
        style={{
          ...commonStyle,
          left: `${imgSize.width - parseInt(right) * imgSize.scale}px`,
          width: 3,
          top: '-1px',
          cursor: 'col-resize'
        }}
        value={{x: imgSize.width - parseInt(right) * imgSize.scale, y: 0}}
        valueToStyle={pos => ({left: `${pos.x}px`})}
        onChange={({x, y}) => {
          onChange([top, _.round((imgSize.width - x) / imgSize.scale), bottom, left, fill].join(' '))
        }}
      />

      <DragToMove
        className="width-100"
        style={{
          ...commonStyle,
          top: `${imgSize.height - parseInt(bottom) * imgSize.scale}px`,
          height: 3,
          left: '-1px',
          cursor: 'row-resize'
        }}
        value={{x: 0, y: imgSize.height - parseInt(bottom) * imgSize.scale}}
        valueToStyle={pos => ({top: `${pos.y}px`})}
        onChange={({x, y}) => {
          onChange([top, right, _.round((imgSize.height - y) / imgSize.scale), left, fill].join(' '))
        }}
      />

      <DragToMove
        className="height-100"
        style={{
          ...commonStyle,
          left: `${parseInt(left) * imgSize.scale}px`,
          width: 3,
          top: '-1px',
          cursor: 'col-resize'
        }}
        value={{x: parseInt(left) * imgSize.scale, y: 0}}
        valueToStyle={pos => ({left: `${pos.x}px`})}
        onChange={({x, y}) => {
          onChange([top, right, bottom, _.round(x / imgSize.scale), fill].join(' '))
        }}
      />
    </div>
  )
}

export function DragToMove({className, style, value, valueToStyle, onChange, ...rest}) {
  let [pendingVal, setPendingVal] = useState(() => value) // {x, y}
  let domRef = useRef()
  
  useEffect(() => {
    setPendingVal(null)
  }, [value.x, value.y])
  return (
    <div
      ref={domRef}
      {...rest}
      className={`absolute ${className}`}
      style={{
        ...style,
        ...valueToStyle(pendingVal || value)
      }}
      onMouseDown={ev => {
        ev.preventDefault()
        ev.stopPropagation()
        
        let parent = domRef.current.parentElement
        let downX = ev.clientX
        let downY = ev.clientY
        let offsetLeft = 0
        let offsetTop = 0
        // console.log('downX: ', downX, 'downY: ', downY)
        let tempVal
        const onParentMouseMove = ev => {
          offsetLeft = ev.clientX - downX
          offsetTop = ev.clientY - downY
          // console.log('offsetLeft: ', offsetLeft, 'offsetTop: ', offsetTop)
          tempVal = {
            x: _.clamp(value.x + offsetLeft, 0, parent.offsetWidth),
            y: _.clamp(value.y + offsetTop, 0, parent.offsetHeight)
          }
          setPendingVal(tempVal)
        }
        const onParentMouseUp = ev => {
          document.removeEventListener('mousemove', onParentMouseMove)
          document.removeEventListener('mouseup', onParentMouseUp)
          if (tempVal) {
            onChange(tempVal)
          }
        }
        // console.log('value: ', value)
        document.addEventListener('mousemove', onParentMouseMove)
        document.addEventListener('mouseup', onParentMouseUp)
      }}
    />
  )
}

const varNameArr = ['顶部', '右侧', '底部', '左侧']

const presets = [
  {
    'customBorderImg': 'data:image/png;base64,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',
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5jbHMtMSB7CiAgICAgICAgZmlsbDogIzhjY2FmOTsKICAgICAgICBmaWxsLXJ1bGU6IGV2ZW5vZGQ7CiAgICAgICAgb3BhY2l0eTogMC40OwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cGF0aCBpZD0iXzIiIGRhdGEtbmFtZT0iMiIgY2xhc3M9ImNscy0xIiBkPSJNMzAwLDE5NXY1aC01di0ySDV2Mkgwdi01SDJWNUgwVjBINVYySDI5NVYwaDVWNWgtMlYxOTVoMlpNMjk1LDVWM0g1VjVIM1YxOTVINXYySDI5NXYtMmgyVjVoLTJaIi8+Cjwvc3ZnPgo=',
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyBpZD0iXzMiIGRhdGEtbmFtZT0iMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEsIC5jbHMtMiB7CiAgICAgICAgZmlsbDogIzhjY2FmOTsKICAgICAgfQoKICAgICAgLmNscy0xIHsKICAgICAgICBmaWxsLW9wYWNpdHk6IDAuMDQ7CiAgICAgIH0KCiAgICAgIC5jbHMtMiB7CiAgICAgICAgZmlsbC1ydWxlOiBldmVub2RkOwogICAgICAgIG9wYWNpdHk6IDAuNjsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPHJlY3QgaWQ9IuefqeW9ol8yIiBkYXRhLW5hbWU9IuefqeW9oiAyIiBjbGFzcz0iY2xzLTEiIHg9IjQiIHk9IjQiIHdpZHRoPSIyOTIiIGhlaWdodD0iMTkyIiByeD0iNCIgcnk9IjQiLz4KICA8cGF0aCBpZD0i6KeS57q/IiBjbGFzcz0iY2xzLTIiIGQ9Ik01LjUsOGEwLjUsMC41LDAsMCwxLC41LjV2NmEwLjUsMC41LDAsMSwxLTEsMHYtNkEwLjUsMC41LDAsMCwxLDUuNSw4Wm0yLTJoNmEwLjUsMC41LDAsMCwxLDAsMWgtNkEwLjUsMC41LDAsMCwxLDcuNSw2Wm0tMiwxLjVoMXYxaC0xdi0xWk02LDdIN1Y4SDZWN1ptMC41LS41aDF2MWgtMXYtMVptMjkwLS41aDZhMC41LDAuNSwwLDAsMSwwLDFoLTZBMC41LDAuNSwwLDAsMSwyOTYuNSw2Wm04LDJhMC41LDAuNSwwLDAsMSwuNS41djZhMC41LDAuNSwwLDAsMS0xLDB2LTZBMC41LDAuNSwwLDAsMSwzMDQuNSw4Wm0tMi0xLjVoMXYxaC0xdi0xWk0zMDMsN2gxVjhoLTFWN1ptMC41LDAuNWgxdjFoLTF2LTFabTEsMTg5LjVhMC41LDAuNSwwLDAsMSwuNS41djZhMC41LDAuNSwwLDAsMS0xLDB2LTZBMC41LDAuNSwwLDAsMSwzMDQuNSwxOTdabS04LDhoNmEwLjUsMC41LDAsMCwxLDAsMWgtNkEwLjUsMC41LDAsMCwxLDI5Ni41LDIwNVptNy0xLjVoMXYxaC0xdi0xWm0tMC41LjVoMXYxaC0xdi0xWm0tMC41LjVoMXYxaC0xdi0xWk03LjUsMjA1aDZhMC41LDAuNSwwLDAsMSwwLDFoLTZBMC41LDAuNSwwLDEsMSw3LjUsMjA1Wm0tMi04YTAuNSwwLjUsMCwwLDEsLjUuNXY2YTAuNSwwLjUsMCwxLDEtMSwwdi02QTAuNSwwLjUsMCwwLDEsNS41LDE5N1ptMSw3LjVoMXYxaC0xdi0xWk02LDIwNEg3djFINnYtMVptLTAuNS0uNWgxdjFoLTF2LTFaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNSAtNikiLz4KPC9zdmc+Cg==',
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5jbHMtMSB7CiAgICAgICAgZmlsbDogIzhjY2FmOTsKICAgICAgICBmaWxsLXJ1bGU6IGV2ZW5vZGQ7CiAgICAgICAgb3BhY2l0eTogMC41OwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cGF0aCBpZD0iXzQiIGRhdGEtbmFtZT0iNCIgY2xhc3M9ImNscy0xIiBkPSJNMjk5LDIwMEgyODYuOTg4bC0wLjk3NS4wMTIsMC4wMTEtLjAxMkgwVjBIMTMuMTU3bDAuOTg3LS4wMTJMMTQuMTMyLDBIMzAwVjIwMGgtMVpNMjk5LDFIMTMuMTIyTDEsMTMuMDA5VjE5OUgyODcuMDIzTDI5OSwxODdWMVoiLz4KPC9zdmc+Cg==',
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5jbHMtMSB7CiAgICAgICAgZmlsbDogIzhjY2FmOTsKICAgICAgICBmaWxsLXJ1bGU6IGV2ZW5vZGQ7CiAgICAgICAgb3BhY2l0eTogMC4zOwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cGF0aCBpZD0iXzUiIGRhdGEtbmFtZT0iNSIgY2xhc3M9ImNscy0xIiBkPSJNNiwwVjRINDZsMy0zSDE1NmwxLDFoNzRsMiwzaDMzLjcxTDI2OSwyaDI2bDUtMkg2Wk0yOTUsMi43NThWMzMuOTg2bDMsMi44NTRMMjk4LDcybC0yLDFWODhsMywyVjE5NmgxVjBoLTVWMi43NThaTTAsMjAwSDUyLjcxNkw1NSwxOTdoODVsMS0xSDMwMHYtMUgwdjVabTAsMFYxNTguMTY2TDUsMTU0VjEwMmwxLTFWMEg3VjYxbDEsMXY2OWwxLDEuOTUydjM4Ljc4M0wzLDE3N3YyM0gwWiIvPgo8L3N2Zz4K',
    'borderImageSlice': '15 75 54 57 fill',
    'borderImageRepeat': 'stretch stretch'
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyBpZD0iXzYiIGRhdGEtbmFtZT0iNiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICM4Y2NhZjk7CiAgICAgICAgb3BhY2l0eTogMC41OwogICAgICB9CgogICAgICAuY2xzLTEsIC5jbHMtMiB7CiAgICAgICAgZmlsbC1ydWxlOiBldmVub2RkOwogICAgICB9CgogICAgICAuY2xzLTIgewogICAgICAgIGZpbGw6IG5vbmU7CiAgICAgICAgc3Ryb2tlOiAjOGNjYWY5OwogICAgICAgIHN0cm9rZS13aWR0aDogMXB4OwogICAgICAgIG9wYWNpdHk6IDAuMjsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPHBhdGggaWQ9IuW9oueKtl85OF/mi7fotJ1fNSIgZGF0YS1uYW1lPSLlvaLnirYgOTgg5ou36LSdIDUiIGNsYXNzPSJjbHMtMSIgZD0iTTAsMVYwSDI0VjFIMFpNMjMsMGgxbDIsNEgyNVpNMzAwLDFWMEgyNzZWMWgyNFpNMjc3LDBoLTFsLTIsNGgxWk0xLDBIMFYyNEgxVjBaTTAsMjN2MWw0LDJWMjVaTTI5OSwwaDFWMjRoLTFWMFptMSwyM3YxbC00LDJWMjVaTTAsMTk5djFIMjR2LTFIMFptMjMsMWgxbDItNEgyNVptMjc3LTF2MUgyNzZ2LTFoMjRabS0yMywxaC0xbC0yLTRoMVpNMSwyMDBIMFYxNzZIMXYyNFpNMCwxNzd2LTFsNC0ydjFabTI5OSwyM2gxVjE3NmgtMXYyNFptMS0yM3YtMWwtNC0ydjFaIi8+CiAgPHBhdGggaWQ9IuakreWchl8yMF/mi7fotJ1fNiIgZGF0YS1uYW1lPSLmpK3lnIYgMjAg5ou36LSdIDYiIGNsYXNzPSJjbHMtMiIgZD0iTTEyLDExYTMsMywwLDEsMS0zLDNBMywzLDAsMCwxLDEyLDExWm05MiwwYTMsMywwLDEsMS0zLDNBMywzLDAsMCwxLDEwNCwxMVptOTIsMGEzLDMsMCwxLDEtMywzQTMsMywwLDAsMSwxOTYsMTFabTkyLDBhMywzLDAsMSwxLTMsM0EzLDMsMCwwLDEsMjg4LDExWk0xMiw2OGEzLDMsMCwxLDEtMywzQTMsMywwLDAsMSwxMiw2OFptOTIsMGEzLDMsMCwxLDEtMywzQTMsMywwLDAsMSwxMDQsNjhabTkyLDBhMywzLDAsMSwxLTMsM0EzLDMsMCwwLDEsMTk2LDY4Wm05MiwwYTMsMywwLDEsMS0zLDNBMywzLDAsMCwxLDI4OCw2OFpNMTIsMTI2YTMsMywwLDEsMS0zLDNBMywzLDAsMCwxLDEyLDEyNlptOTIsMGEzLDMsMCwxLDEtMywzQTMsMywwLDAsMSwxMDQsMTI2Wm05MiwwYTMsMywwLDEsMS0zLDNBMywzLDAsMCwxLDE5NiwxMjZabTkyLDBhMywzLDAsMSwxLTMsM0EzLDMsMCwwLDEsMjg4LDEyNlpNMTIsMTgzYTMsMywwLDEsMS0zLDNBMywzLDAsMCwxLDEyLDE4M1ptOTIsMGEzLDMsMCwxLDEtMywzQTMsMywwLDAsMSwxMDQsMTgzWm05MiwwYTMsMywwLDEsMS0zLDNBMywzLDAsMCwxLDE5NiwxODNabTkyLDBhMywzLDAsMSwxLTMsM0EzLDMsMCwwLDEsMjg4LDE4M1oiLz4KPC9zdmc+Cg==',
    'borderImageSlice': '33 34 31 35 fill'
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyBpZD0iXzciIGRhdGEtbmFtZT0iNyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAxIiBoZWlnaHQ9IjIwMSIgdmlld0JveD0iMCAwIDMwMSAyMDEiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICM4Y2NhZjk7CiAgICAgICAgb3BhY2l0eTogMC4wNDsKICAgICAgfQoKICAgICAgLmNscy0xLCAuY2xzLTIgewogICAgICAgIGZpbGwtcnVsZTogZXZlbm9kZDsKICAgICAgfQoKICAgICAgLmNscy0yIHsKICAgICAgICBmaWxsOiBub25lOwogICAgICAgIHN0cm9rZTogIzhjY2FmOTsKICAgICAgICBzdHJva2Utd2lkdGg6IDFweDsKICAgICAgICBvcGFjaXR5OiAwLjQ7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxwYXRoIGlkPSLnn6nlvaJfMTJf5ou36LSdIiBkYXRhLW5hbWU9IuefqeW9oiAxMiDmi7fotJ0iIGNsYXNzPSJjbHMtMSIgZD0iTTI3NiwyMDVhMzAsMzAsMCwwLDAsMzAtMzBWMzVBMzAsMzAsMCwwLDAsMjc2LDVIMzZBMzAsMzAsMCwwLDAsNiwzNVYxNzVhMzAsMzAsMCwwLDAsMzAsMzBIMjc2WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTUuNSAtNC41KSIvPgogIDxwYXRoIGlkPSLnn6nlvaJfMTIiIGRhdGEtbmFtZT0i55+p5b2iIDEyIiBjbGFzcz0iY2xzLTIiIGQ9Ik0yNTYsNWgyMGEzMCwzMCwwLDAsMSwzMCwzMFYxNzVhMzAsMzAsMCwwLDEtMzAsMzBIMjU2TTU2LDIwNUgzNkEzMCwzMCwwLDAsMSw2LDE3NVYzNUEzMCwzMCwwLDAsMSwzNiw1SDU2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNS41IC00LjUpIi8+Cjwvc3ZnPgo=',
    'borderImageSlice': '42 54 37 63 fill'
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyBpZD0iXzgiIGRhdGEtbmFtZT0iOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICM4Y2NhZjk7CiAgICAgICAgb3BhY2l0eTogMC4zNDsKICAgICAgfQoKICAgICAgLmNscy0xLCAuY2xzLTIgewogICAgICAgIGZpbGwtcnVsZTogZXZlbm9kZDsKICAgICAgfQoKICAgICAgLmNscy0yIHsKICAgICAgICBmaWxsOiAjMTZkMGZmOwogICAgICB9CiAgICA8L3N0eWxlPgogIDwvZGVmcz4KICA8cGF0aCBpZD0i5b2i54q2Xzk5X+aLt+i0nV8zIiBkYXRhLW5hbWU9IuW9oueKtiA5OSDmi7fotJ0gMyIgY2xhc3M9ImNscy0xIiBkPSJNMC4zNzIsMTg0LjM4M2wwLjUtLjg2NkwyNywxOTh2MlpNMCw2SDFWMTg0SDBWNlpNMCw3VjZMNiwwVjFaTTIyLDBWMUg2VjBIMjJaTTUsOUg2VjgzSDVWOVptMCwxVjlMOSw1VjZaTTUsODJ2MWw0LDRWODZabTMsNEg5djI5SDhWODZabTI5MS42MjgsOTguMzgzLTAuNS0uODY2TDI3MywxOTh2MlpNMzAwLDZoLTFWMTg0aDFWNlptMCwxVjZsLTYtNlYxWk0yNzgsMFYxaDE2VjBIMjc4Wm0xNyw5aC0xVjgzaDFWOVptMCwxVjlsLTQtNFY2Wm0wLDcydjFsLTQsNFY4NlptLTMsNGgtMXYyOWgxVjg2WiIvPgogIDxwYXRoIGlkPSLnn6nlvaJfMTNf5ou36LSdXzIiIGRhdGEtbmFtZT0i55+p5b2iIDEzIOaLt+i0nSAyIiBjbGFzcz0iY2xzLTIiIGQ9Ik0xMCwwSDIyTDIwLDNIMTJabTMsMTkxLjUxN0wyNywyMDB2LTRsLTEwLjc3MS02LjA4MVpNMjkwLDBIMjc4bDIsM2g4Wm0tMywxOTEuNTE3TDI3MywyMDB2LTRsMTAuNzcxLTYuMDgxWiIvPgo8L3N2Zz4K',
    'borderImageSlice': '18 33 24 30 fill',
    'borderImageRepeat': 'stretch stretch'
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyBpZD0iXzkiIGRhdGEtbmFtZT0iOSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiPgogIDxkZWZzPgogICAgPHN0eWxlPgogICAgICAuY2xzLTEgewogICAgICAgIGZpbGw6ICM4Y2NhZjk7CiAgICAgICAgb3BhY2l0eTogMC4yOwogICAgICB9CgogICAgICAuY2xzLTEsIC5jbHMtMiB7CiAgICAgICAgZmlsbC1ydWxlOiBldmVub2RkOwogICAgICB9CgogICAgICAuY2xzLTIgewogICAgICAgIGZpbGw6ICMxNmQwZmY7CiAgICAgIH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDxwYXRoIGlkPSLlvaLnirZfOTlf5ou36LSdXzciIGRhdGEtbmFtZT0i5b2i54q2IDk5IOaLt+i0nSA3IiBjbGFzcz0iY2xzLTEiIGQ9Ik0yLDNWMkgzMDBWM0gyWk0wLDE5N3YtMUgzMDB2MUgwWk0yOTcsMmgxVjE5N2gtMVYyWk0yLDJIM1YxOTdIMlYyWiIvPgogIDxwYXRoIGlkPSLnn6nlvaJfMTNf5ou36LSdXzUiIGRhdGEtbmFtZT0i55+p5b2iIDEzIOaLt+i0nSA1IiBjbGFzcz0iY2xzLTIiIGQ9Ik0wLDBIOFY1SDBWMFpNMTMsMGgyVjVIMTNWMFpNMjkyLDE5NGg4djVoLTh2LTVabS0zNSwwaDF2NWgtMXYtNVpNMjk1LDBoNVY4aC01VjBabTAsMTVoNXYyaC01VjE1Wk0wLDE5Mkg1djhIMHYtOFptMC0zNUg1djFIMHYtMVoiLz4KPC9zdmc+Cg==',
    'borderImageSlice': '23 52 52 30 fill'
  },
  {
    'customBorderImg': 'data:image/svg+xml;base64,PHN2ZyBpZD0iXzEwIiBkYXRhLW5hbWU9IjEwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMzAwIDIwMCI+CiAgPGRlZnM+CiAgICA8c3R5bGU+CiAgICAgIC5jbHMtMSwgLmNscy0yLCAuY2xzLTMgewogICAgICAgIGZpbGw6ICM4Y2NhZjk7CiAgICAgIH0KCiAgICAgIC5jbHMtMSB7CiAgICAgICAgb3BhY2l0eTogMC4yOwogICAgICB9CgogICAgICAuY2xzLTIsIC5jbHMtMyB7CiAgICAgICAgZmlsbC1ydWxlOiBldmVub2RkOwogICAgICB9CgogICAgICAuY2xzLTIgewogICAgICAgIG9wYWNpdHk6IDAuNDsKICAgICAgfQogICAgPC9zdHlsZT4KICA8L2RlZnM+CiAgPHJlY3QgaWQ9IuefqeW9ol8xMyIgZGF0YS1uYW1lPSLnn6nlvaIgMTMiIGNsYXNzPSJjbHMtMSIgeD0iMTYyIiB5PSIxMCIgd2lkdGg9IjczIiBoZWlnaHQ9IjYiLz4KICA8cGF0aCBpZD0i5b2i54q2XzEwMCIgZGF0YS1uYW1lPSLlvaLnirYgMTAwIiBjbGFzcz0iY2xzLTIiIGQ9Ik0zNi44NDgsMTk5Ljk5MWExNC4yMTYsMTQuMjE2LDAsMCwxLTEwLjEzMS00LjIwN0w1LjcsMTc0LjcxNGExNC4yODQsMTQuMjg0LDAsMCwxLTQuMi0xMC4xNTZWMzIuOTIyQTE0LjI4NCwxNC4yODQsMCwwLDEsNS43LDIyLjc2NkwyNi43MTYsMS43LDI3LjQyMywyLjQsNi40LDIzLjQ3NWExMy4yODgsMTMuMjg4LDAsMCwwLTMuOSw5LjQ0N1YxNjQuNTU4YTEzLjI4NiwxMy4yODYsMCwwLDAsMy45LDkuNDQ3bDIxLjAyLDIxLjA3YTEzLjIyMywxMy4yMjMsMCwwLDAsOS40MjQsMy45MTN2MVptMjUxLjY4Mi00LjAxTDY5LDE5NnYtMWwyMTkuNTMtLjAyMWM0Ljk0NiwwLDguNDctNC4wMjEsOC40Ny04Ljk3OVY1OGgxVjE4NkMyOTgsMTkxLjUxMSwyOTQuMDI3LDE5NS45ODEsMjg4LjUzLDE5NS45ODFaTTYzLDE5N0g0MmMtNC4wODUsMC04LjQxOS0xLjExLTExLjMwOC00LjAwNkwxMC40OCwxNzIuNzM0QTE1LjI1MSwxNS4yNTEsMCwwLDEsNiwxNjEuODkyVjM1LjU4OGExNS4yNDksMTUuMjQ5LDAsMCwxLDQuNDgtMTAuODQxTDMwLjY5Miw0LjQ4NkExNS4xNzYsMTUuMTc2LDAsMCwxLDQxLjUwNywwaDcwLjExNWExNS4xNjksMTUuMTY5LDAsMCwxLDYuMTQyLDEuMjkxbDQwLjUwOCwxNy44QTEyLjA3NywxMi4wNzcsMCwwLDAsMTYzLDIwSDI4NmExNC4wOCwxNC4wOCwwLDAsMSwxNCwxNC4xNDZWNTJoLTRWMzQuMTQ2QTEwLjA4LDEwLjA4LDAsMCwwLDI4NiwyNEgxNjNhMTYuMDI2LDE2LjAyNiwwLDAsMS02LjMzNC0xLjIzOGwtNDAuNTA5LTE3LjhhMTEuMiwxMS4yLDAsMCwwLTQuNTM1LS45NTNINDEuNTA3QTExLjIwOSwxMS4yMDksMCwwLDAsMzMuNTIsNy4zMjFMMTMuMzA4LDI3LjU4MUExMS4yNjMsMTEuMjYzLDAsMCwwLDEwLDM1LjU4OHYxMjYuM2ExMS4yNjQsMTEuMjY0LDAsMCwwLDMuMzA4LDguMDA3bDIwLjIxMiwyMC4yNkMzNS42NTMsMTkyLjMsMzguOTgzLDE5Myw0MiwxOTNINjN2NFpNMTY0LDE2aC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptOCwwaC0yVjEwaDJ2NlptMTYsNDNoLTVWNThoNXYxWk03MCwxOThINjl2LTVoMXY1Wk0yOTIsMTZoLTJWMTBoMnY2WiIvPgogIDxwYXRoIGlkPSLlvaLnirZfMTAwX+aLt+i0nSIgZGF0YS1uYW1lPSLlvaLnirYgMTAwIOaLt+i0nSIgY2xhc3M9ImNscy0zIiBkPSJNOTYuNTY3LDEySDc2LjU1bDQuNDMzLTRIMTAxWk01NC43NzUsMTJsNC40MzMtNEg3OS4yMjVsLTQuNDMzLDRINTQuNzc1Wk0zMywxMmw0LjQzMy00SDU3LjQ1bC00LjQzMyw0SDMzWm05MCwwSDk4LjU1bDQuNDMzLTRIMTE0Wk00LDE0Ny44NjZIMFYxMjcuODE4SDR2MjAuMDQ4WiIvPgo8L3N2Zz4K',
    'borderImageSlice': '66 69 80 160 fill',
    'borderImageWidth': '66px 70px 80px 165px'
  }
].map((v, i) => ({
  'type': `custom-${i}`,
  'borderImageSlice': '15 15 15 15 fill',
  'borderImageWidth': '40px 40px 40px 40px',
  'borderImageOutset': '0px 0px 0px 0px',
  'borderImageRepeat': 'round round',
  ...v
}))

export default function getFrame(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      type: 'style1',
      customBorderImg: '',
      borderImageSlice: '15 15 15 15 fill',
      borderImageWidth: '40px 40px 40px 40px',
      borderImageOutset: '0px 0px 0px 0px',
      borderImageRepeat: 'round round'
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }

  return [
    new StyleItem({
      title: '边框',
      name: 'frame',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '类型',
          name: 'frameType',
          type: 'select',
          options: [
            { key: 'custom', value: '自定义'},
            ...presets.map((p, i) => {
              return { key: p.type, value: `预设 ${i+1}` }
            }),
            { key: 'style1', value: '类型1'},
            { key: 'style2', value: '类型2'},
            { key: 'style3', value: '类型3'},
            { key: 'style4', value: '类型4'},
            { key: 'style5', value: '类型5'},
            { key: 'style6', value: '类型6'},
            { key: 'style7', value: '类型7'}
          ],
          value: _.get(styleConfig, 'type', 'style1'),
          onChange(v){
            if (_.startsWith(v, 'custom-')) {
              let pos = v.substr(7)
              updateFn([], () => presets[pos])
            } else {
              updateFn('type', () => v)
            }
          }
        }),
        // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Background_and_Borders/Border-image_generator
        ...(_.startsWith(_.get(styleConfig, 'type'), 'custom')
          ? [
            new StyleItem({
              title: '上传边框图片',
              name: 'customBorderImg',
              type: 'fileToDataUrl',
              value: _.get(styleConfig, 'customBorderImg'),
              onChange(v) {
                updateFn('customBorderImg', () => v)
              }
            }),
            _.get(styleConfig, 'customBorderImg') && new StyleItem({
              title: '边框图片切片编辑器',
              name: 'borderImageSlice',
              type: 'borderImageSliceEditor',
              value: _.get(styleConfig, 'borderImageSlice'),
              imgUrl: _.get(styleConfig, 'customBorderImg'),
              onChange(v) {
                updateFn('borderImageSlice', () => v)
              }
            }),
            new StyleItem({
              title: '边框图片切片宽度微调',
              name: 'borderImageSliceAdjust',
              type: 'editorGroup',
              items: _.map((_.get(styleConfig, 'borderImageSlice') || '15 15 15 15 fill').split(/\s+/g), (v, idx, arr) => {
                // skip fill
                return idx === 4 ? null : new StyleItem({
                  title: varNameArr[idx],
                  name: `borderImageSlice-${idx}`,
                  type: 'number',
                  value: parseInt(v) || 0,
                  className: 'width-40',
                  onChange(v) {
                    let next = immutateUpdate(arr, idx, () => v).join(' ')
                    updateFn('borderImageSlice', () => next)
                  }
                })
              }).filter(_.identity)
            }),
            new StyleItem({
              title: '边框图片宽度',
              name: 'borderImageWidth',
              type: 'editorGroup',
              items: _.map((_.get(styleConfig, 'borderImageWidth') || '40px 40px 40px 40px').split(/\s+/g), (v, idx, arr) => {
                return new StyleItem({
                  title: varNameArr[idx],
                  name: `borderImageWidth-${idx}`,
                  type: 'number',
                  value: parseInt(v) || 0,
                  className: 'width-40',
                  onChange(v) {
                    let next = immutateUpdate(arr, idx, () => `${v}px`).join(' ')
                    updateFn('borderImageWidth', () => next)
                  }
                })
              })
            }),
            new StyleItem({
              title: '边框图片起点',
              name: 'borderImageOutset',
              type: 'editorGroup',
              items: _.map((_.get(styleConfig, 'borderImageOutset') || '40px 40px 40px 40px').split(/\s+/g), (v, idx, arr) => {
                return new StyleItem({
                  title: varNameArr[idx],
                  name: `borderImageOutset-${idx}`,
                  type: 'number',
                  value: parseInt(v) || 0,
                  className: 'width-40',
                  onChange(v) {
                    let next = immutateUpdate(arr, idx, () => `${v}px`).join(' ')
                    updateFn('borderImageOutset', () => next)
                  }
                })
              })
            }),
            new StyleItem({
              title: '边框图片重复模式',
              name: 'borderImageRepeat',
              type: 'editorGroup',
              items: _.map((_.get(styleConfig, 'borderImageRepeat') || 'round round').split(/\s+/g), (v, idx, arr) => {
                return new StyleItem({
                  title: idx === 0 ? '水平' : '垂直',
                  name: `borderImageRepeat-${idx}`,
                  type: 'select',
                  options: [
                    { key: 'repeat', value: '重复'},
                    { key: 'stretch', value: '拉伸'},
                    { key: 'round', value: '重复并取整'}
                  ],
                  value: v,
                  onChange(v){
                    let next = immutateUpdate(arr, idx, () => v).join(' ')
                    updateFn('borderImageRepeat', () => next)
                  }
                })
              })
            })
          ].filter(_.identity)
          : [])
      ]
    })
  ]

}
