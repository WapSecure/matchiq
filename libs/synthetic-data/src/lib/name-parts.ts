const words = (list: string): readonly string[] => list.split(' ');

/** Syllables combine into invented names; none are taken from real clubs or players. */
export const NAME_PARTS = {
  givenStarts: words(
    'Al Bran Cael Dar El Fen Gar Hal Ior Jas Kel Lor Mal Nor Os Per Quen Ros Sel Tam Ul Vas Wen Yor Zed',
  ),
  givenEnds: words('an ek ius o ric en is ard el on'),
  familyStarts: words(
    'Ash Bel Cor Dun Ever Fair Grim Hollo Ingle Kest Lang Mor Nethe Oak Pell Quill Rav Stam Thorn Umber Vant Wex Yarrow',
  ),
  familyEnds: words(
    'by cott dale feld grove holt ley mere ridge stow ton wick',
  ),
  cityStarts: words(
    'Ard Bram Calder Dray Elm Fern Glen Harrow Iver Kings Lyn Marsh North Orm Pen Quarry Rook Silver Tarn Vale West Wyn',
  ),
  cityEnds: words('brook bury ford gate haven holm mouth port stead water'),
  clubSuffixes: words('Athletic Rovers Wanderers Town Albion Harriers'),
} as const;
