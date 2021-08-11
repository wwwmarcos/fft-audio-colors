
const FFT_SIZE = 4096
const LOW_PASS_FREQUENCY = 20
const LOW_PASS_GAIN = 1500
const BASS_FREQUENCY_RANGE_LIMIT = 100

function Element (selector) {
  return document.querySelector(selector)
}

function Player () {
  return Element('#audio-player')
}

function UploaderButton () {
  return Element('#audio-uploader')
}

function LowwPassFilter ({ audioCtx }) {
  const filterLowPass = audioCtx.createBiquadFilter()
  filterLowPass.type = 'lowpass'
  filterLowPass.frequency.value = LOW_PASS_FREQUENCY
  filterLowPass.gain.value = LOW_PASS_GAIN

  return filterLowPass
}

function LowshelfFilter ({ audioCtx }) {
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowshelf'
  return filter
}

/**
 * A GainNode which takes as input one or more audio sources and outputs audio
 * whose volume has been adjusted in gain (volume) to a level specified by the
 * node's GainNode.gain a-rate parameter.
 * https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createGain
 */
function GainFilter ({ audioCtx }) {
  const filter = audioCtx.createGain()
  filter.gain.value = 10
  return filter
}

/**
 * A fast Fourier transform (FFT) is an algorithm that computes the discrete Fourier transform (DFT)
 * of a sequence, or its inverse (IDFT). Fourier analysis converts a signal from its original domain
 * (often time or space) to a representation in the frequency domain and vice versa
 * https://en.wikipedia.org/wiki/Fast_Fourier_transform
 */
function FFTAnalyser ({ audioCtx }) {
  const filterAnalyser = audioCtx.createAnalyser()
  filterAnalyser.fftSize = FFT_SIZE
  return filterAnalyser
}

function FrequencyData (analyser) {
  return new Uint8Array(analyser.frequencyBinCount)
}

function MediaSource ({ audioCtx, player }) {
  return audioCtx.createMediaElementSource(player)
}

function setup ({ audioCtx, player, filteredPlayer }) {
  const src = MediaSource({ audioCtx, player })
  const filteredSrc = MediaSource({ audioCtx, player: filteredPlayer })
  const lowPassFilter = LowwPassFilter({ audioCtx })
  const lowshelfFilter = LowshelfFilter({ audioCtx })

  /**
   * add gain o audio
   * this improve the bass detection
   */
  const gain = GainFilter({ audioCtx })
  const analyser = FFTAnalyser({ audioCtx })
  const filterAnalyser = FFTAnalyser({ audioCtx })

  // connect filters and analyzsers
  filteredSrc.connect(lowPassFilter)
  lowPassFilter.connect(lowshelfFilter)
  lowshelfFilter.connect(gain)
  gain.connect(filterAnalyser)
  src.connect(analyser)
  analyser.connect(audioCtx.destination)

  const audioData = FrequencyData(analyser)
  const filteredData = FrequencyData(filterAnalyser)

  const FFT = () => {
    analyser.getByteFrequencyData(audioData)
    filterAnalyser.getByteFrequencyData(filteredData)

    return {
      original: audioData,
      filtered: filteredData
    }
  }

  return {
    FFT
  }
}

function background (color = 'blue') {
  document.body.style.background = color
}

function analize ({ FFTData }) {
  const state = {
    bassPeekCount: 0,
    isBass: false
  }

  for (let i = 0; i < BASS_FREQUENCY_RANGE_LIMIT; i++) {
    state.bassPeekCount = 0
    const peek = FFTData[i]

    // TODO: improve reading
    if (peek > 250) {
      for (let k = i; k < i + 20; k++) {
        const futurePeek = FFTData[k]
        if (futurePeek > 230) {
          state.bassPeekCount = state.bassPeekCount + 1
        }
      }
    }

    state.isBass = state.bassPeekCount > 4 && state.bassPeekCount < 9

    if (state.isBass) {
      break
    }
  }

  return state
}

function draw ({ FFT }) {
  const start = () => {
    /**
     * The window.requestAnimationFrame() method tells the browser that
     * you wish to perform an animation and requests that the browser
     * calls a specified function to update an animation before
     * the next repaint. The method takes a callback as an argument to
     * be invoked before the repaint.
     * https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
    */
    window.requestAnimationFrame(start)

    const { filtered } = FFT()
    const result = analize({
      FFTData: filtered
    })

    if (result.isBass) {
      return background('red')
    }

    return background('blue')
  }

  return {
    start
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const uploadButton = UploaderButton()

  uploadButton.addEventListener('change', event => {
    const audioCtx = new window.AudioContext() || window.webkitAudioContext
    const [file] = event.target.files
    const audio = URL.createObjectURL(file)

    const player = Player()
    player.src = audio
    player.load()

    const filteredPlayer = player.cloneNode()

    const { FFT } = setup({
      audioCtx,
      player,
      filteredPlayer
    })

    const frameUpdater = draw({ FFT })

    filteredPlayer.play()
    frameUpdater.start()
    player.play()
  }, false)
})
