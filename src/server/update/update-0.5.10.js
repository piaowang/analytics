import { log } from '../utils/log'
import {dropTables} from '../utils/db-utils'

export default async db => {

  /*
 public | ab_permission           | table | postgres
 public | ab_permission_view      | table | postgres
 public | ab_permission_view_role | table | postgres
 public | ab_role                 | table | postgres
 public | ab_user                 | table | postgres
 public | ab_view_menu            | table | postgres
 public | clusters                | table | postgres
 public | dashboard_slices        | table | postgres
 public | dashboards              | table | postgres
 public | datasources             | table | postgres
 public | db_meta                 | table | postgres
 public | dbs                     | table | postgres
 public | funnel                  | table | postgres
 public | overview                | table | postgres
 public | reset_password          | table | postgres
 public | route                   | table | postgres
 public | segment                 | table | postgres
 public | slices                  | table | postgres
 public | sugo_company            | table | postgres
 public | sugo_custom_orders      | table | postgres
 public | sugo_datasources        | table | postgres
 public | sugo_dimensions         | table | postgres
 public | sugo_funnels            | table | postgres
 public | sugo_log                | table | postgres
 public | sugo_measures           | table | postgres
 public | sugo_overview           | table | postgres
 public | sugo_pivot_marks        | table | postgres
 public | sugo_retentions         | table | postgres
 public | sugo_role               | table | postgres
 public | sugo_role_route         | table | postgres
 public | sugo_subscribe          | table | postgres
 public | sugo_track_event        | table | postgres
 public | sugo_user               | table | postgres
 public | sugo_user_role          | table | postgres
 public | tables                  | table | postgres
 public | validate_email          | table | postgres
*/
  let arr = [
    'sugo_overview',
    'ab_permission_view_role',
    'ab_permission_view',
    'ab_permission',
    'ab_role',
    'ab_view_menu',
    'datasources',
    'clusters',
    'tables',
    'funnel',
    'dbs',
    'ab_user'
  ]

  await dropTables(db, arr)

  //remove routes
  await db.Route.destroy({
    where: {
      path: {
        $in: [
          '/app/datasource/get/getDatasourcesWithDimSize',
          '/app/datasource/get/getDatasourcesWithSetting',
          '/api/datacubes',
          '/api/datasource/getDatasourceSetting/:id',
          '/app/insight/get/getUserGroups'
        ]
      }
    }
  })

  //update routes
  await db.Route.update({
    common: false
  }, {
    where: {
      path: {
        $in: [
          '/console/slices',
          '/console/slices/:sliceId',
          '/console/analytic',
          '/console/dashboards',
          '/console/dashboards/:dashboardId',
          '/console/dashboards/new'
        ]
      }
    }
  })

  await db.Meta.create({
    name: 'update-log',
    value: '0.5.10'
  })

  await db.Meta.update({
    value: '0.5.10'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.10 done')
}
