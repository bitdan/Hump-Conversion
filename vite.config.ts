import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import {fileURLToPath, URL} from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '')

    return {
        plugins: [
            vue({
                template: {
                    compilerOptions: {
                        isCustomElement: (tag) => tag === 'emoji-picker'
                    }
                }
            }),
            vuetify({autoImport: true})
        ],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
                crypto: fileURLToPath(new URL('./src/shims/nodeCrypto.ts', import.meta.url))
            },
            extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
        },
        optimizeDeps: {
            esbuildOptions: {
                define: {
                    global: 'globalThis'
                }
            }
        },
        server: {
            port: parseInt(env.VITE_PORT || '5173'),
            host: true,
            proxy: {
                '/api': {
                    target: env.VITE_API_URL || 'http://localhost:8000/api/v1',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, '')
                }
            }
        },
        build: {
            target: 'es2015',
            outDir: 'dist',
            assetsDir: 'assets',
            minify: 'esbuild',
            rollupOptions: {
                output: {
                    // 入口文件带哈希
                    entryFileNames: 'assets/[name]-[hash].js',
                    // 代码分割块带哈希
                    chunkFileNames: 'assets/[name]-[hash].js',
                    // 静态资源带哈希（图片、字体等）
                    assetFileNames: 'assets/[name]-[hash].[ext]',
                    manualChunks: {
                        'vue-vendor': ['vue', 'vue-router', 'vuetify']
                    }
                }
            },
            chunkSizeWarningLimit: 1000
        },
        css: {
            devSourcemap: true
        }
    }
}) 
