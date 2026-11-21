import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField, Typography,
} from '@material-ui/core';
import { Table, formatMessage, formatMessageWithValues } from '@openimis/fe-core';

import { fetchTipsItems, releaseTipsLookup, resendTipsLookup } from '../actions';
import { MODULE_NAME, RIGHT_RUN_VERIFICATION } from '../constants';

const RESENDABLE = ['FAILED', 'REFUSED', 'EXPIRED'];
const RELEASABLE = ['SENDING', 'SENT', 'ACCEPTED'];
const DECISIONS = ['VERIFIED', 'MANUAL', 'FAILED', 'UNCHECKED'];
const PAGE_SIZES = [50, 100, 500];
const when = (v) => (v ? v.slice(0, 16).replace('T', ' ') : '—');
const mono = { fontFamily: 'monospace' };
const caption = (text) => (text
  ? <Typography variant="caption" display="block" color="textSecondary">{text}</Typography> : null);

function TipsRequestsTable({ requests, emptyClassName }) {
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
  useEffect(() => { if (!submitting) setSending(null); }, [submitting]);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 400);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (viewing) dispatch(fetchTipsItems(viewing.msg_id, { offset: page * pageSize, limit: pageSize, search: query }));
  }, [viewing, page, pageSize, query]);
  const items = state?.tipsItems || { total: 0, rows: [] };

  const view = (r) => {
    setPage(0);
    setSearch('');
    setQuery('');
    setViewing(r);
  };
  const decision = (i) => (DECISIONS.includes(i.decision) ? t(`gepg.items.decision.${i.decision}`)
    : i.decision || t(`gepg.itemStatus.${i.status}`));

  return (
    <>
      {requests.length === 0 ? (
        <Typography className={emptyClassName}>{t('tips.requests.none')}</Typography>
      ) : (
        <Table
          size="small"
          module={MODULE_NAME}
          headers={['tips.requests.col.id', 'gepg.requests.col.fsp', 'gepg.requests.col.accounts',
            'gepg.requests.col.results', 'gepg.requests.col.status', 'gepg.requests.col.sent',
            'gepg.requests.col.answered', '']}
          aligns={['left', 'left', 'right', 'left', 'left', 'left', 'left', 'right']}
          itemFormatters={[
            (r) => (
              <>
                <span style={mono}>{r.msg_id}</span>
                {caption(t(`tips.kind.${r.kind}`))}
                {r.esb_request_id && caption(tv('gepg.requests.esbRequestId', { id: r.esb_request_id }))}
              </>
            ),
            (r) => (
              <>
                {r.fsp_code}
                {caption(tv('tips.requests.tipsCode', { code: r.tips_code }))}
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
                {t(`tips.status.${r.status}`)}
                {caption(r.status_desc)}
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
                {canResend && RESENDABLE.includes(r.status) && (
                  <Button
                    size="small"
                    color="primary"
                    disabled={submitting}
                    startIcon={sending === r.msg_id ? <CircularProgress size={14} /> : null}
                    onClick={() => {
                      setSending(r.msg_id);
                      dispatch(resendTipsLookup(r.msg_id, t('tips.mutation.resend')));
                    }}
                  >
                    {t(sending === r.msg_id ? 'gepg.requests.sending' : 'gepg.requests.resend')}
                  </Button>
                )}
                {canResend && RELEASABLE.includes(r.status) && (
                  <Button size="small" disabled={submitting} onClick={() => setReleasing(r)}>
                    {t('gepg.requests.release')}
                  </Button>
                )}
              </div>
            ),
          ]}
          items={requests}
          itemIdentifier={(r) => r.msg_id}
        />
      )}
      <Dialog open={!!releasing} onClose={() => setReleasing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{releasing && tv('gepg.release.title', { id: releasing.msg_id })}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {releasing && tv('tips.release.body', { count: releasing.item_count, fsp: releasing.fsp_code })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleasing(null)}>{t('gepg.release.cancel')}</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              setSending(releasing.msg_id);
              dispatch(releaseTipsLookup(releasing.msg_id, tv('tips.mutation.release', { id: releasing.msg_id })));
              setReleasing(null);
            }}
          >
            {t('gepg.requests.release')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!viewing} onClose={() => setViewing(null)} maxWidth="lg" fullWidth>
        <DialogTitle>{viewing && tv('gepg.items.title', { id: viewing.msg_id })}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={10} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('gepg.items.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={2}>{state?.fetchingTipsItems && <CircularProgress size={20} />}</Grid>
          </Grid>
          {!state?.fetchingTipsItems && items.rows.length === 0 ? (
            <Typography className={emptyClassName}>{t('gepg.items.none')}</Typography>
          ) : (
            <Table
              size="small"
              module={MODULE_NAME}
              fetching={state?.fetchingTipsItems}
              headers={['gepg.items.col.hhid', 'gepg.items.col.account', 'gepg.items.col.expected',
                'gepg.items.col.returned', 'tips.items.col.code', 'gepg.items.col.decision']}
              itemFormatters={[
                (i) => i.hhid || '—',
                (i) => (
                  <>
                    <span style={mono}>{i.identifier}</span>
                    {caption(i.identifier_type)}
                  </>
                ),
                (i) => i.expected_name || '—',
                (i) => i.full_name || '—',
                (i) => (
                  <>
                    {i.error_code || '—'}
                    {caption(i.error_description)}
                  </>
                ),
                decision,
              ]}
              items={items.rows}
              itemIdentifier={(i) => `${i.identifier}-${i.fsp_code}`}
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
          <Button color="primary" onClick={() => setViewing(null)}>{t('payloadPreview.close')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TipsRequestsTable;
