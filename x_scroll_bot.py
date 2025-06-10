#!/usr/bin/env python3
"""
X.com Scroll Bot - Browser Use with Gemini 2.0 Flash Lite
Simple proof-of-concept script to scroll x.com and click on posts
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
        temperature=0.2,  # Slightly higher for more natural scrolling behavior
    )
    
    print("✅ Gemini 2.0 Flash Lite configured successfully!")
    return llm

async def scroll_and_click_x():
    """Main function to scroll x.com and click on posts"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite...")
    llm = setup_gemini_2_flash_lite()
    
    # Define the task for scrolling and clicking on x.com
    scroll_task = """
    Go to https://x.com and do the following actions to simulate natural browsing:

    1. Navigate to https://x.com
    2. Scroll down slowly through the feed to see different posts
    3. Look for interesting posts (tweets) that catch your attention
    4. Click on 2-3 different posts to open them
    5. For each post you click on:
       - Read the content briefly
       - Maybe scroll to see replies
       - Go back to the main feed
    6. Continue scrolling and repeat this process for about 5-7 posts total
    7. End by scrolling to the top of the page
    
    Act like a real user browsing casually - don't rush, take time between actions.
    """
    
    print("🎯 Task: Scroll x.com and click on posts")
    print("=" * 60)
    print(f"📝 Instructions:\n{scroll_task}")
    print("=" * 60)
    
    try:
        # Create the agent with Gemini 2.0 Flash Lite
        agent = Agent(
            task=scroll_task,
            llm=llm,
        )
        
        print("🚀 Starting the x.com scroll bot...")
        print("👀 You should see a browser window open shortly...")
        
        # Run the agent
        result = await agent.run()
        
        print("\n✅ X.com scroll bot completed successfully!")
        print("=" * 60)
        print(f"📊 Final Result:\n{result}")
        
    except Exception as e:
        print(f"\n❌ X.com scroll bot failed: {str(e)}")
        print("🔧 Try checking your internet connection and API key")

async def quick_x_test():
    """Quick test to just open x.com and scroll a bit"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite for quick test...")
    llm = setup_gemini_2_flash_lite()
    
    quick_task = """
    Go to https://x.com, scroll down 3-4 times to see different posts, 
    then click on one interesting post and go back to the main feed.
    Keep it simple and quick.
    """
    
    print(f"\n🧪 Quick Test: {quick_task}")
    print("=" * 50)
    
    try:
        agent = Agent(
            task=quick_task,
            llm=llm,
        )
        
        result = await agent.run()
        
        print("✅ Quick test completed!")
        print(f"📝 Result: {result}")
        
    except Exception as e:
        print(f"❌ Quick test failed: {str(e)}")

def main():
    """Main function with user choices"""
    print("🐦 X.com Scroll Bot - Gemini 2.0 Flash Lite")
    print("=" * 50)
    print("This bot will scroll through x.com and click on posts")
    print("to demonstrate Browser Use functionality.")
    print()
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("⚠️  No .env file found!")
        print("Please create a .env file with your Gemini API key:")
        print("GOOGLE_API_KEY=your_actual_api_key_here")
        return
    
    print("Choose your test:")
    print("1. Quick test (simple scroll and click)")
    print("2. Full scroll bot (more comprehensive)")
    print("3. Exit")
    
    choice = input("\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        print("\n🧪 Running quick test...")
        asyncio.run(quick_x_test())
    elif choice == "2":
        print("\n🤖 Running full scroll bot...")
        asyncio.run(scroll_and_click_x())
    elif choice == "3":
        print("👋 Goodbye!")
        return
    else:
        print("❌ Invalid choice. Please run again.")
        return
    
    print("\n🎉 Bot session completed!")
    print("💡 Tip: You can run this again to test different behaviors")

if __name__ == "__main__":
    main() 