import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, Dialog, IconButton, Link, Radio, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Alert from '@material-ui/lab/Alert';
import CloseIcon from '@material-ui/icons/Close';
import CloudUploadOutlined from '@material-ui/icons/CloudUploadOutlined';
import DeleteOutline from '@material-ui/icons/DeleteOutline';
import ErrorOutline from '@material-ui/icons/ErrorOutline';
import InfoOutlined from '@material-ui/icons/InfoOutlined';
import InsertDriveFileOutlined from '@material-ui/icons/InsertDriveFileOutlined';
import { formatMessage, formatMessageWithValues } from '@openimis/fe-core';
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

const useStyles = makeStyles((theme) => {
  const teal = theme.palette.primary.main;
  const border = '#d9e2de';
  return {
    paper: { borderRadius: 14, overflow: 'hidden' },
    head: {
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: theme.spacing(2, 2, 1.5, 3), borderBottom: `1px solid ${border}`,
    },
    title: { fontSize: 20, fontWeight: 500 },
    step: { fontSize: 13, color: theme.palette.text.secondary },
    body: { padding: theme.spacing(2, 3), display: 'flex', flexDirection: 'column', gap: theme.spacing(2) },
    label: { fontSize: 14, color: teal, marginBottom: 6 },
    drop: {
      border: `1.5px dashed ${border}`, borderRadius: 6, padding: theme.spacing(2.5, 2), textAlign: 'center',
      cursor: 'pointer', '&:hover': { borderColor: teal, background: '#f6faf8' },
    },
    dropOver: { borderColor: teal, background: '#eef5f2' },
    dropIcon: { fontSize: 30, color: teal },
    dropText: { fontSize: 14.5 },
    browse: { color: teal, textDecoration: 'underline', fontWeight: 500 },
    fileCard: {
      display: 'flex', alignItems: 'center', gap: theme.spacing(1.5), padding: theme.spacing(1.25, 1.5),
      border: `1px solid ${border}`, borderRadius: 6,
    },
    fileBad: { borderColor: theme.palette.error.main },
    fileIcon: { color: teal },
    fileIconBad: { color: theme.palette.error.main },
    fileName: { fontSize: 15, fontWeight: 500, wordBreak: 'break-all' },
    fileMeta: { fontSize: 12.5, color: theme.palette.text.secondary },
    fileMetaBad: { fontSize: 12.5, color: theme.palette.error.main },
    grow: { flex: 1, minWidth: 0 },
    hint: { fontSize: 12.5, color: theme.palette.text.secondary },
    link: { fontSize: 12.5, cursor: 'pointer' },
    modes: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing(1.5) },
    mode: {
      display: 'flex', alignItems: 'flex-start', gap: theme.spacing(1), padding: theme.spacing(1.25, 1.5),
      border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', textAlign: 'left',
      background: '#fff', font: 'inherit',
    },
    modeOn: { border: `2px solid ${teal}`, background: '#eef5f2', padding: theme.spacing(1.125, 1.375) },
    radio: { padding: 2, marginTop: 1 },
    modeTitle: { fontSize: 15, fontWeight: 500 },
    modeSub: { fontSize: 12.5, color: theme.palette.text.secondary },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing(1.5) },
    stat: { border: `1px solid ${border}`, borderRadius: 6, padding: theme.spacing(1.25, 1.5) },
    statValue: { fontSize: 22, fontWeight: 600, lineHeight: 1.2 },
    statLabel: { fontSize: 12.5, color: theme.palette.text.secondary },
    row: { display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0' },
    unknown: { color: theme.palette.error.main, fontSize: 12.5, marginLeft: 6 },
    foot: {
      display: 'flex', alignItems: 'center', gap: theme.spacing(1), padding: theme.spacing(1.5, 3),
      borderTop: `1px solid ${border}`, background: '#fafcfb',
    },
    footHint: {
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: theme.palette.text.secondary,
      marginRight: 'auto', '& svg': { fontSize: 17 },
    },
  };
});

