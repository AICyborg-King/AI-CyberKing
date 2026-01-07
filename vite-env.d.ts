interface ImportMetaEnv {
  readonly API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Augment the global NodeJS namespace provided by @types/node
// This allows `process.env.API_KEY` to be typed correctly without conflicts.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}