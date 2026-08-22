/**
 * Adhkar — short remembrances for through the day.
 *
 * A deliberately small, well-known set rather than an exhaustive compendium: the point is
 * something you will actually say, not a library you will scroll past.
 *
 * On the text: the Arabic is the classical wording as transmitted. The English lines are plain
 * renderings written for this app, not reproductions of any published translation, and are
 * meant as a sense of the meaning rather than a substitute for it. Sources are named so
 * anything here can be checked against a proper edition.
 */

export type DhikrSlot = 'morning' | 'evening' | 'after-prayer' | 'distress' | 'sleep' | 'anytime';

export interface Dhikr {
  id: string;
  slot: DhikrSlot[];
  arabic: string;
  translit: string;
  /** Plain sense of the meaning, written for this app. */
  meaning: string;
  /** How many times it is customarily repeated. */
  count?: number;
  source: string;
  /** Why it sits in this app — the connection to how a day actually goes. */
  note?: string;
}

export const ADHKAR: Dhikr[] = [
  {
    id: 'istighfar',
    slot: ['anytime', 'after-prayer', 'distress'],
    arabic: 'أَسْتَغْفِرُ اللهَ',
    translit: 'Astaghfirullāh',
    meaning: 'I ask Allah for forgiveness.',
    count: 3,
    source: 'Said after each obligatory prayer — Sahih Muslim',
  },
  {
    id: 'tasbih',
    slot: ['after-prayer', 'anytime'],
    arabic: 'سُبْحَانَ اللهِ ، وَالْحَمْدُ لِلَّهِ ، وَاللهُ أَكْبَرُ',
    translit: 'Subḥānallāh, wal-ḥamdu lillāh, wallāhu akbar',
    meaning: 'Glory be to Allah; all praise is for Allah; Allah is greatest.',
    count: 33,
    source: 'After the obligatory prayers — Sahih al-Bukhari, Sahih Muslim',
    note: 'Thirty-three of each. Counting occupies the part of the mind that otherwise starts planning.',
  },
  {
    id: 'hasbiyallah',
    slot: ['distress', 'anytime'],
    arabic: 'حَسْبِيَ اللهُ لَا إِلَهَ إِلَّا هُوَ ، عَلَيْهِ تَوَكَّلْتُ',
    translit: 'Ḥasbiyallāhu lā ilāha illā huwa, ʿalayhi tawakkaltu',
    meaning: 'Allah is enough for me. There is no god but Him. On Him I rely.',
    count: 7,
    source: "Qur'an 9:129",
    note: 'For the days when the load is the problem rather than any single task.',
  },
  {
    id: 'la-hawla',
    slot: ['distress', 'anytime'],
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    translit: 'Lā ḥawla wa lā quwwata illā billāh',
    meaning: 'There is no power and no strength except with Allah.',
    source: 'Sahih al-Bukhari, Sahih Muslim',
    note: 'Traditionally said when facing something difficult or heavy.',
  },
  {
    id: 'morning-asbahna',
    slot: ['morning'],
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ ، وَالْحَمْدُ لِلَّهِ',
    translit: 'Aṣbaḥnā wa aṣbaḥal-mulku lillāh, wal-ḥamdu lillāh',
    meaning: 'We have reached morning, and all sovereignty belongs to Allah; all praise is for Allah.',
    source: 'Morning remembrance — Sahih Muslim',
  },
  {
    id: 'evening-amsayna',
    slot: ['evening'],
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ ، وَالْحَمْدُ لِلَّهِ',
    translit: 'Amsaynā wa amsal-mulku lillāh, wal-ḥamdu lillāh',
    meaning: 'We have reached evening, and all sovereignty belongs to Allah; all praise is for Allah.',
    source: 'Evening remembrance — Sahih Muslim',
  },
  {
    id: 'sayyid-istighfar',
    slot: ['morning', 'evening'],
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ ، خَلَقْتَنِي وَأَنَا عَبْدُكَ ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    translit: 'Allāhumma anta rabbī lā ilāha illā anta, khalaqtanī wa anā ʿabduka, wa anā ʿalā ʿahdika wa waʿdika mā-staṭaʿtu',
    meaning:
      'O Allah, You are my Lord; there is no god but You. You created me and I am Your servant, and I keep to Your covenant and promise as far as I am able.',
    source: 'Sayyid al-Istighfār — Sahih al-Bukhari',
    note: '"As far as I am able" is the part worth sitting with on a day that did not go well.',
  },
  {
    id: 'sleep-bismika',
    slot: ['sleep'],
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    translit: 'Bismika Allāhumma amūtu wa aḥyā',
    meaning: 'In Your name, O Allah, I die and I live.',
    source: 'Said on lying down to sleep — Sahih al-Bukhari',
  },
  {
    id: 'anxiety-dua',
    slot: ['distress'],
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ',
    translit: 'Allāhumma innī aʿūdhu bika minal-hammi wal-ḥazan',
    meaning: 'O Allah, I seek refuge in You from anxiety and grief.',
    source: 'Sahih al-Bukhari',
    note: 'The wording distinguishes worry about what is coming from sorrow about what has passed.',
  },
  {
    id: 'gratitude-dua',
    slot: ['after-prayer', 'anytime'],
    arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
    translit: 'Allāhumma aʿinnī ʿalā dhikrika wa shukrika wa ḥusni ʿibādatik',
    meaning: 'O Allah, help me to remember You, to thank You, and to worship You well.',
    source: 'Sunan Abi Dawud, an-Nasa’i',
    note: 'The Prophet ﷺ taught this to Muʿādh and told him not to leave it after any prayer.',
  },
];

/** Which slot the current hour falls into, so the app can offer something apt without asking. */
export function slotForNow(now = new Date()): DhikrSlot {
  const h = now.getHours();
  if (h >= 4 && h < 11) return 'morning';
  if (h >= 15 && h < 21) return 'evening';
  if (h >= 22 || h < 4) return 'sleep';
  return 'anytime';
}

export function adhkarFor(slot: DhikrSlot): Dhikr[] {
  return ADHKAR.filter((d) => d.slot.includes(slot));
}
