import { ActionMetaData, ActionUtils, ICmdResult, IObjectRef, ObjectRefUtils } from 'tdp_core';
import { CohortApp } from '../app';
import { IElementProvJSON, IElementProvJSONCohort } from '../CohortInterfaces';
import { log } from '../util';
import { IEntitySourceConfig } from '../utilIdTypes';

/** ****************************
 ---------- GENERAL ----------
****************************** */

// ----------------------------
// ---- DATASET ---------------
// ----------------------------
export function setDatasetAction(provider: IObjectRef<CohortApp>, newDataset: IDatasetDesc, oldDataset: IDatasetDesc) {
  log.debug('Create setDataset Action');
  return ActionUtils.action(
    ActionMetaData.actionMeta('Change Dataset', ObjectRefUtils.category.data, ObjectRefUtils.operation.update),
    'chtSetDataset',
    setDatasetImpl,
    [provider],
    {
      newDataset,
      oldDataset,
    },
  );
}

export async function setDatasetImpl(inputs: IObjectRef<CohortApp>[], parameter: any): Promise<ICmdResult> {
  log.debug('setDataset impl', parameter.oldDataset, parameter.newDataset);
  const app: CohortApp = await inputs[0].v;
  await app.setDataset(parameter.newDataset);
  return {
    inverse: setDatasetAction(inputs[0], parameter.oldDataset, parameter.newDataset),
  };
}

// Compressor function -> commented out due to problems with the add/remove cohort actions
// export function compressChtSetDataset(path: ActionNode[]) {
//   return Compression.lastOnly(path, 'chtSetDataset', (p: ActionNode) => `${p.requires[0].id}_${p.parameter.newDataset}`);
// }

export interface IPanelDesc {
  id: string;
  description: string;
  species: string;
}

export interface IDatasetDesc {
  source: IEntitySourceConfig;
  panel?: IPanelDesc;
  rootCohort: IElementProvJSONCohort;
  chtOverviewElements: IElementProvJSON[];
}
