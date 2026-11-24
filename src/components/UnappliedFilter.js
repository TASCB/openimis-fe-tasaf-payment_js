import React, { useCallback, useState } from 'react';
import _debounce from 'lodash/debounce';
import { Grid, withStyles, withTheme } from '@material-ui/core';
import { injectIntl } from 'react-intl';

import {
  PublishedComponent, SelectInput, TextInput, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { MODULE_NAME, DEFAULT_DEBOUNCE_TIME, RETURN_RESOLUTIONS } from '../constants';
import { defaultFilterStyles } from '../utils/styles';
import PaaLocationFilter from './PaaLocationFilter';
import { cycleUuid } from './preAudit/cycleUuid';

const TEXT_FILTERS = [
  ['hhid', 'filter.hhid'],
  ['accountNumber', 'filter.accountNumber'],
  ['fspName', 'filter.fspName'],
  ['batchReference', 'filter.museBatchReference'],
];
const SUGGESTIONS = ['REPAY', 'CASE', 'NONE'];

function UnappliedFilter({ classes, filters, onChangeFilters }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const filterValue = (key) => filters?.[key]?.value ?? '';
  const [location, setLocation] = useState(filters?.locationId?.location ?? null);

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
    { value: 'HELD', label: formatMessage('returned.resolution.HELD') },
  ];
  const suggestedOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...SUGGESTIONS.map((v) => ({ value: v, label: formatMessage(`returned.filter.suggested.${v}`) })),
  ];
  const select = (key, label, options, toFilter) => (
    <Grid item xs={12} sm={6} md={3} className={classes.item}>
      <SelectInput
        module={MODULE_NAME}
        label={label}
        options={options}
        value={filters?.[key]?.value ?? null}
        onChange={(val) => onChangeFilters([{ id: key, value: val, filter: val ? toFilter(val) : '' }])}
      />
    </Grid>
  );

  const field = (key, label) => (
    <Grid item xs={12} sm={6} md={3} className={classes.item}>
      <TextInput module={MODULE_NAME} label={label} value={filterValue(key)} onChange={onChangeText(key)} />
    </Grid>
  );

  return (
    <Grid container className={classes.form} alignItems="flex-end">
      {select('resolution', 'filter.resolution', resolutionOptions, (v) => `resolution: "${v}"`)}
      {select('suggested', 'returned.filter.suggested', suggestedOptions, (v) => `suggested: "${v}"`)}
      {field('reason', 'returned.filter.reason')}
      <Grid item xs={12} sm={6} md={3} className={classes.item}>
        <PublishedComponent
          pubRef="paymentCycle.PaymentCyclePicker"
          withLabel
          label={formatMessage('returned.filter.paymentCycle')}
          value={filters?.paymentCycleId?.cycle ?? null}
          onChange={(cycle) => {
            const id = cycleUuid(cycle);
            onChangeFilters([{
              id: 'paymentCycleId', value: id, cycle, filter: id ? `paymentCycleId: "${id}"` : '',
            }]);
          }}
        />
      </Grid>
      {TEXT_FILTERS.map(([key, label]) => <React.Fragment key={key}>{field(key, label)}</React.Fragment>)}
      <Grid item xs={12}>
        <PaaLocationFilter
          allowRegion
          itemClassName={classes.item}
          value={location}
          onChange={(loc) => {
            setLocation(loc);
            onChangeFilters([{
              id: 'locationId', value: loc?.id ?? null, location: loc, filter: loc?.id ? `locationId: ${loc.id}` : '',
            }]);
          }}
        />
      </Grid>
    </Grid>
  );
}

export default injectIntl(withTheme(withStyles(defaultFilterStyles)(UnappliedFilter)));
