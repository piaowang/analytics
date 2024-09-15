/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import namespace from './namespace'

/**
 * @param {string} action
 * @return {string}
 */
function creator(action) {
  return namespace + '-module-' + action
}

export default {
  CREATE: creator('create'),
  BASE_CREATE: creator('create-base'),
  BULK_CREATE: creator('bulk-create'),
  FIND_BY_ID: creator('find-by-id'),
  FIND_BY_CODE: creator('find-by-code'),
  FIND_PROJECT_LOG_CODE: creator('find-project-log-code'),
  UPDATE: creator('update'),
  BASE_UPDATE: creator('update-base'),
  DESTROY: creator('destroy')
}
