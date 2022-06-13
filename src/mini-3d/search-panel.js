import AnimatedPopup from 'mapbox-gl-animated-popup';
import Swiper, {Pagination} from 'swiper';
import configs from './configs';
import {createElement, includes, loadJSON} from './helpers';
import {emptyFeatureCollection, featureFilter} from './helpers-geojson';
import {getBounds} from './helpers-mapbox';
import Panel from './panel';

export default class extends Panel {

    constructor(options) {
        super(Object.assign({className: 'search-panel'}, options));
    }

    addTo(map) {
        const me = this,
            {lang, dict} = map,
            date = map.clock.getBRTDate(),
            currMonth = date.getMonth() + 1,
            currDate = date.getDate(),
            currHours = date.getHours(),
            currMinutes = date.getMinutes();

        map.trackObject();

        super.addTo(map)
            .setHTML(`
<div id="search-form">
    <div class="search-form-element">${dict['from-station']} <input id="origin" class="search-input" type="text" list="stations"></div>
    <div class="search-form-element">${dict['to-station']} <input id="destination" class="search-input" type="text" list="stations"></div>
    <div class="search-form-element">
        <select id="type" class="search-select">
            <option value="departure" selected>${dict['depart-at']}</option>
        </select>
        <select id="month" class="search-select">
            <option value="${currMonth}" selected>${date.toLocaleDateString(lang, {month: 'short'})}</option>
        </select>
        <select id="date" class="search-select">
            <option value="${currDate}" selected>${date.toLocaleDateString(lang, {day: 'numeric'})}</option>
        </select>
        <select id="hours" class="search-select"></select>
        <select id="minutes" class="search-select"></select>
    </div>
    <div class="search-form-element"><button id="search-button" class="search-button">${dict['search-route']}</button></div>
</div>
<div id="search-load">
    <div class="ball-pulse"><div></div><div></div><div></div></div>
</div>
<div id="search-result" class="swiper-container">
    <div class="swiper-wrapper"></div>
    <div class="swiper-pagination"></div>
</div>`);

        const container = me._container,
            originElement = container.querySelector('#origin'),
            destinationElement = container.querySelector('#destination'),
            hoursElement = container.querySelector('#hours'),
            minutesElement = container.querySelector('#minutes'),
            searchButtonElement = container.querySelector('#search-button');

        const onInput = ({target}) => {
            target.style.borderColor = '#777';
            if (target.value) {
                delete me.focus;
                target.classList.remove('search-focus');
            } else {
                me.focus = target.id;
                target.classList.add('search-focus');
            }
        };
        const onFocus = ({target}) => {
            originElement.classList.remove('search-focus');
            destinationElement.classList.remove('search-focus');
            me.focus = target.id;
            target.classList.add('search-focus');
        };

        originElement.addEventListener('input', onInput);
        originElement.addEventListener('focus', onFocus);
        destinationElement.addEventListener('input', onInput);
        destinationElement.addEventListener('focus', onFocus);

        originElement.placeholder = dict['station-name'];
        destinationElement.placeholder = dict['station-name'];

        for (let i = 0; i < 24; i++) {
            date.setHours(i);
            createElement('option', {
                value: i,
                text: date.toLocaleTimeString(lang, {hour: 'numeric'}),
                selected: i === currHours
            }, hoursElement);
        }
        for (let i = 0; i < 60; i++) {
            date.setMinutes(i);
            createElement('option', {
                value: i,
                text: `${date.toLocaleTimeString(lang, {minute: 'numeric'})}${dict['minute']}`,
                selected: i === currMinutes
            }, minutesElement);
        }

        searchButtonElement.addEventListener('click', () => {
            const origin = map.stationTitleLookup[originElement.value.toUpperCase()],
                destination = map.stationTitleLookup[destinationElement.value.toUpperCase()],
                type = container.querySelector('#type').value,
                month = container.querySelector('#month').value,
                date = container.querySelector('#date').value,
                hours = hoursElement.value,
                minutes = minutesElement.value;

            delete me.focus;
            originElement.classList.remove('search-focus');
            destinationElement.classList.remove('search-focus');

            if (!origin || !destination || origin === destination) {
                originElement.style.borderColor = origin && origin !== destination ? '#777' : '#f90';
                destinationElement.style.borderColor = destination && origin !== destination ? '#777' : '#f90';
                return;
            }

            originElement.style.borderColor = '#777';
            destinationElement.style.borderColor = '#777';

            container.classList.remove('search-form');
            container.classList.add('search-load');

            loadJSON(`${configs.searchUrl}?origin=${origin.id}&destination=${destination.id}&type=${type}&month=${month}&date=${date}&hours=${hours}&minutes=${minutes}`).then(data => {
                container.classList.remove('search-load');
                me.showResult(data);
            });
        });

        me.showForm();

        if (!map.touchDevice) {
            // Set focus after transition (workaround for Safari)
            container.addEventListener('transitionend', () => {
                originElement.focus();
            }, {once: true});
        } else {
            me.focus = 'origin';
            originElement.classList.add('search-focus');
        }

        me.popups = [];

        return me;
    }

