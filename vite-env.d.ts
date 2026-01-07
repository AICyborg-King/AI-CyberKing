/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Augment the NodeJS namespace to ensure process.env.API_KEY is typed.
// This resolves the "Cannot redeclare block-scoped variable 'process'" error
// while maintaining type safety for process.env usage.
declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
  }
}
