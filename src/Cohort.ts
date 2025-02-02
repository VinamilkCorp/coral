import { IAllFilters, IDType, IDTypeLike, IDTypeManager, IRow, IServerColumn, UniqueIdManager } from 'tdp_core';
import { ElementProvType, ICohort, ICohortRep, IElement, IElementProvJSONCohort, IProvAttrAndValuesCohort } from './CohortInterfaces';
import {
  createDBCohort,
  createDBCohortWithDepletionScoreFilter,
  createDBCohortWithEqualsFilter,
  createDBCohortWithGeneEqualsFilter,
  createDBCohortWithGeneNumFilter,
  createDBCohortWithNumFilter,
  createDBCohortWithPanelAnnotationFilter,
  createDBCohortWithTreatmentFilter,
  dataDBCohortDepletionScoreFilter,
  dataDBCohortGeneWithEqualsFilter,
  dataDBCohortGeneWithNumFilter,
  dataDBCohortPanelAnnotationFilter,
  dataDBCohortWithEqualsFilter,
  dataDBCohortWithNumFilter,
  getCohortData,
  getCohortSize,
  ICohortDBDataParams,
  ICohortDBParams,
  ICohortDBSizeParams,
  ICohortDBWithDepletionScoreFilterParams,
  ICohortDBWithEqualsFilterParams,
  ICohortDBWithGeneEqualsFilterParams,
  ICohortDBWithGeneNumFilterParams,
  ICohortDBWithNumFilterParams,
  ICohortDBWithPanelAnnotationFilterParams,
  ICohortDBWithTreatmentFilterParams,
  ICohortDepletionScoreFilterParams,
  ICohortEqualsFilterParams,
  ICohortGeneEqualsFilterParams,
  ICohortGeneNumFilterParams,
  ICohortNumFilterParams,
  ICohortPanelAnnotationFilterParams,
  ICohortRow,
  IEqualsList,
  INumRange,
  sizeDBCohortDepletionScoreFilter,
  sizeDBCohortGeneWithEqualsFilter,
  sizeDBCohortGeneWithNumFilter,
  sizeDBCohortPanelAnnotationFilter,
  sizeDBCohortWithEqualsFilter,
  sizeDBCohortWithNumFilter,
  updateCohortName,
  valueListDelimiter,
} from './rest';
import { mergeTwoAllFilters, Task } from './Tasks';
import { deepCopy, handleDataLoadError, handleDataSaveError, log } from './util';

type ICreateMethod<T> = (
  params:
    | ICohortDBParams
    | ICohortDBWithEqualsFilterParams
    | ICohortDBWithNumFilterParams
    | ICohortDBWithGeneNumFilterParams
    | ICohortDBWithGeneEqualsFilterParams
    | ICohortDBWithDepletionScoreFilterParams
    | ICohortDBWithPanelAnnotationFilterParams
    | ICohortDBWithTreatmentFilterParams,
  assignIds?: boolean,
) => Promise<T>;

export async function createCohort(
  labelOne: string,
  labelTwo: string,
  isInitial: boolean,
  previousCohortId: number,
  database: string,
  databaseName: string,
  schema: string,
  table: string,
  view: string,
  idType: IDTypeLike,
  idColumn: IServerColumn,
  filters: IAllFilters,
): Promise<Cohort> {
  const params: ICohortDBParams = {
    name: combineLabelsForDB(labelOne, labelTwo),
    isInitial: isInitial ? 1 : 0,
    previous: previousCohortId,
    database,
    schema,
    table,
  };
  log.debug('try new cohort: ', params);
  const dbId = await cohortCreationDBHandler(createDBCohort, params);

  // ATTENTION : database != databaseName
  const cht = new Cohort(
    { id: `${dbId}`, dbId, labelOne, labelTwo },
    [{ values: [] }] as IEqualsList[],
    { database: databaseName, schema, table, view, idType, idColumn },
    filters,
    null,
    isInitial,
  );
  log.debug('new cohort: ', cht);
  return cht;
}

function getLegacyEqualsFilter(parentFilters: IAllFilters, attribute: string, categoryOrValue: string | string[]) {
  const thisChtFilter: IAllFilters = { normal: {}, lt: {}, lte: {}, gt: {}, gte: {} };
  thisChtFilter.normal[attribute] = categoryOrValue;
  return mergeTwoAllFilters(parentFilters, thisChtFilter); // merge the existing with the new filter
}

