import React, {
  useState, useEffect, useRef,
} from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  Box, Grid, Button, Typography, Divider,
  Stepper, Step, StepLabel,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';

import {
  decodeId,
  Block,
  SelectInput,
  TextInput,
  ProgressOrError,
  useModulesManager,
  useTranslations,
  journalize,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  BATCH_TYPE,
  BATCH_TYPE_LIST,
  DESTINATION,
  DESTINATION_LIST,
  PAYROLL_STATUS_APPROVED,
} from '../../constants';
import { fetchPayrolls, generatePaylist } from '../../actions';

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
}));

function PaymentGenerationStepper({
  payrolls,
  fetchingPayrolls,
  errorPayrolls,
  fetchPayrolls,
  generatePaylist,
  submittingMutation,
  mutation,
  journalize,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const prevSubmittingRef = useRef();

  const [activeStep, setActiveStep] = useState(0);
  const [payrollUuid, setPayrollUuid] = useState(null);
  const [batchType, setBatchType] = useState(null);
  const [destination, setDestination] = useState(DESTINATION.MUSE);
  const [locationId, setLocationId] = useState('');

  useEffect(() => { fetchPayrolls([`status: ${PAYROLL_STATUS_APPROVED}`]); }, []);

  useEffect(() => {
    if (prevSubmittingRef.current && !submittingMutation) {
      journalize(mutation);
      setActiveStep(0);
      setPayrollUuid(null);
      setBatchType(null);
      setDestination(DESTINATION.MUSE);
      setLocationId('');
    }
  }, [submittingMutation]);
  useEffect(() => { prevSubmittingRef.current = submittingMutation; });

  const selectedPayroll = payrolls.find((p) => p.uuid === payrollUuid) || null;
  const isMixedBatch = batchType === BATCH_TYPE.MIXED;

  const steps = [
    formatMessage('generation.step.payroll'),
    formatMessage('generation.step.scope'),
    formatMessage('generation.step.review'),
    formatMessage('generation.step.generate'),
  ];

  const canLeaveStep = (step) => {
    if (step === 0) return !!payrollUuid;
    if (step === 1) return !!batchType && !!destination;
    return true;
  };

  const handleBatchTypeChange = (value) => {
    setBatchType(value);
    if (value !== BATCH_TYPE.MIXED) setLocationId('');
  };

  const handleGenerate = () => {
    const paymentCycleUuid = selectedPayroll?.paymentCycle?.id
      ? decodeId(selectedPayroll.paymentCycle.id)
      : null;
    generatePaylist(
      payrollUuid,
      batchType,
      paymentCycleUuid,
      locationId ? parseInt(locationId, 10) : null,
      destination,
      formatMessage('mutation.generatePaylistLabel'),
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
                  onChange={handleBatchTypeChange}
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
              <Grid item xs={12} sm={6}>
                <TextInput
                  module={MODULE_NAME}
                  label="batchGeneration.locationId"
                  value={locationId}
                  onChange={setLocationId}
                  type="number"
                  readOnly={!isMixedBatch}
                  helperText={
                    isMixedBatch
                      ? formatMessage('batchGeneration.locationId.helper')
                      : formatMessage('batchGeneration.locationId.disabledHelper')
                  }
                />
              </Grid>
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
            {isMixedBatch && reviewRow('batchGeneration.locationId', locationId)}
          </Block>
        )}

        {activeStep === 3 && (
          <Block title={formatMessage('generation.step.generate')} titleVariant="h6">
            <Typography variant="body2" color="textSecondary">
              {formatMessage('generation.generate.help')}
            </Typography>
            <Divider className={classes.divider} />
            {reviewRow('batchGeneration.destination', destination ? formatMessage(`paylist.destination.${destination}`) : null)}
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
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { fetchPayrolls, generatePaylist, journalize }, dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(PaymentGenerationStepper);
