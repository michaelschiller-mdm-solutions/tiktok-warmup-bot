// ElevenLabs Voice Message Generator
// Created: Voice message tool with ElevenLabs API integration

// Configuration
const ELEVENLABS_API_KEY = 'sk_ec5d7a5a4297b8e540744d294022c7c4b24b773f6caac6da';
const VOICE_ID = 'i6Fhntk4WFbMpW6hu87Y';
const API_BASE_URL = 'https://api.elevenlabs.io/v1';

// DOM Elements
const form = document.getElementById('voiceForm');
const textInput = document.getElementById('textInput');
const modelSelect = document.getElementById('modelSelect');
const stabilityRange = document.getElementById('stabilityRange');
const stabilityValue = document.getElementById('stabilityValue');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const audioPlayer = document.getElementById('audioPlayer');
const audioElement = document.getElementById('audioElement');
const downloadBtn = document.getElementById('downloadBtn');

let currentAudioBlob = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    updateStabilityDisplay();
});

function initializeEventListeners() {
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Clear button
    clearBtn.addEventListener('click', clearForm);
    
    // Stability range slider
    stabilityRange.addEventListener('input', updateStabilityDisplay);
    
    // Download button
    downloadBtn.addEventListener('click', downloadAudio);
    
    // Auto-resize textarea
    textInput.addEventListener('input', autoResizeTextarea);
}

function updateStabilityDisplay() {
    const value = parseFloat(stabilityRange.value);
    stabilityValue.textContent = value.toFixed(1);
    
    // Update color based on value
    let color = '#6366f1';
    if (value < 0.3) color = '#ef4444'; // Red for creative
    else if (value > 0.7) color = '#10b981'; // Green for stable
    
    stabilityValue.style.color = color;
    stabilityValue.style.fontWeight = 'bold';
}

function autoResizeTextarea() {
    textInput.style.height = 'auto';
    textInput.style.height = Math.max(120, textInput.scrollHeight) + 'px';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const text = textInput.value.trim();
    if (!text) {
        showError('Please enter some text to convert to speech.');
        return;
    }
    
    if (text.length < 10) {
        showError('Please enter at least 10 characters for better quality results.');
        return;
    }
    
    await generateVoice(text);
}

async function generateVoice(text) {
    try {
        showLoading(true);
        hideError();
        hideAudioPlayer();
        
        const model = modelSelect.value;
        const stability = parseFloat(stabilityRange.value);
        
        console.log('Generating voice with:', { text, model, stability, voiceId: VOICE_ID });
        
        const response = await fetch(`${API_BASE_URL}/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: model,
                voice_settings: {
                    stability: stability,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true
                },
                output_format: 'mp3_44100_128'
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail?.message || `API Error: ${response.status} ${response.statusText}`);
        }
        
        const audioBlob = await response.blob();
        currentAudioBlob = audioBlob;
        
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElement.src = audioUrl;
        
        showAudioPlayer();
        
        // Auto-play the audio
        try {
            await audioElement.play();
        } catch (playError) {
            console.log('Auto-play prevented by browser:', playError);
        }
        
    } catch (err) {
        console.error('Voice generation error:', err);
        showError(`Failed to generate voice: ${err.message}`);
    } finally {
        showLoading(false);
    }
}

function showLoading(show) {
    loading.classList.toggle('show', show);
    generateBtn.disabled = show;
    
    if (show) {
        generateBtn.textContent = '🔄 Generating...';
    } else {
        generateBtn.textContent = '🎵 Generate Voice';
    }
}

function showError(message) {
    error.textContent = message;
    error.classList.add('show');
    
    // Auto-hide error after 10 seconds
    setTimeout(() => {
        hideError();
    }, 10000);
}

function hideError() {
    error.classList.remove('show');
}

function showAudioPlayer() {
    audioPlayer.style.display = 'block';
    audioPlayer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAudioPlayer() {
    audioPlayer.style.display = 'none';
}

function clearForm() {
    textInput.value = '';
    hideError();
    hideAudioPlayer();
    autoResizeTextarea();
    textInput.focus();
}

function downloadAudio() {
    if (!currentAudioBlob) {
        showError('No audio available to download.');
        return;
    }
    
    const url = URL.createObjectURL(currentAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-message-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Utility function to validate API key format
function validateApiKey(apiKey) {
    return apiKey && apiKey.startsWith('sk_') && apiKey.length > 20;
}

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!generateBtn.disabled) {
            form.dispatchEvent(new Event('submit'));
        }
    }
    
    // Escape to clear form
    if (e.key === 'Escape') {
        clearForm();
    }
});

// Add character counter
textInput.addEventListener('input', function() {
    const length = textInput.value.length;
    const counter = document.getElementById('charCounter') || createCharCounter();
    
    counter.textContent = `${length} characters`;
    
    if (length < 250) {
        counter.style.color = '#f59e0b'; // Orange for short text
        counter.title = 'Recommended: 250+ characters for best quality';
    } else {
        counter.style.color = '#10b981'; // Green for good length
        counter.title = 'Good length for quality results';
    }
});

function createCharCounter() {
    const counter = document.createElement('div');
    counter.id = 'charCounter';
    counter.style.cssText = `
        font-size: 12px;
        color: #6b7280;
        margin-top: 5px;
        text-align: right;
        font-weight: 500;
    `;
    textInput.parentNode.appendChild(counter);
    return counter;
}

// Initialize character counter
textInput.dispatchEvent(new Event('input'));

// Add example text buttons
function addExampleButtons() {
    const examples = [
        "[excited] Hello there! This is an absolutely AMAZING voice generator! [laughs] I can't believe how realistic this sounds!",
        "[whispers] I have a secret to tell you... [pause] This technology is incredible! [excited] It's going to change everything!",
        "[sarcastic] Oh great, another AI tool. [sighs] Actually... [surprised] this one is pretty impressive! [laughs harder]",
        "[strong British accent] Good morning everyone! Today we're going to explore the fascinating world of artificial intelligence and voice synthesis.",
        "[curious] You know what's interesting? [excited] I just discovered that you can use audio tags like [whispers] this [normal voice] or [laughs] even add laughter!",
        "[applause] Welcome to the future of voice technology! [excited] This is just the beginning of what's possible with AI-generated speech."
    ];
    
    const examplesContainer = document.querySelector('.examples');
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;';
    
    examples.forEach((example, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `Try Example ${index + 1}`;
        button.style.cssText = `
            padding: 6px 12px;
            background: #e0e7ff;
            border: 1px solid #c7d2fe;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
        `;
        
        button.addEventListener('click', () => {
            textInput.value = example;
            autoResizeTextarea();
            textInput.dispatchEvent(new Event('input'));
            textInput.focus();
        });
        
        button.addEventListener('mouseenter', () => {
            button.style.background = '#c7d2fe';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#e0e7ff';
        });
        
        buttonContainer.appendChild(button);
    });
    
    examplesContainer.appendChild(buttonContainer);
}

// Initialize example buttons
addExampleButtons();

console.log('🎤 ElevenLabs Voice Message Generator initialized successfully!');
console.log('💡 Pro tip: Use audio tags like [excited], [whispers], or [laughs] for better expression!');