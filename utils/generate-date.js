export default function generateDate(inputDate) {
    if (inputDate && isMissingTime(inputDate)) {
        inputDate += generateRandomTime();
    }

    const d = validDate(inputDate);           
    const year = format(d.getUTCFullYear());
    const month = format(d.getUTCMonth() + 1);
    const day = format(d.getUTCDate());
    const hours = format(d.getUTCHours());
    const minutes = format(d.getUTCMinutes());
    const seconds = format(d.getUTCSeconds());

    return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}Z`;
}

function format(num, pad = 2) {
    return String(num).padStart(pad, '0');
}

function generateRandomTime() {
    const hours = format(Math.floor(Math.random() * 24));
    const mins = format(Math.floor(Math.random() * 60));
    const seconds = format(Math.floor(Math.random() * 60));
    return `-${hours}-${mins}-${seconds}`;
}

function isMissingTime(date) {
    return !/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z$/.test(date) && !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(date);
}

export function pacificTimezoneOffset() { 
    return -7 * 60 * 60 * 1000;
}

export function validDate(inputDate) {
    if (inputDate) {
        const [date, time] = inputDate.split('T');
        const [year, month, day] = date.split('-');
        const [hours, minutes, seconds] = time ? (time.includes('-') ? time.split('-') : time.split(':')) : [0, 0, 0];
        return new Date(Date.UTC(year, month - 1, day, Number(hours), Number(minutes), Number(seconds)));
    } else {
        return new Date(Date.now() + pacificTimezoneOffset());
    }
}