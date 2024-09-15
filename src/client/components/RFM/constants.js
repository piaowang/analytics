/**
 * Created on 18/03/2017.
 */

import { utils } from 'next-reader'
const short_id = utils.short_id
export default {
  UpdateCurrentProject: short_id(),
  UpdateRFMName: short_id(),
  UpdateBaseParam: short_id(),
  UpdateCustomParam: short_id(),
  AddCustomParam: short_id(),
  RemoveCustomParam: short_id(),
  UpdateTime: short_id(),
  QueryRFMResult: short_id(),
  SaveRFM: short_id(),
  DeleteRFM: short_id(),
  AddToUserGroup: short_id()
}


