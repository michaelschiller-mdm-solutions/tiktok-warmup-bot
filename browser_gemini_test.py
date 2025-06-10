#!/usr/bin/env python3
"""
Browser Use Script with Gemini AI
Test script to browse x.com (Twitter) using Gemini as the LLM
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

def setup_gemini():
    """Set up Gemini API and return the LLM instance"""
    api_key = os.getenv('GOOGLE_API_KEY')
    
    if not api_key:
        print("❌ Error: GOOGLE_API_KEY not found in environment variables")
        print("Please create a .env file with your Gemini API key:")
        print("GOOGLE_API_KEY=your_actual_api_key_here")
        print("\nYou can get an API key from: https://makersuite.google.com/app/apikey")
        sys.exit(1)
    
    # Configure Gemini
    genai.configure(api_key=api_key)
    
    # Create the ChatGoogleGenerativeAI instance for Browser Use
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",  # You can also use "gemini-1.5-pro" for more advanced tasks
        google_api_key=api_key,
        temperature=0.1,  # Lower temperature for more consistent behavior
    )
    
    return llm

async def test_x_browsing():
    """Test browsing x.com with various tasks"""
    
    print("🤖 Setting up Gemini LLM...")
    llm = setup_gemini()
    
    # Test tasks for x.com
    test_tasks = [
        "Go to x.com and explore the trending topics",
        "Navigate to x.com and find the login button",
        "Visit x.com and describe what you see on the homepage",
        "Go to x.com and look for the search functionality",
    ]
    
    for i, task in enumerate(test_tasks, 1):
        print(f"\n🧪 Test {i}: {task}")
        print("=" * 50)
        
        try:
            # Create the agent with Gemini
            agent = Agent(
                task=task,
                llm=llm,
                # Optional: Add custom settings
                # controller=custom_controller,  # If you want custom functions
            )
            
            # Run the agent
            result = await agent.run()
            
            print(f"✅ Test {i} completed successfully!")
            print(f"📝 Result: {result}")
            
        except Exception as e:
            print(f"❌ Test {i} failed: {str(e)}")
        
        # Add a small delay between tests
        print("\n⏳ Waiting 3 seconds before next test...")
        await asyncio.sleep(3)

async def custom_x_task():
    """Run a custom task on x.com"""
    
    print("🤖 Setting up Gemini LLM for custom task...")
    llm = setup_gemini()
    
    # You can modify this task as needed
    custom_task = """
    Go to x.com and do the following:
    1. Navigate to the main page
    2. Look for trending topics or hashtags
    3. Take note of the main navigation elements
    4. Describe the overall layout and what you observe
    5. Look for any interesting posts or content
    """
    
    print(f"\n🎯 Custom Task: {custom_task}")
    print("=" * 60)
    
    try:
        agent = Agent(
            task=custom_task,
            llm=llm,
        )
        
        result = await agent.run()
        
        print("✅ Custom task completed successfully!")
        print(f"📝 Detailed Result:\n{result}")
        
    except Exception as e:
        print(f"❌ Custom task failed: {str(e)}")

def main():
    """Main function to run the tests"""
    print("🚀 Browser Use + Gemini Test Script")
    print("This script will test browsing x.com using Gemini AI")
    print("=" * 60)
    
    # Check if .env file exists
    if not os.path.exists('.env'):
        print("\n⚠️  No .env file found!")
        print("Please create a .env file based on env_example.txt")
        print("Add your Gemini API key to the .env file")
        return
    
    choice = input("\nChoose test type:\n1. Run all basic tests\n2. Run custom task\n3. Both\nEnter choice (1-3): ")
    
    if choice == "1":
        print("\n🧪 Running basic tests...")
        asyncio.run(test_x_browsing())
    elif choice == "2":
        print("\n🎯 Running custom task...")
        asyncio.run(custom_x_task())
    elif choice == "3":
        print("\n🔄 Running both basic tests and custom task...")
        asyncio.run(test_x_browsing())
        print("\n" + "="*60)
        asyncio.run(custom_x_task())
    else:
        print("❌ Invalid choice. Please run the script again.")

if __name__ == "__main__":
    main() 