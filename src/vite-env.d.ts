/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 origin (예: "https://capstone-back-59z8.onrender.com"). 미설정 시 dev 프록시 사용. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
