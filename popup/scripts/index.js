const handleClick = () => {
    chrome.tabs.create({ url: 'https://prodweb.snu.in/psc/CSPROD/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_SCHD_W' })
}
document.getElementById('capture-schedule').addEventListener('click', handleClick)