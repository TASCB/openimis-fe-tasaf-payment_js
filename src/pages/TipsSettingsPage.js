import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, Divider, IconButton, MenuItem, Paper, TextField, Typography,
} from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import SaveOutlinedIcon from '@material-ui/icons/SaveOutlined';
import {
  Table, formatMessage, formatMessageWithValues, journalize,
} from '@openimis/fe-core';

import {
  fetchTipsSettings, fetchTipsChanges, saveTipsSettings, fetchTipsRequests,
  cancelMuseChange,
} from '../actions';
import {
  MODULE_NAME, RIGHT_MUSE_SETTINGS_PROPOSE,
} from '../constants';
import {
  ChangeRequests, Notice, Section, useSettingsStyles,
} from '../components/settings/SettingsKit';
import TipsRequestsTable from '../components/TipsRequestsTable';

const ROUTES = ['GEPG', 'TIPS'];
const SUMMARY_TYPES = ['BANK', 'MSISDN', 'WALLET', 'ALIAS'];
const EMPTY = {
  sender: '', receiver: '', summaryIdentifierType: 'BANK',
  summaryIdentifier: '', summaryFspCode: '', verificationRoute: 'GEPG', fspCodes: {},
};
const SNAKE = {
  sender: 'sender', receiver: 'receiver', summaryIdentifierType: 'summary_identifier_type',
  summaryIdentifier: 'summary_identifier', summaryFspCode: 'summary_fsp_code',
  verificationRoute: 'verification_route', fspCodes: 'fsp_codes',
};
const RULES = {
  sender: /^[A-Za-z0-9]{0,20}$/,
  receiver: /^[A-Za-z0-9]{0,20}$/,
  summaryIdentifier: /^[A-Za-z0-9]{0,50}$/,
  summaryFspCode: /^(\d{3})?$/,
};
const FSP = /^(\d{3})?$/;

