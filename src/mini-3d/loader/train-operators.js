import {loadJSON, saveJSON} from './helpers';

export default async function() {

    const data = await loadJSON('data/train-operators.json');

    saveJSON('public/data/train-operators.json.gz', data);

    console.log('Train operator data was loaded');

}
