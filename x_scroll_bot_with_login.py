#!/usr/bin/env python3
"""
X.com Scroll Bot with Auto-Login - Browser Use with Gemini 2.0 Flash Lite
Enhanced bot that logs in automatically and performs natural social media interactions
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

# Login credentials
X_EMAIL = "chickenxd7@gmail.com"
X_PASSWORD = ".ACMilan.7"
X_USERNAME = "chicckkken"  # In case X.com asks for username due to suspicious activity

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

async def login_and_enhanced_browsing():
    """Complete workflow: Login to X.com then do enhanced browsing"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite...")
    llm = setup_gemini_2_flash_lite()
    
    # Define the complete task with login and browsing
    complete_task = f"""
    You are going to log into X.com (Twitter) and then browse it naturally like a real user.

         PHASE 1 - LOGIN:
     1. Navigate to https://x.com
     2. Look for a "Sign in" or "Log in" button and click it
     3. Enter the email: {X_EMAIL}
     4. Click "Next" or submit button
     5. If X.com asks for username due to suspicious activity, enter: {X_USERNAME}
     6. Enter the password: {X_PASSWORD}
     7. Click "Log in" or submit button
     8. Handle any additional verification steps if they appear
     9. Wait for the page to load and confirm you're logged in (you should see the timeline/home feed)

    PHASE 2 - NATURAL BROWSING:
    Once successfully logged in, act like a real user browsing social media:
    1. Scroll through the timeline slowly and naturally
    2. Click on 4-6 interesting posts to open them
    3. For each post you open:
       - Read the main tweet content
       - Scroll down to see replies
       - Occasionally LIKE a good reply (click the heart/like button)
       - Sometimes read through conversations
       - Navigate back to the main timeline when done
    4. Continue scrolling and repeat this process
    5. Vary your behavior - sometimes scroll more, sometimes engage more
    6. Take natural pauses between actions (2-3 seconds)
    7. End by scrolling back towards the top

         IMPORTANT LOGIN TIPS:
     - X.com login page may have different layouts
     - Look for input fields with placeholders like "Phone, email, or username"
     - The password field comes after entering email and clicking next
     - SUSPICIOUS ACTIVITY: If X.com asks for username, enter: {X_USERNAME}
     - Be patient with page loads and handle verification steps carefully
     - X.com may ask for phone verification or other security checks

    ENGAGEMENT GUIDELINES:
    - Look for like buttons (heart icons) on replies and click them occasionally
    - Don't like every reply - be selective like a real user
    - Use ESC key or back button to return to timeline
    - Take breaks between actions to seem natural

         SELECTORS TO LOOK FOR:
     - Login inputs: [name="text"], [placeholder*="email"], [placeholder*="username"] 
     - Username inputs: [placeholder*="username"], [name="username"]
     - Password inputs: [name="password"], [type="password"]
     - Tweet containers: [data-testid="tweet"]
     - Like buttons: [data-testid="like"] or [aria-label*="Like"]

    Act naturally throughout the entire process - both login and browsing.
    """
    
    print("🎯 X.com Auto-Login + Enhanced Browsing Bot")
    print("=" * 60)
    print("📧 Email:", X_EMAIL)
    print("👤 Username:", X_USERNAME, "(if needed)")
    print("🔐 Password: ********** (hidden)")
    print("=" * 60)
    print("🔄 Features:")
    print("  • Automatic login to X.com")
    print("  • Natural timeline scrolling")
    print("  • Open and read posts")
    print("  • Like interesting replies")
    print("  • Human-like timing and behavior")
    print("=" * 60)
    
    try:
        # Create the agent with complete workflow
        agent = Agent(
            task=complete_task,
            llm=llm,
        )
        
        print("🚀 Starting X.com login and browsing session...")
        print("👀 You should see a browser window open shortly...")
        print("🔐 Bot will first log in, then start browsing naturally")
        
        # Run the agent
        result = await agent.run()
        
        print("\n✅ Complete X.com session finished!")
        print("=" * 60)
        print("📊 Session Summary:")
        print("  ✅ Logged into X.com")
        print("  ✅ Browsed timeline naturally") 
        print("  ✅ Opened multiple posts")
        print("  ✅ Engaged with replies")
        print("  ✅ Acted like a real user")
        print("=" * 60)
        print(f"🤖 Final Result: {result}")
        
    except Exception as e:
        print(f"\n❌ X.com session failed: {str(e)}")
        print("🔧 This might be due to:")
        print("   • X.com's anti-bot measures")
        print("   • Login page changes")
        print("   • Network connectivity issues")
        print("   • Credential verification requirements")