function TipsSettingsPage() {
  const intl = useIntl();
  const classes = useSettingsStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, values) => formatMessageWithValues(intl, MODULE_NAME, id, values);
  const state = useSelector((s) => s.tasafPayment);
  const rights = useSelector((s) => s.core?.user?.i_user?.rights ?? []);
  const canPropose = rights.includes(RIGHT_MUSE_SETTINGS_PROPOSE);

  const [form, setForm] = useState(EMPTY);
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState({
    route: true, party: true, summary: true, codes: true, changes: true, requests: true,
  });
  const submitting = state?.submittingMutation;
  const prevSubmitting = useRef();

  const reload = () => {
    dispatch(fetchTipsSettings());
    dispatch(fetchTipsChanges());
    dispatch(fetchTipsRequests());
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
    const s = state?.tipsSettings;
    setForm(s ? Object.fromEntries(Object.entries(SNAKE).map(([k, snake]) => [k, s[snake] ?? EMPTY[k]])) : EMPTY);
  }, [state?.tipsSettings]);

  const readiness = state?.tipsReadiness;
  const providers = [...(readiness?.providers || [])].sort((a, b) => (!a.accounts - !b.accounts)
    || a.fsp_code.localeCompare(b.fsp_code));
  const changes = state?.tipsChanges || [];
  const requests = state?.tipsRequests || [];
  const pending = changes.find((c) => c.status === 'PENDING');
  const editable = canPropose && !pending;
  const validField = Object.fromEntries(Object.entries(RULES).map(([k, re]) => [k, re.test((form[k] || '').trim())]));
  const valid = Object.values(validField).every(Boolean)
    && Object.values(form.fspCodes).every((c) => FSP.test(c || ''));
  const set = (k, v) => setForm({ ...form, [k]: v });

  const field = (k, max, { required = false, upper = true } = {}) => (
    <div>
      <div className={classes.label}>
        {t(`tips.${k}`)}
        {required && <span className={classes.required}>*</span>}
      </div>
      <TextField
        fullWidth
        variant="outlined"
        size="small"
        value={form[k]}
        onChange={(e) => set(k, upper ? e.target.value.toUpperCase() : e.target.value)}
        disabled={!editable}
        error={!validField[k]}
        placeholder={t(`tips.${k}.placeholder`)}
        inputProps={{ maxLength: max, style: { fontFamily: 'monospace' } }}
      />
    </div>
  );
  const select = (k, values) => (
    <div>
      <div className={classes.label}>{t(`tips.${k}`)}</div>
      <TextField
        select
        fullWidth
        variant="outlined"
        size="small"
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
        disabled={!editable}
      >
        {values.map((v) => <MenuItem key={v} value={v}>{t(`tips.${k}.${v}`)}</MenuItem>)}
      </TextField>
    </div>
  );

  return (
    <div>
      <Paper className={classes.paper}>
        <div className={classes.band}>
          <Typography>{t('tips.title')}</Typography>
        </div>
        <Divider />
        <Typography variant="body2" className={classes.subtitle}>{t('tips.help')}</Typography>
      </Paper>

      {readiness && !readiness.govesb_enabled && (
        <Notice tone="error" classes={classes}>{t('tips.notice.govesb')}</Notice>
      )}
      {readiness && readiness.govesb_enabled && !readiness.api_code_bulk_set && (
        <Notice tone="warning" classes={classes}>
          {tv('gepg.notice.apiCode', { topic: readiness.topics?.BULK })}
        </Notice>
      )}
      {readiness?.environment_mismatch && (
        <Notice tone="error" classes={classes}>
          {tv('museSettings.environmentMismatch', {
            approved: readiness.settings_environment || '—', server: readiness.server_environment || '—',
          })}
        </Notice>
      )}
      {!!readiness?.settings_missing?.length && (
        <Notice tone={readiness.route === 'TIPS' ? 'error' : 'warning'} classes={classes}>
          {tv('tips.notice.settings', {
            fields: readiness.settings_missing
              .map((f) => t(`tips.${Object.keys(SNAKE).find((k) => SNAKE[k] === f) || f}`)).join(', '),
          })}
        </Notice>
      )}
      {readiness?.route === 'TIPS' && !!readiness?.providers_missing?.length && (
        <Notice tone="warning" classes={classes}>
          {tv('tips.notice.codes', { fsps: readiness.providers_missing.join(', ') })}
        </Notice>
      )}
      {pending && (
        <Notice tone="warning" classes={classes}>
          {tv('museSettings.pendingBanner', { user: pending.requested_by })}
        </Notice>
      )}

      <Section
        classes={classes}
        title={t('tips.section.route')}
        open={open.route}
        onToggle={() => setOpen({ ...open, route: !open.route })}
      >
        {select('verificationRoute', ROUTES)}
      </Section>

      <Section
        classes={classes}
        title={t('tips.section.party')}
        open={open.party}
        onToggle={() => setOpen({ ...open, party: !open.party })}
      >
        {field('sender', 20, { required: true })}
        {field('receiver', 20, { required: true })}
      </Section>

      <Section
        classes={classes}
        title={t('tips.section.summary')}
        open={open.summary}
        onToggle={() => setOpen({ ...open, summary: !open.summary })}
      >
        {select('summaryIdentifierType', SUMMARY_TYPES)}
        {field('summaryIdentifier', 50, { required: true })}
        {field('summaryFspCode', 3, { required: true })}
      </Section>

      <Section
        classes={classes}
        title={t('tips.section.codes')}
        open={open.codes}
        onToggle={() => setOpen({ ...open, codes: !open.codes })}
        bodyClass={classes.changes}
      >
        {providers.length === 0 ? (
          <Typography className={classes.empty}>{t('tips.codes.none')}</Typography>
        ) : (
          <Table
            size="small"
            module={MODULE_NAME}
            headers={['gepg.requests.col.fsp', 'gepg.requests.col.accounts', 'tips.codes.col.code']}
            aligns={['left', 'right', 'left']}
            itemFormatters={[
              (p) => (
                <>
                  {p.fsp_code}
                  {p.bank_name && (
                    <Typography variant="caption" display="block" color="textSecondary">{p.bank_name}</Typography>
                  )}
                </>
              ),
              (p) => p.accounts,
              (p) => (
                <TextField
                  size="small"
                  variant="outlined"
                  value={form.fspCodes[p.fsp_code] || ''}
                  onChange={(e) => set('fspCodes', { ...form.fspCodes, [p.fsp_code]: e.target.value.trim() })}
                  disabled={!editable}
                  error={!FSP.test(form.fspCodes[p.fsp_code] || '')}
                  placeholder="e.g. 016"
                  inputProps={{ maxLength: 3, style: { fontFamily: 'monospace', width: 60 } }}
                />
              ),
            ]}
            items={providers}
            itemIdentifier={(p) => p.fsp_code}
          />
        )}
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
            onClick={() => dispatch(saveTipsSettings(form, t('tips.mutation.save'), reason))}
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
        submitting={submitting}
        onCancel={(c) => dispatch(cancelMuseChange(c.id, t('tips.mutation.cancel')))}
      />

      <Section
        classes={classes}
        title={t('tips.requests.title')}
        open={open.requests}
        onToggle={() => setOpen({ ...open, requests: !open.requests })}
        bodyClass={classes.changes}
        action={(
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); dispatch(fetchTipsRequests()); }}
            title={t('gepg.requests.refresh')}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
      >
        <TipsRequestsTable requests={requests} emptyClassName={classes.empty} />
      </Section>
    </div>
  );
}

export default TipsSettingsPage;
