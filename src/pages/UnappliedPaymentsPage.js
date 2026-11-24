import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useLocation } from 'react-router-dom';
import {
  Divider, IconButton, Menu, MenuItem, Tooltip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import VisibilityOutlined from '@material-ui/icons/VisibilityOutlined';
import ArrowDropDown from '@material-ui/icons/ArrowDropDown';
import {
  downloadExport,
  formatDateTimeFromISO,
  Helmet,
  Searcher,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  createUnappliedResends, decideUnappliedPayment, decideUnappliedPayments, exportUnappliedItems,
  fetchUnappliedBulkPreview, fetchUnappliedItems, fetchUnappliedOverdue, fetchUnappliedResendPreview,
  fetchUnappliedWithdrawalsPending, sendUnappliedWithdrawals, unappliedBulkFilters,
} from '../actions';
import {
  MODULE_NAME,
  RIGHT_GENERATE_PAYLIST,
  RIGHT_RETURN_FEEDBACK,
  RIGHT_UNAPPLIED_DECIDE,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
} from '../constants';
import { defaultPageStyles } from '../utils/styles';
import UnappliedFilter from '../components/UnappliedFilter';
import ReturnedPaymentDialog from '../components/ReturnedPaymentDialog';
import UnappliedMuseDialog from '../components/UnappliedMuseDialog';
import UnappliedBulkDialog from '../components/UnappliedBulkDialog';
import StatusChip from '../components/StatusChip';
import { mutationErrorText } from '../utils/errors';

const parseList = (raw) => {
  try { return (typeof raw === 'string' ? JSON.parse(raw || '[]') : raw) || []; } catch (e) { return []; }
};

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),
  notice: { margin: '8px 16px', fontSize: 13, color: theme.palette.text.secondary },
  titleNote: { marginLeft: theme.spacing(1.5), fontSize: 14, color: theme.palette.text.secondary },
  // fe-core renders its export after the header buttons.
  downloadFirst: {
    '& .MuiGrid-justify-content-xs-flex-end > .MuiGrid-item:last-child': { order: -1 },
  },
}));

const MUTATION_SUCCESS = 2;
const AWAITING_ACTION = 'AWAITING_ACTION';

