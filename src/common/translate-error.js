
export const translateError = (err) => {
  let msg = err.message
  if (msg === 'Request Aborted' || msg === 'Queued task aborted') {
    return new Error('请求被取消')
  }
  return err
}
