/**
 * 删除看板的同时自动删除映射表的相关看板，
 * 删除看板分类时也是如此
 *
 */
import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.9'
  const addFKC = [
    `alter table dashboard_slices drop constraint dashboard_slices_dashboard_id_fkey;
alter table dashboard_slices
	add constraint dashboard_slices_dashboard_id_fkey
		foreign key (dashboard_id) references dashboards
			on update cascade on delete cascade;`,
    
    `alter table dashboard_slices drop constraint dashboard_slices_slice_id_fkey;
alter table dashboard_slices
	add constraint dashboard_slices_slice_id_fkey
		foreign key (slice_id) references slices
			on update cascade on delete cascade;`,
    
    `alter table sugo_dashboard_category_map drop constraint sugo_dashboard_category_map_category_id_fkey;
alter table sugo_dashboard_category_map
	add constraint sugo_dashboard_category_map_category_id_fkey
		foreign key (category_id) references sugo_dashboard_category
			on update cascade on delete cascade;`,
    
    `alter table sugo_dashboard_category_map drop constraint sugo_dashboard_category_map_dashboard_id_fkey;
alter table sugo_dashboard_category_map
	add constraint sugo_dashboard_category_map_dashboard_id_fkey
		foreign key (dashboard_id) references dashboards
			on update cascade on delete cascade;`
  ]

  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, addFKC, t)
    
    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)
  
    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })
  
    log(`update ${version} done`)
  })
}
