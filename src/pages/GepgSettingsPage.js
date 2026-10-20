import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton,
  Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import { formatMessage, formatMessageWithValues, journalize } from '@openimis/fe-core';

import {
  fetchGepgSettings, fetchGepgChanges, saveGepgSettings, fetchGepgRequests, fetchGepgItems,
  resendGepgVerification, approveMuseChange, rejectMuseChange, cancelMuseChange,
} from '../actions';
import {
  MODULE_NAME, RIGHT_MUSE_SETTINGS_PROPOSE, RIGHT_MUSE_SETTINGS_APPROVE, RIGHT_RUN_VERIFICATION,
} from '../constants';
import {
  ChangeRequests, Notice, Section, useSettingsStyles,
} from '../components/settings/SettingsKit';

const EMPTY = { spCode: '', spSysId: '' };
const RESENDABLE = ['FAILED', 'REFUSED', 'REJECTED', 'EXPIRED'];
const when = (v) => (v ? v.slice(0, 16).replace('T', ' ') : '—');

function GepgSettingsPage() {
  const intl = useIntl();
  const classes = useSettingsStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, values) => formatMessageWithValues(intl, MODULE_NAME, id, values);
  const state = useSelector((s) => s.tasafPayment);
  const rights = useSelector((s) => s.core?.user?.i_user?.rights ?? []);
  const canPropose = rights.includes(RIGHT_MUSE_SETTINGS_PROPOSE);
  const canApprove = rights.includes(RIGHT_MUSE_SETTINGS_APPROVE);
  const canResend = rights.includes(RIGHT_RUN_VERIFICATION);

  const [form, setForm] = useState(EMPTY);
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState({ provider: true, changes: true, requests: true });
  const [viewing, setViewing] = useState(null);
  const submitting = state?.submittingMutation;
  const prevSubmitting = useRef();

  const reload = () => {
    dispatch(fetchGepgSettings());
    dispatch(fetchGepgChanges());
    dispatch(fetchGepgRequests());
  };
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
    const s = state?.gepgSettings;
    setForm(s ? { spCode: s.spCode || '', spSysId: s.spSysId || '' } : EMPTY);
  }, [state?.gepgSettings]);

  const readiness = state?.gepgReadiness;
  const changes = state?.gepgChanges || [];
  const requests = state?.gepgRequests || [];
  const pending = changes.find((c) => c.status === 'PENDING');
  const editable = canPropose && !pending;
  const valid = /^[A-Za-z0-9]{0,5}$/.test(form.spCode) && /^[A-Za-z0-9]{0,10}$/.test(form.spSysId);

  const view = (r) => {
    setViewing(r);
    dispatch(fetchGepgItems(r.acc_verif_id));
  };

  const field = (k, max) => (
    <div>
      <div className={classes.label}>
        {t(`gepg.${k}`)}
        <span className={classes.required}>*</span>
      </div>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value.toUpperCase() })}
        disabled={!editable}
        error={!valid}
        placeholder={t(`gepg.${k}.placeholder`)}
        inputProps={{ maxLength: max, style: { fontFamily: 'monospace' } }}
      />
    </div>
  );

  return (
    <div>
      <Paper className={classes.paper}>
        <div className={classes.band}>
          <Typography>{t('gepg.title')}</Typography>
        </div>
        <Divider />
        <Typography variant="body2" className={classes.subtitle}>{t('gepg.help')}</Typography>
      </Paper>

      {readiness && !readiness.govesbEnabled && (
        <Notice tone="error" classes={classes}>{t('gepg.notice.govesb')}</Notice>
      )}
      {readiness && readiness.govesbEnabled && !readiness.apiCodeSet && (
        <Notice tone="warning" classes={classes}>{tv('gepg.notice.apiCode', { topic: readiness.topic })}</Notice>
      )}
      {readiness?.environmentMismatch && (
        <Notice tone="error" classes={classes}>
          {tv('museSettings.environmentMismatch', {
            approved: readiness.settingsEnvironment || '—', server: readiness.serverEnvironment || '—',
          })}
        </Notice>
      )}
      {!!readiness?.providersMissing?.length && (
        <Notice tone="warning" classes={classes}>
          {tv('gepg.notice.bic', { fsps: readiness.providersMissing.join(', ') })}
        </Notice>
      )}
      {pending && (
        <Notice tone="warning" classes={classes}>
          {tv('museSettings.pendingBanner', { user: pending.requested_by })}
        </Notice>
      )}

      <Section
        classes={classes}
        title={t('gepg.section.provider')}
        open={open.provider}
        onToggle={() => setOpen({ ...open, provider: !open.provider })}
      >
        {field('spCode', 5)}
        {field('spSysId', 10)}
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
            onClick={() => dispatch(saveGepgSettings(form, t('gepg.mutation.save'), reason))}
          >
            {t('museSettings.save')}
          </Button>
          <Typography className={classes.footerNote}>{t('gepg.saveNote')}</Typography>
        </Paper>
      )}

      <ChangeRequests
        classes={classes}
        changes={changes}
        open={open.changes}
        onToggle={() => setOpen({ ...open, changes: !open.changes })}
        canApprove={canApprove}
        submitting={submitting}
        onApprove={(c) => dispatch(approveMuseChange(c.id, null, t('gepg.mutation.approve')))}
        onReject={(c, comment) => dispatch(rejectMuseChange(c.id, comment, t('gepg.mutation.reject')))}
        onCancel={(c) => dispatch(cancelMuseChange(c.id, null, t('gepg.mutation.cancel')))}
      />

      <Section
        classes={classes}
        title={t('gepg.requests.title')}
        open={open.requests}
        onToggle={() => setOpen({ ...open, requests: !open.requests })}
        bodyClass={classes.changes}
        action={(
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); dispatch(fetchGepgRequests()); }}
            title={t('gepg.requests.refresh')}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
      >
        {requests.length === 0 ? (
          <Typography className={classes.empty}>{t('gepg.requests.none')}</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('gepg.requests.col.id')}</TableCell>
                <TableCell>{t('gepg.requests.col.fsp')}</TableCell>
                <TableCell align="right">{t('gepg.requests.col.accounts')}</TableCell>
                <TableCell>{t('gepg.requests.col.results')}</TableCell>
                <TableCell>{t('gepg.requests.col.status')}</TableCell>
                <TableCell>{t('gepg.requests.col.sent')}</TableCell>
                <TableCell>{t('gepg.requests.col.answered')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.acc_verif_id}>
                  <TableCell style={{ fontFamily: 'monospace' }}>{r.acc_verif_id}</TableCell>
                  <TableCell>
                    {r.fsp_code}
                    <Typography variant="caption" display="block" color="textSecondary">{r.bic}</Typography>
                  </TableCell>
                  <TableCell align="right">{r.item_count}</TableCell>
                  <TableCell>
                    {r.answered
                      ? tv('gepg.requests.results', { verified: r.verified, manual: r.manual, failed: r.failed })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {t(`gepg.status.${r.status}`)}
                    {r.status_desc && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        {r.status_code ? `${r.status_code} ` : ''}
                        {r.status_desc}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {when(r.sent_at)}
                    <Typography variant="caption" display="block" color="textSecondary">{r.requested_by}</Typography>
                  </TableCell>
                  <TableCell>{when(r.answered_at)}</TableCell>
                  <TableCell align="right" style={{ whiteSpace: 'nowrap' }}>
                    <Button size="small" onClick={() => view(r)}>{t('gepg.requests.view')}</Button>
                    {canResend && RESENDABLE.includes(r.status) && (
                      <Button
                        size="small"
                        color="primary"
                        disabled={submitting}
                        onClick={() => dispatch(resendGepgVerification(r.acc_verif_id, t('gepg.mutation.resend')))}
                      >
                        {t('gepg.requests.resend')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="lg" fullWidth>
        <DialogTitle>{viewing && tv('gepg.items.title', { id: viewing.acc_verif_id })}</DialogTitle>
        <DialogContent>
          {state?.fetchingGepgItems ? <CircularProgress size={24} /> : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('gepg.items.col.item')}</TableCell>
                  <TableCell>{t('gepg.items.col.hhid')}</TableCell>
                  <TableCell>{t('gepg.items.col.account')}</TableCell>
                  <TableCell>{t('gepg.items.col.expected')}</TableCell>
                  <TableCell>{t('gepg.items.col.returned')}</TableCell>
                  <TableCell>{t('gepg.items.col.code')}</TableCell>
                  <TableCell>{t('gepg.items.col.decision')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(state?.gepgItems || []).map((i) => (
                  <TableRow key={i.item_id}>
                    <TableCell>{i.item_id}</TableCell>
                    <TableCell>{i.hhid || '—'}</TableCell>
                    <TableCell style={{ fontFamily: 'monospace' }}>{i.acc_num}</TableCell>
                    <TableCell>{i.expected_name || '—'}</TableCell>
                    <TableCell>{i.acc_name || '—'}</TableCell>
                    <TableCell>
                      {i.acc_sts_code || '—'}
                      {i.acc_sts_desc && (
                        <Typography variant="caption" display="block" color="textSecondary">{i.acc_sts_desc}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{i.decision || t(`gepg.itemStatus.${i.status}`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={() => setViewing(null)}>{t('payloadPreview.close')}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default GepgSettingsPage;
