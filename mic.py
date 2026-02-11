import sounddevice as sd

print("=== DISPOSITIVOS DE AUDIO DETECTADOS ===")
devices = sd.query_devices()

for i, d in enumerate(devices):
    print(f"{i}: {d['name']} | inputs={d['max_input_channels']} outputs={d['max_output_channels']}")

print("\nDispositivo por defecto:")
print(sd.default.device)
