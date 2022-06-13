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
        trainTypeData: data[6],
        trainVehicleData: data[7],
        operatorData: data[8],
        airportData: data[9],
        flightStatusData: data[10],
        poiData: data[11]
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
