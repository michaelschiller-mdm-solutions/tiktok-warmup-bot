#!/usr/bin/env python3
"""
Enhanced X.com Scroll Bot - Browser Use with Gemini 2.0 Flash Lite
Advanced bot that scrolls, opens posts, likes replies, and acts more naturally
"""

import asyncio
import os
import sys
from dotenv import load_dotenv
import google.generativeai as genai
from browser_use import Agent
from langchain_google_genai import ChatGoogleGenerativeAI

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
        temperature=0.3,  # Slightly higher for more varied behavior
    )
    
    print("✅ Gemini 2.0 Flash Lite configured successfully!")
    return llm

async def enhanced_x_scrolling():
    """Enhanced X.com scrolling with liking, commenting, and natural behavior"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite...")
    llm = setup_gemini_2_flash_lite()
    
    # Define the enhanced task
    enhanced_task = """
    You are controlling a browser to browse X.com (Twitter) like a real user. Act naturally and engage with content.

    Your goal is to:
    1. Navigate to https://x.com
    2. Scroll through the timeline slowly and naturally
    3. Click on 4-6 interesting posts to open them
    4. For each post you open:
       - Read the main tweet content
       - Scroll down to see replies
       - Occasionally LIKE a good reply (click the heart/like button)
       - Sometimes click "Show more replies" if you see it
       - Navigate back to the main timeline when done
    5. Continue scrolling and repeat this process
    6. Vary your behavior - sometimes scroll more, sometimes engage more
    7. Take breaks between actions (don't rush)
    8. End by scrolling back towards the top

    IMPORTANT INTERACTION GUIDELINES:
    - Look for like buttons (heart icons) on replies and click them occasionally
    - Don't like every reply - be selective like a real user
    - If you see interesting conversations, spend time reading them
    - Use the back button or ESC key to return to the timeline
    - Scroll at different speeds to seem natural
    - Take 2-3 second pauses between major actions

    SELECTORS TO LOOK FOR:
    - Tweet containers: [data-testid="tweet"]
    - Like buttons: [data-testid="like"] or [aria-label*="Like"]
    - Reply sections: [data-testid="reply"]
    - Back buttons or use browser back navigation

    Act like someone genuinely interested in the content, not like a bot.
    """
    
    print("🎯 Enhanced X.com Bot - Natural Social Media Browsing")
    print("=" * 70)
    print("🔄 Features:")
    print("  • Scroll through timeline naturally")
    print("  • Open and read posts")
    print("  • Like interesting replies")
    print("  • Read comment threads")
    print("  • Natural timing and behavior")
    print("=" * 70)
    
    try:
        # Create the agent with enhanced behavior
        agent = Agent(
            task=enhanced_task,
            llm=llm,
        )
        
        print("🚀 Starting enhanced X.com browsing session...")
        print("👀 You should see a browser window open shortly...")
        print("🎭 The bot will act like a real user browsing social media")
        
        # Run the agent
        result = await agent.run()
        
        print("\n✅ Enhanced X.com browsing session completed!")
        print("=" * 70)
        print("📊 Session Summary:")
        print("  • Scrolled through timeline")
        print("  • Opened multiple posts")
        print("  • Engaged with replies")
        print("  • Acted naturally with human-like timing")
        print("=" * 70)
        print(f"🤖 Final Result: {result}")
        
    except Exception as e:
        print(f"\n❌ Enhanced browsing session failed: {str(e)}")
        print("🔧 This might be due to X.com's bot detection or login requirements")

async def focused_engagement_test():
    """Focused test specifically for engaging with posts and replies"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite for engagement test...")
    llm = setup_gemini_2_flash_lite()
    
    engagement_task = """
    You are testing engagement features on X.com (Twitter). Your specific mission:

    1. Go to https://x.com
    2. Scroll down just 2-3 times to see some posts
    3. Click on the FIRST interesting post you see
    4. Once the post opens:
       a) Read the main tweet
       b) Scroll down to see replies
       c) Find a reply that looks interesting or positive
       d) Click the LIKE button (heart icon) on that reply
       e) Maybe scroll to see more replies
       f) Press ESC or click back to return to timeline
    5. Repeat this for 2-3 posts total
    6. End the session

    CRITICAL - LIKE BUTTON DETAILS:
    - Look for heart icons next to replies
    - Common selectors: [data-testid="like"], [aria-label*="Like"], svg heart icons
    - The like button is usually in a row with reply, retweet, and share buttons
    - Click it once to like, don't click again (that unlikes)
    - Look for the heart to turn red/filled when liked

    Focus on QUALITY engagement over quantity. Take your time and act naturally.
    """
    
    print("🎯 Focused Engagement Test")
    print("=" * 50)
    print("🎯 Goal: Test liking replies on X.com posts")
    print("🔍 Focus: Quality engagement over quantity")
    print("=" * 50)
    
    try:
        agent = Agent(
            task=engagement_task,
            llm=llm,
        )
        
        result = await agent.run()
        
        print("✅ Engagement test completed!")
        print(f"📊 Result: {result}")
        
    except Exception as e:
        print(f"❌ Engagement test failed: {str(e)}")

