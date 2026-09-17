export const photoSources = {
  greens: 'https://images.pexels.com/photos/8543293/pexels-photo-8543293.jpeg',
  peas: 'https://images.pexels.com/photos/9031150/pexels-photo-9031150.jpeg',
  sunflower: 'https://images.pexels.com/photos/9031151/pexels-photo-9031151.jpeg',
  cress: 'https://images.pexels.com/photos/12966802/pexels-photo-12966802.jpeg',
};
export function productPhoto(variety: string) {
  return /pea/i.test(variety) ? photoSources.peas : /sunflower/i.test(variety) ? photoSources.sunflower : /cress/i.test(variety) ? photoSources.cress : photoSources.greens;
}
export function taste(variety: string) {
  return /radish|mustard|cress/i.test(variety) ? 'Peppery' : /basil/i.test(variety) ? 'Aromatic' : /amaranth|kohlrabi/i.test(variety) ? 'Earthy' : 'Mild & sweet';
}
export function servingIdea(variety: string) {
  return /basil/i.test(variety) ? 'Finish pasta, tomato salads, or an open sandwich with a small handful.' : /radish|mustard|cress/i.test(variety) ? 'Add a peppery finishing touch to sandwiches, grain bowls, and savoury toast.' : /pea|sunflower/i.test(variety) ? 'Add crunch to wraps and salads, or scatter over a bowl just before serving.' : 'Scatter over toast, salads, and bowls for a colourful finishing touch.';
}