function getLegacyRangeFilter(parentFilters: IAllFilters, attribute: string, range: INumRange) {
  const thisFilter: IAllFilters = { normal: {}, lt: {}, lte: {}, gt: {}, gte: {} };
  thisFilter[range.operatorOne][attribute] = range.valueOne;
  if (range.operatorTwo) {
    thisFilter[range.operatorTwo][attribute] = range.valueTwo;
  }
  return mergeTwoAllFilters(parentFilters, thisFilter); // merge the existing with the new filter
}

export async function createCohortWithEqualsFilter(
  parentCohort: Cohort,
  labelOne: string,
  labelTwo: string,
  attribute: string,
  numeric: 'true' | 'false',
  values: Array<string> | Array<number>,
): Promise<Cohort> {
  const params: ICohortDBWithEqualsFilterParams = {
    cohortId: parentCohort.dbId,
    name: combineLabelsForDB(labelOne, labelTwo),
    attribute,
    numeric,
    values,
  };
  log.debug('try new cohort equals filter: ', params);
  const dbId = await cohortCreationDBHandler(createDBCohortWithEqualsFilter, params);

  const newFilter = getLegacyEqualsFilter(parentCohort.filters, attribute, values as string[]);

  // ATTENTION : database != databaseName
  const cht = new Cohort(
    { id: `${dbId}`, dbId, labelOne, labelTwo },
    [{ values }],
    {
      database: parentCohort.database,
      schema: parentCohort.schema,
      table: parentCohort.table,
      view: parentCohort.view,
      idType: parentCohort.idType,
      idColumn: parentCohort.idColumn,
    },
    newFilter,
  );
  log.debug('new cohort with equals filter: ', cht);
  return cht;
}

export async function createCohortWithTreatmentFilter(
  parentCohort: Cohort,
  labelOne: string,
  labelTwo: string,
  baseAgent: boolean,
  agent: Array<string>,
  regimen: number,
): Promise<Cohort> {
  const params: ICohortDBWithTreatmentFilterParams = {
    cohortId: parentCohort.dbId,
    name: combineLabelsForDB(labelOne, labelTwo),
    baseAgent,
    agent,
    regimen,
  };
  log.debug('try new cohort equals filter: ', params);
  const dbId = await cohortCreationDBHandler(createDBCohortWithTreatmentFilter, params);

  const newFilter = getLegacyEqualsFilter(parentCohort.filters, 'agent', agent as string[]);

  // ATTENTION : database != databaseName
  const cht = new Cohort(
    { id: `${dbId}`, dbId, labelOne, labelTwo },
    [{ values: agent }],
    {
      database: parentCohort.database,
      schema: parentCohort.schema,
      table: parentCohort.table,
      view: parentCohort.view,
      idType: parentCohort.idType,
      idColumn: parentCohort.idColumn,
    },
    newFilter,
  );
  log.debug('new cohort with equals filter: ', cht);
  return cht;
}

export async function createCohortWithNumFilter(
  parentCohort: Cohort,
  labelOne: string,
  labelTwo: string,
  attribute: string,
  ranges: Array<INumRange>,
): Promise<Cohort> {
  const params: ICohortDBWithNumFilterParams = {
    cohortId: parentCohort.dbId,
    name: combineLabelsForDB(labelOne, labelTwo),
    attribute,
    ranges,
  };
  log.debug('try new cohort num filter: ', params);
  const dbId = await cohortCreationDBHandler(createDBCohortWithNumFilter, params);

  const newFilter = getLegacyRangeFilter(parentCohort.filters, attribute, ranges[0]);

  // ATTENTION : database != databaseName
  const cht = new Cohort(
    { id: `${dbId}`, dbId, labelOne, labelTwo },
    [ranges],
    {
      database: parentCohort.database,
      schema: parentCohort.schema,
      table: parentCohort.table,
      view: parentCohort.view,
      idType: parentCohort.idType,
      idColumn: parentCohort.idColumn,
    },
    newFilter,
  );
  log.debug('new cohort with num filter: ', cht);
  return cht;
}

