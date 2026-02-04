import os
import finlab
from finlab import data
from dotenv import load_dotenv

def test_finlab_connection():
    load_dotenv('.env.local')
    api_key = os.getenv("FINLAB_API_KEY")
    
    if not api_key:
        print("❌ Error: FINLAB_API_KEY not found in .env.local")
        return

    try:
        # Use the API key to login
        # In current versions of finlab, the suggested way is often finlab.login(key)
        # or it picks up from FINLAB_API_KEY env var automatically if using data.get
        print(f"Attempting login with key: {api_key[:5]}...")
        finlab.login(api_key)
        print("✅ Finlab login successful!")
        
        # Try to get a small piece of data as verification
        print("Fetching 'price:收盤價' for testing (small sample)...")
        # Just get the most recent few rows to minimize download
        close = data.get('price:收盤價')
        print(f"✅ Data fetched! Shape: {close.shape}")
        print(f"Last few rows:\n{close.iloc[-3:, :5]}") # Print a small subset
        
    except Exception as e:
        print(f"❌ Error during Finlab test: {e}")

if __name__ == "__main__":
    test_finlab_connection()
