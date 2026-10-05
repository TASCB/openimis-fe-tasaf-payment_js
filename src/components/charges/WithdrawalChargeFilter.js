import React from 'react';
import { useSelector } from 'react-redux';
import _debounce from 'lodash/debounce';
import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  ControlledField, SelectInput, TextInput, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import { MODULE_NAME } from '../../constants';

const useStyles = makeStyles((theme) => ({
  form: { padding: '0 0 10px 0', width: '100%' },
  item: { padding: theme.spacing(1) },
}));

const isAmount = (v) => v !== '' && !Number.isNaN(Number(v));

function WithdrawalChargeFilter({ filters, onChangeFilters }) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const providers = useSelector((s) => s.tasafPayment?.fspProviders ?? []);
  const debounced = _debounce(onChangeFilters, 400);
  const value = (id) => filters?.[id]?.value ?? '';

  const amountFilter = (id, toFilter) => (v) => debounced([
    { id, value: v, filter: isAmount(v) ? toFilter(v) : '' },
  ]);

  const field = (id, node) => (
    <ControlledField
      module={MODULE_NAME}
      id={`WithdrawalChargeFilter.${id}`}
      field={<Grid item xs={12} sm={6} md={3} className={classes.item}>{node}</Grid>}
    />
  );

  return (
    <Grid container className={classes.form}>
      {field('fsp', (
        <SelectInput
          module={MODULE_NAME}
          label="chargesFilter.fsp"
          options={[{ value: '', label: formatMessage('chargesFilter.anyFsp') },
            ...providers.map((p) => ({ value: p.fspCode, label: `${p.fspCode} — ${p.name}` }))]}
          value={value('fsp')}
          onChange={(v) => onChangeFilters([{ id: 'fsp', value: v, filter: v ? `fspCode: "${v}"` : '' }])}
        />
      ))}
      {field('amount', (
        <TextInput
          module={MODULE_NAME}
          label="chargesFilter.amount"
          value={value('amount')}
          onChange={amountFilter('amount', (v) => `lowerAmount_Lte: "${v}", upperAmount_Gte: "${v}"`)}
        />
      ))}
      {field('feeFrom', (
        <TextInput
          module={MODULE_NAME}
          label="chargesFilter.feeFrom"
          value={value('feeFrom')}
          onChange={amountFilter('feeFrom', (v) => `withdrawal_Gte: "${v}"`)}
        />
      ))}
      {field('feeTo', (
        <TextInput
          module={MODULE_NAME}
          label="chargesFilter.feeTo"
          value={value('feeTo')}
          onChange={amountFilter('feeTo', (v) => `withdrawal_Lte: "${v}"`)}
        />
      ))}
    </Grid>
  );
}

export default WithdrawalChargeFilter;
