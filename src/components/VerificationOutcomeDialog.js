import React from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { useModulesManager, useTranslations } from '@openimis/fe-core';

import { MODULE_NAME } from '../constants';

const useStyles = makeStyles((theme) => ({
  row: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing(4), padding: theme.spacing(0.5, 0) },
  value: { fontWeight: 500 },
  error: { color: theme.palette.error.main, marginTop: theme.spacing(1) },
  note: { marginTop: theme.spacing(2) },
}));

function VerificationOutcomeDialog({ outcome, onClose, onOpenRequests }) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  if (!outcome) return null;

  const queued = !!outcome.queued && outcome.count == null;
  const row = (key, value, values = {}) => (
    <div className={classes.row} key={key}>
      <Typography>{formatMessageWithValues(`verificationOutcome.${key}`, values)}</Typography>
      <Typography className={classes.value}>{value ?? 0}</Typography>
    </div>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {formatMessage(outcome.count || queued ? 'verificationOutcome.title' : 'verificationOutcome.titleNothing')}
      </DialogTitle>
      <DialogContent>
        {queued ? (
          <Typography>{formatMessage('verificationOutcome.queued')}</Typography>
        ) : (
          <>
            {row('sent', outcome.count, { requests: outcome.batches ?? 0 })}
            {!!outcome.refused && row('refused', outcome.refused, { requests: outcome.refused_batches ?? 0 })}
            {!!outcome.withdrawn && row('withdrawn', outcome.withdrawn)}
            {!!outcome.skipped && row('skipped', outcome.skipped)}
            {!!outcome.error && (
              <Typography variant="body2" className={classes.error}>{outcome.error}</Typography>
            )}
          </>
        )}
        <Typography variant="body2" color="textSecondary" className={classes.note}>
          {formatMessage('verificationOutcome.note')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onOpenRequests} color="primary">{formatMessage('verificationOutcome.openRequests')}</Button>
        <Button onClick={onClose} color="primary" variant="contained">{formatMessage('verificationOutcome.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default VerificationOutcomeDialog;