export async function createCohortWithGeneNumFilter(
  parentCohort: Cohort,
  labelOne: string,
  labelTwo: string,
  table: string,
  attribute: string,
  ensg: string,
  ranges: Array<INumRange>,
): Promise<Cohort> {
  const params: ICohortDBWithGeneNumFilterParams = {
    cohortId: parentCohort.dbId,
    name: combineLabelsForDB(labelOne, labelTwo),
    table,
    attribute,
    ensg,
    ranges,
  };
  log.debug('try new cohort gene num filter: ', params);
  const dbId = await cohortCreationDBHandler(createDBCohortWithGeneNumFilter, params);

  // const newFilter = getLegacyRangeFilter(parentCohort.filters, attribute, ranges[0]);
  const newFilter = parentCohort.filters;

  // ATTENTION : database != databaseName
  const cht = new Cohort(
    { id: `${dbId}`, dbId, labelOne, labelTwo },
    [ranges],
    {
      database: parentCohort.database,
      schema: parentCohort.schema,
      table: parentCohort.table,
      view: parentCohort.view,
      idType: parentCohort.idType,
      idColumn: parentCohort.idColumn,
    },
    newFilter,
  );
  log.debug('new cohort with gene num filter: ', cht);
  return cht;
}

export async function createCohortWithGeneEqualsFilter(
  parentCohort: Cohort,
  labelOne: string,
  labelTwo: string,
  table: string,
  attribute: string,
  ensg: string,
  numeric: 'true' | 'false',
  values: Array<string> | Array<number>,
): Promise<Cohort> {
  const params: ICohortDBWithGeneEqualsFilterParams = {
    cohortId: parentCohort.dbId,
    name: combineLabelsForDB(labelOne, labelTwo),
    table,
    attribute,
    ensg,
    numeric,
    values,
  };
  log.debug('try new cohort gene equals filter: ', params);
  const dbId = await cohortCreationDBHandler(createDBCohortWithGeneEqualsFilter, params);

  // const newFilter = getLegacyEqualsFilter(parentCohort.filters, attribute, values[0].toString());
  const newFilter = parentCohort.filters;

  // ATTENTION : database != databaseName
  const cht = new Cohort(
    { id: `${dbId}`, dbId, labelOne, labelTwo },
    [{ values }],
    {
      database: parentCohort.database,
      schema: parentCohort.schema,
      table: parentCohort.table,
      view: parentCohort.view,
      idType: parentCohort.idType,
      idColumn: parentCohort.idColumn,
    },
    newFilter,
  );
  log.debug('new cohort with gene equals filter: ', cht);
  return cht;
}

export async function createCohortWithDepletionScoreFilter(
  parentCohort: Cohort,
  labelOne: string,
  labelTwo: string,
  table: string,
  attribute: string,
  ensg: string,
  depletionscreen: string,
  ranges: Array<INumRange>,
): Promise<Cohort> {
  const params: ICohortDBWithDepletionScoreFilterParams = {
    cohortId: parentCohort.dbId,
    name: combineLabelsForDB(labelOne, labelTwo),
    table,
    attribute,
    ensg,
    ranges,
    depletionscreen,
  };
  log.debug('try new cohort depletion score filter: ', params);
  const dbId = await cohortCreationDBHandler(createDBCohortWithDepletionScoreFilter, params);

  // const newFilter = getLegacyRangeFilter(parentCohort.filters, attribute, ranges[0]);
  const newFilter = parentCohort.filters;

  // ATTENTION : database != databaseName
  const cht = new Cohort(
    { id: `${dbId}`, dbId, labelOne, labelTwo },
    [ranges],
    {
      database: parentCohort.database,
      schema: parentCohort.schema,
      table: parentCohort.table,
      view: parentCohort.view,
      idType: parentCohort.idType,
      idColumn: parentCohort.idColumn,
    },
    newFilter,
  );
  log.debug('new cohort with depletion score filter: ', cht);
  return cht;
}

