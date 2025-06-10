#!/usr/bin/env python3
"""
X.com Scroll Bot - Connect to Existing Browser
Uses Gemini 2.0 Flash Lite to control your existing browser where you're already logged into X.com
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai
from browser_use import Agent
from langchain_google_genai import ChatGoogleGenerativeAI
from playwright.async_api import async_playwright

# Load environment variables
load_dotenv()

def setup_gemini_2_flash_lite():
    """Set up Gemini 2.0 Flash Lite and return the LLM instance"""
    api_key = os.getenv('GOOGLE_API_KEY')
    
    if not api_key:
        print("❌ Error: GOOGLE_API_KEY not found in environment variables")
        print("Please create a .env file with your Gemini API key:")
        print("GOOGLE_API_KEY=your_actual_api_key_here")
        print("\nYou can get an API key from: https://makersuite.google.com/app/apikey")
        sys.exit(1)
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    # Create the ChatGoogleGenerativeAI instance with Gemini 2.0 Flash Lite
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-lite",  # Using the newest, fastest model
        google_api_key=api_key,
        temperature=0.2,  # Slightly higher for more natural scrolling behavior
    )
    
    print("✅ Gemini 2.0 Flash Lite configured successfully!")
    return llm

async def connect_to_existing_browser():
    """Connect to an existing Chrome browser instance"""
    
    print("🌐 Connecting to your existing browser...")
    print("📋 Setup Instructions:")
    print("=" * 60)
    print("1. Open Chrome browser manually")
    print("2. Go to x.com and log in")
    print("3. Keep that browser window open")
    print("4. Open a new Command Prompt/Terminal and run:")
    print("   chrome.exe --remote-debugging-port=9222 --user-data-dir=\"C:\\temp\\chrome_debug\"")
    print("   (Or on Mac: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir=\"/tmp/chrome_debug\")")
    print("5. A new Chrome window will open - go to x.com in this new window")
    print("6. Now run this script again!")
    print("=" * 60)
    
    # Try to connect to the debug port
    try:
        playwright = await async_playwright().start()
        
        # Connect to existing browser on debug port
        browser = await playwright.chromium.connect_over_cdp("http://localhost:9222")
        
        # Get the first context (should have your existing pages)
        contexts = browser.contexts
        if not contexts:
            print("❌ No browser contexts found. Make sure Chrome is running with debug port.")
            await playwright.stop()
            return None, None
            
        context = contexts[0]
        
        # Get existing pages or create new one
        pages = context.pages
        if pages:
            page = pages[0]
            print(f"✅ Connected to existing page: {page.url}")
        else:
            page = await context.new_page()
            print("✅ Created new page in existing browser")
            
        return browser, page, playwright
        
    except Exception as e:
        print(f"❌ Failed to connect to existing browser: {str(e)}")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure Chrome is running with: --remote-debugging-port=9222")
        print("2. Check if you can access: http://localhost:9222 in another browser")
        print("3. Make sure no other debugger is connected to Chrome")
        return None, None, None

async def scroll_x_with_existing_browser():
    """Use existing browser to scroll X.com where user is already logged in"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite...")
    llm = setup_gemini_2_flash_lite()
    
    # Connect to existing browser
    browser, page, playwright = await connect_to_existing_browser()
    
    if not browser or not page:
        print("❌ Could not connect to existing browser. Please follow setup instructions.")
        return
    
    try:
        # Check current URL
        current_url = page.url
        print(f"📍 Current page: {current_url}")
        
        # If not on x.com, navigate there
        if "x.com" not in current_url and "twitter.com" not in current_url:
            print("🔄 Navigating to x.com...")
            await page.goto("https://x.com/home", wait_until="networkidle")
        
        # Define the task for the logged-in user
        scroll_task = f"""
        You are controlling a browser where the user is already logged into X.com (Twitter).
        
        Current URL: {page.url}
        
        Please do the following:
        1. First, take a moment to see what's on the screen
        2. If you see a login page, wait a moment for it to load the timeline
        3. Scroll down through the timeline naturally to see different posts
        4. Click on 2-3 interesting posts/tweets to open them
        5. For each post you click:
           - Read the content briefly
           - Maybe scroll to see a few replies
           - Go back to the main timeline (click back button or press Escape)
        6. Continue scrolling and exploring for about 5-7 posts total
        7. End by scrolling back near the top
        
        Act naturally like a real user browsing their timeline - don't rush, take time between actions.
        Since the user is already logged in, you should see their timeline immediately.
        """
        
        print("🎯 Task: Control your existing browser on X.com")
        print("=" * 60)
        print(f"📝 Instructions:\n{scroll_task}")
        print("=" * 60)
        
        # Create a custom Browser Use agent that works with existing browser
        # Note: Browser Use typically creates its own browser, so we need to work around this
        # For now, let's use a simpler approach with direct Playwright automation
        
        print("🤖 Starting automated browsing of your X.com timeline...")
        
        # Simple automation using Playwright directly
        await simple_x_automation(page, llm)
        
    except Exception as e:
        print(f"❌ Error during automation: {str(e)}")
        
    finally:
        print("🔄 Keeping your browser open (not closing it)")
        # Don't close the browser since it's the user's existing session
        await playwright.stop()

