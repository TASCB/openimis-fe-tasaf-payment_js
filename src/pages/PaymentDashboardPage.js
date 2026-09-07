import React, { useEffect, useMemo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Box, Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import PersonIcon from '@material-ui/icons/PersonOutline';
import CancelIcon from '@material-ui/icons/HighlightOff';
import EditIcon from '@material-ui/icons/Edit';
import CheckIcon from '@material-ui/icons/Check';
import SendIcon from '@material-ui/icons/Send';
import LockIcon from '@material-ui/icons/LockOutlined';
import DescriptionIcon from '@material-ui/icons/DescriptionOutlined';

import {
  Helmet, ProgressOrError, useHistory, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import {
  MODULE_NAME, RIGHT_DASHBOARD, RIGHT_PAYLIST_SEARCH, RIGHT_PAYMENT_ACCOUNT_SEARCH,
  VERIFICATION_STATUS, PAYLIST_STATUS,
} from '../constants';
import { fetchDashboardCounts } from '../actions';
import {
  DashboardHeader, StatCard, SectionCard, PipelineFlow,
} from '@openimis/fe-tasaf_common';

const useStyles = makeStyles((theme) => ({ page: theme.page }));

const fmtTZS = (v) => {
  const n = Number(v) || 0;
  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(n) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(n);
};

const tzs = (v) => `TZS ${fmtTZS(v)}`;

function PaymentDashboardPage({
  fetchDashboardCounts, fetchingDashboard, fetchedDashboard, errorDashboard, dashboardCounts,
}) {
  const classes = useStyles();
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const refresh = () => { fetchDashboardCounts(); setLastRefreshed(new Date()); };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  const acct = dashboardCounts?.accounts ?? {};
  const pl = dashboardCounts?.paylists ?? {};
  const plAmt = dashboardCounts?.paylistAmounts ?? {};
  const totals = dashboardCounts?.totals ?? {};
  const loaded = fetchedDashboard;
  const num = (v) => (loaded ? (v ?? 0) : '–');
  const money = (v) => (loaded ? fmtTZS(v) : '–');
  const t = (k) => formatMessage(k);

  const goVerification = rights.includes(RIGHT_PAYMENT_ACCOUNT_SEARCH)
    ? () => history.push(`/${modulesManager.getRef('tasafPayment.route.verificationResults')}`) : null;
  const goPaylists = rights.includes(RIGHT_PAYLIST_SEARCH)
    ? () => history.push(`/${modulesManager.getRef('tasafPayment.route.paylists')}`) : null;

  const totalAccounts = useMemo(
    () => (totals.accounts != null ? totals.accounts : Object.values(acct).reduce((s, v) => s + (v ?? 0), 0)),
    [acct, totals.accounts],
  );
  const attention = (acct[VERIFICATION_STATUS.MANUAL] ?? 0) + (acct[VERIFICATION_STATUS.FAILED] ?? 0);

  const kpis = [
    {
      label: t('dashboard.kpi.accounts'),
      value: loaded ? totalAccounts : '–',
      caption: loaded ? `${acct[VERIFICATION_STATUS.VERIFIED] ?? 0} ${t('dashboard.kpi.verifiedCaption')}` : t('dashboard.kpi.accountsCaption'),
      onClick: goVerification,
    },
    {
      label: t('dashboard.kpi.attention'), value: loaded ? attention : '–', caption: t('dashboard.kpi.attentionCaption'), onClick: goVerification,
    },
    {
      label: t('dashboard.kpi.inProcess'), value: money(totals.inProcessAmount), caption: t('dashboard.kpi.inProcessCaption'), onClick: goPaylists,
    },
    {
      label: t('dashboard.kpi.paid'), value: money(totals.paidAmount), caption: t('dashboard.kpi.paidCaption'), onClick: goPaylists,
    },
  ];

  const verificationStages = [
    { key: 'pending', icon: <HourglassEmptyIcon />, label: t('dashboard.stat.pending'), value: acct[VERIFICATION_STATUS.PENDING] ?? 0, onClick: goVerification },
    { key: 'muse', icon: <AccessTimeIcon />, label: t('dashboard.stat.pendingMuse'), value: acct[VERIFICATION_STATUS.PENDING_MUSE] ?? 0, onClick: goVerification },
    { key: 'verified', icon: <VerifiedUserIcon />, label: t('dashboard.stat.verified'), value: acct[VERIFICATION_STATUS.VERIFIED] ?? 0, onClick: goVerification },
    { key: 'manual', icon: <PersonIcon />, label: t('dashboard.stat.manual'), value: acct[VERIFICATION_STATUS.MANUAL] ?? 0, onClick: goVerification },
    { key: 'failed', icon: <CancelIcon />, label: t('dashboard.stat.failed'), value: acct[VERIFICATION_STATUS.FAILED] ?? 0, onClick: goVerification },
  ];

  const paylistStages = [
    { key: 'draft', icon: <EditIcon />, label: t('dashboard.stat.paylistDraft'), value: pl[PAYLIST_STATUS.DRAFT] ?? 0, amount: loaded ? tzs(plAmt[PAYLIST_STATUS.DRAFT]) : null, onClick: goPaylists },
    { key: 'pending', icon: <AccessTimeIcon />, label: t('dashboard.stat.paylistPending'), value: pl[PAYLIST_STATUS.PENDING_APPROVAL] ?? 0, amount: loaded ? tzs(plAmt[PAYLIST_STATUS.PENDING_APPROVAL]) : null, onClick: goPaylists },
    { key: 'approved', icon: <CheckIcon />, label: t('dashboard.stat.paylistApproved'), value: pl[PAYLIST_STATUS.APPROVED] ?? 0, amount: loaded ? tzs(plAmt[PAYLIST_STATUS.APPROVED]) : null, onClick: goPaylists },
    { key: 'submitted', icon: <SendIcon />, label: t('dashboard.stat.paylistSubmitted'), value: pl[PAYLIST_STATUS.SUBMITTED] ?? 0, amount: loaded ? tzs(plAmt[PAYLIST_STATUS.SUBMITTED]) : null, onClick: goPaylists },
    { key: 'closed', icon: <LockIcon />, label: t('dashboard.stat.paylistClosed'), value: pl[PAYLIST_STATUS.CLOSED] ?? 0, amount: loaded ? tzs(plAmt[PAYLIST_STATUS.CLOSED]) : null, onClick: goPaylists },
  ];


  const formattedTime = lastRefreshed
    ? lastRefreshed.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;

  if (!rights.includes(RIGHT_DASHBOARD)) return null;

  return (
    <div className={classes.page}>
      <Helmet title={t('dashboard.page.title')} />

      <DashboardHeader
        title={t('dashboard.page.title')}
        subtitle={t('dashboard.page.description')}
        refreshedLabel={formattedTime ? `${t('dashboard.lastRefreshed')} · ${formattedTime}` : null}
        onRefresh={refresh}
        refreshing={fetchingDashboard}
        refreshTooltip={t('dashboard.refresh')}
      />

      <ProgressOrError progress={fetchingDashboard && !fetchedDashboard} error={errorDashboard} />

      <Grid container spacing={3}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <StatCard {...kpi} />
          </Grid>
        ))}
      </Grid>

      <Box mt={3}>
        <SectionCard
          title={t('dashboard.pipeline.verification')}
          icon={<VerifiedUserIcon />}
          actionLabel={t('dashboard.open')}
          onAction={goVerification}
        >
          <PipelineFlow stages={verificationStages} emptyText={t('dashboard.pipeline.empty')} />
        </SectionCard>
      </Box>

      <Box mt={3}>
        <SectionCard
          title={t('dashboard.pipeline.paylists')}
          icon={<DescriptionIcon />}
          actionLabel={t('dashboard.open')}
          onAction={goPaylists}
        >
          <PipelineFlow stages={paylistStages} emptyText={t('dashboard.pipeline.empty')} />
        </SectionCard>
      </Box>
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingDashboard: state.tasafPayment.fetchingDashboard,
  fetchedDashboard: state.tasafPayment.fetchedDashboard,
  errorDashboard: state.tasafPayment.errorDashboard,
  dashboardCounts: state.tasafPayment.dashboardCounts,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchDashboardCounts }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PaymentDashboardPage);
