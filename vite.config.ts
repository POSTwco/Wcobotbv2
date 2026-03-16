import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Custom plugin to resolve Figma Make's virtual `figma:asset/` imports
// for production builds outside of the Figma Make environment.
// Points to public Supabase Storage bucket: "Branding KIT WCO"
const SUPABASE_STORAGE_BASE =
  'https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO';

// Verified asset map: figma:asset/ hash → Supabase Storage public URL
const figmaAssetMap: Record<string, string> = {
  '22c05ec446c8158ec65d140d4aaa2c8dc2532079.png': `${SUPABASE_STORAGE_BASE}/WCOWHITELETTERSONLY%20CLEAR%20BACKGROUND.png`,
  '2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png': `${SUPABASE_STORAGE_BASE}/BOTB%20SHIELD%20LOGORegisteredsmall.png`,
  'fistWCOClear.png': `${SUPABASE_STORAGE_BASE}/fistWCOClear.png`,
  'bb4c9e2121e2b0c21f1d7d6468c12d5446942a46.png': `${SUPABASE_STORAGE_BASE}/sigmanft.png`,
  '27f44f9b528f18c214f9c3973e3bd8fbaae8e742.png': `${SUPABASE_STORAGE_BASE}/starboy.png`,
  '59d46a6fadc438482fc2483e8e0bce17ea1a59ed.png': `${SUPABASE_STORAGE_BASE}/vitalii.png`,
};

function figmaAssetPlugin() {
  return {
    name: 'figma-asset-resolver',
    enforce: 'pre' as const,
    resolveId(source: string) {
      if (source.startsWith('figma:asset/')) {
        const filename = source.replace('figma:asset/', '');
        if (figmaAssetMap[filename]) {
          return `\0figma-asset:${filename}`;
        }
        // Fallback: still resolve it so the build doesn't crash
        return `\0figma-asset:${filename}`;
      }
      return null;
    },
    load(id: string) {
      if (id.startsWith('\0figma-asset:')) {
        const filename = id.replace('\0figma-asset:', '');
        const url = figmaAssetMap[filename] || `/assets/${filename}`;
        return `export default "${url}";`;
      }
      return null;
    },
  };
}

// Stub plugin: resolves optional peer deps of @hashgraph/hedera-wallet-connect
// to empty modules so they compile away entirely (no bare specifiers in the browser bundle).
// NOTE: @hiero-ledger/sdk and @hiero-ledger/proto are NOT stubbed — they're aliased
// to @hashgraph/sdk and @hashgraph/proto because shared utils need real classes.

// Exact-match modules to stub
const STUBBED_MODULES = [
  '@hiero-ledger/wallet-connect',
  'ethers',
  '@walletconnect/jsonrpc-http-connection',
  '@walletconnect/universal-provider',    // only used in reown/ HederaProvider
];

// Prefix-match: anything under these scopes gets stubbed
const STUBBED_PREFIXES = [
  '@reown/',           // all @reown/* packages (walletkit, appkit, appkit-common, appkit-controllers, appkit-utils, etc.)
];

function stubOptionalDepsPlugin() {
  const isStubbed = (source: string) =>
    STUBBED_MODULES.includes(source) ||
    STUBBED_MODULES.some((m) => source.startsWith(m + '/')) ||
    STUBBED_PREFIXES.some((p) => source.startsWith(p));

  // All known named value-imports from stubbed modules (gathered from HWC dist).
  // Types are stripped at compile time, so only runtime values need stubs.
  const STUB_NAMED_EXPORTS = [
    // @reown/*
    'defineChain', 'AdapterBlueprint', 'WcHelpersUtil', 'CaipNetwork',
    'ConstantsUtil', 'CoreHelperUtil', 'PresetsUtil', 'WalletKit',
    'isReownName', 'ChainNamespace', 'RequestArguments',
    // ethers
    'ethers', 'BrowserProvider', 'Contract', 'JsonRpcSigner', 'hexlify',
    'isHexString', 'toQuantity', 'toUtf8Bytes', 'formatUnits', 'parseUnits',
    'JsonRpcProvider', 'BaseWallet', 'TransactionResponse', 'Wallet',
    'Transaction', 'TransactionRequest',
    // @walletconnect/*
    'IProvider', 'SessionNamespace', 'RpcProvidersMap', 'RequestParams',
    'Namespace', 'NamespaceConfig', 'HttpConnection',
  ];

  return {
    name: 'stub-optional-deps',
    enforce: 'pre' as const,
    resolveId(source: string) {
      if (isStubbed(source)) {
        return `\0stub:${source}`;
      }
      return null;
    },
    load(id: string) {
      if (id.startsWith('\0stub:')) {
        // Generate a module with explicit named exports for every known import.
        // `noop` is a callable that returns itself, so chained access like
        // `defineChain({...}).id` also works without crashing.
        const exports = STUB_NAMED_EXPORTS.map(
          (n) => `export const ${n} = noop;`,
        ).join('\n');
        return `function noop() { return noop; }\nnoop.prototype = {};\nexport default noop;\n${exports}\n`;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetPlugin(),
    stubOptionalDepsPlugin(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // ── Hiero → Hashgraph aliases ──────────────────────────────────
      // The Hiero Foundation rebranded the Hedera SDK packages.
      // @hashgraph/hedera-wallet-connect v2.0.6 imports from the NEW names
      // (@hiero-ledger/*), but our project installs the OLD names (@hashgraph/*).
      // These aliases let Vite resolve new→old seamlessly.
      '@hiero-ledger/sdk': path.resolve(__dirname, 'node_modules/@hashgraph/sdk'),
      '@hiero-ledger/proto': path.resolve(__dirname, 'node_modules/@hashgraph/proto'),
    },
  },

  // Force Lit (used internally by @walletconnect/modal) into production mode.
  // Suppresses "Lit is in dev mode" console warning, enables minified Lit
  // templates, and removes dev-only runtime checks for smaller bundle.
  // See: https://lit.dev/msg/dev-mode
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Externalize optional/wallet-side dependencies that aren't needed for the dApp frontend
  build: {
    rollupOptions: {
      // REMOVED the onLog handler that was suppressing UNRESOLVED_IMPORT warnings.
      // That handler caused Rollup to silently externalize missing packages, which
      // then leaked as bare module specifiers into the browser bundle and crashed
      // at runtime. All problematic packages should be properly stubbed above instead.
    },
  },
})