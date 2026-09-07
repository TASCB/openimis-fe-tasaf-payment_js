import React from 'react';
import { Grid } from '@material-ui/core';
import { PublishedComponent } from '@openimis/fe-core';

// The backend walks the parent chain, so passing a district id matches every household
// beneath it. See tasaf_payment.services.location_descendants_q.

const LEVELS = ['R', 'D', 'W', 'V'];

// `type` is absent on locations picked in the form (fe-location's fetchUserDistricts
// omits it), so depth is the fallback.
function locationLevels(location) {
  const ancestors = [];
  for (let node = location; node; node = node.parent) ancestors.unshift(node);
  const levels = {};
  ancestors.forEach((node, depth) => {
    levels[node.type || LEVELS[depth]] = node;
  });
  return levels;
}

function PaaLocationFilter({ value, onChange, readOnly = false }) {
  const { D: district, W: ward, V: village } = locationLevels(value);

  return (
    <Grid container>
      <Grid item xs={12} sm={6}>
        <PublishedComponent
          pubRef="location.CoarseLocation"
          readOnly={readOnly}
          required={false}
          withNull
          district={district}
          filterLabels={false}
          onChange={(d) => onChange(d ?? null)}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <PublishedComponent
          pubRef="location.LocationPicker"
          locationLevel={2}
          parentLocation={district}
          value={ward ?? null}
          readOnly={readOnly || !district}
          required={false}
          withNull
          filterLabels={false}
          onChange={(w) => onChange(w ?? district ?? null)}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <PublishedComponent
          pubRef="location.LocationPicker"
          locationLevel={3}
          parentLocation={ward}
          value={village ?? null}
          readOnly={readOnly || !ward}
          required={false}
          withNull
          filterLabels={false}
          onChange={(v) => onChange(v ?? ward ?? district ?? null)}
        />
      </Grid>
    </Grid>
  );
}

export default PaaLocationFilter;
