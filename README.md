# ODIO (grita-app)

## Qué es

Es una app hecha con Expo/React Native pensada como una forma de desahogo.
El usuario graba su voz mientras grita y la app va reaccionando en tiempo
real al volumen de la voz: cuanto más fuerte grita, más avanza la app.
No se guarda ni se reproduce ningún audio; solo se usa el micrófono para
medir la intensidad del grito en el momento.

## Cómo se usa

1. Se abre la app y aparece el botón **EMPEZAR**.
2. Al presionarlo, la app pide permiso para usar el micrófono y empieza
   a "escuchar".
3. En pantalla aparecen frases ("gritá", "seguí gritando", "continuá",
   "llegaste al máximo") que van cambiando a medida que el usuario grita.
4. Cada grito tiene que ser más fuerte que el anterior para poder avanzar
   a la siguiente frase (la intensidad requerida sube en cada paso).
5. Al llegar al final, se muestra una pregunta de cierre
   ("¿valió la pena tanto grito para un final tranquilo?") junto con un
   mensaje final. El mensaje cambia según qué tan fuerte gritó el usuario
   durante todo el proceso.
6. En cualquier momento se puede tocar **REINICIAR** para volver a empezar,
   y desde la pantalla final se puede tocar **VOLVER** para reiniciar el
   flujo completo.

## Instrucciones para iniciar el proyecto

Requisitos:

- Node.js instalado
- La app **Expo Go** instalada en el celular (misma versión de SDK que el
  proyecto: SDK 54), o un emulador Android / simulador iOS.

Pasos:

1. Ubicarse en la carpeta del proyecto:

   ```bash
   cd grita-app
   ```

2. Instalar las dependencias (solo la primera vez o si cambia el
   `package.json`):

   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:

   ```bash
   npx expo start
   ```

4. Conectarse desde el celular escaneando el código QR con Expo Go
   (el celular y la computadora deben estar en la misma red wifi),
   o presionar `a` en la terminal para abrir un emulador Android,
   o `i` para abrir un simulador iOS (solo Mac).

> **Nota:** si al conectar desde el celular no carga, puede deberse al
> firewall de la computadora bloqueando el puerto de Expo (8081). En Linux,
> revisar con `sudo ufw status` y permitir el puerto si hace falta.
