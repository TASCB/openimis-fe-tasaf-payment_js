import React, { useCallback } from 'react';
import _debounce from 'lodash/debounce';

import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

import {
  Contributions,
  useModulesManager,
  useTranslations,
  TextInput,
  SelectInput,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  FSP_TYPE_LIST,
  TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY,
  VERIFICATION_STATUS_LIST,
  PRE_AUDIT_STATUS,
  DEFAULT_DEBOUNCE_TIME,
} from '../constants';

const useStyles = makeStyles((theme) => ({
  form: {
    width: '100%',
    paddingBottom: theme.spacing(1),
  },
  item: {
    padding: theme.spacing(1),
  },
  tabsItem: {
    padding: theme.spacing(2, 1, 0),
  },
  tableTitle: theme.table.title,
  tabs: {
    display: 'flex',
    alignItems: 'center',
  },
  selectedTab: {
    borderBottom: '4px solid white',
  },
  unselectedTab: {
    borderBottom: '4px solid transparent',
  },
}));

function PaymentAccountFilter({
  filters,
  onChangeFilters,
  showStatusFilter = true,
  showPreAuditFilter = false,
  fixedVerificationStatus = null,
  verificationTabs = null,
}) {
  const classes = useStyles();
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
    <Grid container className={classes.form} alignItems="center">
      <Grid item xs={12} sm={6} md={4} className={classes.item}>
        <TextInput
          module={MODULE_NAME}
          label="filter.accountNumber"
          value={filterValue('accountNumber_Icontains')}
          onChange={onChangeText('accountNumber_Icontains')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} className={classes.item}>
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
      <Grid item xs={12} sm={6} md={4} className={classes.item}>
        <TextInput
          module={MODULE_NAME}
          label="filter.fspName"
          value={filterValue('fspName_Icontains')}
          onChange={onChangeText('fspName_Icontains')}
        />
      </Grid>
      {showStatusFilter && fixedVerificationStatus === null && (
        <Grid item xs={12} sm={6} md={4} className={classes.item}>
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
        <Grid item xs={12} sm={6} md={4} className={classes.item}>
          <SelectInput
            module={MODULE_NAME}
            label="filter.preAuditStatus"
            options={preAuditStatusOptions}
            value={filterValue('preAuditStatus')}
            onChange={(val) => onChangeFilters([
              { id: 'preAuditStatus', value: val, filter: val ? `preAuditStatus: ${val}` : '' },
            ])}
          />
        </Grid>
      )}
      {!!verificationTabs && (
        <Grid item xs={12} className={classes.tabsItem}>
          <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
            <Contributions
              contributionKey={TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY}
              value={verificationTabs.activeTab}
              onChange={verificationTabs.onChange}
              isSelected={(tab) => tab === verificationTabs.activeTab}
              tabStyle={(tab) => (tab === verificationTabs.activeTab ? classes.selectedTab : classes.unselectedTab)}
              modulesManager={modulesManager}
              passedCount={verificationTabs.passedCount}
              failedCount={verificationTabs.failedCount}
            />
          </Grid>
        </Grid>
      )}
    </Grid>
  );
}

export default PaymentAccountFilter;
