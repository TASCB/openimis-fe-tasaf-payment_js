import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, Divider, IconButton, Paper, TextField, Typography,
} from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import { formatMessage, formatMessageWithValues, journalize } from '@openimis/fe-core';

import {
  fetchGepgSettings, fetchGepgChanges, saveGepgSettings, fetchGepgRequests,
  approveMuseChange, rejectMuseChange, cancelMuseChange,
} from '../actions';
import {
  MODULE_NAME, RIGHT_MUSE_SETTINGS_PROPOSE, RIGHT_MUSE_SETTINGS_APPROVE,
} from '../constants';
import {
  ChangeRequests, Notice, Section, useSettingsStyles,
} from '../components/settings/SettingsKit';
import GepgRequestsTable from '../components/GepgRequestsTable';

const EMPTY = { spCode: '', spSysId: '', serviceCode: '' };

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

  const [form, setForm] = useState(EMPTY);
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState({ provider: true, connection: true, changes: true, requests: true });
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
    setForm(s ? {
      spCode: s.spCode || '', spSysId: s.spSysId || '', serviceCode: s.serviceCode || '',
    } : EMPTY);
  }, [state?.gepgSettings]);

  const readiness = state?.gepgReadiness;
  const changes = state?.gepgChanges || [];
  const requests = state?.gepgRequests || [];
  const pending = changes.find((c) => c.status === 'PENDING');
  const editable = canPropose && !pending;
  const validField = {
    spCode: /^[A-Za-z0-9]{0,5}$/.test(form.spCode),
    spSysId: /^[A-Za-z0-9]{0,10}$/.test(form.spSysId),
    serviceCode: /^[A-Za-z0-9_-]{0,50}$/.test(form.serviceCode.trim()),
  };
  const valid = Object.values(validField).every(Boolean);

  const field = (k, max, { required = true, upper = true } = {}) => (
    <div>
      <div className={classes.label}>
        {t(`gepg.${k}`)}
        {required && <span className={classes.required}>*</span>}
      </div>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: upper ? e.target.value.toUpperCase() : e.target.value })}
        disabled={!editable}
        error={!validField[k]}
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

      <Section
        classes={classes}
        title={t('gepg.section.connection')}
        open={open.connection}
        onToggle={() => setOpen({ ...open, connection: !open.connection })}
      >
        <Typography variant="body2" className={classes.subtitle}>{t('gepg.connection.help')}</Typography>
        {field('serviceCode', 50, { required: false, upper: false })}
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
        <GepgRequestsTable requests={requests} emptyClassName={classes.empty} />
      </Section>

    </div>
  );
}

export default GepgSettingsPage;
