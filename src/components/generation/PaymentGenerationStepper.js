import React, {
  useState, useEffect, useRef,
} from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  Box, Grid, Button, Typography, Divider, LinearProgress,
  Stepper, Step, StepLabel, Table, TableBody, TableCell, TableHead, TableRow,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { alpha } from '@material-ui/core/styles/colorManipulator';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';

import {
  decodeId,
  Block,
  SelectInput,
  ProgressOrError,
  useModulesManager,
  useTranslations,
  journalize,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  BATCH_TYPE_LIST,
  DESTINATION,
  DESTINATION_LIST,
  PAYROLL_STATUS_APPROVED,
} from '../../constants';
import { fetchPayrolls, generatePaylist, fetchGenerationPreview } from '../../actions';

const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(2) },
  generateNote: { marginTop: theme.spacing(2) },
  stepperBar: { background: 'transparent', padding: theme.spacing(2, 0) },
  stepContent: { marginTop: theme.spacing(2) },
  divider: { margin: theme.spacing(2, 0) },
  actions: {
    marginTop: theme.spacing(3),
    display: 'flex',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  reviewRow: { padding: theme.spacing(0.5, 0) },
  reviewLabel: { color: theme.palette.text.secondary },
  sectionTitle: { fontWeight: 600, margin: theme.spacing(2, 0, 1) },
  included: {
    padding: theme.spacing(1.5, 2), borderRadius: 10, fontWeight: 600,
    color: theme.palette.success.dark, backgroundColor: alpha(theme.palette.success.main, 0.08),
  },
  nothing: {
    padding: theme.spacing(1.5, 2), borderRadius: 10, fontWeight: 600,
    color: theme.palette.error.dark, backgroundColor: alpha(theme.palette.error.main, 0.06),
  },
  warning: {
    padding: theme.spacing(1.25, 2), borderRadius: 10, marginBottom: theme.spacing(1), fontSize: '0.875rem',
    color: theme.palette.warning.dark, backgroundColor: alpha(theme.palette.warning.main, 0.1),
  },
  fspTable: { maxWidth: 520 },
  reasonRow: { display: 'flex', justifyContent: 'space-between', maxWidth: 520, padding: theme.spacing(0.5, 0) },
  reasonHint: { color: theme.palette.text.secondary, fontSize: '0.8rem' },
  infoLine: { color: theme.palette.grey[600], fontSize: '0.8125rem', marginTop: theme.spacing(2) },
}));

