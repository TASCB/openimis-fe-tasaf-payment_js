import React, { useEffect, useMemo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import { makeStyles } from '@material-ui/styles';

import {
  Block,
  Helmet,
  ProgressOrError,
  useHistory,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_APPROVE_ACCOUNTS,
  RIGHT_DASHBOARD,
  RIGHT_GENERATE_PAYLIST,
  RIGHT_PAYLIST_SEARCH,
  RIGHT_PAYMENT_ACCOUNT_SEARCH,
  RIGHT_RETURN_FEEDBACK,
  RIGHT_RUN_PRE_AUDIT,
  VERIFICATION_STATUS,
  PAYLIST_STATUS,
} from '../constants';
import { fetchDashboardCounts } from '../actions';
import { defaultPageStyles } from '../utils/styles';

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),
  paper: theme.paper.paper,
  header: theme.paper.header,
  title: theme.paper.title,
  subtitle: theme.paper.message,
  pageHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  pageHeaderMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  section: {
    marginTop: theme.spacing(2),
  },
  summaryCard: {
    padding: theme.spacing(2.5),
    height: '100%',
  },
  summaryCardTitle: {
    marginBottom: theme.spacing(1),
  },
  summaryCardValue: {
    fontWeight: 700,
    lineHeight: 1.1,
  },
  overviewCardValue: {
    fontSize: '2rem',
  },
  statusCardValue: {
    fontSize: '1.5rem',
  },
  statusCard: {
    borderLeft: `4px solid ${theme.palette.primary.main}`,
  },
  sectionTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    flexWrap: 'wrap',
  },
  sectionCopy: {
    flex: '1 1 280px',
  },
  actionRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
  },
  actionButton: {
    whiteSpace: 'nowrap',
  },
  lastUpdated: {
    whiteSpace: 'nowrap',
  },
  statusGridItem: {
    [theme.breakpoints.up('lg')]: {
      flexBasis: '20%',
      maxWidth: '20%',
    },
  },
}));