export async function createCohortWithPanelAnnotationFilter(
  parentCohort: Cohort,
  labelOne: string,
  labelTwo: string,
  panel: string,
  values: Array<string>,
): Promise<Cohort> {
  const params: ICohortDBWithPanelAnnotationFilterParams = {
    cohortId: parentCohort.dbId,
    name: combineLabelsForDB(labelOne, labelTwo),
    panel,
    values,
  };
  log.debug('try new cohort panel annotation filter: ', params);
  const dbId = await cohortCreationDBHandler(createDBCohortWithPanelAnnotationFilter, params);

  // const newFilter = getLegacyEqualsFilter(parentCohort.filters, panel, values[0].toString());
  const newFilter = parentCohort.filters;

  // ATTENTION : database != databaseName
  const cht = new Cohort(
    { id: `${dbId}`, dbId, labelOne, labelTwo },
    [{ values }],
    {
      database: parentCohort.database,
      schema: parentCohort.schema,
      table: parentCohort.table,
      view: parentCohort.view,
      idType: parentCohort.idType,
      idColumn: parentCohort.idColumn,
    },
    newFilter,
  );
  log.debug('new cohort with panel annotation filter: ', cht);
  return cht;
}

async function cohortCreationDBHandler<T>(
  craeteDBCohortMethod: ICreateMethod<T>,
  params:
    | ICohortDBParams
    | ICohortDBWithEqualsFilterParams
    | ICohortDBWithNumFilterParams
    | ICohortDBWithGeneNumFilterParams
    | ICohortDBWithDepletionScoreFilterParams
    | ICohortDBWithPanelAnnotationFilterParams
    | ICohortDBWithTreatmentFilterParams,
): Promise<number> {
  let dbId: number;
  try {
    let idResp = null;
    idResp = await craeteDBCohortMethod(params);
    log.debug('id of new cohort: ', idResp);
    if (idResp && idResp.length === 1) {
      dbId = Number(idResp[0]);
    }
  } catch (e) {
    handleDataSaveError(e);
  } // end of try-catch

  return dbId;
}

function combineLabelsForDB(labelOne: string, labelTwo: string): string {
  return `${labelOne}${valueListDelimiter}${labelTwo}`;
}

function splitLabelsFromDB(name: string): { labelOne: string; labelTwo: string } {
  const split = name.split(valueListDelimiter);
  // console.log('name, labels:', {name, split});
  return {
    labelOne: split[0],
    labelTwo: split[1],
  };
}

export function createCohortFromDB(data: ICohortRow, provJSON: IProvAttrAndValuesCohort): Cohort {
  // ATTENTION : database != databaseName
  const labels = splitLabelsFromDB(data.name);
  const isInitial = data.is_initial === 1;

  const basicValues: ICohortClassBasicValues = {
    id: `${data.id}`,
    dbId: data.id,
    labelOne: labels.labelOne,
    labelTwo: labels.labelTwo,
  };
  const databaseValues: ICohortClassDatabaseValues = {
    database: provJSON.database,
    schema: data.entity_schema,
    table: data.entity_table,
    view: provJSON.view,
    idType: provJSON.idType,
    idColumn: provJSON.idColumn,
  };

  const cht = new Cohort(basicValues, provJSON.values, databaseValues, { normal: {}, lt: {}, lte: {}, gt: {}, gte: {} }, null, isInitial);
  const test = cht.size;
  // cht.selected = provJSON.selected;
  return cht;
}

export enum cloneFilterTypes {
  none,
  equals,
  range,
  geneScoreRange,
  geneScoreEquals,
  depletionScoreRange,
  panelAnnotation,
}

export interface ICohortClassBasicValues {
  id: string;
  dbId: number;
  labelOne: string;
  labelTwo: string;
}

export interface ICohortClassDatabaseValues {
  database: string;
  schema: string;
  table: string;
  view: string;
  idType: IDTypeLike;
  idColumn: IServerColumn;
}

export class Cohort implements ICohort {
  // public from interface
  public id: string;

  public dbId: number;

  public label: string;

  private _labelOne: string;

  private _labelTwo: string;

  public representation: ICohortRep;

  public isInitial: boolean;

  public values: Array<INumRange[] | IEqualsList>;

  public isClone: boolean;

  public colorTaskView: string = null;

  private _sizeReference: number;

  public usedFilter: cloneFilterTypes;

  public usedFilterParams:
    | ICohortEqualsFilterParams
    | ICohortNumFilterParams
    | ICohortGeneNumFilterParams
    | ICohortDepletionScoreFilterParams
    | ICohortPanelAnnotationFilterParams;

  // private, because in the set function the size of the cohort will be calculated anew
  private _database: string;

  private _schema: string;

  private _view: string;

  private _table: string;

  private _size: number;