// Households nobody will pay until someone fixes their account, vs. ones simply not in this batch.
const ATTENTION_REASONS = ['NOT_VERIFIED', 'PRE_AUDIT_NOT_PASSED', 'INVALID_MOBILE_NUMBER', 'NO_ACCOUNT'];
const INFO_REASONS = ['OTHER_FSP', 'OTHER_CHANNEL', 'ALREADY_ON_PAYLIST'];
const money = (v) => `TZS ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function PaymentGenerationStepper({
  payrolls,
  fetchingPayrolls,
  errorPayrolls,
  fetchPayrolls,
  generatePaylist,
  fetchGenerationPreview,
  generationPreview,
  fetchingGenerationPreview,
  errorGenerationPreview,
  submittingMutation,
  mutation,
  journalize,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const prevSubmittingRef = useRef();

  const [activeStep, setActiveStep] = useState(0);
  const [payrollUuid, setPayrollUuid] = useState(null);
  const [batchType, setBatchType] = useState(null);
  const [destination, setDestination] = useState(DESTINATION.MUSE);
  const [fspCode, setFspCode] = useState(null);
  const [fspCodes, setFspCodes] = useState([]);

  useEffect(() => { fetchPayrolls([`status: ${PAYROLL_STATUS_APPROVED}`]); }, []);

  useEffect(() => {
    if (prevSubmittingRef.current && !submittingMutation) {
      journalize(mutation);
      setActiveStep(0);
      setPayrollUuid(null);
      setBatchType(null);
      setDestination(DESTINATION.MUSE);
      setFspCode(null);
    }
  }, [submittingMutation]);
  useEffect(() => { prevSubmittingRef.current = submittingMutation; });

  const selectedPayroll = payrolls.find((p) => p.uuid === payrollUuid) || null;

  const steps = [
    formatMessage('generation.step.payroll'),
    formatMessage('generation.step.scope'),
    formatMessage('generation.step.review'),
    formatMessage('generation.step.generate'),
  ];

  useEffect(() => {
    if (activeStep === 1 && payrollUuid && batchType) fetchGenerationPreview(payrollUuid, batchType, destination);
    if (activeStep === 2 && payrollUuid && batchType) {
      fetchGenerationPreview(payrollUuid, batchType, destination, fspCode);
    }
  }, [activeStep, batchType, destination]);

  useEffect(() => {
    if (activeStep === 1) setFspCodes(generationPreview?.fsp_codes || []);
  }, [generationPreview]);

  const changeBatchType = (value) => {
    setBatchType(value);
    setFspCode(null);
    setFspCodes([]);
  };

  const canLeaveStep = (step) => {
    if (step === 0) return !!payrollUuid;
    if (step === 1) return !!batchType && !!destination;
    if (step === 2) return !fetchingGenerationPreview && !!generationPreview?.success && generationPreview.included > 0;
    return true;
  };


  const handleGenerate = () => {
    const paymentCycleUuid = selectedPayroll?.paymentCycle?.id
      ? decodeId(selectedPayroll.paymentCycle.id)
      : null;
    generatePaylist(
      payrollUuid,
      batchType,
      paymentCycleUuid,
      destination,
      formatMessage('mutation.generatePaylistLabel'),
      fspCode,
    );
  };

  const payrollOptions = [
    { value: null, label: formatMessage('generation.payroll.placeholder') },
    ...payrolls.map((p) => ({
      value: p.uuid,
      label: p.paymentCycle?.code ? `${p.name} — ${p.paymentCycle.code}` : p.name,
    })),
  ];

  const reviewRow = (labelKey, value) => (
    <Grid container className={classes.reviewRow}>
      <Grid item xs={4}><Typography variant="body2" className={classes.reviewLabel}>{formatMessage(labelKey)}</Typography></Grid>
      <Grid item xs={8}><Typography variant="body2">{value || '-'}</Typography></Grid>
    </Grid>
  );

  return (
    <Box className={classes.root}>
      <Stepper activeStep={activeStep} alternativeLabel className={classes.stepperBar}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      <div className={classes.stepContent}>
        {activeStep === 0 && (
          <Block title={formatMessage('generation.step.payroll')} titleVariant="h6">
            <ProgressOrError progress={fetchingPayrolls} error={errorPayrolls} />
            {!fetchingPayrolls && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <SelectInput
                    module={MODULE_NAME}
                    label="generation.payroll"
                    required
                    options={payrollOptions}
                    value={payrollUuid}
                    onChange={setPayrollUuid}
                  />
                </Grid>
              </Grid>
            )}
          </Block>
        )}

        {activeStep === 1 && (
          <Block title={formatMessage('generation.step.scope')} titleVariant="h6">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <SelectInput
                  module={MODULE_NAME}
                  label="batchGeneration.batchType"
                  required
                  options={[
                    { value: null, label: formatMessage('tooltip.any') },
                    ...BATCH_TYPE_LIST.map((t) => ({ value: t, label: formatMessage(`paylist.batchType.${t}`) })),
                  ]}
                  value={batchType}
                  onChange={changeBatchType}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <SelectInput
                  module={MODULE_NAME}
                  label="batchGeneration.destination"
                  required
                  options={DESTINATION_LIST.map((d) => ({
                    value: d,
                    label: formatMessage(`paylist.destination.${d}`),
                  }))}
                  value={destination}
                  onChange={setDestination}
                />
              </Grid>
              {!!batchType && (
                <Grid item xs={12} sm={6}>
                  <SelectInput
                    module={MODULE_NAME}
                    label="generation.fsp"
                    options={[
                      { value: null, label: formatMessage('generation.fsp.all') },
                      ...fspCodes.map((c) => ({ value: c, label: c })),
                    ]}
                    value={fspCode}
                    onChange={setFspCode}
                    disabled={fetchingGenerationPreview}
                  />
                </Grid>
              )}
            </Grid>
          </Block>
        )}

        {activeStep === 2 && (
          <Block title={formatMessage('generation.step.review')} titleVariant="h6">
            <Typography variant="body2" color="textSecondary">
              {formatMessage('generation.review.help')}
            </Typography>
            <Divider className={classes.divider} />
            {reviewRow('generation.payroll', selectedPayroll?.name)}
            {reviewRow('generation.review.cycle', selectedPayroll?.paymentCycle?.code)}
            {reviewRow('batchGeneration.batchType', batchType ? formatMessage(`paylist.batchType.${batchType}`) : null)}
            {reviewRow('batchGeneration.destination', destination ? formatMessage(`paylist.destination.${destination}`) : null)}
            {reviewRow('generation.fsp', fspCode || formatMessage('generation.fsp.all'))}
            <Divider className={classes.divider} />
            {fetchingGenerationPreview && <LinearProgress />}
            {!!errorGenerationPreview && (
              <Typography color="error">{formatMessage(errorGenerationPreview.detail || errorGenerationPreview.message || '')}</Typography>
            )}
            {generationPreview && !generationPreview.success && (
              <div className={classes.nothing}>{formatMessage(generationPreview.error || 'generation.preview.failed')}</div>
            )}
            {generationPreview?.success && (
              <>
                {generationPreview.included > 0 ? (
                  <div className={classes.included}>
                    {formatMessageWithValues('generation.preview.included', {
                      count: generationPreview.included, amount: money(generationPreview.gross_total),
                    })}
                  </div>
                ) : (
                  <div className={classes.nothing}>{formatMessage('generation.preview.nothing')}</div>
                )}

                {(generationPreview.warnings || []).length > 0 && (
                  <>
                    <Typography variant="body2" className={classes.sectionTitle}>{formatMessage('generation.preview.warnings')}</Typography>
                    {generationPreview.warnings.map((w) => (
                      <div key={`${w.code}-${w.fsp_code}`} className={classes.warning}>
                        {formatMessageWithValues(
                          w.code === 'FSP_MISSING_MUSE_DETAILS' && w.awaiting_muse
                            ? 'generation.preview.warning.AWAITING_MUSE' : `generation.preview.warning.${w.code}`,
                          { fsp: w.fsp_code, count: w.payments },
                        )}
                      </div>
                    ))}
                  </>
                )}

                {(generationPreview.per_fsp || []).length > 0 && (
                  <>
                    <Typography variant="body2" className={classes.sectionTitle}>{formatMessage('generation.preview.perFsp')}</Typography>
                    <Table size="small" className={classes.fspTable}>
                      <TableHead>
                        <TableRow>
                          <TableCell>{formatMessage('generation.preview.col.fsp')}</TableCell>
                          <TableCell align="right">{formatMessage('generation.preview.col.payments')}</TableCell>
                          <TableCell align="right">{formatMessage('generation.preview.col.amount')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {generationPreview.per_fsp.map((r) => (
                          <TableRow key={r.fsp_code}>
                            <TableCell>{r.fsp_code}</TableCell>
                            <TableCell align="right">{r.payments}</TableCell>
                            <TableCell align="right">{money(r.gross)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}

                {ATTENTION_REASONS.some((r) => generationPreview.excluded?.[r]) && (
                  <>
                    <Typography variant="body2" className={classes.sectionTitle}>
                      {formatMessageWithValues('generation.preview.attention', {
                        count: ATTENTION_REASONS.reduce((n, r) => n + (generationPreview.excluded[r] || 0), 0),
                      })}
                    </Typography>
                    {ATTENTION_REASONS.filter((r) => generationPreview.excluded[r]).map((r) => (
                      <div key={r} className={classes.reasonRow}>
                        <div>
                          <Typography variant="body2">{formatMessage(`generation.preview.reason.${r}`)}</Typography>
                          <Typography className={classes.reasonHint}>{formatMessage(`generation.preview.reason.${r}.hint`)}</Typography>
                        </div>
                        <Typography variant="body2">{generationPreview.excluded[r]}</Typography>
                      </div>
                    ))}
                  </>
                )}

                {INFO_REASONS.some((r) => generationPreview.excluded?.[r]) && (
                  <Typography className={classes.infoLine}>
                    {formatMessage('generation.preview.notInBatch')}
                    {' '}
                    {INFO_REASONS.filter((r) => generationPreview.excluded[r])
                      .map((r) => formatMessageWithValues(`generation.preview.info.${r}`, { count: generationPreview.excluded[r] }))
                      .join(' · ')}
                  </Typography>
                )}
              </>
            )}
          </Block>
        )}

        {activeStep === 3 && (
          <Block title={formatMessage('generation.step.generate')} titleVariant="h6">
            <Typography variant="body2" color="textSecondary">
              {formatMessage('generation.generate.help')}
            </Typography>
            <Divider className={classes.divider} />
            {reviewRow('batchGeneration.destination', destination ? formatMessage(`paylist.destination.${destination}`) : null)}
            {reviewRow('generation.fsp', fspCode || formatMessage('generation.fsp.all'))}
            <Typography variant="body2" color="textSecondary" className={classes.generateNote}>
              {formatMessage('generation.generate.note')}
            </Typography>
          </Block>
        )}
      </div>

      <div className={classes.actions}>
        <Button
          disabled={activeStep === 0 || submittingMutation}
          onClick={() => setActiveStep((s) => s - 1)}
        >
          {formatMessage('button.back')}
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button
            variant="contained"
            color="primary"
            disabled={!canLeaveStep(activeStep)}
            onClick={() => setActiveStep((s) => s + 1)}
          >
            {formatMessage('button.next')}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlaylistAddIcon />}
            disabled={!payrollUuid || !batchType || submittingMutation}
            onClick={handleGenerate}
          >
            {formatMessage('button.generatePaylist')}
          </Button>
        )}
      </div>
    </Box>
  );
}

const mapStateToProps = (state) => ({
  payrolls: state.tasafPayment.payrolls,
  fetchingPayrolls: state.tasafPayment.fetchingPayrolls,
  errorPayrolls: state.tasafPayment.errorPayrolls,
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
  generationPreview: state.tasafPayment.generationPreview,
  fetchingGenerationPreview: state.tasafPayment.fetchingGenerationPreview,
  errorGenerationPreview: state.tasafPayment.errorGenerationPreview,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { fetchPayrolls, generatePaylist, fetchGenerationPreview, journalize }, dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(PaymentGenerationStepper);
