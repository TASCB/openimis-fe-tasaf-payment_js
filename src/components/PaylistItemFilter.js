import React, { useCallback } from 'react';
import _debounce from 'lodash/debounce';
import { Grid, withStyles, withTheme } from '@material-ui/core';
import { injectIntl } from 'react-intl';

import {
  SelectInput, TextInput, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import PaaLocationFilter from './PaaLocationFilter';
import { MODULE_NAME, PAYLIST_ITEM_STATUS_LIST, DEFAULT_DEBOUNCE_TIME } from '../constants';
import { defaultFilterStyles } from '../utils/styles';

// Text keys are the paylistItem query's own arguments (schema.resolve_paylist_item).
const TEXT_FILTERS = [
  ['hhid', 'filter.hhid'],
  ['benefitCode', 'filter.benefitCode'],
  ['accountNumber', 'filter.accountNumber'],
  ['fspName', 'filter.fspName'],
  ['museReference_Icontains', 'filter.museReference'],
];

function PaylistItemFilter({
  classes, filters, onChangeFilters, location, onChangeLocation,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const filterValue = (key) => filters?.[key]?.value ?? '';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedOnChange = useCallback(
    _debounce((entries) => onChangeFilters(entries), DEFAULT_DEBOUNCE_TIME),
    [onChangeFilters],
  );

  const onChangeText = (key) => (val) => {
    const text = (val ?? '').trim();
    debouncedOnChange([{ id: key, value: val, filter: text ? `${key}: "${text.replace(/"/g, '')}"` : '' }]);
  };

  const statusOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...PAYLIST_ITEM_STATUS_LIST.map((s) => ({ value: s, label: formatMessage(`paylistItem.status.${s}`) })),
  ];

  return (
    <Grid container className={classes.form} alignItems="center">
      {TEXT_FILTERS.map(([key, label]) => (
        <Grid item xs={12} sm={6} md={2} className={classes.item} key={key}>
          <TextInput module={MODULE_NAME} label={label} value={filterValue(key)} onChange={onChangeText(key)} />
        </Grid>
      ))}
      <Grid item xs={12} sm={6} md={2} className={classes.item}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.itemStatus"
          options={statusOptions}
          value={filterValue('status') || null}
          onChange={(val) => onChangeFilters([
            { id: 'status', value: val, filter: val ? `status: ${val}` : '' },
          ])}
        />
      </Grid>
      <Grid item xs={12} className={classes.item}>
        <PaaLocationFilter
          value={location}
          onChange={(loc) => {
            onChangeLocation(loc);
            onChangeFilters([
              { id: 'locationId', value: loc?.id ?? null, filter: loc?.id ? `locationId: ${loc.id}` : '' },
            ]);
          }}
        />
      </Grid>
    </Grid>
  );
}

export default injectIntl(withTheme(withStyles(defaultFilterStyles)(PaylistItemFilter)));
