/**
 * @Author sugo.io<asd>
 * @Date 17-9-26
 */

import Resources from './resources'

export default {

  /**
   * @param {string} id
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async info(id, done){
    const ret = await Resources.info(id)
    done(ret.success ? ret.result : { message: ret.message })
  },

  /**
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async list(done){
    const ret = await Resources.list()
    done(ret.success ? ret.result : { message: ret.message })
  }
}
