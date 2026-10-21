import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem,
  Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Typography,
} from '@material-ui/core';
import { formatMessage, formatMessageWithValues } from '@openimis/fe-core';

import { fetchGepgItems, resendGepgVerification } from '../actions';
import { MODULE_NAME, RIGHT_RUN_VERIFICATION } from '../constants';

const RESENDABLE = ['FAILED', 'REFUSED', 'REJECTED', 'EXPIRED'];
const DECISIONS = ['', 'VERIFIED', 'MANUAL', 'FAILED', 'NONE'];
const PAGE_SIZES = [50, 100, 500];
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
  const [sending, setSending] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [decision, setDecision] = useState('');
  useEffect(() => { if (!submitting) setSending(null); }, [submitting]);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 400);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (viewing) {
      dispatch(fetchGepgItems(viewing.acc_verif_id, { offset: page * pageSize, limit: pageSize, search: query, decision }));
    }
  }, [viewing, page, pageSize, query, decision]);
  const classes = { empty: emptyClassName };
  const items = state?.gepgItems || { total: 0, rows: [] };

  const view = (r) => {
    setPage(0);
    setSearch('');
    setQuery('');
    setDecision('');
    setViewing(r);
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
                      startIcon={sending === r.acc_verif_id ? <CircularProgress size={14} /> : null}
                      onClick={() => {
                        setSending(r.acc_verif_id);
                        dispatch(resendGepgVerification(r.acc_verif_id, t('gepg.mutation.resend')));
                      }}
                    >
                      {t(sending === r.acc_verif_id ? 'gepg.requests.sending' : 'gepg.requests.resend')}
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
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('gepg.items.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={8} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label={t('gepg.items.col.decision')}
                value={decision}
                onChange={(e) => { setDecision(e.target.value); setPage(0); }}
              >
                {DECISIONS.map((d) => (
                  <MenuItem key={d || 'all'} value={d}>{t(`gepg.items.decision.${d || 'ALL'}`)}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={4} sm={2}>
              {state?.fetchingGepgItems && <CircularProgress size={20} />}
            </Grid>
          </Grid>
          {!state?.fetchingGepgItems && items.rows.length === 0 ? (
            <Typography className={classes.empty}>{t('gepg.items.none')}</Typography>
          ) : (
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
                {items.rows.map((i) => (
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
          <TablePagination
            component="div"
            count={items.total}
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={PAGE_SIZES}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
          />
        </DialogContent>
        <DialogActions>
          <Button color="primary" onClick={() => setViewing(null)}>{t('payloadPreview.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default GepgRequestsTable;
