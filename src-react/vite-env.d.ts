/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  // aggiungi qui altre variabili d'ambiente se necessario
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
