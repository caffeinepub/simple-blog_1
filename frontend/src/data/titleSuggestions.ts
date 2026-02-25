export type Category = 'Livsstil' | 'Livsberättelser' | 'Mat' | 'Hobby' | 'Djupa tankar';

export const titleSuggestions: Record<Category, string[]> = {
  'Livsstil': [
    'Minimalism som livsstil: Hur jag förenklade mitt liv och hittade lyckan',
    'Hållbarhet i vardagen: Små steg som gör stor skillnad',
    'Att leva med avsikt: Så skapar du en meningsfull vardag',
    'Digital detox: Hur jag lärde mig att koppla av från skärmarna',
    'Livsstilsförändringar som faktiskt fungerar – min resa',
  ],
  'Livsberättelser': [
    'Från kaos till klarhet: Min resa att hitta mig själv',
    'Att börja om: Hur jag byggde upp mitt liv efter en stor förlust',
    'De misstag som formade mig – och varför jag inte ångrar dem',
    'Att växa upp som introvert i en extrovert värld',
    'Brevet jag önskar jag hade skrivit till mitt yngre jag',
  ],
  'Mat': [
    'Enkla, näringsrika måltider för en hektisk vardag',
    'Vegetarisk mat som även köttätare älskar',
    'Mitt hemliga recept: Den perfekta sourdough-brödguiden',
    'Matlagning på budget – goda rätter som inte kostar skjortan',
    'Smaker från världen: Mina favoritrecept efter resor i Asien',
    'Hjärte mat',
  ],
  'Hobby': [
    'Att hitta glädje i hantverk: Min resa med stickning och virkning',
    'Trädgårdsdrömmar: Så skapade jag mitt eget urbana paradis',
    'Fotografi för nybörjare – mina bästa tips och tricks',
    'DIY-projekt som förvandlade mitt hem',
  ],
  'Djupa tankar': [
    'Att hitta mening i en kaotisk värld',
    'Varför vi behöver tystnad i en högljudd tid',
    'Att släppa taget: Konsten att acceptera det man inte kan kontrollera',
    'Vad lycka egentligen betyder – och hur jag hittade min',
    'Att leva i nuet: Lektioner från mindfulness och meditation',
  ],
};

export const categories: Category[] = [
  'Livsstil',
  'Livsberättelser',
  'Mat',
  'Hobby',
  'Djupa tankar',
];
