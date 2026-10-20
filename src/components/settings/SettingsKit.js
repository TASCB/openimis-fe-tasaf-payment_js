import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import {
  Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { formatMessage, formatMessageWithValues } from '@openimis/fe-core';

import { MODULE_NAME } from '../../constants';

export const useSettingsStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  band: {
    ...theme.table.title, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing(1),
  },
  toggle: { cursor: 'pointer', userSelect: 'none' },
  subtitle: { padding: theme.spacing(1.5, 2), color: theme.palette.text.secondary },
  notice: { display: 'flex', alignItems: 'center', gap: theme.spacing(1), padding: theme.spacing(1.5, 2) },
  noticeWarn: { color: theme.palette.warning.dark },
  noticeError: { color: theme.palette.error.main },
  sectionBody: {
    padding: theme.spacing(2), display: 'grid', gap: theme.spacing(2, 3),
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  },
  full: { gridColumn: '1 / -1' },
  label: { fontWeight: 500, fontSize: '0.875rem', marginBottom: theme.spacing(0.75), color: theme.palette.text.primary },
  required: { color: theme.palette.error.main, marginLeft: 2 },
  payer: {
    display: 'grid', gap: theme.spacing(1.5), alignItems: 'center',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
  },
  glRow: {
    display: 'grid', gap: theme.spacing(1.5), alignItems: 'center', marginBottom: theme.spacing(1),
    gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr) minmax(0, 1.5fr) auto',
    [theme.breakpoints.down('xs')]: { gridTemplateColumns: '1fr' },
  },
  footer: {
    padding: theme.spacing(2), display: 'flex', alignItems: 'center', gap: theme.spacing(2), flexWrap: 'wrap',
  },
  footerNote: { color: theme.palette.text.secondary, fontSize: '0.85rem' },
  changes: { overflowX: 'auto' },
  diff: { fontSize: '0.8rem', whiteSpace: 'nowrap' },
  before: { color: theme.palette.grey[600], textDecoration: 'line-through', marginRight: theme.spacing(0.5) },
  status: { fontWeight: 600, fontSize: '0.8rem' },
  statusPENDING: { color: theme.palette.warning.dark },
  statusAPPROVED: { color: theme.palette.success.dark },
  statusREJECTED: { color: theme.palette.error.dark },
  statusCANCELLED: { color: theme.palette.grey[600] },
  empty: { padding: theme.spacing(2), color: theme.palette.grey[600] },
}));

export const FIELD_KEYS = {
  institution_code: 'institutionCode', payer_account: 'payerAccount', sub_budget_class: 'subBudgetClass',
  unapplied_sub_budget_class: 'unappliedSubBudgetClass', payment_desc: 'paymentDesc', is_stp: 'isStp',
  gl_accounts: 'glAccounts', bank_name: 'bankName', fsp_type: 'fspType', bic: 'bic',
  sp_code: 'spCode', sp_sys_id: 'spSysId',
};

const show = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.map((g) => g.glaccount).join(', ') : '—';
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  return String(v);
};

export function Section({
  title, open, onToggle, children, classes, bodyClass, action,
}) {
  return (
    <Paper className={classes.paper}>
      <div
        className={`${classes.band} ${classes.toggle}`}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        role="button"
        tabIndex={0}
      >
        <Typography>{title}</Typography>
        <span>
          {action}
          {open ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
        </span>
      </div>
      <Divider />
      <Collapse in={open}>
        <div className={bodyClass || classes.sectionBody}>{children}</div>
      </Collapse>
    </Paper>
  );
}

export function Notice({ tone, children, classes }) {
  return (
    <Paper className={classes.paper}>
      <Typography className={`${classes.notice} ${tone === 'error' ? classes.noticeError : classes.noticeWarn}`}>
        <ErrorOutlineIcon fontSize="small" />
        {children}
      </Typography>
    </Paper>
  );
}

const kindLabel = (c, t, tv) => {
  if (c.kind === 'FSP_PROFILE') return tv('museChanges.kind.FSP_PROFILE', { code: c.fsp_code });
  return t(`museChanges.kind.${c.kind}`);
};

export function ChangeRequests({
  changes, open, onToggle, canApprove, submitting, onApprove, onReject, onCancel, classes,
}) {
  const intl = useIntl();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, values) => formatMessageWithValues(intl, MODULE_NAME, id, values);
  const [rejecting, setRejecting] = useState(null);
  const [comment, setComment] = useState('');

  const confirmReject = () => {
    onReject(rejecting, comment);
    setRejecting(null);
    setComment('');
  };

  return (
    <>
      <Section
        classes={classes}
        title={tv('museChanges.title', { count: changes.filter((c) => c.status === 'PENDING').length })}
        open={open}
        onToggle={onToggle}
        bodyClass={classes.changes}
      >
        {changes.length === 0 ? (
          <Typography className={classes.empty}>{t('museChanges.none')}</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('museChanges.col.what')}</TableCell>
                <TableCell>{t('museChanges.col.changes')}</TableCell>
                <TableCell>{t('museChanges.col.requested')}</TableCell>
                <TableCell>{t('museChanges.col.status')}</TableCell>
                <TableCell>{t('museChanges.col.decided')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {changes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{kindLabel(c, t, tv)}</TableCell>
                  <TableCell>
                    {(c.changed || []).map((f) => (
                      <div key={f} className={classes.diff}>
                        <b>{t(`museChanges.field.${FIELD_KEYS[f] || f}`)}</b>
                        {': '}
                        <span className={classes.before}>{show((c.current || {})[f])}</span>
                        {show((c.proposed || {})[f])}
                      </div>
                    ))}
                    {c.reason && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        {tv('museChanges.reason', { reason: c.reason })}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.requested_by}
                    <br />
                    <Typography variant="caption" color="textSecondary">{(c.requested_at || '').slice(0, 16).replace('T', ' ')}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography className={`${classes.status} ${classes[`status${c.status}`]}`}>
                      {t(`museChanges.status.${c.status}`)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {c.decided_by || '—'}
                    {c.comment && (
                      <Typography variant="caption" display="block" color="textSecondary">{c.comment}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                    {c.can_decide && canApprove && (
                      <>
                        <Button size="small" color="primary" variant="contained" disabled={submitting} onClick={() => onApprove(c)}>
                          {t('museChanges.approve')}
                        </Button>
                        {' '}
                        <Button size="small" disabled={submitting} onClick={() => setRejecting(c)}>
                          {t('museChanges.reject')}
                        </Button>
                      </>
                    )}
                    {c.can_cancel && (
                      <Button size="small" disabled={submitting} onClick={() => onCancel(c)}>
                        {t('museChanges.cancel')}
                      </Button>
                    )}
                    {c.status === 'PENDING' && !c.can_decide && !c.can_cancel && (
                      <Typography variant="caption" color="textSecondary">{t('museChanges.awaitingOther')}</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Dialog open={!!rejecting} onClose={() => setRejecting(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('museChanges.rejectTitle')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            variant="outlined"
            label={t('museChanges.rejectReason')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>{t('museChanges.back')}</Button>
          <Button color="primary" variant="contained" disabled={!comment.trim()} onClick={confirmReject}>
            {t('museChanges.reject')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
