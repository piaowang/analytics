/**
 * Created on 25/02/2017.
 */

import db from '../models'
import _ from 'lodash'
import shortid from 'shortid'
import { defineTypes, PropTypes } from '../../common/checker'
import { returnResult } from '../utils/helper'
import { Response } from '../utils/Response'
import { SugoGalleryService } from '../services/sugo-gallery.service'
import SugoRoleGalleriesService from '../services/sugo-role-galleries.service'

const Checker = {
  Gallery: {
    get: defineTypes({
      id: PropTypes.string.isRequired
    }),
    create: defineTypes({
      parent_id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    }),
    update: defineTypes({
      id: PropTypes.string.isRequired,
      parent_id: PropTypes.string,
      name: PropTypes.string
    }),
    del: defineTypes({
      id: PropTypes.string.isRequired
    }),
    roles: defineTypes({
      id: PropTypes.string.isRequired
    })
  },
  Frame: {
    get: defineTypes({
      id: PropTypes.string.isRequired
    }),
    create: defineTypes({
      name: PropTypes.string.isRequired,
      parent_id: PropTypes.string.isRequired,
      slice_ids: PropTypes.array
    }),
    update: defineTypes({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
      parent_id: PropTypes.string,
      slice_ids: PropTypes.array
    }),
    del: defineTypes({
      id: PropTypes.string.isRequired
    })
  },
  Collection: {
    projectGalleries: defineTypes({
      parentIds: PropTypes.array.isRequired
    }),
    galleryFrames: defineTypes({
      parentId: PropTypes.string.isRequired
    }),
    createOrUpdateGallery: defineTypes({
      parentId: PropTypes.string.isRequired,
      gallery: PropTypes.object.isRequired,
      frames: PropTypes.array.isRequired
    })
  }
}

async function galleriesWithPermission (user_id, company_id) {
  // 用户可查到两种画像：
  // 其一为自己创建的
  
  const order = { order: [['created_at', 'DESC']] }
  const created = await db.SugoGallery.findAll({
    where: {
      company_id
    },
    ...order
  })
  return created.map(g => g.get({ plain: true }))
}

