/**
 * Embaralha um array in-place usando Fisher-Yates.
 * Mantém o gerador opcional para que regras de jogo possam ser testadas
 * sem depender de aleatoriedade real.
 * @param {any[]} array
 * @param {() => number} random
 * @returns {any[]}
 */
export function fisherYates(array, random = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
