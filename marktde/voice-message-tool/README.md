# 🎤 ElevenLabs Voice Message Generator

A simple, elegant web interface for converting text to speech using the ElevenLabs API.

## Features

- **Modern UI**: Clean, responsive design with gradient backgrounds and smooth animations
- **Audio Tags Support**: Use special tags like `[excited]`, `[whispers]`, `[laughs]` for expressive speech
- **Multiple Models**: Choose from different ElevenLabs models (Multilingual v2, Turbo v2, Flash v2)
- **Voice Stability Control**: Adjust how creative vs. stable the voice generation should be
- **Real-time Tooltips**: Helpful guidance on how to write effective prompts
- **Audio Playback**: Built-in audio player with download functionality
- **Example Prompts**: Pre-built examples to get you started quickly

## Setup

1. **Open the tool**: Simply open `index.html` in your web browser
2. **No installation required**: This is a client-side application that runs entirely in your browser

## How to Use

### Basic Usage
1. Enter your text in the message box
2. Select your preferred AI model
3. Adjust voice stability if needed
4. Click "Generate Voice" to create your audio
5. Play the generated audio or download it as MP3

### Writing Effective Prompts

#### Audio Tags for Expression
Use these tags to add emotion and style to your voice:

**🎭 Emotional Tags:**
- `[excited]`, `[sad]`, `[angry]`, `[curious]`, `[sarcastic]`, `[mischievously]`

**🗣️ Voice Style Tags:**
- `[whispers]`, `[shouts]`, `[laughs]`, `[laughs harder]`, `[starts laughing]`
- `[sighs]`, `[exhales]`, `[crying]`, `[wheezing]`, `[snorts]`

**🔊 Sound Effect Tags:**
- `[applause]`, `[clapping]`, `[gunshot]`, `[explosion]`
- `[swallows]`, `[gulps]`

**🌍 Accent Tags:**
- `[strong French accent]`, `[strong British accent]`, `[strong German accent]`

**🎵 Special Tags:**
- `[sings]`, `[woo]`, `[fart]` (experimental)

**📝 Text Formatting:**
- `...` (ellipses for pauses)
- `CAPITAL LETTERS` for emphasis
- Proper punctuation for natural rhythm

#### Example Prompts

**Basic Conversation:**
```
Hello there! How are you doing today?
```

**With Emotion:**
```
[excited] I can't believe we won the game! [laughs] This is incredible!
```

**Dramatic Effect:**
```
[whispers] I have something important to tell you... [pause] It's about the project.
```

**Professional Tone:**
```
Good morning everyone. Today we'll be discussing the quarterly results and our plans moving forward.
```

**Conversational Style:**
```
[sighs] Well, that was quite an adventure, wasn't it? I mean, who would have thought we'd end up here?
```

### Model Selection Guide

- **Multilingual v2** (Recommended): Best overall quality, supports multiple languages
- **Turbo v2**: Faster generation with good quality, great for quick tests
- **Flash v2**: Fastest generation, basic quality for rapid prototyping

### Voice Stability Settings

- **Low (0.0-0.3)**: More creative and expressive, voice may vary more
- **Medium (0.4-0.7)**: Balanced approach, natural sounding
- **High (0.8-1.0)**: Very stable and consistent, but less expressive

## Tips for Best Results

1. **Length Matters**: Use at least 250 characters for best quality results
2. **Punctuation**: Use proper punctuation for natural pauses and rhythm
3. **Context**: Provide emotional context with audio tags
4. **Experimentation**: Try different combinations of tags and settings
5. **Voice Matching**: Choose stability settings that match your content type

## Technical Details

- **API**: Uses ElevenLabs Text-to-Speech API v1
- **Voice ID**: Pre-configured with voice `i6Fhntk4WFbMpW6hu87Y`
- **Output Format**: MP3 44.1kHz 128kbps
- **Browser Support**: Modern browsers with audio support

## Keyboard Shortcuts

- **Ctrl/Cmd + Enter**: Generate voice
- **Escape**: Clear form

## Troubleshooting

### Common Issues

1. **No audio generated**: Check your internet connection and try again
2. **Poor quality**: Try using longer text (250+ characters) and adjust stability
3. **Audio won't play**: Check browser audio permissions and volume settings

### Error Messages

- **"Please enter at least 10 characters"**: Your text is too short
- **"API Error"**: There might be an issue with the ElevenLabs service
- **"Failed to generate voice"**: Check your internet connection

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Privacy & Security

- All processing happens through ElevenLabs API
- No data is stored locally beyond the current session
- Generated audio files are temporary and can be downloaded

## Support

For issues with the ElevenLabs API or voice quality, refer to the [ElevenLabs Documentation](https://elevenlabs.io/docs).

---

**Created**: Voice message tool with ElevenLabs API integration
**Last Updated**: January 2025