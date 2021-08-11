# fft-audio-colors
analyze sounds with FFT to detect bass using brower AudioContext API

## how this works
1. Create a copy from original selected audio
2. Add some filters to this copy, this help to improve bass detection
3. use [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) to change screen colors based on bass