function UnappliedPaymentsPage({
  fetchUnappliedItems,
  decideUnappliedPayment,
  fetchUnappliedWithdrawalsPending,
  exportUnappliedItems,
  fetchUnappliedResendPreview,
  createUnappliedResends,
  sendUnappliedWithdrawals,
  fetchUnappliedBulkPreview,
  decideUnappliedPayments,
  fetchUnappliedOverdue,
  fetchingUnappliedItems,
  fetchedUnappliedItems,
  errorUnappliedItems,
  unappliedItems,
  unappliedItemsPageInfo,
  unappliedItemsTotalCount,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const location = useLocation();
  const linked = new URLSearchParams(location.search);
  const linkedFilters = Object.fromEntries(['resolution', 'fspName'].filter((key) => linked.get(key))
    .map((key) => [key, { value: linked.get(key), filter: `${key}: "${linked.get(key).replace(/"/g, '')}"` }]));
  const defaultFilters = linked.get('resolution') ? linkedFilters : {
    ...linkedFilters,
    resolution: { value: AWAITING_ACTION, filter: `resolution: "${AWAITING_ACTION}"` },
  };
  const awaitingFirst = defaultFilters.resolution.value === AWAITING_ACTION;
  const [progress, setProgress] = useState(defaultFilters.resolution.value);
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [withdrawals, setWithdrawals] = useState(0);
  const [notice, setNotice] = useState(null);
  const [resendRows, setResendRows] = useState([]);
  const [museOpen, setMuseOpen] = useState(false);
  const [bulk, setBulk] = useState(null);
  const [lastParams, setLastParams] = useState([]);
  const [overdue, setOverdue] = useState(null);
  const [actionsMenu, setActionsMenu] = useState(null);
  const canView = rights.includes(RIGHT_RETURN_FEEDBACK);

  useEffect(() => {
    if (!canView) return;
    fetchUnappliedWithdrawalsPending().then((r) => setWithdrawals(r?.payload?.data?.unappliedWithdrawalsPending ?? 0));
    fetchUnappliedResendPreview().then((r) => setResendRows(parseList(r?.payload?.data?.unappliedResendPreview)));
    fetchUnappliedOverdue().then(setOverdue);
  }, [canView, refreshKey, fetchUnappliedWithdrawalsPending, fetchUnappliedResendPreview, fetchUnappliedOverdue]);

  if (!canView) return null;

  const canDecide = rights.includes(RIGHT_UNAPPLIED_DECIDE);
  const canGenerate = rights.includes(RIGHT_GENERATE_PAYLIST);
  const refresh = () => setRefreshKey((k) => k + 1);
  const outcome = (log, fallback) => {
    if (log?.status !== MUTATION_SUCCESS) return mutationErrorText(log?.error) || formatMessage(fallback);
    refresh();
    return null;
  };

  const decide = async (row, action, note) => {
    const label = formatMessageWithValues('returned.mutation.decide', {
      action: formatMessage(`returned.action.${action}`),
    });
    const error = outcome(await decideUnappliedPayment(row.uuid, action, note, label), 'returned.decision.failed');
    if (!error) setSelected(null);
    return error;
  };
  const createResends = async () => outcome(
    await createUnappliedResends(formatMessage('returned.resend.mutation')), 'returned.resend.failed',
  );
  const sendWithdrawals = async () => outcome(
    await sendUnappliedWithdrawals(formatMessage('returned.withdraw.mutation')), 'returned.withdraw.failed',
  );

  const ready = resendRows.filter((r) => !r.blocked).reduce((n, r) => n + (r.ready || 0), 0);
  const awaiting = progress === AWAITING_ACTION;
  const bulkAllowed = canDecide && awaiting && unappliedItemsTotalCount > 0;
  const openBulk = () => setBulk({ filters: unappliedBulkFilters(lastParams), count: unappliedItemsTotalCount });
  const menuItems = [
    bulkAllowed && [formatMessageWithValues('returned.bulk.decideAll', { count: unappliedItemsTotalCount }), openBulk],
    [formatMessageWithValues('returned.muse.open', { count: ready }), () => setMuseOpen(true)],
  ].filter(Boolean);
  const searcherActions = [{
    label: formatMessage('returned.menu.actions'),
    icon: <ArrowDropDown />,
    onClick: (event) => setActionsMenu(event.currentTarget),
    authorized: true,
  }];
  const runFromMenu = (run) => () => {
    setActionsMenu(null);
    run();
  };
  const selectionActions = [{
    label: 'tasafPayment.returned.bulk.decideSelected',
    enabled: (rows) => canDecide && awaiting && rows.length > 0,
    action: (rows) => setBulk({ itemUuids: rows.map((r) => r.uuid), count: rows.length }),
  }];

  const exportCsv = async (params) => {
    const response = await exportUnappliedItems(params);
    const name = response?.payload?.data?.unappliedItemsExport;
    if (name) downloadExport(name, `${formatMessage('returned.export.filename')}.csv`, 'csv');
    else setNotice(formatMessage('returned.export.failed'));
  };

  const fetch = (params) => {
    setLastParams(params || []);
    setProgress((params || []).join(' ').match(/resolution: "(\w+)"/)?.[1] ?? null);
    return fetchUnappliedItems([...(params || []), 'status: UNAPPLIED']);
  };

  const headers = () => [
    formatMessage('paylistItem.hhid'),
    formatMessage('returned.payee'),
    formatMessage('paylistItem.accountNumber'),
    formatMessage('paylistItem.amount'),
    formatMessage('returned.col.reason'),
    formatMessage('returned.col.suggested'),
    formatMessage('returnFeedback.receivedAt'),
    ...(progress ? [] : [formatMessage('returned.progress')]),
    '',
  ];

  const itemFormatters = () => [
    (row) => row.paymentAccount?.groupBeneficiary?.group?.code ?? '-',
    (row) => row.paymentAccount?.accountName || '-',
    (row) => row.paymentAccount?.accountNumber || '-',
    (row) => row.amount ?? '-',
    (row) => row.returnReason || '-',
    (row) => (row.suggestedAction ? formatMessage(`returned.action.${row.suggestedAction}`) : '-'),
    (row) => formatDateTimeFromISO(modulesManager, null, row.returnedAt) || '-',
    ...(progress ? [] : [(row) => (row.resolution
      ? <StatusChip label={formatMessage(`returned.resolution.${row.resolution}`)} />
      : '-')]),
    (row) => (
      <Tooltip title={formatMessage('returned.view')}>
        <IconButton size="small" onClick={() => setSelected(row)}><VisibilityOutlined fontSize="small" /></IconButton>
      </Tooltip>
    ),
  ];

  return (
    <div className={`${classes.page} ${classes.downloadFirst}`}>
      <Helmet title={formatMessage('returned.page.title')} />
      {notice && <div className={classes.notice}>{notice}</div>}
      <Searcher
        key={`${refreshKey}${location.search}`}
        defaultFilters={defaultFilters}
        module={MODULE_NAME}
        FilterPane={UnappliedFilter}
        fetch={fetch}
        items={unappliedItems}
        itemsPageInfo={unappliedItemsPageInfo}
        fetchingItems={fetchingUnappliedItems}
        fetchedItems={fetchedUnappliedItems}
        errorItems={errorUnappliedItems}
        tableTitle={(
          <>
            {formatMessageWithValues('returned.searcher.results', { totalCount: unappliedItemsTotalCount })}
            {progress && (
              <span className={classes.titleNote}>
                {[
                  formatMessage(`returned.resolution.${progress}`),
                  awaiting && overdue?.count ? formatMessageWithValues('returned.overdue', overdue) : null,
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </>
        )}
        headers={headers}
        itemFormatters={itemFormatters}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy={awaitingFirst ? 'dateUpdated' : '-dateUpdated'}
        rowIdentifier={(row) => row.id}
        onDoubleClick={(row) => setSelected(row)}
        withSelection="multiple"
        actions={selectionActions}
        enableActionButtons
        searcherActions={searcherActions}
        searcherActionsPosition="header-right"
        exportable
        exportFetch={exportCsv}
        exportFields={['id']}
        exportFieldsColumns={{ id: 'ID' }}
        exportFieldLabel={formatMessage('returned.export.label')}
      />
      <ReturnedPaymentDialog
        item={selected}
        onClose={() => setSelected(null)}
        canDecide={canDecide}
        onDecide={decide}
      />
      <Menu anchorEl={actionsMenu} open={!!actionsMenu} onClose={() => setActionsMenu(null)}>
        {menuItems.flatMap(([label, run], i) => [
          i > 0 && <Divider key={`divider-${label}`} />,
          <MenuItem key={label} onClick={runFromMenu(run)}>{label}</MenuItem>,
        ]).filter(Boolean)}
      </Menu>
      {bulk && (
        <UnappliedBulkDialog
          scope={bulk}
          onClose={() => setBulk(null)}
          onDone={refresh}
          fetchPreview={fetchUnappliedBulkPreview}
          decide={decideUnappliedPayments}
        />
      )}
      <UnappliedMuseDialog
        open={museOpen}
        onClose={() => setMuseOpen(false)}
        resendRows={resendRows}
        withdrawals={withdrawals}
        canCreate={canGenerate}
        onCreateResends={createResends}
        canSendWithdrawals={canDecide}
        onSendWithdrawals={sendWithdrawals}
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingUnappliedItems: state.tasafPayment.fetchingUnappliedItems,
  fetchedUnappliedItems: state.tasafPayment.fetchedUnappliedItems,
  errorUnappliedItems: state.tasafPayment.errorUnappliedItems,
  unappliedItems: state.tasafPayment.unappliedItems,
  unappliedItemsPageInfo: state.tasafPayment.unappliedItemsPageInfo,
  unappliedItemsTotalCount: state.tasafPayment.unappliedItemsTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchUnappliedItems, decideUnappliedPayment, fetchUnappliedWithdrawalsPending, exportUnappliedItems,
  fetchUnappliedBulkPreview, decideUnappliedPayments, fetchUnappliedOverdue,
  fetchUnappliedResendPreview, createUnappliedResends, sendUnappliedWithdrawals,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(UnappliedPaymentsPage);
