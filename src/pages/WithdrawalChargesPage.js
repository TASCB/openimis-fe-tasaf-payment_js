import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Grid, Tab, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import _debounce from 'lodash/debounce';
import {
  formatMessage, formatMessageWithValues, journalize, Searcher,
} from '@openimis/fe-core';
import { fetchFspProviders, fetchWithdrawalCharges } from '../actions';
import FspChargesConfig from '../components/charges/FspChargesConfig';
import FspProvidersConfig from '../components/charges/FspProvidersConfig';
import { MODULE_NAME, DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from '../constants';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  bar: { padding: theme.spacing(1, 2) },
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' },
  selectedTab: { borderBottom: '4px solid white', minWidth: 'auto' },
  unselectedTab: { borderBottom: '4px solid transparent', minWidth: 'auto' },
}));

const SUB_TABS = [['list', 'charges.tab.list'], ['config', 'charges.tab.config'], ['providers', 'charges.tab.providers']];

function WithdrawalChargesPage() {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, values) => formatMessageWithValues(intl, MODULE_NAME, id, values);
  const state = useSelector((s) => s.tasafPayment);

  const [subTab, setSubTab] = useState('list');
  const [reset, setReset] = useState(0);
  const submitting = state?.submittingMutation;
  const prevSubmitting = useRef();

  const fetch = useCallback(_debounce(
    (params) => dispatch(fetchWithdrawalCharges(params)), 400,
  ), []);

  useEffect(() => {
    if (prevSubmitting.current && !submitting) {
      dispatch(journalize(state?.mutation));
      setReset((k) => k + 1);
      dispatch(fetchFspProviders());
    }
  }, [submitting]);
  useEffect(() => { prevSubmitting.current = submitting; });

  const headers = () => [
    'charges.fspCode', 'charges.lowerAmount', 'charges.upperAmount',
    'charges.withdrawal', 'charges.effectiveFrom',
  ];

  const sorts = () => [
    ['fspCode', true], ['lowerAmount', true], ['upperAmount', true],
    ['withdrawal', true], ['effectiveFrom', true],
  ];

  const itemFormatters = () => [
    (c) => c.fspCode,
    (c) => c.lowerAmount,
    (c) => c.upperAmount,
    (c) => (Number(c.withdrawal) === 0 ? t('charges.noCharge') : c.withdrawal), // 0 is a deliberate "no charge", not a missing value 
    (c) => c.effectiveFrom ?? '',
  ];

  return (
    <div className={classes.page}>
      <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
        {SUB_TABS.map(([value, label]) => (
          <Tab
            key={value}
            value={value}
            label={t(label)}
            selected={subTab === value}
            className={subTab === value ? classes.selectedTab : classes.unselectedTab}
            onChange={(e, v) => setSubTab(v)}
          />
        ))}
      </Grid>

      {subTab === 'config' && <FspChargesConfig />}
      {subTab === 'providers' && <FspProvidersConfig />}

      {subTab === 'list' && (
        <>
          <Grid container alignItems="center" className={classes.bar}>
            <Grid item>
              <Typography variant="h6">{t('charges.title')}</Typography>
            </Grid>
          </Grid>
          <Searcher
            key={`charges-${reset}`}
            module={MODULE_NAME}
            fetch={fetch}
            items={state?.withdrawalCharges ?? []}
            itemsPageInfo={state?.withdrawalChargesPageInfo}
            fetchingItems={state?.fetchingWithdrawalCharges}
            fetchedItems={state?.fetchedWithdrawalCharges}
            errorItems={state?.errorWithdrawalCharges}
            tableTitle={tv('charges.searcherTitle', {
              count: state?.withdrawalChargesTotalCount ?? 0,
            })}
            headers={headers}
            sorts={sorts}
            itemFormatters={itemFormatters}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            defaultPageSize={DEFAULT_PAGE_SIZE}
            defaultOrderBy="fspCode"
            rowIdentifier={(c) => c.id}
          />
        </>
      )}
    </div>
  );
}

export default WithdrawalChargesPage;
