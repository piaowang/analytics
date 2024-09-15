/**
 * Created on 25/02/2017.
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/gallery.controller',
  class: '用户运营',
  group: '用户画像'


}

const routes = [
  // 画像
  {
    path: '/get/:id',
    title: '获取画像',
    method: 'get',
    func: 'getGalleries'
  },
  {
    path: '/create',
    title: '创建画像',
    method: 'post',
    func: 'createGallery'
  },
  {
    path: '/update',
    title: '编辑画像',
    method: 'post',
    func: 'updateGallery'
  },
  {
    path: '/delete/:id',
    title: '删除画像',
    method: 'get',
    func: 'deleteGallery'
  },
  // 聚合
  {
    path: '/collection/gallery',
    title: '项目下的所有画像',
    method: 'get',
    func: 'getProjectGalleries'
  },
  {
    path: '/collection/frames/:parentId',
    title: '画像下的所有相框',
    method: 'get',
    func: 'getGalleryFrames'
  },
  {
    path: '/collection/create',
    title: '创建或更新画像',
    method: 'post',
    func: 'createOrUpdateGallery'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/gallery'
}
