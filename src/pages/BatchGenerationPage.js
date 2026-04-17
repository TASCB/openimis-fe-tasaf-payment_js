import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useHistory } from 'react-router-dom';

import { Paper, Grid, Typography, Button, Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';

import {
  useModulesManager,
  useTranslations,
  journalize,
  TextInput,
  SelectInput,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_GENERATE_PAYLIST,
  BATCH_TYPE_LIST,
} from '../constants';
import { generatePaylist } from '../actions';

const useStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  header: { padding: theme.spacing(2), borderBottom: `1px solid ${theme.palette.divider}` },
  form: { padding: theme.spacing(2) },
  actions: { marginTop: theme.spacing(2) },
}));

function BatchGenerationPage({
  generatePaylist,
  submittingMutation,
  mutation,
  journalize,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const history = useHistory();
  const prevSubmittingMutationRef = useRef();

  const [payrollId, setPayrollId] = useState('');
  const [batchType, setBatchType] = useState(null);
  const [locationId, setLocationId] = useState('');

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
      history.push('/tasafPayment/paylists');
    }
  }, [submittingMutation]);
  useEffect(() => { prevSubmittingMutationRef.current = submittingMutation; });

  if (!rights.includes(RIGHT_GENERATE_PAYLIST)) return null;

  const canGenerate = payrollId && batchType && !submittingMutation;

  const handleGenerate = () => {
    generatePaylist(
      parseInt(payrollId, 10),
      batchType,
      null,
      locationId ? parseInt(locationId, 10) : null,
      formatMessage('mutation.generatePaylistLabel'),
    );
  };

  return (
    <Paper className={classes.paper}>
      <Grid container className={classes.header} alignItems="center">
        <Typography variant="h6">{formatMessage('batchGeneration.page.title')}</Typography>
      </Grid>

      <Grid container spacing={2} className={classes.form}>
        <Grid item xs={4}>
          <TextInput
            module={MODULE_NAME}
            label="batchGeneration.payrollId"
            value={payrollId}
            onChange={(val) => setPayrollId(val)}
            type="number"
          />
        </Grid>
        <Grid item xs={4}>
          <SelectInput
            module={MODULE_NAME}
            label="batchGeneration.batchType"
            required
            options={[
              { value: null, label: formatMessage('tooltip.any') },
              ...BATCH_TYPE_LIST.map((t) => ({ value: t, label: formatMessage(`paylist.batchType.${t}`) })),
            ]}
            value={batchType}
            onChange={(val) => setBatchType(val)}
          />
        </Grid>
        <Grid item xs={4}>
          <TextInput
            module={MODULE_NAME}
            label="batchGeneration.locationId"
            value={locationId}
            onChange={(val) => setLocationId(val)}
            type="number"
          />
        </Grid>

        <Grid item xs={12} className={classes.actions}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlaylistAddIcon />}
            disabled={!canGenerate}
            onClick={handleGenerate}
          >
            {formatMessage('button.generatePaylist')}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}

const mapStateToProps = (state) => ({
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ generatePaylist, journalize }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(BatchGenerationPage);
