import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Button, Divider, Grid, Paper, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import {
  ProgressOrError, Table, formatDateFromISO, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { MODULE_NAME } from '../constants';
import { fetchEpaymentBeneficiaryItems } from '../actions';
import StatusChip from '../components/StatusChip';

const useStyles = makeStyles((theme) => ({
  page: { padding: theme.spacing(2) },
  header: {
    display: 'flex', alignItems: 'center', gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  card: { padding: 20, height: '100%' },
  cardLabel: { color: theme.palette.primary.main },
  paper: { ...theme.paper.body, marginTop: theme.spacing(2) },
  paperHeader: theme.paper.header,
  paperHeaderTitle: theme.paper.title,
  empty: { padding: theme.spacing(2) },
  note: { color: theme.palette.text.secondary, display: 'block' },
}));

// Status chips are monochrome: a status is a state, not an alarm. Anything needing
// action is surfaced by the tab it sits in and by the Needs Attention KPI.
const ITEM_STATUS_COLORS = {
  PROCESSED: '#9e9e9e', UNAPPLIED: '#9e9e9e', PENDING: '#9e9e9e',
};

const money = (v) => (Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

function parseBreakdown(item) {
  const raw = item?.benefitConsumption?.jsonExt;
  if (!raw) return null;
  try {
    const ext = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return ext?.pct_breakdown ?? null;
  } catch (error) {
    return null;
  }
}

function EpaymentBeneficiaryPage({
  item, onBack,
  beneficiaryItems, beneficiaryItemsTotalCount, fetchingBeneficiaryItems,
  errorBeneficiaryItems, fetchEpaymentBeneficiaryItems,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);

  const accountUuid = item?.paymentAccount?.uuid;

  useEffect(() => {
    if (accountUuid) {
      fetchEpaymentBeneficiaryItems([`paymentAccountUuid: "${accountUuid}"`]);
    }
  }, [accountUuid]);

  const individual = item?.benefitConsumption?.individual;
  const name = [individual?.firstName, individual?.lastName].filter(Boolean).join(' ')
    || item?.paymentAccount?.accountName || '-';

  // Fall back to any payment carrying one, so an older cycle still renders.
  const breakdown = parseBreakdown(item)
    ?? (beneficiaryItems || []).map(parseBreakdown).find(Boolean)
    ?? null;

  const identity = [
    ['fspItems.beneficiary', name],
    ['fspItems.accountNumber', item?.paymentAccount?.accountNumber ?? '-'],
    ['paymentAccount.fspName', item?.paymentAccount?.fspName ?? '-'],
  ];

  const components = breakdown ? [
    ['beneficiary.component.base', null, breakdown.base_amount],
    ['beneficiary.component.disability', breakdown.has_disability ? 1 : 0, breakdown.disability_amount],
    ['beneficiary.component.pregnant', breakdown.pregnant_count, breakdown.pregnant_amount],
    ['beneficiary.component.youngChild', breakdown.young_child_count, breakdown.young_child_amount],
    ['beneficiary.component.primary', breakdown.primary_count, breakdown.primary_amount],
    ['beneficiary.component.secondary', breakdown.secondary_count, breakdown.secondary_amount],
  ] : [];

  const capped = breakdown && Number(breakdown.capped_total) < Number(breakdown.raw_total);
  const componentRows = breakdown ? [
    ...components.map(([label, count, amount]) => ({
      key: label, label: formatMessage(label), count: count ?? '-', amount: money(amount),
    })),
    { key: 'raw', label: formatMessage('beneficiary.rawTotal'), amount: money(breakdown.raw_total), total: true },
    ...(capped ? [{
      key: 'cap',
      label: formatMessageWithValues('beneficiary.cap', { cap: money(breakdown.household_cap_amount) }),
      amount: `-${money(Number(breakdown.raw_total) - Number(breakdown.capped_total))}`,
    }] : []),
    {
      key: 'entitlement', label: formatMessage('beneficiary.entitlement'), amount: money(breakdown.capped_total),
      total: true,
    },
  ] : [];

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          {formatMessage('beneficiary.back')}
        </Button>
        <Typography variant="h6">
          {formatMessageWithValues('beneficiary.title', { name })}
        </Typography>
      </div>

      <Grid container spacing={2}>
        {identity.map(([label, value]) => (
          <Grid item xs={12} sm={4} key={label}>
            <Paper elevation={3} className={classes.card}>
              <Typography variant="h6" gutterBottom className={classes.cardLabel}>
                {formatMessage(label)}
              </Typography>
              <Typography variant="body1">{value}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper className={classes.paper}>
        <Grid container className={classes.paperHeader}>
          <Grid item xs={12} className={classes.paperHeaderTitle}>
            {formatMessage('beneficiary.breakdown.title')}
          </Grid>
        </Grid>
        <Divider />
        {breakdown ? (
          <Table
            size="small"
            module={MODULE_NAME}
            headers={['beneficiary.component', 'beneficiary.count', 'beneficiary.amount']}
            aligns={['left', 'right', 'right']}
            itemFormatters={[
              (row) => row.label,
              (row) => (row.count === null || row.count === undefined ? '' : row.count),
              (row) => row.amount,
            ]}
            items={componentRows}
            itemIdentifier={(row) => row.key}
            rowHighlighted={(row) => !!row.total}
          />
        ) : (
          <Typography variant="body2" className={classes.empty}>
            {formatMessage('beneficiary.breakdown.none')}
          </Typography>
        )}
      </Paper>

      <Paper className={classes.paper}>
        <Grid container className={classes.paperHeader}>
          <Grid item xs={12} className={classes.paperHeaderTitle}>
            {formatMessageWithValues('beneficiary.history.title', { totalCount: beneficiaryItemsTotalCount })}
          </Grid>
        </Grid>
        <Divider />
        <ProgressOrError progress={fetchingBeneficiaryItems} error={errorBeneficiaryItems} />
        <Table
          size="small"
          module={MODULE_NAME}
          fetching={fetchingBeneficiaryItems}
          headers={['fspItems.benefitCode', 'returnFeedback.feedbackType', 'fspItems.netAmount',
            'fspItems.chargeAmount', 'fspItems.grossAmount', 'fspItems.settledAt', 'fspItems.museReference',
            'beneficiary.reason']}
          aligns={['left', 'left', 'right', 'right', 'right', 'left', 'left', 'left']}
          itemFormatters={[
            (row) => row.benefitConsumption?.code ?? '-',
            (row) => <StatusChip label={row.status} color={ITEM_STATUS_COLORS[row.status]} />,
            (row) => money(row.netAmount ?? row.amount),
            (row) => money(row.chargeAmount),
            (row) => money(row.amount),
            (row) => (row.settledAt ? formatDateFromISO(modulesManager, null, row.settledAt) : '-'),
            (row) => row.museReference ?? '-',
            (row) => row.returnReason ?? '-',
          ]}
          items={beneficiaryItems || []}
          itemIdentifier={(row) => row.uuid}
        />
      </Paper>

      <Divider style={{ margin: '16px 0' }} />
      <Typography variant="caption" className={classes.note}>
        {formatMessage('beneficiary.historyNote')}
      </Typography>
    </div>
  );
}

const mapStateToProps = (state) => ({
  beneficiaryItems: state.tasafPayment.beneficiaryItems,
  beneficiaryItemsTotalCount: state.tasafPayment.beneficiaryItemsTotalCount,
  fetchingBeneficiaryItems: state.tasafPayment.fetchingBeneficiaryItems,
  errorBeneficiaryItems: state.tasafPayment.errorBeneficiaryItems,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { fetchEpaymentBeneficiaryItems }, dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(EpaymentBeneficiaryPage);
