import React from 'react'
import _ from 'lodash'
import UploadedFileFetcher from '../../Fetcher/uploaded-files-fetcher'
import {UploadedFileType} from '../../../../common/constants'

export const ImageContent = ({styleConfig, useOpenAPI, params, applyInteractionCode, ...rest}) => {

  return (
    <UploadedFileFetcher
      fileId={_.get(styleConfig, 'fileId', '')}
      type={UploadedFileType.Image}
      useOpenAPI={useOpenAPI}
    >
      {({isFetching, data: [singleFile]}) => {
        if (isFetching) return null
        let path = _.get(singleFile, 'path') || ''
        if (styleConfig.file) {
          path = styleConfig.file.path
        }
        return (
          <img
            src={path}
            alt={'图片'}
            title= {_.get(styleConfig,'floatingWindow', '')}
            onClick={() => {
              applyInteractionCode(params)
            }}
            //现改为支持鼠标事件
            // className={`width-100 height-100 ignore-mouse ${styleConfig.className}`}
            className={`width-100 height-100 ${styleConfig.className}`}
          />
        )
      }}
    </UploadedFileFetcher>
  )
}
