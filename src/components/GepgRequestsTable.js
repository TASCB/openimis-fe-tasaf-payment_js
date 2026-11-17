import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField,
  Typography,
} from '@material-ui/core';
import {
  Table, downloadExport, formatMessage, formatMessageWithValues,
} from '@openimis/fe-core';

import {
  exportGepgItems, fetchGepgItems, releaseGepgVerification, resendGepgVerification,
} from '../actions';
import { MODULE_NAME, RIGHT_RUN_VERIFICATION } from '../constants';

const RESENDABLE = ['FAILED', 'REFUSED', 'REJECTED', 'EXPIRED'];
const RELEASABLE = ['SENDING', 'SENT', 'ACCEPTED'];
const DECISIONS = ['', 'VERIFIED', 'MANUAL', 'FAILED', 'UNCHECKED', 'NONE'];
const PAGE_SIZES = [50, 100, 500];
const when = (v) => (v ? v.slice(0, 16).replace('T', ' ') : '—');
const mono = { fontFamily: 'monospace' };
const caption = (text) => (text
  ? <Typography variant="caption" display="block" color="textSecondary">{text}</Typography> : null);

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
  const [releasing, setReleasing] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [decision, setDecision] = useState('');
  const [exporting, setExporting] = useState(null);
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

  const exportCsv = async (accVerifId, filters = {}) => {
    setExporting(accVerifId);
    const response = await dispatch(exportGepgItems(accVerifId, filters));
    setExporting(null);
    const name = response?.payload?.data?.gepgVerificationItemsExport;
    if (name) dispatch(downloadExport(name, `${accVerifId}-accounts.csv`, 'csv'));
  };

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
        <Table
          size="small"
          module={MODULE_NAME}
          headers={['gepg.requests.col.id', 'gepg.requests.col.fsp', 'gepg.requests.col.accounts',
            'gepg.requests.col.results', 'gepg.requests.col.status', 'gepg.requests.col.sent',
            'gepg.requests.col.answered', '']}
          aligns={['left', 'left', 'right', 'left', 'left', 'left', 'left', 'right']}
          itemFormatters={[
            (r) => (
              <>
                <span style={mono}>{r.acc_verif_id}</span>
                {r.esb_request_id && caption(tv('gepg.requests.esbRequestId', { id: r.esb_request_id }))}
              </>
            ),
            (r) => (
              <>
                {r.fsp_code}
                {caption(r.bic)}
              </>
            ),
            (r) => r.item_count,
            (r) => (r.answered
              ? tv(r.unchecked ? 'gepg.requests.resultsUnchecked' : 'gepg.requests.results', {
                verified: r.verified, manual: r.manual, failed: r.failed, unchecked: r.unchecked,
              })
              : '—'),
            (r) => (
              <>
                {t(`gepg.status.${r.status}`)}
                {r.status_desc && caption(`${r.status_code ? `${r.status_code} ` : ''}${r.status_desc}`)}
              </>
            ),
            (r) => (
              <>
                {when(r.sent_at)}
                {caption(r.requested_by)}
              </>
            ),
            (r) => when(r.answered_at),
            (r) => (
              <div style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                <Button size="small" onClick={() => view(r)}>{t('gepg.requests.view')}</Button>
                {!!r.item_count && (
                  <Button
                    size="small"
                    disabled={exporting === r.acc_verif_id}
                    onClick={() => exportCsv(r.acc_verif_id)}
                  >
                    {t('gepg.requests.export')}
                  </Button>
                )}
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
                {canResend && RELEASABLE.includes(r.status) && (
                  <Button
                    size="small"
                    disabled={submitting}
                    startIcon={sending === r.acc_verif_id ? <CircularProgress size={14} /> : null}
                    onClick={() => setReleasing(r)}
                  >
                    {t('gepg.requests.release')}
                  </Button>
                )}
              </div>
            ),
          ]}
          items={requests}
          itemIdentifier={(r) => r.acc_verif_id}
        />
      )}
      <Dialog open={!!releasing} onClose={() => setReleasing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{releasing && tv('gepg.release.title', { id: releasing.acc_verif_id })}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" paragraph>
            {releasing && tv('gepg.release.body', { count: releasing.item_count, fsp: releasing.fsp_code })}
          </Typography>
          <Typography variant="body2" color="textSecondary">{t('gepg.release.late')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleasing(null)}>{t('gepg.release.cancel')}</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              setSending(releasing.acc_verif_id);
              dispatch(releaseGepgVerification(releasing.acc_verif_id,
                tv('gepg.mutation.release', { id: releasing.acc_verif_id })));
              setReleasing(null);
            }}
          >
            {t('gepg.requests.release')}
          </Button>
        </DialogActions>
      </Dialog>
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
            <Table
              size="small"
              module={MODULE_NAME}
              fetching={state?.fetchingGepgItems}
              headers={['gepg.items.col.item', 'gepg.items.col.hhid', 'gepg.items.col.account',
                'gepg.items.col.expected', 'gepg.items.col.returned', 'gepg.items.col.code',
                'gepg.items.col.decision']}
              itemFormatters={[
                (i) => i.item_id,
                (i) => i.hhid || '—',
                (i) => <span style={mono}>{i.acc_num}</span>,
                (i) => i.expected_name || '—',
                (i) => i.acc_name || '—',
                (i) => (
                  <>
                    {i.acc_sts_code || '—'}
                    {caption(i.acc_sts_desc)}
                  </>
                ),
                (i) => (DECISIONS.includes(i.decision) && i.decision && t(`gepg.items.decision.${i.decision}`))
                  || i.decision || t(`gepg.itemStatus.${i.status}`),
              ]}
              items={items.rows}
              itemIdentifier={(i) => i.item_id}
              withPagination
              count={items.total}
              page={page}
              pageSize={pageSize}
              rowsPerPageOptions={PAGE_SIZES}
              onChangePage={(_, p) => setPage(p)}
              onChangeRowsPerPage={(size) => { setPageSize(Number(size)); setPage(0); }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            disabled={!items.total || exporting === viewing?.acc_verif_id}
            onClick={() => exportCsv(viewing.acc_verif_id, { search: query, decision })}
          >
            {t('gepg.items.export')}
          </Button>
          <Button color="primary" onClick={() => setViewing(null)}>{t('payloadPreview.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default GepgRequestsTable;
