import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, Checkbox, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel,
  IconButton, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import AddIcon from '@material-ui/icons/Add';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import { formatMessage, formatMessageWithValues, journalize } from '@openimis/fe-core';

import {
  fetchMuseSettings, fetchMuseChanges, saveMuseSettings,
  approveMuseChange, rejectMuseChange, cancelMuseChange,
} from '../actions';
import {
  MODULE_NAME, RIGHT_MUSE_SETTINGS_PROPOSE, RIGHT_MUSE_SETTINGS_APPROVE,
} from '../constants';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
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

const EMPTY = {
  institutionCode: '', payerAccount: '', subBudgetClass: '', unappliedSubBudgetClass: '',
  paymentDesc: '', isStp: false, glAccounts: [],
};

const FIELD_KEYS = {
  institution_code: 'institutionCode', payer_account: 'payerAccount', sub_budget_class: 'subBudgetClass',
  unapplied_sub_budget_class: 'unappliedSubBudgetClass', payment_desc: 'paymentDesc', is_stp: 'isStp',
  gl_accounts: 'glAccounts', bank_name: 'bankName', fsp_type: 'fspType', bic: 'bic',
};

const show = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.map((g) => g.glaccount).join(', ') : '—';
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  return String(v);
};

function Section({
  title, open, onToggle, children, classes, bodyClass,
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
        {open ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
      </div>
      <Divider />
      <Collapse in={open}>
        <div className={bodyClass || classes.sectionBody}>{children}</div>
      </Collapse>
    </Paper>
  );
}

function Notice({ tone, children, classes }) {
  return (
    <Paper className={classes.paper}>
      <Typography className={`${classes.notice} ${tone === 'error' ? classes.noticeError : classes.noticeWarn}`}>
        <ErrorOutlineIcon fontSize="small" />
        {children}
      </Typography>
    </Paper>
  );
}

function MuseSettingsPage() {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, values) => formatMessageWithValues(intl, MODULE_NAME, id, values);
  const state = useSelector((s) => s.tasafPayment);
  const rights = useSelector((s) => s.core?.user?.i_user?.rights ?? []);
  const canPropose = rights.includes(RIGHT_MUSE_SETTINGS_PROPOSE);
  const canApprove = rights.includes(RIGHT_MUSE_SETTINGS_APPROVE);

  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState({ institution: true, description: true, changes: true });
  const [helpOpen, setHelpOpen] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const submitting = state?.submittingMutation;
  const prevSubmitting = useRef();

  const reload = () => { dispatch(fetchMuseSettings()); dispatch(fetchMuseChanges()); };
  useEffect(reload, []);
  useEffect(() => {
    if (prevSubmitting.current && !submitting) {
      dispatch(journalize(state?.mutation));
      setReason('');
      reload();
    }
  }, [submitting]);
  useEffect(() => { prevSubmitting.current = submitting; });

  useEffect(() => {
    const s = state?.museSettings;
    setForm(s ? {
      ...EMPTY,
      ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, s[k] ?? EMPTY[k]])),
      glAccounts: s.glAccounts || [],
    } : EMPTY);
  }, [state?.museSettings]);

  const changes = state?.museChanges || [];
  const pendingSettings = changes.find((c) => c.kind === 'SETTINGS' && c.status === 'PENDING');
  const readiness = state?.museReadiness;
  const editable = canPropose && !pendingSettings;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setGl = (i, k, v) => setForm({
    ...form, glAccounts: form.glAccounts.map((g, idx) => (idx === i ? { ...g, [k]: v } : g)),
  });
  const intOk = (v) => v === '' || v === null || /^\d+$/.test(String(v));
  const glIncomplete = form.glAccounts.some((g) => !(g.glaccount || '').trim());
  const valid = !glIncomplete && intOk(form.subBudgetClass) && intOk(form.unappliedSubBudgetClass);

  const field = (k, { required, type, className } = {}) => (
    <div className={className}>
      <div className={classes.label}>
        {t(`museSettings.${k}`)}
        {required && <span className={classes.required}>*</span>}
      </div>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        type={type}
        value={form[k] ?? ''}
        onChange={set(k)}
        disabled={!editable}
        error={type === 'number' && !intOk(form[k])}
        placeholder={t(`museSettings.${k}.placeholder`)}
      />
    </div>
  );

  const decide = (row, approve) => {
    if (approve) dispatch(approveMuseChange(row.id, null, t('museChanges.mutation.approve')));
    else setRejecting(row);
  };
  const confirmReject = () => {
    dispatch(rejectMuseChange(rejecting.id, comment, t('museChanges.mutation.reject')));
    setRejecting(null);
    setComment('');
  };

  return (
    <div className={classes.page}>
      <Paper className={classes.paper}>
        <div className={classes.band}>
          <Typography>{t('museSettings.title')}</Typography>
          <Button color="primary" startIcon={<InfoOutlinedIcon />} onClick={() => setHelpOpen(true)}>
            {t('museSettings.helpLink')}
          </Button>
        </div>
        <Divider />
        <Typography variant="body2" className={classes.subtitle}>{t('museSettings.help')}</Typography>
      </Paper>

      {readiness?.environmentMismatch && (
        <Notice tone="error" classes={classes}>
          {tv('museSettings.environmentMismatch', {
            approved: readiness.settingsEnvironment || '—', server: readiness.serverEnvironment || '—',
          })}
        </Notice>
      )}
      {pendingSettings && (
        <Notice tone="warning" classes={classes}>
          {tv('museSettings.pendingBanner', { user: pendingSettings.requested_by })}
        </Notice>
      )}

      <Section
        classes={classes}
        title={t('museSettings.section.institution')}
        open={open.institution}
        onToggle={() => setOpen({ ...open, institution: !open.institution })}
      >
        {field('institutionCode', { required: true })}
        <div>
          <div className={classes.label}>
            {t('museSettings.payerAccount')}
            <span className={classes.required}>*</span>
          </div>
          <div className={classes.payer}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              value={form.payerAccount ?? ''}
              onChange={set('payerAccount')}
              disabled={!editable}
              placeholder={t('museSettings.payerAccount.placeholder')}
            />
            <TextField
              select
              variant="outlined"
              size="small"
              label={t('museSettings.currencyCode')}
              value="TZS"
              disabled
            >
              <MenuItem value="TZS">TZS</MenuItem>
            </TextField>
          </div>
        </div>
        {field('subBudgetClass', { required: true, type: 'number' })}
        {field('unappliedSubBudgetClass', { type: 'number' })}
        <FormControlLabel
          className={classes.full}
          control={(
            <Checkbox
              color="primary"
              checked={!!form.isStp}
              disabled={!editable}
              onChange={(e) => setForm({ ...form, isStp: e.target.checked })}
            />
          )}
          label={t('museSettings.isStp')}
        />
      </Section>

      <Section
        classes={classes}
        title={t('museSettings.section.description')}
        open={open.description}
        onToggle={() => setOpen({ ...open, description: !open.description })}
      >
        {field('paymentDesc', { required: true, className: classes.full })}
        <div className={classes.full}>
          <div className={classes.label}>{t('museSettings.gl.title')}</div>
          {form.glAccounts.map((g, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div className={classes.glRow} key={i}>
              <TextField
                variant="outlined"
                size="small"
                required
                label={t('museSettings.gl.account')}
                value={g.glaccount || ''}
                error={!(g.glaccount || '').trim()}
                disabled={!editable}
                inputProps={{ style: { fontFamily: 'monospace' } }}
                onChange={(e) => setGl(i, 'glaccount', e.target.value)}
              />
              <TextField variant="outlined" size="small" label={t('museSettings.gl.desc')} value={g.glaccountDesc || ''} disabled={!editable} onChange={(e) => setGl(i, 'glaccountDesc', e.target.value)} />
              <TextField variant="outlined" size="small" label={t('museSettings.gl.grant')} value={g.grantName || ''} disabled={!editable} onChange={(e) => setGl(i, 'grantName', e.target.value)} />
              <IconButton
                size="small"
                disabled={!editable}
                onClick={() => setForm({ ...form, glAccounts: form.glAccounts.filter((_, idx) => idx !== i) })}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </div>
          ))}
          <Button
            color="primary"
            startIcon={<AddIcon />}
            disabled={!editable}
            onClick={() => setForm({ ...form, glAccounts: [...form.glAccounts, { glaccount: '', glaccountDesc: '', grantName: '' }] })}
          >
            {t('museSettings.gl.add')}
          </Button>
        </div>
      </Section>

      {canPropose && (
        <Paper className={`${classes.paper} ${classes.footer}`}>
          <TextField
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            size="small"
            label={t('museSettings.reason')}
            placeholder={t('museSettings.reason.placeholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={!editable}
            inputProps={{ maxLength: 500 }}
          />
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<SaveOutlinedIcon />}
            disabled={!valid || !editable || submitting}
            onClick={() => dispatch(saveMuseSettings(form, t('museSettings.mutation.save'), reason))}
          >
            {t('museSettings.save')}
          </Button>
          <Typography className={classes.footerNote}>{t('museSettings.saveNote')}</Typography>
        </Paper>
      )}

      <Section
        classes={classes}
        title={tv('museChanges.title', { count: changes.filter((c) => c.status === 'PENDING').length })}
        open={open.changes}
        onToggle={() => setOpen({ ...open, changes: !open.changes })}
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
                  <TableCell>
                    {c.kind === 'SETTINGS' ? t('museChanges.kind.SETTINGS') : tv('museChanges.kind.FSP_PROFILE', { code: c.fsp_code })}
                  </TableCell>
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
                        <Button size="small" color="primary" variant="contained" disabled={submitting} onClick={() => decide(c, true)}>
                          {t('museChanges.approve')}
                        </Button>
                        {' '}
                        <Button size="small" disabled={submitting} onClick={() => decide(c, false)}>
                          {t('museChanges.reject')}
                        </Button>
                      </>
                    )}
                    {c.can_cancel && (
                      <Button size="small" disabled={submitting} onClick={() => dispatch(cancelMuseChange(c.id, null, t('museChanges.mutation.cancel')))}>
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

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('museSettings.title')}</DialogTitle>
        <DialogContent>
          {['1', '2', '3', '4'].map((n) => (
            <Typography key={n} variant="body2" paragraph>{t(`museSettings.helpText.${n}`)}</Typography>
          ))}
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={() => setHelpOpen(false)}>{t('payloadPreview.close')}</Button>
        </DialogActions>
      </Dialog>

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
    </div>
  );
}

export default MuseSettingsPage;
