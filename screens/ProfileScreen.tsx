import React from 'react';
import { View, Text, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, MapPin } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Input } from '../components/ui';
import { BottomTabBar, TabId } from '../components/BottomTabBar';

const tornaLogo = require('../assets/torna-icon.png');

export interface ClubProfile {
  name: string; username: string; address: string;
  phone: string; description: string; region?: string;
}

interface Props {
  profile: ClubProfile;
  onSave?: (p: ClubProfile) => void;
  onChangePassword?: (current: string, next: string) => void;
  onChangeTab?: (id: TabId) => void;
  activeTab?: TabId;
  role?: 'player' | 'club';
}

const PASSWORD_RULES = (next: string, confirm: string) => [
  { label: 'Mínimo 8 caracteres',   ok: next.length >= 8 },
  { label: 'Una mayúscula',         ok: /[A-Z]/.test(next) },
  { label: 'Una minúscula',         ok: /[a-z]/.test(next) },
  { label: 'Un número',             ok: /\d/.test(next) },
  { label: 'Un carácter especial',  ok: /[^A-Za-z0-9]/.test(next) },
  { label: 'Confirmación coincide', ok: next.length > 0 && next === confirm },
];

function PasswordChecklist({ next, confirm }: { next: string; confirm: string }) {
  const { colors } = useTheme();
  const rules = PASSWORD_RULES(next, confirm);
  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, gap: 7 }}>
      <Text style={{ color: colors.muted2, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' }}>Tu nueva contraseña debe tener</Text>
      {rules.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <View style={{
            width: 18, height: 18, borderRadius: 6,
            backgroundColor: r.ok ? colors.success : colors.bg3,
            borderWidth: r.ok ? 0 : 1.5, borderColor: colors.lineStrong,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {r.ok && <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>✓</Text>}
          </View>
          <Text style={{ color: r.ok ? colors.success : colors.muted2, fontSize: 13 }}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function ProfileScreen({ profile, onSave, onChangePassword, onChangeTab, activeTab = 'profile', role = 'club' }: Props) {
  const { colors } = useTheme();
  const [tab, setTab] = React.useState<'profile' | 'security'>('profile');
  const [form, setForm] = React.useState<ClubProfile>(profile);
  const [pwCurrent, setPwCurrent] = React.useState('');
  const [pwNext, setPwNext] = React.useState('');
  const [pwConfirm, setPwConfirm] = React.useState('');
  const set = (k: keyof ClubProfile) => (v: string) => setForm(s => ({ ...s, [k]: v }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surface }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={tornaLogo} style={{ width: 50, height: 50 }}/>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 }} numberOfLines={1}>{profile.name}</Text>
          <Text style={{ color: colors.muted2, fontSize: 12 }}>{profile.username}{profile.region ? ` · ${profile.region}` : ''}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 20, gap: 12, backgroundColor: colors.surface }}>
        {(['profile','security'] as const).map(t => {
          const on = tab === t;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
              <Text style={{ color: on ? colors.text : colors.muted2, fontWeight: '700', fontSize: 13 }}>
                {t === 'profile' ? 'Perfil' : 'Seguridad'}
              </Text>
              {on && <View style={{ position: 'absolute', left: 4, right: 4, bottom: 0, height: 2, backgroundColor: colors.primary }} />}
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {tab === 'profile' ? (
          <>
            <Input label="Nombre del club" value={form.name} onChangeText={set('name')} />
            <Input label="Username"        value={form.username} onChangeText={set('username')} autoCapitalize="none" />
            <Input label="Dirección"       value={form.address} onChangeText={set('address')} icon={<MapPin size={18} color={colors.muted2}/>}/>
            <Input label="Teléfono"        value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad"/>
            <Input label="Descripción"     value={form.description} onChangeText={set('description')} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button variant="soft" fullWidth onPress={() => setForm(profile)}>Descartar</Button>
              <Button variant="primary" fullWidth onPress={() => onSave?.(form)}>Guardar cambios</Button>
            </View>
          </>
        ) : (
          <>
            <Input label="Contraseña actual"     icon={<Lock size={18} color={colors.muted2}/>} value={pwCurrent} onChangeText={setPwCurrent} secureTextEntry />
            <Input label="Nueva contraseña"      icon={<Lock size={18} color={colors.muted2}/>} value={pwNext} onChangeText={setPwNext} secureTextEntry />
            <Input label="Confirmar contraseña"  icon={<Lock size={18} color={colors.muted2}/>} value={pwConfirm} onChangeText={setPwConfirm} secureTextEntry />
            <PasswordChecklist next={pwNext} confirm={pwConfirm}/>
            <Button fullWidth variant="primary" onPress={() => onChangePassword?.(pwCurrent, pwNext)}>
              Actualizar contraseña
            </Button>
          </>
        )}
      </ScrollView>

      {onChangeTab && <BottomTabBar role={role} active={activeTab} onChange={onChangeTab}/>}
    </SafeAreaView>
  );
}
