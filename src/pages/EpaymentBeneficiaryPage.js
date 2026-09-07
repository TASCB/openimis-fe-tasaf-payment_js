import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Button, Divider, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import {
  ProgressOrError, formatDateFromISO, useModulesManager, useTranslations,
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
  band: { ...theme.table.title, padding: theme.spacing(1, 2), marginTop: theme.spacing(2) },
  num: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  strong: { fontWeight: 600 },
  capRow: { color: theme.palette.text.secondary },
  note: { color: theme.palette.text.secondary, display: 'block' },
}));

// Status chips are monochrome: a status is a state, not an alarm. Anything needing
// action is surfaced by the tab it sits in and by the Needs Attention KPI.
const ITEM_STATUS_COLORS = {
  PROCESSED: '#9e9e9e', RETURNED: '#9e9e9e', UNAPPLIED: '#9e9e9e', PENDING: '#9e9e9e',
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
    ['beneficiary.component.youngChild', breakdown.young_child_count, breakdown.young_child_amount],
    ['beneficiary.component.primary', breakdown.primary_count, breakdown.primary_amount],
    ['beneficiary.component.secondary', breakdown.secondary_count, breakdown.secondary_amount],
  ] : [];

  const capped = breakdown && Number(breakdown.capped_total) < Number(breakdown.raw_total);

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

      <div className={classes.band}>
        <Typography variant="h6">{formatMessage('beneficiary.breakdown.title')}</Typography>
      </div>

      <Paper>
        {!breakdown && (
          <Typography variant="body2" style={{ padding: 16 }}>
            {formatMessage('beneficiary.breakdown.none')}
          </Typography>
        )}
        {breakdown && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{formatMessage('beneficiary.component')}</TableCell>
                <TableCell className={classes.num}>{formatMessage('beneficiary.count')}</TableCell>
                <TableCell className={classes.num}>{formatMessage('beneficiary.amount')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {components.map(([label, count, amount]) => (
                <TableRow key={label}>
                  <TableCell>{formatMessage(label)}</TableCell>
                  <TableCell className={classes.num}>{count === null ? '-' : count}</TableCell>
                  <TableCell className={classes.num}>{money(amount)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className={classes.strong}>
                  {formatMessage('beneficiary.rawTotal')}
                </TableCell>
                <TableCell className={classes.num} />
                <TableCell className={`${classes.num} ${classes.strong}`}>
                  {money(breakdown.raw_total)}
                </TableCell>
              </TableRow>
              {capped && (
                <TableRow className={classes.capRow}>
                  <TableCell>
                    {formatMessageWithValues('beneficiary.cap', {
                      cap: money(breakdown.household_cap_amount),
                    })}
                  </TableCell>
                  <TableCell className={classes.num} />
                  <TableCell className={classes.num}>
                    {`-${money(Number(breakdown.raw_total) - Number(breakdown.capped_total))}`}
                  </TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className={classes.strong}>
                  {formatMessage('beneficiary.entitlement')}
                </TableCell>
                <TableCell className={classes.num} />
                <TableCell className={`${classes.num} ${classes.strong}`}>
                  {money(breakdown.capped_total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Paper>

      <div className={classes.band}>
        <Typography variant="h6">
          {formatMessageWithValues('beneficiary.history.title', {
            totalCount: beneficiaryItemsTotalCount,
          })}
        </Typography>
      </div>

      <ProgressOrError progress={fetchingBeneficiaryItems} error={errorBeneficiaryItems} />

      {!fetchingBeneficiaryItems && (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{formatMessage('fspItems.benefitCode')}</TableCell>
                <TableCell>{formatMessage('returnFeedback.feedbackType')}</TableCell>
                <TableCell className={classes.num}>{formatMessage('fspItems.netAmount')}</TableCell>
                <TableCell className={classes.num}>{formatMessage('fspItems.chargeAmount')}</TableCell>
                <TableCell className={classes.num}>{formatMessage('fspItems.grossAmount')}</TableCell>
                <TableCell>{formatMessage('fspItems.settledAt')}</TableCell>
                <TableCell>{formatMessage('fspItems.museReference')}</TableCell>
                <TableCell>{formatMessage('beneficiary.reason')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(beneficiaryItems || []).map((row) => (
                <TableRow key={row.uuid}>
                  <TableCell>{row.benefitConsumption?.code ?? '-'}</TableCell>
                  <TableCell>
                    <StatusChip label={row.status} color={ITEM_STATUS_COLORS[row.status]} />
                  </TableCell>
                  <TableCell className={classes.num}>{money(row.netAmount ?? row.amount)}</TableCell>
                  <TableCell className={classes.num}>{money(row.chargeAmount)}</TableCell>
                  <TableCell className={classes.num}>{money(row.amount)}</TableCell>
                  <TableCell>
                    {row.settledAt ? formatDateFromISO(modulesManager, null, row.settledAt) : '-'}
                  </TableCell>
                  <TableCell>{row.museReference ?? '-'}</TableCell>
                  <TableCell>{row.returnReason ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

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
