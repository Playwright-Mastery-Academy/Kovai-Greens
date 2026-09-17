export function taste(variety: string) {
  return /radish|mustard|cress/i.test(variety) ? 'Peppery' : /basil/i.test(variety) ? 'Aromatic' : /amaranth|kohlrabi/i.test(variety) ? 'Earthy' : 'Mild & sweet';
}
export function servingIdea(variety: string) {
  return /basil/i.test(variety) ? 'Finish pasta, tomato salads, or an open sandwich with a small handful.' : /radish|mustard|cress/i.test(variety) ? 'Add a peppery finishing touch to sandwiches, grain bowls, and savoury toast.' : /pea|sunflower/i.test(variety) ? 'Add crunch to wraps and salads, or scatter over a bowl just before serving.' : 'Scatter over toast, salads, and bowls for a colourful finishing touch.';
}
