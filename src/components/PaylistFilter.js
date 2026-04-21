import React from 'react';
import { Grid, withStyles, withTheme } from '@material-ui/core';
import { injectIntl } from 'react-intl';

import { SelectInput, useModulesManager, useTranslations } from '@openimis/fe-core';

import { MODULE_NAME, BATCH_TYPE_LIST, PAYLIST_STATUS } from '../constants';
import { defaultFilterStyles } from '../utils/styles';

function PaylistFilter({ classes, filters, onChangeFilters }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const filterValue = (key) => filters?.[key]?.value ?? null;

  const batchTypeOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...BATCH_TYPE_LIST.map((t) => ({ value: t, label: formatMessage(`paylist.batchType.${t}`) })),
  ];

  const statusOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...Object.values(PAYLIST_STATUS).map((s) => ({ value: s, label: formatMessage(`paylist.status.${s}`) })),
  ];

  return (
    <Grid container className={classes.form} alignItems="center">
      <Grid item xs={12} sm={6} md={4} className={classes.item}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.batchType"
          options={batchTypeOptions}
          value={filterValue('batchType')}
          onChange={(val) => onChangeFilters([
            { id: 'batchType', value: val, filter: val ? `batchType: ${val}` : '' },
          ])}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} className={classes.item}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.paylistStatus"
          options={statusOptions}
          value={filterValue('status')}
          onChange={(val) => onChangeFilters([
            { id: 'status', value: val, filter: val ? `status: ${val}` : '' },
          ])}
        />
      </Grid>
    </Grid>
  );
}

export default injectIntl(withTheme(withStyles(defaultFilterStyles)(PaylistFilter)));
