/**
 * NearbyPromptCard — contraste y acciones.
 *
 * El test que importa acá es el de **contraste**, porque es lo que se rompió: la
 * primera versión pintaba el botón con `colors.accentText` de fondo y
 * `colors.accentSoft` de texto. En tema oscuro eso es lima sólida con letras
 * lima **al 18 % de opacidad** — o sea, un botón cuyo texto no se lee.
 *
 * La regla que fija: **ningún texto de esta tarjeta puede usar un color
 * translúcido ni el mismo tono que su fondo.** Los pares seguros del design
 * system son texto sobre `bg2`/`surface`, o `colors.ink` sobre lima sólida (que
 * es lo que da `Button variant="accent"`).
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '../../theme';
import { NearbyPromptCard } from '../NearbyPromptCard';
import { darkColors, lightColors } from '../../theme/tokens';

const palette = { light: lightColors, dark: darkColors };

function renderCard(
  props: Partial<React.ComponentProps<typeof NearbyPromptCard>> = {},
  theme: 'light' | 'dark' = 'dark',
) {
  return render(
    <ThemeProvider initial={theme}>
      <NearbyPromptCard onEnable={jest.fn()} onDismiss={jest.fn()} {...props} />
    </ThemeProvider>,
  );
}

/** Todos los colores de texto efectivos que renderiza la tarjeta. */
function textColors(tree: ReturnType<typeof renderCard>): string[] {
  return tree.UNSAFE_getAllByType(Text)
    .map((n) => {
      const style = Array.isArray(n.props.style)
        ? Object.assign({}, ...n.props.style.filter(Boolean))
        : n.props.style;
      return style?.color;
    })
    .filter((c): c is string => typeof c === 'string');
}

describe('NearbyPromptCard — legibilidad', () => {
  it.each(['light', 'dark'] as const)(
    'en tema %s ningún texto usa un color translúcido de acento',
    (theme) => {
      const colors = textColors(renderCard({}, theme));
      const p = palette[theme];

      expect(colors.length).toBeGreaterThan(0);
      // `accentSoft` es rgba(...,0.18): como color de TEXTO es invisible.
      expect(colors).not.toContain(p.accentSoft);
      expect(colors).not.toContain(p.primary100);
    },
  );

  /**
   * En oscuro `accentText` es lima sólida. Usarla para el copy sobre una
   * superficie teñida de lima es exactamente lo que el usuario reportó como
   * "las letras verdes no se aprecian".
   */
  it('en tema oscuro el copy no se pinta de lima', () => {
    const colors = textColors(renderCard({}, 'dark'));
    expect(colors).not.toContain(darkColors.accent);
    expect(colors).not.toContain(darkColors.accentText); // lima sólida en oscuro
  });

  it('muestra el radio que manda el backend, sin inventarlo', () => {
    const { getByText } = renderCard({ radiusKm: 10 });
    expect(getByText(/menos de 10 km/)).toBeTruthy();
  });
});

describe('NearbyPromptCard — acciones', () => {
  it('"Activar" dispara onEnable (es lo único que pide el permiso)', () => {
    const onEnable = jest.fn();
    const { getByText } = renderCard({ onEnable });

    fireEvent.press(getByText('Activar'));
    expect(onEnable).toHaveBeenCalled();
  });

  it('"No, gracias" descarta', () => {
    const onDismiss = jest.fn();
    const { getByText } = renderCard({ onDismiss });

    fireEvent.press(getByText('No, gracias'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('mientras carga no se puede volver a disparar', () => {
    const onEnable = jest.fn();
    const { queryByText } = renderCard({ onEnable, loading: true });

    // `Button` con `loading` reemplaza el texto por el spinner y bloquea onPress.
    expect(queryByText('Activar')).toBeNull();
  });
});
