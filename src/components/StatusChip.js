import React from 'react';
import { Chip } from '@material-ui/core';

function StatusChip({ label, color }) {
  return (
    <Chip
      label={label}
      size="small"
      style={{ backgroundColor: color || '#9e9e9e', color: '#fff', fontWeight: 500 }}
    />
  );
}

export default StatusChip;
