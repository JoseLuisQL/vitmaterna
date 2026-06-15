# Recomendación: Modo Oscuro (migración dedicada)

## Por qué no se implementó "rápido"
El modo oscuro NO es un cambio de bajo riesgo en esta base de código. Los
colores (`commonColors`, etc.) se consumen **directamente dentro de
`StyleSheet.create(...)`** en **82 archivos (~1.148 referencias)**. Esos estilos
se evalúan una sola vez al cargar cada módulo, por lo que cambiar el tema en
runtime no los actualiza. Implementarlo a medias dejaría unas pantallas oscuras
y la mayoría claras — peor que no tenerlo.

## Plan recomendado (por fases, validado por fase)
1. **Tokens light/dark**: convertir `colors.ts` a dos esquemas con las mismas
   claves (neutros + acentos por rol + semánticos + riesgo), manteniendo
   contraste WCAG AA en ambos.
2. **ThemeProvider + useTheme()**: contexto que resuelve el esquema según
   `useColorScheme()` con override manual persistido (AsyncStorage) y expone
   `colors`.
3. **Hook de estilos por pantalla**: patrón `const styles = useStyles(makeStyles)`
   donde `makeStyles(colors)` recibe el tema; migrar las 82 pantallas en tandas
   por rol (gestante → obstetra → admin), validando que cada tanda compila y
   se ve bien en claro y oscuro.
4. **app.json** `userInterfaceStyle: "automatic"` + toggle en Perfil/Más.

## Esfuerzo estimado
Medio-alto: ~82 pantallas/components a migrar. Recomendado hacerlo como
iniciativa propia, no mezclado con otras features, para poder validar el
contraste de cada pantalla en ambos modos.
