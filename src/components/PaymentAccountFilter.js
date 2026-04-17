import React, { useCallback } from 'react';
import _debounce from 'lodash/debounce';

import { Grid } from '@material-ui/core';

import { useModulesManager, useTranslations, TextInput, SelectInput } from '@openimis/fe-core';

import {
  MODULE_NAME,
  FSP_TYPE_LIST,
  VERIFICATION_STATUS_LIST,
  PRE_AUDIT_STATUS,
  DEFAULT_DEBOUNCE_TIME,
} from '../constants';

function PaymentAccountFilter({
  filters,
  onChangeFilters,
  showStatusFilter = true,
  showPreAuditFilter = false,
  fixedVerificationStatus = null,
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
    debouncedOnChange([{ id: key, value: val, filter: val ? `${key}: "${val}"` : '' }]);
  };

  const fspTypeOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...FSP_TYPE_LIST.map((t) => ({ value: t, label: formatMessage(`paymentAccount.fspType.${t}`) })),
  ];

  const verificationStatusOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...VERIFICATION_STATUS_LIST.map((s) => ({
      value: s,
      label: formatMessage(`paymentAccount.verificationStatus.${s}`),
    })),
  ];

  const preAuditStatusOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...Object.values(PRE_AUDIT_STATUS).map((s) => ({
      value: s,
      label: formatMessage(`paymentAccount.preAuditStatus.${s}`),
    })),
  ];

  return (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={3}>
        <TextInput
          module={MODULE_NAME}
          label="filter.accountNumber"
          value={filterValue('accountNumber_Icontains')}
          onChange={onChangeText('accountNumber_Icontains')}
        />
      </Grid>
      <Grid item xs={3}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.fspType"
          options={fspTypeOptions}
          value={filterValue('fspType')}
          onChange={(val) => onChangeFilters([
            { id: 'fspType', value: val, filter: val ? `fspType: "${val}"` : '' },
          ])}
        />
      </Grid>
      <Grid item xs={3}>
        <TextInput
          module={MODULE_NAME}
          label="filter.fspName"
          value={filterValue('fspName_Icontains')}
          onChange={onChangeText('fspName_Icontains')}
        />
      </Grid>
      {showStatusFilter && fixedVerificationStatus === null && (
        <Grid item xs={3}>
          <SelectInput
            module={MODULE_NAME}
            label="filter.verificationStatus"
            options={verificationStatusOptions}
            value={filterValue('verificationStatus')}
            onChange={(val) => onChangeFilters([
              {
                id: 'verificationStatus',
                value: val,
                filter: val !== null && val !== '' ? `verificationStatus: ${val}` : '',
              },
            ])}
          />
        </Grid>
      )}
      {showPreAuditFilter && (
        <Grid item xs={3}>
          <SelectInput
            module={MODULE_NAME}
            label="filter.preAuditStatus"
            options={preAuditStatusOptions}
            value={filterValue('preAuditStatus')}
            onChange={(val) => onChangeFilters([
              { id: 'preAuditStatus', value: val, filter: val ? `preAuditStatus: "${val}"` : '' },
            ])}
          />
        </Grid>
      )}
    </Grid>
  );
}

export default PaymentAccountFilter;
