import React, { useCallback } from 'react';
import _debounce from 'lodash/debounce';
import { Grid, withStyles, withTheme } from '@material-ui/core';
import { injectIntl } from 'react-intl';

import {
  SelectInput, TextInput, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { MODULE_NAME, DEFAULT_DEBOUNCE_TIME, RETURN_RESOLUTIONS } from '../constants';
import { defaultFilterStyles } from '../utils/styles';

const TEXT_FILTERS = [
  ['hhid', 'filter.hhid'],
  ['payeeName', 'filter.payeeName'],
  ['accountNumber', 'filter.accountNumber'],
  ['batchReference', 'filter.museBatchReference'],
  ['reasonCode', 'filter.reasonCode'],
];

function UnappliedFilter({ classes, filters, onChangeFilters }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const filterValue = (key) => filters?.[key]?.value ?? '';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedOnChange = useCallback(
    _debounce((entries) => onChangeFilters(entries), DEFAULT_DEBOUNCE_TIME),
    [onChangeFilters],
  );

  const onChangeText = (key) => (val) => {
    const text = (val ?? '').trim().replace(/"/g, '');
    debouncedOnChange([{ id: key, value: val, filter: text ? `${key}: "${text}"` : '' }]);
  };

  const resolutionOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...RETURN_RESOLUTIONS.map((r) => ({ value: r, label: formatMessage(`returned.resolution.${r}`) })),
  ];

  return (
    <Grid container className={classes.form} alignItems="center">
      <Grid item xs={12} sm={6} md={3} className={classes.item}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.resolution"
          options={resolutionOptions}
          value={filters?.resolution?.value ?? null}
          onChange={(val) => onChangeFilters([
            { id: 'resolution', value: val, filter: val ? `resolution: "${val}"` : '' },
          ])}
        />
      </Grid>
      {TEXT_FILTERS.map(([key, label]) => (
        <Grid item xs={12} sm={6} md={3} className={classes.item} key={key}>
          <TextInput module={MODULE_NAME} label={label} value={filterValue(key)} onChange={onChangeText(key)} />
        </Grid>
      ))}
    </Grid>
  );
}

export default injectIntl(withTheme(withStyles(defaultFilterStyles)(UnappliedFilter)));
