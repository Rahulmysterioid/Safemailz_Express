/**
 * Curated list of 61 standard world timezones with IANA identifiers,
 * standard UTC offsets, city names, and search keywords.
 */

export const TIMEZONES_LIST = [
    {
        iana: 'Etc/GMT+12',
        offset: 'UTC-12:00',
        offsetMinutes: -720,
        cityLabel: 'International Date Line West',
        label: '(UTC-12:00) International Date Line West',
        searchKeywords: 'date line baker island howland island'
    },
    {
        iana: 'Pacific/Pago_Pago',
        offset: 'UTC-11:00',
        offsetMinutes: -660,
        cityLabel: 'Midway Island, Samoa',
        label: '(UTC-11:00) Midway Island, Samoa',
        searchKeywords: 'pago pago american samoa midway'
    },
    {
        iana: 'Pacific/Honolulu',
        offset: 'UTC-10:00',
        offsetMinutes: -600,
        cityLabel: 'Hawaii',
        label: '(UTC-10:00) Hawaii',
        searchKeywords: 'hawaii honolulu oahu maui usa united states'
    },
    {
        iana: 'America/Anchorage',
        offset: 'UTC-09:00',
        offsetMinutes: -540,
        cityLabel: 'Alaska',
        label: '(UTC-09:00) Alaska',
        searchKeywords: 'alaska anchorage juneau fairbanks usa'
    },
    {
        iana: 'America/Los_Angeles',
        offset: 'UTC-08:00',
        offsetMinutes: -480,
        cityLabel: 'Pacific Time (US & Canada)',
        label: '(UTC-08:00) Pacific Time (US & Canada)',
        searchKeywords: 'los angeles seattle san francisco vancouver portland pt pst pdt california usa canada'
    },
    {
        iana: 'America/Phoenix',
        offset: 'UTC-07:00',
        offsetMinutes: -420,
        cityLabel: 'Arizona',
        label: '(UTC-07:00) Arizona',
        searchKeywords: 'phoenix tucson arizona mst'
    },
    {
        iana: 'America/Denver',
        offset: 'UTC-07:00',
        offsetMinutes: -420,
        cityLabel: 'Mountain Time (US & Canada)',
        label: '(UTC-07:00) Mountain Time (US & Canada)',
        searchKeywords: 'denver salt lake city calgary edmonton mt mst mdt colorado usa canada'
    },
    {
        iana: 'America/Chicago',
        offset: 'UTC-06:00',
        offsetMinutes: -360,
        cityLabel: 'Central Time (US & Canada)',
        label: '(UTC-06:00) Central Time (US & Canada)',
        searchKeywords: 'chicago dallas houston minneapolis winnipeg ct cst cdt texas illinois usa'
    },
    {
        iana: 'America/Mexico_City',
        offset: 'UTC-06:00',
        offsetMinutes: -360,
        cityLabel: 'Guadalajara, Mexico City, Monterrey',
        label: '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
        searchKeywords: 'mexico city guadalajara monterrey cdmx'
    },
    {
        iana: 'America/New_York',
        offset: 'UTC-05:00',
        offsetMinutes: -300,
        cityLabel: 'Eastern Time (US & Canada)',
        label: '(UTC-05:00) Eastern Time (US & Canada)',
        searchKeywords: 'new york toronto washington dc miami boston montreal atlanta et est edt usa canada'
    },
    {
        iana: 'America/Bogota',
        offset: 'UTC-05:00',
        offsetMinutes: -300,
        cityLabel: 'Bogota, Lima, Quito, Rio Branco',
        label: '(UTC-05:00) Bogota, Lima, Quito, Rio Branco',
        searchKeywords: 'colombia peru ecuador bogota lima quito'
    },
    {
        iana: 'America/Halifax',
        offset: 'UTC-04:00',
        offsetMinutes: -240,
        cityLabel: 'Atlantic Time (Canada)',
        label: '(UTC-04:00) Atlantic Time (Canada)',
        searchKeywords: 'halifax nova scotia canada ast adt'
    },
    {
        iana: 'America/Caracas',
        offset: 'UTC-04:00',
        offsetMinutes: -240,
        cityLabel: 'Caracas',
        label: '(UTC-04:00) Caracas',
        searchKeywords: 'venezuela caracas'
    },
    {
        iana: 'America/Santiago',
        offset: 'UTC-04:00',
        offsetMinutes: -240,
        cityLabel: 'Santiago',
        label: '(UTC-04:00) Santiago',
        searchKeywords: 'chile santiago'
    },
    {
        iana: 'America/St_Johns',
        offset: 'UTC-03:30',
        offsetMinutes: -210,
        cityLabel: 'Newfoundland',
        label: '(UTC-03:30) Newfoundland',
        searchKeywords: 'newfoundland st johns canada'
    },
    {
        iana: 'America/Sao_Paulo',
        offset: 'UTC-03:00',
        offsetMinutes: -180,
        cityLabel: 'Brasilia, Sao Paulo',
        label: '(UTC-03:00) Brasilia, Sao Paulo',
        searchKeywords: 'brazil brasilia sao paulo rio de janeiro'
    },
    {
        iana: 'America/Argentina/Buenos_Aires',
        offset: 'UTC-03:00',
        offsetMinutes: -180,
        cityLabel: 'Buenos Aires, Georgetown',
        label: '(UTC-03:00) Buenos Aires, Georgetown',
        searchKeywords: 'argentina buenos aires guyana georgetown'
    },
    {
        iana: 'Atlantic/South_Georgia',
        offset: 'UTC-02:00',
        offsetMinutes: -120,
        cityLabel: 'Mid-Atlantic',
        label: '(UTC-02:00) Mid-Atlantic',
        searchKeywords: 'south georgia mid atlantic'
    },
    {
        iana: 'Atlantic/Azores',
        offset: 'UTC-01:00',
        offsetMinutes: -60,
        cityLabel: 'Azores, Cape Verde Islands',
        label: '(UTC-01:00) Azores, Cape Verde Islands',
        searchKeywords: 'azores portugal cape verde praia'
    },
    {
        iana: 'UTC',
        offset: 'UTC+00:00',
        offsetMinutes: 0,
        cityLabel: 'Coordinated Universal Time',
        label: '(UTC+00:00) Coordinated Universal Time',
        searchKeywords: 'utc gmt universal time coordinated greenwich'
    },
    {
        iana: 'Europe/London',
        offset: 'UTC+00:00',
        offsetMinutes: 0,
        cityLabel: 'Dublin, Edinburgh, Lisbon, London',
        label: '(UTC+00:00) Dublin, Edinburgh, Lisbon, London',
        searchKeywords: 'london uk united kingdom britain england dublin ireland lisbon portugal edinburgh scotland gmt bst'
    },
    {
        iana: 'Africa/Casablanca',
        offset: 'UTC+01:00',
        offsetMinutes: 60,
        cityLabel: 'Casablanca',
        label: '(UTC+01:00) Casablanca',
        searchKeywords: 'morocco casablanca rabat'
    },
    {
        iana: 'Europe/Paris',
        offset: 'UTC+01:00',
        offsetMinutes: 60,
        cityLabel: 'Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna, Paris',
        label: '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna, Paris',
        searchKeywords: 'france paris germany berlin netherlands amsterdam italy rome austria vienna switzerland bern cet cest'
    },
    {
        iana: 'Europe/Belgrade',
        offset: 'UTC+01:00',
        offsetMinutes: 60,
        cityLabel: 'Belgrade, Bratislava, Budapest, Ljubljana, Prague',
        label: '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
        searchKeywords: 'serbia belgrade slovakia czech prague hungary budapest'
    },
    {
        iana: 'Africa/Lagos',
        offset: 'UTC+01:00',
        offsetMinutes: 60,
        cityLabel: 'West Central Africa, Lagos',
        label: '(UTC+01:00) West Central Africa, Lagos',
        searchKeywords: 'nigeria lagos abuja cameroon congo'
    },
    {
        iana: 'Europe/Athens',
        offset: 'UTC+02:00',
        offsetMinutes: 120,
        cityLabel: 'Athens, Bucharest, Istanbul',
        label: '(UTC+02:00) Athens, Bucharest, Istanbul',
        searchKeywords: 'greece athens romania bucharest turkey istanbul eet eest'
    },
    {
        iana: 'Europe/Helsinki',
        offset: 'UTC+02:00',
        offsetMinutes: 120,
        cityLabel: 'Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
        label: '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
        searchKeywords: 'finland helsinki ukraine kyiv estonia latvia lithuania bulgaria'
    },
    {
        iana: 'Africa/Cairo',
        offset: 'UTC+02:00',
        offsetMinutes: 120,
        cityLabel: 'Cairo',
        label: '(UTC+02:00) Cairo',
        searchKeywords: 'egypt cairo alexandria'
    },
    {
        iana: 'Africa/Johannesburg',
        offset: 'UTC+02:00',
        offsetMinutes: 120,
        cityLabel: 'Harare, Pretoria, Johannesburg',
        label: '(UTC+02:00) Harare, Pretoria, Johannesburg',
        searchKeywords: 'south africa johannesburg pretoria cape town zimbabwe harare sast'
    },
    {
        iana: 'Asia/Jerusalem',
        offset: 'UTC+02:00',
        offsetMinutes: 120,
        cityLabel: 'Jerusalem',
        label: '(UTC+02:00) Jerusalem',
        searchKeywords: 'israel jerusalem tel aviv'
    },
    {
        iana: 'Europe/Moscow',
        offset: 'UTC+03:00',
        offsetMinutes: 180,
        cityLabel: 'Moscow, St. Petersburg, Volgograd',
        label: '(UTC+03:00) Moscow, St. Petersburg, Volgograd',
        searchKeywords: 'russia moscow st petersburg volgograd msk'
    },
    {
        iana: 'Asia/Kuwait',
        offset: 'UTC+03:00',
        offsetMinutes: 180,
        cityLabel: 'Kuwait, Riyadh',
        label: '(UTC+03:00) Kuwait, Riyadh',
        searchKeywords: 'kuwait saudi arabia riyadh jeddah'
    },
    {
        iana: 'Africa/Nairobi',
        offset: 'UTC+03:00',
        offsetMinutes: 180,
        cityLabel: 'Nairobi',
        label: '(UTC+03:00) Nairobi',
        searchKeywords: 'kenya nairobi east africa'
    },
    {
        iana: 'Asia/Baghdad',
        offset: 'UTC+03:00',
        offsetMinutes: 180,
        cityLabel: 'Baghdad',
        label: '(UTC+03:00) Baghdad',
        searchKeywords: 'iraq baghdad'
    },
    {
        iana: 'Asia/Tehran',
        offset: 'UTC+03:30',
        offsetMinutes: 210,
        cityLabel: 'Tehran',
        label: '(UTC+03:30) Tehran',
        searchKeywords: 'iran tehran'
    },
    {
        iana: 'Asia/Dubai',
        offset: 'UTC+04:00',
        offsetMinutes: 240,
        cityLabel: 'Abu Dhabi, Muscat',
        label: '(UTC+04:00) Abu Dhabi, Muscat',
        searchKeywords: 'uae dubai abu dhabi oman muscat gulf'
    },
    {
        iana: 'Asia/Baku',
        offset: 'UTC+04:00',
        offsetMinutes: 240,
        cityLabel: 'Baku, Tbilisi, Yerevan',
        label: '(UTC+04:00) Baku, Tbilisi, Yerevan',
        searchKeywords: 'azerbaijan baku georgia tbilisi armenia yerevan'
    },
    {
        iana: 'Asia/Kabul',
        offset: 'UTC+04:30',
        offsetMinutes: 270,
        cityLabel: 'Kabul',
        label: '(UTC+04:30) Kabul',
        searchKeywords: 'afghanistan kabul'
    },
    {
        iana: 'Asia/Karachi',
        offset: 'UTC+05:00',
        offsetMinutes: 300,
        cityLabel: 'Islamabad, Karachi, Tashkent',
        label: '(UTC+05:00) Islamabad, Karachi, Tashkent',
        searchKeywords: 'pakistan karachi islamabad lahore uzbekistan tashkent pkt'
    },
    {
        iana: 'Asia/Kolkata',
        offset: 'UTC+05:30',
        offsetMinutes: 330,
        cityLabel: 'Chennai, Kolkata, Mumbai, New Delhi',
        label: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
        searchKeywords: 'india chennai kolkata mumbai new delhi calcutta bombay madras bangalore bengaluru ist bharat'
    },
    {
        iana: 'Asia/Kathmandu',
        offset: 'UTC+05:45',
        offsetMinutes: 345,
        cityLabel: 'Kathmandu',
        label: '(UTC+05:45) Kathmandu',
        searchKeywords: 'nepal kathmandu'
    },
    {
        iana: 'Asia/Dhaka',
        offset: 'UTC+06:00',
        offsetMinutes: 360,
        cityLabel: 'Astana, Dhaka',
        label: '(UTC+06:00) Astana, Dhaka',
        searchKeywords: 'bangladesh dhaka kazakhstan astana'
    },
    {
        iana: 'Asia/Almaty',
        offset: 'UTC+06:00',
        offsetMinutes: 360,
        cityLabel: 'Almaty, Novosibirsk',
        label: '(UTC+06:00) Almaty, Novosibirsk',
        searchKeywords: 'almaty novosibirsk siberia'
    },
    {
        iana: 'Asia/Yangon',
        offset: 'UTC+06:30',
        offsetMinutes: 390,
        cityLabel: 'Yangon (Rangoon)',
        label: '(UTC+06:30) Yangon (Rangoon)',
        searchKeywords: 'myanmar burma yangon rangoon'
    },
    {
        iana: 'Asia/Bangkok',
        offset: 'UTC+07:00',
        offsetMinutes: 420,
        cityLabel: 'Bangkok, Hanoi, Jakarta',
        label: '(UTC+07:00) Bangkok, Hanoi, Jakarta',
        searchKeywords: 'thailand bangkok vietnam hanoi indonesia jakarta ict wib'
    },
    {
        iana: 'Asia/Krasnoyarsk',
        offset: 'UTC+07:00',
        offsetMinutes: 420,
        cityLabel: 'Krasnoyarsk',
        label: '(UTC+07:00) Krasnoyarsk',
        searchKeywords: 'krasnoyarsk russia'
    },
    {
        iana: 'Asia/Singapore',
        offset: 'UTC+08:00',
        offsetMinutes: 480,
        cityLabel: 'Beijing, Chongqing, Hong Kong, Singapore',
        label: '(UTC+08:00) Beijing, Chongqing, Hong Kong, Singapore',
        searchKeywords: 'china beijing shanghai hong kong singapore kuala lumpur malaysia chongqing sgt cst'
    },
    {
        iana: 'Asia/Taipei',
        offset: 'UTC+08:00',
        offsetMinutes: 480,
        cityLabel: 'Taipei',
        label: '(UTC+08:00) Taipei',
        searchKeywords: 'taiwan taipei'
    },
    {
        iana: 'Australia/Perth',
        offset: 'UTC+08:00',
        offsetMinutes: 480,
        cityLabel: 'Perth',
        label: '(UTC+08:00) Perth',
        searchKeywords: 'australia perth western australia awst'
    },
    {
        iana: 'Asia/Tokyo',
        offset: 'UTC+09:00',
        offsetMinutes: 540,
        cityLabel: 'Osaka, Sapporo, Tokyo',
        label: '(UTC+09:00) Osaka, Sapporo, Tokyo',
        searchKeywords: 'japan tokyo osaka sapporo jst'
    },
    {
        iana: 'Asia/Seoul',
        offset: 'UTC+09:00',
        offsetMinutes: 540,
        cityLabel: 'Seoul',
        label: '(UTC+09:00) Seoul',
        searchKeywords: 'korea seoul south korea kst'
    },
    {
        iana: 'Asia/Yakutsk',
        offset: 'UTC+09:00',
        offsetMinutes: 540,
        cityLabel: 'Yakutsk',
        label: '(UTC+09:00) Yakutsk',
        searchKeywords: 'yakutsk russia'
    },
    {
        iana: 'Australia/Adelaide',
        offset: 'UTC+09:30',
        offsetMinutes: 570,
        cityLabel: 'Adelaide, Darwin',
        label: '(UTC+09:30) Adelaide, Darwin',
        searchKeywords: 'australia adelaide darwin acst'
    },
    {
        iana: 'Australia/Sydney',
        offset: 'UTC+10:00',
        offsetMinutes: 600,
        cityLabel: 'Brisbane, Canberra, Melbourne, Sydney',
        label: '(UTC+10:00) Brisbane, Canberra, Melbourne, Sydney',
        searchKeywords: 'australia sydney melbourne canberra brisbane aest aedt'
    },
    {
        iana: 'Asia/Vladivostok',
        offset: 'UTC+10:00',
        offsetMinutes: 600,
        cityLabel: 'Vladivostok',
        label: '(UTC+10:00) Vladivostok',
        searchKeywords: 'vladivostok russia'
    },
    {
        iana: 'Pacific/Guam',
        offset: 'UTC+10:00',
        offsetMinutes: 600,
        cityLabel: 'Guam, Port Moresby',
        label: '(UTC+10:00) Guam, Port Moresby',
        searchKeywords: 'guam port moresby papua new guinea'
    },
    {
        iana: 'Asia/Magadan',
        offset: 'UTC+11:00',
        offsetMinutes: 660,
        cityLabel: 'Magadan, Solomon Islands, New Caledonia',
        label: '(UTC+11:00) Magadan, Solomon Islands, New Caledonia',
        searchKeywords: 'magadan solomon islands new caledonia noumea'
    },
    {
        iana: 'Pacific/Auckland',
        offset: 'UTC+12:00',
        offsetMinutes: 720,
        cityLabel: 'Auckland, Wellington',
        label: '(UTC+12:00) Auckland, Wellington',
        searchKeywords: 'new zealand auckland wellington nzst nzdt'
    },
    {
        iana: 'Pacific/Fiji',
        offset: 'UTC+12:00',
        offsetMinutes: 720,
        cityLabel: 'Fiji, Marshall Islands',
        label: '(UTC+12:00) Fiji, Marshall Islands',
        searchKeywords: 'fiji suva marshall islands majuro'
    },
    {
        iana: 'Pacific/Tongatapu',
        offset: 'UTC+13:00',
        offsetMinutes: 780,
        cityLabel: "Nuku'alofa",
        label: "(UTC+13:00) Nuku'alofa",
        searchKeywords: 'tonga nukualofa'
    },
    {
        iana: 'Pacific/Kiritimati',
        offset: 'UTC+14:00',
        offsetMinutes: 840,
        cityLabel: 'Kiritimati Island',
        label: '(UTC+14:00) Kiritimati Island',
        searchKeywords: 'kiritimati line islands kiribati'
    }
];

export function findTimezoneByIana(ianaString) {
    if (!ianaString) return null;
    return TIMEZONES_LIST.find(tz => tz.iana.toLowerCase() === ianaString.toLowerCase()) || null;
}
