import Holidays from "date-holidays";
import configs from './configs';
import {valueOrDefault} from './helpers';

export default class {

    constructor(date, speed) {
        const me = this;

        me.reset();
        me.setDate(date);
        me.setSpeed(speed);
    }

    reset() {
        const me = this;

        me.baseTime = 0;
        me.baseHighResTime = 0;
        me.speed = 1;
    }

    setSpeed(speed) {
        if (isNaN(speed)) {
            return;
        }

        const me = this;

        me.baseTime = me.getTime() - Date.now() * speed;
        me.baseHighResTime = me.getHighResTime() - performance.now() * speed;
        me.speed = speed;
    }

    setDate(date) {
        if (!(date instanceof Date)) {
            return;
        }

        const me = this,
            baseTime = me.baseTime;

        // Adjust BRT back to local time
        const offset = -me.getTimezoneOffset();

        me.baseTime = date.getTime() + offset - Date.now() * me.speed;
        me.baseHighResTime += me.baseTime - baseTime;
    }

    /**
     * Returns the date object in BRT.
     * If the time is not specified, it returns that at the current time.
     * In the playback mode, the time in the simulation clock is used.
     * @param {number} time - The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
     * @returns {Date} Date object that represents the specified time in BRT
     */
    getBRTDate(time) {
        const me = this,

            // Adjust local time to BRT (UTC-3)
            offset = me.getTimezoneOffset();

        return new Date(valueOrDefault(time, me.getTime()) + offset);
    }

    /**
     * Returns the number of milliseconds since the Unix Epoch at the specified time.
     * If the time is not specified, it returns that at the current time.
     * In the playback mode, the time in the simulation clock is used.
     * @param {string} timeString - Time expression in JST in "hh:mm" format
     * @returns {number} The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
     */
    getTime(timeString) {
        const me = this;

        if (!timeString) {
            return me.baseTime + Date.now() * me.speed;
        } else {
            const date = me.getBRTDate(),
                timeStrings = timeString.split(':'),
                hours = +timeStrings[0],
                minutes = +timeStrings[1],

                // Adjust BRT back to local time
                // Special handling of time between midnight and 3am
                offset = -me.getTimezoneOffset() +
                    ((date.getHours() < 3 ? -1 : 0) + (hours < 3 ? 1 : 0)) * 86400000;

            return date.setHours(hours, minutes, 0, 0) + offset + configs.minDelay;
        }
    }

    /**
     * Returns the time expression in BRT.
     * If the time is not specified, it returns that at the current time.
     * In the playback mode, the time in the simulation clock is used.
     * @param {number} time - The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC
     * @returns {number} Time expression in JST in "hh:mm" format
     */
    getTimeString(time) {
        const date = this.getBRTDate(time),
            hours = `0${date.getHours()}`.slice(-2),
            minutes = `'0${date.getMinutes()}`.slice(-2);

        return `${hours}:${minutes}`;
    }

    /**
     * Returns the number of milliseconds since the time origin.
     * In the playback mode, the time in the simulation clock is used.
     * @returns {number} The number of milliseconds elapsed since the time origin
     */
    getHighResTime() {
        const me = this;

        return me.baseHighResTime + performance.now() * me.speed;
    }

    getTimezoneOffset() {
        return (new Date().getTimezoneOffset() - 180) * 60000;
    }

    getCalendar() {
        const holidays = new Holidays('BR', 'SP', {types: ['public']});

        const date = this.getBRTDate(),
            hours = date.getHours();

        if (hours < 3) {
            date.setHours(hours - 24);
        }

        if (date.getDay() === 0 || holidays.isHoliday(date)) {
            return 'Holiday';
        }
        if (date.getDay() === 6) {
            return 'Saturday';
        }
        return 'Weekday';
    }

}