  private _parents: Array<IElement>;

  private _children: Array<IElement>;

  private _parentCohorts: Array<Cohort>;

  private _filters: IAllFilters;

  private _selected = false;

  private _hasFilterConflict = false;

  private _bloodline: IBloodlineElement[] = [];

  public readonly idType: IDType;

  public readonly idColumn: IServerColumn;

  constructor(
    basicValues: ICohortClassBasicValues,
    values: Array<INumRange[] | IEqualsList>,
    databaseValues: ICohortClassDatabaseValues,
    filters: IAllFilters = { normal: {}, lt: {}, lte: {}, gt: {}, gte: {} },
    sizeReference: number = null,
    isInitial = false,
  ) {
    this.id = basicValues.id;
    this.dbId = basicValues.dbId;
    this._labelOne = basicValues.labelOne;
    this._labelTwo = basicValues.labelTwo;
    this._combineLabels(false);

    this._database = databaseValues.database;
    this._schema = databaseValues.schema;
    this._view = databaseValues.view;
    this._table = databaseValues.table;
    this.idColumn = databaseValues.idColumn;
    this.idType = databaseValues.idType ? IDTypeManager.getInstance().resolveIdType(databaseValues.idType) : undefined;

    this._children = [];
    this._parents = [];
    this._parentCohorts = [];
    this.sizeReference = sizeReference;
    this.representation = null;
    this.isInitial = isInitial;
    this.isClone = false;
    this._size = undefined;
    this.values = values;
    this._filters = deepCopy(filters);
    this._checkForFilterConflict();
  }

  private _checkForFilterConflict() {
    if (this.filters === null) {
      this._hasFilterConflict = true;
    } else {
      this._hasFilterConflict = false;
    }
    this._size = undefined;
  }

  public hasfilterConflict(): boolean {
    // return this._hasFilterConflict;
    return false; // TODO remove legacy code with the filter object and filter conflict check
  }

  private _combineLabels(updateDBCohort = true) {
    this.label = `${this._labelOne}: ${this._labelTwo}`;
    // console.log('combineLabels', {updateDBCohort, l1: this._labelOne, l2: this._labelTwo});
    if (updateDBCohort) {
      updateCohortName({ cohortId: this.dbId, name: combineLabelsForDB(this.labelOne, this.labelTwo) });
    }
  }

  public setLabels(labelOne: string, labelTwo: string) {
    this._labelOne = labelOne;
    this._labelTwo = labelTwo;
    this._combineLabels();
    if (this.representation !== null && this.representation !== undefined) {
      this.representation.setLabel(this._labelOne, this._labelTwo);
    }
  }

  public get labelOne(): string {
    return this._labelOne;
  }

  public get labelTwo(): string {
    return this._labelTwo;
  }

  /**
   * Creates the label as a string with HTML elements for the # and cht_number to be bold and smaller
   * @returns HTML formatted cohort label
   */
  public getHTMLLabel(): string {
    const currLabel = this.label;
    let labelOneHTML = currLabel;
    const [labelOneCounter] = currLabel.split(' ', 1);
    if (labelOneCounter.startsWith('#')) {
      const labelOneText = currLabel.substring(labelOneCounter.length + 1);
      labelOneHTML = `<span style="font-weight: 700;"><span style="font-size: 0.8em; font-weight: 700;">#</span><span style="font-size: 0.9em; font-weight: 700;">${labelOneCounter.substring(
        1,
      )}</span></span> ${labelOneText}`;
    }

    return labelOneHTML;
  }

  public set parents(parents: Array<IElement>) {
    this._parents = parents;
    this.updateBloodline();
  }

  public get parents(): Array<IElement> {
    return this._parents;
  }

  /**
   * Returns all parent tasks, which are all the parent elements of this element.
   */
  public getTaskParents(): Array<Task> {
    return this._parents as Task[];
  }

  /**
   * Returns all parent cohorts, which are all the grand-parent elements of this element.
   */
  public getCohortParents(): Array<Cohort> {
    const chtParents: Cohort[] = [];
    for (const p of this._parents) {
      chtParents.push(...(p.parents as Cohort[]));
    }

    if (chtParents.length === 0 && !this.isInitial) {
      chtParents.push(...this._parentCohorts);
    }

    return chtParents;
  }

