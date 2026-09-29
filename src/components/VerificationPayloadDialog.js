import React, { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import { MODULE_NAME } from '../constants';

const useStyles = makeStyles((theme) => ({
  line: { marginBottom: theme.spacing(1) },
  enabled: { color: theme.palette.success.main, fontWeight: 600 },
  disabled: { color: theme.palette.error.main, fontWeight: 600 },
  json: {
    fontFamily: 'monospace',
    fontSize: 12,
    whiteSpace: 'pre',
    overflow: 'auto',
    maxHeight: '55vh',
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 4,
    background: theme.palette.background.paper,
  },
}));

// Prints what "Verify all matching" would publish to GovESB, so a test can confirm the
// payload before anything is sent. Read-only.
export default function VerificationPayloadDialog({
  open, onClose, preview, fetching, error, sampleRows,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [copied, setCopied] = useState(false);
  const json = preview ? JSON.stringify(preview, null, 2) : '';

  const copy = () => {
    try {
      navigator.clipboard.writeText(json).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } catch (e) { /* clipboard unavailable (insecure origin) — the JSON is still selectable */ }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{formatMessage('payloadPreview.title')}</DialogTitle>
      <DialogContent>
        {fetching && <LinearProgress />}
        {!!error && <Typography color="error">{error.detail || error.message || String(error)}</Typography>}
        {preview && (
          <>
            <Typography variant="body2" className={classes.line}>
              {formatMessageWithValues('payloadPreview.help', { rows: sampleRows })}
            </Typography>
            <Typography
              variant="body2"
              className={`${classes.line} ${preview.govesb_enabled ? classes.enabled : classes.disabled}`}
            >
              {preview.govesb_enabled
                ? formatMessageWithValues('payloadPreview.enabled', { url: preview.esb_url || '—' })
                : formatMessage('payloadPreview.disabled')}
            </Typography>
            <Typography variant="body2" className={classes.line}>
              {formatMessageWithValues('payloadPreview.summary', {
                topic: preview.topic,
                apiCode: preview.api_code || '—',
                requestType: preview.request_type,
                accounts: preview.accounts,
                messages: (preview.messages || []).length,
                maxRows: preview.max_rows_per_message,
              })}
            </Typography>
            {(preview.messages || []).length === 0
              ? <Typography variant="body2">{formatMessage('payloadPreview.none')}</Typography>
              : <div className={classes.json}>{json}</div>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button color="primary" onClick={copy} disabled={!preview}>
          {formatMessage(copied ? 'payloadPreview.copied' : 'payloadPreview.copy')}
        </Button>
        <Button color="primary" variant="contained" onClick={onClose}>
          {formatMessage('payloadPreview.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
