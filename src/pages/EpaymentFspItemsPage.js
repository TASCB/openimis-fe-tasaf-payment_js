import React, { useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Button, FormControlLabel, Switch, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import {
  Searcher, formatDateFromISO, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { MODULE_NAME, DEFAULT_PAGE_SIZE, ROWS_PER_PAGE_OPTIONS } from '../constants';
import { fetchEpaymentFspItems } from '../actions';
import StatusChip from '../components/StatusChip';
import EpaymentBeneficiaryPage from './EpaymentBeneficiaryPage';

const useStyles = makeStyles((theme) => ({
  page: { padding: theme.spacing(2) },
  header: {
    display: 'flex', alignItems: 'center', gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  spacer: { flexGrow: 1 },
  amount: { fontVariantNumeric: 'tabular-nums' },
  nameButton: { padding: 0, minWidth: 0, textTransform: 'none', fontWeight: 500, textAlign: 'left' },
}));

// Status chips are monochrome: a status is a state, not an alarm. Anything needing
// action is surfaced by the tab it sits in and by the Needs Attention KPI.
const ITEM_STATUS_COLORS = {
  PROCESSED: '#9e9e9e', RETURNED: '#9e9e9e', UNAPPLIED: '#9e9e9e', PENDING: '#9e9e9e',
};

const money = (v) => (v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

function EpaymentFspItemsPage({
  epaymentCode, onBack,
  fspItems, fspItemsPageInfo, fspItemsTotalCount,
  fetchingFspItems, fetchedFspItems, errorFspItems, fetchEpaymentFspItems,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [includeUnpaid, setIncludeUnpaid] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  if (selectedItem) {
    return (
      <EpaymentBeneficiaryPage
        item={selectedItem}
        onBack={() => setSelectedItem(null)}
      />
    );
  }

  const headers = () => [
    formatMessage('fspItems.beneficiary'),
    formatMessage('fspItems.accountNumber'),
    formatMessage('fspItems.benefitCode'),
    formatMessage('returnFeedback.feedbackType'),
    formatMessage('fspItems.netAmount'),
    formatMessage('fspItems.chargeAmount'),
    formatMessage('fspItems.grossAmount'),
    formatMessage('fspItems.settledAt'),
    formatMessage('fspItems.museReference'),
  ];

  const beneficiaryName = (row) => {
    const individual = row.benefitConsumption?.individual;
    const fromIndividual = [individual?.firstName, individual?.lastName].filter(Boolean).join(' ');
    return fromIndividual || row.paymentAccount?.accountName || '-';
  };

  const itemFormatters = () => [
    (row) => (
      <Button
        size="small"
        color="primary"
        className={classes.nameButton}
        onClick={() => setSelectedItem(row)}
      >
        {beneficiaryName(row)}
      </Button>
    ),
    (row) => row.paymentAccount?.accountNumber ?? '-',
    (row) => row.benefitConsumption?.code ?? '-',
    (row) => (
      <StatusChip label={row.status} color={ITEM_STATUS_COLORS[row.status]} />
    ),
    (row) => <span className={classes.amount}>{money(row.netAmount ?? row.amount)}</span>,
    (row) => <span className={classes.amount}>{money(row.chargeAmount)}</span>,
    (row) => <span className={classes.amount}>{money(row.amount)}</span>,
    (row) => (row.settledAt
      ? formatDateFromISO(modulesManager, null, row.settledAt) : '-'),
    (row) => row.museReference ?? '-',
  ];

  // The FSP is not a Searcher filter — it is the page's subject, so it is pinned onto
  // every fetch rather than exposed as something the auditor could accidentally clear.
  const fetch = (params) => fetchEpaymentFspItems([
    ...(params || []),
    `epaymentCode: "${epaymentCode}"`,
    ...(includeUnpaid ? ['includeUnpaid: true'] : []),
  ]);

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          {formatMessage('fspItems.back')}
        </Button>
        <Typography variant="h6">
          {formatMessageWithValues('fspItems.title', { code: epaymentCode })}
        </Typography>
        <div className={classes.spacer} />
        <FormControlLabel
          control={(
            <Switch
              checked={includeUnpaid}
              onChange={(event) => setIncludeUnpaid(event.target.checked)}
              color="primary"
            />
          )}
          label={formatMessage('fspItems.includeUnpaid')}
        />
      </div>

      <Searcher
        key={`${epaymentCode}-${includeUnpaid}`}
        module={MODULE_NAME}
        fetch={fetch}
        items={fspItems}
        itemsPageInfo={fspItemsPageInfo}
        fetchingItems={fetchingFspItems}
        fetchedItems={fetchedFspItems}
        errorItems={errorFspItems}
        tableTitle={formatMessageWithValues('fspItems.searcher.results', {
          totalCount: fspItemsTotalCount,
        })}
        headers={headers}
        itemFormatters={itemFormatters}
        rowIdentifier={(row) => row.uuid}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultOrderBy="-settledAt"
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  fspItems: state.tasafPayment.fspItems,
  fspItemsPageInfo: state.tasafPayment.fspItemsPageInfo,
  fspItemsTotalCount: state.tasafPayment.fspItemsTotalCount,
  fetchingFspItems: state.tasafPayment.fetchingFspItems,
  fetchedFspItems: state.tasafPayment.fetchedFspItems,
  errorFspItems: state.tasafPayment.errorFspItems,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchEpaymentFspItems }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(EpaymentFspItemsPage);
