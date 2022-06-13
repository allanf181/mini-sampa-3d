import {loadJSON, saveJSON} from './helpers';

export default async function() {

    const data = await loadJSON('data/train-types.json');

    saveJSON('public/data/train-types.json.gz', data);

    console.log('Train type data was loaded');

}
