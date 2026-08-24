#!/usr/bin/env python3
"""
Bug Verification Test for SportVision AI Pro
Tests that Gemini API errors return clean human-readable messages, not raw JSON blobs.
"""

import requests
import json
import time

# Configuration
BASE_URL = "https://motion-insights-6.preview.emergentagent.com"
API_KEY = "AIzaSyBlXAXmziBxGMNVbPiPKnpHLbsa7cCLTJA"
TEST_VIDEO_PATH = "/tmp/test_sport.mp4"

# Keywords that should NOT appear in clean error messages (raw JSON artifacts)
FORBIDDEN_KEYWORDS = [
    "quotaMetric",
    "quotaId",
    "@type",
    "RetryInfo",
    "details",
    '"error":{',  # nested JSON structure
]

def print_separator():
    print("\n" + "="*80 + "\n")

def check_for_raw_json_artifacts(error_message):
    """Check if error message contains raw JSON artifacts"""
    found_artifacts = []
    for keyword in FORBIDDEN_KEYWORDS:
        if keyword in error_message:
            found_artifacts.append(keyword)
    return found_artifacts

def test_1_quota_exceeded_error():
    """
    Test 1: POST /api/analysis/start with model="gemini-3.1-pro-preview"
    Expected: 429 error with clean human-readable message (NO raw JSON artifacts)
    """
    print("TEST 1: Quota Exceeded Error (gemini-3.1-pro-preview)")
    print("-" * 80)
    
    try:
        with open(TEST_VIDEO_PATH, 'rb') as video_file:
            files = {
                'video': ('test_sport.mp4', video_file, 'video/mp4')
            }
            data = {
                'sportId': 'football',
                'model': 'gemini-3.1-pro-preview'
            }
            headers = {
                'x-gemini-api-key': API_KEY
            }
            
            print(f"Sending POST {BASE_URL}/api/analysis/start")
            print(f"Model: gemini-3.1-pro-preview (expected to fail with quota error)")
            
            response = requests.post(
                f"{BASE_URL}/api/analysis/start",
                files=files,
                data=data,
                headers=headers,
                timeout=120
            )
            
            print(f"\n✓ HTTP Status Code: {response.status_code}")
            
            try:
                response_json = response.json()
                error_message = response_json.get('error', '')
                
                print(f"✓ Response JSON parsed successfully")
                print(f"\n✓ Error Message:")
                print(f"  '{error_message}'")
                print(f"\n✓ Error Message Length: {len(error_message)} characters")
                
                # Check for raw JSON artifacts
                artifacts = check_for_raw_json_artifacts(error_message)
                
                if artifacts:
                    print(f"\n❌ FAIL: Found raw JSON artifacts in error message:")
                    for artifact in artifacts:
                        print(f"   - '{artifact}'")
                    return False
                else:
                    print(f"\n✅ PASS: No raw JSON artifacts found")
                
                # Check if message is reasonably short and human-readable
                if len(error_message) > 500:
                    print(f"⚠️  WARNING: Error message is quite long ({len(error_message)} chars)")
                
                # Check if it mentions quota/rate limit
                if any(keyword in error_message.lower() for keyword in ['quota', 'rate', 'limit']):
                    print(f"✅ PASS: Error message mentions quota/rate limit")
                else:
                    print(f"⚠️  INFO: Error message doesn't explicitly mention quota/rate limit")
                
                return True
                
            except json.JSONDecodeError:
                print(f"❌ FAIL: Response is not valid JSON")
                print(f"Raw response: {response.text[:500]}")
                return False
                
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_2_regression_check():
    """
    Test 2: POST /api/analysis/start with model="gemini-3.6-flash"
    Expected: 200 success with full analysis object
    """
    print("TEST 2: Regression Check (gemini-3.6-flash)")
    print("-" * 80)
    
    try:
        with open(TEST_VIDEO_PATH, 'rb') as video_file:
            files = {
                'video': ('test_sport.mp4', video_file, 'video/mp4')
            }
            data = {
                'sportId': 'football',
                'model': 'gemini-3.6-flash'
            }
            headers = {
                'x-gemini-api-key': API_KEY
            }
            
            print(f"Sending POST {BASE_URL}/api/analysis/start")
            print(f"Model: gemini-3.6-flash (expected to succeed)")
            
            start_time = time.time()
            response = requests.post(
                f"{BASE_URL}/api/analysis/start",
                files=files,
                data=data,
                headers=headers,
                timeout=120
            )
            elapsed = time.time() - start_time
            
            print(f"\n✓ HTTP Status Code: {response.status_code}")
            print(f"✓ Response Time: {elapsed:.1f}s")
            
            if response.status_code != 200:
                print(f"❌ FAIL: Expected 200, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"Error response: {json.dumps(error_data, indent=2)}")
                except json.JSONDecodeError:
                    print(f"Raw response: {response.text[:500]}")
                return False
            
            try:
                response_json = response.json()
                
                # Check for required fields in analysis object
                required_fields = ['id', 'analysis', 'sportId', 'model']
                missing_fields = [f for f in required_fields if f not in response_json]
                
                if missing_fields:
                    print(f"❌ FAIL: Missing required fields: {missing_fields}")
                    return False
                
                print(f"✅ PASS: All required top-level fields present")
                
                # Check analysis structure
                analysis = response_json.get('analysis', {})
                required_analysis_fields = ['summary', 'radar', 'metrics', 'events', 'insights', 'unavailableMetrics']
                missing_analysis_fields = [f for f in required_analysis_fields if f not in analysis]
                
                if missing_analysis_fields:
                    print(f"❌ FAIL: Missing analysis fields: {missing_analysis_fields}")
                    return False
                
                print(f"✅ PASS: All required analysis fields present")
                
                # Check radar structure
                radar = analysis.get('radar', {})
                required_radar_fields = ['power', 'accuracy', 'consistency', 'agility', 'formIntegrity', 'stamina']
                missing_radar_fields = [f for f in required_radar_fields if f not in radar]
                
                if missing_radar_fields:
                    print(f"❌ FAIL: Missing radar fields: {missing_radar_fields}")
                    return False
                
                print(f"✅ PASS: All 6 radar fields present")
                
                # Verify radar values are numeric
                for field in required_radar_fields:
                    if not isinstance(radar[field], (int, float)):
                        print(f"❌ FAIL: Radar field '{field}' is not numeric: {radar[field]}")
                        return False
                
                print(f"✅ PASS: All radar values are numeric")
                
                # Check arrays
                print(f"✓ Metrics count: {len(analysis.get('metrics', []))}")
                print(f"✓ Events count: {len(analysis.get('events', []))}")
                print(f"✓ Insights count: {len(analysis.get('insights', []))}")
                print(f"✓ Unavailable metrics count: {len(analysis.get('unavailableMetrics', []))}")
                
                print(f"\n✅ PASS: Full analysis object structure verified")
                return True
                
            except json.JSONDecodeError:
                print(f"❌ FAIL: Response is not valid JSON")
                print(f"Raw response: {response.text[:500]}")
                return False
                
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_3_invalid_api_key():
    """
    Test 3: POST /api/analysis/start with invalid API key
    Expected: 4xx error with clean message about invalid key (NO raw JSON)
    """
    print("TEST 3: Invalid API Key Error")
    print("-" * 80)
    
    try:
        with open(TEST_VIDEO_PATH, 'rb') as video_file:
            files = {
                'video': ('test_sport.mp4', video_file, 'video/mp4')
            }
            data = {
                'sportId': 'football',
                'model': 'gemini-3.6-flash'
            }
            headers = {
                'x-gemini-api-key': 'invalid-key-not-real-12345'
            }
            
            print(f"Sending POST {BASE_URL}/api/analysis/start")
            print(f"API Key: invalid-key-not-real-12345 (expected to fail)")
            
            response = requests.post(
                f"{BASE_URL}/api/analysis/start",
                files=files,
                data=data,
                headers=headers,
                timeout=120
            )
            
            print(f"\n✓ HTTP Status Code: {response.status_code}")
            
            if response.status_code >= 500:
                print(f"❌ FAIL: Got 5xx error (should be 4xx for invalid key)")
                return False
            
            if response.status_code < 400:
                print(f"❌ FAIL: Got success status (should be 4xx for invalid key)")
                return False
            
            print(f"✅ PASS: Got 4xx error as expected")
            
            try:
                response_json = response.json()
                error_message = response_json.get('error', '')
                
                print(f"✓ Response JSON parsed successfully")
                print(f"\n✓ Error Message:")
                print(f"  '{error_message}'")
                print(f"\n✓ Error Message Length: {len(error_message)} characters")
                
                # Check for raw JSON artifacts
                artifacts = check_for_raw_json_artifacts(error_message)
                
                if artifacts:
                    print(f"\n❌ FAIL: Found raw JSON artifacts in error message:")
                    for artifact in artifacts:
                        print(f"   - '{artifact}'")
                    return False
                else:
                    print(f"\n✅ PASS: No raw JSON artifacts found")
                
                # Check if message mentions API key
                if any(keyword in error_message.lower() for keyword in ['api key', 'key', 'invalid', 'expired']):
                    print(f"✅ PASS: Error message mentions API key issue")
                else:
                    print(f"⚠️  INFO: Error message doesn't explicitly mention API key")
                
                return True
                
            except json.JSONDecodeError:
                print(f"❌ FAIL: Response is not valid JSON")
                print(f"Raw response: {response.text[:500]}")
                return False
                
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def main():
    print("\n" + "="*80)
    print("BUG VERIFICATION TEST: Clean Gemini Error Messages")
    print("="*80)
    print("\nVerifying that Gemini API errors return clean human-readable messages")
    print("instead of raw JSON blobs with quotaMetric/quotaId/RetryInfo/etc.")
    print_separator()
    
    results = {}
    
    # Test 1: Quota exceeded error
    results['test_1'] = test_1_quota_exceeded_error()
    print_separator()
    
    # Test 2: Regression check
    results['test_2'] = test_2_regression_check()
    print_separator()
    
    # Test 3: Invalid API key
    results['test_3'] = test_3_invalid_api_key()
    print_separator()
    
    # Summary
    print("SUMMARY")
    print("="*80)
    print(f"Test 1 (Quota Exceeded): {'✅ PASS' if results['test_1'] else '❌ FAIL'}")
    print(f"Test 2 (Regression Check): {'✅ PASS' if results['test_2'] else '❌ FAIL'}")
    print(f"Test 3 (Invalid API Key): {'✅ PASS' if results['test_3'] else '❌ FAIL'}")
    print(f"\nOverall: {sum(results.values())}/3 tests passed")
    print("="*80)
    
    return all(results.values())

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
