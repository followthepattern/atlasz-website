/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/* Vite serves arbitrary files as URLs with the `?url` suffix, but only knows
   the types of the extensions it ships with. FBX is not one of them. */
declare module "*.fbx?url" {
  const src: string;
  export default src;
}
