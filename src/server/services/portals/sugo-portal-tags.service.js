import {BaseService} from '../base.service'
import {forAwaitAll} from '../../../common/sugo-utils'
import db from '../../models'

let _inst = null

export default class SugoPortalTagsService extends BaseService {
  constructor() {
    super('SugoPortalTags')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoPortalTagsService()
    }
    return _inst
  }
  
  async findAllKidsParents(kids) {
    const checkFunctionSql = `
    DROP FUNCTION IF EXISTS getParentList;
    `
    const createFunctionSql = `
    CREATE DEFINER=root@localhost FUNCTION getParentList(rootId varchar(1000)) RETURNS VARCHAR(1000) CHARSET utf8 DETERMINISTIC
    BEGIN
    DECLARE sParentList varchar(1000);
    DECLARE sParentTemp varchar(1000);
    SET sParentTemp =cast(rootId as CHAR);
    WHILE sParentTemp is not null DO
    IF (sParentList is not null) THEN
    SET sParentList = concat(sParentTemp,',',sParentList);
    ELSE
    SET sParentList = concat(sParentTemp);
    END IF;
    SELECT group_concat(parent_id) INTO sParentTemp FROM sugo_portal_tags where FIND_IN_SET(id,sParentTemp)>0;
    END WHILE;
    RETURN sParentList;
    END;
    `
  
    const deleteSql = `
    DROP FUNCTION IF EXISTS getParentList;
    `
  
    await db.client.query(checkFunctionSql)
    await db.client.query(createFunctionSql)
  
    let allNodes = []
    await forAwaitAll(kids, async(kid) => {
      const querySql = `
      select * From sugo_portal_tags where FIND_IN_SET(id, getParentList('${kid}')) and sugo_portal_tags.id <> 'unTyped'
      `
      let chain = await db.client.query(querySql, { raw: true })
      chain = chain[0]
      allNodes = allNodes.concat(chain)
    })
    await db.client.query(deleteSql)
  
    return this.genTree(allNodes)
  }
  
  genTree(list) {
    let temp = {}
    let tree = []
    for (let i in list) {
      temp[list[i].id] = list[i]
    }
    for (let i in temp) {
      if (temp[i].parentId) {
        if (!temp[temp[i].parentId].children) {
          temp[temp[i].parentId].children = []
        }
        temp[temp[i].parentId].children.push(temp[i])
      } else {
        tree.push(temp[i])
      }
    }
    return tree
  }
}
