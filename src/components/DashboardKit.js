// Shared, presentational dashboard components. Keep in sync with the
// Communications and Training copies when changing shared visual behavior.
import React from 'react';
import { makeStyles } from '@material-ui/styles';
import { useTheme } from '@material-ui/core/styles';
import { alpha } from '@material-ui/core/styles/colorManipulator';
import {
  Paper, Typography, Button, IconButton, Tooltip,
} from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import ArrowForwardIcon from '@material-ui/icons/ArrowForwardIos';
import InboxIcon from '@material-ui/icons/MoveToInbox';

const useStyles = makeStyles((theme) => ({
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: theme.spacing(2), marginBottom: theme.spacing(3),
  },
  hTitle: { fontWeight: 700, lineHeight: 1.15 },
  hSub: { color: theme.palette.grey[600], marginTop: theme.spacing(0.5) },
  hMeta: { display: 'flex', alignItems: 'center', gap: theme.spacing(1.5) },
  hRefreshed: { color: theme.palette.grey[600], whiteSpace: 'nowrap', fontSize: '0.8rem' },
  refreshBtn: {
    backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10, padding: theme.spacing(1), color: theme.palette.primary.main,
    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) },
  },

  card: {
    position: 'relative', padding: theme.spacing(2.5), borderRadius: 14,
    backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none', height: '100%', overflow: 'hidden',
    transition: 'transform .15s ease, box-shadow .15s ease',
  },
  cardClickable: {
    cursor: 'pointer',
    '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}` },
  },
  accent: {
    position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
    background: theme.palette.primary.main,
  },
  label: {
    textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem',
    fontWeight: 600, color: theme.palette.grey[600],
  },
  value: {
    fontSize: '2.2rem', fontWeight: 700, lineHeight: 1, marginTop: theme.spacing(1),
    fontVariantNumeric: 'tabular-nums', color: theme.palette.text.primary,
  },
  valuePrimary: { color: theme.palette.primary.main },
  caption: { fontSize: '0.78rem', color: theme.palette.grey[600], marginTop: theme.spacing(0.75) },

  panel: {
    padding: theme.spacing(3), borderRadius: 14, backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', height: '100%',
  },
  panelHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing(2),
  },
  panelTitle: {
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    fontSize: '0.8rem', color: theme.palette.grey[700],
  },
  openBtn: {
    textTransform: 'none', fontWeight: 600, color: theme.palette.primary.main,
    '& .MuiButton-endIcon svg': { fontSize: 13 },
  },

  barTrack: {
    display: 'flex', width: '100%', height: 14, borderRadius: 7, overflow: 'hidden',
    background: theme.palette.action.hover, marginBottom: theme.spacing(2),
  },
  barSeg: { height: '100%' },
  legend: { display: 'flex', flexDirection: 'column', gap: theme.spacing(0.75) },
  legendRow: { display: 'flex', alignItems: 'center', gap: theme.spacing(1), fontSize: '0.875rem' },
  legendDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  legendLabel: { flex: 1, color: theme.palette.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  legendVal: { fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  legendPct: { color: theme.palette.grey[600], fontSize: '0.78rem', minWidth: 40, textAlign: 'right' },

  rankRow: { display: 'flex', alignItems: 'center', gap: theme.spacing(1.5), padding: theme.spacing(0.75, 0) },
  rankLabel: { flex: '0 0 38%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.875rem' },
  rankBarTrack: { flex: 1, height: 8, borderRadius: 4, background: theme.palette.action.hover, overflow: 'hidden' },
  rankBar: { height: '100%', background: theme.palette.primary.main, borderRadius: 4 },
  rankVal: { width: 56, textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },

  stepper: { display: 'flex', alignItems: 'stretch', flexWrap: 'wrap', gap: theme.spacing(1) },
  step: {
    flex: '1 1 0', minWidth: 112, display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', borderRadius: 12, border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1.75, 1), cursor: 'pointer', transition: 'background-color .15s ease',
    '&:hover': { backgroundColor: theme.palette.action.hover },
  },
  stepActive: { borderColor: theme.palette.primary.main, background: alpha(theme.palette.primary.main, 0.05) },
  stepValue: { fontSize: '1.7rem', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: theme.palette.text.primary },
  stepLabel: { marginTop: theme.spacing(0.75), fontSize: '0.78rem', fontWeight: 600, color: theme.palette.text.primary },
  stepSub: { marginTop: theme.spacing(0.25), fontSize: '0.72rem', color: theme.palette.grey[600] },
  stepConnector: { flex: '0 0 16px', alignSelf: 'center', height: 2, background: theme.palette.divider, borderRadius: 2 },

  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: theme.palette.grey[500], padding: theme.spacing(4, 2), gap: theme.spacing(1), textAlign: 'center',
  },
}));

