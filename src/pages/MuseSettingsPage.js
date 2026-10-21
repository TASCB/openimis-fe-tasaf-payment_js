import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel,
  IconButton, MenuItem, Paper, TextField, Typography,
} from '@material-ui/core';
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
import {
  ChangeRequests, Notice, Section, useSettingsStyles,
} from '../components/settings/SettingsKit';

const EMPTY = {
  institutionCode: '', payerAccount: '', subBudgetClass: '', unappliedSubBudgetClass: '',
  paymentDesc: '', isStp: false, glAccounts: [],
};

function MuseSettingsPage() {
  const intl = useIntl();
  const classes = useSettingsStyles();
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
  const sbcOptions = (() => {
    const raw = readiness?.subBudgetClasses;
    try { return (typeof raw === 'string' ? JSON.parse(raw) : raw) || []; } catch (e) { return []; }
  })();
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

  const sbcField = (k, { required }) => {
    if (!sbcOptions.length) return field(k, { required, type: 'number' });
    const value = form[k] === null || form[k] === undefined ? '' : String(form[k]);
    const listed = sbcOptions.some((o) => String(o.code) === value);
    return (
      <div>
        <div className={classes.label}>
          {t(`museSettings.${k}`)}
          {required && <span className={classes.required}>*</span>}
        </div>
        <TextField
          select
          fullWidth
          variant="outlined"
          size="small"
          value={value}
          onChange={set(k)}
          disabled={!editable}
          error={!!value && !listed}
          helperText={value && !listed ? t('museSettings.sbcNotListed') : null}
        >
          {!required && <MenuItem value="">{t('museSettings.sbcNone')}</MenuItem>}
          {value && !listed && <MenuItem value={value}>{value}</MenuItem>}
          {sbcOptions.map((o) => (
            <MenuItem key={o.code} value={String(o.code)}>{`${o.code} — ${o.description}`}</MenuItem>
          ))}
        </TextField>
      </div>
    );
  };

  return (
    <div>
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
        {sbcField('subBudgetClass', { required: true })}
        {sbcField('unappliedSubBudgetClass', {})}
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

      <ChangeRequests
        classes={classes}
        changes={changes}
        open={open.changes}
        onToggle={() => setOpen({ ...open, changes: !open.changes })}
        canApprove={canApprove}
        submitting={submitting}
        onApprove={(c) => dispatch(approveMuseChange(c.id, null, t('museChanges.mutation.approve')))}
        onReject={(c, comment) => dispatch(rejectMuseChange(c.id, comment, t('museChanges.mutation.reject')))}
        onCancel={(c) => dispatch(cancelMuseChange(c.id, null, t('museChanges.mutation.cancel')))}
      />

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

    </div>
  );
}

export default MuseSettingsPage;