    showForm() {
        const me = this;

        me.setTitle(me._map.dict['route-search'])
            .setButtons();
        me._container.classList.add('search-form');
    }

    fillStationName(name) {
        const me = this;

        if (me.focus) {
            const container = me._container;
            let focusedElement = container.querySelector(`#${me.focus}`);

            focusedElement.style.borderColor = '#777';
            focusedElement.value = name;
            focusedElement.classList.remove('search-focus');
            me.focus = me.focus === 'origin' ? 'destination' : 'origin';
            focusedElement = container.querySelector(`#${me.focus}`);
            if (!focusedElement.value) {
                focusedElement.classList.add('search-focus');
                if (!me._map.touchDevice) {
                    focusedElement.focus();
                }
            } else {
                delete me.focus;
            }
        }
    }

    showResult(result) {
        const me = this,
            map = me._map,
            {lang, dict, clock} = map,
            container = me._container,
            backButton = createElement('div', {
                innerHTML: [
                    '<button id="back-button" class="back-button">',
                    '<span class="back-icon"></span>',
                    '</button>'
                ].join('')
            }),
            pageController = createElement('div', {
                className: 'page-controller',
                innerHTML: [
                    '<span><button id="previous-button" class="previous-button">',
                    '<span class="previous-icon"></span>',
                    '</button></span>',
                    '<span><button id="next-button" class="next-button">',
                    '<span class="next-icon"></span>',
                    '</button></span>'
                ].join('')
            }),
            swiperElement = container.querySelector('.swiper-wrapper');

        me._result = result;

        map._setSearchMode('route');

        container.classList.add('search-result');

        backButton.addEventListener('click', event => {
            event.stopPropagation();
        });
        backButton.querySelector('#back-button').addEventListener('click', () => {
            if (me._swiper) {
                me._swiper.destroy();
                delete me._swiper;
                me.hideRoute();
            }
            container.classList.remove('search-result');
            me.showForm();
            map._setSearchMode('edit');
            map.refreshMap();
        });

        pageController.addEventListener('click', event => {
            event.stopPropagation();
        });
        pageController.querySelector('#previous-button').addEventListener('click', () => {
            me._swiper.slidePrev();
        });
        pageController.querySelector('#next-button').addEventListener('click', () => {
            me._swiper.slideNext();
        });

        swiperElement.innerHTML = '';

        if (result.routes) {
            me.setButtons([backButton, pageController]);

            for (const route of result.routes) {
                const slideElement = createElement('div', {
                        className: 'swiper-slide',
                        innerHTML: [
                            '<div class="swiper-slide-content">',
                            '<div id="search-routes"></div>',
                            '<svg id="railway-mark"></svg>',
                            '</div>'
                        ].join('')
                    }, swiperElement),
                    routesElement = slideElement.querySelector('#search-routes'),
                    railwayMarkElement = slideElement.querySelector('#railway-mark'),
                    sections = [],
                    stations = [],
                    offsets = [];
                let arrivalTime;

                for (const {r, y, ds, d, tt, nm, transfer, delay} of route.trains) {
                    const railwayTitle = nm ? nm.map(name => name[lang] || name.en).join(dict['and']) : map.getLocalizedRailwayTitle(r),
                        trainTypeTitle = map.getLocalizedTrainTypeTitle(y),
                        destinationTitle = ds ? dict['for'].replace('$1', map.getLocalizedStationTitle(ds)) : map.getLocalizedRailDirectionTitle(d),
                        section = {};

                    section.start = stations.length;
                    stations.push([
                        '<div class="station-row">',
                        `<div class="station-title-box">${map.getLocalizedStationTitle(tt[0].s)}</div>`,
                        `<div class="station-time-box${delay ? ' desc-caution' : ''}">`,
                        arrivalTime ? `${clock.getTimeString(clock.getTime(arrivalTime) + delay * 60000)}<br>` : '',
                        clock.getTimeString(clock.getTime(tt[0].d) + delay * 60000),
                        '</div></div>'
                    ].join(''));
                    stations.push([
                        '<div class="station-row">',
                        `<div class="train-title-box">${railwayTitle} ${trainTypeTitle} ${destinationTitle}`,
                        delay ? ` <span class="desc-caution">${dict['delay'].replace('$1', delay)}</span>` : '',
                        '</div></div>'
                    ].join(''));
                    section.end = stations.length;
                    section.color = map.railwayLookup[r].color;
                    sections.push(section);
                    if (transfer === 0) {
                        arrivalTime = tt[tt.length - 1].a;
                    } else {
                        stations.push([
                            '<div class="station-row">',
                            `<div class="station-title-box">${map.getLocalizedStationTitle(tt[tt.length - 1].s)}</div>`,
                            `<div class="station-time-box${delay ? ' desc-caution' : ''}">`,
                            clock.getTimeString(clock.getTime(tt[tt.length - 1].a || tt[tt.length - 1].d) + delay * 60000),
                            '</div></div>'
                        ].join(''));
                        if (transfer > 0) {
                            const section = {};

                            section.start = stations.length - 1;
                            stations.push([
                                '<div class="station-row">',
                                `<div class="train-title-box">${dict['transfer-and-wait'].replace('$1', transfer)}</div>`,
                                '</div>'
                            ].join(''));
                            section.end = stations.length;
                            sections.push(section);
                        }
                        arrivalTime = undefined;
                    }
                }

                routesElement.innerHTML = stations.join('');

                const {children} = routesElement;

                for (let i = 0, ilen = children.length; i < ilen; i++) {
                    const child = children[i];

                    offsets.push(child.offsetTop + child.getBoundingClientRect().height / 2);
                }

                railwayMarkElement.innerHTML = sections.map(({color, start, end}) => color ?
                    `<line stroke="${color}" stroke-width="10" x1="12" y1="${offsets[start]}" x2="12" y2="${offsets[end]}" stroke-linecap="round" />` :
                    `<line stroke="#7f7f7f" stroke-width="4" x1="12" y1="${offsets[start]}" x2="12" y2="${offsets[end]}" stroke-dasharray="4 4" />`
                ).concat(offsets.map((offset, i) =>
                    i % 2 === 0 ? `<circle cx="12" cy="${offset}" r="3" fill="#ffffff" />` : ''
                )).join('');

            }

            me._swiper = new Swiper('.swiper-container', {
                modules: [Pagination],
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true
                }
            });
            me._swiper.on('slideChange', () => {
                me.hideRoute();
            });
            me._swiper.on('slideChangeTransitionEnd', () => {
                me.switchRoute();
            });

            me.switchRoute();
        } else {
            me.setButtons([backButton]);

            swiperElement.innerHTML = [
                '<div class="swiper-slide">',
                '<div class="swiper-slide-content">',
                dict['cannot-find-train'],
                '</div></div>'
            ].join('');
        }
    }

    switchRoute() {
        const me = this,
            map = me._map,
            {dict, map: mbox} = map,
            container = me._container,
            swiper = me._swiper,
            index = swiper.activeIndex,
            route = me._result.routes[index],
            railwaySections = [],
            stationGroups = [],
            coords = [];

        me.setTitle([
            `${dict['route']}${index + 1} `,
            dict['transfers'].replace('$1', route.numTransfers)
        ].join(''));

        container.querySelector('#previous-button').disabled = swiper.isBeginning;
        container.querySelector('#next-button').disabled = swiper.isEnd;

        for (const {r, tt, d} of route.trains) {
            const {stations, ascending} = map.railwayLookup[r];

            for (const {s} of tt) {
                const station = map.stationLookup[s];

                stationGroups.push(station.group);
                coords.push(station.coord);
            }

            if (d === ascending) {
                const start = stations.indexOf(tt[0].s),
                    end = stations.indexOf(tt[tt.length - 1].s, start);

                for (let i = start; i < end; i++) {
                    railwaySections.push(`${r}.${i + 1}`);
                }
            } else {
                const start = stations.lastIndexOf(tt[0].s),
                    end = stations.lastIndexOf(tt[tt.length - 1].s, start);

                for (let i = start; i > end; i--) {
                    railwaySections.push(`${r}.${i}`);
                }
            }
        }

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            let layer = mbox.getLayer(`railways-routeug-${zoom}`).implementation;

            layer.setProps({
                data: featureFilter(map.featureCollection, p =>
                    p.zoom === zoom && p.altitude < 0 && includes(railwaySections, p.section)
                )
            });

            layer = mbox.getLayer(`stations-routeug-${zoom}`).implementation;

            layer.setProps({
                data: featureFilter(map.featureCollection, p =>
                    p.zoom === zoom && p.altitude < 0 && includes(stationGroups, p.group)
                )
            });

            layer = mbox.getLayer(`railways-routeog-${zoom}`).implementation;

            layer.setProps({
                data: featureFilter(map.featureCollection, p =>
                    p.zoom === zoom && p.altitude === 0 && includes(railwaySections, p.section)
                )
            });

            layer = mbox.getLayer(`stations-routeog-${zoom}`).implementation;

            layer.setProps({
                data: featureFilter(map.featureCollection, p =>
                    p.zoom === zoom && p.altitude === 0 && includes(stationGroups, p.group)
                )
            });
        }

        mbox.fitBounds(getBounds(coords), {
            bearing: mbox.getBearing(),
            offset: [0, -mbox.transform.height / 12],
            padding: {top: 20, bottom: 20, left: 10, right: 50},
            linear: true,
            maxZoom: 18
        });
        map.refreshMap();

        const stationIDs = [route.trains[0].tt[0].s];

        for (const train of route.trains) {
            if (train.transfer > 0 || train === route.trains[route.trains.length - 1]) {
                stationIDs.push(train.tt[train.tt.length - 1].s);
            }
        }

        me.popups = stationIDs.map((id, index) => {
            return setTimeout(() => {
                const popup = new AnimatedPopup({
                    className: 'popup-route',
                    closeButton: false,
                    closeOnClick: false
                });

                popup.setLngLat(map.stationLookup[id].coord)
                    .setHTML(index === 0 ? dict['from-station'] : index === stationIDs.length - 1 ? dict['to-station'] : `${dict['transfer']}${index}`)
                    .addTo(mbox);

                me.popups[index] = popup;
            }, index / stationIDs.length * 1000 + 500);
        });
    }

    hideRoute() {
        const me = this,
            mbox = me._map.map;

        for (const zoom of [13, 14, 15, 16, 17, 18]) {
            for (const id of [`railways-routeug-${zoom}`, `stations-routeug-${zoom}`, `railways-routeog-${zoom}`, `stations-routeog-${zoom}`]) {
                mbox.getLayer(id).implementation.setProps({
                    data: emptyFeatureCollection()
                });
            }
        }

        for (const popup of me.popups) {
            if (popup instanceof AnimatedPopup) {
                popup.remove();
            } else {
                clearTimeout(popup);
            }
        }
    }

    remove() {
        this.hideRoute();
        super.remove();
    }

}
