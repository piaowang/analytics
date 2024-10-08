/**
 * Created on 10/05/2017.
 */

import { utils } from 'next-reader'

const generate = utils.short_id

export default {
  query: generate(),
  bulkCreate: generate(),
  update: generate(),
  del: generate(),
  list: generate()
}
