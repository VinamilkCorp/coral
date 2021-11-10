import * as aq from 'arquero';
import * as LineUpJS from 'lineupjs';
import { colors } from '../../colors';
import { getCohortData } from '../../rest';
import { CohortColorSchema, getAnimatedLoadingText } from '../../util';
import { getIdTypeFromCohort } from '../../utilIdTypes';
import { DATA_LABEL } from '../visualizations';
import { ATask } from './ATask';
export class Details extends ATask {
    constructor() {
        super(...arguments);
        this.label = `Inspect Items`;
        this.id = `details`;
        this.hasOutput = false;
        this.eventID = 0;
        this._entityName = null;
    }
    supports(attributes, cohorts) {
        return cohorts.length > 0;
    }
    showSearchBar() {
        return true;
    }
    async show(columnHeader, container, attributes, cohorts) {
        super.show(columnHeader, container, attributes, cohorts);
        const eventId = ++this.eventID; // get new eventID, we will compare it with the field again to see if it is still up to date
        if (cohorts.length > 0) {
            this.$lineUpContainer = this.body.append('div').classed('lineup-container', true).node();
            this.$lineUpContainer.insertAdjacentElement('beforeend', getAnimatedLoadingText('data'));
            const data = await this.getData(attributes, cohorts);
            if (eventId !== this.eventID) {
                return;
            }
            this.createLineup(data, attributes, cohorts);
        }
    }
    async getData(attributes, cohorts) {
        const idType = getIdTypeFromCohort(cohorts[0]);
        this._entityName = idType.entityName;
        const dataPromises = cohorts
            .map((cht) => {
            const promise = new Promise(async (resolve, reject) => {
                const chtDataPromises = attributes.map((attr) => attr.getData(cht.dbId));
                if (attributes.length === 0) { // If Lineup is empty, add entityName as single attribute to be able to show something
                    chtDataPromises.push(getCohortData({ cohortId: cht.dbId, attribute: idType.entityName }));
                }
                try {
                    const chtData = await Promise.all(chtDataPromises); // array with one entry per attribute, which contains an array with one value for every item in the cohort
                    let joinedData = aq.from(chtData[0]);
                    for (let i = 1; i < chtData.length; i++) {
                        joinedData = joinedData.join_full(aq.from(chtData[i]));
                    }
                    const labelTable = aq.table({ [DATA_LABEL]: [['' + cht.dbId]], ['id_' + cht.dbId]: ['true'] });
                    joinedData = joinedData.join_left(labelTable, (data, label) => true);
                    resolve(joinedData.objects());
                }
                catch (e) {
                    reject(e);
                }
            });
            return promise;
        });
        const longData = (await Promise.all(dataPromises)).flat();
        const map = new Map();
        for (const item of longData) {
            let storedItem = map.get(item[this._entityName]);
            if (storedItem) {
                storedItem[DATA_LABEL].push(...item[DATA_LABEL]);
                storedItem = Object.assign(item, storedItem);
            }
            else {
                storedItem = item;
                storedItem[DATA_LABEL] = storedItem[DATA_LABEL].slice(); // clone as all items use the same object
            }
            map.set(item[this._entityName], storedItem);
        }
        const data = Array.from(map.values());
        return data;
    }
    async createLineup(data, attributes, cohorts) {
        const builder = LineUpJS.builder(data);
        // define id column
        builder
            .column(LineUpJS.buildStringColumn(this._entityName).label('Id').width(120))
            .column(LineUpJS
            .buildCategoricalColumn(DATA_LABEL, cohorts.map((cht) => ({ name: '' + cht.dbId, label: cht.label, color: cht.colorTaskView })))
            .renderer('catheatmap', 'categorical')
            .asSet());
        // define attribute columns
        for (const attr of attributes) {
            attr.type = attr.dataKey === this._entityName ? 'string' : attr.type;
            if (attr.type === 'categorical') {
                builder
                    .column(LineUpJS.buildCategoricalColumn(attr.dataKey).label(attr.label));
            }
            else if (attr.type === 'number') {
                builder.column(LineUpJS.buildNumberColumn(attr.dataKey).label(attr.label).colorMapping(colors.barColor));
            }
            else { // text
                builder.column(LineUpJS.buildStringColumn(attr.dataKey).label(attr.label).width(100));
            }
        }
        // builder.sidePanel(true); // sets side panel https://lineup.js.org/master/docs/classes/_builder_databuilder_.databuilder.html#sidepanel
        // builder.summaryHeader(false); // sets the summary header for each column
        // builder.defaultRanking(false); // sets selection,rank, and aggregation columns
        builder.rowHeight(21);
        builder.singleSelection(); // only single selection possible
        this.$lineUpContainer.firstChild.remove();
        const lineup = builder.build(this.$lineUpContainer);
    }
    getCategoryColorsForColumn(mergedDataArray, attr) {
        const uniqueCat = Array.from(new Set(mergedDataArray.map((elem) => elem[attr.dataKey])));
        const categoryColors = uniqueCat.map((cat, i) => { return { name: cat, color: CohortColorSchema.get(i) }; });
        // log.debug('unique categories for "',attr.dataKey,'" : ', categoryColors);
        return categoryColors;
    }
}
//# sourceMappingURL=Details.js.map