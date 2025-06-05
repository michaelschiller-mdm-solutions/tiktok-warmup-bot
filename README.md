# TikTok Warmup Bot ♨️

This is a simple TikTok bot that can be used to warm up your account.

![CleanShot 2025-06-04 at 23 31 21](https://github.com/user-attachments/assets/ffaeae04-311c-4300-b8f2-86b2dd6ce6e0)

## Setup

Run `npm install` to install the dependencies.

The trick is to use the Voice Control feature on your iOS device to perform some actions.

Enabling Voice Control:
  
![ScreenRecording_06-04-2025 23-36-18_1 (1)](https://github.com/user-attachments/assets/030e8aa9-ca96-4f9e-8cb8-3977a355219b)

Setup voice actions (Settings > Accessibility > Voice Control) on your device for:
- Swipe next
- Swipe previous
- Like post
- Save post
- Open comments
- Open profile
- Open shop
- Open inbox

You can find all the voice actions in the `voice-actions` folder. I let ElevenLabs do the talking. My French accent made Siri act like it was on strike 🥖.

If you don't want some of the actions, you can comment them out in the `index.js` file — if you're not technical, just ask Cursor, it'll do the work for you.

Run the bot with `npm start` and enjoy!

## Parameters (optional)

> Make sure to add the `--` before the parameters as npm doesn't pass custom flags. ex: `npm start -- --duration=20`

`--duration` (default: 30) — the duration of the session in minutes.

`--sequence` (default: null) — the sequence of actions to perform. Example: `npm start -- --sequence=swipeNext,swipeNext,likePost`.

## Internal configuration

You'll find `VOICE_ACTIONS` in the `index.js` file. You can change the duration and the frequency of the actions.

It basically works like this:
- Swipe next is the continuous default action.
- Each other action has a minimum X and maximum Y interval of appearing. Meaning that the action will appear after X to Y posts swiped.
- If an action is performed, the current interval is reset to 0.
- For each action, we suppose the end state is the same as the start state. Meaning that if you perform an action on the FYP, the next action will be on the FYP.

## Notes

- I'd advise you to do the first 30 minutes after the creation of your account yourself so you make sure the content is curated.
- The bot might encounter some blocking steps from TikTok like a modal or a popup. Make sure you keep an eye on the bot and restart it if it gets stuck.
- 100% safety is not guaranteed. Use at your own risk.

## Contact

Found an issue or just want to say hi? Reach out on [X/Twitter](https://x.com/lukecarry_).

## Credits

This setup is inspired by [Julian Valdy's article from The Quest](https://julianivaldy.medium.com/building-tiktok-instagram-farm-083e5e3bab62), figuring out the voice actions and the logic to run them.

## License

This software is licensed under the [Beerware License](LICENSE.md).
