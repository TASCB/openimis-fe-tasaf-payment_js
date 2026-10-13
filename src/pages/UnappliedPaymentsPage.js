import React, { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { IconButton, Tooltip } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import VisibilityOutlined from '@material-ui/icons/VisibilityOutlined';
import {
  formatDateTimeFromISO,
  Helmet,
  Searcher,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import { fetchUnappliedItems } from '../actions';
import {
  MODULE_NAME,
  RIGHT_RETURN_FEEDBACK,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  RETURN_RESOLUTION_COLORS,
} from '../constants';
import { defaultPageStyles } from '../utils/styles';
import UnappliedFilter from '../components/UnappliedFilter';
import ReturnedPaymentDialog from '../components/ReturnedPaymentDialog';
import StatusChip from '../components/StatusChip';

const useStyles = makeStyles((theme) => defaultPageStyles(theme));

function UnappliedPaymentsPage({
  fetchUnappliedItems,
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

  if (!rights.includes(RIGHT_RETURN_FEEDBACK)) return null;

  const fetch = (params) => fetchUnappliedItems([...(params || []), 'status: UNAPPLIED']);

  const headers = () => [
    formatMessage('paylistItem.hhid'),
    formatMessage('returned.payee'),
    formatMessage('paylistItem.accountNumber'),
    formatMessage('paylistItem.amount'),
    formatMessage('paylist.museBatchReference'),
    formatMessage('returned.reason'),
    formatMessage('returnFeedback.receivedAt'),
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
    (row) => (row.resolution
      ? <StatusChip label={formatMessage(`returned.resolution.${row.resolution}`)} color={RETURN_RESOLUTION_COLORS[row.resolution]} />
      : '-'),
    (row) => (
      <Tooltip title={formatMessage('returned.view')}>
        <IconButton size="small" onClick={() => setSelected(row)}><VisibilityOutlined fontSize="small" /></IconButton>
      </Tooltip>
    ),
  ];

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('returned.page.title')} />
      <Searcher
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
      />
      <ReturnedPaymentDialog item={selected} onClose={() => setSelected(null)} />
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

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchUnappliedItems }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(UnappliedPaymentsPage);
