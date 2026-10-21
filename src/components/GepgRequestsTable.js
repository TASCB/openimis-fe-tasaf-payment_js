import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@material-ui/core';
import { formatMessage, formatMessageWithValues } from '@openimis/fe-core';

import { fetchGepgItems, resendGepgVerification } from '../actions';
import { MODULE_NAME, RIGHT_RUN_VERIFICATION } from '../constants';

const RESENDABLE = ['FAILED', 'REFUSED', 'REJECTED', 'EXPIRED'];
const when = (v) => (v ? v.slice(0, 16).replace('T', ' ') : '—');

function GepgRequestsTable({ requests, emptyClassName }) {
  const intl = useIntl();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, values) => formatMessageWithValues(intl, MODULE_NAME, id, values);
  const state = useSelector((s) => s.tasafPayment);
  const rights = useSelector((s) => s.core?.user?.i_user?.rights ?? []);
  const canResend = rights.includes(RIGHT_RUN_VERIFICATION);
  const submitting = state?.submittingMutation;
  const [viewing, setViewing] = useState(null);
  const classes = { empty: emptyClassName };

  const view = (r) => {
    setViewing(r);
    dispatch(fetchGepgItems(r.acc_verif_id));
  };

  return (
    <>
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
                <TableCell style={{ fontFamily: 'monospace' }}>
                  {r.acc_verif_id}
                  {r.esb_request_id && (
                    <Typography variant="caption" display="block" color="textSecondary">
                      {tv('gepg.requests.esbRequestId', { id: r.esb_request_id })}
                    </Typography>
                  )}
                </TableCell>
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
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {viewing && tv('gepg.items.title', { id: viewing.acc_verif_id })}
          {viewing?.esb_request_id && (
            <Typography variant="body2" color="textSecondary" style={{ fontFamily: 'monospace' }}>
              {tv('gepg.requests.esbRequestId', { id: viewing.esb_request_id })}
            </Typography>
          )}
        </DialogTitle>
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
    </>
  );
}

export default GepgRequestsTable;
