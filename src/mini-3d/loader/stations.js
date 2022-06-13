import {buildLookup} from '../helpers';
import {loadJSON, saveJSON} from './helpers';

const WIKIPEDIA_URL = 'https://pt.wikipedia.org/w/api.php';
const WIKIPEDIA_PARAMS = 'format=json&action=query&prop=pageimages&pithumbsize=128';

export default async function() {

    const [stationGroupData, data] = await Promise.all([
        'data/station-groups.json',
        'data/stations.json',
    ].map(loadJSON));

    const lookup = buildLookup(data);

    const stationGroupIDLookup = {};

    for (const groups of stationGroupData) {
        for (const stationID of [].concat(...groups)) {
            stationGroupIDLookup[stationID] = groups[0][0];
        }
    }
    for (const station of data) {
        const {id, altitude} = station,
            stationGroupID = stationGroupIDLookup[id];

        station.group = `${stationGroupID || id}.${altitude < 0 ? 'ug' : 'og'}`;
    }

    const stationLists = [[]];
    const stationIDLookup = {};

    for (const {id, title} of data) {
        const stations = stationLists[stationLists.length - 1];
        const titlePt = title['pt-Wiki'] || `${title['pt']}`;

        stationIDLookup[titlePt] = stationIDLookup[titlePt] || [];
        stationIDLookup[titlePt].push(id);
        stations.push(titlePt);
        if (stations.length >= 50) {
            stationLists.push([]);
        }
    }
    (await Promise.all(stationLists.map(stations =>
        loadJSON(`${WIKIPEDIA_URL}?${WIKIPEDIA_PARAMS}&titles=${stations.join('|').replace(/undefined\|/g,"")}`)
    ))).forEach((result) => {
        const {pages} = result.query;

        for (const id in pages) {
            const {title, thumbnail} = pages[id];

            if (thumbnail) {
                for (const id of stationIDLookup[title]) {
                    lookup[id].thumbnail = thumbnail.source;
                }
            } else if (lookup[id] && lookup[id].coord) {
                console.log(`No thumbnail: ${id}`);
            }
        }
    });

    saveJSON('public/data/stations.json.gz', data);

    console.log('Station data was loaded');

    return lookup;

}
