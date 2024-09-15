/*
 * 用户标签分类服务
 */
import db from '../models'
import _ from 'lodash'
import {generate} from 'shortid'
import {DataSourceType, AccessDataType} from '../../common/constants'
import {Response} from '../utils/Response'
import SugoDatasourceService from './sugo-datasource.service'
import { BaseService } from './base.service'

/**
 * 标签类型分类树服务层-CRUD
 */
export default class TagTypeService extends BaseService {
  constructor() {
    super('TagType')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new TagTypeService()
    }
    return this._instance
  }

  /*
  * 创建标签分类
  * @param {string} usergroup_id 分群id
  * @param {object} params 标签分类条件
  * @return {object} 如果出错，返回 {error: 'xxx'}, 正确返回 {created: {createdTagTypeObject}}
  */
  create = async ({ created_by, type, datasource_id, dimension_ids, tag_tree_id, company_id }) => {
    if (!datasource_id) {
      return {
        error: '缺少必要参数datasource_id'
      }
    }
    //insert new records
    let arr = dimension_ids.map(dimension_id => ({
      dimension_id,
      created_by,
      id: generate(),
      tag_tree_id,
      updated_at: new Date(),
      created_at: new Date(),
      updated_by: created_by,
      type,
      datasource_id,
      company_id
    }))

    let final = []
    await db.client.transaction(async transaction => {
      //remove old record
      await db.TagType.destroy({
        where: {
          tag_tree_id,
          dimension_id: {
            $in: dimension_ids
          }
        },
        transaction
      })

      //create
      for (let defaults of arr) {
        let [inst, created] = await db.TagType.findOrCreate({
          where: {
            ..._.pick(defaults, ['dimension_id', 'type'])
          },
          defaults,
          transaction
        })
        if (created) {
          final.push(inst.get({plain: true}))
        }
      }
    })
    return final
  }

  /*
  * 删除标签分类
  * @param {string} id 标签分类id
  * @return {object} 删除结果
  */
  del = async ({ ids, company_id }) => {
    return await db.TagType.destroy({
      where: {
        id: {
          $in: ids
        },
        company_id
      }
    })
  }

  /*
  * 更新标签分类
  * @param {string} id 标签分类id
  * @return {object} 删除结果
  */
  update = async ({ ids, company_id, tag_tree_id, updated_by, updateObj }) => {
    let q = {
      where: {
        id: {
          $in: ids
        },
        company_id
      }
    }

    let inst = await db.TagType.findOne(q)
    if (!inst) {
      throw new Error('标签分类不存在')
    }
    updateObj.updated_by = updated_by
    if (tag_tree_id) {
      updateObj.tag_tree_id = tag_tree_id
    }
    //重名检测
    if (
      updateObj.type
    ) {
      let eg = await db.TagType.findOne({
        where: {
          type: updateObj.type
        }
      })
      if (eg && !ids.includes(eg.id)) {
        throw new Error('名字已经存在，请换一个名称')
      }
    } else {
      throw new Error('标题不能为空')
    }

    let r = await db.TagType.update(
      updateObj,
      q
    )

    return r
  }

  /**
 * 更新标签相关表名称操作
 * @deprecated 后端每天会重新创建一张标签明细表和标签字典表
 * @param {string} prefix 旧表名前缀
 * @param {string} userTagName 新用户标签明细表名称
 * @param {string} tagRefName 新标签引用（字典）表名称
 */
  updateTagTable = async ({ prefix, userTagName, tagRefName }) => {
    return await db.client.transaction(async transaction => {
      // 1. 更新项目表对应的datasource_name和reference_tag_name
      const project = await db.SugoProjects.findOne({
        where: {
          access_type: AccessDataType.Tag,
          datasource_name: {
            $like: `${prefix}%`
          }
        }
      })
      if (project === null) {
        return Response.fail(`【${userTagName}】不存在此表名`)
      }
      await project.update({  
        datasource_name: userTagName,
        reference_tag_name: tagRefName
      }, { transaction })
      // 2. 更数据源表的name
      const datasource = await db.SugoDatasources.findOne({
        where: {
          type: DataSourceType.Uindex,
          name: {
            $like: `${prefix}%`
          }
        }
      })
      if (datasource === null) {
        return Response.fail(`【${userTagName}】不存在此表名`)
      }
      // 3. 同步维度
      await SugoDatasourceService.syncDimension(datasource.id, datasource.company_id, datasource.created_by, transaction)
      await datasource.update({
        name: userTagName,
        taskId: userTagName
      }, { transaction })
      return Response.ok('更新成功')
    })
  }
}
