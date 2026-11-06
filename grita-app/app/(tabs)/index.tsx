import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Vibration,
  Dimensions,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

const { width } = Dimensions.get("window");

const FRASES = ["gritá", "más fuerte", "todavía más", "soltalo todo"];

// Tiempo máximo para gritar. Si se termina, el animal se decide con lo que hubo.
const TIEMPO_LIMITE = 10000;
const INTERVALO = 80;

type Animal = {
  minDb: number; // pico mínimo de volumen (dB) para ser este animal
  emoji: string;
  nombre: string;
  poema: string;
};

// Ordenados del grito más fuerte al más suave.
const ANIMALES: Animal[] = [
  {
    minDb: -6,
    emoji: "🦁",
    nombre: "un león",
    poema:
      "Tu grito no pidió permiso.\nSalió como sale el sol en la sabana:\nde golpe, entero, imposible de ignorar.\nSos león porque cuando hablás,\nel mundo se calla para escucharte.",
  },
  {
    minDb: -12,
    emoji: "🐺",
    nombre: "un lobo",
    poema:
      "Tu voz tiene algo de luna llena.\nNo gritaste para asustar,\ngritaste para llamar a los tuyos.\nSos lobo porque tu fuerza no está en estar solo:\nestá en saber que alguien va a responder.",
  },
  {
    minDb: -20,
    emoji: "🐦‍⬛",
    nombre: "un cuervo",
    poema:
      "No fue el grito más fuerte, pero fue el más tuyo.\nComo el cuervo, sabés que la voz\nno se mide en volumen sino en lo que deja dicho.\nSos cuervo porque mirás antes de hablar,\ny cuando hablás, se recuerda.",
  },
  {
    minDb: -30,
    emoji: "🐈",
    nombre: "un gato",
    poema:
      "Gritaste a tu manera:\ncon medida, casi con elegancia.\nComo el gato, no le das tu voz a cualquiera.\nSos gato porque guardás el rugido\npara cuando de verdad vale la pena.",
  },
  {
    minDb: -Infinity,
    emoji: "🦉",
    nombre: "un búho",
    poema:
      "Apenas un susurro en la noche.\nPero el búho no necesita gritar:\nel silencio también es una forma de ver.\nSos búho porque escuchás más de lo que decís,\ny eso, a veces, es la voz más fuerte de todas.",
  },
];

const elegirAnimal = (picoDb: number) =>
  ANIMALES.find((a) => picoDb >= a.minDb) ?? ANIMALES[ANIMALES.length - 1];

