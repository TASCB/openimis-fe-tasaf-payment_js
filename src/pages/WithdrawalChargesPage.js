import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Grid, Tab } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import _debounce from 'lodash/debounce';
import {
  formatMessage, formatMessageWithValues, journalize, Searcher,
} from '@openimis/fe-core';
import { fetchFspMappings, fetchFspProviders, fetchWithdrawalCharges } from '../actions';
import FspDialog from '../components/charges/FspDialog';
import WithdrawalChargeFilter from '../components/charges/WithdrawalChargeFilter';
import FspProvidersConfig from '../components/charges/FspProvidersConfig';
import {
  DEFAULT_PAGE_SIZE, MODULE_NAME, RIGHT_MUSE_SETTINGS_PROPOSE, RIGHT_WITHDRAWAL_CHARGE_MANAGE,
  ROWS_PER_PAGE_OPTIONS,
} from '../constants';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' },
  selectedTab: { borderBottom: '4px solid white', minWidth: 'auto' },
  unselectedTab: { borderBottom: '4px solid transparent', minWidth: 'auto' },
}));

const SUB_TABS = [['providers', 'charges.tab.providers'], ['list', 'charges.tab.list']];

function WithdrawalChargesPage() {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, values) => formatMessageWithValues(intl, MODULE_NAME, id, values);
  const state = useSelector((s) => s.tasafPayment);
  const rights = useSelector((s) => s.core?.user?.i_user?.rights ?? []);
  const [subTab, setSubTab] = useState('providers');
  const [openCode, setOpenCode] = useState(null);
  const [reset, setReset] = useState(0);
  const submitting = state?.submittingMutation;
  const prevSubmitting = useRef();

  const fetch = useCallback(_debounce(
    (params) => dispatch(fetchWithdrawalCharges(params)), 400,
  ), []);

  useEffect(() => {
    dispatch(fetchFspProviders());
    dispatch(fetchFspMappings([]));
  }, []);

  useEffect(() => {
    if (prevSubmitting.current && !submitting) {
      dispatch(journalize(state?.mutation));
      dispatch(fetchFspProviders());
      dispatch(fetchFspMappings([]));
      setReset((k) => k + 1);
    }
  }, [submitting]);
  useEffect(() => { prevSubmitting.current = submitting; });

  const opened = (state?.fspProviders ?? []).find((p) => p.fspCode === openCode);

  const headers = () => [
    'charges.fspCode', 'charges.lowerAmount', 'charges.upperAmount',
    'charges.withdrawal',
  ];
  const sorts = () => [
    ['fspCode', true], ['lowerAmount', true], ['upperAmount', true],
    ['withdrawal', true],
  ];
  const itemFormatters = () => [
    (c) => c.fspCode,
    (c) => c.lowerAmount,
    (c) => c.upperAmount,
    (c) => (Number(c.withdrawal) === 0 ? t('charges.noCharge') : c.withdrawal),
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
      {subTab === 'providers' && <FspProvidersConfig />}
      {subTab === 'list' && (
        <Searcher
          key={`charges-${reset}`}
          module={MODULE_NAME}
          FilterPane={WithdrawalChargeFilter}
          fetch={fetch}
          items={state?.withdrawalCharges ?? []}
          itemsPageInfo={state?.withdrawalChargesPageInfo}
          fetchingItems={state?.fetchingWithdrawalCharges}
          fetchedItems={state?.fetchedWithdrawalCharges}
          errorItems={state?.errorWithdrawalCharges}
          tableTitle={tv('charges.searcherTitle', { count: state?.withdrawalChargesTotalCount ?? 0 })}
          headers={headers}
          sorts={sorts}
          itemFormatters={itemFormatters}
          onDoubleClick={(c) => setOpenCode(c.fspCode)}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          defaultPageSize={DEFAULT_PAGE_SIZE}
          defaultOrderBy="fspCode"
          rowIdentifier={(c) => c.id}
        />
      )}
      {!!opened && (
        <FspDialog
          key={openCode}
          provider={opened}
          canManage={rights.includes(RIGHT_WITHDRAWAL_CHARGE_MANAGE)}
          canPropose={rights.includes(RIGHT_MUSE_SETTINGS_PROPOSE)}
          onClose={() => setOpenCode(null)}
        />
      )}
    </div>
  );
}

export default WithdrawalChargesPage;
