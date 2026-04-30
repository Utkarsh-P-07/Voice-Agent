"""
Voice I/O — microphone recording, Groq Whisper STT, pyttsx3 TTS.
"""
import tempfile
import threading
from pathlib import Path

import numpy as np
import sounddevice as sd
import soundfile as sf
from groq import Groq

SAMPLE_RATE = 16000
CHANNELS = 1
SILENCE_THRESHOLD = 0.015
SILENCE_DURATION = 1.8   # seconds of silence before stopping
MAX_RECORD_SECONDS = 30


def _make_tts_engine():
    import pyttsx3
    engine = pyttsx3.init()
    engine.setProperty("rate", 170)
    engine.setProperty("volume", 1.0)
    return engine


def speak(text: str) -> None:
    """Speak text using pyttsx3. Runs in a fresh engine call to avoid Windows blocking."""
    print(f"\n🔊 Agent: {text}\n")
    try:
        engine = _make_tts_engine()
        engine.say(text)
        engine.runAndWait()
        engine.stop()
    except Exception as e:
        # TTS failure is non-fatal — user still sees the text
        print(f"  (TTS error: {e})")


def record_until_silence(sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    """
    Record from the default mic and stop after SILENCE_DURATION seconds of silence.
    Shows a live volume bar so the user knows it's listening.
    """
    print("🎤 Listening... (speak now)\n")
    chunk_size = int(sample_rate * 0.1)   # 100 ms chunks
    recorded: list[np.ndarray] = []
    silent_chunks = 0
    max_silent = int(SILENCE_DURATION / 0.1)
    max_chunks = int(MAX_RECORD_SECONDS / 0.1)

    with sd.InputStream(samplerate=sample_rate, channels=CHANNELS, dtype="float32") as stream:
        for _ in range(max_chunks):
            chunk, _ = stream.read(chunk_size)
            recorded.append(chunk.copy())

            rms = float(np.sqrt(np.mean(chunk ** 2)))
            # Visual volume bar
            bar = int(rms * 400)
            print(f"\r  Volume: {'█' * min(bar, 40):<40} {'🔴 silence' if rms < SILENCE_THRESHOLD else '🟢 speaking'}", end="", flush=True)

            if rms < SILENCE_THRESHOLD:
                silent_chunks += 1
                if silent_chunks >= max_silent and len(recorded) > max_silent:
                    break
            else:
                silent_chunks = 0

    print("\n✅ Got it, processing...\n")
    return np.concatenate(recorded, axis=0).flatten()


def transcribe(client: Groq, audio: np.ndarray, sample_rate: int = SAMPLE_RATE) -> str:
    """Send audio to Groq Whisper-large-v3 and return transcript."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = Path(tmp.name)
        sf.write(tmp_path, audio, sample_rate)

    with open(tmp_path, "rb") as f:
        result = client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=f,
            language="en",
        )
    tmp_path.unlink(missing_ok=True)
    return result.text.strip()
