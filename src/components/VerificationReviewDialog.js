import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { Button, TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import VerifiedUserOutlined from '@material-ui/icons/VerifiedUserOutlined';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import { useModulesManager, useTranslations, formatDateFromISO } from '@openimis/fe-core';
import {
  PreviewDialog, PreviewField, PreviewSection, usePreviewStyles, PREVIEW_BORDER, PREVIEW_MUTED, PREVIEW_PANEL,
} from '@openimis/fe-tasaf_common';

import { MODULE_NAME } from '../constants';
import { matchReasonText } from '../utils/verification';

const useStyles = makeStyles((theme) => ({
  identity: { alignItems: 'center', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 },
  tile: {
    width: 64, height: 64, borderRadius: 16, background: theme.palette.primary.main, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 32 },
  },
  names: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 },
  nameBox: {
    padding: '12px 14px', borderRadius: 10, background: PREVIEW_PANEL, border: `1px solid ${PREVIEW_BORDER}`,
  },
  nameLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: PREVIEW_MUTED },
  nameValue: { fontSize: 17, fontWeight: 700, marginTop: 4, wordBreak: 'break-word' },
  attempts: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  cell: { padding: '6px 8px', borderBottom: `1px solid ${PREVIEW_BORDER}`, textAlign: 'left', verticalAlign: 'top' },
  error: { color: theme.palette.error.main, fontSize: 13, marginRight: 'auto' },
}));

function VerificationReviewDialog({ account, onClose, onDecide, canDecide }) {
  const p = usePreviewStyles();
  const classes = useStyles();
  const intl = useIntl();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setNotes(''); setError(null); setBusy(false); }, [account?.uuid]);

  const a = account || {};
  const attempts = a.verificationAttempts || [];
  const latest = attempts[0] || {};
  const fmtDate = (v) => (v ? formatDateFromISO(modulesManager, intl, v) : null);
  const reason = matchReasonText(latest, formatMessage, formatMessageWithValues) || a.lastFailureReason;

  const decide = async (approved) => {
    setBusy(true);
    setError(null);
    const message = await onDecide(a, approved, notes.trim());
    setBusy(false);
    if (message) setError(message);
  };

  const aside = (
    <div className={classes.identity}>
      <div className={classes.tile}><VerifiedUserOutlined /></div>
      <h2 className={p.heading}>{a.accountNumber}</h2>
      <span className={p.code}>{a.fspName}</span>
      <div className={p.tags} style={{ justifyContent: 'center' }}>
        {a.fspType && <span className={p.tag}>{formatMessage(`paymentAccount.fspType.${a.fspType}`)}</span>}
        <span className={p.statusTag}>{formatMessage('verificationResults.tab.review')}</span>
      </div>
      <PreviewField label={formatMessage('review.household')} value={a.groupBeneficiary?.group?.code} />
    </div>
  );

  return (
    <PreviewDialog
      open={!!account}
      onClose={onClose}
      title={formatMessage('review.title')}
      closeLabel={formatMessage('review.close')}
      aside={aside}
      meta={latest.receivedAt
        ? <span>{formatMessageWithValues('review.receivedAt', { date: fmtDate(latest.receivedAt) })}</span>
        : null}
      actions={(
        <>
          {error && <span className={classes.error}>{error}</span>}
          <Button onClick={onClose} color="primary" disabled={busy}>{formatMessage('review.close')}</Button>
          {canDecide && (
            <>
              <Button onClick={() => decide(false)} color="primary" disabled={busy}>
                {formatMessage('button.reject')}
              </Button>
              <Button
                onClick={() => decide(true)}
                color="primary"
                variant="contained"
                disableElevation
                disabled={busy}
                startIcon={<CheckCircleIcon />}
              >
                {formatMessage('button.confirmMatch')}
              </Button>
            </>
          )}
        </>
      )}
    >
      <div className={classes.names}>
        <div className={classes.nameBox}>
          <div className={classes.nameLabel}>{formatMessage('review.expectedName')}</div>
          <div className={classes.nameValue}>{latest.expectedName || a.recipientName || '—'}</div>
        </div>
        <div className={classes.nameBox}>
          <div className={classes.nameLabel}>{formatMessage('review.returnedName')}</div>
          <div className={classes.nameValue}>{latest.returnedName || '—'}</div>
        </div>
      </div>
      <div className={p.grid}>
        <PreviewField
          label={formatMessage('review.score')}
          value={latest.matchScore != null ? `${latest.matchScore}%` : null}
        />
        <PreviewField label={formatMessage('review.reason')} value={reason} />
      </div>

      {attempts.length > 1 && (
        <div style={{ marginTop: 22 }}>
          <PreviewSection label={formatMessage('review.history')}>
            <table className={classes.attempts}>
              <tbody>
                {attempts.slice(1).map((t) => (
                  <tr key={t.receivedAt}>
                    <td className={classes.cell}>{fmtDate(t.receivedAt)}</td>
                    <td className={classes.cell}>{t.result}</td>
                    <td className={classes.cell}>{t.returnedName || '—'}</td>
                    <td className={classes.cell}>{t.matchScore != null ? `${t.matchScore}%` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PreviewSection>
        </div>
      )}

      {canDecide && (
        <div style={{ marginTop: 22 }}>
          <PreviewSection label={formatMessage('review.decision')}>
            <TextField
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={formatMessage('review.notesPlaceholder')}
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              disabled={busy}
            />
            <div style={{ fontSize: 12.5, color: PREVIEW_MUTED, marginTop: 6 }}>
              {formatMessage('review.decisionHint')}
            </div>
          </PreviewSection>
        </div>
      )}
    </PreviewDialog>
  );
}

export default VerificationReviewDialog;
