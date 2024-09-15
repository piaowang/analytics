/**
 * Created on 27/04/2017.
 * 时区
 * https://en.wikipedia.org/wiki/Time_zone#List_of_UTC_offsets
 */

function format (str) {
  return str.split(',').map(v => v.trim())
}

// TODO 翻译成中文地名
export default [
  {
    name: 'UTC−12:00',
    locations: format('Baker Island, Howland Island')
  },
  {
    name: 'UTC−11:00',
    locations: format('American Samoa, Niue')
  },
  {
    name: 'UTC−10:00',
    locations: format('French Polynesia (most), United States (Hawaii)')
  },
  {
    name: 'UTC−09:00',
    locations: format('Gambier Islands')
  },
  {
    name: 'UTC−08:00',
    locations: format('Pitcairn Islands')
  },
  {
    name: 'UTC−07:00',
    locations: format('Canada (northeastern British Columbia), Mexico (Sonora), United States (most of Arizona)')
  },
  {
    name: 'UTC−06:00',
    locations: format('Belize, Canada (most of Saskatchewan), Costa Rica, Ecuador (Galápagos Islands), El Salvador, Guatemala, Honduras, Nicaragua')
  },
  {
    name: 'UTC−05:00',
    locations: format('Brazil (Acre), Colombia, Ecuador (continental), Haiti, Jamaica, Panama, Peru')
  },
  {
    name: 'UTC−04:00',
    locations: format('Barbados, Bolivia, Brazil (most of Amazonas, Rondônia, Roraima), Dominican Republic, Puerto Rico, Trinidad and Tobago, Venezuela')
  },
  {
    name: 'UTC−03:00',
    locations: format('Argentina, Brazil (Bahia, Ceará, Maranhão, Pará, Pernambuco), Falkland Islands, Uruguay')
  },
  {
    name: 'UTC−02:00',
    locations: format('Brazil (Fernando de Noronha), South Georgia and the South Sandwich Islands')
  },
  {
    name: 'UTC−01:00',
    locations: format('Cape Verde')
  },
  {
    name: 'UTC−00:00',
    locations: format('Ivory Coast, Ghana, Iceland, Saint Helena, Senegal, Mali')
  },
  {
    name: 'UTC+01:00',
    locations: format('Algeria, Angola, Benin, Cameroon, Democratic Republic of the Congo (west), Gabon, Niger, Nigeria, Tunisia')
  },
  {
    name: 'UTC+02:00',
    locations: format('Burundi, Egypt, Jordan, Malawi, Mozambique, Russia (Kaliningrad), Rwanda, South Africa, Swaziland, Zambia, Zimbabwe')
  },
  {
    name: 'UTC+03:00',
    locations: format('Belarus, Djibouti, Eritrea, Ethiopia, Iraq, Kenya, Kuwait, Madagascar, Northern Cyprus, Russia (most of European part), Saudi Arabia, Somalia, South Sudan, Sudan, Tanzania, Turkey, Uganda, Yemen')
  },
  {
    name: 'UTC+04:00',
    locations: format('Armenia, Azerbaijan, Georgia, Mauritius, Oman, Russia (Samara), Seychelles, United Arab Emirates')
  },
  {
    name: 'UTC+05:00',
    locations: format('Kazakhstan (west), Maldives, Pakistan, Russia (Sverdlovsk, Chelyabinsk), Uzbekistan')
  },
  {
    name: 'UTC+06:00',
    locations: format('Bangladesh, Bhutan, British Indian Ocean Territory, Kazakhstan (most), Russia (Omsk)')
  },
  {
    name: 'UTC+07:00',
    locations: format('Cambodia, Indonesia (west), Laos, Russia (Krasnoyarsk), Thailand, Vietnam')
  },
  {
    name: 'UTC+08:00',
    locations: format('Australia (Western Australia), Brunei, China, Hong Kong, Indonesia (central), Macau, Malaysia, Philippines, Russia (Irkutsk), Singapore, Taiwan')
  },
  {
    name: 'UTC+09:00',
    locations: format('East Timor, Indonesia (east), Japan, Russia (most of Sakha), South Korea')
  },
  {
    name: 'UTC+10:00',
    locations: format('Australia (Queensland), Papua New Guinea, Russia (Primorsky)')
  },
  {
    name: 'UTC+11:00',
    locations: format('New Caledonia, Russia (Magadan), Solomon Islands, Vanuatu')
  },
  {
    name: 'UTC+12:00',
    locations: format('Kiribati (Gilbert Islands), Russia (Kamchatka)')
  }
].map(r => {
  if (r.value) return r
  return {
    ...r,
    value: r.name.replace('UTC', '')
  }
})
