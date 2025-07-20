/**
 * Constructs a URL for a high-resolution item image from the OSRS Wiki.
 * The wiki formats image filenames by capitalizing the first letter and
 * replacing spaces with underscores. It also requires URL encoding for
 * certain special characters like `+` and `'`.
 * @param itemName The name of the item from the OSRS Wiki API.
 * @returns The full URL to the item's image.
 */
export const getHighResImageUrl = (itemName: string): string => {
  if (!itemName) return '';

  // The OSRS Wiki API item names are used to construct image file names.
  // 1. Replace all spaces with underscores. This correctly handles names
  //    with and without spaces before parentheses, e.g.,
  //    "Rune platebody (t)" -> "Rune_platebody_(t)"
  //    "Bronze arrow(p)" -> "Bronze_arrow(p)" (which wiki redirects)
  let fileName = itemName.replace(/ /g, '_');
  
  // 2. Capitalize the first letter.
  fileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
  
  // 3. Manually URL-encode special characters found in item names.
  //    The wiki uses encoded characters for `+` and `'` in filenames.
  //    e.g., "Amethyst arrow(p++)" -> "Amethyst_arrow(p%2B%2B)"
  //    e.g., "Saradomin's tear" -> "Saradomin%27s_tear"
  fileName = fileName.replace(/\+/g, '%2B').replace(/'/g, '%27');
  
  return `https://oldschool.runescape.wiki/images/${fileName}.png`;
};

/**
 * Creates a data URL for a base64-encoded image or returns an existing data URL.
 * @param iconData The base64 string or full data URL of the icon.
 * @returns The full data URL for the image.
 */
export const createIconDataUrl = (iconData: string): string => {
    if (!iconData) return ''; // Handle cases where an icon might be missing
    // If the icon data is already a valid data URL, return it as is.
    if (iconData.startsWith('data:image/')) {
        return iconData;
    }
    // Otherwise, assume it's a raw base64 string and construct the data URL.
    return `data:image/png;base64,${iconData}`;
};

/**
 * Parses a string that may contain 'k' (thousands) or 'm' (millions)
 * shorthands into a number.
 * e.g., "100k" -> 100000, "2.5m" -> 2500000
 * @param value The string value to parse.
 * @returns The parsed number, or NaN if invalid.
 */
export const parseShorthandPrice = (value: string): number => {
  if (typeof value !== 'string' || !value) return NaN;

  const sanitizedValue = value.toLowerCase().trim();
  const multiplier = sanitizedValue.endsWith('m') ? 1000000 : sanitizedValue.endsWith('k') ? 1000 : 1;
  
  // Remove commas and the k/m suffix for parsing
  const numPart = sanitizedValue.replace(/,/g, '').replace(/[km]$/, '');

  // An empty string is not a valid number
  if (numPart.trim() === '') return NaN;

  const number = parseFloat(numPart);
  if (isNaN(number)) return NaN;

  return Math.floor(number * multiplier);
};

const TAX_EXEMPT_ITEMS = new Set([
  'Old school bonds',
  'Energy potion',
  'Bronze arrow',
  'Bronze dart',
  'Iron arrow',
  'Iron dart',
  'Mind rune',
  'Steel arrow',
  'Steel dart',
  'Bass',
  'Bread',
  'Cake',
  'Cooked chicken',
  'Cooked meat',
  'Herring',
  'Lobster',
  'Mackerel',
  'Meat pie',
  'Pike',
  'Salmon',
  'Shrimps',
  'Tuna',
  'Ardougne teleport',
  'Camelot teleport',
  'Civitas illa fortis teleport',
  'Falador teleport',
  'Games necklace (8)',
  'Kourend castle teleport',
  'Lumbridge teleport',
  'Ring of dueling (8)',
  'Teleport to house',
  'Varrock teleport',
  'Chisel',
  'Gardening trowel',
  'Glassblowing pipe',
  'Hammer',
  'Needle',
  'Pestle and mortar',
  'Rake',
  'Saw',
  'Secateurs',
  'Seed dibber',
  'Shears',
  'Spade',
  'Watering can (0)',
]);

const TAX_RATE = 0.02;
const MIN_PRICE_FOR_TAX = 50;
const MAX_TAX_AMOUNT = 5_000_000;

/**
 * Calculates the Grand Exchange tax for a transaction.
 * @param itemName The name of the item being sold.
 * @param sellPrice The price per item.
 * @param quantity The number of items sold.
 * @returns The total tax amount, rounded down.
 */
export const calculateGeTax = (itemName: string, sellPrice: number, quantity: number): number => {
  if (TAX_EXEMPT_ITEMS.has(itemName)) {
    return 0;
  }

  // The wiki states tax applies to individual items over 50gp, but the in-game
  // behavior seems to apply it to any item over 0gp, with the total tax being
  // effectively 0 for low value stacks. The user specified items over 50gp.
  // To be safe and explicit, let's follow the user's rule.
  if (sellPrice <= MIN_PRICE_FOR_TAX) {
      return 0;
  }

  const totalSaleValue = sellPrice * quantity;
  const rawTax = Math.floor(totalSaleValue * TAX_RATE);
  
  return Math.min(rawTax, MAX_TAX_AMOUNT);
};