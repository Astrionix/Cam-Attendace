# MobileFaceNet Model Asset Directory

Place the quantized **MobileFaceNet** TensorFlow Lite model file here:

- **Filename**: `mobilefacenet.tflite`
- **Path**: `android/app/src/main/assets/mobilefacenet.tflite`
- **Input shape**: `[1, 112, 112, 3]` (RGB float normalized to `[-1.0, 1.0]`)
- **Output shape**: `[1, 192]` (192-dimensional embedding vector)
- **Quantization**: int8 or float16 quantized (~1.4 MB to 4.0 MB)
- **Target device**: Snapdragon 425 (quad-core ARM Cortex-A53 @ 1.4 GHz, 1 GB RAM, Android 8.1 Oreo Go)

### Model Characteristics on Redmi Go:
- Memory footprint: ~5 MB – 7 MB RAM
- Inference time: ~70 ms – 90 ms on 2 CPU threads
- Thread count configured: 2 (avoids thermal throttling and preserves UI thread responsiveness)
- Safe fallback: If `mobilefacenet.tflite` is not present, `MobileFaceNet.kt` includes a deterministic fallback vector generator for testing and UI prototyping without runtime crashing.