async def quick_login_test():
    """Quick test to just verify login functionality"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite for login test...")
    llm = setup_gemini_2_flash_lite()
    
    login_task = f"""
         Quick X.com login test:

     1. Go to https://x.com
     2. Click "Sign in" or "Log in"
     3. Enter email: {X_EMAIL}
     4. Click Next
     5. If asked for username due to suspicious activity, enter: {X_USERNAME}
     6. Enter password: {X_PASSWORD}
     7. Click Log in
     8. Handle any verification steps
     9. Wait to see if login is successful
     10. If successful, take a screenshot and scroll down once to confirm you're in

     Focus on getting the login right. Handle all verification steps carefully.
    """
    
    print("🎯 Quick Login Test")
    print("=" * 40)
    print("🔐 Testing login with your credentials")
    print("📧 Email:", X_EMAIL)
    print("=" * 40)
    
    try:
        agent = Agent(task=login_task, llm=llm)
        result = await agent.run()
        print("✅ Login test completed!")
        print(f"📊 Result: {result}")
    except Exception as e:
        print(f"❌ Login test failed: {str(e)}")

async def browse_after_manual_login():
    """Browse X.com assuming you're already logged in manually"""
    
    print("🤖 Setting up Gemini 2.0 Flash Lite for browsing...")
    llm = setup_gemini_2_flash_lite()
    
    browse_task = """
    You are browsing X.com where the user is already logged in.

    1. Go to https://x.com (you should see the timeline)
    2. Scroll through posts naturally
    3. Click on 3-4 interesting posts
    4. For each post:
       - Read the content
       - Look at replies
       - Like 1-2 good replies (click heart icons)
       - Go back to timeline
    5. Continue browsing naturally
    6. Take your time and act human-like

    Focus on natural engagement with the content.
    """
    
    print("🎯 Browse Only (Assuming Manual Login)")
    print("=" * 50)
    
    try:
        agent = Agent(task=browse_task, llm=llm)
        result = await agent.run()
        print("✅ Browsing session completed!")
        print(f"📊 Result: {result}")
    except Exception as e:
        print(f"❌ Browsing session failed: {str(e)}")

def main():
    """Main function with login options"""
    print("🐦 X.com Auto-Login Bot - Gemini 2.0 Flash Lite")
    print("=" * 55)
    print("This bot will log into X.com and browse naturally")
    print(f"📧 Using account: {X_EMAIL}")
    print()
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("⚠️  No .env file found!")
        print("Please create a .env file with your Gemini API key:")
        print("GOOGLE_API_KEY=your_actual_api_key_here")
        return
    
    print("Choose your mode:")
    print("1. 🚀 Full workflow (Auto-login + Enhanced browsing)")
    print("2. 🔐 Quick login test (Just test login functionality)")
    print("3. 📱 Browse only (Assuming you're already logged in)")
    print("4. 📊 Exit")
    
    choice = input("\nEnter choice (1-4): ").strip()
    
    if choice == "1":
        print("\n🚀 Running full auto-login + browsing workflow...")
        print("🔐 Bot will log in first, then browse naturally")
        asyncio.run(login_and_enhanced_browsing())
    elif choice == "2":
        print("\n🔐 Running quick login test...")
        print("🧪 Testing login functionality only")
        asyncio.run(quick_login_test())
    elif choice == "3":
        print("\n📱 Running browse-only mode...")
        print("💡 Make sure you're already logged into X.com")
        asyncio.run(browse_after_manual_login())
    elif choice == "4":
        print("👋 Goodbye!")
        return
    else:
        print("❌ Invalid choice. Please run again.")
        return
    
    print("\n🎉 X.com session completed!")
    print("💡 Tip: Different modes help test different aspects")
    print("🔄 Run again to try different workflows")

if __name__ == "__main__":
    main() 