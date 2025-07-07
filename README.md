---

# 🎮 Twitch Desktop App with Discord RPC

A lightweight Twitch Desktop application with integrated **Discord Rich Presence**, so your friends can see what you're watching in real-time!

## ✨ Features

* 🟣 Browse and watch Twitch streams from your desktop
* 🧑‍💻 Login with your Twitch account
* 🖥️ Clean, modern user interface
* 🎮 Discord Rich Presence:

  * Shows the stream you're watching
  * Displays the streamer's name and category
  * Auto-updates in real time

## 🚀 Getting Started

### Prerequisites

* Node.js (v16 or newer)
* Discord desktop app (running)
* Twitch account

### Installation

```bash
git clone https://github.com/XertyLoin/TwitchApp.git
cd TwitchApp
npm install
npm start
```

### Build (Optional)

```bash
npm run build
```

## 🛠️ Technologies Used

* [Electron](https://www.electronjs.org/) – for the desktop application
* [Twitch API](https://dev.twitch.tv/docs/) – to fetch live stream data
* [discord-rpc](https://www.npmjs.com/package/discord-rpc) – to integrate Discord Rich Presence
* [React](https://reactjs.org/) or \[Vanilla JS] – (depending on your stack)

## 📸 Example

> Watching: **xQcOW** – Category: **Just Chatting**
> Status shown on Discord: `Watching xQcOW on Twitch`

## 🔒 Privacy

This app does **not** store any personal data. Your Twitch credentials are only used for authentication via OAuth.

## 📬 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.