function SummaryCard({
  classes,
  label,
  value,
  valueClassName = '',
  className = '',
}) {
  return (
    <Paper elevation={3} className={`${classes.summaryCard} ${className}`.trim()}>
      <Typography variant="h6" gutterBottom className={classes.summaryCardTitle}>
        {label}
      </Typography>
      <Typography className={`${classes.summaryCardValue} ${valueClassName}`.trim()}>
        {value}
      </Typography>
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
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
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

  const openRoute = (routeKey) => history.push(`/${modulesManager.getRef(routeKey)}`);

  const accountCounts = dashboardCounts?.accounts ?? {};
  const paylistCounts = dashboardCounts?.paylists ?? {};

  const verificationStats = useMemo(() => ([
    {
      status: VERIFICATION_STATUS.MANUAL,
      label: formatMessage('dashboard.stat.manual'),
      className: classes.statusCard,
    },
    {
      status: VERIFICATION_STATUS.FAILED,
      label: formatMessage('dashboard.stat.failed'),
      className: classes.statusCard,
    },
    {
      status: VERIFICATION_STATUS.PENDING_MUSE,
      label: formatMessage('dashboard.stat.pendingMuse'),
      className: classes.statusCard,
    },
    {
      status: VERIFICATION_STATUS.PENDING,
      label: formatMessage('dashboard.stat.pending'),
      className: classes.statusCard,
    },
    {
      status: VERIFICATION_STATUS.VERIFIED,
      label: formatMessage('dashboard.stat.verified'),
      className: classes.statusCard,
    },
  ]), [classes.statusCard, formatMessage]);

  const paylistStats = useMemo(() => ([
    {
      status: PAYLIST_STATUS.PENDING_APPROVAL,
      label: formatMessage('dashboard.stat.paylistPending'),
      className: classes.statusCard,
    },
    {
      status: PAYLIST_STATUS.DRAFT,
      label: formatMessage('dashboard.stat.paylistDraft'),
      className: classes.statusCard,
    },
    {
      status: PAYLIST_STATUS.APPROVED,
      label: formatMessage('dashboard.stat.paylistApproved'),
      className: classes.statusCard,
    },
    {
      status: PAYLIST_STATUS.SUBMITTED,
      label: formatMessage('dashboard.stat.paylistSubmitted'),
      className: classes.statusCard,
    },
    {
      status: PAYLIST_STATUS.CLOSED,
      label: formatMessage('dashboard.stat.paylistClosed'),
      className: classes.statusCard,
    },
  ]), [classes.statusCard, formatMessage]);

  const totalAccounts = Object.values(accountCounts).reduce((sum, value) => sum + (value ?? 0), 0);
  const totalPaylists = Object.values(paylistCounts).reduce((sum, value) => sum + (value ?? 0), 0);

  const overviewStats = [
    { label: formatMessage('dashboard.summary.accounts'), value: fetchedDashboard ? totalAccounts : '-' },
    { label: formatMessage('dashboard.summary.paylists'), value: fetchedDashboard ? totalPaylists : '-' },
    {
      label: formatMessage('dashboard.summary.manualReview'),
      value: fetchedDashboard ? accountCounts[VERIFICATION_STATUS.MANUAL] ?? 0 : '-',
    },
    {
      label: formatMessage('dashboard.summary.pendingApproval'),
      value: fetchedDashboard ? paylistCounts[PAYLIST_STATUS.PENDING_APPROVAL] ?? 0 : '-',
    },
  ];

  const verificationActions = [
    rights.includes(RIGHT_PAYMENT_ACCOUNT_SEARCH) && {
      label: formatMessage('dashboard.action.verification'),
      routeKey: 'tasafPayment.route.verificationResults',
    },
    rights.includes(RIGHT_APPROVE_ACCOUNTS) && {
      label: formatMessage('dashboard.action.approval'),
      routeKey: 'tasafPayment.route.approval',
    },
    rights.includes(RIGHT_RUN_PRE_AUDIT) && {
      label: formatMessage('dashboard.action.preAudit'),
      routeKey: 'tasafPayment.route.preAudit',
    },
  ].filter(Boolean);

  const paylistActions = [
    rights.includes(RIGHT_PAYLIST_SEARCH) && {
      label: formatMessage('dashboard.action.paylists'),
      routeKey: 'tasafPayment.route.paylists',
    },
    rights.includes(RIGHT_GENERATE_PAYLIST) && {
      label: formatMessage('dashboard.action.batchGeneration'),
      routeKey: 'tasafPayment.route.batchGeneration',
    },
    rights.includes(RIGHT_RETURN_FEEDBACK) && {
      label: formatMessage('dashboard.action.returnFeedback'),
      routeKey: 'tasafPayment.route.returnFeedback',
    },
  ].filter(Boolean);

  const formattedTime = lastRefreshed
    ? lastRefreshed.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    : null;

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('dashboard.page.title')} />

      <Paper className={classes.paper}>
        <Grid container className={`${classes.header} ${classes.pageHeader}`}>
          <Grid item xs={12} md={8} className={classes.title}>
            <Typography variant="h6">
              {formatMessage('dashboard.page.title')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} className={classes.pageHeaderMeta}>
            {formattedTime && (
              <Typography variant="body2" color="textSecondary" className={classes.lastUpdated}>
                {formatMessage('dashboard.lastRefreshed')} {formattedTime}
              </Typography>
            )}
            <Tooltip title={formatMessage('dashboard.refresh')}>
              <span>
                <IconButton onClick={refresh} disabled={fetchingDashboard}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Grid>
        </Grid>

        <Box p={2}>
          <Typography variant="body2" color="textSecondary" className={classes.subtitle}>
            {formatMessage('dashboard.page.description')}
          </Typography>
          <ProgressOrError progress={fetchingDashboard && !fetchedDashboard} error={errorDashboard} />

          <Grid container spacing={2} className={classes.section}>
            {overviewStats.map(({ label, value }) => (
              <Grid item xs={12} sm={6} md={3} key={label}>
                <SummaryCard
                  classes={classes}
                  label={label}
                  value={value}
                  valueClassName={classes.overviewCardValue}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      <div className={classes.section}>
        <Block title={formatMessage('dashboard.section.verification')} titleVariant="h6">
          <div className={classes.sectionTop}>
            <div className={classes.sectionCopy} />
            {!!verificationActions.length && (
              <div className={classes.actionRow}>
                {verificationActions.map(({ label, routeKey }) => (
                  <Button
                    key={routeKey}
                    variant="outlined"
                    color="primary"
                    className={classes.actionButton}
                    onClick={() => openRoute(routeKey)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <Divider />
          <Box pt={2}>
            <Grid container spacing={2}>
              {verificationStats.map(({ status, label, className }) => (
                <Grid item xs={12} sm={6} md={4} className={classes.statusGridItem} key={status}>
                  <SummaryCard
                    classes={classes}
                    label={label}
                    value={fetchedDashboard ? accountCounts[status] ?? 0 : '-'}
                    valueClassName={classes.statusCardValue}
                    className={className}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Block>
      </div>

      <div className={classes.section}>
        <Block title={formatMessage('dashboard.section.paylists')} titleVariant="h6">
          <div className={classes.sectionTop}>
            <div className={classes.sectionCopy} />
            {!!paylistActions.length && (
              <div className={classes.actionRow}>
                {paylistActions.map(({ label, routeKey }) => (
                  <Button
                    key={routeKey}
                    variant="outlined"
                    color="primary"
                    className={classes.actionButton}
                    onClick={() => openRoute(routeKey)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <Divider />
          <Box pt={2}>
            <Grid container spacing={2}>
              {paylistStats.map(({ status, label, className }) => (
                <Grid item xs={12} sm={6} md={4} className={classes.statusGridItem} key={status}>
                  <SummaryCard
                    classes={classes}
                    label={label}
                    value={fetchedDashboard ? paylistCounts[status] ?? 0 : '-'}
                    valueClassName={classes.statusCardValue}
                    className={className}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Block>
      </div>
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
