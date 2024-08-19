const convertToMilitaryTime = (timeStr) => {
    const [time, modifier] = timeStr.match(/(\d{1,2}:\d{2})([AP]M)/).slice(1, 3);
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
}

const parseCell = (cell) => {
    const spanContent = cell.querySelector('.SSSTEXTWEEKLY').innerHTML;
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

const extractSchedule = () => {
    const table = document.getElementById('WEEKLY_SCHED_HTMLAREA');
    const rows = table.querySelectorAll('tr');

    const schedule = {
        mon: [],
        tue: [],
        wed: [],
        thu: [],
        fri: [],
        sat: [],
        sun: [],
    };

    const days = [
        'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
    ];

    for (let i = 1; i < rows.length; i++) {
        // i = 1 to skip header row
        const cells = rows[i].querySelectorAll('td');
        for (let j = 1; j < cells.length; j++) {
            // j = 1 to skip timing col
            const cell = cells[j];
            const className = cell.className;

            if (
                className.indexOf('SSSWEEKLYBACKGROUNDOVLP') === -1 &&
                className.indexOf('PSLEVEL3GRID') === -1
            ) {
                const parsedCell = parseCell(cell);
                schedule[days[j-1]].push(parsedCell);
            }
        }
    }

    return schedule;
}

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