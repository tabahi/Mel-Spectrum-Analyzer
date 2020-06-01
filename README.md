# Mel-Spectrum-Analyzer

Online web based Mel-spectrum, power spectrum, FFT analyzer for speech and music processing.

[See the demo here: tabahi.github.io/Mel-Spectrum-Analyzer](https://tabahi.github.io/Mel-Spectrum-Analyzer/)

Compatibility: Tested and works on Firefox Desktop (v76), Chrome Desktop (v83) and Chrome Android (v81).



>It doesn't use the analyzer node for its lack of analysis options and the obsolete script processing node. Instead, everything is analyzed in a worklet node. The processing load may be higher for high number of FFTs and big sampling windows, which can cause jitters. If it does, then increase the frame skip rate (skip a number of frames after processing every frame).


No external JS dependencies.

The music file is from [youtube - agabo92](https://www.youtube.com/watch?v=kznhSUTR0JA) (CC License). It is a good example for observing notes transition.

cc-by-4.0
