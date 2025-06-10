# Quick Setup - X.com Scroll Bot

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
pip install -r requirements.txt
playwright install
```

### 2. Create .env File
Create a file named `.env` in this directory with:
```env
GOOGLE_API_KEY=your_actual_gemini_api_key_here
```

**Get your API key from:** https://makersuite.google.com/app/apikey

### 3. Run the Bot
```bash
python x_scroll_bot.py
```

## 🎯 What It Does

- **Opens x.com** in a browser window
- **Scrolls through the feed** naturally
- **Clicks on interesting posts** 
- **Navigates back** to the feed
- **Repeats** the process several times

## 🤖 Model Used

- **Gemini 2.0 Flash Lite** - Latest, fastest model from Google

## ⚡ Quick Test vs Full Bot

- **Quick Test (Option 1)**: Simple scroll and 1 click - great for testing
- **Full Bot (Option 2)**: More comprehensive browsing with multiple clicks

## 🔧 Troubleshooting

**Browser doesn't open?**
- Make sure `BROWSER_HEADLESS=False` in your .env file (or don't set it at all)

**API key error?**
- Double-check your .env file has the correct API key
- Make sure there are no quotes around the key

**Import errors?**
- Run: `pip install -r requirements.txt`
- Then: `playwright install`

---

**Perfect for testing your VNC + iPhone setup!** 🎉 