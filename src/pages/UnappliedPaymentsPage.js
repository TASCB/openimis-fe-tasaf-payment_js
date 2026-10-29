import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { IconButton, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import VisibilityOutlined from '@material-ui/icons/VisibilityOutlined';
import {
  downloadExport,
  formatDateTimeFromISO,
  Helmet,
  Searcher,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  createUnappliedResends, decideUnappliedPayment, exportUnappliedItems, fetchUnappliedItems,
  fetchUnappliedResendPreview, fetchUnappliedWithdrawalsPending,
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
import StatusChip from '../components/StatusChip';

const parseList = (raw) => {
  try { return (typeof raw === 'string' ? JSON.parse(raw || '[]') : raw) || []; } catch (e) { return []; }
};

const parseDecision = (value) => {
  try { return typeof value === 'string' ? JSON.parse(value || 'null') : value; } catch (e) { return null; }
};

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),
  notice: { margin: '8px 16px', fontSize: 13, color: theme.palette.text.secondary },
  // fe-core renders its export after the header buttons.
  downloadFirst: {
    '& .MuiGrid-justify-content-xs-flex-end > .MuiGrid-item:last-child': { order: -1 },
  },
}));

const MUTATION_SUCCESS = 2;

function UnappliedPaymentsPage({
  fetchUnappliedItems,
  decideUnappliedPayment,
  fetchUnappliedWithdrawalsPending,
  exportUnappliedItems,
  fetchUnappliedResendPreview,
  createUnappliedResends,
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
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [withdrawals, setWithdrawals] = useState(0);
  const [notice, setNotice] = useState(null);
  const [resendRows, setResendRows] = useState([]);
  const [museOpen, setMuseOpen] = useState(false);
  const canView = rights.includes(RIGHT_RETURN_FEEDBACK);

  useEffect(() => {
    if (!canView) return;
    fetchUnappliedWithdrawalsPending().then((r) => setWithdrawals(r?.payload?.data?.unappliedWithdrawalsPending ?? 0));
    fetchUnappliedResendPreview().then((r) => setResendRows(parseList(r?.payload?.data?.unappliedResendPreview)));
  }, [canView, refreshKey, fetchUnappliedWithdrawalsPending, fetchUnappliedResendPreview]);

  if (!canView) return null;

  const canDecide = rights.includes(RIGHT_UNAPPLIED_DECIDE);
  const canGenerate = rights.includes(RIGHT_GENERATE_PAYLIST);
  const refresh = () => setRefreshKey((k) => k + 1);
  const outcome = (log, fallback) => {
    if (log?.status !== MUTATION_SUCCESS) return log?.error ? String(log.error) : formatMessage(fallback);
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

  const ready = resendRows.filter((r) => !r.blocked).reduce((n, r) => n + (r.ready || 0), 0);
  const searcherActions = [{
    label: formatMessageWithValues('returned.muse.open', { count: ready }),
    onClick: () => setMuseOpen(true),
    authorized: true,
  }];

  const exportCsv = async (params) => {
    const response = await exportUnappliedItems(params);
    const name = response?.payload?.data?.unappliedItemsExport;
    if (name) downloadExport(name, `${formatMessage('returned.export.filename')}.csv`, 'csv')();
    else setNotice(formatMessage('returned.export.failed'));
  };

  const fetch = (params) => fetchUnappliedItems([...(params || []), 'status: UNAPPLIED']);

  const headers = () => [
    formatMessage('paylistItem.hhid'),
    formatMessage('returned.payee'),
    formatMessage('paylistItem.accountNumber'),
    formatMessage('paylistItem.amount'),
    formatMessage('paylist.museBatchReference'),
    formatMessage('returned.reason'),
    formatMessage('returnFeedback.receivedAt'),
    formatMessage('returned.daysWaiting'),
    formatMessage('returned.suggested'),
    formatMessage('returned.progress'),
    '',
  ];

  const itemFormatters = () => [
    (row) => row.paymentAccount?.groupBeneficiary?.group?.code ?? '-',
    (row) => row.paymentAccount?.accountName || '-',
    (row) => [row.paymentAccount?.accountNumber, row.paymentAccount?.fspName].filter(Boolean).join(' · ') || '-',
    (row) => row.amount ?? '-',
    (row) => row.paylist?.museBatchReference ?? '-',
    (row) => [row.returnReasonCode, row.returnReason].filter(Boolean).join(' · ') || '-',
    (row) => formatDateTimeFromISO(modulesManager, null, row.returnedAt) || '-',
    (row) => (row.resolution === 'AWAITING_ACTION' && row.returnedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(row.returnedAt).getTime()) / 86400000))
      : '-'),
    (row) => {
      const decided = parseDecision(row.unappliedDecision)?.action;
      if (decided) return formatMessage(`returned.action.${decided}`);
      return row.suggestedAction
        ? formatMessageWithValues('returned.suggestedShort', { action: formatMessage(`returned.action.${row.suggestedAction}`) })
        : '-';
    },
    (row) => (row.resolution
      ? <StatusChip label={formatMessage(`returned.resolution.${row.resolution}`)} />
      : '-'),
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
        key={refreshKey}
        module={MODULE_NAME}
        FilterPane={UnappliedFilter}
        fetch={fetch}
        items={unappliedItems}
        itemsPageInfo={unappliedItemsPageInfo}
        fetchingItems={fetchingUnappliedItems}
        fetchedItems={fetchedUnappliedItems}
        errorItems={errorUnappliedItems}
        tableTitle={formatMessageWithValues('returned.searcher.results', { totalCount: unappliedItemsTotalCount })}
        headers={headers}
        itemFormatters={itemFormatters}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="-dateUpdated"
        rowIdentifier={(row) => row.id}
        onDoubleClick={(row) => setSelected(row)}
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
      <UnappliedMuseDialog
        open={museOpen}
        onClose={() => setMuseOpen(false)}
        resendRows={resendRows}
        withdrawals={withdrawals}
        canCreate={canGenerate}
        onCreateResends={createResends}
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
  fetchUnappliedResendPreview, createUnappliedResends,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(UnappliedPaymentsPage);
