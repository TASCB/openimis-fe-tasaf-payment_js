import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton, Tooltip } from '@material-ui/core';
import GetAppIcon from '@material-ui/icons/GetApp';
import SendIcon from '@material-ui/icons/Send';
import {
  clearConfirm, coreConfirm, downloadExport, formatDateTimeFromISO, Searcher, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { exportAccountCheck, fetchAccountChecks, sendAccountCheck } from '../../actions';
import { DEFAULT_PAGE_SIZE, MODULE_NAME, ROWS_PER_PAGE_OPTIONS } from '../../constants';
import AccountCheckUploadDialog from './AccountCheckUploadDialog';

const ANSWERED = ['VERIFIED', 'REVIEW', 'NAME_MISMATCH', 'NOT_FOUND', 'DORMANT', 'PROVIDER_ERROR', 'NO_ANSWER'];

const parse = (value) => {
  try { return (typeof value === 'string' ? JSON.parse(value || '{}') : value) || {}; } catch (e) { return {}; }
};

function AccountCheckPanel() {
  const dispatch = useDispatch();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [jobs, setJobs] = useState({ items: [], pageInfo: {}, totalCount: 0 });
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [reload, setReload] = useState(0);
  const [sending, setSending] = useState(null);
  const confirmed = useSelector((state) => state.core.confirmed);

  useEffect(() => {
    if (!sending || confirmed === null) return;
    const job = sending;
    setSending(null);
    dispatch(clearConfirm(null));
    if (confirmed) {
      dispatch(sendAccountCheck(job.uuid, formatMessage('accountCheck.mutation.send')))
        .then(() => setReload((k) => k + 1));
    }
  }, [confirmed]);

  const send = (job) => {
    setSending(job);
    dispatch(coreConfirm(
      formatMessage('accountCheck.confirm.title'),
      formatMessageWithValues('accountCheck.confirm.message', { count: job.validCount, file: job.fileName }),
    ));
  };

  const fetch = async (params) => {
    setFetching(true);
    const response = await dispatch(fetchAccountChecks(params));
    const data = response?.payload?.data?.accountCheckJob;
    setFetching(false);
    setError(response?.error ? response.payload : null);
    setJobs({
      items: (data?.edges || []).map((e) => e.node),
      pageInfo: data?.pageInfo || {},
      totalCount: data?.totalCount ?? 0,
    });
  };

  const download = async (job) => {
    const response = await dispatch(exportAccountCheck(job.uuid));
    const name = response?.payload?.data?.accountCheckExport;
    if (name) downloadExport(name, `${(job.fileName || 'account-check').replace(/\.csv$/i, '')}-results.csv`, 'csv')();
  };

  const progress = (job) => {
    const results = parse(job.results);
    const answered = ANSWERED.reduce((sum, key) => sum + (results[key] || 0), 0);
    return formatMessageWithValues('accountCheck.progress', {
      answered, valid: job.validCount, verified: results.VERIFIED || 0,
    });
  };

  const headers = () => [
    'accountCheck.col.file', 'accountCheck.col.uploadedBy', 'accountCheck.col.uploadedAt', 'accountCheck.col.rows',
    'accountCheck.col.valid', 'accountCheck.col.progress', 'accountCheck.col.status', '',
  ];
  const itemFormatters = () => [
    (job) => job.fileName || '-',
    (job) => job.createdBy || '-',
    (job) => formatDateTimeFromISO(modulesManager, null, job.createdAt) || '-',
    (job) => job.rowCount,
    (job) => job.validCount,
    (job) => (job.status === 'VALIDATED' ? '-' : progress(job)),
    (job) => formatMessage(`accountCheck.status.${job.status}`),
    (job) => (
      <>
        {job.status === 'VALIDATED' && job.validCount > 0 && (
          <Tooltip title={formatMessage('accountCheck.sendRow')}>
            <IconButton size="small" onClick={() => send(job)}><SendIcon fontSize="small" /></IconButton>
          </Tooltip>
        )}
        <Tooltip title={formatMessage('accountCheck.download')}>
          <IconButton size="small" onClick={() => download(job)}><GetAppIcon fontSize="small" /></IconButton>
        </Tooltip>
      </>
    ),
  ];

  return (
    <>
      <Searcher
        key={reload}
        module={MODULE_NAME}
        fetch={fetch}
        items={jobs.items}
        itemsPageInfo={jobs.pageInfo}
        fetchingItems={fetching}
        fetchedItems={!fetching}
        errorItems={error}
        tableTitle={formatMessageWithValues('accountCheck.results', { totalCount: jobs.totalCount })}
        headers={headers}
        itemFormatters={itemFormatters}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        defaultOrderBy="-createdAt"
        rowIdentifier={(job) => job.id}
        searcherActions={[{
          label: formatMessage('accountCheck.upload'), onClick: () => setUploading(true), authorized: true,
        }]}
        searcherActionsPosition="header-right"
      />
      {uploading && (
        <AccountCheckUploadDialog
          onClose={(changed) => { setUploading(false); if (changed) setReload((k) => k + 1); }}
        />
      )}
    </>
  );
}

export default AccountCheckPanel;
