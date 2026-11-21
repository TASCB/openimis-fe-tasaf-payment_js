import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useLocation } from 'react-router-dom';
import { Grid, Paper, Tab } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { formatMessage } from '@openimis/fe-core';

import { MODULE_NAME } from '../constants';
import MuseSettingsPage from './MuseSettingsPage';
import GepgSettingsPage from './GepgSettingsPage';
import TipsSettingsPage from './TipsSettingsPage';

const TAB_MUSE = 'muse';
const TAB_GEPG = 'gepg';
const TAB_TIPS = 'tips';
const TABS = [TAB_MUSE, TAB_GEPG, TAB_TIPS];

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center' },
  selectedTab: { borderBottom: '4px solid white' },
  unselectedTab: { borderBottom: '4px solid transparent' },
}));

function IntegrationsPage() {
  const intl = useIntl();
  const classes = useStyles();
  const location = useLocation();
  const [tab, setTab] = useState(() => {
    const asked = new URLSearchParams(location.search).get('integration');
    return TABS.includes(asked) ? asked : TAB_MUSE;
  });
  const tabStyle = (value) => (value === tab ? classes.selectedTab : classes.unselectedTab);
  const label = (value) => formatMessage(intl, MODULE_NAME, `integrations.tab.${value}`);

  return (
    <div className={classes.page}>
      <Paper className={classes.paper}>
        <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
          {TABS.map((value) => (
            <Tab
              key={value}
              onChange={(_, v) => setTab(v)}
              className={tabStyle(value)}
              selected={tab === value}
              value={value}
              label={label(value)}
            />
          ))}
        </Grid>
      </Paper>
      {tab === TAB_MUSE && <MuseSettingsPage />}
      {tab === TAB_GEPG && <GepgSettingsPage />}
      {tab === TAB_TIPS && <TipsSettingsPage />}
    </div>
  );
}

export default IntegrationsPage;
