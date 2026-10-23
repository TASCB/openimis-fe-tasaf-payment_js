import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { Button, Link, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import { formatMessage, formatMessageWithValues } from '@openimis/fe-core';
import {
  ImportDialog, FileDrop, ChoiceList, StatRow,
} from '@openimis/fe-tasaf_common';
import { importWithdrawalCharges } from '../../actions';
import { MODULE_NAME } from '../../constants';

const COLUMNS = ['EPAYMENT_CODE', 'LOWER_AMOUNT', 'UPPER_AMOUNT', 'WITHDRAWAL'];
const ADD = 'ADD';
const REPLACE = 'REPLACE';

const code = (v) => (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const isNumber = (v) => v !== '' && !Number.isNaN(Number(v));
const formatSize = (bytes) => (bytes >= 1024 * 1024
  ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

async function inspect(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) return { file, error: 'notCsv' };
  const text = (await file.text()).replace(/^﻿/, '');
  const lines = text.split(/\r?\n/);
  const header = (lines[0] || '').split(',').map((c) => c.trim().replace(/^"|"$/g, '').toUpperCase());
  const missing = COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { file, missing };
  const at = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)]));
  const perFsp = {};
  const problems = [];
  lines.slice(1).forEach((line, i) => {
    if (!line.trim()) return;
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const fsp = code(cells[at.EPAYMENT_CODE]);
    const lo = cells[at.LOWER_AMOUNT] ?? '';
    const hi = cells[at.UPPER_AMOUNT] ?? '';
    const wd = cells[at.WITHDRAWAL] ?? '';
    let problem = null;
    if (!fsp) problem = 'code';
    else if (lo === '' || hi === '') problem = 'blank';
    else if (!isNumber(lo) || !isNumber(hi) || (wd !== '' && !isNumber(wd))) problem = 'number';
    else if (Number(lo) > Number(hi)) problem = 'order';
    if (problem) problems.push({ line: i + 2, problem });
    else perFsp[fsp] = (perFsp[fsp] || 0) + 1;
  });
  return {
    file, text, perFsp, problems, rows: Object.values(perFsp).reduce((a, b) => a + b, 0),
  };
}

function downloadTemplate() {
  const blob = new Blob([`${COLUMNS.join(',')}\nMPESA,0,10000,300\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'withdrawal_charges_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const useStyles = makeStyles((theme) => ({
  link: { cursor: 'pointer' },
  row: { display: 'flex', justifyContent: 'space-between', padding: theme.spacing(0.5, 0) },
  unknown: { color: theme.palette.error.main, marginLeft: theme.spacing(0.75) },
}));

function ChargesImportDialog({ onClose }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const intl = useIntl();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, v) => formatMessageWithValues(intl, MODULE_NAME, id, v);
  const providers = useSelector((s) => s.tasafPayment?.fspProviders ?? []);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState(ADD);

  const pick = async (file) => { if (file) setResult(await inspect(file)); };
  const bad = !!result && (!!result.error || !!result.missing?.length || !result.rows || !!result.problems?.length);
  const known = new Set(providers.map((p) => p.fspCode));

  let blocker = null;
  if (!result) blocker = t('chargesImport.hint.file');
  else if (bad) blocker = t('chargesImport.hint.fix');
  const problems = result?.problems?.length ? (
    <Alert severity="error">
      {tv('chargesImport.preview.skipped', { n: result.problems.length })}
      {result.problems.slice(0, 5).map((p) => (
        <div key={p.line}>{tv(`chargesImport.problem.${p.problem}`, { line: p.line })}</div>
      ))}
    </Alert>
  ) : null;

  let meta = null;
  if (result?.error) meta = t('chargesImport.file.notCsv');
  else if (result?.missing?.length) meta = tv('chargesImport.file.missing', { columns: result.missing.join(', ') });
  else if (result && !result.rows) meta = t('chargesImport.file.empty');
  else if (result) {
    meta = tv('chargesImport.file.meta', {
      rows: result.rows, fsps: Object.keys(result.perFsp).length, size: formatSize(result.file.size),
    });
  }

  const runImport = () => {
    dispatch(importWithdrawalCharges(result.text, mode === REPLACE, t('charges.mutation.import')));
    onClose();
  };

  return (
    <ImportDialog
      title={t('chargesImport.title')}
      step={t(step === 1 ? 'chargesImport.step1' : 'chargesImport.step2')}
      onClose={onClose}
      hint={step === 1 ? blocker : null}
      actions={(
        <>
          <Button variant="outlined" onClick={step === 1 ? onClose : () => setStep(1)}>
            {t(step === 1 ? 'cancel' : 'chargesImport.back')}
          </Button>
          {step === 1 ? (
            <Button color="primary" variant="contained" disableElevation disabled={!!blocker} onClick={() => setStep(2)}>
              {t('chargesImport.preview')}
            </Button>
          ) : (
            <Button color="primary" variant="contained" disableElevation onClick={runImport}>
              {t('chargesImport.run')}
            </Button>
          )}
        </>
      )}
    >
      {step === 1 && (
        <>
          <div>
            <Typography color="primary" gutterBottom>{t('chargesImport.file')}</Typography>
            <FileDrop
              file={result?.file}
              meta={meta}
              bad={bad}
              dropText={t('chargesImport.drop')}
              browseText={t('chargesImport.browse')}
              onPick={pick}
              onRemove={() => setResult(null)}
            />
            <Typography variant="caption">
              <Link className={classes.link} onClick={downloadTemplate}>{t('chargesImport.template')}</Link>
            </Typography>
          </div>
          {problems}
          <ChoiceList
            value={mode}
            onChange={setMode}
            options={[ADD, REPLACE].map((value) => ({
              value, title: t(`chargesImport.mode.${value}`), sub: t(`chargesImport.mode.${value}.sub`),
            }))}
          />
        </>
      )}

      {step === 2 && (
        <>
          <StatRow
            stats={[
              { label: t('chargesImport.preview.bands'), value: result.rows },
              { label: t('chargesImport.preview.problems'), value: result.problems.length },
              { label: t('chargesImport.preview.fsps'), value: Object.keys(result.perFsp).length },
            ]}
          />
          <div>
            {Object.entries(result.perFsp).sort().map(([fsp, n]) => (
              <Typography key={fsp} variant="body2" className={classes.row}>
                <span>
                  {fsp}
                  {!known.has(fsp) && <span className={classes.unknown}>{t('chargesImport.preview.unknown')}</span>}
                </span>
                <span>{tv('chargesImport.preview.bandsOf', { n })}</span>
              </Typography>
            ))}
          </div>
          {mode === REPLACE && <Alert severity="warning">{t('chargesImport.preview.replace')}</Alert>}
          <Alert severity="info">{t('chargesImport.preview.approval')}</Alert>
        </>
      )}
    </ImportDialog>
  );
}

export default ChargesImportDialog;
