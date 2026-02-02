import os
import time
import logging
import requests
import pathlib
from typing import Optional
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

# Constants
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def download_file_requests(url: str, output_path: pathlib.Path) -> bool:
    """
    Simulated download using simple Requests (Fast & Lightweight)
    """
    try:
        logger.info(f"Attempting download via Requests: {url}")
        headers = {'User-Agent': USER_AGENT}
        
        # 00981A special handling: Official site often redirects or checks cookies.
        # We try a direct GET first.
        # Disable SSL verification for legacy financial sites
        resp = requests.get(url, headers=headers, stream=True, timeout=30, verify=False)
        resp.raise_for_status()
        
        # Basic content type check
        ct = resp.headers.get('Content-Type', '').lower()
        if 'html' in ct and 'application' not in ct:
            logger.warning("Requests returned HTML instead of binary file. Likely blocked or redirect.")
            return False
            
        with open(output_path, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
                
        logger.info("Download via Requests successful.")
        return True
    except Exception as e:
        logger.warning(f"Requests download failed: {e}")
        return False

def download_file_playwright(url: str, output_path: pathlib.Path) -> bool:
    """
    Simulated download using Playwright (Robust & Heavy)
    This handles JS challenges, dynamic links, and waits for downloads.
    """
    logger.info(f"Attempting download via Playwright: {url}")
    try:
        with sync_playwright() as p:
            # Launch with headless=True for automation
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent=USER_AGENT)
            page = context.new_page()
            
            # Setup download listener
            with page.expect_download(timeout=60000) as download_info:
                # Some sites require visiting the page first then clicking.
                # If URL is a direct file link but protected by JS, opening it might just trigger download.
                # However, for 00981A (Unified), it might be a button click.
                # For Phase 1, we assume URL is the endpoint. 
                # If we need to navigate -> click, we'd adapt this logic.
                
                # Strategy: Try navigating to the URL. 
                # If it's a direct download, Playwright handles it.
                # If it's a page, we might need to find logic (TODO for V2 if specific page logic needed).
                try:
                    page.goto(url, wait_until='domcontentloaded')
                except Exception as nav_err:
                    # Navigation might "fail" if it's a direct download stream, 
                    # but expect_download captures it.
                    logger.debug(f"Navigation ended (could be download): {nav_err}")

            download = download_info.value
            download.save_as(output_path)
            
            browser.close()
            
        logger.info("Download via Playwright successful.")
        return True
    except Exception as e:
        logger.error(f"Playwright download failed: {e}")
        return False

def download_file(url: str, output_path: pathlib.Path) -> bool:
    """
    Unified entry point: Try Requests first, then Playwright.
    """
    # Ensure directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Strategy 1: Requests
    if download_file_requests(url, output_path):
        return True
        
    # Strategy 2: Playwright (Fallback)
    logger.info("Falling back to Playwright...")
    return download_file_playwright(url, output_path)
