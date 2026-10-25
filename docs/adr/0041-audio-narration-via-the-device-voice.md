# ADR-0041: Audio narration via the device voice

- Status: Accepted (2026-10-25). Spec §5 (P1 multilingual audio narration), §710 (transcripts for audio). Recorded by MQ-098.

## Context

The spec lists multilingual audio narration as a P1 item and asks for transcripts for audio. The hackathon rules forbid unlicensed audio and assets, and the product claims no cloud service that has not been exercised (ADR-0003, ADR-0007). A text-to-speech service or generated audio files would add cost, a new data flow, licensing questions and an unverified integration.

## Decision

- A **Listen** button reads an already published narrative aloud using the browser's Web Speech API (`speechSynthesis`) and the voices installed on the viewer's own device. It appears on each key-moment card in the Live studio feed and on the recap Match story (sections read in order).
- It reads exactly the text shown for the current audience and language. The visible text is the transcript and is never hidden.
- Voice choice: a voice whose language matches the narrative language (en-GB, fr-FR, es-ES; another region of the same language is accepted if the exact one is missing). Nigerian Pidgin has no voice: an `en-NG` voice is used if the device has one, otherwise the control is replaced by a short note that audio is not available. Pidgin is never read with a French or Spanish voice.
- Behaviour: started by the viewer only, one reading at a time, the same button becomes Stop, and reading stops on navigation, an audience or language change and when the tab is hidden. Start, stop and finish are announced once, politely and throttled, through the existing announcement hook.
- Without `speechSynthesis` or a matching voice the control renders nothing (except the Pidgin note) and raises no error.

## What it is not

- It is not a model, a text-to-speech service or an audio asset. No text or audio is sent anywhere and nothing is stored.
- It is not broadcast-grade audio. Voice quality, accent and the languages available depend on the viewer's device and browser, and we do not control them.
- It is not a Pidgin voice. Pidgin audio depends on the device offering a Nigerian English voice.

## Consequences

- No new dependency, endpoint, secret or cost; the CSP is unchanged.
- The feature cannot be verified for voice quality in CI. Unit tests mock `speechSynthesis` and `SpeechSynthesisUtterance`; the control is covered by the existing axe scans wherever it renders.
- A future hosted voice would need its own ADR covering data flow, licensing and a Pidgin voice.
