import {UnistylesRegistry} from 'react-native-unistyles';

import {breakpoints} from '@/config/breakpoints';
import {darkTheme, lightTheme} from '@/config/theme';

UnistylesRegistry.addBreakpoints(breakpoints)
  .addThemes({
    light: lightTheme,
    dark: darkTheme,
    // register other themes with unique names
  })
  .addConfig({
    // you can pass here optional config described below
    adaptiveThemes: true,
  });
