import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useHistory } from 'react-router-dom';

import {
  Paper, Grid, Typography, Button, Box, Divider,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';

import {
  Block,
  Helmet,
  useModulesManager,
  useTranslations,
  journalize,
  TextInput,
  SelectInput,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_GENERATE_PAYLIST,
  BATCH_TYPE,
  BATCH_TYPE_LIST,
} from '../constants';
import { generatePaylist } from '../actions';
import { defaultPageStyles } from '../utils/styles';

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),
  paper: theme.paper.paper,
  header: theme.paper.header,
  title: theme.paper.title,
  subtitle: theme.paper.message,
  content: {
    padding: theme.spacing(2),
  },
  section: {
    marginTop: theme.spacing(2),
  },
  divider: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  helperText: {
    marginBottom: theme.spacing(1),
  },
  actions: {
    marginTop: theme.spacing(3),
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(1),
  },
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
  const isMixedBatch = batchType === BATCH_TYPE.MIXED;

  const handleBatchTypeChange = (value) => {
    setBatchType(value);
    if (value !== BATCH_TYPE.MIXED) {
      setLocationId('');
    }
  };

  const handleGenerate = () => {
    generatePaylist(
      parseInt(payrollId, 10),
      batchType,
      null,
      locationId ? parseInt(locationId, 10) : null,
      formatMessage('mutation.generatePaylistLabel'),
    );
  };

  const handleCancel = () => history.goBack();

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('batchGeneration.page.title')} />

      <Paper className={classes.paper}>
        <Grid container className={classes.header}>
          <Grid item xs={12} className={classes.title}>
            <Typography variant="h6">{formatMessage('batchGeneration.page.title')}</Typography>
          </Grid>
        </Grid>

        <Box className={classes.content}>
          <Typography variant="body2" color="textSecondary" className={classes.subtitle}>
            {formatMessage('batchGeneration.page.description')}
          </Typography>

          <div className={classes.section}>
            <Block title={formatMessage('batchGeneration.section.parameters')} titleVariant="h6">
              <Typography variant="body2" color="textSecondary" className={classes.helperText}>
                {formatMessage('batchGeneration.section.parameters.help')}
              </Typography>
              <Divider className={classes.divider} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextInput
                    module={MODULE_NAME}
                    label="batchGeneration.payrollId"
                    value={payrollId}
                    onChange={(val) => setPayrollId(val)}
                    type="number"
                    required
                    helperText={formatMessage('batchGeneration.payrollId.helper')}
                  />
                </Grid>
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
                  <Box mt={1}>
                    <Typography variant="caption" color="textSecondary">
                      {formatMessage('batchGeneration.batchType.helper')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextInput
                    module={MODULE_NAME}
                    label="batchGeneration.locationId"
                    value={locationId}
                    onChange={(val) => setLocationId(val)}
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
          </div>

          <div className={classes.actions}>
            <Button onClick={handleCancel}>
              {formatMessage('button.cancel')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlaylistAddIcon />}
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              {formatMessage('button.generatePaylist')}
            </Button>
          </div>
        </Box>
      </Paper>
    </div>
  );
}

const mapStateToProps = (state) => ({
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ generatePaylist, journalize }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(BatchGenerationPage);
