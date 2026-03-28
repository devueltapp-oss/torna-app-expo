module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@/screens': './src/screens',
          '@/navigators': './src/navigators',
          '@/config': './src/config',
          '@/bootstrap': './src/bootstrap.tsx',
          '@/components': './src/components',
          '@/mocks': './src/mocks',
          '@/utils': './src/utils',
          '@/assets': './src/assets',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
