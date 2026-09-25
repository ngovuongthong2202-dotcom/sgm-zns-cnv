import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';
import eslintPluginImport from 'eslint-plugin-import';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '*.cjs', '*.js', 'scripts'] },
  {
    plugins: {
      'unused-imports': unusedImports,
      'import': eslintPluginImport,
    },
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'import/no-cycle': ['error', { maxDepth: 4 }],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/domain',
              from: './src/features',
              message: 'Domain layer cannot import from features.'
            },
            {
              target: './src/domain',
              from: './src/widgets',
              message: 'Domain layer cannot import from widgets.'
            },
            {
              target: './src/domain',
              from: './src/design-system',
              message: 'Domain layer cannot import from design-system.'
            },
            {
              target: './src/lib',
              from: './src/features',
              message: 'Lib layer cannot import from features.'
            },
            {
              target: './src/design-system',
              from: './src/domain',
              message: 'Design system cannot import from domain limits.'
            },
            {
              target: './src/backend',
              from: './src/features',
              message: 'Backend cannot import from frontend features.'
            },
            {
              target: './src/modules/*/domain',
              from: './src/modules/*/ui',
              message: 'Domain cannot import from UI'
            },
            {
              target: './src/modules/*/domain',
              from: './src/modules/*/infrastructure',
              message: 'Domain cannot import from Infrastructure'
            },
            {
              target: './src/modules/*/application',
              from: './src/modules/*/ui',
              message: 'Application cannot import from UI'
            },
            {
              target: './src/modules/*/application',
              from: './src/modules/*/infrastructure',
              message: 'Application cannot import from Infrastructure'
            }
          ]
        }
      ],
      'unused-imports/no-unused-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        { 'vars': 'all', 'varsIgnorePattern': '^_', 'args': 'after-used', 'argsIgnorePattern': '^_' }
      ],
      '@typescript-eslint/no-unused-vars': 'off', // Turn off the base rule
      '@typescript-eslint/ban-ts-comment': 'off', // Allowed in legacy UI, strictly forbidden in domain
      'max-lines': ['warn', { max: 280, skipBlankLines: true, skipComments: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/(fuchsia|purple|rose|pink|indigo|magenta|violet)-/]",
          message: "The Bright Palette strictly forbids the use of fuchsia, purple, rose, pink, indigo, magenta, and violet. Please use standard semantic colors (emerald, blue, amber, red, slate).",
        },
        {
          selector: "TemplateElement[value.raw=/(fuchsia|purple|rose|pink|indigo|magenta|violet)-/]",
          message: "The Bright Palette strictly forbids the use of fuchsia, purple, rose, pink, indigo, magenta, and violet. Please use standard semantic colors (emerald, blue, amber, red, slate).",
        }
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/data/**/*.ts', 'src/data/**/*.tsx', 'src/shared/config/firebase.client.ts', 'src/backend/**/*.ts', 'src/hooks/useFirestoreData.ts', 'src/hooks/useMutation.ts', 'src/modules/*/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'firebase/firestore',
              message: 'Importing firebase/firestore outside of src/data or config is restricted. Please use repository layer instead.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/platform/domain/**/*.{ts,tsx}', 'src/modules/*/domain/**/*.{ts,tsx}'],
    ignores: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error'
    }
  },
  {
    files: ['src/platform/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/platform',
              from: './src/modules',
              message: 'Platform layer cannot import from modules.'
            },
            {
              target: './src/platform',
              from: './src/features',
              message: 'Platform layer cannot import from features.'
            }
          ]
        }
      ]
    }
  }
);
