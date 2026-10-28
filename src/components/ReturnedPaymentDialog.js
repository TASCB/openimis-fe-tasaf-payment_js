import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { Button, TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import UndoIcon from '@material-ui/icons/Undo';
import { useModulesManager, useTranslations, formatDateFromISO } from '@openimis/fe-core';
import {
  PreviewDialog, PreviewField, PreviewSection, usePreviewStyles, PREVIEW_BORDER, PREVIEW_MUTED,
} from '@openimis/fe-tasaf_common';

import { MODULE_NAME, RETURN_RESOLUTION_COLORS, UNAPPLIED_ACTIONS } from '../constants';

const REPAY_STEPS = ['RETURNED', 'AWAITING_ACTION', 'REPAYING', 'REPAID'];
const CASE_STEPS = ['RETURNED', 'AWAITING_ACTION', 'IN_CORRECTION', 'REPAYING', 'REPAID'];
const NO_STEPS = ['LAPSED', 'UNAPPLIED_WITHDRAWN'];

const useStyles = makeStyles((theme) => ({
  identity: { alignItems: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 },
  tile: {
    width: 64, height: 64, borderRadius: 16, background: theme.palette.primary.main, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 32 },
  },
  steps: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 },
  step: {
    padding: '4px 10px', borderRadius: 14, fontSize: 12, border: `1px solid ${PREVIEW_BORDER}`, color: PREVIEW_MUTED,
  },
  reason: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  section: { marginTop: 20 },
  hint: { fontSize: 12.5, color: PREVIEW_MUTED, marginTop: 6 },
  error: { color: theme.palette.error.main, fontSize: 13, marginRight: 'auto' },
}));

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

  useEffect(() => { setNote(''); setError(null); setBusy(false); }, [item?.uuid]);

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

  const decide = async (action) => {
    setBusy(true);
    setError(null);
    const message = await onDecide(row, action, note.trim());
    setBusy(false);
    if (message) setError(message);
  };

  const aside = (
    <div className={classes.identity}>
      <div className={classes.tile}><UndoIcon /></div>
      <h2 className={p.heading}>{account.groupBeneficiary?.group?.code ?? '—'}</h2>
      <span className={p.code}>{account.accountName || row.payeeCode}</span>
      <div className={p.tags} style={{ justifyContent: 'center' }}>
        <span className={p.tag}>{formatMessage(`paylistItem.status.${row.status}`)}</span>
        {resolution && (
          <span className={p.statusTag} style={{ background: RETURN_RESOLUTION_COLORS[resolution], color: '#fff' }}>
            {formatMessage(`returned.resolution.${resolution}`)}
          </span>
        )}
      </div>
      <PreviewField label={formatMessage('paylistItem.amount')} value={row.amount} />
    </div>
  );

  return (
    <PreviewDialog
      open={!!item}
      onClose={onClose}
      title={formatMessage('returned.dialog.title')}
      closeLabel={formatMessage('review.close')}
      aside={aside}
      meta={row.returnedAt ? <span>{fmtDate(row.returnedAt)}</span> : null}
      actions={(
        <>
          {error && <span className={classes.error}>{error}</span>}
          {row.paylist?.uuid && (
            <Button color="primary" onClick={() => go(`/tasafPayment/paylist/${row.paylist.uuid}`)}>
              {formatMessage('returned.action.openPaylist')}
            </Button>
          )}
          {account.uuid && followUp && (
            <Button color="primary" onClick={() => go(`/caseManagement/accountCorrection/${account.uuid}`)}>
              {formatMessage('returned.action.openCorrection')}
            </Button>
          )}
          {canDecide && awaiting && (
            <>
              {UNAPPLIED_ACTIONS.slice().reverse().map((action) => {
                const primary = action === (row.suggestedAction || 'REPAY');
                return (
                  <Button
                    key={action}
                    color="primary"
                    variant={primary ? 'contained' : 'text'}
                    disableElevation
                    disabled={busy}
                    onClick={() => decide(action)}
                  >
                    {actionLabel(action)}
                  </Button>
                );
              })}
            </>
          )}
        </>
      )}
    >
      {reached >= 0 && (
        <div className={classes.steps}>
          {steps.map((step, index) => (
            <span
              key={step}
              className={classes.step}
              style={index <= reached ? { background: RETURN_RESOLUTION_COLORS[step] || '#6b7280', color: '#fff', borderColor: 'transparent' } : {}}
            >
              {formatMessage(`returned.resolution.${step}`)}
            </span>
          ))}
        </div>
      )}

      <PreviewSection label={formatMessage('returned.section.why')}>
        <div className={classes.reason}>{row.returnReason || '—'}</div>
        <div className={p.grid}>
          <PreviewField label={formatMessage('returnFeedback.reasonCode')} value={row.returnReasonCode} />
          <PreviewField label={formatMessage('paylist.museBatchReference')} value={row.paylist?.museBatchReference} />
          <PreviewField label={formatMessage('paylistItem.benefitCode')} value={row.benefitConsumption?.code} />
        </div>
      </PreviewSection>

      <div className={classes.section}>
        <PreviewSection label={formatMessage('returned.section.account')}>
          <div className={p.grid}>
            <PreviewField label={formatMessage('paylistItem.accountNumber')} value={account.accountNumber} />
            <PreviewField label={formatMessage('paylistItem.fspName')} value={account.fspName} />
            <PreviewField
              label={formatMessage('returned.verification')}
              value={account.verificationStatus != null
                ? formatMessage(`paymentAccount.verificationStatus.${verificationKey(account.verificationStatus)}`) : null}
            />
            <PreviewField
              label={formatMessage('returned.followUp')}
              value={followUp ? formatMessage(`returned.followUp.${followUp.status}`) : formatMessage('returned.followUp.none')}
            />
          </div>
        </PreviewSection>
      </div>

      {(decision || (canDecide && awaiting)) && (
        <div className={classes.section}>
          <PreviewSection label={formatMessage('returned.section.decision')}>
            {decision ? (
              <>
                <div className={classes.reason}>
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
                <div className={classes.hint} style={{ marginTop: 0, marginBottom: 10 }}>
                  {row.suggestedAction
                    ? formatMessageWithValues('returned.decision.suggested', { action: actionLabel(row.suggestedAction) })
                    : formatMessage('returned.decision.noSuggestion')}
                </div>
                <TextField
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={formatMessage('returned.decision.notePlaceholder')}
                  multiline
                  rows={2}
                  fullWidth
                  variant="outlined"
                  disabled={busy}
                />
                {UNAPPLIED_ACTIONS.map((action) => (
                  <div key={action} className={classes.hint}>
                    <strong>{actionLabel(action)}</strong>
                    {' — '}
                    {formatMessage(`returned.action.${action}.hint`)}
                  </div>
                ))}
              </>
            )}
          </PreviewSection>
        </div>
      )}

      <div className={classes.section}>
        <PreviewSection label={formatMessage('returned.section.repayment')}>
          <div className={p.grid}>
            <PreviewField
              label={formatMessage('returned.repaidOn')}
              value={repayment
                ? `${repayment.museBatchReference || repayment.paylistUuid.slice(0, 8)} · ${formatMessage(`paylistItem.status.${repayment.itemStatus}`)}`
                : (resolution ? formatMessage(`returned.resolution.${resolution}.hint`) : '—')}
            />
          </div>
          {repayment && (
            <Button size="small" color="primary" onClick={() => go(`/tasafPayment/paylist/${repayment.paylistUuid}`)}>
              {formatMessage('returned.action.openRepayment')}
            </Button>
          )}
        </PreviewSection>
      </div>
    </PreviewDialog>
  );
}

export default ReturnedPaymentDialog;
