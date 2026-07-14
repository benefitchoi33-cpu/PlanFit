import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
  const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
  
  // GitHub Actions 배포 시 사용자/조직 페이지(*.github.io)면 루트('/'), 일반 프로젝트면 서브디렉토리('/repo-name/')
  // 그 외 개발/미리보기 환경에서는 상대경로('./')를 사용하여 리소스를 안전하게 로드합니다.
  let base = './';
  if (isGithubActions && repoName) {
    if (repoName.toLowerCase().endsWith('.github.io')) {
      base = '/';
    } else {
      base = `/${repoName}/`;
    }
  }

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