  public setCohortParents(chtParents: Array<Cohort>) {
    this._parentCohorts = chtParents;
  }

  public set children(children: Array<IElement>) {
    this._children = children;
  }

  public get children(): Array<IElement> {
    return this._children;
  }

  /**
   * Returns all children tasks, which are all the children elements of this element.
   */
  public getTaskChildren(): Array<Task> {
    return this._children as Task[];
  }

  /**
   * Returns all children cohorts, which are all the grand-children elements of this element.
   */
  public getCohortChildren(): Array<Cohort> {
    const chtChildren: Cohort[] = [];
    for (const p of this._children) {
      chtChildren.push(...(p.children as Cohort[]));
    }
    return chtChildren;
  }

  public set database(database: string) {
    this._database = database;
    this._size = undefined;
  }

  public get database(): string {
    return this._database;
  }

  public set schema(schema: string) {
    this._schema = schema;
    this._size = undefined;
  }

  public get schema(): string {
    return this._schema;
  }

  public set view(view: string) {
    this._view = view;
    this._size = undefined;
  }

  public get view(): string {
    return this._view;
  }

  public get table(): string {
    return this._table;
  }

  public set table(table: string) {
    this._table = table;
    this._size = undefined;
  }

  public get filters(): IAllFilters {
    return this._filters;
  }

  public set filters(filters: IAllFilters) {
    this._filters = deepCopy(filters);
    this._size = undefined;
    this._checkForFilterConflict();
  }

  public get sizeReference(): number {
    return this._sizeReference;
  }

  public set sizeReference(value: number) {
    this._sizeReference = value;
  }

  public get size(): Promise<number> {
    if (this._size === undefined) {
      return this._fetchSize().then((size) => {
        this._size = size; // first set size here
        return this._size; // then return
      });
    }
    return Promise.resolve(this._size); // return resolved promise --> nothing to do
  }

  public getRetrievedSize(): number {
    return this._size;
  }

  public get data(): Promise<IRow[]> {
    return this._fetchData();
  }

  public get selected(): boolean {
    return this._selected;
  }

  public set selected(selected: boolean) {
    this._selected = selected;
    if (this.representation) {
      this.representation.setSelection(this._selected);
    }
  }

