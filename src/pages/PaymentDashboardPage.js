import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useHistory } from 'react-router-dom';

import {
  Grid,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Box,
} from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import { makeStyles } from '@material-ui/styles';

import { Helmet, useModulesManager, useTranslations } from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_DASHBOARD,
  VERIFICATION_STATUS,
  PAYLIST_STATUS,
} from '../constants';
import { fetchDashboardCounts } from '../actions';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  hero: {
    position: 'relative',
    overflow: 'hidden',
    padding: theme.spacing(3, 3, 2.5),
    marginBottom: theme.spacing(3),
    borderRadius: theme.shape.borderRadius * 2,
    background: 'linear-gradient(135deg, #e3f2ef 0%, #f6fbfa 48%, #fff7ec 100%)',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[1],
  },
  heroAccent: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 180,
    height: 180,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,121,107,0.16) 0%, rgba(0,121,107,0) 70%)',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(2),
  },
  heroCopy: {
    maxWidth: 720,
  },
  eyebrow: {
    color: '#0a6b63',
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: theme.spacing(1),
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.1,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1),
  },
  heroText: {
    color: theme.palette.text.secondary,
    maxWidth: 620,
    lineHeight: 1.55,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    padding: theme.spacing(0.5, 1),
    border: `1px solid ${theme.palette.divider}`,
    '& > * + *': {
      marginLeft: theme.spacing(1),
    },
  },
  lastUpdated: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
  },
  spotlightGrid: {
    marginTop: theme.spacing(2),
  },
  spotlightCard: {
    height: '100%',
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 1.5,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: 'rgba(255,255,255,0.84)',
    boxShadow: 'none',
  },
  spotlightLabel: {
    color: theme.palette.text.secondary,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: theme.spacing(0.5),
  },
  spotlightValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: theme.spacing(0.5),
  },
  spotlightHint: {
    color: theme.palette.text.secondary,
    fontSize: '0.82rem',
  },
  sectionPanel: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2.5),
    borderRadius: theme.shape.borderRadius * 1.5,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
    gap: theme.spacing(2),
  },
  sectionTitle: {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  sectionSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: '0.86rem',
  },
  sectionBadge: {
    color: '#0a6b63',
    backgroundColor: '#e8f5f2',
    borderRadius: 999,
    padding: theme.spacing(0.5, 1.25),
    fontSize: '0.75rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  statCard: {
    padding: theme.spacing(2.25),
    cursor: 'pointer',
    borderRadius: theme.shape.borderRadius * 1.5,
    border: '1px solid transparent',
    transition: 'box-shadow 0.2s ease, transform 0.1s ease, border-color 0.2s ease',
    '&:hover': {
      boxShadow: theme.shadows[4],
      transform: 'translateY(-2px)',
      borderColor: 'rgba(0,0,0,0.08)',
    },
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 160,
  },
  statTop: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0,
    marginTop: theme.spacing(0.5),
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
    fontSize: '0.9rem',
    lineHeight: 1.35,
    textAlign: 'left',
  },
  statAction: {
    marginTop: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    color: '#0a6b63',
    fontSize: '0.82rem',
    fontWeight: 600,
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
    padding: theme.spacing(1.5, 2),
    marginBottom: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: '#fff2f2',
    border: '1px solid rgba(211, 47, 47, 0.16)',
  },
  '@media (max-width: 960px)': {
    header: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    headerRight: {
      alignSelf: 'stretch',
      justifyContent: 'space-between',
    },
    heroTitle: {
      fontSize: '1.6rem',
    },
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
      style={{ background: `linear-gradient(180deg, ${color}12 0%, #ffffff 34%)` }}
      onClick={onClick}
      elevation={1}
    >
      <div className={classes.statTop}>
        <div>
          {displayValue}
          <Typography className={classes.statLabel}>{label}</Typography>
        </div>
        <span className={classes.statDot} style={{ backgroundColor: color }} />
      </div>
      <div className={classes.statAction}>
        <span>Open view</span>
        <ArrowForwardIcon fontSize="inherit" />
      </div>
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
  const formattedError = errorDashboard
    ? [errorDashboard.message, errorDashboard.detail].filter(Boolean).join(': ')
    : null;
  const spotlightStats = [
    {
      label: formatMessage('dashboard.stat.pendingMuse'),
      value: fetchedDashboard ? acct[VERIFICATION_STATUS.PENDING_MUSE] : undefined,
      hint: 'Accounts already sent and waiting for MUSE response',
      color: '#1976d2',
    },
    {
      label: formatMessage('dashboard.stat.failed'),
      value: fetchedDashboard ? acct[VERIFICATION_STATUS.FAILED] : undefined,
      hint: 'Accounts needing correction or investigation',
      color: '#e53935',
    },
    {
      label: formatMessage('dashboard.stat.paylistPending'),
      value: fetchedDashboard ? pl[PAYLIST_STATUS.PENDING_APPROVAL] : undefined,
      hint: 'Paylists ready for operational review and approval',
      color: '#fb8c00',
    },
  ];

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('dashboard.page.title')} />
      <Paper className={classes.hero} elevation={0}>
        <div className={classes.heroAccent} />
        <div className={classes.header}>
          <div className={classes.heroCopy}>
            <Typography className={classes.eyebrow}>
              TASAF Payment Operations
            </Typography>
            <Typography className={classes.heroTitle}>
              {formatMessage('dashboard.page.title')}
            </Typography>
            <Typography className={classes.heroText}>
              Track verification flow, manual review pressure, and paylist readiness from a single operational view.
            </Typography>
          </div>
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

        <Grid container spacing={2} className={classes.spotlightGrid}>
          {spotlightStats.map(({ label, value, hint, color }) => (
            <Grid item xs={12} md={4} key={label}>
              <Paper className={classes.spotlightCard} elevation={0}>
                <Typography className={classes.spotlightLabel}>{label}</Typography>
                <Typography className={classes.spotlightValue} style={{ color }}>
                  {fetchingDashboard ? '...' : value ?? '—'}
                </Typography>
                <Typography className={classes.spotlightHint}>{hint}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {formattedError && (
        <Typography className={classes.errorText} variant="body2">
          {formattedError}
        </Typography>
      )}

      <Paper className={classes.sectionPanel} elevation={0}>
        <div className={classes.sectionHeader}>
          <div>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              {formatMessage('dashboard.section.verification')}
            </Typography>
            <Typography className={classes.sectionSubtitle}>
              Follow accounts from pending verification through failed review and manual intervention.
            </Typography>
          </div>
          <span className={classes.sectionBadge}>Accounts</span>
        </div>
        <Grid container spacing={2} alignItems="stretch">
          {accountStats.map(({ status, label, color, route }) => (
            <Grid item xs={12} sm={6} md={status === VERIFICATION_STATUS.PENDING_MUSE ? 4 : 2} key={status}>
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
      </Paper>

      <Paper className={classes.sectionPanel} elevation={0}>
        <div className={classes.sectionHeader}>
          <div>
            <Typography variant="subtitle1" className={classes.sectionTitle}>
              {formatMessage('dashboard.section.paylists')}
            </Typography>
            <Typography className={classes.sectionSubtitle}>
              Monitor paylist generation, approval bottlenecks, and files ready for submission.
            </Typography>
          </div>
          <span className={classes.sectionBadge}>Paylists</span>
        </div>
        <Grid container spacing={2} alignItems="stretch">
          {paylistStats.map(({ status, label, color, route }) => (
            <Grid item xs={12} sm={6} md={status === PAYLIST_STATUS.PENDING_APPROVAL ? 4 : 2} key={status}>
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
      </Paper>
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
