import React, { useRef, useState } from "react";
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

const { width } = Dimensions.get("window");

const FRASES = [
  "gritá",
  "seguí gritando",
  "continuá",
  "llegaste al máximo",
  "¿valió la pena tanto grito para un final tranquilo?"
];

export default function App() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStartingRef = useRef<boolean>(false);

  const [grabando, setGrabando] = useState(false);
  const [liberado, setLiberado] = useState(false);
  const [fraseIndex, setFraseIndex] = useState(0);
  const [color, setColor] = useState("#ffffff");

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  const detener = async () => {
    try {
      if (recordingRef.current) {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
      }
    } catch {}
    recordingRef.current = null;
  };

  const animarTexto = () => {
    scaleAnim.setValue(0.9);
    rotateAnim.setValue(0);
    translateY.setValue(30);

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.15,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const avanzar = () => {
    Vibration.vibrate(100);

    Animated.sequence([
      Animated.timing(shakeX, { toValue: 20, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -20, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {

      setFraseIndex((prev) => {
        const next = prev + 1;

        if (next >= FRASES.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          detener();

          Vibration.vibrate([200, 100, 200]);

          setGrabando(false);
          setLiberado(true);
        }

        return next;
      });

      fadeAnim.setValue(0);
      animarTexto();

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const empezar = async () => {
    if (grabando || isStartingRef.current) return;

    isStartingRef.current = true;

    await detener();

    const permiso = await Audio.requestPermissionsAsync();
    if (!permiso.granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const rec = new Audio.Recording();

    await rec.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY as any
    );

    await rec.startAsync();
    recordingRef.current = rec;

    setGrabando(true);
    setLiberado(false);
    setFraseIndex(0);

    let ultimoVolumen = -160;
    let umbralActual = -25;
    let tiempoUltimaFrase = 0;

    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeX, { toValue: 3, duration: 80, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -3, duration: 80, useNativeDriver: true }),
      ])
    ).start();

    intervalRef.current = setInterval(async () => {
      if (!recordingRef.current) return;

      const status = await recordingRef.current.getStatusAsync();
      if (!status.isRecording) return;

      const vol = status.metering ?? -160;
      const cambio = vol - ultimoVolumen;

      if (vol < -40) setColor("#888");
      else if (vol < -25) setColor("#ffffff");
      else if (vol < -15) setColor("#ffd54f");
      else setColor("#ff3b3b");

      if (vol > umbralActual && cambio > 6) {
        if (fraseIndex < FRASES.length - 2) {
          umbralActual += 4;
        } else {
          umbralActual = Math.min(umbralActual, -10);
        }

        avanzar();
        tiempoUltimaFrase = 0;
      } else {
        if (fraseIndex === FRASES.length - 1) {
          tiempoUltimaFrase += 80;

          if (tiempoUltimaFrase > 1500) {
            avanzar();
          }
        }
      }

      ultimoVolumen = vol;
    }, 80);

    isStartingRef.current = false;
  };

  const reiniciar = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    await detener();

    setFraseIndex(0);
    setGrabando(false);
    setLiberado(false);
    setColor("#ffffff");

    shakeX.setValue(0);
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeX }] }]}>
      {!grabando && !liberado && (
        <View style={styles.center}>
          <Text style={styles.title}>ODIO</Text>

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
                {
                  color,
                  fontSize: fraseIndex === FRASES.length - 1 ? 30 : 26,
                  textAlign: "center",
                },
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY },
                    { scale: scaleAnim },
                    ...(fraseIndex === FRASES.length - 1
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

          <Text style={styles.pj}>
            gritá para avanzar
          </Text>

          <Pressable style={styles.reset} onPress={reiniciar}>
            <Text style={styles.resetText}>REINICIAR</Text>
          </Pressable>
        </View>
      )}

      {liberado && (
        <View style={styles.center}>
          <Text style={styles.final}>
            A veces es mejor no gritar{"\n"}
            y vivir la vida sin odio
          </Text>

          <Pressable style={styles.button} onPress={reiniciar}>
            <Text style={styles.buttonText}>VOLVER</Text>
          </Pressable>
        </View>
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
  },

  title: {
    fontSize: 45,
    color: "#fff",
    fontWeight: "bold",
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

  // 🔵 BOTÓN AZUL
  button: {
    marginTop: 20,
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

  final: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});