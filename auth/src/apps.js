// Registry of apps that can be linked. Keys must match the landing page card keys.
const APPS = [
  { key: 'meeting-os',          label: 'Meeting OS',                        url: 'https://meetingos.centrepointgroup.in' },
  { key: 'flash-report',        label: 'CP Flash Report',                   url: 'https://flashreport.centrepointgroup.in' },
  { key: 'cp-leads',            label: 'CP Leads',                          url: 'https://cp-leads.centrepointgroup.in/' },
  { key: 'assets',              label: 'Assets',                            url: 'https://assets.centrepointgroup.in/' },
  { key: 'handover',            label: 'Handover',                          url: 'https://handover.centrepointgroup.in/' },
  { key: 'procurement-model',   label: 'Procurement Model',                 url: 'https://dpr-upr.centrepointgroup.in/' },
  { key: 'cpa-controller',      label: 'CPA Budget & Purchase Control',     url: 'https://cpa-controller.centrepointgroup.in/' },
  { key: 'mickys-crm',          label: "Micky's CRM",                       url: 'https://mickys-crm.centrepointgroup.in/' },
  { key: 'purosoul',            label: 'Purosoul',                          url: 'https://purosoul.centrepointgroup.in/' },
  { key: 'purosoul-cash',       label: 'Purosoul Cash',                     url: 'https://purosoulcash.centrepointgroup.in/' },
  { key: 'hr-recruitment',      label: 'Recruitment & Position Control',    url: 'https://hr.centrepointgroup.in/' },
  { key: 'interview',           label: 'Interviewer Platform',              url: 'https://interview.centrepointgroup.in/' },
  { key: 'careers',             label: 'Careers',                           url: 'https://careers.centrepointgroup.in/' },
  { key: 'executive-scheduler', label: 'Executive Scheduler',               url: 'https://executivescheduler.centrepointgroup.in/' },
];

const APP_KEYS = new Set(APPS.map((a) => a.key));

function isKnownApp(key) {
  return APP_KEYS.has(String(key || ''));
}

// Env var name that holds an app's user-directory URL, e.g. SSO_USERS_URL_MEETING_OS
function directoryEnvName(appKey) {
  return `SSO_USERS_URL_${String(appKey).toUpperCase().replace(/-/g, '_')}`;
}

module.exports = { APPS, isKnownApp, directoryEnvName };
