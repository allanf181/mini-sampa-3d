import {loadJSON, saveJSON} from './helpers';

export default async function() {

    const data = await loadJSON('data/poi.json');

    saveJSON('public/data/poi.json.gz', data);

    console.log('POI data was loaded');

}
