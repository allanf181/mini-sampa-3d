import {loadJSON, saveJSON} from './helpers';

export default async function() {

    const data = await loadJSON('data/flight-statuses.json');

    saveJSON('public/data/flight-statuses.json.gz', data);

    console.log('Flight status data was loaded');

}
