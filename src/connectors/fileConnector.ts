import { ConnectorStatus } from '../types/domain';
import { nowIso } from '../utils/time';

// TODO(file-connector): replace this with a scoped local document/change-summary connector; never expose a file-manager launcher.
export const getFileConnectorStatus = (): ConnectorStatus => {
  const checked = nowIso();
  return {
    id: 'connector-file-changes',
    name: 'File changes',
    type: 'file',
    status: 'mock',
    last_checked: checked,
    source: 'File',
    state: 'mock',
    detail: 'Mock file-change summaries only; deleting or modifying files requires explicit approval.',
    lastCheckedAt: checked,
  };
};
