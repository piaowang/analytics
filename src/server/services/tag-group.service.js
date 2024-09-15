/*
 * 用户组合标签服务
 */
import db from '../models'

export async function getTagGroupsByIds(ids) {
  return await db.TagGroup.findAll({
    where: {
      id: {$in: ids}
    },
    raw: true
  })
}

/**
 * 查询
 * @param {object} query
 */
const get = async (query) => {
  let arr = await db.TagGroup.findAll({...query, raw: true})
  let dimension_ids = arr.map(f => f.id)
  let types = await db.TagType.findAll({
    where: {
      dimension_id: {
        $in: dimension_ids
      }
    },
    raw: true
  })
  let tree = types.reduce((prev, t) => {
    prev[t.dimension_id] = t.tag_tree_id
    return prev
  }, {})
  return arr.map(t => {
    return {
      ...t,
      type: tree[t.id]
    }
  })
}

/*
 * 创建组合标签
 * @param {string} usergroup_id 分群id
 * @param {object} params 组合标签条件
 * @return {object} 如果出错，返回 {error: 'xxx'}, 正确返回 {created: {createdTagGroupObject}}
 */
const create = async({
  created_by,
  title,
  description,
  params,
  type,
  datasource_id,
  company_id,
  status,
  role_ids
}) => {

  if (!datasource_id) {
    return {
      error: '缺少必要参数datasource_id'
    }
  }

  let defaults = {
    title,
    datasource_id,
    description,
    created_by,
    updated_by: created_by,
    company_id,
    params,
    status,
    role_ids
  }

  let where = {
    title,
    datasource_id
  }

  let inst = await db.client.transaction(async transaction => {
    let [inst, created] = await db.TagGroup.findOrCreate({
      where,
      transaction,
      defaults
    })
  
    if (!created) {
      return {
        error: '名称已经存在，请换一个名称'
      }
    }
    if (type) {
      await db.TagType.findOrCreate({
        where: {
          dimension_id: inst.id,
          tag_tree_id: type
        },
        defaults: {
          dimension_id: inst.id,
          tag_tree_id: type,
          datasource_id,
          created_by,
          updated_by: created_by,
          company_id,
          status
        },
        transaction
      })
    }
    return {
      ...inst.get({plain: true}),
      type
    }
  })

  return inst
}

/*
 * 删除组合标签
 * @param {string} id 组合标签id
 * @return {object} 删除结果
 */
const del = async({
  ids,
  company_id
}) => {
  return db.client.transaction(async transaction => {
    await db.TagType.destroy({
      where: {
        dimension_id: {
          $in: ids
        },
        company_id
      },
      transaction
    })
    return await db.TagGroup.destroy({
      where: {
        id: {
          $in: ids
        },
        company_id
      },
      transaction
    })
  })

}

/*
 * 更新组合标签
 * @param {string} id 组合标签id
 * @return {object} 删除结果
 */
const update = async({
  id,
  company_id,
  updated_by,
  updateObj
}) => {
  let q = {
    where: {
      id,
      company_id
    }
  }

  let inst = await db.TagGroup.findOne(q)
  if (!inst) {
    throw new Error('组合标签不存在')
  }
  updateObj.updated_by = updated_by

  //重名检测
  if (
    updateObj.title
  ) {
    let eg = await db.TagGroup.findOne({
      where: {
        title: updateObj.title,
        datasource_id: inst.datasource_id
      }
    })
    if (eg && id !== eg.id) {
      throw new Error('名字已经存在，请换一个名称')
    }
  }

  let r = await db.client.transaction(async transaction => {
    let r = await db.TagGroup.update(
      updateObj,
      {...q, transaction}
    )
    // 如果改了分类，则重新建立标签分类数据
    if (updateObj.type) {
      await db.TagType.destroy({
        where: {
          dimension_id: id,
          company_id
        },
        transaction
      })
      await db.TagType.findOrCreate({
        where: {
          dimension_id: inst.id,
          tag_tree_id: updateObj.type
        },
        defaults: {
          dimension_id: id,
          tag_tree_id: updateObj.type,
          datasource_id: inst.datasource_id,
          created_by: updated_by,
          updated_by,
          company_id
        },
        transaction
      })
    }
    return r
  })

  return r
}

export default {
  create,
  del,
  update,
  get
}