export default function App() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const temblorLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const isStartingRef = useRef(false);
  const terminadoRef = useRef(false);
  const fraseIndexRef = useRef(0);
  const gritoMaxRef = useRef(-160);

  const [grabando, setGrabando] = useState(false);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [fraseIndex, setFraseIndex] = useState(0);
  const [color, setColor] = useState("#ffffff");

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  // Dos valores separados: el sacudón de cada frase no corta el temblor de fondo.
  const shakeX = useRef(new Animated.Value(0)).current;
  const temblorX = useRef(new Animated.Value(0)).current;
  const resultadoAnim = useRef(new Animated.Value(0)).current;

  const detener = async () => {
    try {
      if (recordingRef.current) {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
        const uri = recordingRef.current.getURI();
        if (uri) {
          FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        }
      }
    } catch {}
    recordingRef.current = null;
  };

  const frenarTodo = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    temblorLoopRef.current?.stop();
    temblorLoopRef.current = null;
    temblorX.setValue(0);
    shakeX.setValue(0);
  };

  const terminar = () => {
    if (terminadoRef.current) return;
    terminadoRef.current = true;

    frenarTodo();
    detener();

    Vibration.vibrate([200, 100, 200]);

    setAnimal(elegirAnimal(gritoMaxRef.current));
    setGrabando(false);

    resultadoAnim.setValue(0);
    Animated.timing(resultadoAnim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  };

  const animarTexto = () => {
    scaleAnim.setValue(0.9);
    rotateAnim.setValue(0);
    translateY.setValue(30);

    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const avanzar = () => {
    if (terminadoRef.current) return;

    const next = fraseIndexRef.current + 1;
    if (next >= FRASES.length) {
      terminar();
      return;
    }
    fraseIndexRef.current = next;

    Vibration.vibrate(100);

    Animated.sequence([
      Animated.timing(shakeX, { toValue: 20, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -20, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();

    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      if (terminadoRef.current) return;
      setFraseIndex(next);
      animarTexto();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const empezar = async () => {
    if (grabando || isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      await detener();

      const permiso = await Audio.requestPermissionsAsync();
      if (!permiso.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      } as any);
      await rec.startAsync();
      recordingRef.current = rec;

      terminadoRef.current = false;
      fraseIndexRef.current = 0;
      gritoMaxRef.current = -160;
      setFraseIndex(0);
      setAnimal(null);
      setColor("#ffffff");
      fadeAnim.setValue(1);
      setGrabando(true);

      let ultimoVolumen = -160;
      let umbralActual = -25;
      let tiempoUltimaFrase = 0;
      let tiempoTotal = 0;

      temblorLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(temblorX, { toValue: 3, duration: 80, useNativeDriver: true }),
          Animated.timing(temblorX, { toValue: -3, duration: 80, useNativeDriver: true }),
        ])
      );
      temblorLoopRef.current.start();

      intervalRef.current = setInterval(async () => {
        if (!recordingRef.current || terminadoRef.current) return;

        tiempoTotal += INTERVALO;
        if (tiempoTotal >= TIEMPO_LIMITE) {
          terminar();
          return;
        }

        const status = await recordingRef.current?.getStatusAsync().catch(() => null);
        if (!status || !status.isRecording) return;

        const vol = status.metering ?? -160;
        const cambio = vol - ultimoVolumen;

        gritoMaxRef.current = Math.max(gritoMaxRef.current, vol);

        if (vol < -40) setColor("#888");
        else if (vol < -25) setColor("#ffffff");
        else if (vol < -15) setColor("#ffd54f");
        else setColor("#ff3b3b");

        if (vol > umbralActual && cambio > 6) {
          umbralActual = Math.min(umbralActual + 7, -5);
          avanzar();
          tiempoUltimaFrase = 0;
        } else if (fraseIndexRef.current === FRASES.length - 1) {
          tiempoUltimaFrase += INTERVALO;
          if (tiempoUltimaFrase > 1500) terminar();
        }

        ultimoVolumen = vol;
      }, INTERVALO);
    } finally {
      isStartingRef.current = false;
    }
  };

  const reiniciar = async () => {
    terminadoRef.current = true;
    frenarTodo();
    await detener();

    setFraseIndex(0);
    fraseIndexRef.current = 0;
    gritoMaxRef.current = -160;
    setGrabando(false);
    setAnimal(null);
    setColor("#ffffff");
  };

  useEffect(() => {
    return () => {
      frenarTodo();
      detener();
    };
  }, []);

  const esUltima = fraseIndex === FRASES.length - 1;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: Animated.add(shakeX, temblorX) }] }]}
    >
      {!grabando && !animal && (
        <View style={styles.center}>
          <Text style={styles.title}>¿QUÉ ANIMAL ERES?</Text>
          <Text style={styles.subtitle}>gritá y descubrí qué animal llevás adentro</Text>

          <Pressable style={styles.button} onPress={empezar}>
            <Text style={styles.buttonText}>EMPEZAR</Text>
          </Pressable>
        </View>
      )}

      {grabando && (
        <View style={styles.center}>
          <Text style={styles.emoji}>🗣️</Text>

          <View style={styles.box}>
            <Animated.Text
              style={[
                styles.text,
                { color, fontSize: esUltima ? 30 : 26, textAlign: "center" },
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY },
                    { scale: scaleAnim },
                    ...(esUltima
                      ? []
                      : [
                          {
                            rotate: rotateAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["-10deg", "10deg"],
                            }),
                          },
                        ]),
                  ],
                },
              ]}
            >
              {FRASES[fraseIndex]}
            </Animated.Text>
          </View>

          <Text style={styles.pj}>gritá para avanzar</Text>

          <Pressable style={styles.reset} onPress={reiniciar}>
            <Text style={styles.resetText}>REINICIAR</Text>
          </Pressable>
        </View>
      )}

      {animal && (
        <Animated.View
          style={[
            styles.center,
            {
              opacity: resultadoAnim,
              transform: [
                {
                  translateY: resultadoAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.animalEmoji}>{animal.emoji}</Text>
          <Text style={styles.sos}>Sos</Text>
          <Text style={styles.animalNombre}>{animal.nombre}</Text>
          <Text style={styles.poema}>{animal.poema}</Text>

          <Pressable style={styles.button} onPress={reiniciar}>
            <Text style={styles.buttonText}>VOLVER A GRITAR</Text>
          </Pressable>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 36,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
  },

  emoji: {
    fontSize: 50,
    marginBottom: 10,
  },

  box: {
    width: width * 0.8,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    borderColor: "#555",
    borderWidth: 2,
    marginBottom: 20,
    padding: 10,
  },

  text: {
    fontWeight: "bold",
  },

  pj: {
    color: "#ff4d4d",
    fontSize: 16,
  },

  button: {
    marginTop: 30,
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#007bff",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  reset: {
    position: "absolute",
    bottom: 40,
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 8,
  },

  resetText: {
    color: "#fff",
  },

  animalEmoji: {
    fontSize: 90,
    marginBottom: 10,
  },

  sos: {
    fontSize: 18,
    color: "#aaa",
  },

  animalNombre: {
    fontSize: 34,
    color: "#ffd54f",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 20,
  },

  poema: {
    fontSize: 17,
    lineHeight: 26,
    color: "#fff",
    fontStyle: "italic",
    textAlign: "center",
  },
});