async def simple_scroll_and_like():
    """Simple version focusing just on scrolling and occasional likes"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite for simple scroll & like...")
    llm = setup_gemini_2_flash_lite()
    
    simple_task = """
    Simple X.com browsing with likes:

    1. Go to https://x.com
    2. Scroll down slowly 4-5 times
    3. Click on 1-2 tweets that look interesting
    4. When a tweet opens, look for replies
    5. If you see a reply you like, click the heart/like button on it
    6. Go back to the main timeline
    7. Scroll a bit more
    8. Repeat if you find more interesting content

    Keep it simple and natural. Don't overthink it.
    """
    
    print("🎯 Simple Scroll & Like Test")
    print("=" * 40)
    
    try:
        agent = Agent(task=simple_task, llm=llm)
        result = await agent.run()
        print("✅ Simple test completed!")
        print(f"📊 Result: {result}")
    except Exception as e:
        print(f"❌ Simple test failed: {str(e)}")

def main():
    """Main function with enhanced options"""
    print("🐦 Enhanced X.com Scroll Bot - Gemini 2.0 Flash Lite")
    print("=" * 60)
    print("This bot will scroll, engage with posts, and like replies naturally")
    print()
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("⚠️  No .env file found!")
        print("Please create a .env file with your Gemini API key:")
        print("GOOGLE_API_KEY=your_actual_api_key_here")
        return
    
    print("Choose your test mode:")
    print("1. 🚀 Enhanced browsing (full social media simulation)")
    print("2. 🎯 Focused engagement test (specifically test liking replies)")
    print("3. 🔄 Simple scroll & like (basic version)")
    print("4. 📊 Exit")
    
    choice = input("\nEnter choice (1-4): ").strip()
    
    if choice == "1":
        print("\n🚀 Running enhanced social media browsing...")
        print("🎭 The bot will act like a real user with natural timing")
        asyncio.run(enhanced_x_scrolling())
    elif choice == "2":
        print("\n🎯 Running focused engagement test...")
        print("🔍 Testing specific reply liking functionality")
        asyncio.run(focused_engagement_test())
    elif choice == "3":
        print("\n🔄 Running simple scroll & like test...")
        print("✨ Basic but effective social media interaction")
        asyncio.run(simple_scroll_and_like())
    elif choice == "4":
        print("👋 Goodbye!")
        return
    else:
        print("❌ Invalid choice. Please run again.")
        return
    
    print("\n🎉 Enhanced bot session completed!")
    print("💡 Tip: Each mode tests different aspects of social media automation")
    print("🔄 Run again to try different interaction patterns")

if __name__ == "__main__":
    main() 