import React, { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useIntl } from 'react-intl';
import { useModulesManager, useTranslations } from '@openimis/fe-core';
import { MODULE_NAME } from '../constants';

const useStyles = makeStyles((theme) => ({
  line: { marginBottom: theme.spacing(1) },
  ok: { color: theme.palette.success.main, fontWeight: 600 },
  bad: { color: theme.palette.error.main, fontWeight: 600 },
  section: { marginTop: theme.spacing(2), marginBottom: theme.spacing(1), fontWeight: 600 },
  json: {
    fontFamily: 'monospace',
    fontSize: 12,
    whiteSpace: 'pre',
    overflow: 'auto',
    maxHeight: '45vh',
    padding: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 4,
    background: theme.palette.background.paper,
  },
}));

export default function MusePayloadDialog({
  open, onClose, preview, fetching, error,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const ruleText = (row) => {
    const key = [`rule.${row.rule}.${row.field}`, `rule.${row.rule}`]
      .map((k) => `${MODULE_NAME}.musePreview.${k}`)
      .find((k) => !!intl.messages[k]);
    return key ? intl.formatMessage({ id: key }) : row.message;
  };
  const json = preview ? JSON.stringify(preview.body, null, 2) : '';

  const copy = () => {
    try {
      navigator.clipboard.writeText(json).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } catch (e) { /* clipboard unavailable on an insecure origin */ }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{formatMessage('musePreview.title')}</DialogTitle>
      <DialogContent>
        {fetching && <LinearProgress />}
        {!!error && (
          <Typography color="error">
            {formatMessage(error.detail || error.message || String(error))}
          </Typography>
        )}
        {preview && (
          <>
            <Typography variant="body2" className={classes.line}>
              {formatMessageWithValues('musePreview.help', { rows: preview.rows_shown })}
            </Typography>
            <Typography variant="body2" className={`${classes.line} ${preview.govesb_enabled ? classes.ok : classes.bad}`}>
              {preview.govesb_enabled
                ? formatMessageWithValues('musePreview.enabled', { url: preview.esb_url || '—' })
                : formatMessage('musePreview.disabled')}
            </Typography>
            <Typography variant="body2" className={classes.line}>
              {formatMessageWithValues('musePreview.summary', {
                msgId: preview.msg_id,
                referenceNo: preview.reference_no,
                attempt: preview.attempt,
                payments: preview.payments,
                topic: preview.topic,
                apiCode: preview.api_code_mapped
                  ? preview.api_code
                  : formatMessage('musePreview.apiCodeUnmapped'),
              })}
            </Typography>
            <Typography variant="body2" className={preview.valid ? classes.ok : classes.bad}>
              {preview.valid
                ? formatMessage('musePreview.valid')
                : formatMessageWithValues('musePreview.invalid', { count: preview.problem_count })}
            </Typography>

            {!preview.valid && (
              <>
                <Typography variant="body2" className={classes.section}>
                  {formatMessage('musePreview.problems')}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{formatMessage('musePreview.col.field')}</TableCell>
                      <TableCell>{formatMessage('musePreview.col.rule')}</TableCell>
                      <TableCell align="right">{formatMessage('musePreview.col.count')}</TableCell>
                      <TableCell>{formatMessage('musePreview.col.example')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(preview.problem_summary || []).map((row) => {
                      const example = (preview.problems || []).find(
                        (p) => p.section === row.section && p.field === row.field && p.rule === row.rule,
                      );
                      return (
                        <TableRow key={`${row.section}.${row.field}.${row.rule}`}>
                          <TableCell>{`${row.section}.${row.field}`}</TableCell>
                          <TableCell>{ruleText(row)}</TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                          <TableCell>
                            {example && example.value !== null && example.value !== undefined
                              ? String(example.value) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}

            <Typography variant="body2" className={classes.section}>
              {formatMessage('musePreview.message')}
            </Typography>
            <div className={classes.json}>{json}</div>
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