const fmt = (v) => (typeof v === 'number' ? v.toLocaleString() : (v ?? 0));

export function DashboardHeader({
  title, subtitle, refreshedLabel, onRefresh, refreshing, refreshTooltip,
}) {
  const classes = useStyles();
  return (
    <div className={classes.header}>
      <div>
        <Typography variant="h5" className={classes.hTitle}>{title}</Typography>
        {subtitle && <Typography variant="body2" className={classes.hSub}>{subtitle}</Typography>}
      </div>
      {onRefresh && (
        <div className={classes.hMeta}>
          {refreshedLabel && <Typography className={classes.hRefreshed}>{refreshedLabel}</Typography>}
          <Tooltip title={refreshTooltip || ''}>
            <span>
              <IconButton className={classes.refreshBtn} onClick={onRefresh} disabled={refreshing}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export function StatCard({
  label, value, caption, onClick, primary,
}) {
  const classes = useStyles();
  return (
    <Paper className={`${classes.card} ${onClick ? classes.cardClickable : ''}`.trim()} onClick={onClick}>
      {primary && <span className={classes.accent} />}
      <Typography className={classes.label}>{label}</Typography>
      <Typography className={`${classes.value} ${primary ? classes.valuePrimary : ''}`}>{fmt(value)}</Typography>
      {caption && <Typography className={classes.caption}>{caption}</Typography>}
    </Paper>
  );
}

export function SectionCard({
  title, actionLabel, onAction, children,
}) {
  const classes = useStyles();
  return (
    <Paper className={classes.panel}>
      <div className={classes.panelHead}>
        <Typography className={classes.panelTitle}>{title}</Typography>
        {onAction && (
          <Button size="small" className={classes.openBtn} endIcon={<ArrowForwardIcon />} onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
      {children}
    </Paper>
  );
}

export function EmptyState({ text }) {
  const classes = useStyles();
  return (
    <div className={classes.empty}>
      <InboxIcon style={{ fontSize: 40, opacity: 0.5 }} />
      <Typography variant="body2">{text}</Typography>
    </div>
  );
}

export function Breakdown({ items, emptyText }) {
  const classes = useStyles();
  const theme = useTheme();
  const teal = theme.palette.primary.main;
  const rows = (items || []).filter((i) => (i.value ?? 0) > 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const total = rows.reduce((s, i) => s + (i.value ?? 0), 0);
  if (!total) return <EmptyState text={emptyText} />;
  const opacity = (idx) => Math.max(0.28, 0.95 - idx * 0.16);
  return (
    <>
      <div className={classes.barTrack}>
        {rows.map((i, idx) => (
          <div
            key={i.key ?? i.label}
            className={classes.barSeg}
            style={{ width: `${((i.value ?? 0) / total) * 100}%`, background: alpha(teal, opacity(idx)) }}
            title={`${i.label}: ${fmt(i.value)}`}
          />
        ))}
      </div>
      <div className={classes.legend}>
        {rows.map((i, idx) => (
          <div className={classes.legendRow} key={i.key ?? i.label}>
            <span className={classes.legendDot} style={{ background: alpha(teal, opacity(idx)) }} />
            <span className={classes.legendLabel}>{i.label}</span>
            <span className={classes.legendVal}>{fmt(i.value)}</span>
            <span className={classes.legendPct}>{`${Math.round(((i.value ?? 0) / total) * 100)}%`}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function RankedList({ items, emptyText }) {
  const classes = useStyles();
  const rows = (items || []).filter((i) => i.value != null);
  if (!rows.length || rows.every((r) => (r.value ?? 0) === 0)) return <EmptyState text={emptyText} />;
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <div>
      {rows.map((i) => (
        <div className={classes.rankRow} key={i.key ?? i.label}>
          <span className={classes.rankLabel} title={i.label}>{i.label}</span>
          <span className={classes.rankBarTrack}>
            <span className={classes.rankBar} style={{ width: `${((i.value ?? 0) / max) * 100}%` }} />
          </span>
          <span className={classes.rankVal}>{i.right != null ? i.right : fmt(i.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Stepper({ steps }) {
  const classes = useStyles();
  return (
    <div className={classes.stepper}>
      {(steps || []).map((s, idx) => (
        <React.Fragment key={s.key ?? s.label}>
          {idx > 0 && <div className={classes.stepConnector} />}
          <div
            className={`${classes.step} ${s.active ? classes.stepActive : ''}`}
            onClick={s.onClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' && s.onClick) s.onClick(); }}
          >
            <span className={classes.stepValue}>{fmt(s.value)}</span>
            <span className={classes.stepLabel}>{s.label}</span>
            {s.sub != null && <span className={classes.stepSub}>{s.sub}</span>}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
