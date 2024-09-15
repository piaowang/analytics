import UploadedFileFetcher from '../Fetcher/uploaded-files-fetcher'

/**
 * 优化一下文件获取器，一定获取文件时才去查询
 * @param {*} Component
 * @param {*} mapPropsToFetcherProps
 */
export default (Component, mapPropsToFetcherProps = () => ({})) => props => {
  const propcessed = mapPropsToFetcherProps(props)
  const { fileId } = propcessed
  return fileId
    ?
    <UploadedFileFetcher
      {...propcessed}
    >
      {({isFetching, data, fetch, deleteUploadedFile, createUploadedFile}) => {
        const [singleFile] = data
        return (
          <Component
            {...props}
            file={singleFile}
            isFetchingFiles={isFetching}
            reloadFiles={fetch}
            deleteUploadedFile={deleteUploadedFile}
            createUploadedFile={createUploadedFile}
          />
        )
      }}
    </UploadedFileFetcher>
    //withUploadedFiles(Component, mapPropsToFetcherProps)
    : <Component {...props} />
}
