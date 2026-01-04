export type CleaningProduct = { id: string; label: string };

export const CLEANING_PRODUCTS: CleaningProduct[] = [
  { id: "mop", label: "Mocio/Scopa" },
  { id: "bucket", label: "Secchio" },
  { id: "floor_cleaner", label: "Detersivo pavimenti" },
  { id: "glass_cleaner", label: "Detergente vetri" },
  { id: "degreaser", label: "Sgrassatore" },
  { id: "bathroom_cleaner", label: "Detergente bagno" },
  { id: "sponges", label: "Spugne" },
  { id: "cloths", label: "Panni in microfibra" },
  { id: "vacuum", label: "Aspirapolvere" },
];

export const getCleaningProductLabel = (id: string): string => {
  const found = CLEANING_PRODUCTS.find((p) => p.id === id);
  return found ? found.label : id;
};
