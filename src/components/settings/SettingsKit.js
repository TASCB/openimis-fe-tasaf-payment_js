import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Button, Collapse, Divider, Paper, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { Table, formatMessage, formatMessageWithValues } from '@openimis/fe-core';

import { MODULE_NAME } from '../../constants';

export const useSettingsStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  band: {
    ...theme.table.title, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing(1),
  },
  toggle: { cursor: 'pointer', userSelect: 'none' },
  subtitle: { padding: theme.spacing(1.5, 2), color: theme.palette.text.secondary },
  notice: { display: 'flex', alignItems: 'center', gap: theme.spacing(1), padding: theme.spacing(1.5, 2) },
  noticeWarn: { color: theme.palette.warning.dark },
  noticeError: { color: theme.palette.error.main },
  sectionBody: {
    padding: theme.spacing(2), display: 'grid', gap: theme.spacing(2, 3),
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  },
  full: { gridColumn: '1 / -1' },
  label: { fontWeight: 500, fontSize: '0.875rem', marginBottom: theme.spacing(0.75), color: theme.palette.text.primary },
  required: { color: theme.palette.error.main, marginLeft: 2 },
  payer: {
    display: 'grid', gap: theme.spacing(1.5), alignItems: 'center',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
  },
  glRow: {
    display: 'grid', gap: theme.spacing(1.5), alignItems: 'center', marginBottom: theme.spacing(1),
    gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr) minmax(0, 1.5fr) auto',
    [theme.breakpoints.down('xs')]: { gridTemplateColumns: '1fr' },
  },
  footer: {
    padding: theme.spacing(2), display: 'flex', alignItems: 'center', gap: theme.spacing(2), flexWrap: 'wrap',
  },
  footerNote: { color: theme.palette.text.secondary, fontSize: '0.85rem' },
  changes: { overflowX: 'auto' },
  diff: { fontSize: '0.8rem', whiteSpace: 'nowrap' },
  before: { color: theme.palette.grey[600], textDecoration: 'line-through', marginRight: theme.spacing(0.5) },
  status: { fontWeight: 600, fontSize: '0.8rem' },
  statusPENDING: { color: theme.palette.warning.dark },
  statusAPPROVED: { color: theme.palette.success.dark },
  statusREJECTED: { color: theme.palette.error.dark },
  statusCANCELLED: { color: theme.palette.grey[600] },
  empty: { padding: theme.spacing(2), color: theme.palette.grey[600] },
}));

export const FIELD_KEYS = {
  institution_code: 'institutionCode', payer_account: 'payerAccount', sub_budget_class: 'subBudgetClass',
  unapplied_sub_budget_class: 'unappliedSubBudgetClass', payment_desc: 'paymentDesc', is_stp: 'isStp',
  gl_accounts: 'glAccounts', bank_name: 'bankName', fsp_type: 'fspType', bic: 'bic',
  sp_code: 'spCode', sp_sys_id: 'spSysId', service_code: 'serviceCode',
  sender: 'sender', receiver: 'receiver', summary_identifier_type: 'summaryIdentifierType',
  summary_identifier: 'summaryIdentifier', summary_fsp_code: 'summaryFspCode',
  fsp_codes: 'fspCodes', verification_route: 'verificationRoute', mobile_prefixes: 'mobilePrefixes',
};

const VALUE_LABELS = {
  summary_identifier_type: 'tips.summaryIdentifierType', verification_route: 'tips.verificationRoute',
};

const show = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.map((g) => (typeof g === 'string' ? g : g.glaccount)).join(', ') : '—';
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  if (typeof v === 'object') {
    const entries = Object.entries(v).sort(([a], [b]) => a.localeCompare(b));
    return entries.length ? entries.map(([k, code]) => `${k}: ${code}`).join(', ') : '—';
  }
  return String(v);
};

const showField = (change, side, f, t) => {
  const v = (change[side] || {})[f];
  return VALUE_LABELS[f] && v ? t(`${VALUE_LABELS[f]}.${v}`) : show(v);
};

export function Section({
  title, open, onToggle, children, classes, bodyClass, action,
}) {
  return (
    <Paper className={classes.paper}>
      <div
        className={`${classes.band} ${classes.toggle}`}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        role="button"
        tabIndex={0}
      >
        <Typography>{title}</Typography>
        <span>
          {action}
          {open ? <ExpandLessIcon color="action" /> : <ExpandMoreIcon color="action" />}
        </span>
      </div>
      <Divider />
      <Collapse in={open}>
        <div className={bodyClass || classes.sectionBody}>{children}</div>
      </Collapse>
    </Paper>
  );
}