function ChargesImportDialog({ onClose }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const intl = useIntl();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, v) => formatMessageWithValues(intl, MODULE_NAME, id, v);
  const providers = useSelector((s) => s.tasafPayment?.fspProviders ?? []);
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState(ADD);

  const pick = async (file) => { if (file) setResult(await inspect(file)); };
  const bad = !!result && (!!result.error || !!result.missing?.length || !result.rows);
  const known = new Set(providers.map((p) => p.fspCode));

  let blocker = null;
  if (!result) blocker = t('chargesImport.hint.file');
  else if (bad) blocker = t('chargesImport.hint.fix');

  let meta = null;
  if (result?.error) meta = t('chargesImport.file.notCsv');
  else if (result?.missing?.length) meta = tv('chargesImport.file.missing', { columns: result.missing.join(', ') });
  else if (result && !result.rows) meta = t('chargesImport.file.empty');
  else if (result) {
    meta = tv('chargesImport.file.meta', {
      rows: result.rows, fsps: Object.keys(result.perFsp).length, size: formatSize(result.file.size),
    });
  }

  const modeCard = (value) => (
    <button type="button" className={`${classes.mode} ${mode === value ? classes.modeOn : ''}`} onClick={() => setMode(value)}>
      <Radio className={classes.radio} color="primary" checked={mode === value} tabIndex={-1} />
      <span>
        <div className={classes.modeTitle}>{t(`chargesImport.mode.${value}`)}</div>
        <div className={classes.modeSub}>{t(`chargesImport.mode.${value}.sub`)}</div>
      </span>
    </button>
  );

  const stat = (label, value) => (
    <div className={classes.stat}>
      <div className={classes.statValue}>{value}</div>
      <div className={classes.statLabel}>{t(label)}</div>
    </div>
  );

  const runImport = () => {
    dispatch(importWithdrawalCharges(result.text, mode === REPLACE, t('charges.mutation.import')));
    onClose();
  };

  return (
    <Dialog open fullWidth maxWidth="sm" onClose={onClose} classes={{ paper: classes.paper }}>
      <div className={classes.head}>
        <div>
          <div className={classes.title}>{t('chargesImport.title')}</div>
          <div className={classes.step}>{t(step === 1 ? 'chargesImport.step1' : 'chargesImport.step2')}</div>
        </div>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </div>

      <div className={classes.body}>
        {step === 1 && (
          <>
            <div>
              <div className={classes.label}>{t('chargesImport.file')}</div>
              {result ? (
                <div className={`${classes.fileCard} ${bad ? classes.fileBad : ''}`}>
                  {bad ? <ErrorOutline className={classes.fileIconBad} /> : <InsertDriveFileOutlined className={classes.fileIcon} />}
                  <div className={classes.grow}>
                    <div className={classes.fileName}>{result.file.name}</div>
                    <div className={bad ? classes.fileMetaBad : classes.fileMeta}>{meta}</div>
                  </div>
                  <IconButton size="small" onClick={() => setResult(null)}><DeleteOutline /></IconButton>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  className={`${classes.drop} ${over ? classes.dropOver : ''}`}
                  onClick={() => input.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}
                  onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
                >
                  <CloudUploadOutlined className={classes.dropIcon} />
                  <div className={classes.dropText}>
                    {t('chargesImport.drop')}
                    {' '}
                    <span className={classes.browse}>{t('chargesImport.browse')}</span>
                  </div>
                  <input
                    ref={input}
                    type="file"
                    accept=".csv"
                    hidden
                    onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }}
                  />
                </div>
              )}
              <div className={classes.hint} style={{ marginTop: 6 }}>
                <Link className={classes.link} onClick={downloadTemplate}>{t('chargesImport.template')}</Link>
              </div>
            </div>
            <div className={classes.modes}>
              {modeCard(ADD)}
              {modeCard(REPLACE)}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className={classes.stats}>
              {stat('chargesImport.preview.bands', result.rows)}
              {stat('chargesImport.preview.problems', result.problems.length)}
              {stat('chargesImport.preview.fsps', Object.keys(result.perFsp).length)}
            </div>
            <div>
              {Object.entries(result.perFsp).sort().map(([fsp, n]) => (
                <div key={fsp} className={classes.row}>
                  <span>
                    {fsp}
                    {!known.has(fsp) && <span className={classes.unknown}>{t('chargesImport.preview.unknown')}</span>}
                  </span>
                  <span>{tv('chargesImport.preview.bandsOf', { n })}</span>
                </div>
              ))}
            </div>
            {!!result.problems.length && (
              <Alert severity="warning">
                {tv('chargesImport.preview.skipped', { n: result.problems.length })}
                {result.problems.slice(0, 5).map((p) => (
                  <div key={p.line}>{tv(`chargesImport.problem.${p.problem}`, { line: p.line })}</div>
                ))}
              </Alert>
            )}
            {mode === REPLACE && <Alert severity="warning">{t('chargesImport.preview.replace')}</Alert>}
          </>
        )}
      </div>

      <div className={classes.foot}>
        <span className={classes.footHint}>{step === 1 && blocker && (<><InfoOutlined />{blocker}</>)}</span>
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
      </div>
    </Dialog>
  );
}

export default ChargesImportDialog;
