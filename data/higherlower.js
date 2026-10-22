/* HIGHER OR LOWER data. Pairs are built automatically from items inside the same set (all combinations whose values differ by
   at least `gap` (relative, default 7%) or `minDiff` (absolute)), so ambiguous / near-equal comparisons are never asked.
   Sources checked 2026-10-16:
   - Population: UN World Population Prospects 2024, mid-year 2023 estimates (en.wikipedia.org List of countries by population (UN)).
   - Area: en.wikipedia.org List of countries and dependencies by area (United States, France and other contested totals deliberately left out).
   - Rivers: en.wikipedia.org List of longest rivers.   - Buildings: en.wikipedia.org List of tallest buildings (architectural height).
   - Mountains/waterfalls/planets/years/films: standard published figures. Distances: great-circle between city centres (haversine, rounded to 10 km).
   - Ages: computed from date of birth on the day you play (living people) or from birth/death dates. World Cup titles: Spain's 2nd title (2026) included.
   value formats: number | {dob:'YYYY-MM-DD'} (age today) | {born:'YYYY-MM-DD',died:'YYYY-MM-DD'} (age at death). */
window.TPData=window.TPData||{};
TPData.hol={verified:'2026-10-16',sets:[
{id:'mtn',title:'Height of mountains',unit:'metres above sea level',gap:.07,items:[
 ["Mount Everest",8849],["K2",8611],["Kangchenjunga",8586],["Lhotse",8516],["Makalu",8485],["Cho Oyu",8188],["Aconcagua",6961],["Denali",6190],["Mount Kilimanjaro",5895],["Mount Elbrus",5642],
 ["Mount Kenya",5199],["Vinson Massif",4892],["Mont Blanc",4806],["Matterhorn",4478],["Thabana Ntlenyana",3482],["Mount Fuji",3776],["Aoraki / Mount Cook",3724],["Mount Olympus",2917],["Mount Kosciuszko",2228],["Ben Nevis",1345],["Table Mountain",1086]]},
{id:'bld',title:'Height of famous structures',unit:'metres',gap:.07,items:[
 ["Burj Khalifa",828],["Merdeka 118",679],["Shanghai Tower",632],["Abraj Al-Bait Clock Tower",601],["Ping An Finance Centre",599],["Lotte World Tower",555],["One World Trade Center",541],["Taipei 101",508],["Petronas Tower 1",452],["Willis Tower",442],
 ["Eiffel Tower",330],["The Shard",310],["Washington Monument",169],["Big Ben (Elizabeth Tower)",96],["Statue of Liberty (to torch)",93],["Leaning Tower of Pisa",56]]},
{id:'riv',title:'Length of rivers',unit:'kilometres',gap:.07,items:[
 ["Nile",6650],["Amazon",6400],["Yangtze",6300],["Mississippi–Missouri",6275],["Yenisei",5539],["Yellow River",5464],["Congo",4700],["Amur",4444],["Mekong",4350],["Niger",4200],
 ["Murray–Darling",3672],["Indus",3180],["Danube",2888],["Zambezi",2740],["Ganges",2704],["Orange",2432],["Tigris",1950],["Limpopo",1800],["Rhine",1233],["Seine",777],["Thames",346]]},
{id:'pop',title:'Population of countries',unit:'million people (UN estimate, 2023)',dec:1,gap:.08,items:[
 ["India",1438.1],["China",1422.6],["Indonesia",281.2],["Pakistan",247.5],["Nigeria",227.9],["Brazil",211.1],["Bangladesh",171.5],["Russia",145.4],["Mexico",129.7],["Ethiopia",128.7],
 ["Japan",124.4],["Egypt",114.5],["Philippines",114.9],["DR Congo",105.8],["Vietnam",100.4],["Iran",90.6],["Turkey",87.3],["Germany",84.5],["Thailand",71.7],["United Kingdom",68.7],
 ["Tanzania",66.6],["France",66.4],["South Africa",63.2],["Italy",59.5],["Kenya",55.3],["Myanmar",54.1],["Colombia",52.3],["South Korea",51.7],["Uganda",48.7],["Spain",47.9],
 ["Algeria",46.2],["Argentina",45.5],["Canada",39.3],["Poland",38.8],["Morocco",37.7],["Peru",33.8],["Ghana",33.8],["Saudi Arabia",32.3],["Cameroon",28.4],["Australia",26.5],
 ["Malawi",21.1],["Zambia",20.7],["Netherlands",18.1],["Zimbabwe",16.3],["Portugal",10.4],["Greece",10.2],["Sweden",10.6],["Norway",5.5],["Namibia",3.0],["Botswana",2.5],["Iceland",0.4]]},
{id:'area',title:'Land & water area of countries',unit:'thousand km²',gap:.1,items:[
 ["Russia",17098],["Canada",9985],["China",9597],["Brazil",8510],["Australia",7741],["India",3287],["Argentina",2780],["Kazakhstan",2725],["Algeria",2382],["DR Congo",2345],
 ["Saudi Arabia",2150],["Mexico",1964],["Indonesia",1905],["Libya",1760],["Iran",1648],["Mongolia",1564],["Peru",1285],["Angola",1247],["Mali",1240],["South Africa",1219],
 ["Ethiopia",1104],["Egypt",1001],["Tanzania",947],["Nigeria",924],["Namibia",824],["Mozambique",799],["Zambia",753],["Madagascar",587],["Botswana",582],["Kenya",580],
 ["Zimbabwe",391],["Japan",378],["Germany",358],["Vietnam",331],["Poland",313],["Italy",302],["New Zealand",269],["United Kingdom",244],["Ghana",239],["Iceland",103],["Switzerland",41]]},
{id:'yr',title:'Year it happened',unit:'(which year?)',yearFmt:true,minDiff:3,items:[
 ["The Colosseum opens in Rome",80],["Magna Carta is sealed",1215],["Columbus reaches the Americas",1492],["Death of William Shakespeare",1616],["US Declaration of Independence",1776],["French Revolution begins",1789],["Battle of Waterloo",1815],
 ["Suez Canal opens",1869],["Alexander Graham Bell patents the telephone",1876],["Statue of Liberty dedicated",1886],["Eiffel Tower completed",1889],["First modern Olympic Games (Athens)",1896],["Wright brothers' first flight",1903],["Titanic sinks",1912],
 ["First World War begins",1914],["Second World War begins",1939],["United Nations founded",1945],["India gains independence",1947],["First humans land on the Moon",1969],["Berlin Wall falls",1989],["Nelson Mandela is released",1990],
 ["First website goes online",1991],["South Africa's first democratic election",1994],["Springboks win their first Rugby World Cup",1995],["Google is founded",1998],["Facebook is founded",2004],["YouTube is founded",2005],["The first iPhone is released",2007],
 ["Bitcoin network launches",2009],["South Africa hosts the FIFA World Cup",2010],["Brexit referendum",2016],["WHO declares COVID-19 a pandemic",2020],["ChatGPT is released",2022],["Paris Olympic Games",2024]]},
{id:'film',title:'Year the film or series came out',unit:'(which year?)',yearFmt:true,minDiff:3,items:[
 ["Snow White and the Seven Dwarfs",1937],["The Wizard of Oz",1939],["Casablanca",1942],["The Godfather",1972],["Jaws",1975],["Star Wars",1977],["E.T.",1982],["Back to the Future",1985],["Jurassic Park",1993],["The Lion King",1994],
 ["Toy Story",1995],["Titanic",1997],["The Matrix",1999],["Shrek",2001],["Harry Potter and the Philosopher's Stone",2001],["Finding Nemo",2003],["Avatar",2009],["Inception",2010],["Frozen",2013],["Moana",2016],
 ["Black Panther",2018],["Squid Game",2021],["Encanto",2021],["Barbie",2023],["Oppenheimer",2023]]},
{id:'dist',title:'Straight-line distance between cities',unit:'kilometres (great-circle)',gap:.1,items:[
 ["Accra to Lagos",410],["Johannesburg to Durban",500],["London to Paris",340],["Paris to Madrid",1050],["Addis Ababa to Nairobi",1170],["Berlin to Rome",1180],["Istanbul to Cairo",1240],["Cape Town to Johannesburg",1260],["Madrid to Rome",1360],["Mumbai to Dubai",1940],
 ["Toronto to Mexico City",3260],["Sydney to Perth",3290],["Delhi to Beijing",3780],["Lagos to Nairobi",3810],["Singapore to Mumbai",3900],["New York to Los Angeles",3940],["Lagos to London",5010],["Dubai to London",5470],["London to New York",5570],["Moscow to Beijing",5790],
 ["Johannesburg to Dubai",6420],["Cairo to Cape Town",7240],["Rio de Janeiro to Lisbon",7720],["Tokyo to Sydney",7830],["Cape Town to Perth",8700],["Paris to Tokyo",9710],["Buenos Aires to Madrid",10040],["New York to Tokyo",10850]]},
{id:'pdia',title:'Diameter of planets and moons',unit:'kilometres',gap:.1,items:[
 ["Jupiter",139820],["Saturn",116460],["Uranus",50724],["Neptune",49244],["Earth",12742],["Venus",12104],["Mars",6779],["Mercury",4879],["the Moon",3474],["Pluto",2377]]},
{id:'psun',title:'Average distance from the Sun',unit:'million kilometres',dec:1,gap:.1,items:[
 ["Mercury",57.9],["Venus",108.2],["Earth",149.6],["Mars",227.9],["Jupiter",778.5],["Saturn",1434],["Uranus",2871],["Neptune",4495]]},
{id:'wc',title:'FIFA World Cup titles won',unit:'titles',minDiff:1,items:[
 ["Brazil",5],["Germany",4],["Italy",4],["Argentina",3],["France",2],["Uruguay",2],["Spain",2],["England",1]]},
{id:'age',title:'Age of the person today',unit:'years old',minDiff:3,items:[
 ["Donald Trump",{dob:'1946-06-14'}],["Vladimir Putin",{dob:'1952-10-07'}],["Xi Jinping",{dob:'1953-06-15'}],["Narendra Modi",{dob:'1950-09-17'}],["Cyril Ramaphosa",{dob:'1952-11-17'}],["King Charles III",{dob:'1948-11-14'}],
 ["Emmanuel Macron",{dob:'1977-12-21'}],["Andy Burnham",{dob:'1970-01-07'}],["Pope Leo XIV",{dob:'1955-09-14'}],["Navi Pillay",{dob:'1941-09-23'}],["Lionel Messi",{dob:'1987-06-24'}],["Cristiano Ronaldo",{dob:'1985-02-05'}],
 ["Kylian Mbappé",{dob:'1998-12-20'}],["Lamine Yamal",{dob:'2007-07-13'}],["Jannik Sinner",{dob:'2001-08-16'}],["Lewis Hamilton",{dob:'1985-01-07'}],["Siya Kolisi",{dob:'1991-06-16'}],["Taylor Swift",{dob:'1989-12-13'}],
 ["Beyoncé",{dob:'1981-09-04'}],["Rihanna",{dob:'1988-02-20'}],["Elon Musk",{dob:'1971-06-28'}],["Bill Gates",{dob:'1955-10-28'}],["Oprah Winfrey",{dob:'1954-01-29'}],["Trevor Noah",{dob:'1984-02-20'}],["Greta Thunberg",{dob:'2003-01-03'}]]},
{id:'dage',title:'Age when they died',unit:'years old',minDiff:3,items:[
 ["Nelson Mandela",{born:'1918-07-18',died:'2013-12-05'}],["Queen Elizabeth II",{born:'1926-04-21',died:'2022-09-08'}],["Albert Einstein",{born:'1879-03-14',died:'1955-04-18'}],["Mahatma Gandhi",{born:'1869-10-02',died:'1948-01-30'}],
 ["Martin Luther King Jr.",{born:'1929-01-15',died:'1968-04-04'}],["Wolfgang Amadeus Mozart",{born:'1756-01-27',died:'1791-12-05'}],["Princess Diana",{born:'1961-07-01',died:'1997-08-31'}],["Michael Jackson",{born:'1958-08-29',died:'2009-06-25'}],
 ["Bob Marley",{born:'1945-02-06',died:'1981-05-11'}],["Steve Jobs",{born:'1955-02-24',died:'2011-10-05'}],["Elvis Presley",{born:'1935-01-08',died:'1977-08-16'}],["Marilyn Monroe",{born:'1926-06-01',died:'1962-08-04'}],
 ["Freddie Mercury",{born:'1946-09-05',died:'1991-11-24'}],["Desmond Tutu",{born:'1931-10-07',died:'2021-12-26'}],["Winnie Madikizela-Mandela",{born:'1936-09-26',died:'2018-04-02'}],["Pelé",{born:'1940-10-23',died:'2022-12-29'}],
 ["Diego Maradona",{born:'1960-10-30',died:'2020-11-25'}],["Miriam Makeba",{born:'1932-03-04',died:'2008-11-09'}],["Stephen Hawking",{born:'1942-01-08',died:'2018-03-14'}],["Abraham Lincoln",{born:'1809-02-12',died:'1865-04-15'}],
 ["Muhammad Ali",{born:'1942-01-17',died:'2016-06-03'}],["Amy Winehouse",{born:'1983-09-14',died:'2011-07-23'}],["Kobe Bryant",{born:'1978-08-23',died:'2020-01-26'}]]}
]};
