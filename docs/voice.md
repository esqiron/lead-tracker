# Voice assistant

An optional mic button in the bottom-right corner of the app. Click it and speak to:

- **Follow up**: "Log a call with Hannah, she'll countersign Thursday, remind me Friday morning to chase."
- **Create leads**: "New deal with Jamie Rivera at Pemberton Paper, three offices, eighteen thousand."
- **Check data**: "What needs a reply today?", "How's this month looking?", "What's next on Globex?"

Replies are read aloud, and the conversation keeps listening hands-free until you stop talking. Deals the assistant touched appear as links under its reply. You can also type instead of speaking (Firefox, blocked microphone, or a quiet office).

## Setup

The feature stays hidden until both keys are set:

| Variable | |
| --- | --- |
| `ELEVENLABS_API_KEY` | Speech-to-text (Scribe) and text-to-speech. Create one at elevenlabs.io → Developers → API keys, with Speech to Text and Text to Speech access. |
| One of `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | The model that understands the request and calls the CRM tools. |

Optional:

| Variable | Default | |
| --- | --- | --- |
| `VOICE_LLM_PROVIDER` | first key set, in the order above | `anthropic`, `openai` or `google`, when more than one key is set. |
| `VOICE_LLM_MODEL` | `claude-opus-5-5` / `gpt-5.5` / `gemini-3.5-flash` | Any model of that provider with tool calling. A smaller model (e.g. `claude-haiku-5-5`) answers faster. |
| `ELEVENLABS_VOICE_ID` | George | Any voice from your ElevenLabs library. |
| `ELEVENLABS_TTS_MODEL` | `eleven_flash_v2_5` | Flash is the low-latency model. |
| `ELEVENLABS_STT_MODEL` | `scribe_v2` | |

Restart the app after changing them.

## How it works

1. The browser records until you stop talking, then sends the audio to `/api/voice/turn`.
2. The server transcribes it with ElevenLabs and passes the text, plus the conversation so far, to the model.
3. The model calls tools: find deals and people, read a deal, list an inbox folder, pipeline numbers, and (for members and up) log an activity, set a next step, move a deal or create one. The tools run the same actions as the inbox, as the signed-in user, so roles and Row Level Security apply unchanged. Viewers get the read-only tools.
4. The reply comes back as text, and `/api/voice/speak` streams it as audio.

API keys stay on the server. Nothing is stored apart from the changes you ask for; the conversation lives in the open panel and is gone when you close it. Each user gets 40 requests per 10 minutes.

The assistant makes at most 3 changes per request, and asks before marking a deal won or lost: the change only happens after you say yes. That keeps text in the CRM (a note from a website form, say) from steering it into changes you didn't ask for.

## Privacy

With voice on, recordings and the CRM data the assistant reads (names, deal details, notes) are sent to ElevenLabs and to your LLM provider. Add both to your sub-processor list and processing agreements ([gdpr.md](gdpr.md)), and check their data retention settings. Leave the keys unset if that doesn't work for you.
