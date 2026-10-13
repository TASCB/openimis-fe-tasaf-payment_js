import React from 'react';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';
import { Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import UndoIcon from '@material-ui/icons/Undo';
import { useModulesManager, useTranslations, formatDateFromISO } from '@openimis/fe-core';
import {
  PreviewDialog, PreviewField, PreviewSection, usePreviewStyles, PREVIEW_BORDER, PREVIEW_MUTED,
} from '@openimis/fe-tasaf_common';

import { MODULE_NAME, RETURN_RESOLUTION_COLORS } from '../constants';

const STEPS = ['RETURNED', 'IN_CORRECTION', 'READY', 'REPAYING', 'REPAID'];

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
}));

export const verificationKey = (status) => String(status ?? '').replace(/^A_/, '');

function ReturnedPaymentDialog({ item, onClose }) {
  const p = usePreviewStyles();
  const classes = useStyles();
  const intl = useIntl();
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);

  const row = item || {};
  const account = row.paymentAccount || {};
  const resolution = row.resolution;
  const repayment = typeof row.repayment === 'string' ? JSON.parse(row.repayment || 'null') : row.repayment;
  const followUp = typeof row.followUp === 'string' ? JSON.parse(row.followUp || 'null') : row.followUp;
  const fmtDate = (v) => (v ? formatDateFromISO(modulesManager, intl, v) : null);
  const reached = resolution === 'LAPSED' || resolution === 'FINAL' ? -1 : STEPS.indexOf(resolution);
  const go = (path) => { onClose(); history.push(path); };

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
          {row.paylist?.uuid && (
            <Button color="primary" onClick={() => go(`/tasafPayment/paylist/${row.paylist.uuid}`)}>
              {formatMessage('returned.action.openPaylist')}
            </Button>
          )}
          {account.uuid && resolution !== 'FINAL' && (
            <Button color="primary" onClick={() => go(`/caseManagement/accountCorrection/${account.uuid}`)}>
              {formatMessage('returned.action.openCorrection')}
            </Button>
          )}
          <Button color="primary" variant="contained" disableElevation onClick={onClose}>
            {formatMessage('review.close')}
          </Button>
        </>
      )}
    >
      {reached >= 0 && (
        <div className={classes.steps}>
          {STEPS.map((step, index) => (
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

      <div className={classes.section}>
        <PreviewSection label={formatMessage('returned.section.repayment')}>
          <div className={p.grid}>
            <PreviewField
              label={formatMessage('returned.repaidOn')}
              value={repayment
                ? `${repayment.museBatchReference || repayment.paylistUuid.slice(0, 8)} · ${formatMessage(`paylistItem.status.${repayment.itemStatus}`)}`
                : formatMessage(`returned.resolution.${resolution || 'FINAL'}.hint`)}
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