export default {
  
  // =============
  // Galleries
  // =============
  getGalleries: async ctx => {
    const params = ctx.params
    const check = Checker.Gallery.get(params)
    const resp = new Response()
    
    // 添加权限
    if (!check.success) {
      resp.success = check.success
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id:user_id, company_id } = ctx.session.user
    const { id } = params
    const galleries = await galleriesWithPermission(
      user_id,
      company_id
    )
    
    resp.result = galleries.find(g => g.id === id) || {}
    
    return returnResult(ctx, resp.serialize())
  },
  
  createGallery: async ctx => {
    const params = ctx.q
    const check = Checker.Gallery.create(params)
    const resp = new Response()
    if (!check.success) {
      resp.success = check.success
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { name, parent_id } = params
    const { company_id, id:user_id } = ctx.session.user
    const project = await db.SugoProjects.findOne({ where: { id: parent_id, company_id } })
    
    if (!project) {
      resp.success = false
      resp.message = 'Project not find'
      return returnResult(ctx, resp.serialize())
    }
    
    const inst = await db.SugoGallery.create({
      id: shortid(),
      parent_id,
      name,
      company_id,
      created_by: user_id
    })
    resp.result = inst.get({ plain: true })
    
    return returnResult(ctx, resp.serialize())
  },
  
  updateGallery: async ctx => {
    const params = ctx.q
    const check = Checker.Gallery.update(params)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = check.success
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id:user_id, company_id } = ctx.session.user
    const next = Object.assign({ updated_by: user_id, params }, params)
    const { id, name, parent_id, updated_by } = next
    
    const gallery = await db.SugoGallery.findOne({ where: { id, company_id } })
    
    if (!gallery) {
      resp.success = false
      resp.message = '画像不存在'
      return returnResult(ctx, resp.serialize())
    }

    const result = await db.SugoGallery.update(
      { name, parent_id, updated_by },
      {
        where: { id, company_id },
        returning: true
      }
    )
    const success = result[0] > 0
    
    resp.success = success
    resp.message = success ? null : 'Unknown exception'
    resp.result = success ? result[1][0] : {}
    
    return returnResult(ctx, resp.serialize())
  },
  
  deleteGallery: async ctx => {
    const params = ctx.params
    const check = Checker.Gallery.del(params)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = check.success
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { id } = params
    const { id: user_id, company_id } = ctx.session.user
    const res = await SugoGalleryService.deleteGallery(id, company_id)
    
    if (!res.success) {
      resp.message = res.message
    } else {
      resp.result = params
    }
    
    return returnResult(ctx, resp.serialize())
  },
  

  // =============
  // Collection
  // =============
  getProjectGalleries: async ctx => {
    const params = ctx.q
    const check = Checker.Collection.projectGalleries(params)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = check.success
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { user } = ctx.session
    const { parentIds }= params
    const galleries = await galleriesWithPermission(
      user.id,
      user.company_id
    )
    if (galleries) {
      const galleriesRec = galleries
        .filter(g => parentIds.includes(g.parent_id))

      let roleGalleries = await SugoRoleGalleriesService.findSugoRoleGalleriesByGalleryIds(galleriesRec.map(g => g.id))

      roleGalleries.map(rg => rg.get({ plain: true }))   
    
      resp.result = galleriesRec.map( (g) => {
        g.SugoRoleGalleries = roleGalleries.filter( (rg) => rg.gallery_id === g.id) //赋值 SugoRoleGalleries表相关的数据于SugoRole的对象里
        return g
      })
    } else {
      resp.result = []
    }
    
    return returnResult(ctx, resp.serialize())
  },
  
  getGalleryFrames: async ctx => {
    const params = ctx.params
    const check = Checker.Collection.galleryFrames(params)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = check.success
      resp.message = check.message
      return returnResult(ctx, resp.serialize())
    }
    
    const { parentId } = params
    const { company_id, id:user_id } = ctx.session.user
    const galleries = await galleriesWithPermission(
      user_id,
      company_id
    )
    
    const gallery = galleries.find(f => f.id === parentId)
    
    if (!gallery) {
      resp.success = false
      resp.message = 'Gallery not found'
      return returnResult(ctx, resp.serialize())
    }
    
    const frames = await db.SugoGalleryFrame.findAll({
      where: { parent_id: gallery.id },
      order: [['created_at', 'DESC']]
    })
    
    resp.result = frames.map(ins => ins.get({ plain: true }))
    return returnResult(ctx, resp.serialize())
  },
  
  createOrUpdateGallery: async ctx => {
    const transaction = await db.client.transaction({ autocommit: false })
    const params = ctx.q
    const check = Checker.Collection.createOrUpdateGallery(params)
    const resp = new Response()
    
    if (!check.success) {
      resp.success = check.success
      resp.message = check.message
      transaction.rollback()
      return returnResult(ctx, resp.serialize())
    }
    
    let { parentId:project_id, gallery, frames } = params
    const { company_id, id:user_id } = ctx.session.user
    const result = {
      add: [],
      del: [],
      update: []
    }
    const project = await db.SugoProjects.findOne({ where: { id: project_id } })
    
    if (!project) {
      resp.success = false
      resp.message = 'Project not found'
      transaction.rollback()
      return returnResult(ctx, resp.serialize())
    }
    
    const galleries = await db.SugoGallery.findAll({ where: { parent_id: project_id, company_id } })
    const exits_gallery = galleries.find(g => g.id === gallery.id)
    let exits_frames = []
    
    if (!exits_gallery) {
      // 创建gallery
      if (galleries.some(g => g.name === gallery.name)) {
        resp.success = false
        resp.message = `画像名[${gallery.name}]已存在`
        transaction.rollback()
        return returnResult(ctx, resp.serialize())
      }
      
      const check_gallery = Checker.Gallery.create(gallery)
      
      if (!check_gallery.success) {
        resp.success = false
        resp.message = check_gallery.message
        transaction.rollback()
        return returnResult(ctx, resp.serialize())
      }
      
      gallery = { id: shortid(), name: gallery.name, parent_id: project_id, company_id, created_by: user_id }
      await db.SugoGallery.create(gallery, { transaction })
      
    } else {

      // 更新 gallery.name
      await db.SugoGallery.update(
        { name: gallery.name },
        {
          where: {
            id: gallery.id,
            parent_id: project_id
          },
          transaction
        }
      )
      exits_frames = await db.SugoGalleryFrame.findAll({ where: { parent_id: gallery.id } })
    }
    
    const gallery_id = gallery.id
    const compare = (a, b) => a.id === b.id
    const add = frames.filter(f => !exits_frames.some(fr => compare(f, fr)))
    const del = exits_frames.filter(f => !frames.find(fr => compare(f, fr)))
    const update = frames.filter(f => exits_frames.some(fr => compare(f, fr)))
    
    const fm = new Map()
    let duplicated = null
    const set = f => {
      if (fm.has(f.name)) {
        duplicated = f.name
        return true
      }
      fm.set(f.name, f)
      return false
    }
    
    add.some(set)
    update.some(set)
    
    if (duplicated) {
      resp.success = false
      resp.message = `画框名[${duplicated}]重复`
      transaction.rollback()
      return returnResult(ctx, resp.serialize())
    }
    
    if (add.length > 0) {
      let err = null
      const models = add.map(f => ({ ...f, id: shortid(), created_by: user_id, parent_id: gallery_id }))
      
      models.some(f => {
        const r = Checker.Frame.create(f)
        if (!r.success) return (err = r.message)
        return err
      })
      
      if (err !== null) {
        resp.success = false
        resp.message = err
        transaction.rollback()
        return returnResult(ctx, resp.serialize())
      }
      
      const m = await db.SugoGalleryFrame.bulkCreate(models, { transaction })
      result.add = m.map(f => f.get({ plain: true }))
    }
    
    if (del.length > 0) {
      let err = null
      del.some(f => {
        const r = Checker.Frame.del(f)
        if (!r.success) {
          return (err = r.message)
        } else {
          fm.delete(f.name)
        }
        return err
      })
      
      if (err !== null) {
        resp.success = false
        resp.message = err
        transaction.rollback()
        return returnResult(ctx, resp.serialize())
      }
      
      await db.SugoGalleryFrame.destroy({
        where: {
          id: { $in: del.map(f => f.id) },
          parent_id: gallery_id
        },
        transaction
      })
      result.del = del
    }
    
    if (update.length > 0) {
      let err = null
      update.some(f => {
        const r = Checker.Frame.update(f)
        if (!r.success) return (err = r.message)
        return err
      })
      
      if (err !== null) {
        resp.success = false
        resp.message = err
        transaction.rollback()
        return returnResult(ctx, resp.serialize())
      }
      
      const update_arr = []
      for (let f of update) {
        const { name, slice_ids, id } = f
        const prev = exits_frames.find(p => p.id === f.id)
        // 只更新name和slice_ids
        if (prev.name !== name || slice_ids.length !== prev.slice_ids.length || slice_ids.some(p => !prev.slice_ids.includes(p))) {
          await db.SugoGalleryFrame.update(
            { name, slice_ids, updated_by: user_id },
            { where: { id, parent_id: gallery_id }, transaction }
          )
          update_arr.push({ ...f, updated_by: user_id })
        }
      }
      result.update = update_arr
    }
    
    transaction.commit()
    resp.result = { gallery, frames: result.add.concat(result.update) }
    return returnResult(ctx, resp.serialize())
  }
}





