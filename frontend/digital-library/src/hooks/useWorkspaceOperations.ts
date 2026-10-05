/**
 * Hook để sử dụng workspace operations
 * - Wraps workspace logic
 */

import { useMemo } from 'react';
import {
  createWorkspaceOperations,
  type WorkspaceConfig,
  type WorkspaceOperations,
} from '@/services/workspaceService';

export const useWorkspaceOperations = (config: WorkspaceConfig): WorkspaceOperations => {
  return useMemo(() => createWorkspaceOperations(config), [config.type, config.id]);
};
