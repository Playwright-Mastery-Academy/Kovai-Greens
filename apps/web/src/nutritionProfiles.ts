export const nutrientGuide = {
  C: { name: 'Vitamin C', role: 'Helps make collagen and improves absorption of iron from plant foods.', source: 'https://ods.od.nih.gov/factsheets/VitaminC-Consumer/' },
  A: { name: 'Beta-carotene', role: 'The body can convert beta-carotene into vitamin A, which supports normal vision and immune function.', source: 'https://ods.od.nih.gov/factsheets/VitaminA-Consumer/' },
  E: { name: 'Vitamin E', role: 'Helps protect cells from oxidative damage as part of the body’s antioxidant defences.', source: 'https://ods.od.nih.gov/factsheets/VitaminE-HealthProfessional/' },
  K: { name: 'Vitamin K1', role: 'Supports normal blood clotting and the proteins involved in healthy bones.', source: 'https://ods.od.nih.gov/factsheets/VitaminK-Consumer/' },
  Mg: { name: 'Magnesium', role: 'Contributes to normal muscle and nerve function.', source: 'https://ods.od.nih.gov/factsheets/Magnesium-Consumer/' },
  Fe: { name: 'Iron', role: 'The body uses iron to make the proteins that carry oxygen in blood and muscles.', source: 'https://ods.od.nih.gov/factsheets/Iron-Consumer/' },
};
type Nutrient = keyof typeof nutrientGuide;
type Profile = { nutrients: Nutrient[]; note: string; source: string };
const vitamins = 'https://www.ars.usda.gov/research/publications/publication/?seqNo115=278071';
const culinary = 'https://www.sciencedirect.com/science/article/pii/S0889157519317806';
const minerals = 'https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2023.1220691/full';
const brassica = 'https://www.actahort.org/books/1321/1321_32.htm';
// Qualitative research highlights, not measured composition or nutrient-content claims for our products.
export const nutritionProfiles: Record<string, Profile> = {
  'sunflower': { nutrients: ['C','E','A'], note: 'Sunflower seedlings were included in research on culinary microgreen vitamins.', source: culinary },
  'pea shoots': { nutrients: ['C','K','A'], note: 'Green pea tendrils were assessed for vitamins and carotenoids.', source: vitamins },
  'radish': { nutrients: ['C','E'], note: 'Radish cultivars showed differing vitamin profiles in microgreen research.', source: vitamins },
  'broccoli': { nutrients: ['Mg','Fe'], note: 'Broccoli microgreens have been studied for their mineral composition.', source: 'https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2017.00007/full' },
  'mustard': { nutrients: ['C','E','A'], note: 'Culinary microgreen studies measured these vitamins in mustard seedlings.', source: culinary },
  'red amaranth': { nutrients: ['K','C'], note: 'Garnet amaranth was a notable vitamin K1 variety in one study; cultivars differ.', source: vitamins },
  'kale': { nutrients: ['Mg','Fe'], note: 'Red Russian kale was included in comparative mineral research.', source: minerals },
  'purple kohlrabi': { nutrients: ['C','K'], note: 'Purple kohlrabi was assessed for these vitamins as a microgreen.', source: vitamins },
  'basil': { nutrients: ['C','E','A'], note: 'French basil seedlings were analysed in culinary microgreen research.', source: culinary },
  'garden cress': { nutrients: ['C','A'], note: 'Cress microgreen research measured ascorbic acid and carotenoids.', source: brassica },
  'coriander': { nutrients: ['A','C','K'], note: 'Cilantro microgreens showed notable carotenoids in comparative research.', source: vitamins },
  'fenugreek': { nutrients: ['C','E','A'], note: 'Fenugreek microgreens were analysed for these vitamin-related compounds.', source: culinary },
  'arugula': { nutrients: ['C','K'], note: 'Arugula was included in vitamin and carotenoid testing.', source: vitamins },
  'beetroot': { nutrients: ['C','K'], note: 'Red beet seedlings were included in microgreen vitamin research.', source: vitamins },
  'red cabbage': { nutrients: ['C','K'], note: 'Red cabbage had notable vitamin C in a 25-variety comparison.', source: vitamins },
  'pak choi': { nutrients: ['C','A'], note: 'Pak choi microgreens were assessed for ascorbic acid and carotenoids.', source: brassica },
  'mizuna': { nutrients: ['C','K'], note: 'Mizuna was included in microgreen vitamin testing.', source: vitamins },
  'tatsoi': { nutrients: ['C','A'], note: 'Tatsoi microgreens were assessed for ascorbic acid and carotenoids.', source: brassica },
  'dill': { nutrients: ['C','A'], note: 'Dill microgreen research measured vitamin C and beta-carotene.', source: 'https://doi.org/10.3390/plants11223057' },
  'swiss chard': { nutrients: ['Mg','Fe'], note: 'Swiss chard microgreens have been studied for minerals and their bioaccessibility.', source: 'https://www.sciencedirect.com/science/article/pii/S2666833524002223' },
  'sorrel': { nutrients: ['C','A'], note: 'Sorrel seedlings were studied for vitamin C and carotenoids.', source: vitamins },
  'daikon radish': { nutrients: ['E','C'], note: 'Green daikon had notable vitamin E in comparative microgreen research.', source: vitamins },
};
export function nutritionFor(variety: string): Profile | undefined {
  const key = variety.trim().toLowerCase();
  return nutritionProfiles[key === 'cilantro' ? 'coriander' : key === 'cress' ? 'garden cress' : key];
}
