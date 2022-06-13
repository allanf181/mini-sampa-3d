const dataFolder = './data/';
const defFolder = `${dataFolder}gen-timetables/`;
const timetableFolder = `${dataFolder}train-timetables/`;
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const genTravelFromInterval = (travel) => {
    const newTimes = [];
    let clock = moment(travel.times[0].from, 'H:mm');
    for (let intervalKey = 0; intervalKey < travel.times.length; intervalKey++) {
        const interval = travel.times[intervalKey];
        do {
            newTimes.push(clock.format('H:mm'));
            clock = clock.add(interval.interval, 'minute');
        } while (clock < moment(interval.to, 'H:mm'));
    }
    return newTimes;
};

const buildTimetable = (num, id, type, stations, exitTimeType, destination, startTime, vehicle) => {
    let nextKey = "nextIn";
    if (destination === stations[0].station){
        stations = stations.slice().reverse();
        nextKey = "previousIn";
    }
    num = num.padStart(4, "0");
    const timetable = {
        "id": `${id}.${num}.${exitTimeType}`,
        "t": `${id}.${num}`,
        "r": id,
        "n": num,
        "y": type,
        "d": destination
            .replace(/LinhaUni|ViaQuatro|ViaMobilidade|Metro|CPTM/g, 'SP')
            .replace(`${id.split('.')[1]}.`, ''),
        "os": [
            stations[0].station
        ],
        "ds": [
            destination
        ],
        "tt": []
    };
    let clock = moment(startTime, 'H:mm');
    for (const station of stations) {
        if(station === stations[0]) {
            timetable.tt.push({
                "s": station.station,
                "d": clock.format('H:mm')
            });
        } else if (station === stations[stations.length - 1]) {
            timetable.tt.push({
                "s": station.station,
                "a": clock.format('H:mm')
            });
        } else {
            timetable.tt.push({
                "s": station.station,
                "a": clock.format('H:mm'),
                "d": clock.clone().add(1, 'minute').format('H:mm')
            });
        }
        clock = clock.add(station[nextKey], 'minute');
    }
    if(vehicle) {
        timetable["v"] = vehicle;
    }
    return timetable;
};

const processFile = (file) => {
    const timetable = [];
    const def = require(defFolder + file);
    for (const [exitTimeKey, exitTime] of Object.entries(def.exitTimes)) {
        if (typeof exitTime === "string") {
            def.exitTimes[exitTimeKey] = def.exitTimes[exitTime];
        }
        for (const travel of def.exitTimes[exitTimeKey]) {
            if (typeof travel.times[0] === "object") {
                travel.times = genTravelFromInterval(travel);
            }
            for (const time of travel.times) {
                timetable.push(
                    buildTimetable(
                        String(timetable.length),
                        def.railway,
                        def.type,
                        def.stations,
                        exitTimeKey,
                        travel.to,
                        time,
                        def.vehicle,
                    )
                );
            }
        }
    }
    fs.writeFile(timetableFolder + file, JSON.stringify(timetable, null, 2), (err) => {
        if (err) throw err;
        console.log(`Write ${file} done.`);
    });
};

if (!fs.existsSync(timetableFolder)){
    fs.mkdirSync(timetableFolder);
}
if (process.argv[2]) {
    try {
        require(defFolder + process.argv[2]);
        processFile(process.argv[2]);
    } catch (_) {
        console.log("Json not found");
    }
} else {
    fs.readdir(defFolder, (_, files) => {
        files.forEach(file => {
            if(path.extname(file) === '.json'){
                processFile(file);
            }
        });
    });
}

