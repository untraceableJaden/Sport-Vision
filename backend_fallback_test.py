#!/usr/bin/env python3
"""
Backend Model Fallback Test Suite for SportVision AI Pro
Tests the automatic model fallback feature (gemini-3.1-pro-preview -> gemini-3.6-flash)
"""

import requests
import json
import time
import sys

# Configuration
BASE_URL = "https://motion-insights-6.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"
GEMINI_API_KEY = "AIzaSyBlXAXmziBxGMNVbPiPKnpHLbsa7cCLTJA"
TEST_VIDEO_PATH = "/tmp/test_sport.mp4"

# Test results tracking
test_results = []
analysis_id = None

def log_test(test_name, passed, details):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {test_name}")
    print(f"Details: {details}")
    test_results.append({
        "test": test_name,
        "passed": passed,
        "details": details
    })

def test_1_fallback_on_analysis_start():
    """
    Test 1: POST /api/analysis/start with model="gemini-3.1-pro-preview"
    Expected: HTTP 200 (not 429!) with fallbackApplied=true, model="gemini-3.6-flash"
    """
    global analysis_id
    
    print("\n" + "="*80)
    print("TEST 1: POST /api/analysis/start with model fallback")
    print("="*80)
    print("Testing automatic fallback from gemini-3.1-pro-preview to gemini-3.6-flash")
    print("(gemini-3.1-pro-preview has 0 free-tier quota on this key)")
    
    try:
        with open(TEST_VIDEO_PATH, 'rb') as video_file:
            files = {
                'video': ('test_sport.mp4', video_file, 'video/mp4')
            }
            data = {
                'sportId': 'tennis',
                'model': 'gemini-3.1-pro-preview'  # This model has 0 free quota
            }
            headers = {
                'x-gemini-api-key': GEMINI_API_KEY
            }
            
            print(f"Uploading video: {TEST_VIDEO_PATH}")
            print(f"Sport: tennis")
            print(f"Requested Model: gemini-3.1-pro-preview (should trigger fallback)")
            print("Waiting for Gemini analysis with fallback (timeout: 120s)...")
            
            start_time = time.time()
            response = requests.post(
                f"{API_BASE}/analysis/start",
                files=files,
                data=data,
                headers=headers,
                timeout=120
            )
            elapsed = time.time() - start_time
            
            print(f"\nStatus Code: {response.status_code}")
            print(f"Time taken: {elapsed:.1f}s")
            print(f"Response body (first 1000 chars):\n{response.text[:1000]}")
        
        # CRITICAL: Should be 200, not 429!
        if response.status_code != 200:
            log_test("Test 1: Fallback on analysis start", False, 
                    f"Expected HTTP 200 (fallback should succeed), got {response.status_code}")
            print(f"Full response: {response.text}")
            return False
        
        result = response.json()
        print(f"\nResponse keys: {list(result.keys())}")
        
        # Verify fallback fields
        if result.get('model') != 'gemini-3.6-flash':
            log_test("Test 1: Fallback on analysis start", False, 
                    f"Expected model='gemini-3.6-flash', got '{result.get('model')}'")
            return False
        
        if result.get('requestedModel') != 'gemini-3.1-pro-preview':
            log_test("Test 1: Fallback on analysis start", False, 
                    f"Expected requestedModel='gemini-3.1-pro-preview', got '{result.get('requestedModel')}'")
            return False
        
        if result.get('fallbackApplied') != True:
            log_test("Test 1: Fallback on analysis start", False, 
                    f"Expected fallbackApplied=true, got {result.get('fallbackApplied')}")
            return False
        
        # Verify analysis object is valid and complete
        analysis = result.get('analysis')
        if not analysis:
            log_test("Test 1: Fallback on analysis start", False, "Missing 'analysis' object")
            return False
        
        # Verify required analysis fields
        required_fields = ['summary', 'radar', 'metrics', 'events', 'insights', 'unavailableMetrics']
        missing = [f for f in required_fields if f not in analysis]
        if missing:
            log_test("Test 1: Fallback on analysis start", False, f"Missing analysis fields: {missing}")
            return False
        
        # Verify radar has 6 numeric fields
        radar = analysis.get('radar', {})
        required_radar_keys = ['power', 'accuracy', 'consistency', 'agility', 'formIntegrity', 'stamina']
        missing_radar = [k for k in required_radar_keys if k not in radar]
        if missing_radar:
            log_test("Test 1: Fallback on analysis start", False, f"Missing radar keys: {missing_radar}")
            return False
        
        # Verify radar values are numeric
        for key, value in radar.items():
            if not isinstance(value, (int, float)):
                log_test("Test 1: Fallback on analysis start", False, 
                        f"Radar key '{key}' is not numeric: {value}")
                return False
        
        # Verify arrays
        if not isinstance(analysis.get('metrics'), list):
            log_test("Test 1: Fallback on analysis start", False, "metrics is not an array")
            return False
        
        if not isinstance(analysis.get('events'), list):
            log_test("Test 1: Fallback on analysis start", False, "events is not an array")
            return False
        
        if not isinstance(analysis.get('insights'), list):
            log_test("Test 1: Fallback on analysis start", False, "insights is not an array")
            return False
        
        if not isinstance(analysis.get('unavailableMetrics'), list):
            log_test("Test 1: Fallback on analysis start", False, "unavailableMetrics is not an array")
            return False
        
        # Save analysis ID for later tests
        analysis_id = result['id']
        
        print(f"\n✅ FALLBACK SUCCESS:")
        print(f"  - HTTP Status: 200 (not 429!)")
        print(f"  - Analysis ID: {analysis_id}")
        print(f"  - Requested Model: {result['requestedModel']}")
        print(f"  - Actual Model Used: {result['model']}")
        print(f"  - Fallback Applied: {result['fallbackApplied']}")
        print(f"  - Summary: {analysis['summary'][:100]}...")
        print(f"  - Radar scores: {radar}")
        print(f"  - Metrics count: {len(analysis['metrics'])}")
        print(f"  - Events count: {len(analysis['events'])}")
        print(f"  - Insights count: {len(analysis['insights'])}")
        print(f"  - Unavailable metrics count: {len(analysis['unavailableMetrics'])}")
        
        log_test("Test 1: Fallback on analysis start", True, 
                f"Successfully created analysis with automatic fallback in {elapsed:.1f}s")
        return True
        
    except requests.exceptions.Timeout:
        log_test("Test 1: Fallback on analysis start", False, "Request timeout (>120s)")
        return False
    except Exception as e:
        log_test("Test 1: Fallback on analysis start", False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_2_get_analysis_with_fallback():
    """
    Test 2: GET /api/analysis/<id from step 1>
    Expected: HTTP 200, doc should include fallbackApplied=true and requestedModel
    """
    print("\n" + "="*80)
    print(f"TEST 2: GET /api/analysis/{analysis_id}")
    print("="*80)
    print("Verifying stored analysis includes fallback metadata")
    
    if not analysis_id:
        log_test("Test 2: Get analysis with fallback", False, "No analysis_id from Test 1")
        return False
    
    try:
        response = requests.get(f"{API_BASE}/analysis/{analysis_id}", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            log_test("Test 2: Get analysis with fallback", False, 
                    f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        result = response.json()
        print(f"Response keys: {list(result.keys())}")
        
        # Verify ID matches
        if result.get('id') != analysis_id:
            log_test("Test 2: Get analysis with fallback", False, 
                    f"ID mismatch: expected {analysis_id}, got {result.get('id')}")
            return False
        
        # Verify fallback metadata is present
        if result.get('fallbackApplied') != True:
            log_test("Test 2: Get analysis with fallback", False, 
                    f"Expected fallbackApplied=true, got {result.get('fallbackApplied')}")
            return False
        
        if result.get('requestedModel') != 'gemini-3.1-pro-preview':
            log_test("Test 2: Get analysis with fallback", False, 
                    f"Expected requestedModel='gemini-3.1-pro-preview', got '{result.get('requestedModel')}'")
            return False
        
        if result.get('model') != 'gemini-3.6-flash':
            log_test("Test 2: Get analysis with fallback", False, 
                    f"Expected model='gemini-3.6-flash', got '{result.get('model')}'")
            return False
        
        print(f"\n✅ RETRIEVAL SUCCESS:")
        print(f"  - Analysis ID: {analysis_id}")
        print(f"  - Fallback Applied: {result['fallbackApplied']}")
        print(f"  - Requested Model: {result['requestedModel']}")
        print(f"  - Actual Model: {result['model']}")
        print(f"  - Sport: {result.get('sportName')}")
        
        log_test("Test 2: Get analysis with fallback", True, 
                f"Successfully retrieved analysis with fallback metadata")
        return True
        
    except Exception as e:
        log_test("Test 2: Get analysis with fallback", False, f"Exception: {str(e)}")
        return False

def test_3_chat_after_fallback():
    """
    Test 3: POST /api/analysis/<id>/chat
    Expected: HTTP 200 with answer and fallbackApplied field
    """
    print("\n" + "="*80)
    print(f"TEST 3: POST /api/analysis/{analysis_id}/chat")
    print("="*80)
    print("Testing chat functionality after fallback-created analysis")
    
    if not analysis_id:
        log_test("Test 3: Chat after fallback", False, "No analysis_id from Test 1")
        return False
    
    try:
        headers = {
            'Content-Type': 'application/json',
            'x-gemini-api-key': GEMINI_API_KEY
        }
        payload = {
            'question': 'Summarize this in one sentence.'
        }
        
        print(f"Question: {payload['question']}")
        print("Waiting for Gemini response (timeout: 60s)...")
        
        start_time = time.time()
        response = requests.post(
            f"{API_BASE}/analysis/{analysis_id}/chat",
            json=payload,
            headers=headers,
            timeout=60
        )
        elapsed = time.time() - start_time
        
        print(f"Status Code: {response.status_code}")
        print(f"Time taken: {elapsed:.1f}s")
        
        if response.status_code != 200:
            log_test("Test 3: Chat after fallback", False, 
                    f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        result = response.json()
        print(f"Response keys: {list(result.keys())}")
        
        # Verify answer field
        if 'answer' not in result:
            log_test("Test 3: Chat after fallback", False, "Missing 'answer' field")
            return False
        
        answer = result['answer']
        if not answer or not isinstance(answer, str) or len(answer.strip()) == 0:
            log_test("Test 3: Chat after fallback", False, f"Answer is empty or invalid")
            return False
        
        # Verify fallbackApplied field exists (can be true or false)
        if 'fallbackApplied' not in result:
            log_test("Test 3: Chat after fallback", False, "Missing 'fallbackApplied' field")
            return False
        
        print(f"\n✅ CHAT SUCCESS:")
        print(f"  - Answer length: {len(answer)} characters")
        print(f"  - Answer: {answer}")
        print(f"  - Fallback Applied (for this chat): {result['fallbackApplied']}")
        
        log_test("Test 3: Chat after fallback", True, 
                f"Successfully got chat response ({len(answer)} chars)")
        return True
        
    except requests.exceptions.Timeout:
        log_test("Test 3: Chat after fallback", False, "Request timeout (>60s)")
        return False
    except Exception as e:
        log_test("Test 3: Chat after fallback", False, f"Exception: {str(e)}")
        return False

def test_4_get_nonexistent_analysis():
    """
    Test 4: GET /api/analysis/<bogus uuid>
    Expected: HTTP 404 with clean error message
    """
    print("\n" + "="*80)
    print("TEST 4: GET /api/analysis/<bogus uuid>")
    print("="*80)
    print("Testing 404 error handling for non-existent analysis")
    
    bogus_id = "00000000-0000-0000-0000-000000000000"
    
    try:
        response = requests.get(f"{API_BASE}/analysis/{bogus_id}", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 404:
            log_test("Test 4: Get nonexistent analysis", False, 
                    f"Expected 404, got {response.status_code}")
            return False
        
        result = response.json()
        
        # Verify it's a clean error message (not a 500 crash)
        if 'error' not in result:
            log_test("Test 4: Get nonexistent analysis", False, 
                    "Expected 'error' field in response")
            return False
        
        error_msg = result['error']
        if not isinstance(error_msg, str) or len(error_msg) == 0:
            log_test("Test 4: Get nonexistent analysis", False, 
                    f"Error message is invalid: {error_msg}")
            return False
        
        # Verify it's a short, clean message (not a stack trace)
        if len(error_msg) > 200:
            log_test("Test 4: Get nonexistent analysis", False, 
                    f"Error message too long ({len(error_msg)} chars), might be a stack trace")
            return False
        
        print(f"\n✅ 404 HANDLING SUCCESS:")
        print(f"  - HTTP Status: 404")
        print(f"  - Error Message: {error_msg}")
        print(f"  - Message Length: {len(error_msg)} characters (clean and concise)")
        
        log_test("Test 4: Get nonexistent analysis", True, 
                f"Correctly returned 404 with clean error message")
        return True
        
    except Exception as e:
        log_test("Test 4: Get nonexistent analysis", False, f"Exception: {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("MODEL FALLBACK TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in test_results if r['passed'])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%\n")
    
    for result in test_results:
        status = "✅" if result['passed'] else "❌"
        print(f"{status} {result['test']}")
    
    print("\n" + "="*80)
    
    return passed == total

def main():
    """Run all fallback tests in sequence"""
    print("="*80)
    print("SportVision AI Pro - Model Fallback Test Suite")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Video: {TEST_VIDEO_PATH}")
    print(f"Using BYOK Gemini API Key: {GEMINI_API_KEY[:20]}...")
    print("\nTesting automatic model fallback:")
    print("  gemini-3.1-pro-preview (0 free quota) -> gemini-3.6-flash")
    print("="*80)
    
    # Run tests in order
    test_1_fallback_on_analysis_start()
    
    # Only run subsequent tests if we have an analysis_id
    if analysis_id:
        test_2_get_analysis_with_fallback()
        test_3_chat_after_fallback()
    else:
        print("\n⚠️  Skipping tests 2-3 because Test 1 failed")
    
    # Test 4 is independent
    test_4_get_nonexistent_analysis()
    
    # Print summary
    all_passed = print_summary()
    
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
