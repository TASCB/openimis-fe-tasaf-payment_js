import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import {
  Button, Divider, Link, TextField, Tooltip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { useModulesManager, useTranslations, formatDateFromISO } from '@openimis/fe-core';
import {
  PreviewDialog, PreviewField, PreviewSection, usePreviewStyles, PREVIEW_INK, PREVIEW_MUTED,
} from '@openimis/fe-tasaf_common';

import { MODULE_NAME, UNAPPLIED_ACTIONS } from '../constants';

const REPAY_STEPS = ['RETURNED', 'AWAITING_ACTION', 'REPAYING', 'REPAID'];
const CASE_STEPS = ['RETURNED', 'AWAITING_ACTION', 'IN_CORRECTION', 'REPAYING', 'REPAID'];
const NO_STEPS = ['LAPSED', 'UNAPPLIED_WITHDRAWN'];
const HINTED = ['IN_CORRECTION', 'REPAYING', 'REPAID', 'LAPSED', 'UNAPPLIED_WITHDRAWN'];

const useStyles = makeStyles((theme) => ({
  identity: { display: 'flex', flexDirection: 'column', gap: 16 },
  payee: { display: 'flex', flexDirection: 'column', gap: 4 },
  amount: { fontSize: 24, fontWeight: 800, color: PREVIEW_INK, lineHeight: 1.2 },
  waiting: { fontSize: 15, fontWeight: 700, color: theme.palette.warning?.dark || '#b45309' },
  facts: { display: 'flex', flexDirection: 'column', gap: 14 },
  steps: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20, fontSize: 13,
  },
  step: { color: PREVIEW_MUTED },
  stepCurrent: { color: PREVIEW_INK, fontWeight: 700 },
  stepSep: { color: PREVIEW_MUTED },
  reason: { fontSize: 15, fontWeight: 600, marginBottom: 12, color: theme.palette.error.main },
  decisionTaken: { fontSize: 15, fontWeight: 600, marginBottom: 4, color: PREVIEW_INK },
  section: { marginTop: 20 },
  hint: { fontSize: 12.5, color: PREVIEW_MUTED, marginTop: 6 },
  error: { color: theme.palette.error.main, fontSize: 13 },
  confirm: { color: PREVIEW_INK, fontSize: 13.5, fontWeight: 600 },
}));