export function Notice({ tone, children, classes }) {
  return (
    <Paper className={classes.paper}>
      <Typography className={`${classes.notice} ${tone === 'error' ? classes.noticeError : classes.noticeWarn}`}>
        <ErrorOutlineIcon fontSize="small" />
        {children}
      </Typography>
    </Paper>
  );
}

const kindLabel = (c, t, tv) => {
  if (['FSP_PROFILE', 'FSP_CHARGES', 'FSP_NAMES'].includes(c.kind)) return tv(`museChanges.kind.${c.kind}`, { code: c.fsp_code });
  return t(`museChanges.kind.${c.kind}`);
};

const amount = (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
const bandText = (b) => `${amount(b.lower_amount)}–${amount(b.upper_amount)}: ${amount(b.withdrawal)}`;

const LIST_CHANGES = { FSP_CHARGES: ['bands', bandText], FSP_NAMES: ['names', (n) => n] };

function ListDiff({ change, classes }) {
  const [field, text] = LIST_CHANGES[change.kind];
  const before = ((change.current || {})[field] || []).map(text);
  const after = ((change.proposed || {})[field] || []).map(text);
  return (
    <>
      {before.filter((b) => !after.includes(b)).map((b) => (
        <div key={`-${b}`} className={classes.diff}><span className={classes.before}>{b}</span></div>
      ))}
      {after.filter((b) => !before.includes(b)).map((b) => (
        <div key={`+${b}`} className={classes.diff}>{b}</div>
      ))}
    </>
  );
}

export function ChangeRequests({
  changes, open, onToggle, submitting, onCancel, classes,
}) {
  const intl = useIntl();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, values) => formatMessageWithValues(intl, MODULE_NAME, id, values);
  const history = useHistory();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const lastPage = Math.max(0, Math.ceil(changes.length / pageSize) - 1);
  const shownPage = Math.min(page, lastPage);
  const pageItems = changes.slice(shownPage * pageSize, (shownPage + 1) * pageSize);

  return (
    <>
      <Section
        classes={classes}
        title={tv('museChanges.title', { count: changes.filter((c) => c.status === 'PENDING').length })}
        open={open}
        onToggle={onToggle}
        bodyClass={classes.changes}
      >
        {changes.length === 0 ? (
          <Typography className={classes.empty}>{t('museChanges.none')}</Typography>
        ) : (
          <Table
            size="small"
            module={MODULE_NAME}
            headers={['museChanges.col.what', 'museChanges.col.changes', 'museChanges.col.requested',
              'museChanges.col.status', 'museChanges.col.decided', '']}
            itemFormatters={[
              (c) => kindLabel(c, t, tv),
              (c) => (
                <>
                  {LIST_CHANGES[c.kind] && <ListDiff change={c} classes={classes} />}
                  {!LIST_CHANGES[c.kind] && (c.changed || []).map((f) => (
                    <div key={f} className={classes.diff}>
                      <b>{t(`museChanges.field.${FIELD_KEYS[f] || f}`)}</b>
                      {': '}
                      <span className={classes.before}>{showField(c, 'current', f, t)}</span>
                      {showField(c, 'proposed', f, t)}
                    </div>
                  ))}
                  {c.reason && (
                    <Typography variant="caption" display="block" color="textSecondary">
                      {tv('museChanges.reason', { reason: c.reason })}
                    </Typography>
                  )}
                </>
              ),
              (c) => (
                <>
                  {c.requested_by}
                  <Typography variant="caption" display="block" color="textSecondary">
                    {(c.requested_at || '').slice(0, 16).replace('T', ' ')}
                  </Typography>
                </>
              ),
              (c) => (
                <Typography className={`${classes.status} ${classes[`status${c.status}`]}`}>
                  {t(`museChanges.status.${c.status}`)}
                </Typography>
              ),
              (c) => (
                <>
                  {c.decided_by || '—'}
                  {c.comment && (
                    <Typography variant="caption" display="block" color="textSecondary">{c.comment}</Typography>
                  )}
                </>
              ),
              (c) => (
                <div style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {c.approval_request_id && (
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => history.push(`/approval/request/${c.approval_request_id}`)}
                    >
                      {t(c.status === 'PENDING' ? 'museChanges.openApproval' : 'museChanges.viewApproval')}
                    </Button>
                  )}
                  {c.can_cancel && (
                    <Button size="small" disabled={submitting} onClick={() => onCancel(c)}>
                      {t('museChanges.cancel')}
                    </Button>
                  )}
                </div>
              ),
            ]}
            items={pageItems}
            itemIdentifier={(c) => c.id}
            withPagination
            page={shownPage}
            pageSize={pageSize}
            count={changes.length}
            rowsPerPageOptions={[10, 20, 50]}
            onChangePage={(event, next) => setPage(next)}
            onChangeRowsPerPage={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        )}
      </Section>
    </>
  );
}
