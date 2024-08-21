const convertToMilitaryTime = (timeStr) => {
    const [time, modifier] = timeStr.match(/(\d{1,2}:\d{2})([AP]M)/).slice(1, 3);
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
}

const parseSpanContent = (spanContent) => {
    const [courseInfo, componentType, timeInfo, venueInfo] = spanContent.split('<br>');
    
    const [code, section] = courseInfo.split(' - ');
    const courseCode = `${code.substring(code.length-6)}-${section}`;

    const component = componentType.toLowerCase().substring(0, 3);

    const splitTime = timeInfo.split(' - ');
    const startTime = convertToMilitaryTime(splitTime[0]);
    const endTime = convertToMilitaryTime(splitTime[1]);
    const timings = `${startTime}-${endTime}`;

    const splitVenue = venueInfo.split(' ');
    const venue = splitVenue.pop();

    const parsedCell = {
        code: courseCode,
        comp: component,
        timings: timings,
        venue: venue,
    }
    return parsedCell;
}

const parseCell = (cell) => {
    const spanContent = cell.querySelector('.SSSTEXTWEEKLY').innerHTML;

    if (spanContent.indexOf('<hr') !== -1) {
        return Array.from(spanContent.split('<hr width="75%" class="PSHORIZONTALRULE">'), value => parseSpanContent(value));
    } else {
        return [parseSpanContent(spanContent)];
    }
}

const checkOverlap = (timingsOne, timingsTwo) => {
    const timingsOneSplit = timingsOne.split('-');
    const timingsOneStart = parseInt(timingsOneSplit[0]);
    const timingsOneEnd = parseInt(timingsOneSplit[1]);

    const timingsTwoSplit = timingsTwo.split('-');
    const timingsTwoStart = parseInt(timingsTwoSplit[0]);
    const timingsTwoEnd = parseInt(timingsTwoSplit[1]);

    return (
        (timingsOneStart <= timingsTwoStart && timingsTwoStart <= timingsOneEnd) ||
        (timingsOneStart <= timingsTwoEnd && timingsTwoEnd <= timingsOneEnd) ||
        (timingsTwoStart <= timingsOneStart && timingsOneStart <= timingsTwoEnd) ||
        (timingsTwoStart <= timingsOneEnd && timingsOneEnd <= timingsTwoEnd)
    )
}

const checkConflict = (parsedCell, currentDay) => {
    const timingsOne = parsedCell.timings;

    for (let i = 0; i < currentDay.length; i++) {
        const currentCell = currentDay[i];
        const timingsTwo = currentCell.timings;
        if (checkOverlap(timingsOne, timingsTwo)) {
            console.log(currentCell);
            return true;
        }
    }
}

const pushToSchedule = (schedule, cell, day) => {
    const currentDay = Array.from(schedule[day]);
    let isExisting = false;
    for (const existingCell of currentDay) {
        if (existingCell.code === cell.code) {
            isExisting = true;
            break;
        }
    }
    if (!isExisting) schedule[day].push(cell);
    return schedule
}


const extractSchedule = () => {
    const table = document.getElementById('WEEKLY_SCHED_HTMLAREA');
    const tableRows = table.querySelectorAll('tr');

    let schedule = {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
    };

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    const rowOffset = Array(tableRows.length).fill(0);

    for (let i = 1; i < tableRows.length; i++) {
        let row = tableRows[i];
        let cols = row.querySelectorAll('td');

        for (let j = 1; j < cols.length; j++) {
            const cell = cols[j];
            if (cell.className === 'PSLEVEL3GRID') continue;

            if (cols.length === 8) {
                // complete row
                const classes = parseCell(cell);
                classes.forEach(value => schedule = pushToSchedule(schedule, value, days[j - 1]));
            } else {
                // incomplete row
                const classes = parseCell(cell);
                const currentDay = Array.from(schedule[days[j - 1]]);
                classes.forEach(value => {
                    const conflictStatus = checkConflict(value, currentDay);
                    if (conflictStatus) {
                        // Safe bounds check
                        schedule = pushToSchedule(schedule, value, days[j + rowOffset[i]]);
                        console.log(rowOffset, value, i, rowOffset[i], j, j + rowOffset[i], days[j + rowOffset[i]]);
                        rowOffset[i]++;
                    } else {
                        console.log('no conflict incomplete', rowOffset, value, i, rowOffset[i], j, j - 1 + rowOffset[i], days[j -1 + rowOffset[i]])
                        schedule = pushToSchedule(schedule, value, days[j - 1 + rowOffset[i]]);
                    }
                });
            }
        }
    }

    return schedule;
};

const pushScheduleToHandler = (schedule) => {
    const queryString = encodeURIComponent(JSON.stringify(schedule));
    // const url = `https://uni.evelynn.life/uploadSchedule?schedule=${queryString}`;
    const url = `http://localhost:5173/sync?schedule=${queryString}`;
    chrome.runtime.sendMessage({
        action: 'pushToHandler',
        url: url,
    });
}

const schedule = extractSchedule();
pushScheduleToHandler(schedule);