const money = (v) => (v == null || v === '' ? null : `TZS ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

const parse = (value) => (typeof value === 'string' ? JSON.parse(value || 'null') : value);

export const verificationKey = (status) => String(status ?? '').replace(/^A_/, '');

function ReturnedPaymentDialog({ item, onClose, canDecide, onDecide }) {
  const p = usePreviewStyles();
  const classes = useStyles();
  const intl = useIntl();
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [noteError, setNoteError] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const noteRef = useRef(null);

  useEffect(() => {
    setNote(''); setError(null); setBusy(false); setNoteError(false); setConfirming(null);
  }, [item?.uuid]);

  const row = item || {};
  const account = row.paymentAccount || {};
  const resolution = row.resolution;
  const repayment = parse(row.repayment);
  const followUp = parse(row.followUp);
  const decision = parse(row.unappliedDecision);
  const withdrawalSent = parse(row.museWithdrawal);
  const awaiting = resolution === 'AWAITING_ACTION';
  const fmtDate = (v) => (v ? formatDateFromISO(modulesManager, intl, v) : null);
  const steps = decision?.action === 'CASE' || (!decision && followUp) ? CASE_STEPS : REPAY_STEPS;
  const reached = NO_STEPS.includes(resolution) ? -1 : steps.indexOf(resolution);
  const go = (path) => { onClose(); history.push(path); };
  const actionLabel = (action) => formatMessage(`returned.action.${action}`);

  const send = async (action) => {
    setBusy(true);
    setError(null);
    const message = await onDecide(row, action, note.trim());
    setBusy(false);
    setConfirming(null);
    if (message) setError(message);
  };

  const decide = (action) => {
    const noteNeeded = action === 'WITHDRAW' || (row.suggestedAction && action !== row.suggestedAction);
    if (noteNeeded && !note.trim()) {
      setNoteError(true);
      noteRef.current?.focus();
      return;
    }
    if (action === 'WITHDRAW') setConfirming(action);
    else send(action);
  };

  const daysWaiting = awaiting && row.returnedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(row.returnedAt).getTime()) / 86400000))
    : null;

  const aside = (
    <div className={classes.identity}>
      <div className={classes.payee}>
        <h2 className={p.heading}>{account.accountName || row.payeeCode || '—'}</h2>
        <span className={p.code}>{account.groupBeneficiary?.group?.code ?? '—'}</span>
        {reached < 0 && resolution && <span className={p.sub}>{formatMessage(`returned.resolution.${resolution}`)}</span>}
      </div>
      <Divider />
      <div className={classes.facts}>
        <div>
          <div className={p.label}>{formatMessage('paylistItem.amount')}</div>
          <div className={classes.amount}>{money(row.amount) || '—'}</div>
        </div>
        {row.returnedAt && (
          <div>
            {daysWaiting != null && (
              <div className={classes.waiting}>
                {formatMessageWithValues('returned.daysWaitingValue', { days: daysWaiting })}
              </div>
            )}
            <div className={p.sub}>{formatMessageWithValues('returned.receivedOn', { date: fmtDate(row.returnedAt) })}</div>
          </div>
        )}
      </div>
      <Divider />
      <div className={classes.facts}>
        <PreviewField label={formatMessage('paylistItem.accountNumber')} value={account.accountNumber} />
        <PreviewField label={formatMessage('returned.provider')} value={account.fspName} />
        <PreviewField
          label={formatMessage('returned.verification')}
          value={account.verificationStatus != null
            ? formatMessage(`paymentAccount.verificationStatus.${verificationKey(account.verificationStatus)}`) : null}
        />
        {followUp && (
          <PreviewField
            label={formatMessage('returned.followUp')}
            value={account.uuid ? (
              <Link component="button" onClick={() => go(`/caseManagement/accountCorrection/${account.uuid}`)}>
                {formatMessage(`returned.followUp.${followUp.status}`)}
              </Link>
            ) : formatMessage(`returned.followUp.${followUp.status}`)}
          />
        )}
      </div>
    </div>
  );

  const deciding = canDecide && awaiting && !decision;
  const meta = (confirming && <span className={classes.confirm}>{formatMessage(`returned.decision.confirm.${confirming}`)}</span>)
    || (error && <span className={classes.error}>{error}</span>);
  const actions = deciding && (confirming ? (
    <>
      <Button onClick={() => setConfirming(null)} disabled={busy}>
        {formatMessage('returned.decision.confirm.cancel')}
      </Button>
      <Button color="primary" variant="contained" disableElevation disabled={busy} onClick={() => send(confirming)}>
        {actionLabel(confirming)}
      </Button>
    </>
  ) : UNAPPLIED_ACTIONS.slice().reverse().map((action) => (
    <Tooltip key={action} title={formatMessage(`returned.action.${action}.hint`)} arrow>
      <span>
        <Button
          color="primary"
          variant={action === (row.suggestedAction || 'REPAY') ? 'contained' : 'text'}
          disableElevation
          disabled={busy}
          onClick={() => decide(action)}
        >
          {actionLabel(action)}
        </Button>
      </span>
    </Tooltip>
  )));

  return (
    <PreviewDialog
      open={!!item}
      onClose={onClose}
      title={formatMessage('returned.dialog.title')}
      closeLabel={formatMessage('review.close')}
      aside={aside}
      meta={meta || null}
      actions={actions || null}
    >
      {reached >= 0 && (
        <div className={classes.steps}>
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              {index > 0 && <span className={classes.stepSep}>›</span>}
              <span className={index === reached ? classes.stepCurrent : classes.step}>
                {formatMessage(`returned.resolution.${step}`)}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      <PreviewSection label={formatMessage('returned.section.why')}>
        <div className={classes.reason}>{row.returnReason || '—'}</div>
        <div className={p.grid}>
          <PreviewField label={formatMessage('returnFeedback.reasonCode')} value={row.returnReasonCode} />
          <PreviewField
            label={formatMessage('paylist.museBatchReference')}
            value={row.paylist?.uuid && row.paylist?.museBatchReference ? (
              <Link component="button" onClick={() => go(`/tasafPayment/paylist/${row.paylist.uuid}`)}>
                {row.paylist.museBatchReference}
              </Link>
            ) : row.paylist?.museBatchReference}
          />
          <PreviewField label={formatMessage('returned.benefitCode')} value={row.benefitConsumption?.code} />
          {row.status === 'UNAPPLIED' && (
            <PreviewField label={formatMessage('returned.timesReturned')} value={row.timesReturned} />
          )}
        </div>
      </PreviewSection>

      {(decision || deciding) && (
        <div className={classes.section}>
          <PreviewSection label={formatMessage('returned.section.decision')}>
            {decision ? (
              <>
                <div className={classes.decisionTaken}>
                  {formatMessageWithValues('returned.decision.taken', {
                    action: actionLabel(decision.action), by: decision.by, date: fmtDate(decision.at),
                  })}
                </div>
                {decision.auto === 'PROVIDER_CHANGED' && (
                  <div className={classes.hint}>
                    {formatMessageWithValues('returned.decision.providerChanged', { provider: decision.new_provider || '—' })}
                  </div>
                )}
                {decision.note && <div className={classes.hint}>{decision.note}</div>}
                {decision.action === 'WITHDRAW' && (
                  <div className={p.grid} style={{ marginTop: 10 }}>
                    <PreviewField
                      label={formatMessage('returned.withdrawal.label')}
                      value={withdrawalSent?.status
                        ? formatMessageWithValues(`returned.withdrawal.${withdrawalSent.status}`, {
                          date: fmtDate(withdrawalSent.answered_at || withdrawalSent.sent_at),
                          desc: withdrawalSent.status_desc || '—',
                        })
                        : formatMessage('returned.withdrawal.none')}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={classes.hint} style={{ marginTop: 0, marginBottom: 12 }}>
                  {row.suggestedAction
                    ? formatMessageWithValues('returned.decision.suggested', { action: actionLabel(row.suggestedAction) })
                    : formatMessage('returned.decision.noSuggestion')}
                </div>
                <TextField
                  label={formatMessage('returned.decision.note')}
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setNoteError(false); }}
                  helperText={formatMessage(noteError ? 'returned.decision.noteRequired' : 'returned.decision.noteHelp')}
                  error={noteError}
                  inputRef={noteRef}
                  multiline
                  rows={2}
                  fullWidth
                  variant="outlined"
                  disabled={busy}
                />
              </>
            )}
          </PreviewSection>
        </div>
      )}

      {(repayment || HINTED.includes(resolution)) && (
        <div className={classes.section}>
          <PreviewSection label={formatMessage('returned.section.repayment')}>
            {repayment ? (
              <>
                <div className={p.grid}>
                  <PreviewField
                    label={formatMessage('returned.repaidOn')}
                    value={`${repayment.museBatchReference || repayment.paylistUuid.slice(0, 8)} · ${formatMessage(`paylistItem.status.${repayment.itemStatus}`)}`}
                  />
                </div>
                <Button size="small" color="primary" onClick={() => go(`/tasafPayment/paylist/${repayment.paylistUuid}`)}>
                  {formatMessage('returned.action.openRepayment')}
                </Button>
              </>
            ) : <div className={p.text}>{formatMessage(`returned.resolution.${resolution}.hint`)}</div>}
          </PreviewSection>
        </div>
      )}
    </PreviewDialog>
  );
}

export default ReturnedPaymentDialog;
