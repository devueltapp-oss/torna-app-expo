import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme';
import type { GameListData } from './cards';
export function ClubAgendaSection({games,loading,error,onPrepare,onWatch,onCreate,onSeeAll}: {
 games: GameListData[]; loading?: boolean; error?: string | null;
 onPrepare?: (id:string)=>void; onWatch?: (id:string)=>void; onCreate?:()=>void; onSeeAll?:()=>void;
}) {
 const {colors}=useTheme();
 const active=games.filter(g=>g.status==='LIVE'||g.status==='SCHEDULED');
 return <View style={{padding:16,gap:12}}>
   <Text style={{color:colors.text,fontSize:20,fontWeight:'800'}}>Partidas de tu club</Text>
   <Text style={{color:colors.muted2}}>Abrí una partida para conectar sus cámaras y revisar el encuadre.</Text>
   {loading && <ActivityIndicator accessibilityLabel="Cargando agenda" />}
   {!!error && <Text accessibilityRole="alert" style={{color:colors.text}}>{error}</Text>}
   {!loading && !error && !active.length && <Text style={{color:colors.muted2}}>No hay partidas agendadas ni en curso.</Text>}
   {active.slice(0,5).map(g=><View key={g.id} style={{padding:16,gap:8,borderRadius:12,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line}}>
     <Text style={{color:colors.text,fontSize:16,fontWeight:'700'}}>{g.court}</Text>
     <Text style={{color:colors.muted2}}>{g.date} · {g.time} · {g.status==='LIVE'?'En vivo':'Agendada'}</Text>
     <Pressable accessibilityRole="button" onPress={()=>g.status==='LIVE'?onWatch?.(g.id):onPrepare?.(g.id)} style={{paddingVertical:12}}>
       <Text style={{color:colors.accentText,fontWeight:'800'}}>{g.status==='LIVE'?'Ver transmisión':'Iniciar partida · preparar cámaras'}</Text>
     </Pressable>
   </View>)}
   <View style={{flexDirection:'row',gap:20}}>
     <Pressable accessibilityRole="button" onPress={onCreate} style={{paddingVertical:14}}><Text style={{color:colors.accentText,fontWeight:'700'}}>Agendar partida</Text></Pressable>
     <Pressable accessibilityRole="button" onPress={onSeeAll} style={{paddingVertical:14}}><Text style={{color:colors.text}}>Ver todas</Text></Pressable>
   </View>
 </View>;
}
