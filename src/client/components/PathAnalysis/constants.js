import {checkPermission} from '../../common/permission-control'
export const canEdit = checkPermission('/app/path-analysis/update')
export const canCreate = checkPermission('/app/path-analysis/create')
export const canDel = checkPermission('app/path-analysis/delete')
export const tabMap = {
  all: () => 'all',
  custom: () => 'custom'
}

