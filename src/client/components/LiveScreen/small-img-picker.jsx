import {Button, message, Upload} from 'antd'
import {Icon} from '@ant-design/compatible'
import React from 'react'

export default function SmallImagePicker({value, onChange, defaultValue, imgStyle = {}, children, ...rest}) {
  return (
    <div {...rest}>
      {value
        ? (
          <img
            title="点击则取消设置图片"
            className="mg1b pointer"
            src={value}
            alt=""
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              backgroundColor: '#fff',
              backgroundImage: 'linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd), linear-gradient(45deg, #ddd 25%, transparent 25%, transparent 75%, #ddd 75%, #ddd)',
              backgroundSize: '1em 1em',
              backgroundPosition: '0 0,.5em .5em',
              ...imgStyle
            }}
            onClick={() => onChange(null)}
          />
        )
        : (
          <Upload
            accept="image/svg+xml,image/png"
            fileList={[]}
            beforeUpload={file => {
              if (1024 * 100 < file.size) { // 100 kb
                message.warn('小图片不能大于 100 kb')
                return false
              }
              const reader = new FileReader()
              reader.onload = e => onChange(e.target.result)
              reader.readAsDataURL(file)
              return false
            }}
          >
            {children || (
              <Button><Icon type="upload"/> 选择小图片</Button>
            )}
          </Upload>
        )}
    </div>
  )
}
