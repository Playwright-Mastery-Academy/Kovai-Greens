import React from 'react';
import { nutritionFor, nutrientGuide } from './nutritionProfiles';
export function NutritionDetails({variety}:{variety:string}) {
  const profile = nutritionFor(variety);
  return <details className="shop-product-details shop-nutrition"><summary>Nutrition & benefits</summary>{profile ? <>
    <p className="nutrition-caption">Nutrients reported in research</p><div className="nutrition-chips">{profile.nutrients.map(key=><span key={key}>{nutrientGuide[key].name}</span>)}</div>
    <p>{profile.note}</p><b className="nutrition-subtitle">What these nutrients do</b><ul>{profile.nutrients.map(key=><li key={key}><strong>{nutrientGuide[key].name}: </strong>{nutrientGuide[key].role} <a href={nutrientGuide[key].source} target="_blank" rel="noopener noreferrer" aria-label={'Read NIH information on '+nutrientGuide[key].name}>NIH ↗</a></li>)}</ul>
    <p className="nutrition-caveat">Research highlights, not a tested nutrition label for this harvest. Amounts depend on cultivar, growing conditions, storage, and portion size.</p><a className="nutrition-source" href={profile.source} target="_blank" rel="noopener noreferrer">Microgreen research ↗</a>
  </> : <p>A variety-specific nutrition profile is not available yet. Ask the farm for verified product information.</p>}</details>;
}
export function NutritionGuide() {
  return <section className="shop-nutrition-guide" id="nutrition"><div><p className="shop-eyebrow">SMALL LEAVES, MORE TO DISCOVER</p><h2>Get to know your greens.</h2><p>Microgreens can add variety to a balanced diet. Explore the nutrient roles below and open each product’s nutrition section for variety-specific research.</p></div><div className="nutrition-guide-grid">{Object.entries(nutrientGuide).map(([key,value])=><a key={key} href={value.source} target="_blank" rel="noopener noreferrer"><span className="nutrition-letter">{key}</span><h3>{value.name}</h3><p>{value.role}</p><small>Learn more at NIH ↗</small></a>)}</div><p className="nutrition-guide-note">We don’t publish calories, nutrient amounts, or daily-value percentages without harvest-specific analysis. These notes explain nutrient functions, not guaranteed health outcomes from a serving.</p></section>;
}
