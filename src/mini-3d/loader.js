import {loadJSON, removePrefix} from './helpers';

function getTimetableFileName(clock) {
    const calendar = clock.getCalendar() === 'Weekday' ? 'weekday' : 'holiday';

    return `timetable-${calendar}.json.gz`;
}

function getExtraTimetableFileNames(clock) {
    const calendar = clock.getCalendar();

    if (calendar === 'Saturday') {
        return ['timetable-saturday.json.gz'];
    }
    if (calendar === 'Holiday') {
        return ['timetable-sunday-holiday.json.gz'];
    }
    return [];
}

/**
 * Load all the static data.
 * @param {string} dataUrl - Data URL
 * @param {string} lang - IETF language tag for dictionary
 * @param {Clock} clock - Clock object representing the current time
 * @returns {object} Loaded data
 */
export function loadStaticData(dataUrl, lang, clock) {
    const extra = getExtraTimetableFileNames(clock);

    return Promise.all([
        `${dataUrl}/dictionary-${lang}.json`,
        `${dataUrl}/railways.json.gz`,
        `${dataUrl}/stations.json.gz`,
        `${dataUrl}/features.json.gz`,
        `${dataUrl}/${getTimetableFileName(clock)}`,
        `${dataUrl}/rail-directions.json.gz`,
        `${dataUrl}/train-operators.json.gz`,
        `${dataUrl}/train-types.json.gz`,
        `${dataUrl}/train-vehicles.json.gz`,
        `${dataUrl}/operators.json.gz`,
        `${dataUrl}/airports.json.gz`,
        `${dataUrl}/flight-statuses.json.gz`,
        `${dataUrl}/poi.json.gz`,
        ...extra.map(name => `${dataUrl}/${name}`)
    ].map(loadJSON)).then(data => ({
        dict: data[0],
        railwayData: data[1],
        stationData: data[2],
        featureCollection: data[3],
        timetableData: data[4].concat(...data.slice(12)),
        railDirectionData: data[5],
        trainOperatorData: data[6],
        trainTypeData: data[7],
        trainVehicleData: data[8],
        operatorData: data[9],
        airportData: data[10],
        flightStatusData: data[11],
        poiData: data[12]
    }));
}

/**
 * Load the timetable data.
 * @param {string} dataUrl - Data URL
 * @param {Clock} clock - Clock object representing the current time
 * @returns {object} Loaded timetable data
 */
export function loadTimetableData(dataUrl, clock) {
    const extra = getExtraTimetableFileNames(clock);

    return Promise.all([
        `${dataUrl}/${getTimetableFileName(clock)}`,
        ...extra.map(name => `${dataUrl}/${name}`)
    ].map(loadJSON)).then(data => data[0].concat(...data.slice(1)));
}
