/**
 * 
 * @param {*} projectCurrentId 当前项目id
 * @param curIndex 当前页面位置 tag_macroscopic_cur_fields 或 user_list_cur_fields
 * @param activeIndex 当前页面位置 user_list_activeTreeIds 或 tag_macroscopic_activeTreeIds
 */
export function getCurFieldsAndTreeIds(projectCurrentId,curIndex,activeIndex){
  let { user:{id:user_id}} = window.sugo
  let localCurFields = _.get(JSON.parse(localStorage.getItem(curIndex)),`${projectCurrentId}.${user_id}.nextCurFields`)
  let localActiveTreeIds = _.get(JSON.parse(localStorage.getItem(activeIndex)),`${projectCurrentId}.${user_id}.nextActiveTreeIds`)
  return {
    localCurFields,
    localActiveTreeIds
  }
}
