import React, { useEffect, useMemo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import { alpha } from '@material-ui/core/styles/colorManipulator';
import RefreshIcon from '@material-ui/icons/Refresh';
import ArrowForwardIcon from '@material-ui/icons/ArrowForwardIos';
import { makeStyles } from '@material-ui/styles';

import {
  Helmet,
  ProgressOrError,
  useHistory,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_DASHBOARD,
  RIGHT_PAYLIST_SEARCH,
  RIGHT_PAYMENT_ACCOUNT_SEARCH,
  VERIFICATION_STATUS,
  PAYLIST_STATUS,
} from '../constants';
import { fetchDashboardCounts } from '../actions';
import { defaultPageStyles } from '../utils/styles';

// Compact amount formatter (compacts large figures: 1.2M). No currency prefix.
const fmtTZS = (v) => {
  const n = Number(v) || 0;
  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(n) >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(n);
};

// Semantic status colours, all sourced from the active openIMIS theme palette.
// (theme.palette.secondary is white in this theme, so it is intentionally unused.)
const dashColors = (theme) => ({
  primary: theme.palette.primary.main, // brand teal — accounts / submitted / manual
  success: theme.palette.success.main, // verified / closed
  warning: theme.palette.warning.main, // pending / draft / needs-attention
  info: theme.palette.info.main, // awaiting MUSE / approved
  error: theme.palette.error.main, // failed
  neutral: theme.palette.grey[500], // draft / neutral
});

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),

  // ── header ──
  headerBar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
  },
  title: {
    fontWeight: 700,
    color: theme.palette.text.primary,
    lineHeight: 1.15,
  },
  subtitle: {
    color: theme.palette.grey[600],
    marginTop: theme.spacing(0.5),
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
  },
  refreshedLabel: {
    color: theme.palette.grey[600],
    whiteSpace: 'nowrap',
    fontSize: '0.8rem',
  },
  refreshBtn: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    padding: theme.spacing(1),
    color: theme.palette.primary.main,
    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
  },

  // ── kpi cards ──
  kpiCard: {
    position: 'relative',
    padding: theme.spacing(2.5),
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
    height: '100%',
    overflow: 'hidden',
    transition: 'transform .15s ease, box-shadow .15s ease',
  },
  kpiClickable: {
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
    },
  },
  kpiAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
  },
  kpiLabel: {
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: theme.palette.grey[600],
  },
  kpiValue: {
    fontSize: '2.4rem',
    fontWeight: 700,
    lineHeight: 1,
    marginTop: theme.spacing(1),
  },
  kpiCaption: {
    fontSize: '0.78rem',
    color: theme.palette.grey[600],
    marginTop: theme.spacing(0.75),
  },

  // ── pipeline section ──
  panel: {
    padding: theme.spacing(3),
    borderRadius: 16,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
  },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2.5),
  },
  panelTitle: {
    fontWeight: 700,
    color: theme.palette.text.primary,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  panelTitleDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  openBtn: {
    textTransform: 'none',
    fontWeight: 600,
    color: theme.palette.primary.main,
    '& .MuiButton-endIcon svg': { fontSize: 13 },
  },
  pipeline: {
    display: 'flex',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  node: {
    flex: '1 1 0',
    minWidth: 92,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    borderRadius: 12,
    padding: theme.spacing(1.5, 1),
    cursor: 'pointer',
    transition: 'background-color .15s ease',
    '&:hover': { backgroundColor: theme.palette.action.hover },
  },
  nodeDisc: {
    width: 54,
    height: 54,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.35rem',
    fontWeight: 700,
    border: '2px solid',
  },
  nodeLabel: {
    marginTop: theme.spacing(1),
    fontSize: '0.78rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  nodeSub: {
    marginTop: theme.spacing(0.25),
    fontSize: '0.72rem',
    color: theme.palette.grey[600],
  },
  connector: {
    flex: '0 0 24px',
    alignSelf: 'center',
    height: 2,
    backgroundColor: theme.palette.divider,
    marginTop: theme.spacing(1.5),
    borderRadius: 2,
  },
}));

// ── small presentational pieces ──────────────────────────────────────────────