  private async _fetchSize(): Promise<number> {
    const params: ICohortDBSizeParams = {
      cohortId: this.dbId,
    };
    try {
      if (this.isClone) {
        if (this.usedFilter === cloneFilterTypes.none) {
          return await getCohortSize(params);
        }
        if (this.usedFilter === cloneFilterTypes.equals) {
          return await sizeDBCohortWithEqualsFilter(this.usedFilterParams as ICohortEqualsFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.range) {
          return await sizeDBCohortWithNumFilter(this.usedFilterParams as ICohortNumFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.geneScoreRange) {
          return await sizeDBCohortGeneWithNumFilter(this.usedFilterParams as ICohortGeneNumFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.geneScoreEquals) {
          return await sizeDBCohortGeneWithEqualsFilter(this.usedFilterParams as ICohortGeneEqualsFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.depletionScoreRange) {
          return await sizeDBCohortDepletionScoreFilter(this.usedFilterParams as ICohortDepletionScoreFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.panelAnnotation) {
          return await sizeDBCohortPanelAnnotationFilter(this.usedFilterParams as ICohortPanelAnnotationFilterParams);
        }
      } else {
        return await getCohortSize(params);
      }
    } catch (e) {
      handleDataLoadError(e);
    }
  }

  private async _fetchData(): Promise<IRow[]> {
    const params: ICohortDBDataParams = {
      cohortId: this.dbId,
    };
    try {
      if (this.isClone) {
        if (this.usedFilter === cloneFilterTypes.none) {
          return await getCohortData(params);
        }
        if (this.usedFilter === cloneFilterTypes.equals) {
          return await dataDBCohortWithEqualsFilter(this.usedFilterParams as ICohortEqualsFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.range) {
          return await dataDBCohortWithNumFilter(this.usedFilterParams as ICohortNumFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.geneScoreRange) {
          return await dataDBCohortGeneWithNumFilter(this.usedFilterParams as ICohortGeneNumFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.geneScoreEquals) {
          return await dataDBCohortGeneWithEqualsFilter(this.usedFilterParams as ICohortGeneEqualsFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.depletionScoreRange) {
          return await dataDBCohortDepletionScoreFilter(this.usedFilterParams as ICohortDepletionScoreFilterParams);
        }
        if (this.usedFilter === cloneFilterTypes.panelAnnotation) {
          return await dataDBCohortPanelAnnotationFilter(this.usedFilterParams as ICohortPanelAnnotationFilterParams);
        }
      } else {
        log.debug('fetch cohort data');
        const data = await getCohortData(params);
        return data;
      }
    } catch (e) {
      handleDataLoadError(e);
    }
  }

  // filter method and params for the function
  clone(
    usedFilter: cloneFilterTypes,
    filterParams:
      | ICohortEqualsFilterParams
      | ICohortNumFilterParams
      | ICohortGeneNumFilterParams
      | ICohortGeneEqualsFilterParams
      | ICohortDepletionScoreFilterParams
      | ICohortPanelAnnotationFilterParams,
  ): Cohort {
    const clone = new Cohort(
      { id: `${this.id}-clone#${UniqueIdManager.getInstance().uniqueId('cht:cohort')}`, dbId: this.dbId, labelOne: this.labelOne, labelTwo: this.labelTwo },
      this.values,
      { database: this.database, schema: this.schema, table: this.table, view: this.view, idType: this.idType, idColumn: this.idColumn },
      this.filters,
      this.sizeReference,
    );
    clone.isClone = true;
    clone.usedFilterParams = filterParams;
    clone.usedFilter = usedFilter;
    return clone;
  }

  // the last element in the bloodline is alway the root cohort
  private _getHeritage(heritage: Array<any>, currElem: IElement): { obj: IElement; elemType: string; label: string; size: number }[] {
    // add current element
    heritage.push(this._createHeritageElement(currElem));
    // go through all parents and add them
    if (currElem.parents.length > 0) {
      for (const elem of currElem.parents) {
        heritage.concat(this._getHeritage(heritage, elem));
      }
    }

    return heritage;
  }

  private _createHeritageElement(currElem: IElement): { obj: IElement; elemType: string; label: string; size: number } {
    const tmp = {
      obj: currElem,
      elemType: 'task',
      label: currElem.label,
      size: 0,
    };

    if (currElem instanceof Cohort) {
      tmp.elemType = 'cohort';
      tmp.size = currElem.getRetrievedSize();
    }

    return tmp;
  }

  public getBloodline(): IBloodlineElement[] {
    if (this._bloodline.length === 0) {
      // create bloodline
      this.updateBloodline();
    }
    return this._bloodline;
  }

  public updateBloodline() {
    this._bloodline = this._getHeritage([], this);
  }

  public toProvenanceJSON(): IElementProvJSONCohort {
    return {
      id: this.id,
      type: ElementProvType.Cohort,
      label: this.label,
      parent: this._parents.map((elem) => elem.id),
      children: this._children.map((elem) => elem.id),
      attrAndValues: {
        values: this.values,
        view: this._view,
        database: this._database,
        idType: this.idType,
        idColumn: this.idColumn,
        selected: this._selected,
        isRoot: false,
      },
    };
  }
}

export interface IBloodlineElement {
  obj: IElement;
  elemType: string;
  label: string;
  size: number;
}

export const EMPTY_COHORT_ID = '--EMPTY--';
export function getEmptyCohort(parent: Cohort) {
  const cht = new Cohort({ id: EMPTY_COHORT_ID, dbId: NaN, labelOne: 'Empty', labelTwo: '' }, null, {
    database: null,
    schema: null,
    table: null,
    view: null,
    idType: undefined,
    idColumn: null,
  });
  cht.setCohortParents([parent]);
  return cht;
}

export const LOADER_COHORT_ID = '--LOADING--';
export function getLoaderCohort(parent: Cohort) {
  const cht = new Cohort({ id: LOADER_COHORT_ID, dbId: NaN, labelOne: 'Loading', labelTwo: '' }, null, {
    database: null,
    schema: null,
    table: null,
    view: null,
    idType: undefined,
    idColumn: null,
  });
  cht.setCohortParents([parent]);
  return cht;
}

export function getCohortLabel(cht: Cohort) {
  return cht.label;
}

export function getCohortLabels(cohorts: Cohort[]) {
  return cohorts.map((cht) => getCohortLabel(cht));
}
