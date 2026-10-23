import React, { useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import {
  Table, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { MODULE_NAME } from '../../constants';
import { cycleUuid } from './cycleUuid';

const PARTS = ['base', 'disability', 'health', 'primary', 'secondary'];

const useStyles = makeStyles((theme) => ({
  band: { ...theme.table.title, padding: theme.spacing(1, 2), marginTop: theme.spacing(3) },
  label: { color: theme.palette.text.secondary },
  bold: { fontWeight: 600 },
  warning: { color: theme.palette.error.main },
  findings: { margin: theme.spacing(1, 0, 0), paddingLeft: theme.spacing(3) },
}));

const money = (v) => (v == null ? '-' : v.toLocaleString(undefined, { maximumFractionDigits: 0 }));

function PreAuditHousehold({
  paymentWindow, groupId, hhid, onClose,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const uuid = cycleUuid(paymentWindow);
  const [picked, setPicked] = useState(null);

  const { isLoading, data, error } = useGraphqlQuery(
    `query PreAuditHousehold($id: UUID!, $groupId: UUID, $hhid: String) {
      preAuditHousehold(paymentCycleId: $id, groupId: $groupId, hhid: $hhid)
    }`,
    { id: uuid, groupId: groupId || null, hhid: picked || hhid || null },
    { skip: !uuid },
  );
  const raw = data?.preAuditHousehold;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const matches = parsed?.matches;
  const hh = matches ? null : parsed;

  const t = (key) => formatMessage(`preAudit.household.${key}`);
  const yes = (v) => (v ? formatMessage('preAudit.household.yes') : '');
  const partLabel = (p) => formatMessage(`preAudit.compliance.part.${p}`);
  const reasons = (list) => list.map(partLabel).join(', ');

  const findings = [];
  (hh?.payments || []).forEach((p) => {
    if (p.status !== 'MATCH') {
      findings.push(formatMessageWithValues('preAudit.household.finding.compliance', {
        payroll: p.payroll, status: formatMessage(`preAudit.compliance.status.${p.status}`), amount: money(p.variance),
      }));
    }
    if (p.recheck?.status === 'CHANGED') {
      findings.push(formatMessageWithValues('preAudit.household.finding.changed', {
        payroll: p.payroll, parts: reasons(p.recheck.changed), amount: money(p.recheck.total),
      }));
    }
  });
  (hh?.duplicates || []).forEach((d) => findings.push(formatMessageWithValues('preAudit.household.finding.duplicate', {
    kind: formatMessage(`preAudit.duplicates.kind.${d.kind}`), key: d.key,
  })));
  if (hh && !hh.account) findings.push(t('finding.noAccount'));
  if ((hh?.members || []).some((m) => !m.active)) findings.push(t('finding.inactive'));

  const field = (label, value) => (
    <Grid item xs={12} sm={4}>
      <Typography variant="caption" className={classes.label}>{label}</Typography>
      <Typography>{value || '-'}</Typography>
    </Grid>
  );

  const paymentTable = (p) => {
    const recorded = Object.fromEntries((p.parts || []).map((r) => [r.part, r.recorded]));
    const rows = PARTS.map((part) => ({
      label: partLabel(part),
      recorded: recorded[part],
      expected: (p.parts || []).find((r) => r.part === part)?.expected,
      today: p.recheck?.parts?.[part],
      changed: p.recheck?.changed?.includes(part),
    }));
    rows.push({
      label: partLabel('cap_cut'), expected: p.cap_cut == null ? null : -p.cap_cut,
      today: p.recheck?.cap_cut == null ? null : -p.recheck.cap_cut,
    });
    rows.push({ label: partLabel('penalties'), expected: p.penalties == null ? null : -p.penalties });
    rows.push({
      label: partLabel('expected'), expected: p.expected, today: p.recheck?.total, bold: true,
    });
    rows.push({ label: t('paid'), recorded: p.amount, bold: true });
    const cell = (r, v) => <span className={r.changed ? classes.warning : (r.bold ? classes.bold : '')}>{money(v)}</span>;
    return (
      <Table
        module={MODULE_NAME}
        headers={[t('col.part'), t('col.recorded'), t('col.expected'), t('col.today')]}
        aligns={['left', 'right', 'right', 'right']}
        itemFormatters={[
          (r) => <span className={r.bold ? classes.bold : ''}>{r.label}</span>,
          (r) => cell(r, r.recorded),
          (r) => cell(r, r.expected),
          (r) => cell(r, r.today),
        ]}
        items={rows}
        withPagination={false}
      />
    );
  };

  let body;
  if (error) body = <Typography color="error">{t('error')}</Typography>;
  else if (isLoading || raw === undefined) body = <CircularProgress />;
  else if (matches) {
    body = (
      <>
        <Typography gutterBottom>{t(parsed.more ? 'manyMatches' : 'severalMatches')}</Typography>
        {matches.map((code) => (
          <Button key={code} color="primary" onClick={() => setPicked(code)}>{code}</Button>
        ))}
      </>
    );
  } else if (!hh) body = <Typography>{t('notFound')}</Typography>;
  else {
    const account = hh.account;
    body = (
      <>
        <Grid container spacing={2}>
          {field(t('head'), hh.head)}
          {field(t('location'), hh.location)}
          {field(t('referenceDate'), hh.reference_date)}
          {field(t('account'), account && `${account.fsp_name} ${account.account_number}`)}
          {field(t('accountName'), account?.account_name)}
          {field(t('accountStatus'), account && `${account.verification} / ${account.pre_audit}`)}
        </Grid>

        <div className={classes.band}><Typography variant="h6">{t('findings')}</Typography></div>
        {findings.length
          ? <ul className={classes.findings}>{findings.map((f) => <li key={f}><Typography>{f}</Typography></li>)}</ul>
          : <Typography>{t('noFindings')}</Typography>}

        {(hh.payments || []).map((p) => (
          <React.Fragment key={p.benefit_id}>
            <div className={classes.band}>
              <Typography variant="h6">
                {formatMessageWithValues('preAudit.household.payment', {
                  payroll: p.payroll, code: p.benefit_code, status: formatMessage(`preAudit.compliance.status.${p.status}`),
                })}
              </Typography>
            </div>
            {paymentTable(p)}
          </React.Fragment>
        ))}
        <Typography variant="caption" className={classes.label}>{t('todayNote')}</Typography>

        <div className={classes.band}><Typography variant="h6">{t('members')}</Typography></div>
        <Table
          module={MODULE_NAME}
          headers={[t('col.name'), t('col.role'), t('col.dob'), t('col.age'), t('col.active'),
            t('col.child'), t('col.disabled'), t('col.primary'), t('col.secondary')]}
          aligns={['left', 'left', 'left', 'right', 'left', 'left', 'left', 'right', 'right']}
          itemFormatters={[
            (m) => m.name,
            (m) => m.role || '-',
            (m) => m.dob || '-',
            (m) => (m.age ?? '-'),
            (m) => (m.active ? yes(true) : <span className={classes.warning}>{t('no')}</span>),
            (m) => yes(m.child),
            (m) => yes(m.disabled),
            (m) => (m.primary ?? ''),
            (m) => (m.secondary ?? ''),
          ]}
          items={hh.members || []}
          withPagination={false}
        />

        <div className={classes.band}><Typography variant="h6">{t('history')}</Typography></div>
        <Table
          module={MODULE_NAME}
          headers={[t('col.window'), t('col.payroll'), t('col.payrollStatus'), t('col.code'),
            t('col.amount'), t('col.paylistStatus')]}
          aligns={['left', 'left', 'left', 'left', 'right', 'left']}
          itemFormatters={[
            (r) => r.cycle || '-',
            (r) => r.payroll || '-',
            (r) => r.payroll_status || '-',
            (r) => r.benefit_code,
            (r) => money(r.amount),
            (r) => r.paylist_status || '-',
          ]}
          items={hh.history || []}
          withPagination={false}
        />
      </>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{formatMessageWithValues('preAudit.household.title', { hhid: hh?.hhid || picked || hhid || '' })}</DialogTitle>
      <DialogContent>{body}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">{formatMessage('verificationOutcome.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default PreAuditHousehold;