async def simple_x_automation(page, llm):
    """Simple X.com automation using Playwright directly"""
    
    print("📱 Starting X.com timeline browsing...")
    
    try:
        # Wait a moment for the page to fully load
        await asyncio.sleep(3)
        
        # Take a screenshot to see what we're working with
        await page.screenshot(path="current_state.png")
        print("📸 Screenshot saved as 'current_state.png'")
        
        # Scroll down a few times
        for i in range(5):
            print(f"📜 Scrolling down... ({i+1}/5)")
            await page.evaluate("window.scrollBy(0, 800)")
            await asyncio.sleep(2)
            
        # Try to find and click on a tweet
        print("🔍 Looking for tweets to click...")
        
        # Common selectors for tweets on X.com
        tweet_selectors = [
            '[data-testid="tweet"]',
            'article[data-testid="tweet"]',
            '[role="article"]'
        ]
        
        for selector in tweet_selectors:
            tweets = await page.query_selector_all(selector)
            if tweets and len(tweets) > 0:
                print(f"📝 Found {len(tweets)} tweets with selector: {selector}")
                
                # Click on the first few tweets
                for i, tweet in enumerate(tweets[:3]):
                    try:
                        print(f"👆 Clicking on tweet {i+1}...")
                        await tweet.click()
                        await asyncio.sleep(3)  # Wait for tweet to open
                        
                        # Go back to timeline (try Escape key or back navigation)
                        await page.keyboard.press('Escape')
                        await asyncio.sleep(2)
                        
                        # Alternative: try clicking browser back button
                        try:
                            await page.go_back()
                            await asyncio.sleep(2)
                        except:
                            pass  # If back doesn't work, continue
                            
                    except Exception as e:
                        print(f"⚠️  Could not click tweet {i+1}: {str(e)}")
                        continue
                        
                break  # Stop after finding tweets with one selector
        
        # Final scroll to top
        print("🔝 Scrolling back to top...")
        await page.evaluate("window.scrollTo(0, 0)")
        await asyncio.sleep(2)
        
        print("✅ X.com browsing session completed!")
        
    except Exception as e:
        print(f"❌ Error during simple automation: {str(e)}")

def main():
    """Main function"""
    print("🐦 X.com Scroll Bot - Connect to Existing Browser")
    print("=" * 60)
    print("This bot will connect to your existing Chrome browser")
    print("where you're already logged into X.com!")
    print()
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("⚠️  No .env file found!")
        print("Please create a .env file with your Gemini API key:")
        print("GOOGLE_API_KEY=your_actual_api_key_here")
        return
    
    print("🚀 Connecting to your existing browser...")
    asyncio.run(scroll_x_with_existing_browser())
    
    print("\n🎉 Bot session completed!")
    print("💡 Your browser session remains open and logged in.")

if __name__ == "__main__":
    main() 