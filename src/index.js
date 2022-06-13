import mt3d from './mini-3d'
import precipitation from "./precipitation";

const matchLang = location.search.match(/lang=(.*?)(&|$)/),
    matchSelection = location.search.match(/selection=(.*?)(&|$)/),
    lang = matchLang ? decodeURIComponent(matchLang[1]) : undefined,
    selection = matchSelection ? decodeURIComponent(matchSelection[1]) : undefined;
    new mt3d.Map({
        lang,
        container: 'map',
        selection,
        plugins: [precipitation()]
    });
