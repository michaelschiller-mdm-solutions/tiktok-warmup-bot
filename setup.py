#!/usr/bin/env python3
"""
Setup script for Browser Use + Gemini project
This script will install dependencies and help configure the environment
"""

import subprocess
import sys
import os
import shutil

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed!")
        print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    print("🐍 Checking Python version...")
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python {sys.version.split()[0]} is compatible")
    return True

def install_dependencies():
    """Install required Python packages"""
    print("\n📦 Installing Python dependencies...")
    
    packages = [
        "browser-use",
        "google-generativeai", 
        "python-dotenv",
        "playwright",
        "langchain-google-genai"
    ]
    
    for package in packages:
        if not run_command(f"pip install {package}", f"Installing {package}"):
            return False
    
    # Install Playwright browsers
    if not run_command("playwright install", "Installing Playwright browsers"):
        return False
    
    return True

def setup_env_file():
    """Set up the .env file"""
    print("\n⚙️  Setting up environment file...")
    
    if os.path.exists('.env'):
        print("📁 .env file already exists")
        choice = input("Do you want to recreate it? (y/n): ").lower()
        if choice != 'y':
            return True
    
    # Copy from example
    if os.path.exists('env_example.txt'):
        shutil.copy('env_example.txt', '.env')
        print("✅ Created .env file from template")
    else:
        # Create basic .env file
        with open('.env', 'w') as f:
            f.write("# Add your Gemini API key here\n")
            f.write("GOOGLE_API_KEY=your_gemini_api_key_here\n\n")
            f.write("# Optional: Set other configuration\n")
            f.write("BROWSER_HEADLESS=False\n")
        print("✅ Created basic .env file")
    
    print("\n🔑 Don't forget to add your Gemini API key to the .env file!")
    print("You can get an API key from: https://makersuite.google.com/app/apikey")
    
    return True

def main():
    """Main setup function"""
    print("🚀 Browser Use + Gemini Setup Script")
    print("=" * 50)
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        print("\n❌ Failed to install some dependencies")
        print("Please check the error messages above and try again")
        sys.exit(1)
    
    # Setup environment file
    if not setup_env_file():
        print("\n❌ Failed to setup environment file")
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next steps:")
    print("1. Edit the .env file and add your Gemini API key")
    print("2. Run the test script: python browser_gemini_test.py")
    print("\n🔗 Get your Gemini API key from:")
    print("   https://makersuite.google.com/app/apikey")

if __name__ == "__main__":
    main() 