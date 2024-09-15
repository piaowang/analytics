import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.16.4'
  const arr = [
    'ALTER TABLE sugo_app_version ALTER COLUMN status SET DEFAULT 1;',
    'ALTER TABLE dashboards ALTER COLUMN position_json SET DEFAULT \'[]\';',
    'ALTER TABLE email_log ALTER COLUMN result SET DEFAULT \'{}\';',
    'ALTER TABLE msg_log ALTER COLUMN result SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_log ALTER COLUMN body SET DEFAULT \'{}\';',
    'ALTER TABLE path_analysis ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE segment ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE segment_expand ALTER COLUMN message SET DEFAULT \'\';',
    'ALTER TABLE segment_expand ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE slices ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_behavior_analytic_models ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_company ALTER COLUMN active SET DEFAULT true;',
    'ALTER TABLE sugo_company ALTER COLUMN is_root SET DEFAULT false;',
    'ALTER TABLE sugo_company ALTER COLUMN deleted SET DEFAULT false;',
    'ALTER TABLE sugo_custom_orders ALTER COLUMN dimensions_order SET DEFAULT \'[]\';',
    'ALTER TABLE sugo_custom_orders ALTER COLUMN metrics_order SET DEFAULT \'[]\';',
    'ALTER TABLE sugo_data_monitor_alarm_histories ALTER COLUMN metric_alarm_info_dict SET DEFAULT \'[]\';',
    'ALTER TABLE sugo_data_monitor_alarm_histories ALTER COLUMN push_sms SET DEFAULT false;',
    'ALTER TABLE sugo_data_monitor_alarm_histories ALTER COLUMN push_email SET DEFAULT false;',
    'ALTER TABLE sugo_data_monitor_alarm_histories ALTER COLUMN push_api SET DEFAULT false;',
    'ALTER TABLE sugo_data_monitors ALTER COLUMN layouts SET DEFAULT \'[]\';',
    'ALTER TABLE sugo_data_monitors ALTER COLUMN slice_rules_dict SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_data_monitors ALTER COLUMN slice_alarm_config_dict SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_data_monitors ALTER COLUMN slice_status_dict SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_data_monitors ALTER COLUMN slice_alarm_config_dict SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_data_monitors ALTER COLUMN slice_refresh_dict SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_datasources ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_datasources ALTER COLUMN filter SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_datasources ALTER COLUMN "supervisorJson" SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_funnels ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_livefeeds ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_livefeeds ALTER COLUMN is_template SET DEFAULT false;',
    'ALTER TABLE sugo_loss_predict_models ALTER COLUMN training_settings SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_loss_predict_models ALTER COLUMN model_info SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_loss_predict_predictions ALTER COLUMN test_settings SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_loss_predict_predictions ALTER COLUMN prediction_info SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_measures ALTER COLUMN type SET DEFAULT 0;',
    'ALTER TABLE sugo_pivot_marks ALTER COLUMN "queryParams" SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_projects ALTER COLUMN type SET DEFAULT \'user-created\';',
    'ALTER TABLE sugo_retentions ALTER COLUMN params SET DEFAULT \'{}\';',
    'ALTER TABLE sugo_traffic_analytic_models ALTER COLUMN params SET DEFAULT \'{}\';'
  ]

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

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
