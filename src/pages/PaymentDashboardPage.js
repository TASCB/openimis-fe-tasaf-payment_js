import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useHistory } from 'react-router-dom';

import {
  Grid,
  Paper,
  Typography,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import { makeStyles } from '@material-ui/styles';

import { useModulesManager, useTranslations } from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_DASHBOARD,
  VERIFICATION_STATUS,
  PAYLIST_STATUS,
} from '../constants';
import { fetchDashboardCounts } from '../actions';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(3),
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    '& > * + *': {
      marginLeft: theme.spacing(1),
    },
  },
  lastUpdated: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  sectionTitle: {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  divider: {
    margin: theme.spacing(3, 0, 2.5),
  },
  statCard: {
    padding: theme.spacing(3),
    cursor: 'pointer',
    borderRadius: theme.shape.borderRadius,
    borderTop: '4px solid transparent',
    transition: 'box-shadow 0.2s ease, transform 0.1s ease',
    '&:hover': {
      boxShadow: theme.shadows[4],
      transform: 'translateY(-2px)',
    },
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },
  statLabel: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.75),
    fontSize: '0.8125rem',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  loadingOverlay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    width: '100%',
  },
  errorText: {
    color: theme.palette.error.main,
    padding: theme.spacing(1, 0),
  },
}));

function StatCard({
  value, label, color, loading, onClick, classes,
}) {
  const displayValue = loading ? (
    <CircularProgress size={28} style={{ color }} />
  ) : (
    <Typography className={classes.statNumber} style={{ color }}>
      {value ?? '—'}
    </Typography>
  );

  return (
    <Paper
      className={classes.statCard}
      style={{ borderTopColor: color }}
      onClick={onClick}
      elevation={1}
    >
      {displayValue}
      <Typography className={classes.statLabel}>{label}</Typography>
    </Paper>
  );
}

function PaymentDashboardPage({
  fetchDashboardCounts,
  fetchingDashboard,
  fetchedDashboard,
  errorDashboard,
  dashboardCounts,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const history = useHistory();
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const refresh = () => {
    fetchDashboardCounts();
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rights.includes(RIGHT_DASHBOARD)) return null;

  const acct = dashboardCounts?.accounts ?? {};
  const pl   = dashboardCounts?.paylists ?? {};

  const accountStats = [
    { status: VERIFICATION_STATUS.PENDING,      label: formatMessage('dashboard.stat.pending'),     color: '#9e9e9e', route: '/tasafPayment/accounts' },
    { status: VERIFICATION_STATUS.PENDING_MUSE, label: formatMessage('dashboard.stat.pendingMuse'), color: '#1976d2', route: '/tasafPayment/accounts' },
    { status: VERIFICATION_STATUS.VERIFIED,     label: formatMessage('dashboard.stat.verified'),    color: '#43a047', route: '/tasafPayment/verification' },
    { status: VERIFICATION_STATUS.MANUAL,       label: formatMessage('dashboard.stat.manual'),      color: '#fb8c00', route: '/tasafPayment/approval' },
    { status: VERIFICATION_STATUS.FAILED,       label: formatMessage('dashboard.stat.failed'),      color: '#e53935', route: '/tasafPayment/accounts' },
  ];

  const paylistStats = [
    { status: PAYLIST_STATUS.DRAFT,            label: formatMessage('dashboard.stat.paylistDraft'),    color: '#9e9e9e', route: '/tasafPayment/paylists' },
    { status: PAYLIST_STATUS.PENDING_APPROVAL, label: formatMessage('dashboard.stat.paylistPending'),  color: '#fb8c00', route: '/tasafPayment/paylists' },
    { status: PAYLIST_STATUS.APPROVED,         label: formatMessage('dashboard.stat.paylistApproved'), color: '#1e88e5', route: '/tasafPayment/paylists' },
    { status: PAYLIST_STATUS.SUBMITTED,        label: formatMessage('dashboard.stat.paylistSubmitted'),color: '#8e24aa', route: '/tasafPayment/paylists' },
    { status: PAYLIST_STATUS.CLOSED,           label: formatMessage('dashboard.stat.paylistClosed'),   color: '#43a047', route: '/tasafPayment/paylists' },
  ];

  const formattedTime = lastRefreshed
    ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <Typography variant="h5">
          {formatMessage('dashboard.page.title')}
        </Typography>
        <div className={classes.headerRight}>
          {formattedTime && (
            <Typography className={classes.lastUpdated}>
              {formatMessage('dashboard.lastRefreshed')}&nbsp;{formattedTime}
            </Typography>
          )}
          <Tooltip title={formatMessage('dashboard.refresh')}>
            <span>
              <IconButton
                size="small"
                onClick={refresh}
                disabled={fetchingDashboard}
              >
                {fetchingDashboard
                  ? <CircularProgress size={18} />
                  : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>

      {errorDashboard && (
        <Typography className={classes.errorText} variant="body2">
          {errorDashboard}
        </Typography>
      )}

      <div className={classes.sectionHeader}>
        <Typography variant="subtitle1" className={classes.sectionTitle}>
          {formatMessage('dashboard.section.verification')}
        </Typography>
      </div>
      <Grid container spacing={2} alignItems="stretch">
        {accountStats.map(({ status, label, color, route }) => (
          <Grid item xs={12} sm={6} md={2} key={status}>
            <StatCard
              value={fetchedDashboard ? acct[status] : undefined}
              label={label}
              color={color}
              loading={fetchingDashboard}
              onClick={() => history.push(route)}
              classes={classes}
            />
          </Grid>
        ))}
      </Grid>

      <Divider className={classes.divider} />

      <div className={classes.sectionHeader}>
        <Typography variant="subtitle1" className={classes.sectionTitle}>
          {formatMessage('dashboard.section.paylists')}
        </Typography>
      </div>
      <Grid container spacing={2} alignItems="stretch">
        {paylistStats.map(({ status, label, color, route }) => (
          <Grid item xs={12} sm={6} md={2} key={status}>
            <StatCard
              value={fetchedDashboard ? pl[status] : undefined}
              label={label}
              color={color}
              loading={fetchingDashboard}
              onClick={() => history.push(route)}
              classes={classes}
            />
          </Grid>
        ))}
      </Grid>

    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingDashboard: state.tasafPayment.fetchingDashboard,
  fetchedDashboard:  state.tasafPayment.fetchedDashboard,
  errorDashboard:    state.tasafPayment.errorDashboard,
  dashboardCounts:   state.tasafPayment.dashboardCounts,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchDashboardCounts }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PaymentDashboardPage);