function KpiCard({
  classes, label, value, caption, color, onClick,
}) {
  return (
    <Paper
      className={`${classes.kpiCard} ${onClick ? classes.kpiClickable : ''}`.trim()}
      onClick={onClick}
    >
      <span className={classes.kpiAccent} style={{ backgroundColor: color }} />
      <Typography className={classes.kpiLabel}>{label}</Typography>
      <Typography className={classes.kpiValue} style={{ color }}>{value}</Typography>
      {caption && <Typography className={classes.kpiCaption}>{caption}</Typography>}
    </Paper>
  );
}

function PipelineNode({ classes, node, onClick }) {
  return (
    <div className={classes.node} onClick={onClick} role="button" tabIndex={0}>
      <div
        className={classes.nodeDisc}
        style={{ color: node.color, borderColor: node.color, backgroundColor: alpha(node.color, 0.1) }}
      >
        {node.value}
      </div>
      <Typography className={classes.nodeLabel}>{node.label}</Typography>
      {node.sub ? <Typography className={classes.nodeSub}>{node.sub}</Typography> : null}
    </div>
  );
}

function Pipeline({
  classes, title, dotColor, nodes, actionLabel, onAction,
}) {
  return (
    <Paper className={classes.panel}>
      <div className={classes.panelHead}>
        <Typography variant="subtitle1" className={classes.panelTitle}>
          <span className={classes.panelTitleDot} style={{ backgroundColor: dotColor }} />
          {title}
        </Typography>
        {onAction && (
          <Button
            size="small"
            className={classes.openBtn}
            endIcon={<ArrowForwardIcon />}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
      <div className={classes.pipeline}>
        {nodes.map((node, idx) => (
          <React.Fragment key={node.key}>
            {idx > 0 && <div className={classes.connector} />}
            <PipelineNode classes={classes} node={node} onClick={node.onClick} />
          </React.Fragment>
        ))}
      </div>
    </Paper>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

function PaymentDashboardPage({
  fetchDashboardCounts,
  fetchingDashboard,
  fetchedDashboard,
  errorDashboard,
  dashboardCounts,
}) {
  const classes = useStyles();
  const theme = useTheme();
  const color = dashColors(theme);
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

  const acct = dashboardCounts?.accounts ?? {};
  const pl = dashboardCounts?.paylists ?? {};
  const plAmt = dashboardCounts?.paylistAmounts ?? {};
  const totals = dashboardCounts?.totals ?? {};
  const loaded = fetchedDashboard;
  const num = (v) => (loaded ? (v ?? 0) : '–');
  const money = (v) => (loaded ? fmtTZS(v) : '–');

  const goVerification = rights.includes(RIGHT_PAYMENT_ACCOUNT_SEARCH)
    ? () => history.push(`/${modulesManager.getRef('tasafPayment.route.verificationResults')}`)
    : null;
  const goPaylists = rights.includes(RIGHT_PAYLIST_SEARCH)
    ? () => history.push(`/${modulesManager.getRef('tasafPayment.route.paylists')}`)
    : null;

  const totalAccounts = useMemo(
    () => (totals.accounts != null
      ? totals.accounts
      : Object.values(acct).reduce((s, v) => s + (v ?? 0), 0)),
    [acct, totals.accounts],
  );
  const attention = (acct[VERIFICATION_STATUS.MANUAL] ?? 0) + (acct[VERIFICATION_STATUS.FAILED] ?? 0);

  const kpis = [
    {
      label: formatMessage('dashboard.kpi.accounts'),
      value: loaded ? totalAccounts : '–',
      caption: loaded
        ? `${acct[VERIFICATION_STATUS.VERIFIED] ?? 0} ${formatMessage('dashboard.kpi.verifiedCaption')}`
        : formatMessage('dashboard.kpi.accountsCaption'),
      color: color.primary,
      onClick: goVerification,
    },
    {
      label: formatMessage('dashboard.kpi.attention'),
      value: loaded ? attention : '–',
      caption: formatMessage('dashboard.kpi.attentionCaption'),
      color: color.warning,
      onClick: goVerification,
    },
    {
      label: formatMessage('dashboard.kpi.inProcess'),
      value: money(totals.inProcessAmount),
      caption: formatMessage('dashboard.kpi.inProcessCaption'),
      color: color.info,
      onClick: goPaylists,
    },
    {
      label: formatMessage('dashboard.kpi.paid'),
      value: money(totals.paidAmount),
      caption: formatMessage('dashboard.kpi.paidCaption'),
      color: color.success,
      onClick: goPaylists,
    },
  ];

  const verificationNodes = [
    { key: 'pending', label: formatMessage('dashboard.stat.pending'), value: num(acct[VERIFICATION_STATUS.PENDING]), color: color.warning, onClick: goVerification },
    { key: 'muse', label: formatMessage('dashboard.stat.pendingMuse'), value: num(acct[VERIFICATION_STATUS.PENDING_MUSE]), color: color.info, onClick: goVerification },
    { key: 'verified', label: formatMessage('dashboard.stat.verified'), value: num(acct[VERIFICATION_STATUS.VERIFIED]), color: color.success, onClick: goVerification },
    { key: 'manual', label: formatMessage('dashboard.stat.manual'), value: num(acct[VERIFICATION_STATUS.MANUAL]), color: color.primary, onClick: goVerification },
    { key: 'failed', label: formatMessage('dashboard.stat.failed'), value: num(acct[VERIFICATION_STATUS.FAILED]), color: color.error, onClick: goVerification },
  ];

  const paylistNodes = [
    { key: 'draft', label: formatMessage('dashboard.stat.paylistDraft'), value: num(pl[PAYLIST_STATUS.DRAFT]), sub: loaded ? money(plAmt[PAYLIST_STATUS.DRAFT]) : null, color: color.neutral, onClick: goPaylists },
    { key: 'pending', label: formatMessage('dashboard.stat.paylistPending'), value: num(pl[PAYLIST_STATUS.PENDING_APPROVAL]), sub: loaded ? money(plAmt[PAYLIST_STATUS.PENDING_APPROVAL]) : null, color: color.warning, onClick: goPaylists },
    { key: 'approved', label: formatMessage('dashboard.stat.paylistApproved'), value: num(pl[PAYLIST_STATUS.APPROVED]), sub: loaded ? money(plAmt[PAYLIST_STATUS.APPROVED]) : null, color: color.info, onClick: goPaylists },
    { key: 'submitted', label: formatMessage('dashboard.stat.paylistSubmitted'), value: num(pl[PAYLIST_STATUS.SUBMITTED]), sub: loaded ? money(plAmt[PAYLIST_STATUS.SUBMITTED]) : null, color: color.primary, onClick: goPaylists },
    { key: 'closed', label: formatMessage('dashboard.stat.paylistClosed'), value: num(pl[PAYLIST_STATUS.CLOSED]), sub: loaded ? money(plAmt[PAYLIST_STATUS.CLOSED]) : null, color: color.success, onClick: goPaylists },
  ];

  const formattedTime = lastRefreshed
    ? lastRefreshed.toLocaleString([], {
      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
    : null;

  if (!rights.includes(RIGHT_DASHBOARD)) return null;

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('dashboard.page.title')} />

      <div className={classes.headerBar}>
        <div>
          <Typography variant="h5" className={classes.title}>
            {formatMessage('dashboard.page.title')}
          </Typography>
          <Typography variant="body2" className={classes.subtitle}>
            {formatMessage('dashboard.page.description')}
          </Typography>
        </div>
        <div className={classes.headerMeta}>
          {formattedTime && (
            <Typography className={classes.refreshedLabel}>
              {formatMessage('dashboard.lastRefreshed')} · {formattedTime}
            </Typography>
          )}
          <Tooltip title={formatMessage('dashboard.refresh')}>
            <span>
              <IconButton className={classes.refreshBtn} onClick={refresh} disabled={fetchingDashboard}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>

      <ProgressOrError progress={fetchingDashboard && !fetchedDashboard} error={errorDashboard} />

      <Grid container spacing={3}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={3} key={kpi.label}>
            <KpiCard classes={classes} {...kpi} />
          </Grid>
        ))}
      </Grid>

      <Box mt={3}>
        <Pipeline
          classes={classes}
          title={formatMessage('dashboard.pipeline.verification')}
          dotColor={color.success}
          nodes={verificationNodes}
          actionLabel={formatMessage('dashboard.open')}
          onAction={goVerification}
        />
      </Box>

      <Box mt={3}>
        <Pipeline
          classes={classes}
          title={formatMessage('dashboard.pipeline.paylists')}
          dotColor={color.primary}
          nodes={paylistNodes}
          actionLabel={formatMessage('dashboard.open')}
          onAction={goPaylists}
        />
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
